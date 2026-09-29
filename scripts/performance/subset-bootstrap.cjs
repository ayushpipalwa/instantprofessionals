// Only subset Bootstrap for the homepage bundle. Shared/vendor files stay intact.
const { PurgeCSS } = require('purgecss');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

(async () => {
  const [result] = await new PurgeCSS().purge({
    content: [
      path.join(root, 'index.html'),
      path.join(root, 'assets/js/main.js'),
      path.join(root, 'assets/js/enquiry-home.js'),
    ],
    css: [path.join(root, 'assets/vendor/bootstrap/css/bootstrap.min.css')],
    // Retain form validation, accessibility helpers and interactive state rules.
    safelist: [/^form-/, /^invalid-/, /^valid-/, /^was-validated$/, /^visually-hidden/, /^sr-only/, 'show', 'active', 'disabled', 'fade', 'collapse', 'collapsing'],
    fontFace: false,
    keyframes: false,
    variables: false,
  });
  if (!result || result.css.length < 1000) throw new Error('Empty Bootstrap subset');
  process.stdout.write(result.css);
})().catch(error => { console.error(error); process.exitCode = 1; });
