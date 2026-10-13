import test from 'node:test';
import assert from 'node:assert/strict';
import { quickInvoiceRequest, nativeApi, invoiceLinkResult } from '../native-api.mjs';
import { decrypt, encrypt } from '../core.mjs';
const invoice = { invoiceId:'12345678-1234-4234-8234-123456789012', invoiceNumber:'IPW/26-27/2',
  customerName:'Synthetic Client', email:'synthetic@example.invalid', phone:'9999999999', amount:1100 };
test('invoice UUID is preserved despite slashes in the printed number; amount is exact', () => {
  const q=quickInvoiceRequest(invoice);
  assert.equal(q.merchant_reference_no,invoice.invoiceId);
  assert.equal(q.amount,'11.00'); assert.equal(q.bill_delivery_type,'EMAIL');
  assert.match(q.invoice_description,/IPW\/26-27\/2/);
  for(const patch of [{amount:999},{amount:1100.5},{amount:10000000001},{email:'wrong'},
    {phone:'1'},{invoiceId:'wrong'},{customerName:'<script>'}])
    assert.throws(()=>quickInvoiceRequest({...invoice,...patch}));
});
test('request uses documented encryption, command and version; provider failures redact details', async()=>{
  const cfg={statusUrl:'https://api.ccavenue.com/apis/servlet/DoWebTrans',apiKey:'synthetic-key',apiCode:'synthetic-code'};
  const api=nativeApi(cfg,async(url,options)=>{
    assert.equal(url,cfg.statusUrl); assert.equal(options.redirect,'error');
    assert.equal(options.body.get('command'),'generateQuickInvoice');
    assert.equal(options.body.get('version'),'1.2');
    assert.equal(JSON.parse(decrypt(options.body.get('enc_request'),cfg.apiKey)).amount,'11.00');
    return {ok:true,text:async()=>new URLSearchParams({status:'0',enc_response:encrypt(JSON.stringify({invoice_status:0,invoice_id:'123',tiny_url:'https://payit.cc/I123'}),cfg.apiKey)}).toString()};
  });
  assert.deepEqual(invoiceLinkResult(await api('generateQuickInvoice',quickInvoiceRequest(invoice))),
    {providerInvoiceId:'123',paymentUrl:'https://payit.cc/I123'});
  const failure=nativeApi(cfg,async()=>({ok:true,text:async()=> 'status=1&enc_response=secret-provider-diagnostic'}));
  await assert.rejects(()=>failure('invoiceList',{}),e=>!e.message.includes('secret-provider-diagnostic'));
});
test('untrusted or imprecise provider links cannot be published',()=>{
  for(const tiny_url of ['https://evil.example/I123','https://payit.cc/I124',
    'https://user:password@payit.cc/I123','https://payit.cc/I123?redirect=evil'])
    assert.throws(()=>invoiceLinkResult({invoice_id:'123',tiny_url}));
  assert.throws(()=>invoiceLinkResult({invoice_id:9007199254740992,tiny_url:'https://payit.cc/I9007199254740992'}));
});
