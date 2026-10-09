import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { invoiceCredentials, remainingAmount, invoiceOperations } from '../invoices.mjs';
import { postgresConfig, openPostgres } from '../postgres.mjs';
import { decrypt, encrypt, publicQuote } from '../core.mjs';
import { makeServer } from '../server.mjs';

test('Invoice lookup rejects browser amounts and validates private details', () => {
  assert.deepEqual(invoiceCredentials({invoiceNumber:' IP/26/1 ',email:' CLIENT@example.test '}),
    invoiceCredentials({invoiceNumber:'IP/26/1',email:'client@example.test'}));
  for (const body of [{invoiceNumber:'x',email:'x'}, {invoiceNumber:'x',email:'a@b.test',amount:100},
    {invoiceNumber:'x',email:'a@b.test',orderId:'browser-controlled'}, {invoiceNumber:'',email:'a@b.test'}])
    assert.throws(() => invoiceCredentials(body));
});
test('Provider receipts reduce balance once, including after IPREPORT posting', () => {
  const receipts=[{payment_id:'111',amount:100},{payment_id:'222',amount:200}];
  assert.equal(remainingAmount({outstanding_paise:1000,posted_payment_references:[]},receipts),700);
  assert.equal(remainingAmount({outstanding_paise:900,posted_payment_references:['111']},receipts),700);
  assert.throws(()=>remainingAmount({outstanding_paise:'9007199254740993'},[]));
});
test('Disposable PostgreSQL invoice lifecycle, concurrent checkout and callback idempotency',
 {skip:process.env.PAYMENT_TEST_DATABASE!=='disposable'}, async t => {
  // Fixed localhost disposable DB; credentials are fixtures and no provider is called.
  const env={PAYMENT_MODE:'test',CCAVENUE_MERCHANT_ID:'12345',CCAVENUE_ACCESS_CODE:'fixture',
    CCAVENUE_WORKING_KEY:'fixture',CCAVENUE_API_ACCESS_CODE:'fixture',CCAVENUE_API_WORKING_KEY:'fixture',
    CCAVENUE_KIT_VERIFIED:'true',ALLOWED_ORIGIN:'http://localhost:8080',PAYMENT_PUBLIC_ORIGIN:'http://localhost:3001',
    PAYMENT_SQL_HOST:'127.0.0.1',PAYMENT_SQL_USER:'payments_test',PAYMENT_SQL_PASSWORD:'disposable_ci_only',
    PAYMENT_SQL_DATABASE:'ip_payments_invoice_test',PAYMENT_SQL_PORT:process.env.PAYMENT_TEST_PORT || '5432'};
  const cfg={...postgresConfig(env),mode:'live',account:'live:12345'},db=openPostgres(cfg);
  t.after(()=>db.end());
  await db.query(readFileSync(new URL('../migrations/001_payments.sql',import.meta.url),'utf8'));
  await db.query(readFileSync(new URL('../migrations/003_invoice_bindings.sql',import.meta.url),'utf8'));
  await db.query(`CREATE SCHEMA payment_invoice_lookup;
    CREATE TABLE payment_invoice_lookup.fixture (invoice_id text,invoice_number text,outstanding_paise bigint,client_email_hash text,posted_payment_references jsonb);
    CREATE VIEW payment_invoice_lookup.issued_invoices AS SELECT * FROM payment_invoice_lookup.fixture;
    INSERT INTO payment_invoice_lookup.fixture VALUES ('one','IP/26/1',10000,md5('client@example.test'),'[]'),
      ('two','IP/26/2',20000,md5('client@example.test'),'[]'),('three','IP/26/3',30000,md5('client@example.test'),'[]');`);
  const ops=invoiceOperations(db),body={invoiceNumber:'IP/26/1',email:'client@example.test'};
  await assert.rejects(()=>ops.lookupInvoice(db,{...cfg,mode:'test'},body));
  await assert.rejects(()=>ops.lookupInvoice(db,cfg,{...body,email:'wrong@example.test'}),/No payable invoice/);
  await assert.rejects(()=>ops.lookupInvoice(db,cfg,{...body,invoiceNumber:'unknown'}),/No payable invoice/);
  const reviews=await Promise.all(Array.from({length:8},()=>ops.lookupInvoice(db,cfg,body)));
  const attempts=await Promise.allSettled(reviews.map(r=>ops.beginCheckout(db,cfg,r.quote)));
  assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
  const winner=attempts.findIndex(a=>a.status==='fulfilled'),r=reviews[winner];
  const wire=new URLSearchParams(decrypt(attempts[winner].value.fields.encRequest,cfg.workingKey));
  assert.equal(wire.get('amount'),'100.00');assert.equal(wire.get('order_id'),r.quote.id);
  assert.equal(publicQuote(r.quote,cfg).invoiceNumber,'IP/26/1');
  await assert.rejects(()=>ops.lookupInvoice(db,cfg,body),/awaiting verification/);
  const q=await ops.findQuote(db,cfg,r.token),message=encrypt(new URLSearchParams({order_id:q.id,tracking_id:'123456',currency:'INR',amount:'100.00',merchant_param1:q.nonce}).toString(),cfg.workingKey);
  let state='Successful'; const api=async()=>({order_no:q.id,reference_no:'123456',order_currncy:'INR',order_amt:'100.00',order_capt_amt:'100.00',order_status:state});
  await ops.acceptNotification(db,cfg,message,api);
  assert.equal((await ops.findQuote(db,cfg,r.token)).state,'pending');
  state='Shipped';
  await Promise.all(Array.from({length:8},()=>ops.acceptNotification(db,cfg,message,api)));
  assert.equal((await ops.findQuote(db,cfg,r.token)).state,'paid');
  assert.equal(Number((await db.query('SELECT count(*) n FROM ip_payments.receipts')).rows[0].n),1);
  assert.equal(Number((await db.query('SELECT count(*) n FROM ip_payments.events')).rows[0].n),1);
  await assert.rejects(()=>ops.lookupInvoice(db,cfg,body),/no outstanding/);
  // The read-only bridge does not post into IPREPORT. Receipt references permit
  // staff posting without subtracting the captured amount for a second time.
  await db.query("UPDATE payment_invoice_lookup.fixture SET outstanding_paise=15000,posted_payment_references='[\"123456\"]' WHERE invoice_id='one'");
  assert.equal((await ops.lookupInvoice(db,cfg,body)).quote.amount,15000);
  const second=await ops.lookupInvoice(db,cfg,{...body,invoiceNumber:'IP/26/2'});
  await db.query("UPDATE payment_invoice_lookup.fixture SET outstanding_paise=10000 WHERE invoice_id='two'");
  await assert.rejects(()=>ops.beginCheckout(db,cfg,second.quote),/balance has changed/);
  const third=await ops.lookupInvoice(db,cfg,{...body,invoiceNumber:'IP/26/3'});
  await db.query("DELETE FROM payment_invoice_lookup.fixture WHERE invoice_id='three'");
  await assert.rejects(()=>ops.beginCheckout(db,cfg,third.quote),/No payable invoice/);
  const server=makeServer(cfg,db,api,ops);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const response=await fetch('http://127.0.0.1:'+server.address().port+'/invoice',{method:'POST',headers:{Origin:cfg.origin,'Content-Type':'application/json'},body:JSON.stringify({...body,amount:1})});
    assert.equal(response.status,400);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
