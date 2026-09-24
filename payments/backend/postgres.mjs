import pg from 'pg';
import { randomBytes, randomInt } from 'node:crypto';
import { config, fail, hash, encrypt, decrypt, uniqueParams, rupees, paise } from './core.mjs';
import { resolve } from 'node:path';

export function postgresConfig(env = process.env) {
  // Reuse the merchant/origin gates; the SQLite path is not used by this adapter.
  const cfg = config({ ...env, PAYMENT_DB_PATH: resolve('unused-postgres-adapter') });
  if (!env.PAYMENT_SQL_HOST || !env.PAYMENT_SQL_USER || !env.PAYMENT_SQL_DATABASE || !env.PAYMENT_SQL_PASSWORD)
    fail(503, 'Payment database is not configured.');
  const socket = env.PAYMENT_SQL_HOST.startsWith('/');
  const localTest = cfg.mode === 'test' && ['127.0.0.1', 'localhost'].includes(env.PAYMENT_SQL_HOST);
  if (!socket && !localTest && env.PAYMENT_SQL_SSL !== 'true') fail(503, 'Payment database requires verified TLS or a Cloud SQL socket.');
  return { ...cfg, sql: { host: env.PAYMENT_SQL_HOST, user: env.PAYMENT_SQL_USER,
    password: env.PAYMENT_SQL_PASSWORD, database: env.PAYMENT_SQL_DATABASE,
    port: Number(env.PAYMENT_SQL_PORT || 5432), max: 3, connectionTimeoutMillis: 10000,
    statement_timeout: 15000, ssl: socket || localTest ? false : { rejectUnauthorized: true } } };
}
export const openPostgres = cfg => new pg.Pool(cfg.sql);
const quote = row => row && ({ ...row, amount: Number(row.amount), expires: Number(row.expires),
  initiated_at: row.initiated_at == null ? null : Number(row.initiated_at),
  paid_at: row.paid_at == null ? null : Number(row.paid_at) });
export async function transaction(pool, fn) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function createQuote(db, cfg, { label, scope, amount, expires }) {
  if (typeof label !== 'string' || !label.trim() || label.length > 120 ||
      typeof scope !== 'string' || !scope.trim() || scope.length > 1500 ||
      !Number.isSafeInteger(amount) || amount < 100 || amount > 100000000 ||
      !Number.isSafeInteger(expires) || expires <= Date.now()) fail(400, 'Invalid quote. Use integer paise and a future expiry.');
  const id = 'ip_' + randomBytes(12).toString('hex'), token = randomBytes(32).toString('hex');
  await db.query(`INSERT INTO ip_payments.quotes
    (id, token_hash, account, label, scope, amount, expires, nonce, tid) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, hash(token), cfg.account, label.trim(), scope.trim(), amount, expires,
      randomBytes(24).toString('hex'), String(Date.now()) + String(randomInt(10000)).padStart(4, '0')]);
  return { id, token, url: cfg.origin + '/payments/#quote=' + token };
}
export async function findQuote(db, cfg, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(404, 'Quote not found.');
  const q = quote((await db.query('SELECT * FROM ip_payments.quotes WHERE token_hash=$1 AND account=$2', [hash(token), cfg.account])).rows[0]);
  if (!q) fail(404, 'Quote not found.');
  return q;
}
export async function beginCheckout(db, cfg, q) {
  const encrypted = encrypt(new URLSearchParams({ merchant_id: cfg.merchantId, order_id: q.id,
    currency: 'INR', amount: rupees(q.amount), redirect_url: cfg.backend + '/callback',
    cancel_url: cfg.backend + '/cancel', language: 'EN', merchant_param1: q.nonce, tid: q.tid }).toString(), cfg.workingKey);
  const now = Date.now();
  if (q.expires <= now) fail(410, 'This quote has expired. Contact the team.');
  const claimed = await db.query(`UPDATE ip_payments.quotes SET state='pending', initiated_at=$1,
    updated_at=now() WHERE id=$2 AND account=$3 AND state='new' AND expires>$1 RETURNING id`, [now, q.id, cfg.account]);
  if (!claimed.rowCount) fail(409, 'Checkout has already been started or expired. Check status before retrying.');
  return { action: cfg.checkoutUrl, fields: { encRequest: encrypted, access_code: cfg.accessCode } };
}
async function recordStatus(client, cfg, id, data, reference) {
  // Serialize all state and receipt effects for this quote across Cloud Run instances.
  const q = quote((await client.query('SELECT * FROM ip_payments.quotes WHERE id=$1 AND account=$2 FOR UPDATE', [id,cfg.account])).rows[0]);
  if (!q) fail(404, 'Quote not found.');
  const tracking = String(data.reference_no || '');
  if (data.order_no !== q.id || data.order_currncy !== 'INR' || paise(data.order_amt) !== q.amount ||
      !/^\d{1,25}$/.test(tracking) || (reference && reference !== tracking)) fail(409, 'Payment does not match the agreed quote.');
  if (data.order_status === 'Shipped') {
    await client.query(`INSERT INTO ip_payments.receipts (account,payment_id,quote_id,amount,captured_at)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (account,payment_id) DO NOTHING`, [cfg.account,tracking,q.id,q.amount,Date.now()]);
    const receipt = (await client.query('SELECT quote_id FROM ip_payments.receipts WHERE account=$1 AND payment_id=$2', [cfg.account,tracking])).rows[0];
    if (receipt.quote_id !== q.id) fail(409, 'Payment reference requires reconciliation.');
    const count = Number((await client.query('SELECT count(*) AS n FROM ip_payments.receipts WHERE quote_id=$1',[q.id])).rows[0].n);
    await client.query(`UPDATE ip_payments.quotes SET state=$1, payment_id=COALESCE(payment_id,$2),
      paid_at=COALESCE(paid_at,$3), updated_at=now() WHERE id=$4`, [count > 1 || q.state === 'review' ? 'review' : 'paid',tracking,Date.now(),q.id]);
  } else if (['Refunded','Chargeback','System refund','Auto-Reversed','Fraud'].includes(data.order_status)) {
    await client.query("UPDATE ip_payments.quotes SET state='review',updated_at=now() WHERE id=$1", [q.id]);
  } else if (['Aborted','Cancelled','Auto-Cancelled','Unsuccessful','Invalid'].includes(data.order_status) && !['paid','review'].includes(q.state)) {
    await client.query("UPDATE ip_payments.quotes SET state='failed',updated_at=now() WHERE id=$1",[q.id]);
  }
  return quote((await client.query('SELECT * FROM ip_payments.quotes WHERE id=$1',[q.id])).rows[0]);
}
export async function refreshQuote(db, cfg, q, api, reference) {
  if (!q.initiated_at) return q;
  const data = await api(q.id, reference || q.payment_id || undefined);
  return transaction(db, client => recordStatus(client,cfg,q.id,data,reference));
}
export async function acceptNotification(db, cfg, encrypted, api) {
  const body = uniqueParams(decrypt(encrypted,cfg.workingKey));
  const q = quote((await db.query('SELECT * FROM ip_payments.quotes WHERE id=$1 AND account=$2',[body.order_id || '',cfg.account])).rows[0]);
  if (!q || !q.initiated_at || body.merchant_param1 !== q.nonce || body.currency !== 'INR' ||
      paise(body.amount) !== q.amount || !/^\d{1,25}$/.test(body.tracking_id || '')) fail(400, 'Payment message could not be verified.');
  const data = await api(q.id,body.tracking_id);
  await transaction(db, async client => {
    await recordStatus(client,cfg,q.id,data,body.tracking_id);
    await client.query('INSERT INTO ip_payments.events (digest) VALUES ($1) ON CONFLICT DO NOTHING',[hash(encrypted.toLowerCase())]);
  });
}
