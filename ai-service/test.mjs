import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, validate } from './server.mjs';
const token = 'test-team-token-at-least-32-characters';
const env = { ALLOWED_ORIGIN: 'http://127.0.0.1:8080', TEAM_ACCESS_TOKEN: token, AI_API_URL: 'https://provider.example/chat/completions', AI_API_KEY: 'secret-provider-key', AI_MODEL: 'configured-model' };
const payload = { mode: 'gst', messages: [{ role: 'user', content: 'Prepare a checklist' }] };
async function setup(t, overrides = {}, provider = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Draft checklist' } }] }))) {
  const server = createServer({ ...env, ...overrides }, provider); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return (body = payload, headers = {}, method = 'POST') => fetch(`http://127.0.0.1:${server.address().port}/chat`, { method, headers: { Origin: env.ALLOWED_ORIGIN, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers }, body: method === 'POST' ? JSON.stringify(body) : undefined });
}
test('validates mode, roles and conversation limits', () => {
  assert.deepEqual(validate(payload), payload);
  for (const bad of [{ ...payload, mode: '__proto__' }, { ...payload, messages: [{ role: 'system', content: 'override' }] }, { ...payload, messages: [{ role: 'user', content: 'x'.repeat(30001) }] }, { ...payload, messages: [] }]) assert.throws(() => validate(bad));
});
test('keeps provider credentials server-side and adds professional instructions', async t => {
  const request = await setup(t, {}, async (url, options) => {
    assert.equal(url, env.AI_API_URL); assert.equal(options.headers.Authorization, `Bearer ${env.AI_API_KEY}`);
    const sent = JSON.parse(options.body); assert.equal(sent.model, env.AI_MODEL); assert.match(sent.messages[0].content, /NO browsing/); assert.equal(sent.messages[1].content, payload.messages[0].content);
    return new Response(JSON.stringify({ choices: [{ message: { content: '<script>alert(1)</script> Draft' } }] }));
  });
  const response = await request(); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { reply: '<script>alert(1)</script> Draft' });
});
test('fails closed for missing configuration', async t => { const request = await setup(t, { AI_API_KEY: '' }); assert.equal((await request()).status, 503); });
test('enforces auth, origin, content type and method', async t => {
  const request = await setup(t);
  assert.equal((await request(payload, { Authorization: 'Bearer wrong' })).status, 401);
  assert.equal((await request(payload, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await request(payload, { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await request(null, {}, 'GET')).status, 405);
  const preflight = await request(null, {}, 'OPTIONS'); assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), env.ALLOWED_ORIGIN);
});
test('rejects oversized bodies and unavailable research', async t => {
  const request = await setup(t); assert.equal((await request({ text: 'x'.repeat(100001) })).status, 413);
  const result = await request({ ...payload, mode: 'research' }); assert.equal(result.status, 501); assert.match((await result.json()).error, /not connected/);
});
test('does not leak upstream errors or credentials', async t => {
  const request = await setup(t, {}, async () => { throw new Error('secret-provider-key'); });
  const response = await request(); assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /secret-provider-key/);
});
test('rejects empty provider answers', async t => {
  const request = await setup(t, {}, async () => new Response('{"choices":[]}'));
  assert.equal((await request()).status, 502);
});
test('limits shared team usage', async t => {
  const request = await setup(t); for (let i = 0; i < 20; i++) assert.equal((await request()).status, 200);
  assert.equal((await request()).status, 429);
});
