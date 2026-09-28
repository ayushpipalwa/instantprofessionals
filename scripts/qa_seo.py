#!/usr/bin/env python3
"""Validate public SEO signals; --git-index checks exact staged paths on Windows."""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://instantprofessionals.in/"
FOCUS = {"gst-registration.html", "gst-returns.html", "income-tax-return-filing.html",
         "company-annual-filing.html", "mca-name-reservation-search-approval.html",
         "trademark-registration.html", "fssai-registration.html", "roc-search-report.html"}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.titles, self.descriptions, self.canonicals = [], [], []
        self.links, self.directory_links, self.schemas = [], [], []
        self.robots, self.h1, self.refresh = [], 0, False
        self.capture = None
        self.buffer = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title" or (tag == "script" and a.get("type") == "application/ld+json"):
            self.capture, self.buffer = tag, []
        if tag == "h1":
            self.h1 += 1
        if tag == "meta":
            name = a.get("name", "").lower()
            if name == "description":
                self.descriptions.append(a.get("content", "").strip())
            if name == "robots":
                self.robots.extend(a.get("content", "").lower().replace(",", " ").split())
            if a.get("http-equiv", "").lower() == "refresh":
                self.refresh = True
        if tag == "link" and "canonical" in a.get("rel", "").split():
            self.canonicals.append(a.get("href", ""))
        if tag == "a" and a.get("href"):
            self.links.append(a["href"])
            if "data-service-link" in a:
                self.directory_links.append(a["href"])

    def handle_data(self, data):
        if self.capture:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag == self.capture:
            value = "".join(self.buffer).strip()
            (self.titles if tag == "title" else self.schemas).append(value)
            self.capture = None


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--git-index", action="store_true")
    args = parser.parse_args()
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    paths = {p for p in tracked if p}

    def read(path):
        if args.git_index:
            return subprocess.check_output(["git", "show", ":" + path], cwd=ROOT).decode("utf-8-sig")
        return (ROOT / path).read_text(encoding="utf-8-sig")

    errors, warnings = [], []
    pages = {p: Page(read(p)) for p in sorted(paths) if p.endswith(".html") and "/" not in p}
    indexable = {p: page for p, page in pages.items() if "noindex" not in page.robots and not page.refresh}
    expected = {urljoin(SITE, "" if p == "index.html" else p): p for p in indexable}
    for name, page in indexable.items():
        canonical = urljoin(SITE, "" if name == "index.html" else name)
        if page.canonicals != [canonical]:
            errors.append(f"{name}: expected one self canonical ({canonical})")
        if len(page.titles) != 1 or not page.titles[0]:
            errors.append(f"{name}: expected one nonempty title")
        if len(page.descriptions) != 1 or not page.descriptions[0]:
            errors.append(f"{name}: expected one nonempty description")
        if page.h1 != 1:
            errors.append(f"{name}: expected one H1, got {page.h1}")
        schema_nodes = []
        for schema in page.schemas:
            try:
                schema_nodes.extend(nodes(json.loads(schema)))
            except ValueError as exc:
                errors.append(f"{name}: malformed JSON-LD: {exc}")
        if name in FOCUS:
            services = [n for n in schema_nodes if n.get("@type") == "Service"]
            if len(services) != 1:
                errors.append(f"{name}: expected one Service schema")
            for service in services:
                provider = service.get("provider", {})
                if not provider.get("name"):
                    warnings.append(f"{name}: provider has no inline name (cross-page @id reference)")
        if sum(n.get("@type") == "FAQPage" for n in schema_nodes) > 1:
            errors.append(f"{name}: duplicate FAQPage schema")
        if name == "services.html":
            structured = {n.get("url") for n in schema_nodes if n.get("@type") == "ListItem" and n.get("url")}
            visible = {urljoin(SITE, link) for link in page.directory_links}
            if structured != visible:
                errors.append(f"services.html: ItemList/directory mismatch: {sorted(structured ^ visible)}")
    for attr in ("titles", "descriptions"):
        values = Counter(v for page in indexable.values() for v in getattr(page, attr))
        for value, count in values.items():
            if count > 1:
                errors.append(f"Duplicate {attr}: {value}")

    locations = set()
    for name in ("sitemap.xml", "seo-sitemap.xml"):
        try:
            tree = ET.fromstring(read(name))
            order = {"loc": 0, "lastmod": 1, "changefreq": 2, "priority": 3}
            for entry in tree:
                ranks = [order.get(child.tag.rsplit("}", 1)[-1], 99) for child in entry]
                if ranks != sorted(ranks):
                    errors.append(f"{name}: sitemap children must follow loc/lastmod/changefreq/priority order")
            urls = [e.text for e in tree.iter() if e.tag.endswith("}loc")]
            if len(urls) != len(set(urls)):
                errors.append(f"{name}: duplicate URLs")
            for url in urls:
                if url not in expected:
                    errors.append(f"{name}: URL is not a canonical indexable root page: {url}")
            locations.update(urls)
        except (ET.ParseError, OSError) as exc:
            errors.append(f"{name}: {exc}")
    for url in sorted(set(expected) - locations):
        errors.append(f"Missing from sitemaps: {url}")
    robots = read("robots.txt")
    for sitemap in ("sitemap.xml", "seo-sitemap.xml"):
        if f"Sitemap: {SITE}{sitemap}" not in robots:
            errors.append(f"robots.txt: missing {sitemap} declaration")
    inbound = Counter()
    for name, page in indexable.items():
        for href in page.links:
            url = urlsplit(urljoin(SITE + name, href))
            if url.netloc != urlsplit(SITE).netloc:
                continue
            target = unquote(url.path).lstrip("/") or "index.html"
            if target.endswith("/"):
                target += "index.html"
            if target not in paths:
                errors.append(f"{name}: missing internal link target: {href}")
            if target != name and target in indexable:
                inbound[target] += 1
    for name in indexable:
        if not inbound[name] and name != "index.html":
            errors.append(f"Orphan indexable page (no incoming root-page HTML links): {name}")
    for message in warnings:
        print("WARN:", message)
    for message in errors:
        print("FAIL:", message)
    print(f"{'FAIL' if errors else 'PASS'}: {len(indexable)} indexable pages; {len(locations)} sitemap URLs; {len(errors)} errors")
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
