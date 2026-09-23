import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { config, openStore, fail, validSignature, findQuote, publicQuote, gateway,
  ensureOrder, recordPayment, refreshQuote, transaction } from './core.mjs';

async function readBody(req, limit) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail(413, 'Request is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export function makeServer(cfg, db, api = gateway(cfg)) {
  const buckets = new Map();
  const allowedPaths = new Set(['/quote', '/orders', '/verify', '/status']);
  const server = createServer(async (req, res) => {
    const send = (code, data) => { res.writeHead(code); res.end(data ? JSON.stringify(data) : undefined); };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    try {
      if (req.url === '/health' && req.method === 'GET') return send(200, { ok: true, mode: cfg.mode });
      const webhook = req.url === '/webhook';
      if (!webhook && !allowedPaths.has(req.url)) fail(404, 'Not found.');
      if (!webhook) {
        if (req.headers.origin !== cfg.origin) fail(403, 'Origin is not allowed.');
        res.setHeader('Access-Control-Allow-Origin', cfg.origin);
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return send(204);
        // Do not trust arbitrary X-Forwarded-For. Add per-client limiting at the trusted edge.
        const now = Date.now(), key = req.socket.remoteAddress;
        for (const [ip, bucket] of buckets) if (bucket.until <= now) buckets.delete(ip);
        const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
        if (buckets.size >= 10000 && !buckets.has(key)) fail(429, 'Please try again later.');
        bucket.count++; buckets.set(key, bucket);
        if (bucket.count > 120) { res.setHeader('Retry-After', '60'); fail(429, 'Please try again later.'); }
      }
      if (req.method !== 'POST') fail(405, 'Use POST.');
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) fail(415, 'Use JSON.');
      const raw = await readBody(req, webhook ? 262144 : 8192);
      if (webhook && !validSignature(raw, req.headers['x-razorpay-signature'], cfg.webhookSecret)) fail(401, 'Invalid webhook signature.');
      let body;
      try { body = JSON.parse(raw.toString('utf8')); } catch { fail(400, 'Invalid JSON.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid request.');
      if (webhook) {
        const id = req.headers['x-razorpay-event-id'];
        if (typeof id !== 'string' || !/^[\w-]{1,200}$/.test(id)) fail(400, 'Missing event identifier.');
        transaction(db, () => {
          if (db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(id)) return;
          if (['payment.captured', 'order.paid', 'payment.failed'].includes(body.event)) {
            const payment = body.payload?.payment?.entity;
            if (!payment || typeof payment.order_id !== 'string') fail(400, 'Missing payment.');
            const quote = db.prepare('SELECT * FROM quotes WHERE order_id = ? AND key_id = ?').get(payment.order_id, cfg.key);
            // Unknown orders may belong to another merchant integration. No fulfillment.
            // Return retryable error so an in-flight/ambiguous order can be reconciled first.
            if (!quote) fail(503, 'Order requires reconciliation.');
            recordPayment(db, quote, payment);
          }
          db.prepare('INSERT INTO webhook_events VALUES (?, ?)').run(id, Date.now());
        });
        return send(200, { received: true });
      }
      let quote = findQuote(db, cfg, body.quoteToken);
      if (req.url === '/quote') return send(200, { ...publicQuote(quote), mode: cfg.mode });
      if (req.url === '/orders') return send(200, await ensureOrder(db, cfg, quote, api));
      if (req.url === '/verify') {
        if (!quote.order_id || body.razorpay_order_id !== quote.order_id ||
            !/^pay_[a-zA-Z0-9]+$/.test(body.razorpay_payment_id) ||
            !validSignature(`${quote.order_id}|${body.razorpay_payment_id}`, body.razorpay_signature, cfg.secret)) {
          fail(400, 'Payment verification failed. Check status before retrying payment.');
        }
        const payment = await api(`/payments/${body.razorpay_payment_id}`);
        transaction(db, () => recordPayment(db, db.prepare('SELECT * FROM quotes WHERE id = ?').get(quote.id), payment));
        quote = findQuote(db, cfg, body.quoteToken);
      } else quote = await refreshQuote(db, cfg, quote, api);
      send(200, publicQuote(quote));
    } catch (error) {
      // Never return/log provider responses, request bodies, signatures, or credentials.
      send(error.status || 502, { error: error.status ? error.message : 'Payment service unavailable. Check status before retrying payment.' });
    }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = config();
  const db = openStore(cfg.dbPath);
  const server = makeServer(cfg, db);
  server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log(`Payments service started (${cfg.mode}).`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
