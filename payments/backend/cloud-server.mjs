import * as operations from './postgres.mjs';
import { makeServer } from './server.mjs';
import { gateway } from './core.mjs';
import { invoiceOperations } from './invoices.mjs';
const cfg = operations.postgresConfig(), db = operations.openPostgres(cfg);
// No automatic migrations or seeds. Fail startup if the payment schema is unavailable.
await db.query('SELECT id FROM ip_payments.quotes LIMIT 0');
const invoiceDb = cfg.mode === 'live' && process.env.PAYMENT_INVOICE_DATABASE
  ? operations.openPostgres({ ...cfg, sql: { ...cfg.sql, database: process.env.PAYMENT_INVOICE_DATABASE, max: 2 } }) : null;
if (invoiceDb) {
  await invoiceDb.query('SELECT invoice_id FROM payment_invoice_lookup.issued_invoices LIMIT 0');
  await db.query('SELECT invoice_id FROM ip_payments.quotes LIMIT 0');
}
const server = makeServer(cfg, db, gateway(cfg), invoiceDb ? invoiceOperations(invoiceDb) : operations);
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => {
  server.close(async () => { await db.end(); if (invoiceDb) await invoiceDb.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 9000).unref();
});
