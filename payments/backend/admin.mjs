// Private operator CLI. Run on the backend host; never expose as a web endpoint.
import { readFileSync } from 'node:fs';
import { config, openStore, createQuote, gateway, checkOrder, refreshQuote } from './core.mjs';
const cfg = config(), db = openStore(cfg.dbPath), api = gateway(cfg);
const [command, argument, orderId] = process.argv.slice(2);
try {
  if (command === 'quote') {
    const input = JSON.parse(readFileSync(argument, 'utf8'));
    console.log(JSON.stringify(createQuote(db, cfg, input), null, 2));
  } else if (command === 'list') {
    console.table(db.prepare('SELECT id, label, amount, expires, state, order_id, payment_id FROM quotes WHERE key_id = ?').all(cfg.key));
  } else if (command === 'reconcile' && /^order_[a-zA-Z0-9]+$/.test(orderId)) {
    const quote = db.prepare('SELECT * FROM quotes WHERE id = ? AND key_id = ?').get(argument, cfg.key);
    if (!quote || quote.order_id || quote.state !== 'creating') throw new Error('Only unresolved order creation can be reconciled.');
    const order = await api(`/orders/${orderId}`); checkOrder(quote, order);
    db.prepare("UPDATE quotes SET order_id = ?, state = 'ready' WHERE id = ?").run(orderId, quote.id);
    await refreshQuote(db, cfg, { ...quote, order_id: orderId }, api);
    console.log('Order reconciled.');
  } else throw new Error('Usage: admin.mjs quote PRIVATE_QUOTE.json | list | reconcile QUOTE_ID ORDER_ID');
} finally { db.close(); }
