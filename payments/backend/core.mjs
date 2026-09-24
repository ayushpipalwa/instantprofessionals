import { DatabaseSync } from 'node:sqlite';
import { createHash, createCipheriv, createDecipheriv, randomBytes, randomInt } from 'node:crypto';
import { isAbsolute } from 'node:path';
export class PaymentError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new PaymentError(status, message); };
export const hash = value => createHash('sha256').update(value).digest('hex');
// Legacy CCAvenue kit wire format. Encryption is NOT a signature/MAC.
// Independently confirm every return with the server-to-server status API.
const iv = Buffer.from([...Array(16).keys()]);
export function encrypt(plain, workingKey) {
  const cipher = createCipheriv('aes-128-cbc', createHash('md5').update(workingKey).digest(), iv);
  return cipher.update(plain, 'utf8', 'hex') + cipher.final('hex');
}
export function decrypt(ciphertext, workingKey) {
  try {
    if (typeof ciphertext !== 'string' || !/^[a-fA-F0-9]+$/.test(ciphertext) || ciphertext.length % 32 || ciphertext.length > 131072) throw Error();
    const cipher = createDecipheriv('aes-128-cbc', createHash('md5').update(workingKey).digest(), iv);
    return cipher.update(ciphertext, 'hex', 'utf8') + cipher.final('utf8');
  } catch { fail(400, 'Payment message could not be verified.'); }
}
export function uniqueParams(text) {
  const values = new URLSearchParams(text);
  for (const key of values.keys()) if (values.getAll(key).length !== 1) fail(400, 'Invalid payment message.');
  return Object.fromEntries(values);
}
export function config(env = process.env) {
  const mode = env.PAYMENT_MODE || 'test';
  const origin = env.ALLOWED_ORIGIN || '', backend = env.PAYMENT_PUBLIC_ORIGIN || '';
  function validOrigin(value) {
    try { const u = new URL(value); return value === u.origin &&
      (u.protocol === 'https:' || (mode === 'test' && u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))); }
    catch { return false; }
  }
  if (!['test', 'live'].includes(mode) || !validOrigin(origin) || !validOrigin(backend) ||
      !/^\d+$/.test(env.CCAVENUE_MERCHANT_ID || '') || !env.CCAVENUE_ACCESS_CODE || !env.CCAVENUE_WORKING_KEY ||
      !env.CCAVENUE_API_ACCESS_CODE || !env.CCAVENUE_API_WORKING_KEY ||
      !isAbsolute(env.PAYMENT_DB_PATH || '') || backend.length + '/callback'.length > 100 ||
      env.CCAVENUE_KIT_VERIFIED !== 'true' ||
      (mode === 'live' && env.ENABLE_LIVE_PAYMENTS !== 'true')) fail(503, 'Payment service is not configured.');
  return { mode, origin, backend, merchantId: env.CCAVENUE_MERCHANT_ID,
    account: mode + ':' + env.CCAVENUE_MERCHANT_ID, accessCode: env.CCAVENUE_ACCESS_CODE,
    workingKey: env.CCAVENUE_WORKING_KEY, apiCode: env.CCAVENUE_API_ACCESS_CODE,
    apiKey: env.CCAVENUE_API_WORKING_KEY, dbPath: env.PAYMENT_DB_PATH,
    checkoutUrl: 'https://' + (mode === 'test' ? 'test' : 'secure') + '.ccavenue.com/transaction/transaction.do?command=initiateTransaction',
    statusUrl: 'https://' + (mode === 'test' ? 'apitest' : 'api') + '.ccavenue.com/apis/servlet/DoWebTrans' };
}
export function openStore(path) {
  const db = new DatabaseSync(path);
  // Provider-specific tables do not reinterpret records from the previous draft.
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec("CREATE TABLE IF NOT EXISTS cca_quotes (id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, account TEXT NOT NULL, label TEXT NOT NULL, scope TEXT NOT NULL, amount INTEGER NOT NULL, expires INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'new', nonce TEXT NOT NULL, tid TEXT UNIQUE NOT NULL, payment_id TEXT, initiated_at INTEGER, paid_at INTEGER)");
  db.exec("CREATE TABLE IF NOT EXISTS cca_receipts (payment_id TEXT PRIMARY KEY, quote_id TEXT NOT NULL, amount INTEGER NOT NULL, captured_at INTEGER NOT NULL)");
  db.exec("CREATE TABLE IF NOT EXISTS cca_events (digest TEXT PRIMARY KEY, received_at INTEGER NOT NULL)");
  return db;
}
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const value = fn(); db.exec('COMMIT'); return value; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function createQuote(db, cfg, { label, scope, amount, expires }) {
  if (typeof label !== 'string' || !label.trim() || label.length > 120 ||
      typeof scope !== 'string' || !scope.trim() || scope.length > 1500 ||
      !Number.isSafeInteger(amount) || amount < 100 || amount > 100000000 ||
      !Number.isSafeInteger(expires) || expires <= Date.now()) fail(400, 'Invalid quote. Use integer paise and a future expiry.');
  const id = 'ip_' + randomBytes(12).toString('hex'), token = randomBytes(32).toString('hex');
  const tid = String(Date.now()) + String(randomInt(10000)).padStart(4, '0');
  db.prepare('INSERT INTO cca_quotes (id, token_hash, account, label, scope, amount, expires, nonce, tid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, hash(token), cfg.account, label.trim(), scope.trim(), amount, expires, randomBytes(24).toString('hex'), tid);
  return { id, token, url: cfg.origin + '/payments/#quote=' + token };
}
export function findQuote(db, cfg, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(404, 'Quote not found.');
  const q = db.prepare('SELECT * FROM cca_quotes WHERE token_hash = ? AND account = ?').get(hash(token), cfg.account);
  if (!q) fail(404, 'Quote not found.');
  return q;
}
export const publicQuote = (q, cfg) => ({ reference: q.id, label: q.label, scope: q.scope, amount: q.amount,
  currency: 'INR', expires: q.expires, status: q.state, paymentId: q.payment_id, mode: cfg.mode });
export const rupees = paise => Math.floor(paise / 100) + '.' + String(paise % 100).padStart(2, '0');
export function paise(value) {
  const text = String(value);
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) fail(409, 'Invalid payment amount.');
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function beginCheckout(db, cfg, q) {
  if (q.expires <= Date.now()) fail(410, 'This quote has expired. Contact the team.');
  const fields = { merchant_id: cfg.merchantId, order_id: q.id, currency: 'INR', amount: rupees(q.amount),
    redirect_url: cfg.backend + '/callback', cancel_url: cfg.backend + '/cancel',
    language: 'EN', merchant_param1: q.nonce, tid: q.tid };
  const encrypted = encrypt(new URLSearchParams(fields).toString(), cfg.workingKey);
  // CCAvenue does not enforce unique order_id. Never issue checkout twice for a quote.
  const claim = db.prepare("UPDATE cca_quotes SET state = 'pending', initiated_at = ? WHERE id = ? AND state = 'new'").run(Date.now(), q.id);
  if (!claim.changes) fail(409, 'Checkout has already been started. Check status or contact the team before retrying.');
  return { action: cfg.checkoutUrl, fields: { encRequest: encrypted, access_code: cfg.accessCode } };
}
export function gateway(cfg, fetchImpl = fetch) {
  return async (orderId, reference) => {
    const query = { order_no: orderId, ...(reference ? { reference_no: reference } : {}) };
    const body = new URLSearchParams({ enc_request: encrypt(JSON.stringify(query), cfg.apiKey),
      access_code: cfg.apiCode, command: 'orderStatusTracker', request_type: 'JSON', response_type: 'JSON', version: '1.2' });
    const response = await fetchImpl(cfg.statusUrl, { method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000) });
    if (!response.ok) fail(502, 'Payment status is temporarily unavailable.');
    const text = await response.text();
    if (text.length > 131072) fail(502, 'Payment status is temporarily unavailable.');
    const envelope = uniqueParams(text);
    if (envelope.status !== '0') fail(502, 'Payment status is awaiting provider confirmation.');
    let result;
    try { result = JSON.parse(decrypt(envelope.enc_response, cfg.apiKey)); }
    catch { fail(502, 'Payment status could not be verified.'); }
    result = result?.Order_Status_Result || result;
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.error_code ||
        (result.status !== undefined && String(result.status) !== '0')) fail(502, 'Payment status is awaiting provider confirmation.');
    return result;
  };
}
export function recordStatus(db, q, data, reference) {
  const tracking = String(data.reference_no || '');
  if (data.order_no !== q.id || data.order_currncy !== 'INR' || paise(data.order_amt) !== q.amount ||
      !/^\d{1,25}$/.test(tracking) || (reference && tracking !== reference)) fail(409, 'Payment does not match the agreed quote.');
  if (data.order_status === 'Shipped') {
    // Only confirmed/captured orders count as paid; Successful can still await confirmation.
    db.prepare('INSERT OR IGNORE INTO cca_receipts VALUES (?, ?, ?, ?)').run(tracking, q.id, q.amount, Date.now());
    const receipt = db.prepare('SELECT * FROM cca_receipts WHERE payment_id = ?').get(tracking);
    if (receipt.quote_id !== q.id) fail(409, 'Payment reference requires reconciliation.');
    const count = db.prepare('SELECT COUNT(*) n FROM cca_receipts WHERE quote_id = ?').get(q.id).n;
    db.prepare('UPDATE cca_quotes SET state = ?, payment_id = COALESCE(payment_id, ?), paid_at = COALESCE(paid_at, ?) WHERE id = ?')
      .run(count > 1 || q.state === 'review' ? 'review' : 'paid', tracking, Date.now(), q.id);
  } else if (['Refunded', 'Chargeback', 'System refund', 'Auto-Reversed', 'Fraud'].includes(data.order_status)) {
    db.prepare("UPDATE cca_quotes SET state = 'review' WHERE id = ?").run(q.id);
  } else if (['Aborted', 'Cancelled', 'Auto-Cancelled', 'Unsuccessful', 'Invalid'].includes(data.order_status) && !['paid', 'review'].includes(q.state)) {
    db.prepare("UPDATE cca_quotes SET state = 'failed' WHERE id = ?").run(q.id);
  }
}
export async function refreshQuote(db, cfg, q, api, reference) {
  if (q.initiated_at) {
    const data = await api(q.id, reference || q.payment_id || undefined);
    transaction(db, () => recordStatus(db, db.prepare('SELECT * FROM cca_quotes WHERE id = ?').get(q.id), data, reference));
  }
  return db.prepare('SELECT * FROM cca_quotes WHERE id = ? AND account = ?').get(q.id, cfg.account);
}
export async function acceptNotification(db, cfg, encrypted, api) {
  let body;
  try { body = uniqueParams(decrypt(encrypted, cfg.workingKey)); }
  catch { fail(400, 'Payment message could not be verified.'); }
  const q = db.prepare('SELECT * FROM cca_quotes WHERE id = ? AND account = ?').get(body.order_id || '', cfg.account);
  if (!q || !q.initiated_at || body.merchant_param1 !== q.nonce || body.currency !== 'INR' ||
      paise(body.amount) !== q.amount || !/^\d{1,25}$/.test(body.tracking_id || '')) fail(400, 'Payment message could not be verified.');
  const digest = hash(encrypted.toLowerCase());
  // Recheck repeats: an identical callback may arrive before and after capture.
  const verified = await api(q.id, body.tracking_id);
  transaction(db, () => {
    recordStatus(db, db.prepare('SELECT * FROM cca_quotes WHERE id = ?').get(q.id), verified, body.tracking_id);
    db.prepare('INSERT OR IGNORE INTO cca_events VALUES (?, ?)').run(digest, Date.now());
  });
}
