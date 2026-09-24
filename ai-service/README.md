# Instant Professionals AI — private preview

## Architecture and preservation

The existing site is static HTML on GitHub Pages, deployed from `master` by `.github/workflows/deploy-pages.yml`. `/ai/index.html` is an additive, standalone multipage route. It uses the existing logo, navy branding and gold accent, with its own scoped stylesheet and JavaScript. No router, framework, build step, rewrites, global scripts, navigation modifications or existing page changes are required. Open `/ai/` directly; its Home, Services, Contact and Privacy links navigate to the existing website. The preview is `noindex,nofollow`; this is not access control.

`ai/config.js` contains only a public API address. `ai-service/server.mjs` is a separate, dependency-free Node 22+ service for a compatible Chat Completions provider. GitHub Pages cannot execute this service. Do not put credentials in HTML, JavaScript, GitHub Pages settings intended for browser use, or this public repository. The current Pages workflow publishes the repository, including these source files: source contains no secrets, and local environment files must never be committed or included in a Pages artifact.

## Configure and run

1. On a separate Node host, copy `ai-service/` and create `.env` from `.env.example` (or inject environment variables through the host's secret manager). Keep this directory outside any public document root. Use Node 22 or newer.
2. Set `AI_API_URL` to the provider's full HTTPS Chat Completions endpoint, `AI_API_KEY` to a server-only provider key, and `AI_MODEL` to a model enabled for that account. The adapter sends `model`, `messages`, `stream:false` and `max_tokens:2000`, and expects `choices[0].message.content`. Verify compatibility with your selected provider; no model or paid account is assumed. Restrict the provider key and set account spending limits.
3. Set `TEAM_ACCESS_TOKEN` to at least 32 random characters, shared only with the internal pilot team. Generate one using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. This is separate from the provider key. Set `ALLOWED_ORIGIN` to the exact frontend origin (no trailing slash), e.g. `https://instantprofessionals.in`. Set `HOST=0.0.0.0` only if your hosting platform requires it; otherwise keep loopback behind an HTTPS reverse proxy. Set `PORT` as needed.
4. Run `npm start` in `ai-service/` with a local `.env`, or `node server.mjs` with host-injected variables. Terminate TLS at the host/reverse proxy. Do not expose an HTTP service publicly. Configure the proxy's body limit to 100 KB and request deadline to 60 seconds. Disable request body and Authorization-header logging in the proxy/host.
5. Set `window.IP_AI_CONFIG.apiBase` in `ai/config.js` to the HTTPS service origin, without `/chat`. This URL is public. For local testing only, use `http://127.0.0.1:8787` with frontend `http://127.0.0.1:8080`. Serve the repository with any static server. Open `/ai/`, choose Connection settings and enter the team token. No provider key belongs in the browser.
6. Test the configured service with synthetic data, review privacy/provider retention settings and get professional approval before using real client documents. The provider may retain submissions according to your account terms. The frontend stores neither transcripts nor tokens in localStorage, cookies or URLs. Refresh clears tab memory. The service logs no request content and has no transcript database. Clear a conversation before switching client matters.

## Capabilities and boundaries

- Ten workflow entry points: GST, Income Tax, Companies Act/ROC, Audit, FEMA, Trademark/IP, Document analysis, Drafting, Calculations and Live research.
- Model-backed drafting and Q&A work after configuration. Each request includes professional instructions about jurisdiction, periods, primary-source verification, uncertain law and human review. These instructions reduce mistakes but do not establish factual accuracy.
- Text document attachment supports TXT, Markdown and CSV only (24 KB, 16,000 characters). Content is explicitly shown as attached and sent on submission. PDF/DOCX/OCR, malware scanning and document storage are future adapters, not implemented capabilities.
- Calculations use model-generated working, not a deterministic calculator. Existing website calculators remain untouched. Verify independently.
- Live research is an explicit entry point that returns HTTP 501 with an honest unavailable message. No browsing, verified citations or automatic legal updates are claimed. Add a server-owned research adapter with approved sources, retrieval dates and evidence-linked answers before enabling it. Treat retrieved content as untrusted; never allow model-provided URLs unrestricted network access.
- No filings, email sending, Drive access, persistent memory or cross-client retrieval are implemented. Add authenticated per-user/tenant authorization and explicit action review before such integrations.

## Security and operations

The service fails closed when required configuration is missing. It enforces exact-origin CORS plus constant-time token authentication (CORS alone is not authentication), role/mode allowlists, message and body limits, output limits, a 45-second provider timeout, 20 requests/minute and three concurrent requests per process. Provider redirects are rejected. The UI renders plain text via DOM text nodes, not raw HTML/Markdown. Model and endpoint are controlled only by the server.

The shared token is for a small internal pilot, not production multi-user identity. It grants all pilot users the same access. Rotate by changing the server secret. Process-local limits reset on restart and do not coordinate across replicas: keep one instance for the pilot or add a shared quota store/API gateway. Before a broader rollout, add SSO, per-user budgets, revocation, tenant separation, monitored abuse controls and provider retention review. Restrict the entire frontend with an identity proxy if even the preview UI must be private; GitHub Pages serves the shell publicly.

## Validation and deployment

Run `npm test` in `ai-service/`. These tests use a fake provider; they do not spend credits or prove a real provider integration. Browser checks should cover desktop/mobile, keyboard navigation, mode selection, attachment removal, new conversation, safe HTML rendering, configuration/auth failures, network failure and cancellation. Verify all pre-existing Git tree entries are unchanged; case-colliding legacy filenames on Windows must never be staged incidentally.

Review this feature branch/PR before merging. No new deployment workflow is included. Pushing this branch does not trigger the existing master-only Pages deployment. Deploy the backend separately; leave the public API address empty until ready. Merging to master adds only the preview route; existing navigation remains unchanged. Roll back by reverting this additive commit and stopping the separate backend.
