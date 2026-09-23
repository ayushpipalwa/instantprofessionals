# Payments: Razorpay quote checkout

## Current status and architecture

Implemented on production base `1ce64ea`. Existing multipage HTML, branding, enquiry forms,
Google Apps Script lead capture, WhatsApp routing and indicative package prices are preserved.
No gateway configuration was present. The AI funnel has six unpriced offers; service pages
explicitly require scope review and separate taxes/government charges. Consequently this
integration charges only a privately issued, fixed-total quote, not an indicative package price.
No product prices, tax amounts or merchant credentials have been invented.

`/payments/` is a static, responsive checkout page linked from the AI offer section and the
shared service-page enquiry script. The buyer opens a private quote link or enters its code,
reviews scope/total, accepts terms, and opens Razorpay Standard Checkout. It supports INR
with UPI/cards as enabled and available on the merchant account. This is one-time checkout;
the reminder plan is NOT automatically turned into a subscription or recurring debit.

GitHub Pages cannot execute payment APIs. Deploy `payments/backend/` as a separate Node
service, with HTTPS and an attached persistent disk. The Pages workflow now stages an
allowlist of public web assets into `_site`, excluding backend folders, environment files,
databases and tooling. The unmerged AI workspace in PR #61 remains independent; this
change neither depends on nor modifies its private AI API or credentials.

**Disabled by default:** `payments/config.js` has an empty `apiBase`. The backend refuses
missing configuration and requires explicit live opt-in. This PR alone cannot take money.

## Owner setup before enabling payments

1. Connect/activate the business Razorpay merchant account, complete required verification
   and settlement-bank setup, and enable the intended payment methods. Confirm the public
   contact, privacy, service delivery, terms and refund policies match actual operations.
2. Provision a Node 22.13+ service with a persistent disk (single application instance,
   SQLite WAL). This implementation is not suitable for ephemeral/serverless filesystems
   or multiple hosts sharing a network-mounted SQLite file. Use a transactional shared
   database adapter before horizontal scaling.
3. Set the environment below in the host's private secret manager. Do not send secrets in
   chat, commit `.env`, store them in browser configuration, or write them into Pages builds.
4. In the test dashboard enable **automatic capture**. Configure a webhook at
   `https://YOUR-PAYMENT-HOST/webhook` for `payment.captured`, `order.paid`, and
   `payment.failed`, using a distinct random webhook secret. Configure these separately
   for live mode later. Do not use `/verify` as the webhook URL.
5. Start the backend, verify `/health`, then set only its HTTPS base URL in
   `payments/config.js`. Serve the website from the exact `ALLOWED_ORIGIN`.
6. Complete the sandbox matrix below with real merchant TEST keys. Only after it passes,
   configure a separate live database, live keys, live webhook and `PAYMENT_MODE=live` plus
   `ENABLE_LIVE_PAYMENTS=true`. Arrange an owner-authorized live acceptance payment and
   refund/reconciliation check. Merge/deploy the reviewed frontend and backend together.

| Environment variable | Purpose |
| --- | --- |
| `PAYMENT_MODE` | `test` (default) or `live`; must match key prefix |
| `ENABLE_LIVE_PAYMENTS` | Must be exactly `true` in live mode |
| `RAZORPAY_KEY_ID` | Account/mode key ID; returned publicly only for checkout |
| `RAZORPAY_KEY_SECRET` | Private API authentication and checkout HMAC secret |
| `RAZORPAY_WEBHOOK_SECRET` | Separate private webhook HMAC secret |
| `ALLOWED_ORIGIN` | Exact frontend origin, e.g. `https://instantprofessionals.in`, no trailing slash |
| `PAYMENT_DB_PATH` | Absolute persistent SQLite filename outside the public checkout; parent must exist |
| `HOST`, `PORT` | Bind address and port; defaults `127.0.0.1:3001`; set `HOST=0.0.0.0` if required by host |

Local test setup: use `ALLOWED_ORIGIN=http://localhost:8080`, a local database path and
`apiBase: 'http://localhost:3001'`. Run `node --env-file=.env server.mjs` from the backend
folder and serve the repository with a local static server on port 8080. The `.env` file is
ignored; start from `.env.example`. There are no third-party runtime dependencies.

Terminate TLS at the hosting proxy. Apply trusted per-client request limits and a global
provider budget there; built-in 120 requests/minute uses the socket address and intentionally
does not trust arbitrary forwarded headers. Behind a proxy this is an aggregate limit.
Preserve webhook bodies byte-for-byte; no JSON rewriting. Do not log request bodies, bearer
quote codes, authorization headers, signatures or customer payment details. Restrict disk and
operator shell access, back up SQLite with its online backup facilities, and test restoration.

## Issue an agreed quote privately

There is no public quote-creation/admin API. On the private backend host, create a JSON file
OUTSIDE the public repository containing `label` (up to 120 characters), `scope` (up to 1500),
`amount` (integer INR paise; ₹1–₹10 lakh supported) and `expires` (future Unix milliseconds).
Use the actual owner-approved amount; include all applicable taxes and expressly included
charges in the payable total and explain exclusions in scope. Avoid personal/confidential
details in the label/scope; keep the customer-to-quote mapping in the private engagement record.

Run `node --env-file=.env admin.mjs quote /private/agreed-quote.json` on that host.
It returns a reference, random private code and URL of the form
`https://instantprofessionals.in/payments/#quote=...`. Send this privately to the intended
customer through your normal approved channel. Possession of the code authorizes viewing
and paying that quote; it is not a customer login. Only its SHA-256 hash is stored in SQLite.
Never place quote links in analytics, public issues, sitemaps or source control.

The fragment is removed before any third-party scripts load, and the code is kept in tab
session storage to recover after reload. Private codes and scope are not included in GA events.
Use `node --env-file=.env admin.mjs list` to inspect quote/order/payment references privately.

## Verification, replay protection and operations

- All frontend APIs use POST JSON plus the private quote code; exact-origin CORS is an
  additional browser boundary, not authentication. Requests are size-limited and time-bounded.
- `/orders` reads amount/currency from the private quote, never browser input. It atomically
  claims order creation and reuses its persisted Razorpay order on retries. Provider receipt,
  amount and currency are checked before binding the order.
- `/verify` checks HMAC-SHA256 of the SERVER-STORED order ID plus payment ID using a
  timing-safe comparison. It then fetches the payment from Razorpay and validates order,
  amount, currency and captured status. Authorization alone is not success.
- `/webhook` verifies HMAC over the original raw bytes with the webhook secret, then commits
  event deduplication, receipt and paid state in one transaction. Replays and late failures do
  not produce duplicate receipts or downgrade success. Unknown/mismatched orders are not paid.
- `/status` fetches order payments and reconciles captured payments if a callback was lost.
  A success query parameter, frontend callback or forged signature alone cannot confirm payment.
- Expiry stops new/reopened checkout, but a provider order already open in a browser can still
  complete afterwards; captured money is always recorded. Expiry is not gateway cancellation.
- If order creation times out/crashes after reaching Razorpay, the quote stays `creating` and
  cannot create another order blindly. Find the order by quote reference/receipt in the merchant
  dashboard/API; run `node --env-file=.env admin.mjs reconcile QUOTE_ID ORDER_ID`. It checks
  account, amount, currency and receipt before binding and fetching capture status. Do not
  reset the state or issue a second payable quote until the merchant confirms the first order
  cannot be paid. Unknown-order webhook failures are retried by Razorpay; reconcile promptly.
- `receipts` is the authoritative capture ledger, unique by quote/order/payment. It is not a tax
  invoice, refund ledger or automatic delivery trigger. The team must match the reference to
  the engagement, reconcile with Razorpay, and arrange delivery/invoice. No filing, email,
  WhatsApp message or legal service is automatically triggered by a client callback.
- Refunds/disputes remain merchant-dashboard operations. Reconcile them before fulfillment;
  historical captured receipts are retained and do not indicate current net settlement.
  Do not reuse a paid quote for a second payment after a refund. Add refund/dispute event
  processing and a durable outbox before automating fulfillment.
- Monitor `/health`, error rates, webhook failures, unresolved `creating` quotes and daily
  settlement reconciliation. Replay failed webhooks after recovery. Secret rotation must keep
  the old webhook secret available for retried events, per Razorpay; this scaffold uses one
  active secret, so drain/reconcile old retries before switching. Keep active quote key IDs stable.

## Analytics and customer outcomes

GA4 uses the site's existing measurement ID. Events: `begin_checkout`, `checkout_dismissed`,
`payment_failed`, `checkout_error`, `payment_verification_pending`, and `purchase` only after
server-confirmed capture. Test-mode events have a `test_` prefix to avoid live purchase counts.
Purchase includes INR value and Razorpay order ID as `transaction_id`, with tab deduplication.
No code, customer contact, private scope or payment signature is sent. Keep GA4 enhanced
measurement disabled for this checkout path so automatic form events cannot capture private
codes. Browser analytics is best effort and can miss closed tabs/ad blockers; use the private
receipt ledger and merchant dashboard for accounting, not GA4.

The page has separate messages for unavailable configuration, invalid/expired quote, failure,
dismissal, pending capture, unavailable verification and confirmed payment. Buyers can check
status after closing/reloading without starting a new payment. Existing enquiry paths still work.

## Validation and remaining acceptance work

Run `node --test payments/backend/test/*.test.mjs` from the repository root. Automated tests
use synthetic provider responses and cover price tampering, signed callbacks, captured versus
authorized, raw-body webhook HMAC, duplicate/out-of-order events, transaction rollback,
recovery, persistence, origin/method/body checks, fail-closed configuration, rate limits and
ambiguous creation. CI also syntax-checks frontend scripts and builds the public-only artifact.

No real merchant test credentials were supplied, so no actual Razorpay sandbox payment or
live payment was performed. Before activation, record results for:

1. Test card success/failure, dismissal and retry of the same order; UPI supported flows on
   intended desktop/mobile browsers (test mode may not reproduce every live UPI flow).
2. Captured success with exact agreed INR total, reference and one private receipt.
3. Close the browser before the callback; confirm webhook updates the ledger, then reopen
   the quote link and check status. Test duplicate webhook delivery and delayed capture.
4. Unavailable provider/backend, invalid signature, reload, expired quote and terms checkbox.
5. Real host restart with persistent disk, backup restoration and order-timeout reconciliation.
6. Live key/secret isolation, webhook delivery, domain/HTTPS, merchant payment-method approval,
   final quote/tax/policy review and owner-controlled live acceptance/refund test.

Implementation validation: 11 backend tests passed. Browser checks using mocked Razorpay in
Edge passed for disabled configuration, quote review/consent, captured success, analytics
deduplication, reload, dismissal/failure, service/AI links and 390px mobile overflow. Mobile
checkout was visually inspected. These do not substitute for merchant sandbox acceptance.
The existing `scripts/qa_site.py` reported 118 findings on Windows; the unmodified production
commit produced the exact same output. Existing pricing/sitemap assertions and seven
case-colliding filename aliases remain outside this payment change. No colliding HTML file
is included in the commit; Linux Pages builds preserve those existing case-sensitive routes.

Official references checked 24 September 2026:
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- https://razorpay.com/docs/webhooks/validate-test/
