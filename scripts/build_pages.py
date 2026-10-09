#!/usr/bin/env python3
"""Stage only public web assets. Backend code, secrets and databases are never published."""
from pathlib import Path
import shutil
from html import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'
PUBLIC_EXTENSIONS = {'.html', '.css', '.js', '.json', '.xml', '.txt', '.ico', '.png', '.jpg',
                     '.jpeg', '.webp', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.eot', '.map', '.pdf', '.webmanifest'}
PUBLIC_DIRS = {'assets', 'payments', 'pay', 'ai', 'forms', 'seo'}

# Legacy addresses observed in GA4. Keep these out of the sitemap; their
# destinations are the existing canonical pages. GitHub Pages has no redirect config.
LEGACY_ROUTES = {
    'about.html': '/#about',
    'about-us/index.html': '/#about',
    'contact.html': '/#contact',
    'cancellation-policy/index.html': '/refund-policy.html',
    'disclaimer/index.html': '/terms.html',
    'terms-and-conditions.html': '/terms.html',
    'products/index.html': '/services.html',
    'shop/index.html': '/services.html',
}

def write_legacy_routes():
    for filename, destination in LEGACY_ROUTES.items():
        target = OUT / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        url = escape('https://www.instantprofessionals.in' + destination, quote=True)
        target.write_text(
            '<!doctype html><html lang="en-IN"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta name="robots" content="noindex,follow">'
            '<title>Page moved | Instant Professionals</title>'
            f'<link rel="canonical" href="{url}">'
            f'<meta http-equiv="refresh" content="0;url={url}"></head>'
            f'<body><main><h1>Page moved</h1><p><a href="{url}">'
            'Continue to Instant Professionals</a>.</p></main></body></html>',
            encoding='utf-8',
        )

def public(path):
    parts = path.parts
    if any(part.startswith('.') for part in parts):
        return len(parts) == 1 and path.name == '.nojekyll'
    if any(part in {'backend', 'node_modules', 'test', 'tests', 'data'} for part in parts):
        return False
    return (len(parts) == 1 or parts[0] in PUBLIC_DIRS) and (path.suffix.lower() in PUBLIC_EXTENSIONS or path.name == 'CNAME')

def build():
    if OUT.exists():
        raise SystemExit('Use a clean _site directory before building.')
    OUT.mkdir()
    for source in ROOT.rglob('*'):
        relative = source.relative_to(ROOT)
        if source.is_file() and not source.is_symlink() and public(relative):
            target = OUT / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
    write_legacy_routes()
    assert (OUT / 'index.html').exists()
    assert (OUT / 'payments' / 'index.html').exists()
    assert not (OUT / 'payments' / 'backend').exists()
    print('Public website staged in _site; backend excluded.')

if __name__ == '__main__':
    build()
