import { postgresConfig, openPostgres } from './postgres.mjs';
import { gateway } from './core.mjs';
import { nativeLinkOperations } from './native-links.mjs';
const cfg=postgresConfig();
if(cfg.mode!=='live' || process.env.PAYMENT_NATIVE_LINKS_ENABLED!=='true') throw Error('LIVE invoice reconciliation is not enabled.');
const db=openPostgres(cfg);
try {
  const result=await nativeLinkOperations(null,cfg,db,gateway(cfg)).reconcile();
 console.log(JSON.stringify({reviewed:result.reviewed,websiteReviewed:result.websiteReviewed,websiteFailed:result.websiteFailed,posted:result.posted,pending:result.pending}));
} catch {
  console.error('Invoice reconciliation requires review. No credentials or provider payloads are logged.');
  process.exitCode=1;
} finally {await db.end();}
