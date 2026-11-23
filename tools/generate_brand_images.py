#!/usr/bin/env python3
"""Regenerate logo sizes, the site share image, and incorporation banners.

Source files (kept):
  assets/img/instant-professionals-ip-logo-20261122.png
  assets/img/social-share-2026.png

Outputs:
  assets/img/logo-64.png / .webp
  assets/img/logo-192.png / .webp
  assets/img/og-image-1200x630.jpg / .webp
  assets/img/banners/<slug>-1600x500.jpg / .webp
  assets/img/banners/<slug>-1200x630.jpg / .webp

Run from the repository root:
  python3 tools/generate_brand_images.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "assets" / "img"
LOGO_SRC = IMG / "instant-professionals-ip-logo-20261122.png"
SHARE_SRC = IMG / "social-share-2026.png"
BANNER_DIR = IMG / "banners"

NAVY = (7, 29, 61, 255)
NAVY_DEEP = (6, 26, 55, 255)
GREEN = (23, 107, 53, 255)
GREEN_LINE = (0, 166, 81, 255)
ORANGE = (242, 125, 38, 255)
WHITE = (255, 255, 255, 255)
MUTED = (214, 226, 236, 255)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

CTA = "Get started — +91 82097 85294"

BANNERS = [
    {
        "slug": "private-limited-company",
        "kicker": "COMPANIES ACT, 2013",
        "headline": "Private Limited Company Registration",
        "subline": "SPICe+ and AGILE-PRO-S incorporation support",
    },
    {
        "slug": "llp",
        "kicker": "LLP ACT, 2008",
        "headline": "LLP Registration",
        "subline": "FiLLiP incorporation and LLP agreement support",
    },
    {
        "slug": "opc",
        "kicker": "COMPANIES ACT, 2013",
        "headline": "One Person Company Registration",
        "subline": "SPICe+ OPC incorporation, including NRI promoters",
    },
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def save_logo(width: int) -> None:
    with Image.open(LOGO_SRC) as source:
        image = source.convert("RGBA")
        height = round(width * image.height / image.width)
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
    resized.save(IMG / f"logo-{width}.png", "PNG", optimize=True)
    resized.save(IMG / f"logo-{width}.webp", "WEBP", quality=90, method=6, lossless=False)


def save_under(image: Image.Image, path: Path, kind: str, limit: int | None = None) -> None:
    if kind == "webp":
        image.save(path, "WEBP", quality=82, method=6)
        return
    quality = 85
    while quality >= 50:
        image.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
        if limit is None or path.stat().st_size <= limit:
            return
        quality -= 5
    raise SystemExit(f"{path.name} is still above {limit} bytes")


def save_share_image() -> None:
    with Image.open(SHARE_SRC) as source:
        image = source.convert("RGB")
        target = (1200, 630)
        scale = max(target[0] / image.width, target[1] / image.height)
        resized = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
        left = (resized.width - target[0]) // 2
        top = (resized.height - target[1]) // 2
        cropped = resized.crop((left, top, left + target[0], top + target[1]))
    save_under(cropped, IMG / "og-image-1200x630.jpg", "jpeg", limit=200_000)
    cropped.save(IMG / "og-image-1200x630.webp", "WEBP", quality=80, method=6)


def text_width(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont) -> int:
    return int(draw.textlength(text, font=face))


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, start: int, bold: bool) -> ImageFont.FreeTypeFont:
    size = start
    path = FONT_BOLD if bold else FONT
    while size > 18:
        face = font(path, size)
        if text_width(draw, text, face) <= max_width:
            return face
        size -= 2
    return font(path, 18)


def draw_banner(spec: dict, size: tuple[int, int]) -> Image.Image:
    width, height = size
    canvas = Image.new("RGBA", size, NAVY)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 14, height), fill=GREEN)
    draw.rectangle((0, height - 8, width, height), fill=ORANGE)

    with Image.open(LOGO_SRC) as logo_src:
        logo = logo_src.convert("RGBA")
    logo_h = int(height * 0.62)
    logo_w = round(logo_h * logo.width / logo.height)
    logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
    logo_x = 48
    logo_y = (height - logo_h) // 2 - 6
    canvas.alpha_composite(logo, (logo_x, logo_y))

    text_x = logo_x + logo_w + 42
    max_text = width - text_x - 48
    kicker_font = font(FONT_BOLD, 18 if width >= 1500 else 16)
    headline_font = fit_font(draw, spec["headline"], max_text, 54 if width >= 1500 else 46, True)
    sub_font = fit_font(draw, spec["subline"], max_text, 26 if width >= 1500 else 24, False)
    cta_font = font(FONT_BOLD, 22 if width >= 1500 else 20)

    kicker_h = 22
    headline_h = headline_font.size + 8
    sub_h = sub_font.size + 8
    cta_h = 52
    block = kicker_h + headline_h + sub_h + 18 + cta_h
    y = max(36, (height - block) // 2)

    draw.text((text_x, y), spec["kicker"], font=kicker_font, fill=GREEN_LINE)
    y += kicker_h + 6
    draw.text((text_x, y), spec["headline"], font=headline_font, fill=WHITE)
    y += headline_h
    draw.text((text_x, y), spec["subline"], font=sub_font, fill=MUTED)
    y += sub_h + 16

    cta_w = text_width(draw, CTA, cta_font) + 36
    radius = 8
    draw.rounded_rectangle((text_x, y, text_x + cta_w, y + cta_h), radius=radius, fill=GREEN)
    draw.text((text_x + 18, y + 12), CTA, font=cta_font, fill=WHITE)
    return canvas.convert("RGB")


def save_banners() -> None:
    BANNER_DIR.mkdir(parents=True, exist_ok=True)
    for spec in BANNERS:
        for size, suffix in (((1600, 500), "1600x500"), ((1200, 630), "1200x630")):
            image = draw_banner(spec, size)
            stem = BANNER_DIR / f"{spec['slug']}-{suffix}"
            save_under(image, stem.with_suffix(".jpg"), "jpeg", limit=220_000)
            image.save(stem.with_suffix(".webp"), "WEBP", quality=82, method=6)


def main() -> None:
    save_logo(64)
    save_logo(192)
    save_share_image()
    save_banners()
    for path in sorted(IMG.glob("logo-*.*")) + sorted(IMG.glob("og-image-1200x630.*")) + sorted(BANNER_DIR.glob("*")):
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
