const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function app(kind) {
  const events = [], requests = [], opens = [], timers = [];
  const status = { textContent: '', dataset: {} };
  const fields = Object.fromEntries(Object.entries({
    name: 'QA TEST local only', email: 'qa@example.invalid', phone: '+12025550142',
    preferredContact: 'No preference', service: 'Accounting', package: 'Bookkeeping',
    message: 'Private QA message', consent: 'Yes', website: ''
  }).map(([name, value]) => [name, {
    value, disabled: false, validationMessage: '', listeners: {},
    setCustomValidity(message) { this.validationMessage = message; },
    focus() {}, addEventListener(name, callback) { this.listeners[name] = callback; }
  }]));
  const buttons = [{ disabled: false }, { disabled: false, addEventListener() {} }];
  const attributes = { 'data-sheet-endpoint': 'https://script.google.com/macros/s/QA_OFFLINE/exec' };
  const form = {
    resets: 0,
    querySelector(selector) {
      if (selector === '.ip-form-status') return status;
      if (selector === '[data-whatsapp-submit]') return buttons[1];
      return fields[selector.match(/name="([^\"]+)"/)?.[1]] || null;
    },
    querySelectorAll: () => [...Object.values(fields), ...buttons],
    getAttribute: name => attributes[name] || null,
    setAttribute: (name, value) => { attributes[name] = value; },
    checkValidity: () => Object.values(fields).every(field => !field.validationMessage),
    reportValidity() {}, addEventListener() {},
    reset() { this.resets++; }
  };
  class FormDataMock extends Map {
    constructor(form) { super(form ? Object.entries(fields).filter(([,field]) => !field.disabled).map(([name,field]) => [name,field.value]) : []); }
  }
  const window = {
    __ipGoogleAnalyticsId: 'G-TG0272S260', location: { href: 'https://example.invalid/enquiry' },
    gtag: (...args) => events.push(args), open: (...args) => { opens.push(args); return null; },
    setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {}
  };
  const document = {
    readyState: 'loading', addEventListener() {}, querySelector: selector => selector === '.ip-enquiry-form' ? form : null,
    querySelectorAll: selector => selector === '.ip-enquiry-form' ? [form] : [],
    getElementById: id => id === 'ipAutomationForm' ? form : id === 'ipAutomationSaveStatus' ? status : {}
  };
  const fetch = (url, options) => new Promise((resolve, reject) => {
    requests.push({ url, options, resolve, reject });
    options.signal.addEventListener('abort', () => reject(new Error('Timed out')));
  });
  let source;
  if (kind === 'ai') {
    source = readFileSync(join(__dirname, '../ai-business-automation.html'), 'utf8').match(/<script>\s*\(function\(\)\{[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g, '');
    source = source.replace(/\}\)\(\);\s*$/, 'globalThis.qa={saveLead};})();');
  } else {
    source = readFileSync(join(__dirname, '../assets/js/' + (kind === 'home' ? 'enquiry-home.js' : 'enquiry.js')), 'utf8');
    const bind = kind === 'home' ? 'initialise' : 'bindForms';
    source = source.replace(/\}\)\(\);\s*$/, `globalThis.qa={submitOnline,continueOnWhatsApp,bind:${bind}${kind === 'service' ? ',selectPackage' : ''}};})();`);
  }
  const context = vm.createContext({ window, document, FormData: FormDataMock, fetch, AbortController, console });
  vm.runInContext(source, context);
  return {
    fields, form, status, events, requests, timers, opens, window,
    submit: () => kind === 'ai' ? context.qa.saveLead({ name: fields.name.value, phone: fields.phone.value }, { service: 'Accounting', title: 'Accounting' }) : context.qa.submitOnline(form),
    whatsapp: () => context.qa.continueOnWhatsApp(form),
    bind: () => context.qa.bind(),
    selectPackage: () => context.qa.selectPackage({ getAttribute: () => "New unsent package" })
  };
}
function respond(request, result, ok = true) { request.resolve({ ok, json: async () => result }); }
for (const kind of ['home', 'service', 'ai']) {
  test(kind + ': success needs readable acknowledgement and unlocks controls', async () => {
    const instance = app(kind), pending = instance.submit();
    const request = instance.requests[0];
    assert.equal(request.options.mode, 'cors');
    assert.equal(request.options.keepalive, true, 'navigation must not cancel a submitted lead');
    assert.equal(instance.form.getAttribute('aria-busy'), 'true');
    assert.ok(instance.form.querySelectorAll().every(field => field.disabled));
    assert.equal(request.options.body.get('name'), 'QA TEST local only');
    assert.ok(request.options.body.get('service').includes('Accounting'));
    if (kind !== 'ai') assert.ok(request.options.body.get('service').includes('Bookkeeping'));
    respond(request, { success: true, enquiryId: 'IP-OFFLINE-QA' }); await pending;
    assert.match(instance.status.textContent, /has been recorded/);
    assert.equal(instance.events.filter(event => event[1] === 'generate_lead').length, 1);
    assert.equal(instance.form.getAttribute('aria-busy'), 'false');
    assert.ok(instance.form.querySelectorAll().every(field => !field.disabled));
  });
  test(kind + ': rejection, HTTP failure, non-JSON, network error and timeout keep draft; retry succeeds', async () => {
    for (const scenario of ['reject', 'http', 'json', 'network', 'timeout', 'unacknowledged']) {
      const instance = app(kind), pending = instance.submit(), request = instance.requests[0];
      if (scenario === 'network') request.reject(new Error('Offline'));
      else if (scenario === 'timeout') instance.timers[0]();
      else if (scenario === 'json') request.resolve({ ok: true, json: async () => { throw new Error('Invalid JSON'); } });
      else respond(request, { success: scenario === 'unacknowledged' }, scenario !== 'http');
      await pending;
      assert.match(instance.status.textContent, /could not confirm/);
      assert.equal(instance.form.resets, 0);
      assert.equal(instance.fields.name.value, 'QA TEST local only');
      assert.equal(instance.form.getAttribute('aria-busy'), 'false');
      assert.equal(instance.events.filter(event => event[1] === 'generate_lead').length, 0);
      const retry = instance.submit(); respond(instance.requests[1], { success: true, duplicate: true }); await retry;
      assert.match(instance.status.textContent, /has been recorded/);
    }
  });
}
for (const kind of ['home', 'service']) {
  test(kind + ': repeated submit and WhatsApp action cannot replace a pending enquiry', async () => {
    const instance = app(kind), pending = instance.submit();
    await instance.submit(); instance.whatsapp();
    assert.equal(instance.requests.length, 1); assert.equal(instance.opens.length, 0);
    respond(instance.requests[0], { success: true, enquiryId: 'IP-QA' }); await pending;
  });
  test(kind + ': WhatsApp noopener null keeps original page and excludes private analytics', () => {
    const instance = app(kind); instance.whatsapp();
    assert.equal(instance.requests.length, 0); assert.equal(instance.opens.length, 1);
    assert.equal(instance.window.location.href, 'https://example.invalid/enquiry');
    assert.match(instance.opens[0][0], /Private%20QA%20message/);
    assert.match(instance.opens[0][0], /Accounting/);
    assert.match(instance.opens[0][0], /Bookkeeping/);
    assert.equal(instance.form.resets, 0);
    assert.ok(!JSON.stringify(instance.events).includes('qa@example.invalid'));
    assert.ok(!JSON.stringify(instance.events).includes('Private'));
    assert.equal(instance.events.filter(event => event[1] === 'generate_lead').length, 0);
  });
  test(kind + ': changing preferred contact clears stale conditional validity', async () => {
    const instance = app(kind); instance.bind();
    instance.fields.email.value = ''; instance.fields.preferredContact.value = 'Email';
    await instance.submit(); assert.ok(instance.fields.email.validationMessage);
    instance.fields.preferredContact.value = 'No preference';
    instance.fields.preferredContact.listeners.change();
    assert.equal(instance.fields.email.validationMessage, '');
  });
}

test('service: external package action cannot mutate a pending enquiry', async () => {
  const instance = app('service'), pending = instance.submit();
  instance.selectPackage();
  assert.equal(instance.fields.package.value, 'Bookkeeping');
  respond(instance.requests[0], { success: true, enquiryId: 'IP-QA' }); await pending;
});
