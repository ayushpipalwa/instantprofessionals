-- Prepared for practice_management. Apply only after approval of the scoped
-- payment runtime access. No access to underlying billing/client tables.
BEGIN;
CREATE SCHEMA IF NOT EXISTS payment_invoice_lookup;
REVOKE ALL ON SCHEMA payment_invoice_lookup FROM PUBLIC;
CREATE OR REPLACE VIEW payment_invoice_lookup.issued_invoices AS
SELECT d.id::text AS invoice_id, d.number AS invoice_number,
       GREATEST(d.total_paise-d.received_paise-d.credited_paise-d.withheld_paise,0) AS outstanding_paise,
       md5(lower(trim(c.email))) AS client_email_hash,
       COALESCE((SELECT jsonb_agg(r.reference)
                 FROM billing_receipts r
                 WHERE r.document_id=d.id AND r.direction='IN'), '[]'::jsonb) AS posted_payment_references
FROM billing_documents d JOIN clients c ON c.id=d.client_id
WHERE d.kind='INVOICE' AND d.entity='INSTANT_PROFESSIONALS'
  AND d.cancelled_at IS NULL;
REVOKE ALL ON payment_invoice_lookup.issued_invoices FROM PUBLIC;
GRANT CONNECT ON DATABASE practice_management TO ip_payments_live_app;
GRANT USAGE ON SCHEMA payment_invoice_lookup TO ip_payments_live_app;
GRANT SELECT ON payment_invoice_lookup.issued_invoices TO ip_payments_live_app;
COMMIT;
