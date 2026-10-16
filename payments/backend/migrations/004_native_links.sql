-- Apply with the schema owner in the LIVE payment database only.
BEGIN;
ALTER TABLE ip_payments.receipts ADD COLUMN IF NOT EXISTS posted_at timestamptz;
GRANT UPDATE(posted_at) ON ip_payments.receipts TO ip_payment_runtime;
CREATE TABLE IF NOT EXISTS ip_payments.invoice_links (
 invoice_id uuid PRIMARY KEY, invoice_number text NOT NULL, account text NOT NULL,
 amount bigint NOT NULL CHECK(amount BETWEEN 1000 AND 10000000000), actor_id integer NOT NULL,
 state text NOT NULL CHECK(state IN ('creating','active','paid','review')),
 provider_invoice_id text UNIQUE, payment_url text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ip_payments.invoice_link_receipts (
 account text NOT NULL, payment_id text NOT NULL, invoice_id uuid NOT NULL REFERENCES ip_payments.invoice_links(invoice_id),
 order_id text NOT NULL, amount bigint NOT NULL, payment_date date NOT NULL,
 posted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account,payment_id)
);
REVOKE ALL ON ip_payments.invoice_links,ip_payments.invoice_link_receipts FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON ip_payments.invoice_links,ip_payments.invoice_link_receipts TO ip_payment_runtime;
COMMIT;
