// Subset the homepage bundle supplied on stdin. Shared source files stay intact.
const { PurgeCSS } = require('purgecss');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

(async () => {
  const [result] = await new PurgeCSS().purge({
    content: [
      { raw: fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ''), extension: 'html' },
      path.join(root, 'assets/js/main.js'),
      path.join(root, 'assets/js/enquiry-home.js'),
    ],
    css: [{ raw: fs.readFileSync(0, 'utf8') }],
    // Retain form validation, accessibility helpers and interactive state rules.
    safelist: [/^form-/, /^invalid-/, /^valid-/, /^was-validated$/, /^visually-hidden/, /^sr-only/, /^bi-/, 'show', 'active', 'disabled', 'fade', 'collapse', 'collapsing', 'navbar-mobile', 'dropdown-active', 'header-scrolled', 'aos-animate'],
    dynamicAttributes: ['aria-busy', 'data-state'],
    fontFace: false,
    keyframes: false,
    variables: false,
  });
  if (!result || result.css.length < 1000) throw new Error('Empty homepage subset');
  process.stdout.write(result.css);
})().catch(error => { console.error(error); process.exitCode = 1; });
