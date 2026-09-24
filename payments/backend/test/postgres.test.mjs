import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { postgresConfig,openPostgres,createQuote,findQuote,beginCheckout,refreshQuote,acceptNotification } from '../postgres.mjs';
import { encrypt } from '../core.mjs';
import { makeServer } from '../server.mjs';
import * as operations from '../postgres.mjs';
const env = { PAYMENT_MODE:'test',CCAVENUE_MERCHANT_ID:'12345',CCAVENUE_ACCESS_CODE:'fixture',
  CCAVENUE_WORKING_KEY:'fixture',CCAVENUE_API_ACCESS_CODE:'fixture',CCAVENUE_API_WORKING_KEY:'fixture',
  CCAVENUE_KIT_VERIFIED:'true',ALLOWED_ORIGIN:'http://localhost:8080',PAYMENT_PUBLIC_ORIGIN:'http://localhost:3001',
  PAYMENT_SQL_HOST:'127.0.0.1',PAYMENT_SQL_USER:'payments_test',PAYMENT_SQL_PASSWORD:'disposable_ci_only',
  PAYMENT_SQL_DATABASE:'ip_payments_test',PAYMENT_SQL_PORT:process.env.PAYMENT_TEST_PORT || '5432' };
test('PostgreSQL configuration requires isolated credentials and verified remote transport',()=>{
  assert.equal(postgresConfig(env).sql.max,3);
  assert.throws(()=>postgresConfig({...env,PAYMENT_SQL_PASSWORD:''}));
  assert.throws(()=>postgresConfig({...env,PAYMENT_SQL_HOST:'remote.example'}));
  assert.equal(postgresConfig({...env,PAYMENT_SQL_HOST:'/cloudsql/project:region:instance'}).sql.ssl,false);
});
test('PostgreSQL concurrency, durable receipts, read-only reporting and async HTTP routes',
  {skip:process.env.PAYMENT_TEST_DATABASE!=='disposable'}, async t=>{
  // Fixed disposable localhost credentials: this test cannot target production.
  const cfg=postgresConfig(env),db=openPostgres(cfg);
  t.after(()=>db.end());
  assert.equal((await db.query("SELECT to_regnamespace('ip_payments') AS name")).rows[0].name,null);
  await db.query(readFileSync(new URL('../migrations/001_payments.sql',import.meta.url),'utf8'));
  const q=await createQuote(db,cfg,{label:'Synthetic service',scope:'Synthetic scope',amount:123400,expires:Date.now()+3600000});
  let row=await findQuote(db,cfg,q.token);
  const attempts=await Promise.allSettled(Array.from({length:8},()=>beginCheckout(db,cfg,row)));
  assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
  row=await findQuote(db,cfg,q.token);
  await assert.rejects(()=>findQuote(db,{...cfg,account:'live:12345'},q.token));
  let response={order_no:q.id,reference_no:'123456',order_currncy:'INR',order_amt:'1234.00',order_capt_amt:'1234.00',order_status:'Successful'};
  const api=async()=>({...response});
  const notification=changes=>encrypt(new URLSearchParams({order_id:q.id,tracking_id:'123456',currency:'INR',
    amount:'1234.00',merchant_param1:row.nonce,...changes}).toString(),cfg.workingKey);
  await assert.rejects(()=>acceptNotification(db,cfg,notification({amount:'1.00'}),api));
  await assert.rejects(()=>acceptNotification(db,cfg,notification({merchant_param1:'wrong'}),api));
  await acceptNotification(db,cfg,notification({}),api);
  assert.equal((await findQuote(db,cfg,q.token)).state,'pending');
  response.order_status='Shipped';
  response.order_amt='1.00';
  await assert.rejects(()=>acceptNotification(db,cfg,notification({}),api));
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM ip_payments.receipts')).rows[0].n),0);
  response.order_amt='1234.00';
  for (const captured of ['1.00', '0.00', undefined]) {
    response.order_capt_amt=captured;
    await assert.rejects(()=>acceptNotification(db,cfg,notification({}),api));
  }
  response.order_capt_amt='1234.00';
  response.reference_no=9007199254740992;
  await assert.rejects(()=>acceptNotification(db,cfg,notification({tracking_id:'9007199254740992'}),api));
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM ip_payments.receipts')).rows[0].n),0);
  response.reference_no='123456';
  await Promise.all(Array.from({length:8},()=>acceptNotification(db,cfg,notification({}),api)));
  assert.equal((await findQuote(db,cfg,q.token)).state,'paid');
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM ip_payments.receipts')).rows[0].n),1);
  response.order_status='Unsuccessful'; await refreshQuote(db,cfg,row,api);
  assert.equal((await findQuote(db,cfg,q.token)).state,'paid');
  response.order_status='Shipped'; response.reference_no='234567';
  await acceptNotification(db,cfg,notification({tracking_id:'234567'}),api);
  assert.equal((await findQuote(db,cfg,q.token)).state,'review');
  assert.equal(Number((await db.query('SELECT count(*) AS n FROM ip_payments.receipts')).rows[0].n),2);
  const reconnected=openPostgres(cfg);
  try { await assert.rejects(()=>beginCheckout(reconnected,cfg,row)); } finally { await reconnected.end(); }
  await db.query('CREATE ROLE payment_report_test NOLOGIN');
  await db.query('GRANT USAGE ON SCHEMA ip_payments TO payment_report_test');
  await db.query('GRANT SELECT ON ip_payments.staff_summary TO payment_report_test');
  const reader=await db.connect();
  try {
    await reader.query('SET ROLE payment_report_test');
    const safe=(await reader.query('SELECT * FROM ip_payments.staff_summary')).rows[0];
    for(const key of ['token_hash','nonce','scope','tid']) assert.ok(!(key in safe));
    await assert.rejects(()=>reader.query('SELECT * FROM ip_payments.quotes'));
    await assert.rejects(()=>reader.query("UPDATE ip_payments.staff_summary SET status='paid'"));
  } finally { await reader.query('RESET ROLE');reader.release(); }
  const server=makeServer(cfg,db,api,operations);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const r=await fetch('http://127.0.0.1:'+server.address().port+'/quote',{method:'POST',
      headers:{Origin:cfg.origin,'Content-Type':'application/json'},body:JSON.stringify({quoteToken:q.token})});
    assert.equal(r.status,200); assert.equal((await r.json()).status,'review');
  } finally { await new Promise(resolve=>server.close(resolve)); }
});
