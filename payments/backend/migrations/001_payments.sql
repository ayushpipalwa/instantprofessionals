-- Apply explicitly using a schema-owner connection; never at application startup.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ip_payments;
REVOKE ALL ON SCHEMA ip_payments FROM PUBLIC;
CREATE TABLE IF NOT EXISTS ip_payments.quotes (
 id text PRIMARY KEY, token_hash text UNIQUE NOT NULL, account text NOT NULL,
 label text NOT NULL, scope text NOT NULL, amount integer NOT NULL CHECK(amount BETWEEN 100 AND 100000000),
 expires bigint NOT NULL, state text NOT NULL DEFAULT 'new' CHECK(state IN ('new','pending','paid','failed','review')),
 nonce text NOT NULL, tid text UNIQUE NOT NULL, payment_id text, initiated_at bigint, paid_at bigint,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ip_payments.receipts (
 account text NOT NULL, payment_id text NOT NULL, quote_id text NOT NULL REFERENCES ip_payments.quotes(id),
 amount integer NOT NULL, captured_at bigint NOT NULL, PRIMARY KEY(account,payment_id)
);
CREATE INDEX IF NOT EXISTS receipts_quote_idx ON ip_payments.receipts(quote_id);
CREATE INDEX IF NOT EXISTS quotes_account_created_idx ON ip_payments.quotes(account,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS ip_payments.events (digest text PRIMARY KEY,received_at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE VIEW ip_payments.staff_summary AS
 SELECT id AS reference,account,label,amount,'INR'::text AS currency,state AS status,
 payment_id,created_at,updated_at,paid_at FROM ip_payments.quotes;
REVOKE ALL ON ALL TABLES IN SCHEMA ip_payments FROM PUBLIC;
COMMIT;
