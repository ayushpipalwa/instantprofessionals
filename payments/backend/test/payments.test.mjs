import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config, openStore, createQuote, findQuote, ensureOrder, validSignature, recordPayment, transaction } from '../core.mjs';
import { makeServer } from '../server.mjs';

// Synthetic fixtures only. No merchant credentials or network calls to Razorpay.
const env = { PAYMENT_MODE: 'test', RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: 'test-fixture-secret',
  RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret', ALLOWED_ORIGIN: 'http://localhost:8080', PAYMENT_DB_PATH: ':memory:' };
const cfg = config(env);
const sign = (body, secret = cfg.secret) => createHmac('sha256', secret).update(body).digest('hex');
async function setup(t, options = {}) {
  const db = openStore(options.path || ':memory:');
  const quote = createQuote(db, cfg, { label: 'Synthetic service', scope: 'Test only; all-inclusive total.', amount: 123400, expires: Date.now() + 3600000 });
  let creates = 0;
  const payment = { id: 'pay_fixture', order_id: 'order_fixture', amount: 123400, currency: 'INR', status: 'captured', captured: true };
  const api = async (path, body) => {
    if (path === '/orders') { creates++; assert.equal(body.amount, 123400); assert.equal(body.currency, 'INR'); return { ...body, id: 'order_fixture' }; }
    if (path === '/orders/order_fixture/payments') return { items: options.noPayments ? [] : [payment] };
    if (path === '/payments/pay_fixture') return payment;
    throw new Error('Provider error containing a private key');
  };
  const server = makeServer(cfg, db, options.api || api);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  async function request(path, body = {}, headers = {}, method = 'POST') {
    const response = await fetch(url + path, { method, headers: { Origin: cfg.origin, 'Content-Type': 'application/json', ...headers },
      ...(method === 'POST' ? { body: JSON.stringify({ quoteToken: quote.token, ...body }) } : {}) });
    return { code: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
  }
  async function webhook(event, id = 'evt_fixture', signature) {
    const body = JSON.stringify(event);
    const response = await fetch(url + '/webhook', { method: 'POST', body,
      headers: { 'Content-Type': 'application/json', 'x-razorpay-event-id': id, 'x-razorpay-signature': signature ?? sign(body, cfg.webhookSecret) } });
    return response.status;
  }
  const verify = () => request('/verify', { razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture', razorpay_signature: sign('order_fixture|pay_fixture') });
  return { db, quote, request, webhook, verify, payment, creates: () => creates, url };
}
test('configuration fails closed and live requires explicit opt-in and matching keys', () => {
  for (const changes of [{ RAZORPAY_KEY_SECRET: '' }, { PAYMENT_DB_PATH: '' }, { PAYMENT_MODE: 'live' },
    { ALLOWED_ORIGIN: 'https://example.com/path' }, { ALLOWED_ORIGIN: 'ftp://localhost' },
    { PAYMENT_MODE: 'live', RAZORPAY_KEY_ID: 'rzp_live_fixture', ALLOWED_ORIGIN: 'https://example.com' }]) {
    assert.throws(() => config({ ...env, ...changes }));
  }
  assert.equal(config({ ...env, PAYMENT_MODE: 'live', RAZORPAY_KEY_ID: 'rzp_live_fixture', ALLOWED_ORIGIN: 'https://example.com', ENABLE_LIVE_PAYMENTS: 'true' }).mode, 'live');
});
test('server owns amount; repeated and concurrent creation reuse one order', async t => {
  const s = await setup(t);
  const results = await Promise.all([s.request('/orders', { amount: 1, currency: 'USD' }), s.request('/orders')]);
  assert.ok(results.every(r => [200, 409].includes(r.code)));
  const result = await s.request('/orders');
  assert.equal(result.body.amount, 123400); assert.equal(result.body.currency, 'INR'); assert.equal(s.creates(), 1);
  assert.equal(result.body.keyId, cfg.key); assert.ok(!JSON.stringify(result).includes(cfg.secret));
});
test('forged callback, another order, invalid token and wrong amount are rejected', async t => {
  const s = await setup(t); await s.request('/orders');
  assert.equal((await s.request('/quote', { quoteToken: 'a'.repeat(64) })).code, 404);
  assert.equal((await s.request('/verify', { razorpay_order_id: 'order_other', razorpay_payment_id: 'pay_fixture', razorpay_signature: sign('order_other|pay_fixture') })).code, 400);
  assert.equal((await s.request('/verify', { razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture', razorpay_signature: '0'.repeat(64) })).code, 400);
  s.payment.amount = 1; assert.equal((await s.verify()).code, 409);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM receipts').get().n, 0);
});
test('authorized is pending; captured verifies and duplicate callbacks make one receipt', async t => {
  const s = await setup(t); await s.request('/orders');
  s.payment.status = 'authorized'; s.payment.captured = false;
  assert.equal((await s.verify()).body.status, 'ready');
  s.payment.status = 'captured'; s.payment.captured = true;
  assert.equal((await s.verify()).body.status, 'paid');
  assert.equal((await s.verify()).body.status, 'paid');
  assert.equal((await s.request('/orders')).code, 409);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM receipts').get().n, 1);
});
test('raw webhook signatures, duplicates, and late failure preserve one confirmed receipt', async t => {
  const s = await setup(t); await s.request('/orders');
  const event = { event: 'payment.captured', payload: { payment: { entity: s.payment } } };
  assert.equal(await s.webhook(event, 'evt_bad', '0'.repeat(64)), 401);
  assert.equal(await s.webhook(event), 200); assert.equal(await s.webhook(event), 200);
  assert.equal(await s.webhook({ event: 'payment.failed', payload: { payment: { entity: { ...s.payment, status: 'failed', captured: false } } } }, 'evt_late'), 200);
  assert.equal((await s.request('/quote')).body.status, 'paid');
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM receipts').get().n, 1);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM webhook_events').get().n, 2);
  assert.equal(validSignature('body ', sign('body', cfg.webhookSecret), cfg.webhookSecret), false);
});
test('mismatched webhook rolls back event id and can be retried after correction', async t => {
  const s = await setup(t); await s.request('/orders');
  const event = { event: 'order.paid', payload: { payment: { entity: { ...s.payment, currency: 'USD' } } } };
  assert.equal(await s.webhook(event), 409);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM webhook_events').get().n, 0);
  event.payload.payment.entity.currency = 'INR'; assert.equal(await s.webhook(event), 200);
});
test('status recovers payment when customer closes checkout; expired quote still reconciles', async t => {
  const s = await setup(t); await s.request('/orders');
  s.db.prepare('UPDATE quotes SET expires = 0').run();
  assert.equal((await s.request('/orders')).code, 410);
  assert.equal((await s.request('/status')).body.status, 'paid');
});
test('CORS, method, content type, body limits and malformed JSON are enforced', async t => {
  const s = await setup(t);
  assert.equal((await s.request('/quote', {}, { Origin: 'https://attacker.example' })).code, 403);
  assert.equal((await s.request('/quote', {}, {}, 'GET')).code, 405);
  assert.equal((await s.request('/quote', {}, { 'Content-Type': 'text/plain' })).code, 415);
  assert.equal((await s.request('/quote', { padding: 'x'.repeat(9000) })).code, 413);
  const preflight = await s.request('/quote', {}, {}, 'OPTIONS');
  assert.equal(preflight.code, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), cfg.origin);
  const response = await fetch(s.url + '/quote', { method: 'POST', headers: { Origin: cfg.origin, 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(response.status, 400);
});
test('upstream failure is redacted and ambiguous creation cannot create a second order', async t => {
  let count = 0;
  const s = await setup(t, { api: async () => { count++; throw new Error('private-secret'); } });
  const result = await s.request('/orders'); assert.equal(result.code, 502); assert.doesNotMatch(JSON.stringify(result), /private-secret/);
  assert.equal((await s.request('/orders')).code, 409); assert.equal(count, 1);
});
test('persistent order and receipt survive reopening; mode/account cannot reuse quotes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ip-payments-'));
  let db;
  try {
    const path = join(dir, 'payments.sqlite'); db = openStore(path);
    const created = createQuote(db, cfg, { label: 'Test', scope: 'Test', amount: 100, expires: Date.now() + 5000 });
    await ensureOrder(db, cfg, findQuote(db, cfg, created.token), async (_, body) => ({ ...body, id: 'order_saved' }));
    db.close(); db = openStore(path);
    const result = await ensureOrder(db, cfg, findQuote(db, cfg, created.token), async () => assert.fail('Must reuse persisted order'));
    assert.equal(result.orderId, 'order_saved');
    transaction(db, () => recordPayment(db, findQuote(db, cfg, created.token), {
      id: 'pay_saved', order_id: 'order_saved', amount: 100, currency: 'INR', status: 'captured', captured: true
    }));
    db.close(); db = openStore(path);
    assert.equal(findQuote(db, cfg, created.token).state, 'paid');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM receipts').get().n, 1);
    assert.throws(() => findQuote(db, { ...cfg, key: 'rzp_live_other' }, created.token));
  } finally { db?.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('rate limits public endpoints without blocking signed webhook delivery', async t => {
  const s = await setup(t);
  for (let i = 0; i < 120; i++) assert.equal((await s.request('/quote')).code, 200);
  assert.equal((await s.request('/quote')).code, 429);
  assert.equal(await s.webhook({ event: 'unknown.event' }), 200);
});
