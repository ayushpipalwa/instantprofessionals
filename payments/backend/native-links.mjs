import { fail, decrypt, uniqueParams, paise } from './core.mjs';
import { transaction } from './postgres.mjs';
import { nativeApi, quickInvoiceRequest, invoiceLinkResult } from './native-api.mjs';
import { bridgeSignature } from './bridge-auth.mjs';

export function nativeLinkOperations(invoiceDb, cfg, db, statusApi, env=process.env, fetchImpl=fetch) {
  const api=nativeApi(cfg,fetchImpl);
  const publicLink = r => ({invoiceId:r.invoice_id,invoiceNumber:r.invoice_number,
    providerInvoiceId:r.provider_invoice_id,paymentUrl:r.payment_url,state:r.state});
  async function create(input) {
    if(cfg.mode!=='live' || !invoiceDb) fail(503,'Native invoice links are unavailable.');
    const request=quickInvoiceRequest(input);
    if(!Number.isSafeInteger(input.actorId) || input.actorId<=0) fail(400,'Finance administrator is required.');
    const existing=await transaction(db,async c=>{
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[cfg.account+':'+input.invoiceId]);
      const prior=(await c.query('SELECT * FROM ip_payments.invoice_links WHERE invoice_id=$1',[input.invoiceId])).rows[0];
      if(prior) {
        if(prior.account!==cfg.account || Number(prior.amount)!==input.amount || prior.invoice_number!==input.invoiceNumber || prior.state!=='active')
          fail(409,'This invoice link needs reconciliation. Do not send another payment request.');
        return prior;
      }
      const invoice=(await invoiceDb.query('SELECT invoice_id,invoice_number,outstanding_paise FROM payment_invoice_lookup.issued_invoices WHERE invoice_id=$1',[input.invoiceId])).rows[0];
      if(!invoice || invoice.invoice_number!==input.invoiceNumber || Number(invoice.outstanding_paise)!==input.amount)
        fail(409,'Invoice balance changed. Review the invoice before sending a payment link.');
      const pending=await c.query(`SELECT 1 FROM ip_payments.quotes WHERE account=$1 AND invoice_id=$2 AND state IN ('pending','paid','review') LIMIT 1`,[cfg.account,input.invoiceId]);
      if(pending.rowCount) fail(409,'An existing website payment needs reconciliation before sending a native link.');
      await c.query(`INSERT INTO ip_payments.invoice_links(invoice_id,invoice_number,account,amount,actor_id,state) VALUES($1,$2,$3,$4,$5,'creating')`,[input.invoiceId,input.invoiceNumber,cfg.account,input.amount,input.actorId]);
    });
    if(existing) return publicLink(existing);
    // Commit creating BEFORE contacting the provider. A timeout is ambiguous and
    // must never trigger an automatic second invoice/email.
    const result=invoiceLinkResult(await api('generateQuickInvoice',request));
    const row=(await db.query(`UPDATE ip_payments.invoice_links SET provider_invoice_id=$1,payment_url=$2,state='active' WHERE invoice_id=$3 AND state='creating' RETURNING *`,[result.providerInvoiceId,result.paymentUrl,input.invoiceId])).rows[0];
    if(!row) fail(409,'Invoice link requires reconciliation.');
    return publicLink(row);
  }
  async function verifyPayment(orderId,tracking) {
    if(!/^[a-zA-Z0-9_-]{1,30}$/.test(orderId||'') || !/^\d{1,25}$/.test(tracking||'')) fail(400,'Invalid provider reference.');
    // Native invoices choose their own order IDs and have no website nonce.
    // Independently prove invoice membership before using the status result.
    const listing=await api('invoiceList',{reference_no:tracking,page_count:'1'});
    const rows=listing.invoice_List;
    if(!Array.isArray(rows)) fail(502,'Provider invoice membership could not be verified.');
    const normal=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k.toLowerCase(),v])));
    const matching=normal.filter(r=>String(r.reference_no)===tracking && r.order_no===orderId);
    if(matching.length!==1) fail(409,'Provider invoice membership requires review.');
    const member=matching[0];
    if(typeof member.reference_no==='number' && !Number.isSafeInteger(member.reference_no)) fail(409,'Payment reference requires review.');
    if(typeof member.invoice_id==='number' && !Number.isSafeInteger(member.invoice_id)) fail(409,'Invoice reference requires review.');
    const link=(await db.query('SELECT * FROM ip_payments.invoice_links WHERE account=$1 AND provider_invoice_id=$2',[cfg.account,String(member.invoice_id)])).rows[0];
    if(!link || member.invoice_ref_no!==link.invoice_id) fail(409,'Payment is not bound to an IPREPORT invoice.');
    const data=await statusApi(orderId,tracking);
    if(typeof data.reference_no==='number' && !Number.isSafeInteger(data.reference_no)) fail(409,'Payment reference requires review.');
    if(data.order_no!==orderId || String(data.reference_no)!==tracking || data.order_currncy!=='INR' ||
       paise(data.order_amt)!==Number(link.amount)) fail(409,'Provider payment does not match the invoice.');
    if(['Refunded','Chargeback','System refund','Auto-Reversed','Fraud'].includes(data.order_status)) {
      await db.query("UPDATE ip_payments.invoice_links SET state='review' WHERE invoice_id=$1",[link.invoice_id]); return;
    }
    if(data.order_status!=='Shipped') return;
    if(paise(data.order_capt_amt)!==Number(link.amount)) fail(409,'Captured amount needs invoice reconciliation.');
    const date=String(data.order_date_time||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(409,'Provider payment date requires review.');
    await transaction(db,async c=>{
      await c.query('SELECT invoice_id FROM ip_payments.invoice_links WHERE invoice_id=$1 FOR UPDATE',[link.invoice_id]);
      const prior=(await c.query('SELECT invoice_id,order_id,amount FROM ip_payments.invoice_link_receipts WHERE account=$1 AND payment_id=$2',[cfg.account,tracking])).rows[0];
      if(prior && (prior.invoice_id!==link.invoice_id || prior.order_id!==orderId || Number(prior.amount)!==Number(link.amount))) fail(409,'Provider reference was reused.');
      await c.query(`INSERT INTO ip_payments.invoice_link_receipts(account,payment_id,invoice_id,order_id,amount,payment_date) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(account,payment_id) DO NOTHING`,[cfg.account,tracking,link.invoice_id,orderId,link.amount,date]);
      const count=Number((await c.query('SELECT count(*) n FROM ip_payments.invoice_link_receipts WHERE invoice_id=$1',[link.invoice_id])).rows[0].n);
      await c.query('UPDATE ip_payments.invoice_links SET state=$1 WHERE invoice_id=$2',[count===1 && link.state!=='review'?'paid':'review',link.invoice_id]);
    });
  }
  async function notification(encrypted) {
    const body=uniqueParams(decrypt(encrypted,cfg.workingKey));
    if(body.currency!=='INR') fail(400,'Invalid invoice notification.');
    await verifyPayment(body.order_id,body.tracking_id);
    await flushReceipts();
  }
  async function flushReceipts() {
    const endpoint=env.IPREPORT_RECEIPT_ENDPOINT, secret=env.PAYMENT_BRIDGE_SECRET;
    if(endpoint!=='https://instantadvice.in/api/payments/verified-receipt' || !secret || secret.length<32)
      fail(503,'Automatic invoice receipt delivery is not configured.');
    const rows=(await db.query(`SELECT r.*,l.invoice_number,l.actor_id FROM ip_payments.invoice_link_receipts r JOIN ip_payments.invoice_links l ON l.invoice_id=r.invoice_id WHERE r.account=$1 AND r.posted_at IS NULL AND l.state='paid' ORDER BY r.created_at LIMIT 100`,[cfg.account])).rows;
    let posted=0;
    for(const r of rows) {
      const payload=JSON.stringify({invoiceId:r.invoice_id,invoiceNumber:r.invoice_number,amountPaise:Number(r.amount),
        paymentId:r.payment_id,paymentDate:r.payment_date instanceof Date?r.payment_date.toISOString().slice(0,10):r.payment_date,actorId:r.actor_id,merchantId:cfg.merchantId});
      const time=String(Date.now()), path='/api/payments/verified-receipt';
      const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{'Content-Type':'application/json','X-Payment-Time':time,'X-Payment-Signature':bridgeSignature(secret,path,time,payload)},body:payload});
      if(!response.ok) continue; // Durable outbox remains pending for retry.
      const result=await response.json();
      if(result.recorded!==true || result.paymentId!==r.payment_id) continue;
      await db.query('UPDATE ip_payments.invoice_link_receipts SET posted_at=now() WHERE account=$1 AND payment_id=$2',[cfg.account,r.payment_id]); posted++;
    }
    const legacy=(await db.query(`SELECT r.*,q.invoice_id,q.invoice_number,q.state FROM ip_payments.receipts r
      JOIN ip_payments.quotes q ON q.id=r.quote_id WHERE r.account=$1 AND r.posted_at IS NULL
      AND q.invoice_id IS NOT NULL AND q.state='paid' ORDER BY r.captured_at LIMIT 100`,[cfg.account])).rows;
    let legacyPosted=0;
    for(const r of legacy) {
      const data=await statusApi(r.quote_id,r.payment_id);
      if(typeof data.reference_no==='number' && !Number.isSafeInteger(data.reference_no)) fail(409,'Payment reference requires review.');
      if(data.order_no!==r.quote_id || String(data.reference_no)!==r.payment_id || data.order_currncy!=='INR' ||
         paise(data.order_amt)!==Number(r.amount) || data.order_status!=='Shipped' || paise(data.order_capt_amt)!==Number(r.amount)) continue;
      const date=String(data.order_date_time||'').slice(0,10);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const payload=JSON.stringify({invoiceId:r.invoice_id,invoiceNumber:r.invoice_number,amountPaise:Number(r.amount),
        paymentId:r.payment_id,paymentDate:date,merchantId:cfg.merchantId});
      const time=String(Date.now()),path='/api/payments/verified-receipt';
      const response=await fetchImpl(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
        headers:{'Content-Type':'application/json','X-Payment-Time':time,'X-Payment-Signature':bridgeSignature(secret,path,time,payload)},body:payload});
      if(!response.ok) continue;
      const result=await response.json();
      if(result.recorded!==true || result.paymentId!==r.payment_id) continue;
      await db.query('UPDATE ip_payments.receipts SET posted_at=now() WHERE account=$1 AND payment_id=$2',[cfg.account,r.payment_id]);legacyPosted++;
    }
    return {posted:posted+legacyPosted,pending:rows.length-posted+legacy.length-legacyPosted};
  }
  async function reconcile() {
    const links=(await db.query(`SELECT provider_invoice_id FROM ip_payments.invoice_links l WHERE account=$1 AND
      (state='active' OR (state='paid' AND EXISTS(SELECT 1 FROM ip_payments.invoice_link_receipts r WHERE r.invoice_id=l.invoice_id AND r.posted_at IS NULL))) ORDER BY created_at`,[cfg.account])).rows;
    let reviewed=0;
    for(const link of links) {
      let page=1, pages=1;
      do {
        const result=await api('invoiceList',{invoice_id:link.provider_invoice_id,page_count:String(page)});
        if(!Array.isArray(result.invoice_List)) fail(502,'Invoice lookup needs review.');
        pages=Number(result.page_count||1);
        if(!Number.isSafeInteger(pages) || pages<1 || pages>100) fail(502,'Invoice lookup needs review.');
        for(const original of result.invoice_List) {
          const row=Object.fromEntries(Object.entries(original).map(([k,v])=>[k.toLowerCase(),v]));
          if(row.order_no && row.reference_no) {await verifyPayment(row.order_no,String(row.reference_no)); reviewed++;}
        }
        page++;
      } while(page<=pages);
    }
    return {reviewed,...await flushReceipts()};
  }
  return {create,notification,verifyPayment,flushReceipts,reconcile};
}
