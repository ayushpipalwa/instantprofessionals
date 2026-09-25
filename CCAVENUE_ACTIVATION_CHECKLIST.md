# CCAvenue Payment Activation Checklist

This checklist covers everything needed to activate live CCAvenue payments for `instantprofessionals.in` using the existing `/payments` module.

---

## 1. Confirm prerequisites

- [ ] You have a **CCAVENUE merchant account** and access to the **MARS panel**.
- [ ] You have received from CCAvenue:
  - `MERCHANT_ID`
  - `ACCESS_CODE` (checkout)
  - `WORKING_KEY` (checkout)
  - `API_ACCESS_CODE` (status API)
  - `API_WORKING_KEY` (status API)
- [ ] You have the **Integration Kit** (Node non-seamless) and have validated it as per `payments/KIT_VALIDATION.md`.

---

## 2. Deploy the payments backend

Your backend lives in `payments/backend/` (`server.mjs`, `core.mjs`, etc.).

- [ ] Choose hosting:
  - Recommended: **Cloud Run** (see `payments/CLOUD_RUN.md`), or
  - Any Node 22+ host (Render, Railway, VM, etc.).
- [ ] Ensure the service is reachable over HTTPS, e.g.:
  - `https://payments.instantprofessionals.in`  
  or  
  - `https://<project-id>.a.run.app`
- [ ] Open required ports (usually just 443 via your hosting platform).

---

## 3. Configure environment variables / secrets

On your hosting platform, set these for the payments backend:

### Core settings

```bash
PAYMENT_MODE=test
ENABLE_LIVE_PAYMENTS=false
CCAVENUE_KIT_VERIFIED=true
```

### CCAvenue credentials (test first)

```bash
CCAVENUE_MERCHANT_ID=YOUR_TEST_MERCHANT_ID
CCAVENUE_ACCESS_CODE=YOUR_TEST_ACCESS_CODE
CCAVENUE_WORKING_KEY=YOUR_TEST_WORKING_KEY
CCAVENUE_API_ACCESS_CODE=YOUR_TEST_API_ACCESS_CODE
CCAVENUE_API_WORKING_KEY=YOUR_TEST_API_WORKING_KEY
```

### Network / CORS

```bash
ALLOWED_ORIGIN=https://instantprofessionals.in
PAYMENT_PUBLIC_ORIGIN=https://payments.instantprofessionals.in
# or whatever domain hosts your payments backend
```

### Database

Depending on your setup (SQLite/Postgres):

- For SQLite:
  ```bash
  PAYMENT_DB_PATH=./data/payments.db
  ```
- For Postgres:
  ```bash
  PAYMENT_SQL_HOST=...
  PAYMENT_SQL_PORT=5432
  PAYMENT_SQL_USER=payments
  PAYMENT_SQL_PASSWORD=...
  PAYMENT_SQL_DATABASE=payments
  ```

Ensure the DB is created and migrations applied so that table `cca_quotes` exists.

---

## 4. Update frontend config

In `payments/app.js` (or related config):

- [ ] Replace any `localhost` backend URLs with your deployed backend URL, e.g.:

```js
const BACKEND_ORIGIN = 'https://payments.instantprofessionals.in';
```

Endpoints used:

- `POST ${BACKEND_ORIGIN}/quote`
- `POST ${BACKEND_ORIGIN}/session`
- `GET  ${BACKEND_ORIGIN}/status?quote_id=...`

- [ ] Ensure `payments/index.html` is served at:
  - `https://instantprofessionals.in/payments/` (via GitHub Pages or your hosting).

---

## 5. Configure CCAvenue MARS panel

In the CCAvenue MARS dashboard:

- [ ] Set **Return URL / Response URL** to:
  - `https://payments.instantprofessionals.in/return`  
    (or whatever path your `server.mjs` uses for handling CCAvenue returns).
- [ ] If required, configure **IP whitelisting** for your backend IPs (especially for Cloud Run).
- [ ] Confirm that:
  - Test credentials work in **test mode**.
  - Live credentials are active for **live mode**.

Refer to CCAvenue's integration docs and your kit documentation for exact field names.

---

## 6. Test end-to-end (test mode)

- [ ] Start the backend in test mode:
  - `PAYMENT_MODE=test`
  - `ENABLE_LIVE_PAYMENTS=false`
- [ ] Create a test quote from your admin/ops side (using your internal tooling or DB).
- [ ] Open:
  - `https://instantprofessionals.in/payments/`
- [ ] Enter the test quote code and proceed:
  - [ ] Redirect to CCAvenue checkout works.
  - [ ] You can complete a test payment (using CCAvenue test cards/UPI if provided).
  - [ ] Return URL hits your backend.
  - [ ] Quote status updates in DB.
  - [ ] IPREPORT's `PaymentStatusPanel` shows the updated status.

- [ ] Verify logs:
  - Backend logs show "CCAvenue payments started (test)."
  - No errors on `/quote`, `/session`, `/status`, or `/return`.

---

## 7. Switch to live mode

Once test payments work:

- [ ] In CCAvenue MARS, confirm live credentials:
  - Live `MERCHANT_ID`, `ACCESS_CODE`, `WORKING_KEY`, etc.
- [ ] Update backend env vars:

```bash
PAYMENT_MODE=live
ENABLE_LIVE_PAYMENTS=true

CCAVENUE_MERCHANT_ID=YOUR_LIVE_MERCHANT_ID
CCAVENUE_ACCESS_CODE=YOUR_LIVE_ACCESS_CODE
CCAVENUE_WORKING_KEY=YOUR_LIVE_WORKING_KEY
CCAVENUE_API_ACCESS_CODE=YOUR_LIVE_API_ACCESS_CODE
CCAVENUE_API_WORKING_KEY=YOUR_LIVE_API_WORKING_KEY
```

- [ ] Redeploy or restart the backend.
- [ ] Perform a small real transaction:
  - [ ] Payment goes through CCAvenue.
  - [ ] Return URL processes correctly.
  - [ ] Status shows as confirmed in DB and IPREPORT.

---

## 8. Operational notes

- [ ] Set up monitoring/alerts on:
  - Backend uptime (Cloud Run / hosting dashboard).
  - Database size and performance.
  - Error logs for `/quote`, `/session`, `/status`, `/return`.
- [ ] Document:
  - How your team generates quotes.
  - How to reconcile payments using `admin.mjs`.
  - How to handle failed/pending payments.

---

## 9. Optional enhancements

- [ ] Add "Pay Now" buttons on key service pages linking to `/payments/`.
- [ ] Add email notifications on payment confirmation.
- [ ] Expose a simple admin dashboard for viewing quotes (secured).

---

When all items above are complete, your CCAvenue payment gateway will be fully active for `instantprofessionals.in`.
