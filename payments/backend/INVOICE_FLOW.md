# Invoice payment flow

Status: FINALIZED

Clients enter the IPREPORT invoice number and the email registered against that
invoice's client. The server matches both before returning the payable balance.
No browser-supplied amount controls the charge. Only issued, uncancelled
INSTANT_PROFESSIONALS invoices qualify for merchant 4474687.

The approved read view exposes only invoice ID, invoice number, outstanding paise,
a hash of the matching email, and recorded payment references. The gateway login
receives SELECT on this view, without access to underlying invoice/client tables
or write access to the IPREPORT database.

Payment records bind an immutable invoice ID to an authoritative amount. Checkout
rechecks the issued invoice balance and prevents another pending checkout for the
same invoice. Verified captures not yet recorded in IPREPORT reduce the payable
balance; references already posted in IPREPORT must not be deducted twice.

The existing encrypted callback and independent provider status verification
remain mandatory. Partial capture, cancellation, refunds, changed balances and
duplicate callbacks must not confirm mismatched payment data or create a second receipt.

This integration does not write billing receipts into IPREPORT. Staff must post the
verified payment there with its exact CCAvenue tracking reference in the receipt
reference field. The balance calculation then recognizes that posting instead of
subtracting the same capture twice. Refunded or disputed attempts require staff
review before another online attempt.

Public copy becomes 'Pay your invoice', 'Invoice number', 'Registered email',
'Review invoice', 'Invoice amount due'. No private quote code is required for the
new invoice-entry flow. Existing private payment links remain available for
in-flight orders. TEST stays separate.

Required validation: wrong invoice/email, cancelled and fully paid invoices,
tampered amounts, stale balances, concurrent checkout, duplicate verification,
already posted receipts, and public invoice privacy. No real charge during tests.

Deployment order: apply ipreport_invoice_view.sql in practice_management using the
schema owner; apply 003_invoice_bindings.sql in ip_payments_live; deploy the tested
backend with PAYMENT_INVOICE_DATABASE=practice_management and the existing LIVE
login; verify health and invalid-invoice privacy; then publish the public form.
Do not apply the invoice view grant to TEST or deploy LIVE credentials there.
