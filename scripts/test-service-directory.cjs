const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const html = readFileSync(path.join(root, 'services.html'), 'utf8');
const links = [...html.matchAll(/<a href="([^"]+)" data-service-link([^>]*)><span>([^<]+)<\/span>/g)].map(m => ({
  href: m[1], textContent: m[3].replaceAll('&amp;', '&'),
  dataset: {keywords: /data-keywords="([^"]*)"/.exec(m[2])?.[1] || ''},
  hidden: false
}));
assert.equal(new Set(links.map(l => l.href)).size, links.length, 'Count unique services, not duplicate entries');
for (const page of ['digital-marketing.html', 'logo-design.html']) {
  assert(links.some(l => l.href === page), page + ' must be discoverable in directory search');
}
const schema = JSON.parse(/data-ip-services-schema>([\s\S]*?)<\/script>/.exec(html)[1]);
const list = schema['@graph'].find(n => n['@type'] === 'ItemList');
assert.equal(list.numberOfItems, links.length);
assert.deepEqual(list.itemListElement.map(n => n.url), links.map(l => 'https://www.instantprofessionals.in/' + l.href));
assert.deepEqual(list.itemListElement.map(n => n.position), links.map((_, i) => i + 1));
let filter;
const input = {value: '', addEventListener: (type, fn) => {if (type === 'input') filter = fn;}};
const status = {}, empty = {};
const groups = [...html.matchAll(/<section class="ip-service-group"[^>]*>([\s\S]*?)<\/section>/g)].map(m => ({
  hidden: false,
  querySelectorAll: () => links.filter(l => m[1].includes('href="' + l.href + '"'))
}));
const document = {
  readyState: 'complete',
  querySelector: s => ({'[data-service-search]': input, '[data-filter-status]': status, '[data-empty-state]': empty})[s],
  querySelectorAll: () => groups
};
vm.runInNewContext(readFileSync(path.join(root, 'assets/js/service-directory.js'), 'utf8'), {document});
assert.equal(status.textContent, links.length + ' services');
for (const [query, href] of [
  ['  SOCIAL MEDIA  ', 'digital-marketing.html'],
  ['brand identity', 'logo-design.html'],
  ['logo', 'logo-design.html'],
  ['books reconciliation', 'accounting-bookkeeping.html']
]) {
  input.value = query; filter();
  assert(links.some(l => l.href === href && !l.hidden), query + ' must find ' + href);
  assert.equal(empty.hidden, true);
}
input.value = 'no-such-service-qa'; filter();
assert.equal(status.textContent, '0 services');
assert.equal(empty.hidden, false);
assert(groups.every(g => g.hidden));
input.value = ''; filter();
assert(links.every(l => !l.hidden));
assert(groups.every(g => !g.hidden));
assert.equal(empty.hidden, true);
console.log('PASS: directory discovery, unique counts, ItemList and search/reset behavior');
