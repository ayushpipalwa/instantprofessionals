# Invoice payment flow

Status: FINALIZED

Clients enter the IPREPORT invoice number and the email registered against that
invoice's client. The server matches both before returning the payable balance.
No browser-supplied amount controls the charge. Only issued, uncancelled
INSTANT_PROFESSIONALS invoices qualify for merchant 4474687.

The proposed read view exposes only invoice ID, invoice number, outstanding paise,
a hash of the matching email, and recorded payment references. The gateway login
receives SELECT on this view, without access to underlying invoice/client tables
or write access to the IPREPORT database.

Payment records bind an immutable invoice ID to an authoritative amount. Checkout
rechecks the issued invoice balance and prevents another pending checkout for the
same invoice. Verified captures not yet recorded in IPREPORT reduce the payable
balance; references already posted in IPREPORT must not be deducted twice.

The existing encrypted callback and independent provider status verification
remain mandatory. Partial capture, cancellation, refunds, changed balances and
duplicate callbacks must not create an incorrectly paid invoice or second receipt.

Public copy becomes 'Pay your invoice', 'Invoice number', 'Registered email',
'Review invoice', 'Invoice amount due'. No private quote code is required for the
new invoice-entry flow. Existing private payment links remain available for
in-flight orders. TEST stays separate.

Required validation: wrong invoice/email, cancelled and fully paid invoices,
tampered amounts, stale balances, concurrent checkout, duplicate verification,
already posted receipts, and public invoice privacy. No real charge during tests.

Deployment awaits the scoped read-access approval and completed implementation;
the current public page still uses private payment codes.
