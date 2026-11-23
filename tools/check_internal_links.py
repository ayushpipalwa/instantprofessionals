#!/usr/bin/env python3
"""Check internal links and local asset references in the static site.

Usage:
  python3 tools/check_internal_links.py
Exit status is 1 when a target file is missing.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"node_modules", ".git", "assets/vendor"}
SITE = "https://www.instantprofessionals.in"
ATTR = re.compile(r"""(?:href|src|srcset)\s*=\s*["']([^"']+)["']""", re.I)


def pages() -> list[Path]:
    found = []
    for path in ROOT.rglob("*.html"):
        if any(part in {"node_modules", ".git"} for part in path.parts):
            continue
        if "assets/vendor" in path.as_posix():
            continue
        found.append(path)
    return found


def targets(raw: str) -> list[str]:
    raw = raw.strip()
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return []
    if raw.startswith("http://") or raw.startswith("https://"):
        if raw.startswith(SITE):
            path = urlparse(raw).path
            return [path or "/"]
        return []
    if raw.startswith("//"):
        return []
    # srcset can contain several candidates.
    parts = []
    for piece in raw.split(","):
        url = piece.strip().split()[0] if piece.strip() else ""
        if url and not url.startswith(("http://", "https://", "data:")):
            parts.append(url)
    return parts or [raw]


def resolve(page: Path, url: str) -> Path | None:
    url = unquote(url.split("#", 1)[0].split("?", 1)[0])
    if not url:
        return page
    if url.startswith("/"):
        return ROOT / url.lstrip("/")
    return (page.parent / url).resolve()


def main() -> int:
    missing: list[str] = []
    checked = 0
    for page in pages():
        text = page.read_text(encoding="utf-8", errors="replace")
        for match in ATTR.finditer(text):
            for url in targets(match.group(1)):
                target = resolve(page, url)
                if target is None:
                    continue
                checked += 1
                if target.is_dir():
                    if not (target / "index.html").exists():
                        missing.append(f"{page.relative_to(ROOT)} -> {url}")
                    continue
                if not target.exists():
                    missing.append(f"{page.relative_to(ROOT)} -> {url}")
    sitemap = ROOT / "sitemap.xml"
    if sitemap.exists():
        for loc in re.findall(r"<loc>(.*?)</loc>", sitemap.read_text(encoding="utf-8")):
            path = urlparse(loc).path
            target = ROOT / "index.html" if path in {"", "/"} else ROOT / path.lstrip("/")
            checked += 1
            if not target.exists():
                missing.append(f"sitemap.xml -> {loc}")
    print(f"Checked {checked} internal targets")
    if missing:
        print(f"{len(missing)} missing:")
        for item in missing:
            print(" ", item)
        return 1
    print("No broken internal links.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
