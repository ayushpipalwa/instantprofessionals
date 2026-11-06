# Consolidated enquiry acceptance — 19 October 2026

PR #86 is already merged. PR #77 incorporates current master `f3e96cb` and retains its separate attempt/handoff events, preview Analytics suppression, contact links and service content. Successful readable acknowledgements restore confirmed lead events; duplicate acknowledgements do not count another new lead. Form details remain available after success or failure.

## Verified

- 25 Node tests pass, covering rejection, HTTP/non-JSON/opaque/network/timeout outcomes, pending controls, retries, legacy acknowledgements, preview suppression, Analytics privacy, receiver persistence, exact retry deduplication and literal Sheet text.
- Mobile-width browser harness passes homepage, accounting and AI forms at 360px and 390px, plus GST WhatsApp-only flow. Actual handset/iOS acceptance is not claimed.
- SEO passes against the exact staged index: 73 indexable pages and 73 sitemap URLs. Pricing passes: 60 service pages and 150 prices.
- Public staging completes with backend excluded. Linux CI remains authoritative for the repository's case-sensitive legacy aliases.
- An actual browser submission from the consolidated local homepage to the existing production receiver displayed a recorded acknowledgement. Independent Google Sheets readback confirmed row 9, enquiry ID `IP-20261019-004132-5D374C`, synthetic marker `QA-20261019-ENQUIRY-01`, matching service/message/consent/source and status New. Synthetic contact only; labelled Do not contact. The row is retained as evidence.

## Receiver rollout limitation

The existing deployed receiver still deduplicates email/phone/service only. The tested Code.gs correction includes the complete normalized payload, returns the original enquiry ID for exact retries and stores formula-like input as literal text. Source was backed up locally and the corrected code saved in the existing Apps Script editor.

Deploy > Manage deployments denied access for the available editor account. The Sheet's sharing dialog identifies its owner as `caayushpipalwa@gmail.com`, which is not among the available signed-in browser accounts. No new deployment or access grant was created. The owner must update the existing deployment to the saved code while retaining its URL and execution identity. Until then, changed messages submitted within the old 60-second deduplication window can still be suppressed, and literal-text receiver protection is not live.

The frontend remains compatible with the current receiver. Verified acknowledgement and stored lead capture do not imply the receiver correction has been deployed, email delivery has been independently checked, or physical-phone testing has completed.
