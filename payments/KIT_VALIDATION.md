# Supplied CCAvenue kit validation

Inspected 24 September 2026. Source: owner-supplied `Integration_kits.zip`.
SHA-256: `887342aee46003ee9ab761954ff53a2884b0dfb28380194a6cdb24a1979ae668`.
Nested archive: `Integration_kits/Web Integration Kits.zip`.
Inspected Node files: `Web Integration Kits/Node JS/NodeJS_Integration_Kit/nonseamless/`
`ccavutil.js`, `ccavRequestHandler.js`, and `ccavResponseHandler.js`.

The Node request handler derives a 16-byte key using MD5 of the working key,
uses IV bytes 00 through 0f, and encrypts with AES-128-CBC and default PKCS#7
padding into hex. It posts `encRequest` and `access_code` to the production
`https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction`
endpoint. Its return handler reads form field `encResp` using the same cipher.
These match this draft; no encryption or endpoint change was necessary.

Four synthetic inputs (empty, checkout fields, response fields and Unicode) passed
byte-for-byte encryption comparison and cross-decryption in both directions using
the supplied helper and this backend. The generated known answers are now tested
in `backend/test/kit-compatibility.test.mjs`. Vendor source and the archive remain
outside the repository. Sample request/response servers were not run or deployed.

## Remaining acceptance gates

This verifies the supplied Node CBC checkout protocol only. It is not proof of
merchant credential validity, successful processing, capture or settlement.
It does not validate the separate status API schema/version or Dynamic Event
Notification payload. Obtain and verify those documents and actual test responses.
The merchant email mentions an AES-GCM JSP alternative; this Node validation
does not establish that alternative's compatibility or account configuration.
If CCAvenue requires GCM for this merchant, obtain that kit and adapt the protocol
before activation; do not switch algorithms based on a label alone.

Keep `CCAVENUE_KIT_VERIFIED` and live-payment gates disabled until the full adapter,
including independent status verification and notifications, passes acceptance.
Private merchant/API keys, backend hosting, domain/return URL and any outbound-IP
registration, sandbox access, KYC/settlement checks and merchant testing remain
deployment requirements. No real transaction was attempted during this validation.
