-- Run once as the database administrator, after 001_payments.sql.
-- Group roles have no password and cannot log in. Provision separate LOGIN users
-- privately, then grant exactly one of these roles to each appropriate user.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ip_payment_runtime') THEN
  CREATE ROLE ip_payment_runtime NOLOGIN;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ip_payment_reporter') THEN
  CREATE ROLE ip_payment_reporter NOLOGIN;
 END IF;
END $$;
GRANT USAGE ON SCHEMA ip_payments TO ip_payment_runtime,ip_payment_reporter;
GRANT SELECT,INSERT,UPDATE ON ip_payments.quotes TO ip_payment_runtime;
GRANT SELECT,INSERT ON ip_payments.receipts,ip_payments.events TO ip_payment_runtime;
GRANT SELECT ON ip_payments.staff_summary TO ip_payment_runtime,ip_payment_reporter;
COMMIT;
