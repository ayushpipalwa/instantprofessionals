import { DatabaseSync } from 'node:sqlite';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export class PaymentError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new PaymentError(status, message); };
export const hash = value => createHash('sha256').update(value).digest('hex');
export function validSignature(body, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function config(env = process.env) {
  const mode = env.PAYMENT_MODE || 'test';
  const key = env.RAZORPAY_KEY_ID || '';
  const origin = env.ALLOWED_ORIGIN || '';
  let url;
  try { url = new URL(origin); } catch { fail(503, 'Payment service is not configured.'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (!['test', 'live'].includes(mode) || !key.startsWith(`rzp_${mode}_`) ||
      !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET ||
      !env.PAYMENT_DB_PATH || origin !== url.origin ||
      (url.protocol !== 'https:' && !(mode === 'test' && local && url.protocol === 'http:')) ||
      (mode === 'live' && env.ENABLE_LIVE_PAYMENTS !== 'true')) {
    fail(503, 'Payment service is not configured.');
  }
  return { mode, key, secret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    origin, dbPath: env.PAYMENT_DB_PATH };
}
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, key_id TEXT NOT NULL,
      label TEXT NOT NULL, scope TEXT NOT NULL, amount INTEGER NOT NULL,
      expires INTEGER NOT NULL, order_id TEXT UNIQUE, state TEXT NOT NULL DEFAULT 'new',
      payment_id TEXT UNIQUE, paid_at INTEGER);
    CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, received_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS receipts (
      quote_id TEXT PRIMARY KEY, order_id TEXT UNIQUE NOT NULL,
      payment_id TEXT UNIQUE NOT NULL, amount INTEGER NOT NULL, captured_at INTEGER NOT NULL);`);
  return db;
}
export function createQuote(db, cfg, { label, scope, amount, expires }) {
  if (typeof label !== 'string' || !label.trim() || label.length > 120 ||
      typeof scope !== 'string' || !scope.trim() || scope.length > 1500 ||
      !Number.isSafeInteger(amount) || amount < 100 || amount > 100000000 ||
      !Number.isSafeInteger(expires) || expires <= Date.now()) fail(400, 'Invalid quote. Use integer paise and a future expiry.');
  const id = 'ip_' + randomBytes(12).toString('hex');
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO quotes (id, token_hash, key_id, label, scope, amount, expires) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, hash(token), cfg.key, label.trim(), scope.trim(), amount, expires);
  return { id, token, url: `${cfg.origin}/payments/#quote=${token}` };
}
export function findQuote(db, cfg, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail(404, 'Quote not found.');
  const quote = db.prepare('SELECT * FROM quotes WHERE token_hash = ? AND key_id = ?').get(hash(token), cfg.key);
  if (!quote) fail(404, 'Quote not found.');
  return quote;
}
export const publicQuote = q => ({ reference: q.id, label: q.label, scope: q.scope,
  amount: q.amount, currency: 'INR', expires: q.expires, status: q.state,
  orderId: q.order_id, paymentId: q.payment_id });

export function gateway(cfg, fetchImpl = fetch) {
  return async (path, body) => {
    const response = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Basic ' + Buffer.from(`${cfg.key}:${cfg.secret}`).toString('base64'), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) fail(502, 'Payment provider is temporarily unavailable.');
    return response.json();
  };
}
export function checkOrder(q, order) {
  if (!/^order_[a-zA-Z0-9]+$/.test(order.id) || order.receipt !== q.id ||
      order.amount !== q.amount || order.currency !== 'INR' || order.partial_payment === true) {
    fail(409, 'Order does not match the agreed quote.');
  }
}
export async function ensureOrder(db, cfg, q, api) {
  if (q.state === 'paid') fail(409, 'This quote has already been paid.');
  if (q.expires <= Date.now()) fail(410, 'This quote has expired. Contact the team for a new quote.');
  if (q.order_id) return { ...publicQuote(q), keyId: cfg.key, mode: cfg.mode };
  // A persisted claim prevents duplicate orders across concurrent requests and restarts.
  // An ambiguous provider timeout MUST be reconciled by the operator, never retried blindly.
  const claimed = db.prepare("UPDATE quotes SET state = 'creating' WHERE id = ? AND state = 'new'").run(q.id);
  if (!claimed.changes) fail(409, 'Order is being prepared or needs review. Check status before trying again.');
  const order = await api('/orders', { amount: q.amount, currency: 'INR', receipt: q.id, partial_payment: false });
  checkOrder(q, order);
  db.prepare("UPDATE quotes SET order_id = ?, state = 'ready' WHERE id = ?").run(order.id, q.id);
  return { ...publicQuote({ ...q, order_id: order.id, state: 'ready' }), keyId: cfg.key, mode: cfg.mode };
}
export function recordPayment(db, q, payment) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(payment.id) || payment.order_id !== q.order_id ||
      payment.amount !== q.amount || payment.currency !== 'INR') fail(409, 'Payment does not match the agreed quote.');
  // Authorization alone never unlocks service delivery. Failed/late events cannot downgrade paid.
  if (payment.status !== 'captured' || payment.captured !== true) return;
  if (q.payment_id && q.payment_id !== payment.id) fail(409, 'Payment requires manual reconciliation.');
  db.prepare('INSERT OR IGNORE INTO receipts VALUES (?, ?, ?, ?, ?)').run(q.id, q.order_id, payment.id, q.amount, Date.now());
  db.prepare("UPDATE quotes SET state = 'paid', payment_id = ?, paid_at = COALESCE(paid_at, ?) WHERE id = ?")
    .run(payment.id, Date.now(), q.id);
}
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const value = fn(); db.exec('COMMIT'); return value; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export async function refreshQuote(db, cfg, q, api) {
  if (q.order_id && q.state !== 'paid') {
    const result = await api(`/orders/${q.order_id}/payments`);
    if (!Array.isArray(result.items)) fail(502, 'Payment status is temporarily unavailable.');
    transaction(db, () => {
      for (const payment of result.items) recordPayment(db, db.prepare('SELECT * FROM quotes WHERE id = ?').get(q.id), payment);
    });
  }
  return db.prepare('SELECT * FROM quotes WHERE id = ? AND key_id = ?').get(q.id, cfg.key);
}
