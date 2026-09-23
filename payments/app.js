/* Quote tokens stay out of URLs before loading any third-party script or analytics. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cleanLocation = location.origin + location.pathname;
  let token = new URLSearchParams(location.hash.slice(1)).get('quote') || '';
  history.replaceState(null, '', location.pathname);
  const storageKey = 'ip-payment-quote';
  try { if (token) sessionStorage.setItem(storageKey, token); else token = sessionStorage.getItem(storageKey) || ''; } catch { /* Storage may be disabled. */ }
  const base = (window.IP_PAYMENT_CONFIG?.apiBase || '').replace(/\/$/, '');
  const validBase = (() => {
    try { const u = new URL(base); return !u.username && !u.password && !u.search && !u.hash &&
      (u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))); }
    catch { return false; }
  })();
  let quote, busy = false, checkoutOpen = false, confirmed = false, scriptPromise;
  const status = text => { $('status').textContent = text; };
  function track(event, fields = {}) {
    try { if (typeof window.gtag === 'function') window.gtag('event', quote?.mode === 'test' ? 'test_' + event : event, { ...fields, page_location: cleanLocation }); } catch { /* Analytics never blocks checkout. */ }
  }
  // No automatic page views/enhanced form tracking; no token, scope or customer data in events.
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-TG0272S260', { send_page_view: false, page_location: cleanLocation });
  const analytics = document.createElement('script'); analytics.async = true;
  analytics.src = 'https://www.googletagmanager.com/gtag/js?id=G-TG0272S260'; document.head.append(analytics);
  function controls() {
    $('pay').disabled = busy || checkoutOpen || confirmed || !quote || quote.expires <= Date.now() || !$('consent').checked;
    $('refresh').disabled = busy || checkoutOpen;
    $('quote-form').querySelector('button').disabled = busy || checkoutOpen;
  }
  async function api(path, data = {}) {
    const response = await fetch(base + path, { method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteToken: token, ...data }), signal: AbortSignal.timeout(20000) });
    let result;
    try { result = await response.json(); } catch { throw new Error('Payment service unavailable. Check status before retrying payment.'); }
    if (!response.ok) throw new Error(result.error || 'Payment service unavailable.');
    return result;
  }
  function render(result) {
    quote = { ...quote, ...result }; confirmed = quote.status === 'paid';
    $('quote').hidden = false;
    for (const key of ['label', 'scope', 'reference']) $(key).textContent = quote[key];
    $('amount').textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(quote.amount / 100);
    $('expires').textContent = new Date(quote.expires).toLocaleString('en-IN');
    $('mode').textContent = quote.mode === 'test' ? 'TEST MODE — no real payment' : 'Secure payment via Razorpay';
    $('pay').hidden = confirmed; $('agreement').hidden = confirmed;
    if (confirmed) {
      status('Payment confirmed. Our team will follow up on the agreed service.');
      $('receipt').textContent = `Payment reference: ${quote.paymentId}. Keep this reference for support.`;
      const key = 'ip-payment-reported-' + quote.orderId;
      let sent = false; try { sent = sessionStorage.getItem(key) === 'yes'; } catch { /* Best effort. */ }
      if (!sent) {
        track('purchase', { transaction_id: quote.orderId, currency: 'INR', value: quote.amount / 100,
          items: [{ item_id: 'professional-service', item_name: 'Professional service', price: quote.amount / 100, quantity: 1 }] });
        try { sessionStorage.setItem(key, 'yes'); } catch { /* GA transaction_id also deduplicates. */ }
      }
    } else if (quote.expires <= Date.now()) status('This quote has expired. Check status if you already paid; otherwise contact our team for a new quote.');
    controls();
  }
  async function checkStatus() {
    busy = true; controls(); status('Checking payment status…');
    try { render(await api('/status')); if (!confirmed && quote.expires > Date.now()) status('Payment is not yet confirmed. If you were debited, wait and check again before retrying.'); }
    catch (error) { status(error.message); }
    finally { busy = false; controls(); }
  }
  function loadCheckout() {
    if (window.Razorpay) return Promise.resolve();
    if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); scriptPromise = null; reject(new Error('Checkout took too long to load. Please try again.')); }, 15000);
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => { clearTimeout(timer); if (window.Razorpay) resolve(); else { scriptPromise = null; reject(new Error('Checkout unavailable.')); } };
      script.onerror = () => { clearTimeout(timer); scriptPromise = null; reject(new Error('Could not load secure checkout. Please try again.')); };
      document.head.append(script);
    });
    return scriptPromise;
  }
  $('consent').addEventListener('change', controls);
  $('refresh').addEventListener('click', checkStatus);
  $('pay').addEventListener('click', async () => {
    if (busy || checkoutOpen || confirmed || !$('consent').checked) return;
    busy = true; controls(); status('Preparing secure checkout…');
    try {
      // Recheck authoritative capture status before reopening the same order.
      render(await api('/status')); if (confirmed) return;
      await loadCheckout();
      const order = await api('/orders'); render(order);
      track('begin_checkout', { currency: 'INR', value: order.amount / 100 });
      const checkout = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount,
        currency: 'INR', name: 'Instant Professionals', description: 'Professional services — ' + order.reference,
        image: location.origin + '/assets/img/instant-professionals-logo-2026.png', theme: { color: '#0b2341' },
        retry: { enabled: false },
        handler: async response => {
          checkoutOpen = false; busy = true; controls(); status('Verifying payment securely…');
          try {
            render(await api('/verify', response));
            if (!confirmed) status('Payment is awaiting capture. Check status shortly; do not pay again yet.');
          } catch (error) { status(error.message); track('payment_verification_pending'); }
          finally { busy = false; controls(); }
        },
        modal: { ondismiss: () => { checkoutOpen = false; controls(); if (!confirmed && !busy) { track('checkout_dismissed'); checkStatus(); } } }
      });
      checkout.on('payment.failed', () => { track('payment_failed'); status('Payment attempt failed. Close checkout and check status before retrying.'); });
      checkoutOpen = true; checkout.open();
    } catch (error) { checkoutOpen = false; status(error.message); track('checkout_error'); }
    finally { busy = false; controls(); }
  });
  async function review() {
    busy = true; controls();
    try {
      quote = null; confirmed = false; $('consent').checked = false; $('receipt').textContent = '';
      render(await api('/quote')); $('quote-form').hidden = true;
      if (!confirmed && quote.expires > Date.now()) status('Review your agreed scope and total, then continue to secure checkout.');
      if (quote.orderId && !confirmed) await checkStatus();
    } catch (error) { $('quote').hidden = true; $('quote-form').hidden = false; status(error.message); }
    finally { busy = false; controls(); }
  }
  $('quote-form').addEventListener('submit', event => {
    event.preventDefault(); token = $('quote-token').value.trim();
    try { sessionStorage.setItem(storageKey, token); } catch { /* Optional. */ }
    $('quote-token').value = ''; review();
  });
  if (!validBase) { status('Online payments are not enabled yet. Please contact our team to arrange your service.'); return; }
  if (token) review();
  else { $('quote-form').hidden = false; status('Open your private quote link, or enter the quote code supplied by our team.'); }
})();
