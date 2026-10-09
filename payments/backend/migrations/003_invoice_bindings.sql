BEGIN;
ALTER TABLE ip_payments.quotes ADD COLUMN IF NOT EXISTS invoice_id text;
ALTER TABLE ip_payments.quotes ADD COLUMN IF NOT EXISTS invoice_number text;
CREATE INDEX IF NOT EXISTS quotes_invoice_lookup ON ip_payments.quotes (account,invoice_id,state);
CREATE OR REPLACE VIEW ip_payments.staff_summary AS
SELECT id AS reference,account,label,amount,'INR'::text AS currency,state AS status,
       payment_id,created_at,updated_at,paid_at,invoice_number
FROM ip_payments.quotes;
COMMIT;
