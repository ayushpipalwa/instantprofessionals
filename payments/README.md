# CCAvenue payments — agreed-quote checkout

CCAvenue is the only payment provider in this draft. Existing multipage branding, indicative
prices, enquiry/WhatsApp flows and AI readiness questionnaire remain intact. Payments require
an owner-issued fixed-total INR quote. No prices, tax amounts or credentials are invented.
This is one-time hosted checkout, not a subscription or recurring debit.

GitHub Pages serves /payments/. A separately hosted Node 22.13+ backend creates an encrypted
CCAvenue request and receives returns. It independently checks CCAvenue's status API before
confirming payment. Working keys never reach the browser. The protocol's access_code and
encrypted encRequest are posted to CCAvenue; card/UPI details stay on its hosted page.

## Activation is blocked by default

The owner-supplied Node checkout kit has now passed synthetic interoperability
checks; see [kit validation](KIT_VALIDATION.md) for archive provenance, the verified
wire format and remaining API/notification acceptance gates. This does not enable
payments or establish merchant-account readiness.

payments/config.js has no backend URL. Startup requires merchant credentials and
CCAVENUE_KIT_VERIFIED=true; live additionally requires ENABLE_LIVE_PAYMENTS=true.
No actual merchant sandbox or live payment has been made. This is a reviewable scaffold
with synthetic tests, not a certified merchant connection.

Owner setup:
1. Activate the business CCAvenue M.A.R.S account, complete merchant/settlement-bank
   verification and enable the intended INR/UPI/card methods.
2. Download the current hosted-checkout integration kit and status-API documentation from
   M.A.R.S. Obtain Merchant ID, checkout Access Code/Working Key and status-API credentials.
   API credentials can differ; register the backend outbound IP if required. Confirm test access.
3. Validate this adapter against that kit: AES-128-CBC, MD5-derived key, fixed byte IV 00..0f,
   PKCS#7 padding, hex encoding, form encRequest/access_code and returned encResp;
   orderStatusTracker API version 1.2 JSON, field order_currncy and capture status Shipped.
   Check actual response examples and endpoints. Adapt differences rather than bypassing
   verification. Only then set CCAVENUE_KIT_VERIFIED=true, including for test mode.
4. Deploy payments/backend/ on a single Node host with HTTPS, private persistent disk and
   stable outbound IP where required. Do not use ephemeral/serverless storage or multiple
   hosts sharing SQLite over a network filesystem.
5. Configure the private environment below. Register the frontend domain and backend
   /callback and /cancel URLs with CCAvenue as required.
6. Configure asynchronous Order Status/Echo/Dynamic Event Notifications to /webhook ONLY
   after confirming the account sends form-encoded encResp including merchant_param1.
   Other formats are rejected and need an adapter plus independent status verification.
7. Confirm the capture process in M.A.R.S. This implementation treats Shipped as confirmed
   payment. Callback Success and API Successful remain pending. Configure merchant capture
   or confirm orders in the dashboard as appropriate. The code does not capture automatically.
8. Complete sandbox acceptance, then set the public backend URL in payments/config.js.
   Review service/tax/delivery/contact/privacy/terms/refund policies before enabling live.
   Use separate live credentials/database and an owner-controlled live acceptance test.

Never share working keys in chat or source control.

## Environment and hosting

| Variable | Purpose |
| --- | --- |
| PAYMENT_MODE | test by default, or live |
| ENABLE_LIVE_PAYMENTS | Exactly true required for live |
| CCAVENUE_KIT_VERIFIED | Exactly true after merchant-kit compatibility validation |
| CCAVENUE_MERCHANT_ID | Numeric merchant account ID |
| CCAVENUE_ACCESS_CODE | Checkout code, exposed only as required by hosted-checkout protocol |
| CCAVENUE_WORKING_KEY | PRIVATE checkout encryption/return decryption key |
| CCAVENUE_API_ACCESS_CODE | Approved status-API access code |
| CCAVENUE_API_WORKING_KEY | PRIVATE status-API encryption/decryption key |
| ALLOWED_ORIGIN | Exact site origin, e.g. https://instantprofessionals.in |
| PAYMENT_PUBLIC_ORIGIN | Exact backend origin; /callback must fit the provider's 100-character limit |
| PAYMENT_DB_PATH | Absolute SQLite filename on private persistent disk, outside public checkout |
| HOST, PORT | Defaults 127.0.0.1 and 3001; use 0.0.0.0 only if hosting requires it |

Start from backend/.env.example. Run node --env-file=.env server.mjs from payments/backend.
There are no third-party runtime dependencies. Test-only localhost HTTP is accepted; real
provider callbacks require a registered reachable HTTPS endpoint. /health reports mode/provider.

Pinned checkout hosts: test.ccavenue.com and secure.ccavenue.com.
Pinned API hosts: apitest.ccavenue.com and api.ccavenue.com.
Confirm them against the merchant kit. Credentials do not have mode-identifying prefixes:
explicitly isolate test/live keys and databases. Reconcile pending orders before key rotation.

Terminate HTTPS at the hosting edge and apply trusted per-client limits. Built-in limits are
120/minute per socket address, separate client/notification buckets; forwarded IPs are not
trusted. Behind a proxy these are aggregate limits. Protect filesystem access, use SQLite
online backups, test restoration and avoid logging keys, private codes, encrypted messages
or payment details.

The Pages workflow stages only public assets into _site; backend, secrets and databases
are excluded. The separate AI backend in PR #61 remains independent.

## Private quote operations

Create an owner-approved JSON file OUTSIDE the public repository with:
- label: service name, at most 120 characters;
- scope: work/inclusions/exclusions, at most 1500 characters, no personal identifiers;
- amount: integer INR paise, including all charges being collected;
- expires: future Unix milliseconds.

Supported totals are ₹1–₹10 lakh, an implementation bound rather than a pricing rule.
Use approved amounts and explain applicable taxes/government charges in the written scope.

Run on the private backend host:
node --env-file=.env admin.mjs quote /private/agreed-quote.json

Send the returned private link/code only to the intended customer through the normal
approved channel. Possession allows viewing/paying that quote; it is not a customer login.
Keep the customer mapping in the private engagement record. The database stores only a
SHA-256 code hash. The URL fragment is removed before third-party scripts load; the code
stays in tab session storage for return/reload recovery. If unavailable, re-enter the code.

Private inspection: node --env-file=.env admin.mjs list
Reconciliation: node --env-file=.env admin.mjs reconcile QUOTE_ID [CCAVENUE_TRACKING_ID]

Use an exact tracking reference when investigating multiple transactions. Monitor pending/
review quotes, notification failures and settlements daily; run reconciliation after outages.

CCAvenue does not enforce unique merchant order IDs. /session atomically marks a quote
pending BEFORE returning one encrypted checkout. It never reissues for pending/paid/failed/
review states, even after response loss or restart. A TID is also sent, but its documented
uniqueness window is 24 hours. This cannot guarantee protection from replaying an already
issued gateway form. Expiry blocks issuance, not an already-open gateway page.

For cancellation, failure, lost response or a request that never reached CCAvenue, reconcile
first. An operator must establish that an old attempt cannot complete before issuing a
fresh quote. Never reset pending to new or blindly create another payable quote. Preserve
old references. Distinct confirmed tracking IDs on one quote are retained and flagged review.

## Verification and accounting

/quote, /session and /status require POST JSON plus the private code. Exact-origin CORS
is an additional browser boundary, not authentication. The server owns amount/currency/
callbacks, a random merchant_param1 nonce, and a 17-digit TID.

/callback, /cancel and /webhook accept form encResp. Invalid ciphertext, duplicate parameters,
or wrong quote/nonce/amount/currency/tracking are rejected. CBC encryption is NOT a MAC or
signature. No earlier provider HMAC verification is reused. Only independent TLS-protected
status lookup matching order, tracking, INR total and Shipped status confirms payment.

Browser returns redirect to the fixed /payments/ URL without success flags or credentials.
GET cancellation changes no payment state. /status recovers missing callbacks. Repeated
notifications can advance from pending to captured without duplicating receipts. Transactions
keep ledger/state updates atomic. Late failures do not erase confirmed receipts. Refund,
reversal, fraud and chargeback states reported by the API flag review.

cca_receipts records captures, not tax invoices or current net settlement. The team must
reconcile with M.A.R.S, then invoice/deliver. Refund execution, disputes and fulfillment remain
manual. No filing, messaging or service delivery is triggered automatically. Fresh provider-
specific tables ensure records from any earlier provider draft are not reused.

## Customer states and analytics

The page handles disabled configuration, new/expired quote, pending, unsuccessful/cancelled,
paid and review. Returning customers recheck status. Already-issued checkout cannot reopen;
the page offers status checking and contact instead.

GA4 uses the existing measurement ID. Events include begin_checkout, checkout_error,
payment_verification_pending, payment_failed, payment_review_required and purchase.
Test events have a test_ prefix. Purchase requires server-confirmed payment and uses the
CCAvenue tracking ID for transaction_id, with tab deduplication. No private code, scope,
customer details or encrypted payload is sent. Disable enhanced form measurement for
/payments/; automatic page views are disabled here. GA is best effort, not accounting.

## Tests and remaining merchant acceptance

Run node --test payments/backend/test/*.test.mjs from the repository root.
Fifteen CCAvenue tests cover supplied-kit known answers, fail-closed configuration, crypto roundtrip, tampering, nonce/
amount binding, single issuance, independent confirmation, delayed capture, duplicate events/
captures, reversals, callback redirects, recovery, persistence, mode isolation, request limits
and status-API envelopes. All use synthetic fixtures, not real merchant credentials.

Mocked Edge browser checks also passed for disabled configuration, consent, hosted form
POST, return/reload, confirmed/failed/pending/review states, analytics deduplication and
390px mobile layout. The confirmed mobile screen was visually inspected.

The prior provider's test results do not certify CCAvenue. Before activation, verify:
1. Current merchant kit, encryption interoperability, registered domains/returns.
2. API credentials/IP allowlisting, actual response schema and capture-state mapping.
3. Actual TEST success, failure/cancellation, pending capture and approved UPI/card flows on
   desktop/mobile; confirm test environment behavior with CCAvenue.
4. Closed browser, lost callback, repeated notifications, replay, restart and backup restore.
5. Exact INR total, one receipt per tracking reference, duplicate-capture review and manual retry.
6. Owner-controlled live acceptance, refund and settlement reconciliation after sandbox sign-off.

Prior baseline audit: scripts/qa_site.py produces identical 118 findings on the untouched
production commit and payment branch on Windows. Existing pricing/sitemap assertions and
seven case-colliding HTML aliases remain outside this change.

## Primary references checked 24 September 2026

- https://links.avenues.info/downloads/CCAvenue_Integration_Ver_3_3.pdf
- https://links.avenues.info/downloads/CCAvenues_API_Vers-1_3.pdf
  (Official indexed API document; direct download unavailable during this work.)
- https://www.ccavenue.com/faq
- https://www.ccavenue.com/article/Receive-real-time-updates-of-key-events-in-your-Merchant-Account-through-CCAvenues-Dynamic-Event-Notifications

The current account-specific M.A.R.S kit is authoritative. Do not enable on the strength
of public documents or synthetic tests alone.
