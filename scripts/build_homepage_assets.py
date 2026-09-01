#!/usr/bin/env python3
"""Build the small, homepage-only CSS, icon font and lifecycle logo assets."""

from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ICON_JSON = ROOT / "assets/vendor/bootstrap-icons/bootstrap-icons.json"
ICON_SOURCE = ROOT / "assets/vendor/bootstrap-icons/fonts/bootstrap-icons.woff"
ICON_TARGET = ROOT / "assets/vendor/bootstrap-icons/fonts/bootstrap-icons-home.woff"
CSS_TARGET = ROOT / "assets/css/homepage.min.css"
LIFECYCLE_SOURCE = ROOT / "assets/img/favicon/android-chrome-512x512.png"
LIFECYCLE_TARGET = ROOT / "assets/img/favicon/ip-lifecycle-192.webp"


def home_icon_names() -> list[str]:
    content = (ROOT / "index.html").read_text(encoding="utf-8")
    content += (ROOT / "assets/js/main.js").read_text(encoding="utf-8")
    return sorted(set(re.findall(r"bi-([a-z0-9-]+)", content)))


def build_icon_font(names: list[str], icon_map: dict[str, int]) -> None:
    missing = sorted(set(names) - set(icon_map))
    if missing:
        raise SystemExit(f"Missing Bootstrap Icons: {', '.join(missing)}")

    unicodes = ",".join(f"U+{icon_map[name]:X}" for name in names)
    subprocess.run(
        [
            "pyftsubset",
            str(ICON_SOURCE),
            f"--unicodes={unicodes}",
            "--flavor=woff",
            f"--output-file={ICON_TARGET}",
            "--no-hinting",
        ],
        check=True,
    )


def icon_css(names: list[str], icon_map: dict[str, int]) -> str:
    rules = [
        '@font-face{font-display:swap;font-family:"bootstrap-icons-home";src:url("../vendor/bootstrap-icons/fonts/bootstrap-icons-home.woff") format("woff")}',
        '.bi::before,[class^="bi-"]::before,[class*=" bi-"]::before{display:inline-block;font-family:"bootstrap-icons-home"!important;font-style:normal;font-weight:400!important;font-variant:normal;text-transform:none;line-height:1;vertical-align:-.125em;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}',
    ]
    rules.extend(f'.bi-{name}::before{{content:"\\{icon_map[name]:x}"}}' for name in names)
    return "\n".join(rules)


def strip_comments(css: str) -> str:
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def minify_css(css: str) -> str:
    css = re.sub(r'@charset\s+["\'][^"\']+["\'];', "", css, flags=re.I)
    css = strip_comments(css)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{}:;,])\s*", r"\1", css)
    css = css.replace(";}", "}")
    return css.strip()


def build_css(names: list[str], icon_map: dict[str, int]) -> None:
    sources = [
        ROOT / "assets/vendor/bootstrap/css/bootstrap.min.css",
        ROOT / "assets/css/style.css",
        ROOT / "assets/css/service-pages-auto.css",
        ROOT / "assets/css/motion-polish.css",
        ROOT / "assets/css/service-hub.css",
        ROOT / "assets/css/vision-2.css",
        ROOT / "assets/css/home-fixes.css",
        ROOT / "assets/css/lifecycle-dashboard.css",
    ]
    parts = [icon_css(names, icon_map)]
    for path in sources:
        text = path.read_text(encoding="utf-8")
        if path.name in {"service-hub.css", "vision-2.css"}:
            text = re.sub(r'@import\s+url\([^;]+\);\s*', "", text)
        parts.append(text)

    parts.append(
        """
:root{--ip-font:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
html,body,button,input,select,textarea,h1,h2,h3,h4,h5,h6{font-family:var(--ip-font)!important}
#about,#services,#team,#social-presence,#contact,#footer{content-visibility:auto;contain-intrinsic-size:auto 900px}
@media(max-width:767px){#team{contain-intrinsic-size:auto 8200px}#contact{contain-intrinsic-size:auto 1700px}}
"""
    )
    CSS_TARGET.write_text(minify_css("\n".join(parts)) + "\n", encoding="utf-8")


def build_lifecycle_logo() -> None:
    with Image.open(LIFECYCLE_SOURCE) as source:
        image = source.convert("RGBA")
        image.thumbnail((192, 192), Image.Resampling.LANCZOS)
        image.save(LIFECYCLE_TARGET, "WEBP", quality=90, method=6)


def main() -> None:
    icon_map = json.loads(ICON_JSON.read_text(encoding="utf-8"))
    names = home_icon_names()
    build_icon_font(names, icon_map)
    build_css(names, icon_map)
    build_lifecycle_logo()
    print(f"Built {CSS_TARGET.relative_to(ROOT)} ({CSS_TARGET.stat().st_size:,} bytes)")
    print(f"Built {ICON_TARGET.relative_to(ROOT)} ({ICON_TARGET.stat().st_size:,} bytes; {len(names)} glyphs)")
    print(f"Built {LIFECYCLE_TARGET.relative_to(ROOT)} ({LIFECYCLE_TARGET.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
