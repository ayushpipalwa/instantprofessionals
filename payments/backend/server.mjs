import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { config, openStore, fail, findQuote, publicQuote, gateway, beginCheckout, refreshQuote, acceptNotification, uniqueParams } from './core.mjs';
async function readBody(req, limit) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) fail(413, 'Request is too large.'); chunks.push(chunk); }
  return Buffer.concat(chunks).toString('utf8');
}
export function makeServer(cfg, db, api = gateway(cfg), operations = { findQuote, beginCheckout, refreshQuote, acceptNotification }) {
  const buckets = new Map();
  const server = createServer(async (req, res) => {
    const send = (code, data) => { res.writeHead(code); res.end(data ? JSON.stringify(data) : undefined); };
    const back = () => { res.writeHead(303, { Location: cfg.origin + '/payments/' }); res.end(); };
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Vary', 'Origin');
    const callback = ['/callback', '/cancel'].includes(req.url), notification = callback || req.url === '/webhook';
    try {
      if (req.url === '/health' && req.method === 'GET') return send(200, { ok: true, mode: cfg.mode, provider: 'ccavenue' });
      if (!notification && !['/quote', '/session', '/status'].includes(req.url)) fail(404, 'Not found.');
      if (!notification) {
        if (req.headers.origin !== cfg.origin) fail(403, 'Origin is not allowed.');
        res.setHeader('Access-Control-Allow-Origin', cfg.origin); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return send(204);
      }
      // Ignore untrusted forwarded IPs. Configure per-client limits at a trusted edge.
      const now = Date.now(), key = (notification ? 'notify:' : 'client:') + req.socket.remoteAddress;
      for (const [ip, b] of buckets) if (b.until <= now) buckets.delete(ip);
      const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
      if (buckets.size >= 10000 && !buckets.has(key)) fail(429, 'Please try again later.');
      bucket.count++; buckets.set(key, bucket);
      if (bucket.count > 120) { res.setHeader('Retry-After', '60'); fail(429, 'Please try again later.'); }
      if (req.url === '/cancel' && req.method === 'GET') return back();
      if (req.method !== 'POST') fail(405, 'Use POST.');
      const type = notification ? /^application\/x-www-form-urlencoded(?:;|$)/i : /^application\/json(?:;|$)/i;
      if (!type.test(req.headers['content-type'] || '')) fail(415, 'Unsupported content type.');
      const raw = await readBody(req, notification ? 140000 : 8192);
      if (notification) {
        const body = uniqueParams(raw);
        await operations.acceptNotification(db, cfg, body.encResp, api);
        return callback ? back() : send(200, { received: true });
      }
      let body;
      try { body = JSON.parse(raw); } catch { fail(400, 'Invalid JSON.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid request.');
      let q = await operations.findQuote(db, cfg, body.quoteToken);
      if (req.url === '/session') return send(200, await operations.beginCheckout(db, cfg, q));
      if (req.url === '/status') q = await operations.refreshQuote(db, cfg, q, api);
      send(200, publicQuote(q, cfg));
    } catch (error) {
      if (callback) return back(); // Fixed return URL, no success claims or secrets in redirects.
      send(error.status || 502, { error: error.status ? error.message : 'Payment service unavailable. Check status before retrying.' });
    }
  });
  server.requestTimeout = 20000; server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = config(), db = openStore(cfg.dbPath), server = makeServer(cfg, db);
  server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('CCAvenue payments started (' + cfg.mode + ').'));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
