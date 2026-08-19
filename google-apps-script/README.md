# Google Sheet enquiry receiver

This Apps Script receiver writes website submissions to the private Google Sheet with ID `1d4ae7SK4p9utA3ALzlGsoOdJHacK5U3x`.

## Deploy

1. Open the Google Sheet and select **Extensions → Apps Script**.
2. Replace the editor contents with `Code.gs`.
3. Save, select `setup`, and click **Run** to authorize Spreadsheet and email access.
4. Select **Deploy → New deployment → Web app**.
5. Set **Execute as** to **Me** and **Who has access** to **Anyone**.
6. Deploy and copy the production URL ending in `/exec`.
7. Add that URL to the homepage form's `data-sheet-endpoint` attribute.

The Sheet itself must remain private. Only the deployed web app accepts public form submissions.
