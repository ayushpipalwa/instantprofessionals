const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const css = readFileSync(path.join(root, 'assets/css/homepage.min.css'));
const version = createHash('sha256').update(css).digest('hex').slice(0, 12);
assert(html.includes('href="assets/css/homepage.min.css?v=' + version + '"'));
assert(!html.includes('<style data-ip-vision="2">'), 'Keep homepage CSS independently cacheable');
const actions = html.match(/<div class="ip-os-actions">([\s\S]*?)<\/div>/)[1];
const ctas = [...actions.matchAll(/<a\b[^>]*data-enquiry-cta[^>]*>/g)];
assert.equal(ctas.length, 1);
const attrs = Object.fromEntries([...ctas[0][0].matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
assert.equal(attrs.href, '#contact');
assert(html.includes('id="contact"'));
assert(actions.includes('href="services.html"'), 'Keep service discovery available');
assert.equal(attrs['data-service'], 'General enquiry');
const code = readFileSync(path.join(root, 'assets/js/enquiry-home.js'), 'utf8')
  .replace(/\}\)\(\);\s*$/, 'window.bindTest = bindAnalyticsLinks;})();');
const events = [], handlers = [];
const window = {
  location: {hostname: 'www.instantprofessionals.in', origin: 'https://www.instantprofessionals.in', pathname: '/', href: 'https://www.instantprofessionals.in/?private=value'},
  gtag: (...args) => events.push(args)
};
const document = {readyState: 'loading', addEventListener() {}};
vm.runInNewContext(code, {window, document, console});
document.addEventListener = (name, fn) => {if (name === 'click') handlers.push(fn)};
window.bindTest();
const link = {getAttribute: name => attrs[name] || null, hasAttribute: name => name === 'data-enquiry-cta'};
handlers[0]({target: {closest: () => link}, defaultPrevented: true});
assert.equal(events.length, 1, 'Track even when smooth scrolling prevents default navigation');
assert.equal(events[0][1], 'enquiry_cta_click');
assert.equal(events[0][2].service_name, 'General enquiry');
assert.equal(events[0][2].page_location, 'https://www.instantprofessionals.in/');
assert(!events.some(e => e[1] === 'generate_lead'));
assert(!JSON.stringify(events).includes('private'));
console.log('PASS: homepage cache version, hero contact destination, service discovery and click-not-lead semantics');
