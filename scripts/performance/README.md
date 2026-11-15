# Homepage CSS build

The homepage bundle subsets its combined CSS using its HTML and both homepage
scripts, including dynamically rendered sections. Icon rules, keyframes, variables, form-validation,
navigation and interactive states are explicitly retained. Shared CSS source files,
Bootstrap and service-page styles are not modified.

To regenerate the CSS after changing homepage markup or JavaScript:

1. In `scripts/performance`, run `npm ci` (Node.js 20 or newer), then return to the repository root.
2. Run `python scripts/build_homepage_assets.py --css-only`. The full build without this flag additionally requires Pillow and fonttools.
3. Review the generated assets and check desktop/mobile menus, contact validation
   and all homepage sections before committing. The build updates the stylesheet URL using a content hash.

Pages deployment uses the committed bundle and needs no additional runtime dependency.

## Service icon subset

The seven priority pages in service-icons.json load service-icons.css and a
shared WOFF2 subset instead of the complete Bootstrap Icons library. Original
vendor files remain available to other pages. Two newer MCA class names absent
from the installed library use its existing building glyph.

Install scripts/performance/font-requirements.txt, then run
python scripts/build_service_icons.py from the repository root. Use --check in
CI or --git-index to read exact staged paths on Windows. New icons must exist
in the vendor stylesheet or have an explicit alias. The build rejects missing
glyphs, and service icon validation runs on pull requests.

The build links the complete homepage-only bundle from index.html instead of
embedding it in the document. The stylesheet stays render-blocking to preserve
the first-paint cascade and avoid a flash of unstyled content. Its content-hashed
URL changes automatically when CSS changes; relative font/image URLs resolve
from assets/css. CI checks the generated CSS and HTML link together.

This reduces HTML payload and permits independent stylesheet caching on repeat
visits. A cold visit adds a stylesheet request; do not claim improved LCP from
HTML size alone. Compare mobile/desktop layout and cold/warm measurements when
changing delivery. No CSS rules are removed by this delivery change.
