# Google Sheet enquiry receiver

This Apps Script receiver writes website submissions to the private Google Sheet with ID `1ojMZhcoe4ZU9ULWALxqMTUgbSMne7vlQi4rJowwNQSs` (the `SPREADSHEET_ID` in `Code.gs`).

## Offline regression tests

Run `node --test scripts/test-enquiry-receiver.cjs` from the repository root. The tests mock Google services; they do not submit enquiries, write to the live Sheet, or send email.

Exact retries of the normalized lead fields are deduplicated for up to 60 seconds while cached and return the original enquiry ID. Changes to the message or other lead fields are recorded separately. Formula-like cell values are escaped as text before writing; notification emails retain the original text.

## Deploy

1. Open the Google Sheet and select **Extensions → Apps Script**.
2. Replace the editor contents with `Code.gs`.
3. Save, select `setup`, and click **Run** to authorize Spreadsheet and email access.
4. Select **Deploy → New deployment → Web app**.
5. Set **Execute as** to **Me** and **Who has access** to **Anyone**.
6. Deploy and copy the production URL ending in `/exec`.
7. Add that URL to the homepage form's `data-sheet-endpoint` attribute.

The Sheet itself must remain private. Only the deployed web app accepts public form submissions.

To update an existing receiver without changing its `/exec` URL, save `Code.gs`, open **Deploy → Manage deployments**, edit the existing deployment, select **New version**, and deploy. Publishing the website alone does not update Apps Script.
