# Enquiry measurement and social attribution

Review date: 11 October 2026. These changes take effect only after deployment.

## Event meanings

- `phone_click`: a telephone link was activated; not proof of a connected call.
- `whatsapp_click`: a WhatsApp action was activated; not proof of a sent message.
- `enquiry_handoff`: a valid enquiry form was handed to WhatsApp; not a received lead.
- `enquiry_submit_attempt`: the form's no-cors request resolved. Its opaque response cannot confirm acceptance by Google Sheets.
- `enquiry_cta_click`: a guide visitor selected the service enquiry link.
- Reserve `generate_lead` for a verified accepted enquiry. The current browser-only flows cannot establish this, so they no longer emit it. Historical counts remain unchanged. Annotate deployment when comparing periods; a drop in this key event is not evidence of lost business.

Do not reclassify clicks or unconfirmed attempts as verified leads. Browser tests use stubbed networking and do not send live enquiries. Real delivery reconciliation still needs the authorized received-enquiry register/CRM and call or WhatsApp outcomes. Never place names, email addresses, phone numbers or message text in Analytics event parameters. WhatsApp prefill text stays within the requested WhatsApp handoff, not Analytics.

## Campaign convention

Use the most relevant HTTPS www service URL with lowercase parameters:

`utm_source=linkedin|facebook|instagram|x|google_business`

`utm_medium=social` for the four social networks; `organic` for Google Business.

`utm_campaign=ip_YYYYMMDD_topic` and `utm_content=flyer|carousel|profile_link`.

Keep official source links untouched. Tag only links to our own website; never tag internal site navigation. For Instagram, a caption URL is not normally a clickable traffic path; attribution requires the actual clickable profile/story link. Do not change profile settings without authorization.

## Unspecified landing pages

The 2–8 October GA4 report included five organic sessions with `(not set)` landing pages. This alone does not identify their cause. The current bootstraps queue GA4 configuration before custom events; this change does not add manual page views and therefore avoids double-counting them. Next validate first page_view/session_start ordering in an authorized diagnostic session, examine consent and blocker behavior, and compare the same host/path report after deployment. Do not invent landing paths or infer that all five sessions are lost customers.

## Host consistency

The primary host remains https://www.instantprofessionals.in/. The 11 October live matrix verifies homepage and five priority service paths across four protocol/host variants, retaining campaign parameters. Google URL Inspection still holds indexed non-www records from 28–29 September; monitor recrawling rather than switching the primary host again.
