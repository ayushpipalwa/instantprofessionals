// Private operator CLI. No public administrative HTTP endpoint.
import { readFileSync } from 'node:fs';
import { postgresConfig,openPostgres,createQuote,refreshQuote } from './postgres.mjs';
import { gateway } from './core.mjs';
const cfg=postgresConfig(), db=openPostgres(cfg);
const [command,argument,tracking]=process.argv.slice(2);
try {
  if (command==='quote') console.log(JSON.stringify(await createQuote(db,cfg,JSON.parse(readFileSync(argument,'utf8')))));
  else if(command==='list') console.table((await db.query('SELECT * FROM ip_payments.staff_summary WHERE account=$1 ORDER BY created_at DESC LIMIT 100',[cfg.account])).rows);
  else if(command==='reconcile' && (!tracking || /^\d{1,25}$/.test(tracking))) {
    const q=(await db.query('SELECT * FROM ip_payments.quotes WHERE id=$1 AND account=$2',[argument,cfg.account])).rows[0];
    if(!q) throw Error('Quote not found');
    const r=await refreshQuote(db,cfg,q,gateway(cfg),tracking);
    console.log(JSON.stringify({reference:r.id,status:r.state}));
  } else throw Error('Use quote PRIVATE.json | list | reconcile QUOTE_ID [TRACKING_ID]');
} finally { await db.end(); }
