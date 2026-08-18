#!/usr/bin/env python3
"""Static quality gate for the Instant Professionals website."""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlsplit

from lxml import etree, html

from site_repair import BASE_PRICES, CATALOG, PRICE_FACTOR, SITE


ROOT = Path(__file__).resolve().parents[1]
PARSER = etree.HTMLParser(recover=True)
ERRORS: list[str] = []


def fail(filename: str, message: str) -> None:
    ERRORS.append(f"{filename}: {message}")


def document(path: Path) -> html.HtmlElement:
    return html.fromstring(path.read_bytes(), parser=PARSER, base_url=path.as_uri())


def local_target(reference: str) -> Path | None:
    value = reference.strip()
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:", "data:", "//")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None
    pathname = unquote(parsed.path)
    if not pathname:
        return None
    return ROOT / pathname.lstrip("/")


def accessible_name(element: html.HtmlElement) -> str:
    explicit = element.get("aria-label") or element.get("title") or ""
    text = " ".join(" ".join(element.itertext()).split())
    image_text = " ".join(element.xpath(".//img/@alt"))
    return " ".join((explicit, text, image_text)).strip()


def check_document(path: Path, *, indexable: bool) -> None:
    name = path.name
    root = document(path)
    ids = [value for value in root.xpath("//*[@id]/@id") if value]
    duplicates = [value for value, count in Counter(ids).items() if count > 1]
    if duplicates:
        fail(name, f"duplicate IDs: {', '.join(sorted(duplicates))}")

    if indexable:
        titles = [" ".join(value.split()) for value in root.xpath("//title/text()") if value.strip()]
        descriptions = root.xpath('//meta[translate(@name,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="description"]/@content')
        canonicals = root.xpath('//link[contains(concat(" ", normalize-space(@rel), " "), " canonical ")]/@href')
        if len(titles) != 1 or len(titles[0]) < 20:
            fail(name, "missing or weak unique title")
        if len(descriptions) != 1 or len(descriptions[0].strip()) < 50:
            fail(name, "missing or weak meta description")
        if len(canonicals) != 1 or not canonicals[0].startswith(SITE):
            fail(name, "missing or invalid canonical")
        if len(root.xpath("//h1")) != 1:
            fail(name, f"expected one H1, found {len(root.xpath('//h1'))}")

    for element in root.xpath("//img"):
        source = (element.get("src") or "").strip()
        if not source:
            fail(name, "image without src")
        if element.get("alt") is None:
            fail(name, f"image without alt: {source}")
        if source.startswith(("http://", "https://", "//")):
            fail(name, f"external image hotlink: {source}")

    for element in root.xpath("//a"):
        href = (element.get("href") or "").strip()
        if not href or href == "#":
            fail(name, "empty or dead anchor")
        if not accessible_name(element):
            fail(name, f"link without accessible name: {href}")
        if element.get("target") == "_blank" and "noopener" not in (element.get("rel") or "").split():
            fail(name, f"target=_blank link lacks noopener: {href}")
        if href.startswith("#") and href[1:] not in ids:
            fail(name, f"fragment target does not exist: {href}")

    for element in root.xpath("//button"):
        if not accessible_name(element):
            fail(name, "button without accessible name")

    for form in root.xpath("//form"):
        if not form.xpath('.//button[@type="submit"] | .//input[@type="submit"]'):
            fail(name, "form has no submit control")
        for field in form.xpath('.//input[not(@type="hidden")] | .//select | .//textarea'):
            field_id = field.get("id")
            labelled = bool(field.get("aria-label") or field.get("aria-labelledby") or field.xpath("ancestor::label"))
            if field_id and root.xpath(f'//label[@for="{field_id}"]'):
                labelled = True
            if not labelled:
                fail(name, f"unlabelled form field: {field.tag}[name={field.get('name')}]")

    for attribute in ("href", "src"):
        for reference in root.xpath(f"//*[@{attribute}]/@{attribute}"):
            target = local_target(reference)
            if target is not None and not target.exists():
                fail(name, f"missing local {attribute} target: {reference}")


def check_prices() -> None:
    package_names = ("Essential", "Enhanced", "Complete")
    for old, (clean, _title, _category, _summary) in CATALOG.items():
        root = document(ROOT / clean)
        actual = [int(value.replace(",", "")) for value in root.xpath('//article[contains(@class,"ip-price-card")]//strong/text()') for value in re.findall(r"[\d,]+", value)]
        expected = [round(value * PRICE_FACTOR) for value in BASE_PRICES.get(old, [])]
        if actual != expected:
            fail(clean, f"price mismatch: expected {expected}, found {actual}")
        buttons = root.xpath('//button[contains(@class,"ip-package-button")]/@data-package')
        options = root.xpath('//select[@name="package"]/option[position()>1]/@value')
        expected_options = [f"{package_names[index]} — ₹{value:,}" for index, value in enumerate(expected)]
        if buttons != expected_options or options != expected_options:
            fail(clean, "package button, select option and displayed price are not reconciled")


def check_redirects() -> None:
    for old, (clean, _title, _category, _summary) in CATALOG.items():
        if old == clean:
            continue
        root = document(ROOT / old)
        refresh = " ".join(root.xpath('//meta[translate(@http-equiv,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="refresh"]/@content'))
        canonical = " ".join(root.xpath('//link[contains(concat(" ", normalize-space(@rel), " "), " canonical ")]/@href'))
        if clean not in refresh or canonical != f"{SITE}/{clean}":
            fail(old, f"redirect does not consistently point to {clean}")


def check_sitemap() -> None:
    sitemap_text = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    sitemap = etree.fromstring(sitemap_text.encode())
    locations = {element.text for element in sitemap.xpath("//*[local-name()='loc']")}
    expected = {f"{SITE}/", *(f"{SITE}/{data[0]}" for data in CATALOG.values()), f"{SITE}/privacy-policy.html", f"{SITE}/terms.html", f"{SITE}/refund-policy.html"}
    if locations != expected:
        missing = expected - locations
        extra = locations - expected
        fail("sitemap.xml", f"route mismatch; missing={sorted(missing)}, extra={sorted(extra)}")
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if f"Sitemap: {SITE}/sitemap.xml" not in robots or "Allow: /" not in robots:
        fail("robots.txt", "missing allow rule or sitemap declaration")


def check_stale_content() -> None:
    forbidden = {
        r"\bEbizFiling\b": "EbizFiling content",
        r"mk0ebizfiling": "EbizFiling image hotlink",
        r"\bLIGITATION\b": "misspelling LIGITATION",
        r"\bpolicie\b": "misspelling policie",
        r"\bcompliaces\b": "misspelling compliaces",
        r"\bcase one\b": "placeholder case one",
        r"09643203209|9643203209": "obsolete phone",
        r"info@instantprofessionals\.com": "obsolete .com email",
    }
    for path in ROOT.glob("*.html"):
        text = path.read_text(encoding="utf-8", errors="replace")
        for pattern, label in forbidden.items():
            if re.search(pattern, text, flags=re.I):
                fail(path.name, f"contains {label}")


def check_assets_and_responsiveness() -> None:
    main_js = (ROOT / "assets/js/main.js").read_text(encoding="utf-8")
    enquiry_js = (ROOT / "assets/js/enquiry.js").read_text(encoding="utf-8")
    service_css = (ROOT / "assets/css/service-page-v3.css").read_text(encoding="utf-8")
    home_css = (ROOT / "assets/css/home-fixes.css").read_text(encoding="utf-8")
    for photo in re.findall(r'photo:"([^"]+)"', main_js):
        target = local_target(photo)
        if target is not None and not target.exists():
            fail("assets/js/main.js", f"missing team image: {photo}")
    if "SERVICE_RATE_MULTIPLIER=1;" not in main_js:
        fail("assets/js/main.js", "legacy price multiplier is not neutralised")
    if "buildWhatsAppUrl" not in enquiry_js or "wa.me/" not in enquiry_js:
        fail("assets/js/enquiry.js", "WhatsApp conversion flow is incomplete")
    for breakpoint in ("max-width: 900px", "max-width: 620px"):
        if breakpoint not in service_css:
            fail("assets/css/service-page-v3.css", f"missing responsive breakpoint {breakpoint}")
    if "prefers-reduced-motion" not in service_css or "max-width: 575px" not in home_css:
        fail("CSS", "missing reduced-motion or mobile-home rules")
    required_contrast_colours = ("#071d3d", "#176b35", "#8a5b12", "#12652f", "#ffbf47")
    combined = service_css + home_css
    for colour in required_contrast_colours:
        if colour not in combined:
            fail("CSS", f"required high-contrast colour missing: {colour}")

    def luminance(hex_colour: str) -> float:
        channels = [int(hex_colour[index:index + 2], 16) / 255 for index in (1, 3, 5)]
        linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4 for channel in channels]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    def contrast(foreground: str, background: str) -> float:
        lighter, darker = sorted((luminance(foreground), luminance(background)), reverse=True)
        return (lighter + 0.05) / (darker + 0.05)

    contrast_pairs = (
        ("#176b35", "#ffffff"),
        ("#8a5b12", "#ffffff"),
        ("#ffffff", "#12652f"),
        ("#dce7f5", "#071d3d"),
        ("#46576b", "#ffffff"),
        ("#a6e5b2", "#071d3d"),
    )
    for foreground, background in contrast_pairs:
        ratio = contrast(foreground, background)
        if ratio < 4.5:
            fail("CSS", f"contrast {foreground} on {background} is only {ratio:.2f}:1")


def main() -> int:
    clean_files = sorted({data[0] for data in CATALOG.values()})
    indexable = ["index.html", *clean_files, "privacy-policy.html", "terms.html", "refund-policy.html"]
    noindex = ["404.html", *(old for old, data in CATALOG.items() if old != data[0]), "form.html", "inner-page.html", "pdflist.html", "portfolio-details.html"]
    for filename in indexable:
        check_document(ROOT / filename, indexable=True)
    for filename in noindex:
        check_document(ROOT / filename, indexable=False)
    check_prices()
    check_redirects()
    check_sitemap()
    check_stale_content()
    check_assets_and_responsiveness()
    if ERRORS:
        print(f"FAILED: {len(ERRORS)} quality issue(s)")
        for error in ERRORS:
            print(f"- {error}")
        return 1
    print(f"PASS: {len(indexable)} indexable pages, {len(noindex)} redirects/error pages, {len(CATALOG)} price schedules")
    print("PASS: local links/assets, forms, labels, metadata, canonical routes, images, sitemap, robots and responsive rules")
    return 0


if __name__ == "__main__":
    sys.exit(main())
