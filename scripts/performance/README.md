# Homepage CSS build

The homepage bundle retains all custom styles, icon rules, keyframes and variables.
Only its copy of Bootstrap is reduced, using the homepage and both homepage scripts
as content sources. Form-validation and interactive states are explicitly retained.
Shared Bootstrap and service-page styles are not modified.

To regenerate the CSS after changing homepage markup or JavaScript:

1. In `scripts/performance`, run `npm ci` (Node.js 20 or newer), then return to the repository root.
2. Run `python scripts/build_homepage_assets.py --css-only`. The full build without this flag additionally requires Pillow and fonttools.
3. Review the generated assets and check desktop/mobile menus, contact validation
   and all homepage sections before committing. Update the homepage CSS version.

Pages deployment uses the committed bundle and needs no additional runtime dependency.
