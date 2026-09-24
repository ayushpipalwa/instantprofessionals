import * as operations from './postgres.mjs';
import { makeServer } from './server.mjs';
import { gateway } from './core.mjs';
const cfg = operations.postgresConfig(), db = operations.openPostgres(cfg);
// No automatic migrations or seeds. Fail startup if the payment schema is unavailable.
await db.query('SELECT id FROM ip_payments.quotes LIMIT 0');
const server = makeServer(cfg, db, gateway(cfg), operations);
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => {
  server.close(async () => { await db.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 9000).unref();
});
