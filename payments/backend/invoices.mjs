import { createHash } from 'node:crypto';
import { fail } from './core.mjs';
import * as payments from './postgres.mjs';

const unavailable = () => fail(404, 'No payable invoice matches these details. Check the invoice number and registered email, or contact our team.');
export function invoiceCredentials(body) {
  if (Object.keys(body).some(k => !['invoiceNumber', 'email'].includes(k))) fail(400, 'Enter only the invoice number and registered email.');
  const number = typeof body.invoiceNumber === 'string' ? body.invoiceNumber.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!number || number.length > 100 || /[\x00-\x1f]/.test(number) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) unavailable();
  return { number, emailHash: createHash('md5').update(email).digest('hex') };
}
export function remainingAmount(invoice, receipts) {
  const posted = new Set(invoice.posted_payment_references || []);
  const outstanding = Number(invoice.outstanding_paise);
  if (!Number.isSafeInteger(outstanding) || outstanding < 0) fail(409, 'Invoice balance requires review. Contact our team.');
  return outstanding - receipts.filter(r => !posted.has(r.payment_id)).reduce((sum, r) => sum + Number(r.amount), 0);
}
export function invoiceOperations(invoiceDb) {
  async function issued(number, emailHash, id) {
    if (!invoiceDb) fail(503, 'Invoice payments are unavailable. Contact our team.');
    const row = (await invoiceDb.query(`SELECT * FROM payment_invoice_lookup.issued_invoices
      WHERE invoice_number=$1 AND ${id ? 'invoice_id' : 'client_email_hash'}=$2`, [number, id || emailHash])).rows[0];
    if (!row) unavailable();
    return row;
  }
  async function balance(client, cfg, invoice, excludeId) {
    // The lock covers lookup and checkout across all LIVE instances, including callers
    // with separate browser sessions. Unresolved provider attempts never expire silently.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [cfg.account + ':' + invoice.invoice_id]);
    const blocked = await client.query(`SELECT id FROM ip_payments.quotes WHERE account=$1 AND invoice_id=$2
      AND state IN ('pending','review') AND ($3::text IS NULL OR id<>$3) LIMIT 1`, [cfg.account, invoice.invoice_id, excludeId || null]);
    if (blocked.rowCount) fail(409, 'An invoice payment is awaiting verification or review. Check its payment status or contact our team before paying again.');
    const receipts = (await client.query(`SELECT r.payment_id,r.amount FROM ip_payments.receipts r
      JOIN ip_payments.quotes q ON q.id=r.quote_id WHERE q.account=$1 AND q.invoice_id=$2`, [cfg.account, invoice.invoice_id])).rows;
    const due = remainingAmount(invoice, receipts);
    if (due <= 0) fail(409, 'This invoice has no outstanding online payment. Contact our team if you need a receipt.');
    if (due < 100 || due > 100000000) fail(409, 'Invoice balance is outside the online payment limit. Contact our team.');
    return due;
  }
  return {
    ...payments,
    async lookupInvoice(db, cfg, body) {
      if (cfg.mode !== 'live') fail(404, 'Invoice payments are unavailable in this environment.');
      const credentials = invoiceCredentials(body);
      const invoice = await issued(credentials.number, credentials.emailHash);
      return payments.transaction(db, async client => {
        const amount = await balance(client, cfg, invoice);
        const created = await payments.createQuote(client, cfg, { label: 'Invoice ' + invoice.invoice_number,
          scope: 'Outstanding balance of your IPREPORT invoice. Review the issued invoice before paying.',
          amount, expires: Date.now() + 30 * 60 * 1000 });
        await client.query('UPDATE ip_payments.quotes SET invoice_id=$1,invoice_number=$2 WHERE id=$3',
          [invoice.invoice_id, invoice.invoice_number, created.id]);
        return { token: created.token, quote: await payments.findQuote(client, cfg, created.token) };
      });
    },
    async beginCheckout(db, cfg, q) {
      if (!q.invoice_id) return payments.beginCheckout(db, cfg, q); // Existing private acceptance links remain valid.
      return payments.transaction(db, async client => {
        // Fetch again after acquiring the invoice lock: a previous payment may have
        // reconciled since review, or IPREPORT may have cancelled/credited the invoice.
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [cfg.account + ':' + q.invoice_id]);
        const invoice = await issued(q.invoice_number, undefined, q.invoice_id);
        const amount = await balance(client, cfg, invoice, q.id);
        if (amount !== q.amount) fail(409, 'The invoice balance has changed. Review the invoice again before paying.');
        return payments.beginCheckout(client, cfg, q);
      });
    }
  };
}
