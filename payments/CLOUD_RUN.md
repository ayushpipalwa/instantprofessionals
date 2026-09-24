# Separate payments service, shared PostgreSQL infrastructure

The customer website stays on GitHub Pages. IPREPORT stays a separate staff website.
The payment service uses the existing Google Cloud project and, after capacity and
access review, the existing PostgreSQL instance. No production resource, credentials,
database or domain was changed while preparing this draft.

Inspected IPREPORT main at cbac8654f9b2861e786df3bf3bae94277351ff43. Its Express/React
app already has JWT authentication and a separately granted financial entitlement.
The companion IPREPORT change adds a read-only Website payments panel beneath
Admin > Billing Readiness, available to SUPER_ADMIN and financial-enabled ADMIN
accounts, never staff-preview sessions. It does not expose payment credentials,
quote bearer codes, private scope or nonce. Other staff cannot view these records.

## Database setup

1. Verify instance capacity, backup/PITR settings and restore procedures. Reusing an
   instance does not remove its current bill; growth, networking and backups can cost extra.
2. Apply backend/migrations/001_payments.sql explicitly with a schema-owner connection,
   then 002_roles.sql as database administrator. These add only the ip_payments schema,
   its tables, a restricted view and group roles; no existing application migration changes.
3. Privately provision separate LOGIN users. Grant ip_payment_runtime to the backend
   login and ip_payment_reporter to a separate staff-reporting login. Neither should own
   the schema, be superuser, inherit the existing app role or have access to staff/client
   tables. Check effective privileges, including grants inherited through PUBLIC.
4. Keep the schema-owner credentials out of both applications. IPREPORT uses the
   reporting login only for this feature. Its normal application database is unchanged.
5. Test and live use separate databases/logins. Account filtering is additional isolation.
   No automatic SQLite data import: if quotes already exist there, reconcile before any
   migration; never copy pending quotes into an independently payable environment.

## Payment service

Build using payments/backend as Docker context. Dockerfile starts cloud-server.mjs,
which uses PostgreSQL; server.mjs alone still starts the original SQLite option and
must NOT be used on Cloud Run. Startup checks schema access but never migrates/seeds.

Use project gen-lang-client-0944655573 and asia-south1 only after verifying the live
project. Suggested new service name: instantprofessionals-payments. Keep ipreport-prod
unchanged until the companion staff PR is reviewed. Attach the existing Cloud SQL
instance using its verified connection name and a dedicated service account with
Cloud SQL Client and access only to this service's secrets.

Start with request-based billing, minimum instances 0, maximum instances 2, 1 vCPU,
512 MiB memory, and modest concurrency (for example 10). Pool max is 3 per payment
instance; budget these connections plus IPREPORT's pools against database capacity.
These settings are starting limits, not a fixed-price promise. Add billing alerts;
alerts do not cap spend. CCAvenue IP allowlisting may require extra networking.

All existing merchant environment gates still apply, including test mode,
CCAVENUE_KIT_VERIFIED and explicit live opt-in. Supply through Secret Manager:
CCAVENUE_WORKING_KEY, CCAVENUE_API_WORKING_KEY, access codes and PAYMENT_SQL_PASSWORD.
Supply these PostgreSQL settings privately on the service:

| Variable | Value |
| --- | --- |
| PAYMENT_SQL_HOST | /cloudsql/<verified connection name>, or verified TLS endpoint |
| PAYMENT_SQL_DATABASE | Approved database name |
| PAYMENT_SQL_USER | Dedicated payment runtime login |
| PAYMENT_SQL_PASSWORD | Secret Manager reference |
| PAYMENT_SQL_SSL | true for remote TCP; not needed for Cloud SQL socket |
| PAYMENT_SQL_PORT | 5432 default for TCP |
| PORT | Cloud Run supplied, normally 8080 |

Keep ALLOWED_ORIGIN equal to the customer website's actual canonical origin and
PAYMENT_PUBLIC_ORIGIN equal to the new payment service HTTPS origin. Register this
origin and /callback, /cancel, /webhook with CCAvenue after confirming its API/notification
format. Do not change instantadvice.in DNS or the existing Firebase Hosting configuration.
Only then set payments/config.js to the approved payment backend URL.

Private quote operations use `node --env-file=.env postgres-admin.mjs quote PRIVATE.json`,
`list` or `reconcile QUOTE_ID [TRACKING_ID]`. Quote issuance remains a private operator
action; the staff panel cannot create, edit, refund, capture or mark a payment paid.
It reads the latest stored state, not a new CCAvenue API lookup. Run reconciliation
for pending records and notification outages. Link references to the private client
engagement record manually; no automatic client matching or service delivery occurs.

## Staff reporting configuration

The companion IPREPORT PR documents PAYMENT_REPORT_* variables. Enable only after
the restricted view, reader login and exact account filter are tested. Store no CCAvenue
keys in IPREPORT. Reports can be disabled independently with PAYMENT_REPORTS_ENABLED=false.

## Acceptance and rollout

The CI PostgreSQL test uses a fresh disposable database, eight concurrent checkout
attempts, repeated callbacks, rollback on mismatch, duplicate-capture review, restart
protection and a restricted reader role. It makes no calls to CCAvenue. Full merchant
status/notification validation, actual test payments and live KYC/settlement readiness
remain required. The provider kit's Node CBC compatibility alone does not satisfy these.

Deploy test first, validate callbacks/reconciliation and staff permissions, then use
separate live secrets/database. Keep customer CTAs disabled until acceptance succeeds.
Rollback by disabling checkout/config and reporting, keeping the ledger and callback
service available to reconcile already-issued orders. Never drop payment tables to roll back.

## Merchant API requirements verified 24 September 2026

The authenticated CCAvenue API guide requires the merchant server public IP to be
registered before status API calls work, and issues a corresponding access code.
Cloud Run requires stable outbound IP routing for this; ordinary service URLs and
Cloud SQL public IPs are not egress IPs. Budget fixed egress separately before provisioning.
The existing staff service had no outbound VPC connection configured at inspection.

The status guide distinguishes order_amt from order_capt_amt (which can be partial).
Only Shipped with the full quote captured creates a receipt. Missing/partial capture
fails verification and requires reconciliation. Unsafe numeric JSON reference values
are rejected rather than rounded; a 25-digit reference must be returned as a string.
Merchant test access, fixed-IP registration, KYC and end-to-end acceptance remain open.
