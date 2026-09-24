/* Private quote codes never go to analytics or CCAvenue. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cleanLocation = location.origin + location.pathname;
  let token = new URLSearchParams(location.hash.slice(1)).get('quote') || '';
  history.replaceState(null, '', location.pathname);
  const storageKey = 'ip-ccavenue-quote';
  try { if (token) sessionStorage.setItem(storageKey, token); else token = sessionStorage.getItem(storageKey) || ''; } catch {}
  const base = (window.IP_PAYMENT_CONFIG?.apiBase || '').replace(/\/$/, '');
  const validBase = (() => {
    try { const u = new URL(base); return !u.username && !u.password && !u.search && !u.hash &&
      (u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))); }
    catch { return false; }
  })();
  let quote, busy = false;
  const status = text => { $('status').textContent = text; };
  function track(event, fields = {}) {
    try { window.gtag?.('event', quote?.mode === 'test' ? 'test_' + event : event, { ...fields, page_location: cleanLocation }); } catch {}
  }
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-TG0272S260', { send_page_view: false, page_location: cleanLocation });
  const analytics = document.createElement('script'); analytics.async = true;
  analytics.src = 'https://www.googletagmanager.com/gtag/js?id=G-TG0272S260'; document.head.append(analytics);
  function controls() {
    $('pay').disabled = busy || !quote || quote.status !== 'new' || quote.expires <= Date.now() || !$('consent').checked;
    $('refresh').disabled = busy;
    $('quote-form').querySelector('button').disabled = busy;
  }
  async function api(path) {
    const response = await fetch(base + path, { method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteToken: token }), signal: AbortSignal.timeout(20000) });
    let result;
    try { result = await response.json(); } catch { throw new Error('Payment service unavailable. Check status before retrying.'); }
    if (!response.ok) throw new Error(result.error || 'Payment service unavailable.');
    return result;
  }
  function render(result) {
    quote = result;
    $('quote').hidden = false;
    for (const key of ['label', 'scope', 'reference']) $(key).textContent = quote[key];
    $('amount').textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(quote.amount / 100);
    $('expires').textContent = new Date(quote.expires).toLocaleString('en-IN');
    $('mode').textContent = quote.mode === 'test' ? 'TEST MODE — no real payment' : 'Secure payment via CCAvenue';
    $('pay').hidden = quote.status !== 'new'; $('agreement').hidden = quote.status !== 'new';
    $('receipt').textContent = quote.paymentId ? 'CCAvenue reference: ' + quote.paymentId + '. Keep this for support.' : '';
    if (quote.status === 'paid') {
      status('Payment confirmed. Our team will follow up on the agreed service.');
      const key = 'ip-cca-reported-' + quote.paymentId;
      let sent = false; try { sent = sessionStorage.getItem(key) === 'yes'; } catch {}
      if (!sent) {
        track('purchase', { transaction_id: quote.paymentId, currency: 'INR', value: quote.amount / 100,
          items: [{ item_id: 'professional-service', item_name: 'Professional service', price: quote.amount / 100, quantity: 1 }] });
        try { sessionStorage.setItem(key, 'yes'); } catch {}
      }
    } else if (quote.status === 'review') {
      status('This payment needs review by our team. Please contact us with your quote reference; do not pay again.');
      track('payment_review_required');
    } else if (quote.status === 'failed') {
      status('The payment was unsuccessful or cancelled. Contact the team to arrange a new attempt after reconciliation.');
      track('payment_failed');
    } else if (quote.status === 'pending') {
      status('Payment is not yet confirmed. Check status shortly or contact the team. Do not start another payment if you were debited.');
      track('payment_verification_pending');
    } else if (quote.expires <= Date.now()) status('This quote has expired. Contact our team for a new quote.');
    else status('Review your agreed scope and total, then continue to CCAvenue.');
    controls();
  }
  async function checkStatus() {
    if (busy) return;
    busy = true; controls(); status('Checking payment status…');
    try { render(await api('/status')); }
    catch (error) { status(error.message); }
    finally { busy = false; controls(); }
  }
  $('consent').addEventListener('change', controls);
  $('refresh').addEventListener('click', checkStatus);
  $('pay').addEventListener('click', async () => {
    if (busy || !quote || quote.status !== 'new' || !$('consent').checked) return;
    busy = true; controls(); status('Preparing secure CCAvenue checkout…');
    try {
      const session = await api('/session');
      // Pin gateway destinations; never execute arbitrary provider HTML or scripts.
      const expected = 'https://' + (quote.mode === 'test' ? 'test' : 'secure') +
        '.ccavenue.com/transaction/transaction.do?command=initiateTransaction';
      if (session.action !== expected || !/^[a-f0-9]+$/i.test(session.fields?.encRequest || '') ||
          typeof session.fields?.access_code !== 'string') throw new Error('Invalid checkout response. Contact our team.');
      quote.status = 'pending'; controls();
      const form = document.createElement('form'); form.method = 'POST'; form.action = expected; form.hidden = true;
      for (const name of ['encRequest', 'access_code']) {
        const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = session.fields[name]; form.append(input);
      }
      document.body.append(form);
      track('begin_checkout', { currency: 'INR', value: quote.amount / 100 });
      status('Redirecting to CCAvenue. If you return without confirmation, check payment status.');
      form.submit();
    } catch (error) { status(error.message); track('checkout_error'); }
    finally { busy = false; controls(); }
  });
  async function review() {
    busy = true; controls();
    try {
      quote = null; $('consent').checked = false; $('receipt').textContent = '';
      const initial = await api('/quote');
      // Returning users must recheck the provider, including refund/review status.
      render(initial.status === 'new' ? initial : await api('/status'));
      $('quote-form').hidden = true;
    } catch (error) { $('quote').hidden = true; $('quote-form').hidden = false; status(error.message); }
    finally { busy = false; controls(); }
  }
  $('quote-form').addEventListener('submit', event => {
    event.preventDefault(); token = $('quote-token').value.trim();
    try { sessionStorage.setItem(storageKey, token); } catch {}
    $('quote-token').value = ''; review();
  });
  window.addEventListener('pageshow', event => { if (event.persisted && validBase && token) { busy = false; checkStatus(); } });
  if (!validBase) { status('Online payments are not enabled yet. Please contact our team to arrange your service.'); return; }
  if (token) review();
  else { $('quote-form').hidden = false; status('Open your private quote link, or enter the quote code supplied by our team.'); }
})();
