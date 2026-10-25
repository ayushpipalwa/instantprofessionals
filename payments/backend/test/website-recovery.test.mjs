import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeLinkOperations } from '../native-links.mjs';

// Small transactional adapter exercises the production verification and outbox path.
function fixture(patches={}) {
  let quotes=[{id:'ip_fixture',account:'live',state:'pending',initiated_at:1,amount:100,
    invoice_id:'invoice-fixture',invoice_number:'IPW/26-27/3',...patches}];
  let receipts=[],snapshot;
  const queries=[];
  const db={release(){},async connect(){return this;},async query(sql,args=[]) {
    queries.push([sql,args]);
    let rows=[];
    if(sql==='BEGIN') snapshot=structuredClone({quotes,receipts});
    else if(sql==='ROLLBACK') ({quotes,receipts}=snapshot);
    else if(sql==='COMMIT') snapshot=null;
    else if(sql.includes("AND state='pending' AND initiated_at"))
      rows=quotes.filter(q=>q.account===args[0] && q.state==='pending' && q.initiated_at && q.invoice_id);
    else if(sql.includes('SELECT provider_invoice_id')) rows=[];
    else if(sql.includes('invoice_link_receipts')) rows=[];
    else if(sql.includes('JOIN ip_payments.quotes'))
      rows=receipts.filter(r=>!r.posted_at).flatMap(r=>quotes.filter(q=>q.id===r.quote_id && q.state==='paid').map(q=>({...q,...r})));
    else if(sql.startsWith('SELECT * FROM ip_payments.quotes'))
      rows=quotes.filter(q=>q.id===args[0] && (args.length===1 || q.account===args[1]));
    else if(sql.startsWith('INSERT INTO ip_payments.receipts')) {
      if(!receipts.some(r=>r.account===args[0] && r.payment_id===args[1]))
        receipts.push({account:args[0],payment_id:args[1],quote_id:args[2],amount:args[3],captured_at:args[4]});
    } else if(sql.startsWith('SELECT quote_id')) rows=receipts.filter(r=>r.account===args[0] && r.payment_id===args[1]);
    else if(sql.startsWith('SELECT count(*)')) rows=[{n:receipts.filter(r=>r.quote_id===args[0]).length}];
    else if(sql.includes('SET state=$1')) Object.assign(quotes.find(q=>q.id===args[3]),{state:args[0],payment_id:args[1],paid_at:args[2]});
    else if(sql.includes('SET posted_at')) receipts.find(r=>r.payment_id===args[1]).posted_at=true;
    else if(sql.includes('SET updated_at')) {} // Retry rotation, asserted below.
    else throw Error('Unexpected fixture query');
    return {rows:structuredClone(rows)};
  }};
  let calls=0,posts=0;
  const status=async id=>{calls++;return {order_no:id,reference_no:'123456789',order_currncy:'INR',
    order_amt:'1.00',order_capt_amt:'1.00',order_status:'Shipped',order_date_time:'2026-10-20 14:01:19'};};
  const env={IPREPORT_RECEIPT_ENDPOINT:'https://instantadvice.in/api/payments/verified-receipt',PAYMENT_BRIDGE_SECRET:'fixture-secret-'.repeat(4)};
  const run=api=>nativeLinkOperations(null,{mode:'live',account:'live',merchantId:'12345'},db,api||status,env,async(url,options)=>{
    posts++;const body=JSON.parse(options.body);assert.equal(body.amountPaise,100);
    return {ok:true,json:async()=>({recorded:true,paymentId:body.paymentId})};
  }).reconcile();
  return {run,status,queries,get quotes(){return quotes;},get receipts(){return receipts;},get posts(){return posts;},get calls(){return calls;}};
}

test('missed callback recovers the verified ₹1 receipt once and repeated jobs do not duplicate it',async()=>{
  const f=fixture();const first=await f.run();
  assert.equal(first.websiteReviewed,1);assert.equal(first.posted,1);
  assert.equal(f.quotes[0].state,'paid');assert.equal(f.receipts.length,1);assert.equal(f.posts,1);
  assert.equal((await f.run()).posted,0);assert.equal(f.receipts.length,1);assert.equal(f.posts,1);
  assert.match(f.queries[0][0],/ORDER BY updated_at,id LIMIT 100/);
});
test('amount/capture/currency/order/reference mismatches never create receipts',async()=>{
  for(const patch of [{order_amt:'2.00'},{order_capt_amt:'0.50'},{order_currncy:'USD'},
    {order_no:'another-order'},{reference_no:9007199254740992}]) {
    const f=fixture();const r=await f.run(async id=>({...await f.status(id),...patch}));
    assert.equal(r.websiteFailed,1);assert.equal(f.receipts.length,0);assert.equal(f.posts,0);
    assert.equal(f.quotes[0].state,'pending');
    assert.ok(f.queries.some(([sql])=>sql.includes('SET updated_at')));
  }
});
test('uninitiated, unbound, other-account and review orders are excluded',async()=>{
  for(const patch of [{initiated_at:null},{invoice_id:null},{account:'test'},{state:'review'},{state:'new'}]) {
    const f=fixture(patch);assert.equal((await f.run()).websiteReviewed,0);assert.equal(f.calls,0);assert.equal(f.posts,0);
  }
});
test('provider outage stays pending for a later successful retry',async()=>{
  const f=fixture();assert.equal((await f.run(async()=>{throw Error('private provider diagnostic');})).websiteFailed,1);
  assert.equal(f.receipts.length,0);assert.equal((await f.run()).posted,1);
});
