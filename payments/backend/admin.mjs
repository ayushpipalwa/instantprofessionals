// Private operator CLI; never expose as a public endpoint.
import { readFileSync } from 'node:fs';
import { config, openStore, createQuote, gateway, refreshQuote } from './core.mjs';
const cfg = config(), db = openStore(cfg.dbPath), api = gateway(cfg);
const [command, argument, tracking] = process.argv.slice(2);
try {
  if (command === 'quote') console.log(JSON.stringify(createQuote(db, cfg, JSON.parse(readFileSync(argument, 'utf8'))), null, 2));
  else if (command === 'list') console.table(db.prepare('SELECT id, label, amount, state, payment_id FROM cca_quotes WHERE account = ?').all(cfg.account));
  else if (command === 'reconcile' && (!tracking || /^\d{1,25}$/.test(tracking))) {
    const quote = db.prepare('SELECT * FROM cca_quotes WHERE id = ? AND account = ?').get(argument, cfg.account);
    if (!quote) throw new Error('Quote not found.');
    const result = await refreshQuote(db, cfg, quote, api, tracking);
    console.log(JSON.stringify({ reference: result.id, status: result.state, paymentId: result.payment_id }));
  } else throw new Error('Usage: admin.mjs quote PRIVATE_QUOTE.json | list | reconcile QUOTE_ID [CCAVENUE_TRACKING_ID]');
} finally { db.close(); }
