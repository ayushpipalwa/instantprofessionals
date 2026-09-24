#!/usr/bin/env python3
"""Stage only public web assets. Backend code, secrets and databases are never published."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '_site'
PUBLIC_EXTENSIONS = {'.html', '.css', '.js', '.json', '.xml', '.txt', '.ico', '.png', '.jpg',
                     '.jpeg', '.webp', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.eot', '.map', '.pdf', '.webmanifest'}
PUBLIC_DIRS = {'assets', 'payments', 'ai', 'forms', 'seo'}

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
    assert (OUT / 'index.html').exists()
    assert (OUT / 'payments' / 'index.html').exists()
    assert not (OUT / 'payments' / 'backend').exists()
    print('Public website staged in _site; backend excluded.')

if __name__ == '__main__':
    build()
