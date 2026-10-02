import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../app.js', import.meta.url), 'utf8');
async function review(health, quoteMode = 'test') {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', hidden: true, checked: false,
      addEventListener() {}, querySelector() { return node('submit'); } });
    return nodes.get(id);
  };
  const requests = [];
  const sandbox = { URL, URLSearchParams, AbortSignal, Intl, Date,
    location: { origin: 'https://www.instantprofessionals.in', pathname: '/payments/test.html', hash: '#quote=' + 'a'.repeat(64) },
    history: { replaceState() {} }, sessionStorage: { getItem() { return null; }, setItem() {} },
    document: { getElementById: node, createElement() { return {}; }, head: { append() {} } },
    window: { IP_PAYMENT_CONFIG: { apiBase: 'https://test-backend.example', testOnly: true }, addEventListener() {} },
    fetch: async url => {
      requests.push(url);
      return { ok: true, json: async () => url.endsWith('/health') ? health :
        { reference: 'synthetic', label: 'Test', scope: 'Sandbox', amount: 100, expires: Date.now() + 60000, status: 'new', mode: quoteMode } };
    } };
  vm.runInNewContext(source, sandbox);
  await new Promise(resolve => setImmediate(resolve));
  return { requests, status: node('status').textContent, hidden: node('quote').hidden };
}
test('TEST entry refuses live, unhealthy or different-provider backend before sending quote token', async () => {
  for (const health of [{ ok: true, mode: 'live', provider: 'ccavenue' },
    { ok: false, mode: 'test', provider: 'ccavenue' }, { ok: true, mode: 'test', provider: 'other' }]) {
    const result = await review(health);
    assert.equal(result.requests.length, 1);
    assert.match(result.status, /TEST checkout blocked/);
    assert.equal(result.hidden, true);
  }
});
test('TEST entry rejects live quote and displays server-approved test quote', async () => {
  const health = { ok: true, mode: 'test', provider: 'ccavenue' };
  assert.match((await review(health, 'live')).status, /quote is not in test mode/);
  const valid = await review(health);
  assert.equal(valid.hidden, false);
  assert.match(valid.status, /Review your agreed scope/);
});
