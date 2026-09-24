import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config, openStore, createQuote, findQuote, beginCheckout, encrypt, decrypt, uniqueParams, gateway, paise } from '../core.mjs';
import { makeServer } from '../server.mjs';
const env = { PAYMENT_MODE: 'test', CCAVENUE_MERCHANT_ID: '12345', CCAVENUE_ACCESS_CODE: 'fixture-code',
  CCAVENUE_WORKING_KEY: 'fixture-working-key', CCAVENUE_API_ACCESS_CODE: 'fixture-api-code',
  CCAVENUE_API_WORKING_KEY: 'fixture-api-key', CCAVENUE_KIT_VERIFIED: 'true',
  ALLOWED_ORIGIN: 'http://localhost:8080', PAYMENT_PUBLIC_ORIGIN: 'http://localhost:3001',
  PAYMENT_DB_PATH: join(tmpdir(), 'unused-cca-fixture.sqlite') };
const cfg = config(env);
async function setup(t, options = {}) {
  const db = openStore(options.path || ':memory:');
  const quote = createQuote(db, cfg, { label: 'Synthetic service', scope: 'Synthetic total, not a merchant offer.', amount: 123400, expires: Date.now() + 3600000 });
  const provider = { order_no: quote.id, reference_no: '123456789012', order_currncy: 'INR', order_amt: '1234.00', order_capt_amt: '1234.00', order_status: 'Shipped', status: 0 };
  let lookups = 0;
  const api = async (id, ref) => { lookups++; assert.equal(id, quote.id); if (ref) assert.match(ref, /^\d+$/); return provider; };
  const server = makeServer(cfg, db, options.api || api);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  async function request(path, body = {}, headers = {}, method = 'POST') {
    const response = await fetch(url + path, { method, redirect: 'manual',
      headers: { Origin: cfg.origin, 'Content-Type': 'application/json', ...headers },
      ...(method === 'POST' ? { body: JSON.stringify({ quoteToken: quote.token, ...body }) } : {}) });
    return { code: response.status, headers: response.headers, body: response.status === 204 ? null : await response.json() };
  }
  function encrypted(changes = {}) {
    const q = findQuote(db, cfg, quote.token);
    return encrypt(new URLSearchParams({ order_id: quote.id, tracking_id: '123456789012', amount: '1234.00', currency: 'INR',
      order_status: 'Success', merchant_param1: q.nonce, ...changes }).toString(), cfg.workingKey);
  }
  async function notify(changes = {}, path = '/webhook', raw) {
    const response = await fetch(url + path, { method: 'POST', redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ encResp: raw ?? encrypted(changes) }) });
    return { code: response.status, location: response.headers.get('location'), text: await response.text() };
  }
  return { db, quote, provider, request, notify, url, encrypted, lookups: () => lookups };
}
test('fail-closed config, exact origins, persistent path, kit gate and live opt-in', () => {
  for (const changes of [{ CCAVENUE_WORKING_KEY: '' }, { CCAVENUE_API_ACCESS_CODE: '' }, { CCAVENUE_KIT_VERIFIED: 'false' },
    { PAYMENT_DB_PATH: ':memory:' }, { ALLOWED_ORIGIN: 'ftp://localhost' }, { PAYMENT_PUBLIC_ORIGIN: 'https://example.com/path' },
    { PAYMENT_MODE: 'live' }]) assert.throws(() => config({ ...env, ...changes }));
  const live = config({ ...env, PAYMENT_MODE: 'live', ALLOWED_ORIGIN: 'https://example.com',
    PAYMENT_PUBLIC_ORIGIN: 'https://payments.example.com', ENABLE_LIVE_PAYMENTS: 'true' });
  assert.match(live.checkoutUrl, /secure\.ccavenue/); assert.match(cfg.checkoutUrl, /test\.ccavenue/);
});
test('encryption roundtrip, malformed ciphertext, duplicate parameters and exact paise parsing', () => {
  const plain = 'merchant_id=12345&order_id=synthetic&currency=INR&amount=1234.00';
  assert.equal(decrypt(encrypt(plain, cfg.workingKey), cfg.workingKey), plain);
  assert.throws(() => decrypt('invalid', cfg.workingKey)); assert.throws(() => uniqueParams('a=1&a=2'));
  assert.equal(paise('1234.01'), 123401);
  for (const value of ['1.001', '1e3', '-1', 'NaN', '', undefined]) assert.throws(() => paise(value));
});
test('server fixes amount, currency, callback, nonce and 17-digit tid; one checkout only', async t => {
  const s = await setup(t);
  const result = await s.request('/session', { amount: 1, currency: 'USD', redirect_url: 'https://evil.example' });
  assert.equal(result.code, 200);
  const fields = uniqueParams(decrypt(result.body.fields.encRequest, cfg.workingKey));
  assert.equal(fields.amount, '1234.00'); assert.equal(fields.currency, 'INR');
  assert.equal(fields.redirect_url, cfg.backend + '/callback'); assert.equal(fields.order_id, s.quote.id);
  assert.match(fields.tid, /^\d{17}$/); assert.equal(fields.merchant_param1.length, 48);
  assert.ok(!JSON.stringify(result.body).includes(cfg.workingKey));
  assert.equal((await s.request('/session')).code, 409);
  assert.equal((await s.request('/quote')).body.status, 'pending');
});
test('parallel requests issue one encrypted checkout and cannot reissue a paid quote', async t => {
  const s = await setup(t);
  const results = await Promise.all([s.request('/session'), s.request('/session')]);
  assert.deepEqual(results.map(r => r.code).sort(), [200, 409]);
  await s.notify(); assert.equal((await s.request('/session')).code, 409);
});
test('forged, wrong-amount, wrong-currency and wrong-nonce returns cannot confirm payment', async t => {
  const s = await setup(t); await s.request('/session');
  assert.equal((await s.notify({}, '/webhook', '0'.repeat(32))).code, 400);
  for (const changes of [{ amount: '1.00' }, { currency: 'USD' }, { merchant_param1: 'wrong' }, { order_id: 'other' }])
    assert.equal((await s.notify(changes)).code, 400);
  assert.equal(s.lookups(), 0); assert.equal((await s.request('/quote')).body.status, 'pending');
});
test('callback Success does not mean paid; API confirmation required, repeated notification can advance', async t => {
  const s = await setup(t); await s.request('/session');
  s.provider.order_status = 'Successful';
  assert.equal((await s.notify()).code, 200); assert.equal((await s.request('/quote')).body.status, 'pending');
  s.provider.order_status = 'Shipped';
  assert.equal((await s.notify()).code, 200); assert.equal((await s.request('/quote')).body.status, 'paid');
  assert.equal((await s.notify()).code, 200);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM cca_receipts').get().n, 1);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM cca_events').get().n, 1);
});
test('API mismatch rolls back receipts/events and provider failure is redacted/retryable', async t => {
  const s = await setup(t); await s.request('/session');
  s.provider.order_amt = '1.00'; assert.equal((await s.notify()).code, 409);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM cca_events').get().n, 0);
  s.provider.order_amt = '1234.00'; s.provider.reference_no = '999';
  assert.equal((await s.notify()).code, 409);
  const unavailable = await setup(t, { api: async () => { throw Error('private-working-key'); } });
  await unavailable.request('/session');
  const failure = await unavailable.notify(); assert.equal(failure.code, 502); assert.doesNotMatch(failure.text, /private-working-key/);
  assert.equal((await unavailable.request('/quote')).body.status, 'pending');
});
test('late failure does not downgrade paid; duplicate captures and reversals require review', async t => {
  const s = await setup(t); await s.request('/session'); await s.notify();
  s.provider.order_status = 'Unsuccessful'; await s.notify({ order_status: 'Failure' });
  assert.equal((await s.request('/quote')).body.status, 'paid');
  s.provider.order_status = 'Shipped'; s.provider.reference_no = '223456789012';
  await s.notify({ tracking_id: '223456789012' });
  assert.equal((await s.request('/quote')).body.status, 'review');
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM cca_receipts').get().n, 2);
});
test('cancel and callback redirect to fixed frontend; GET success parameters never mark paid', async t => {
  const s = await setup(t); await s.request('/session');
  const callback = await s.notify({}, '/callback'); assert.equal(callback.code, 303); assert.equal(callback.location, cfg.origin + '/payments/');
  const failedReturn = await s.notify({}, '/callback', 'invalid'); assert.equal(failedReturn.code, 303);
  const cancel = await fetch(s.url + '/cancel', { redirect: 'manual' }); assert.equal(cancel.status, 303);
  assert.equal((await s.request('/status?success=true')).code, 404);
});
test('status recovers closed checkout and reconciles after expiry; new expired session blocked', async t => {
  const s = await setup(t); await s.request('/session');
  s.db.prepare('UPDATE cca_quotes SET expires = 0').run();
  assert.equal((await s.request('/session')).code, 410);
  assert.equal((await s.request('/status')).body.status, 'paid');
  s.provider.order_status = 'Refunded';
  assert.equal((await s.request('/status')).body.status, 'review');
});
test('CORS, method, request sizes, content types and private quote access', async t => {
  const s = await setup(t);
  assert.equal((await s.request('/quote', {}, { Origin: 'https://evil.example' })).code, 403);
  assert.equal((await s.request('/quote', {}, {}, 'GET')).code, 405);
  assert.equal((await s.request('/quote', {}, { 'Content-Type': 'text/plain' })).code, 415);
  assert.equal((await s.request('/quote', { padding: 'x'.repeat(9000) })).code, 413);
  assert.equal((await s.request('/quote', { quoteToken: '0'.repeat(64) })).code, 404);
  const preflight = await s.request('/session', {}, {}, 'OPTIONS');
  assert.equal(preflight.code, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), cfg.origin);
});
test('persistent checkout lock survives restart and account/mode cannot share quotes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cca-test-')); let db;
  try {
    const path = join(dir, 'payments.sqlite'); db = openStore(path);
    const q = createQuote(db, cfg, { label: 'Test', scope: 'Synthetic', amount: 100, expires: Date.now() + 100000 });
    beginCheckout(db, cfg, findQuote(db, cfg, q.token)); db.close(); db = openStore(path);
    assert.throws(() => beginCheckout(db, cfg, findQuote(db, cfg, q.token)), /already been started/);
    assert.throws(() => findQuote(db, { ...cfg, account: 'live:12345' }, q.token));
  } finally { db?.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('status adapter encrypts request, verifies response envelope and pins TLS destination', async () => {
  const result = await gateway(cfg, async (url, options) => {
    assert.equal(url, cfg.statusUrl); assert.equal(options.redirect, 'error'); assert.equal(options.method, 'POST');
    const fields = new URLSearchParams(options.body);
    assert.equal(fields.get('command'), 'orderStatusTracker');
    assert.equal(fields.get('access_code'), cfg.apiCode);
    assert.deepEqual(JSON.parse(decrypt(fields.get('enc_request'), cfg.apiKey)), { order_no: 'ip_test', reference_no: '123' });
    return new Response(new URLSearchParams({ status: '0', enc_response: encrypt(JSON.stringify({ order_status: 'Shipped' }), cfg.apiKey) }));
  })('ip_test', '123');
  assert.equal(result.order_status, 'Shipped');
  await assert.rejects(gateway(cfg, async () => new Response('status=1&enc_response=private-error'))('ip_test'), /awaiting provider/);
});
test('rate limiting applies to public endpoints and callbacks', async t => {
  const s = await setup(t);
  for (let i = 0; i < 120; i++) assert.equal((await s.request('/quote')).code, 200);
  assert.equal((await s.request('/quote')).code, 429);
  assert.equal((await s.notify({}, '/webhook', 'bad')).code, 400);
});

 test('partial or missing captures and rounded references cannot create receipts', async t => {
  const s = await setup(t); await s.request('/session');
  for (const captured of ['1.00', '0.00', undefined]) {
    s.provider.order_capt_amt = captured;
    assert.notEqual((await s.notify()).code, 200);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM cca_receipts').get().n, 0);
  }
  s.provider.order_capt_amt = '1234.00';
  s.provider.reference_no = 9007199254740992;
  assert.equal((await s.notify({tracking_id: '9007199254740992'})).code, 409);
  assert.equal(s.db.prepare('SELECT COUNT(*) n FROM cca_receipts').get().n, 0);
});
