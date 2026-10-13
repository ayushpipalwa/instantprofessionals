import * as operations from './postgres.mjs';
import { makeServer } from './server.mjs';
import { gateway } from './core.mjs';
import { invoiceOperations } from './invoices.mjs';
import { nativeLinkOperations } from './native-links.mjs';
import { decrypt, uniqueParams } from './core.mjs';
const cfg = operations.postgresConfig(), db = operations.openPostgres(cfg);
// No automatic migrations or seeds. Fail startup if the payment schema is unavailable.
await db.query('SELECT id FROM ip_payments.quotes LIMIT 0');
const invoiceDb = cfg.mode === 'live' && process.env.PAYMENT_INVOICE_DATABASE
  ? operations.openPostgres({ ...cfg, sql: { ...cfg.sql, database: process.env.PAYMENT_INVOICE_DATABASE, max: 2 } }) : null;
if (invoiceDb) {
  await invoiceDb.query('SELECT invoice_id FROM payment_invoice_lookup.issued_invoices LIMIT 0');
  await db.query('SELECT invoice_id FROM ip_payments.quotes LIMIT 0');
}
const statusApi=gateway(cfg);
const ops=invoiceDb ? invoiceOperations(invoiceDb) : operations;
const native=process.env.PAYMENT_NATIVE_LINKS_ENABLED==='true' && invoiceDb
  ? nativeLinkOperations(invoiceDb,cfg,db,statusApi) : null;
if(native) {
  await db.query('SELECT invoice_id FROM ip_payments.invoice_links LIMIT 0');
  ops.notificationOrder=async encrypted=>{
    const body=uniqueParams(decrypt(encrypted,cfg.workingKey));
    const exists=await db.query('SELECT id FROM ip_payments.quotes WHERE account=$1 AND id=$2',[cfg.account,body.order_id||'']);
    return exists.rowCount ? 'website' : 'native';
  };
  const accept=ops.acceptNotification,refresh=ops.refreshQuote;
  ops.acceptNotification=async(...args)=>{await accept(...args);await native.flushReceipts();};
  ops.refreshQuote=async(...args)=>{const q=await refresh(...args);if(q.state==='paid') await native.flushReceipts();return q;};
}
const server = makeServer(cfg, db, statusApi, ops, native);
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => {
  server.close(async () => { await db.end(); if (invoiceDb) await invoiceDb.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 9000).unref();
});
