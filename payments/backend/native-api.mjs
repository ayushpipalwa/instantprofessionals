import { encrypt, decrypt, uniqueParams, fail, rupees } from './core.mjs';

// CCAvenue API Doc v1.3, pages 97–103. Creation sends an invoice email;
// call only after the finance administrator explicitly chooses Send payment link.
export function quickInvoiceRequest(input) {
  const { invoiceId, invoiceNumber, customerName, email, phone, amount } = input;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoiceId || '') ||
      typeof invoiceNumber !== 'string' || !invoiceNumber.trim() || invoiceNumber.length > 100 ||
      typeof customerName !== 'string' || !/^[a-zA-Z0-9 ._'\-]{1,60}$/.test(customerName) ||
      typeof email !== 'string' || email.length > 70 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^\d{10}$/.test(phone || '') || !Number.isSafeInteger(amount) || amount < 1000 || amount > 10000000000)
    fail(400, 'Check the issued invoice, customer contact details and payment amount.');
  return {
    customer_name: customerName, customer_email_id: email, customer_mobile_no: phone,
    customer_email_subject: 'Instant Professionals invoice payment', bill_delivery_type: 'EMAIL',
    currency: 'INR', valid_for: 7, valid_type: 'days', amount: rupees(amount),
    // Invoice numbers contain slashes; provider references prohibit them. Preserve
    // the immutable invoice UUID and put the printed number in the description.
    merchant_reference_no: invoiceId,
    invoice_description: 'Payment against IPREPORT invoice ' + invoiceNumber,
  };
}

export function nativeApi(cfg, fetchImpl = fetch) {
  return async (command, query) => {
    if (!['generateQuickInvoice', 'invoiceList'].includes(command)) fail(400, 'Unsupported invoice operation.');
    const body = new URLSearchParams({ enc_request: encrypt(JSON.stringify(query), cfg.apiKey),
      access_code: cfg.apiCode, command, request_type: 'JSON', response_type: 'JSON', version: '1.2' });
    const response = await fetchImpl(cfg.statusUrl, { method: 'POST', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
      signal: AbortSignal.timeout(15000) });
    if (!response.ok) fail(502, 'CCAvenue invoice service is unavailable.');
    const raw = await response.text();
    if (raw.length > 131072) fail(502, 'CCAvenue invoice response is too large.');
    const envelope = uniqueParams(raw.trim());
    if (envelope.status !== '0') fail(502, 'CCAvenue invoice API access or permissions need verification.');
    let result;
    try { result = JSON.parse(decrypt(envelope.enc_response, cfg.apiKey)); }
    catch { fail(502, 'CCAvenue invoice response could not be verified.'); }
    result = result?.Generate_Invoice_Result || result?.Invoice_List_Result || result;
    if (!result || typeof result !== 'object' || Array.isArray(result) || result.error_code ||
        (command === 'generateQuickInvoice' && String(result.invoice_status) !== '0'))
      fail(502, 'CCAvenue could not complete the invoice request.');
    return result;
  };
}

export function invoiceLinkResult(result) {
  if (typeof result.invoice_id === 'number' && !Number.isSafeInteger(result.invoice_id))
    fail(502, 'CCAvenue invoice reference requires review.');
  const invoiceId = String(result.invoice_id || '');
  let url;
  try { url = new URL(result.tiny_url); } catch { fail(502, 'CCAvenue payment link requires review.'); }
  if (!/^\d{1,25}$/.test(invoiceId) || url.hostname !== 'payit.cc' ||
      !['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.port || url.pathname !== '/I' + invoiceId || url.search || url.hash)
    fail(502, 'CCAvenue payment link requires review.');
  return { providerInvoiceId: invoiceId, paymentUrl: url.href };
}
