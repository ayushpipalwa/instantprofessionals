"""Regression coverage for broken navigation and missing page resources."""
import unittest

from qa_seo import Page, reference_errors


class ReferenceTests(unittest.TestCase):
    def check(self, source, files=None):
        files = {"index.html": '<section id="team"></section>', **(files or {})}
        files["guide.html"] = source
        return reference_errors({"guide.html": Page(source)}, set(files), files.__getitem__)

    def test_previous_audit_defects_fail(self):
        errors = self.check('<a href="index.html#approach">How we work</a>'
                            '<script src="assets/js/service-page.js"></script>')
        self.assertEqual(errors, [
            "guide.html: missing internal link fragment: index.html#approach",
            "guide.html: missing internal asset target: assets/js/service-page.js",
        ])

    def test_same_page_cross_page_encoded_and_named_anchors(self):
        self.assertEqual(self.check(
            '<h2 id="cost & scope"></h2><a name="legacy"></a>'
            '<a href="#cost%20%26%20scope">Cost</a><a href="#legacy">Legacy</a>'
            '<a href="index.html?v=2#team">Team</a>'
            '<a href="https://www.instantprofessionals.in/#team">Team</a>'
            '<a href="/nested/#details">Details</a>',
            {"nested/index.html": '<h2 id="details">Details</h2>'}), [])

    def test_missing_same_page_and_case_sensitive_targets(self):
        errors = self.check('<a href="#missing">Missing</a>'
                            '<a href="Index.html#team">Wrong filename case</a>'
                            '<a href="index.html#Team">Wrong ID case</a>')
        self.assertEqual(len(errors), 3)
        self.assertIn("missing internal link target: Index.html#team", errors[1])

    def test_top_text_external_and_non_html_fragments(self):
        self.assertEqual(self.check(
            '<a href="#">Top</a><a href="#top">Top</a>'
            '<a href="#:~:text=example">Text</a>'
            '<a href="index.html#team:~:text=example">Team text</a>'
            '<a href="https://example.org/missing#anchor">External</a>'
            '<a href="mailto:info@example.org">Email</a><a href="tel:123">Phone</a>'
            '<a href="guide.pdf#page=2">PDF</a>', {"guide.pdf": ""}), [])

    def test_assets_ignore_queries_and_external_resources(self):
        source = ('<script src="assets/main.js?v=1"></script>'
                  '<link rel="stylesheet" href="assets/style.css?v=1">'
                  '<link rel="preload" href="assets/font.woff2" as="font">'
                  '<img src="assets/logo.svg"><video poster="assets/poster.jpg">'
                  '<source src="assets/video.mp4"></video>'
                  '<iframe src="embed.html"></iframe>'
                  '<script src="https://example.org/tag.js"></script>'
                  '<img src="data:image/png;base64,AA==">'
                  '<link rel="preconnect" href="https://example.org">')
        files = {name: "" for name in ["assets/main.js", "assets/style.css",
                 "assets/font.woff2", "assets/logo.svg", "assets/poster.jpg",
                 "assets/video.mp4", "embed.html"]}
        self.assertEqual(self.check(source, files), [])
        del files["assets/style.css"]
        self.assertEqual(self.check(source, files), [
            "guide.html: missing internal asset target: assets/style.css?v=1"])


if __name__ == "__main__":
    unittest.main()
