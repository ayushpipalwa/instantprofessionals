import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresConfig, beginCheckout } from '../postgres.mjs';
import { decrypt, encrypt, gateway } from '../core.mjs';
const env={PAYMENT_MODE:'test',CCAVENUE_MERCHANT_ID:'123',CCAVENUE_ACCESS_CODE:'fixture',CCAVENUE_WORKING_KEY:'fixture',CCAVENUE_API_ACCESS_CODE:'fixture',CCAVENUE_API_WORKING_KEY:'fixture',CCAVENUE_KIT_VERIFIED:'true',ALLOWED_ORIGIN:'https://example.com',PAYMENT_PUBLIC_ORIGIN:'https://backend.example.com',PAYMENT_SQL_HOST:'127.0.0.1',PAYMENT_SQL_USER:'test',PAYMENT_SQL_DATABASE:'test',PAYMENT_SQL_PASSWORD:'fixture'};
const billing=Object.fromEntries(Object.entries({name:'Test User',address:'Test Office & Floor',city:'Test City',state:'Test State',zip:'123456',country:'India',email:'test@example.com',tel:'9999999999'}).map(([k,v])=>['PAYMENT_TEST_BILLING_'+k.toUpperCase(),v]));
test('TEST encrypted checkout includes server billing without changing authoritative order or amount',async()=>{
 const cfg=postgresConfig({...env,...billing});
 const q={id:'test-order',amount:100,expires:Date.now()+60000,nonce:'nonce',tid:'123'};
 const result=await beginCheckout({query:async()=>({rowCount:1})},cfg,q);
 const params=new URLSearchParams(decrypt(result.fields.encRequest,cfg.workingKey));
 assert.equal(params.get('billing_address'),'Test Office & Floor');
 assert.equal(params.get('billing_name'),'Test User');
 assert.equal(params.get('billing_country'),'India');
 assert.equal(params.get('billing_email'),'test@example.com');
 assert.equal(params.get('billing_tel'),'9999999999');
 assert.equal(params.get('order_id'),q.id);
 assert.equal(params.get('amount'),'1.00');
 assert.equal(params.get('merchant_param1'),q.nonce);
});
test('partial TEST billing fails closed and TEST billing is excluded from LIVE',()=>{
 assert.throws(()=>postgresConfig({...env,PAYMENT_TEST_BILLING_NAME:'Test'}),/billing/);
 const cfg=postgresConfig({...env,...billing,PAYMENT_MODE:'live',ENABLE_LIVE_PAYMENTS:'true',PAYMENT_SQL_HOST:'/cloudsql/test'});
 assert.deepEqual(cfg.testBilling,{});
});
test('status API accepts provider trailing CRLF without weakening encrypted response verification',async()=>{
 const cfg=postgresConfig(env),expected={order_no:'test-order',order_status:'Unsuccessful'};
 const api=gateway(cfg,async()=>new Response('status=0&enc_response='+encrypt(JSON.stringify({Order_Status_Result:expected}),cfg.apiKey)+'\r\n'));
 assert.deepEqual(await api('test-order'),expected);
 const bad=gateway(cfg,async()=>new Response('status=0&enc_response=invalid\r\n'));
 await assert.rejects(()=>bad('test-order'),/could not be verified/);
 const rejected=gateway(cfg,async()=>new Response('status=1&enc_response=Access_code%3A+Invalid+Parameter&enc_error_code=51407\r\n'));
 await assert.rejects(()=>rejected('test-order'),/access code was rejected/);
});
