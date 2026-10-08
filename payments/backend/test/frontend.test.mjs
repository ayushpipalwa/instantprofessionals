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

test('LIVE invoice entry sends invoice/email only and renders the server balance', async () => {
  const nodes=new Map(),requests=[],stored=new Map();
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{textContent:'',hidden:true,checked:false,value:'',handlers:{},
      addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return node('submit');}});
    return nodes.get(id);
  };
  node('invoice-number').value='IP/26/1';node('invoice-email').value='client@example.test';
  const sandbox={URL,URLSearchParams,AbortSignal,Intl,Date,
    location:{origin:'https://www.instantprofessionals.in',pathname:'/payments/',hash:'?amt=1'},
    history:{replaceState(){}},sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},
    document:{getElementById:node,createElement(){return {};},head:{append(){}}},
    window:{IP_PAYMENT_CONFIG:{apiBase:'https://live-backend.example'},addEventListener(){}},
    fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({
      quoteToken:'a'.repeat(64),reference:'synthetic',invoiceNumber:'IP/26/1',label:'Invoice IP/26/1',scope:'Invoice balance',amount:123400,
      expires:Date.now()+60000,status:'new',mode:'live'})};}};
  vm.runInNewContext(source,sandbox);
  assert.match(node('status').textContent,/IPREPORT invoice number/);
  await node('quote-form').handlers.submit({preventDefault(){}});
  assert.equal(requests[0].url,'https://live-backend.example/invoice');
  assert.deepEqual(requests[0].body,{invoiceNumber:'IP/26/1',email:'client@example.test'});
  assert.match(node('amount').textContent,/1,234\.00/);
  assert.equal(node('invoice-email').value,'');assert.equal(node('pay').disabled,true);
  assert.equal(node('quote-form').hidden,true);
  node('another-invoice').handlers.click();
  assert.equal(node('quote-form').hidden,false);assert.equal(node('quote').hidden,true);
});
