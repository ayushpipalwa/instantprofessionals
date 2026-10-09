#!/usr/bin/env python3
"""Check the reviewed fee schedule against visible cards and enquiry controls."""
import argparse
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import statistics
import subprocess

ROOT = Path(__file__).resolve().parents[1]

class Prices(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.cards, self.buttons, self.options = [], [], []
        self.in_head = self.in_strong = False
        self.buffer = ''
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'div' and 'ip-price-head' in a.get('class', '').split():
            self.in_head = True
        if tag == 'strong' and self.in_head:
            self.in_strong, self.buffer = True, ''
        if tag == 'button' and 'data-package' in a:
            self.buttons.append(a['data-package'])
        if tag == 'option' and '₹' in a.get('value', ''):
            self.options.append(a['value'])

    def handle_data(self, data):
        if self.in_strong:
            self.buffer += data

    def handle_endtag(self, tag):
        if tag == 'strong' and self.in_strong:
            self.cards.append(self.buffer)
            self.in_strong = False
        if tag == 'div':
            self.in_head = False

def amount(text):
    match = re.search(r'₹([\d,]+)', text)
    return int(match[1].replace(',', '')) if match else None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--git-index', action='store_true')
    args = parser.parse_args()
    def read(path):
        if args.git_index:
            return subprocess.check_output(['git', 'show', ':' + path], cwd=ROOT).decode('utf-8')
        return (ROOT / path).read_text(encoding='utf-8')
    report = json.loads(read('docs/pricing-review-2026-10-04.json'))
    pages = {}
    for row in report['packages']:
        pages.setdefault(row['file'], []).append(row)
        if 'sources' in row:
            median = statistics.median(s['regular_fee_inr'] for s in row['sources'])
            assert row['new_price'] >= median * 1.25, row
        assert row['new_price'] >= row['old_price'], row
    for path, rows in pages.items():
        page = Prices(read(path))
        expected = [r['new_price'] for r in rows]
        assert list(map(amount, page.cards)) == expected, (path, 'visible cards')
        assert list(map(amount, page.buttons)) == expected, (path, 'package buttons')
        if page.options:  # Dedicated service forms capture the clicked package separately.
            assert Counter(page.options) == Counter(page.buttons), (path, 'enquiry options')
    print(f'PASS: {len(pages)} service pages; {sum(map(len, pages.values()))} prices and enquiry selections agree; documented premium floors met')

if __name__ == '__main__':
    main()
