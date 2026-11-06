# Enquiry acceptance — 9 October 2026

PR #77 was merged locally with website master `5cdd0a1788c29921e376a93e31c6f592fed69c8d`. The homepage conflict retains the current inline-style main script and the enquiry acknowledgement script version. No unrelated case-sensitive aliases were edited.

Verified on the combined branch:
- 21 enquiry frontend/receiver tests passed.
- Exact staged SEO validation: 73 indexable pages, 73 sitemap URLs, zero errors.
- Exact staged pricing validation: 60 service pages, 150 prices and enquiry selections agree.
- Public build completed; backend excluded.
- In-app Chromium browser harness passed actual homepage, accounting and AI form DOM checks in 360px and 390px frames: pending controls, repeated submits, rejection, HTTP failure, non-JSON response, offline/timeout recovery, retries and acknowledgements. Homepage/accounting also passed contact recovery and mocked WhatsApp/privacy checks.
- GST WhatsApp-only flow passed: one mocked new tab, no online capture and original form retained.
- Live Apps Script honeypot-only cross-origin POST returned readable HTTP 200 JSON `{ "success": true }` after redirect, with response type `cors`, from the local preview origin. No lead/contact payload or notification was created by this probe. This verifies transport, not normal lead persistence or receiver rollout.

Still required:
- Real handset/iOS interruption, WhatsApp close/return and Back/Forward acceptance.
- Update the existing Apps Script receiver version separately; publishing Pages does not deploy `Code.gs`.
- Verify production after deployment, including a clearly identified authorized test lead and acknowledgement.

The draft remains open pending these acceptance items and CI. Payment gateway activation is outside this change.
