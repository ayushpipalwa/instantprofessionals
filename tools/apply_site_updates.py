#!/usr/bin/env python3
"""Apply the sitewide footer, metadata, logo and incorporation-page updates.

Safe to re-run: logo and social-image replacements match the old filenames,
and an existing canonical footer is replaced rather than duplicated.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {"assets", "node_modules", "payments", "scripts", ".git"}
PHONE = "+91 82097 85294"
WA = "https://wa.me/918209785294"
EMAIL = "info@instantprofessionals.in"
IG = "https://www.instagram.com/instantprofessional/"
COPYRIGHT = "© 2026 Instant Professionals Private Limited."

SVG = {
    "linkedin": '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.8v2.1h.05c.53-1 1.84-2.1 3.79-2.1 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.7c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.95 2-2.95 4.06V24h-4V8.5z"/></svg>',
    "facebook": '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.38 1.42-3.69 3.58-3.69 1.04 0 2.12.19 2.12.19v2.34h-1.19c-1.18 0-1.54.73-1.54 1.48v1.78h2.63l-.42 2.91h-2.21V22c4.78-.75 8.44-4.91 8.44-9.93z"/></svg>',
    "instagram": '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 7.2A4.8 4.8 0 1 0 16.8 12 4.81 4.81 0 0 0 12 7.2zm0 7.92A3.12 3.12 0 1 1 15.12 12 3.12 3.12 0 0 1 12 15.12zM17.76 6.96a1.12 1.12 0 1 1-1.12-1.12 1.12 1.12 0 0 1 1.12 1.12zM21.6 7.44a6.35 6.35 0 0 0-1.73-4.5 6.35 6.35 0 0 0-4.5-1.73c-1.77-.1-7.08-.1-8.85 0a6.35 6.35 0 0 0-4.5 1.73 6.35 6.35 0 0 0-1.73 4.5c-.1 1.77-.1 7.08 0 8.85a6.35 6.35 0 0 0 1.73 4.5 6.35 6.35 0 0 0 4.5 1.73c1.77.1 7.08.1 8.85 0a6.35 6.35 0 0 0 4.5-1.73 6.35 6.35 0 0 0 1.73-4.5c.1-1.77.1-7.07 0-8.85zm-1.9 10.76a3.62 3.62 0 0 1-2.04 2.04c-1.41.56-4.76.43-6.32.43s-4.92.13-6.32-.43a3.62 3.62 0 0 1-2.04-2.04c-.56-1.41-.43-4.76-.43-6.32s-.13-4.92.43-6.32a3.62 3.62 0 0 1 2.04-2.04c1.41-.56 4.76-.43 6.32-.43s4.92-.13 6.32.43a3.62 3.62 0 0 1 2.04 2.04c.56 1.41.43 4.76.43 6.32s.12 4.91-.43 6.32z"/></svg>',
    "whatsapp": '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.5 3.5A11 11 0 0 0 2.1 16.7L1 23l6.5-1.1A11 11 0 0 0 20.5 3.5zM12 20.3a9.2 9.2 0 0 1-4.7-1.3l-.3-.2-3.9.7.7-3.8-.2-.3A9.2 9.2 0 1 1 12 20.3zm5.3-6.9c-.3-.1-1.7-.8-1.9-.9s-.4-.1-.6.2-.7.9-.9 1.1-.3.2-.6.1a7.5 7.5 0 0 1-2.2-1.4 8.3 8.3 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.5-.8-2s-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.6 4.1 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>',
}


def footer_html(prefix: str = "") -> str:
    p = prefix
    return f"""<footer class="ip-footer">
  <div class="ip-container">
    <div class="ip-footer-grid">
      <div>
        <h2>Instant Professionals</h2>
        <p>A multidisciplinary compliance, tax, corporate and intellectual-property advisory team serving businesses and professionals across India.</p>
        <p class="ip-footer-social">
          <a href="https://www.linkedin.com/company/instantprofessionals" target="_blank" rel="noopener" aria-label="Instant Professionals on LinkedIn">{SVG["linkedin"]}</a>
          <a href="https://www.facebook.com/instantprofessionals" target="_blank" rel="noopener" aria-label="Instant Professionals on Facebook">{SVG["facebook"]}</a>
          <!-- TODO: Verify the Instagram handle. This footer uses instagram.com/instantprofessional; LinkedIn and Facebook use instantprofessionals. -->
          <a href="{IG}" target="_blank" rel="noopener" aria-label="Instant Professionals on Instagram">{SVG["instagram"]}</a>
        </p>
      </div>
      <div>
        <h3>Popular services</h3>
        <ul>
          <li><a href="{p}gst-registration.html">GST Registration</a></li>
          <li><a href="{p}income-tax-return-filing.html">Income Tax Returns</a></li>
          <li><a href="{p}private-limited-company-registration.html">Company Incorporation</a></li>
          <li><a href="{p}trademark-registration.html">Trademark Registration</a></li>
        </ul>
      </div>
      <div>
        <h3>Policies</h3>
        <ul>
          <li><a href="{p}privacy-policy.html">Privacy Policy</a></li>
          <li><a href="{p}terms.html">Terms of Service</a></li>
          <li><a href="{p}refund-policy.html">Refund and Cancellation</a></li>
          <li><a href="{p}sitemap.xml">Sitemap</a></li>
        </ul>
      </div>
      <div>
        <h3>Contact</h3>
        <p><a href="tel:+918209785294">{PHONE}</a></p>
        <p><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <p><a href="{WA}" target="_blank" rel="noopener">WhatsApp</a></p>
        <!-- TODO: Replace [REGISTERED OFFICE ADDRESS] with the registered office. -->
        <p>Registered Office: [REGISTERED OFFICE ADDRESS]</p>
        <!-- TODO: Replace [CIN] with the company CIN. -->
        <p>CIN: [CIN]</p>
        <!-- TODO: Replace [GSTIN] with the firm GSTIN. -->
        <p>GSTIN: [GSTIN]</p>
      </div>
    </div>
    <div class="ip-footer-bottom">{COPYRIGHT}</div>
  </div>
</footer>"""


def iter_html() -> list[Path]:
    pages = []
    for path in ROOT.rglob("*.html"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        pages.append(path)
    return pages


def prefix_for(path: Path) -> str:
    rel = path.relative_to(ROOT)
    if len(rel.parts) == 1:
        return ""
    return "../" * (len(rel.parts) - 1)


def logo_picture(prefix: str, src_prefix: str, large: bool, alt: str, extras: str) -> str:
    stem = "logo-192" if large else "logo-64"
    width, height = (192, 175) if large else (64, 58)
    base = f"{src_prefix}assets/img/{stem}"
    return (
        f'<picture><source srcset="{base}.webp" type="image/webp">'
        f'<img src="{base}.png" alt="{alt}" width="{width}" height="{height}"{extras}></picture>'
    )


def replace_logos(text: str) -> str:
    pattern = re.compile(
        r"<img\b[^>]*\bsrc=[\"']([^\"']*instant-professionals-ip-logo-20261122\.png)[\"'][^>]*>",
        re.I,
    )

    def repl(match: re.Match[str]) -> str:
        tag = match.group(0)
        src = match.group(1)
        src_prefix = src.split("assets/")[0]
        width_match = re.search(r"\bwidth=[\"'](\d+)", tag)
        width = int(width_match.group(1)) if width_match else 64
        alt_match = re.search(r"\balt=[\"']([^\"']*)[\"']", tag)
        alt = alt_match.group(1) if alt_match else "Instant Professionals logo"
        extras = []
        for attr in ("loading", "decoding", "fetchpriority"):
            found = re.search(rf"\b{attr}=[\"']([^\"']*)[\"']", tag)
            if found:
                extras.append(f'{attr}="{found.group(1)}"')
        if not any(item.startswith("decoding=") for item in extras):
            extras.append('decoding="async"')
        extra = " " + " ".join(extras)
        return logo_picture("", src_prefix, width >= 150, alt, extra)

    return pattern.sub(repl, text)


def replace_share_image(text: str) -> str:
    text = text.replace(
        "https://www.instantprofessionals.in/assets/img/social-share-2026.png",
        "https://www.instantprofessionals.in/assets/img/og-image-1200x630.jpg",
    )
    text = text.replace('property="og:image:width" content="1734"', 'property="og:image:width" content="1200"')
    text = text.replace('property="og:image:height" content="907"', 'property="og:image:height" content="630"')
    text = text.replace('property="og:image:type" content="image/png"', 'property="og:image:type" content="image/jpeg"')
    return text


TITLES = {
    "Auditor Appointment: Documents & Fees | Instant Professionals": "Auditor Appointment Fees & Documents | Instant Professionals",
    "Company Name Change | Name Approval & MCA Filing | Instant Professionals": "Company Name Change and MCA Filing | Instant Professionals",
    "Company Strike Off | Process, Documents & MCA Filing | Instant Professionals": "Company Strike Off and MCA Filing | Instant Professionals",
    "Compliance Handover Checklist and Editable Template | Instant Professionals": "Compliance Handover Checklist | Instant Professionals",
    "Copyright Registration: Fees & Documents | Instant Professionals": "Copyright Fees & Documents | Instant Professionals",
    "Digital Signature Certificate: Fees & Preparation | Instant Professionals": "Digital Signature Certificate Fees | Instant Professionals",
    "DIN Application Documents and Process | Instant Professionals": "DIN Application Documents | Instant Professionals",
    "DIN Application | Documents, Process & MCA Filing Support | Instant Professionals": "DIN Application Documents & Process | Instant Professionals",
    "DIN Surrender | Process, Documents & MCA Filing Support | Instant Professionals": "DIN Surrender Process & Documents | Instant Professionals",
    "Dissolution of Firm | Deed & Closure Support | Instant Professionals": "Dissolution of Firm: Deed & Closure | Instant Professionals",
    "ESI Return Filing: Fees & Payroll Records | Instant Professionals": "ESI Return Filing Fees & Records | Instant Professionals",
    "FSSAI Registration: Process & Documents | Instant Professionals": "FSSAI Registration and Documents | Instant Professionals",
    "Instant GST Registration Cancellation | Instant Professionals": "GST Registration Cancellation | Instant Professionals",
    "Instant GST Letter of Undertaking (LUT) | Instant Professionals": "GST Letter of Undertaking (LUT) | Instant Professionals",
    "LLP Name Change Procedure: Steps and Documents | Instant Professionals": "LLP Name Change Steps & Documents | Instant Professionals",
    "LLP Name Change | Procedure, Documents & MCA Filing | Instant Professionals": "LLP Name Change and MCA Filing | Instant Professionals",
    "MOA & AOA Printing | Updated Company Documents | Instant Professionals": "MOA and AOA Printing | Instant Professionals",
    "NRI Property Sale Lower TDS Certificate & Calculator | Instant Professionals": "Lower TDS for an NRI Property Sale | Instant Professionals",
    "Online CA Services in India: Fees & Process | Instant Professionals": "Online CA Services: Fees & Process | Instant Professionals",
    "PAN Application & PAN Correction | Document Support | Instant Professionals": "PAN Application and Correction | Instant Professionals",
    "ROC Search Report: Fees, Format and Records | Instant Professionals": "ROC Search Report Fees and Format | Instant Professionals",
    "Business Compliance, Tax & IPR Services | Instant Professionals": "Business Compliance, Tax and IPR | Instant Professionals",
    "Share Transfer & Transmission | Company Documentation | Instant Professionals": "Share Transfer and Transmission | Instant Professionals",
    "TAN Application | TDS Account Number Support | Instant Professionals": "TAN Application and TDS Support | Instant Professionals",
    "TDS Return Correction: Fees & Records | Instant Professionals": "TDS Return Correction Fees | Instant Professionals",
    "Trademark Registration: Fees & Process | Instant Professionals": "Trademark Registration Fees | Instant Professionals",
    "Trademark Watch Service Cost and Process in India | Instant Professionals": "Trademark Watch Service Cost | Instant Professionals",
    "Udyam MSME Registration: Eligibility & Fees | Instant Professionals": "Udyam MSME Registration Fees | Instant Professionals",
}

DESCS = {
    "Compare monthly accounting and bookkeeping fees by entry volume. Prepare records for reconciliation, reporting or backlog review, with scope agreed in writing.": "Compare monthly bookkeeping fees by entry volume. Prepare records for reconciliation or a backlog review, with scope agreed in writing.",
    "AI-assisted business setup, compliance intake and workflow automation for Indian startups, MSMEs and professionals, with professional review for legal, tax and statutory matters.": "AI-assisted compliance intake and workflow automation for Indian startups and MSMEs, with professional review of legal and tax matters.",
    "Compare CMA report fees, working-capital limits and bank-query support. Prepare financial records and lender requirements for CMA data or a scoped project report.": "Compare CMA report fees, working-capital limits and bank-query support. Prepare records for CMA data or a scoped project report.",
    "Prepare subscriber-payment and company records for INC-20A commencement filing. Compare support from ₹2,200 and confirm applicability, dates and filing scope.": "Prepare subscriber-payment and company records for INC-20A filing. Compare support from ₹2,200 and confirm dates and scope.",
    "Review company annual filing support for AOC-4 and MGT-7, document preparation and professional fees. Clarify pending years and event-based work before booking.": "Review company annual filing for AOC-4 and MGT-7, documents and fees. Clarify pending years and event-based work before booking.",
    "Compare DSC assistance from ₹1,700 for individual, organisation and DGFT/tender use. Prepare applicant details and confirm certificate type, validity and costs.": "Compare DSC assistance from ₹1,700 for individual, organisation and DGFT use. Confirm certificate type, validity and costs.",
    "Compare EPF registration fees and package limits. Prepare establishment, ownership and employee records, and clarify registration versus monthly ECR support.": "Compare EPF registration fees and limits. Prepare establishment and employee records, and separate registration from monthly ECR support.",
    "Compare ESIC registration fees and employee limits. Prepare establishment and employee records, review coverage, and choose registration or ongoing filing support.": "Compare ESIC registration fees and employee limits. Prepare establishment and employee records, and choose registration or filing support.",
    "Get GST registration support in India. Review eligibility, documents, professional fees and application steps, with guidance for existing GST registrations.": "Get GST registration support in India. Review eligibility, documents, fees and application steps, including existing GST registrations.",
    "Compare GST return filing fees for one NIL return or annual GSTR-1 and GSTR-3B support. Prepare period-wise records and check package limits before enquiring.": "Compare GST return fees for one NIL return or annual GSTR-1 and GSTR-3B support. Prepare records and check package limits before enquiring.",
    "Compare online ITR filing fees and scope for salary, investments, business and foreign income. Prepare your documents and request a professional filing review.": "Compare online ITR fees for salary, business, investments and foreign income. Prepare your documents and request a filing review.",
    "Compare LLP annual filing fees for Form 11 and Form 8. Prepare partner, contribution and financial records, and clarify pending years before requesting support.": "Compare LLP annual filing fees for Form 11 and Form 8. Prepare partner, contribution and financial records before requesting support.",
    "Estimate cash blocked by TDS on an NRI property sale and prepare for a lower or nil withholding certificate under section 395(1), Form 128, for Tax Year 2026–27.": "Estimate TDS on an NRI property sale and prepare a lower or nil certificate under section 395(1), Form 128, for Tax Year 2026–27.",
    "Compare OPC annual-filing packages and prepare company records, financial statements and prior filings. Review annual-return scope, bookkeeping limits and fees.": "Compare OPC annual-filing packages and prepare company records, financial statements and prior filings. Review scope and fees.",
    "Prepare invention and ownership records, understand patent filing stages, and compare India application-support packages from ₹30,100 before requesting a quote.": "Prepare invention and ownership records, review patent filing stages, and compare India application packages from ₹30,100.",
    "Explore Instant Professionals services for GST, income tax, MCA filings, trademark and IPR, labour law, business registrations, accounting, finance and compliance across India.": "Explore GST, income tax, MCA, trademark and IPR, labour law, registrations, accounting and compliance services across India.",
    "Review the ₹5,200 income-tax notice response package, records to prepare and scope exclusions. One standard response, with further proceedings separately scoped.": "Review the ₹5,200 income-tax notice response package, the records to prepare and what is excluded. Further proceedings are scoped separately.",
    "Explore trademark registration support in India: applicant documents, search, class selection and professional fees. Compare filing, objection and watch services.": "Explore trademark registration in India: documents, search, class selection and fees. Compare filing, objection and watch services.",
    "Compare virtual CFO monthly packages for MIS, cash-flow and management reviews. Prepare finance records and agree reporting, meeting cadence and scope in writing.": "Compare virtual CFO packages for MIS, cash-flow and management reviews. Agree reporting, meeting cadence and scope in writing.",
}


def shorten_title(text: str) -> str:
    if len(text) <= 60:
        return text
    if text in TITLES:
        updated = TITLES[text]
    elif text.startswith("Redirecting to ") and " | Instant Professionals" in text:
        updated = text.replace(" | Instant Professionals", "")
    else:
        raise SystemExit(f"No shortened title for ({len(text)}): {text}")
    if len(updated) > 60:
        raise SystemExit(f"Title still long ({len(updated)}): {updated}")
    return updated


def replace_titles_and_descriptions(text: str) -> str:
    def title_repl(match: re.Match[str]) -> str:
        raw = match.group(1)
        updated = shorten_title(html.unescape(re.sub(r"\s+", " ", raw)).strip())
        return "<title>" + html.escape(updated) + "</title>"

    text = re.sub(r"<title>(.*?)</title>", title_repl, text, count=1, flags=re.I | re.S)

    def meta_repl(match: re.Match[str]) -> str:
        raw = html.unescape(match.group(1))
        if len(raw) <= 155 or raw not in DESCS:
            if len(raw) > 155:
                raise SystemExit(f"No shortened description ({len(raw)}): {raw}")
            return match.group(0)
        updated = DESCS[raw]
        if len(updated) > 155:
            raise SystemExit(f"Description still long ({len(updated)}): {updated}")
        return match.group(0).replace(match.group(1), html.escape(updated, quote=True))

    text = re.sub(
        r'<meta\b[^>]*\bname=["\']description["\'][^>]*\bcontent=["\'](.*?)["\'][^>]*>',
        meta_repl,
        text,
        count=1,
        flags=re.I | re.S,
    )
    for old, new in DESCS.items():
        if len(new) > 155:
            raise SystemExit(new)
        text = text.replace(html.escape(old, quote=True), html.escape(new, quote=True))
        text = text.replace(old, new)
    for old, new in TITLES.items():
        text = text.replace(html.escape(old), html.escape(new))
        text = text.replace(old, new)
    return text


def ensure_footer(text: str, path: Path) -> str:
    prefix = prefix_for(path)
    footer = footer_html(prefix)
    if re.search(r"<footer\b", text, re.I):
        text = re.sub(r"<footer\b[^>]*>.*?</footer>", footer, text, count=1, flags=re.I | re.S)
    else:
        if "service-page-v3.css" not in text and "homepage.min.css" not in text and "original-site.css" not in text and path.name != "ai-business-automation.html":
            href = f"{prefix}assets/css/service-page-v3.css"
            text = text.replace("</head>", f'<link rel="stylesheet" href="{href}">\n</head>', 1)
        text = text.replace("</body>", footer + "\n</body>", 1)
    if path.name == "ai-business-automation.html" and ".ip-footer{" not in text:
        text = text.replace(
            "</style>",
            ".ip-footer{padding:54px 0 22px;color:rgba(255,255,255,.82);background:#061a37}.ip-footer .ip-container{width:min(1180px,calc(100% - 32px));margin:auto}.ip-footer-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:28px}.ip-footer h2,.ip-footer h3{color:#fff;margin:0 0 10px}.ip-footer p,.ip-footer li,.ip-footer a{color:rgba(255,255,255,.88);font-size:14px}.ip-footer ul{list-style:none;margin:0;padding:0}.ip-footer li{margin:0 0 8px}.ip-footer-social{display:flex;gap:8px}.ip-footer-social a{display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.35);border-radius:8px}.ip-footer-bottom{margin-top:28px;padding-top:14px;border-top:1px solid rgba(255,255,255,.16);font-size:13px}@media(max-width:800px){.ip-footer-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.ip-footer-grid{grid-template-columns:1fr}}\n</style>",
            1,
        )
    return text


SCHEMA_PAGES = {
    "ai-business-automation.html": (
        "https://www.instantprofessionals.in/ai-business-automation.html",
        "AI-Assisted Compliance Automation | Instant Professionals",
    ),
    "compliance-handover-checklist.html": (
        "https://www.instantprofessionals.in/compliance-handover-checklist.html",
        "Compliance Handover Checklist | Instant Professionals",
    ),
    "privacy-policy.html": (
        "https://www.instantprofessionals.in/privacy-policy.html",
        "Privacy Policy | Instant Professionals",
    ),
    "terms.html": (
        "https://www.instantprofessionals.in/terms.html",
        "Terms of Service | Instant Professionals",
    ),
    "refund-policy.html": (
        "https://www.instantprofessionals.in/refund-policy.html",
        "Refund and Cancellation Policy | Instant Professionals",
    ),
}


def schema_block(url: str, name: str) -> str:
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": "https://www.instantprofessionals.in/#organization",
                "name": "Instant Professionals",
                "legalName": "Instant Professionals Private Limited",
                "url": "https://www.instantprofessionals.in/",
                "telephone": "+918209785294",
                "email": EMAIL,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "[REGISTERED OFFICE ADDRESS]",
                    "addressCountry": "IN",
                },
            },
            {
                "@type": "WebPage",
                "@id": url + "#webpage",
                "url": url,
                "name": name,
                "isPartOf": {"@id": "https://www.instantprofessionals.in/#website"},
                "about": {"@id": "https://www.instantprofessionals.in/#organization"},
                "dateModified": "2026-11-23",
                "inLanguage": "en-IN",
            },
        ],
    }
    return (
        "<!-- TODO: Replace [REGISTERED OFFICE ADDRESS] in Organization schema with the registered office. -->\n"
        '<script type="application/ld+json">'
        + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        + "</script>\n"
    )


def ensure_schema(text: str, path: Path) -> str:
    spec = SCHEMA_PAGES.get(path.name)
    if not spec or '"@type":"WebPage"' in text or '"@type": "WebPage"' in text:
        return text
    return text.replace("</head>", schema_block(*spec) + "</head>", 1)


def patch_terms(text: str) -> str:
    old = "disputes relating to these website terms will be subject to the courts of competent jurisdiction at the registered office of Instant Professionals Private Limited."
    new = (
        "disputes relating to these website terms will be subject to the courts of competent jurisdiction at the registered office of Instant Professionals Private Limited. "
        "<!-- TODO: Replace [REGISTERED OFFICE ADDRESS] with the registered office. -->"
        "The registered office is [REGISTERED OFFICE ADDRESS]. "
        "<!-- TODO: Replace [CIN] with the company CIN. -->"
        "CIN: [CIN]."
    )
    if old in text and "[REGISTERED OFFICE ADDRESS]" not in text.split("registered office is")[-1][:80]:
        text = text.replace(old, new, 1)
    return text


def add_registration_links(text: str) -> str:
    insertion = (
        '<a href="private-limited-company-registration.html">Company Incorporation</a>'
        '<a href="llp-registration.html">LLP Incorporation</a>'
        '<a href="opc-registration.html">OPC Incorporation</a>'
    )
    pattern = re.compile(r"(<summary>Registrations</summary>\s*<div class=\"ip-nav-menu\">\s*)")
    if "private-limited-company-registration.html" in text:
        return text
    return pattern.sub(lambda m: m.group(1) + insertion, text, count=1)


def patch_services(text: str) -> str:
    needle = '<a href="din-application.html" data-service-link data-keywords="director identification"><span>DIN application</span><i class="bi bi-arrow-right"></i></a>'
    addition = """
            <a href="private-limited-company-registration.html" data-service-link data-keywords="private limited spice spice+ incorporation company"><span>Private limited company registration</span><i class="bi bi-arrow-right"></i></a>
            <a href="llp-registration.html" data-service-link data-keywords="llp fillip incorporation limited liability partnership"><span>LLP registration</span><i class="bi bi-arrow-right"></i></a>
            <a href="opc-registration.html" data-service-link data-keywords="opc one person company spice incorporation"><span>OPC registration</span><i class="bi bi-arrow-right"></i></a>"""
    if needle in text and "private-limited-company-registration.html" not in text:
        text = text.replace(needle, needle + addition, 1)
    old_item = '{"@type":"ListItem","position":63,"url":"https://www.instantprofessionals.in/roc-search-report.html","name":"ROC search report"}]}]}'
    new_item = (
        '{"@type":"ListItem","position":63,"url":"https://www.instantprofessionals.in/roc-search-report.html","name":"ROC search report"},'
        '{"@type":"ListItem","position":64,"url":"https://www.instantprofessionals.in/private-limited-company-registration.html","name":"Private limited company registration"},'
        '{"@type":"ListItem","position":65,"url":"https://www.instantprofessionals.in/llp-registration.html","name":"LLP registration"},'
        '{"@type":"ListItem","position":66,"url":"https://www.instantprofessionals.in/opc-registration.html","name":"OPC registration"}]}]}'
    )
    if old_item in text:
        text = text.replace(old_item, new_item, 1)
        text = text.replace('"numberOfItems":63', '"numberOfItems":66', 1)
    text = text.replace('href="index.html#team"', 'href="index.html#about"')
    return text


SERVICE_CARDS = """
      <section id="services" class="services ip-service-hub" data-ip-service-hub="1">
        <div class="container">
          <div class="ip-service-head" data-aos="fade-up">
            <div><span class="ip-service-kicker">SERVICES</span><h2>Compliance support<br><em>for the work you actually have.</em></h2></div>
            <p>Six core services, each linked to its current page. Scope, government charges and the professional fee are confirmed after a facts review.</p>
          </div>
          <div class="ip-service-grid">
            <article class="ip-service-card" data-aos="fade-up">
              <div class="ip-service-top"><span>01</span><i class="bi bi-receipt"></i></div>
              <h3><a href="gst-registration.html">GST</a></h3>
              <p>GST registration, amendments and returns under the current GST law, with a document check and portal filing support across India.</p>
              <div class="ip-service-links"><a href="gst-registration.html">GST registration <i class="bi bi-arrow-up-right"></i></a><a href="gst-returns.html">GST returns <i class="bi bi-arrow-up-right"></i></a><a href="gst-registration-amendment.html">GST amendment <i class="bi bi-arrow-up-right"></i></a></div>
              <a class="ip-service-primary" href="gst-registration.html"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
            </article>
            <article class="ip-service-card" data-aos="fade-up" data-aos-delay="40">
              <div class="ip-service-top"><span>02</span><i class="bi bi-calculator"></i></div>
              <h3><a href="income-tax-return-filing.html">Income Tax / ITR</a></h3>
              <p>Income-tax return preparation and filing for salary, business and professional income, including the records the e-filing portal needs.</p>
              <div class="ip-service-links"><a href="income-tax-return-filing.html">ITR filing <i class="bi bi-arrow-up-right"></i></a><a href="tds-returns.html">TDS returns <i class="bi bi-arrow-up-right"></i></a><a href="tax-notice-response.html">Tax notice response <i class="bi bi-arrow-up-right"></i></a></div>
              <a class="ip-service-primary" href="income-tax-return-filing.html"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
            </article>
            <article class="ip-service-card" data-aos="fade-up" data-aos-delay="80">
              <div class="ip-service-top"><span>03</span><i class="bi bi-diagram-3"></i></div>
              <h3><a href="company-annual-filing.html">MCA / ROC Compliance</a></h3>
              <p>Annual ROC filings and event-based MCA forms for companies and LLPs under the Companies Act, 2013 and the LLP Act, 2008.</p>
              <div class="ip-service-links"><a href="company-annual-filing.html">Company annual filing <i class="bi bi-arrow-up-right"></i></a><a href="llp-annual-filing.html">LLP annual filing <i class="bi bi-arrow-up-right"></i></a><a href="dir-3-kyc.html">DIR-3 KYC <i class="bi bi-arrow-up-right"></i></a></div>
              <a class="ip-service-primary" href="company-annual-filing.html"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
            </article>
            <article class="ip-service-card" data-aos="fade-up" data-aos-delay="120">
              <div class="ip-service-top"><span>04</span><i class="bi bi-building"></i></div>
              <h3><a href="private-limited-company-registration.html">Company Incorporation</a></h3>
              <p>Private limited, LLP and One Person Company incorporation through SPICe+ or FiLLiP, including name reservation and DSC or DIN where required.</p>
              <div class="ip-service-links"><a href="private-limited-company-registration.html">Private limited (SPICe+) <i class="bi bi-arrow-up-right"></i></a><a href="llp-registration.html">LLP (FiLLiP) <i class="bi bi-arrow-up-right"></i></a><a href="opc-registration.html">OPC (SPICe+) <i class="bi bi-arrow-up-right"></i></a></div>
              <a class="ip-service-primary" href="private-limited-company-registration.html"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
            </article>
            <article class="ip-service-card" data-aos="fade-up" data-aos-delay="160">
              <div class="ip-service-top"><span>05</span><i class="bi bi-shield-check"></i></div>
              <h3><a href="trademark-registration.html">Trademark</a></h3>
              <p>Trademark search and filing before the Trade Marks Registry, with support for examination replies, opposition, renewal and watch.</p>
              <div class="ip-service-links"><a href="trademark-registration.html">Trademark registration <i class="bi bi-arrow-up-right"></i></a><a href="trademark-objection-reply.html">Objection reply <i class="bi bi-arrow-up-right"></i></a><a href="trademark-watch-service.html">Trademark watch <i class="bi bi-arrow-up-right"></i></a></div>
              <a class="ip-service-primary" href="trademark-registration.html"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
            </article>
            <article class="ip-service-card" data-aos="fade-up" data-aos-delay="200">
              <div class="ip-service-top"><span>06</span><i class="bi bi-check2-square"></i></div>
              <h3><a href="fssai-registration.html">FSSAI</a></h3>
              <p>FSSAI basic registration or a State or Central food licence through FoSCoS, matched to the food activity, premises and turnover.</p>
              <div class="ip-service-links"><a href="fssai-registration.html">FSSAI registration <i class="bi bi-arrow-up-right"></i></a><a href="gst-registration.html">GST registration <i class="bi bi-arrow-up-right"></i></a><a href="udyam-registration.html">Udyam registration <i class="bi bi-arrow-up-right"></i></a></div>
              <a class="ip-service-primary" href="fssai-registration.html"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
            </article>
          </div>
        </div>
      </section>
"""

TRUST = """
      <section id="trust" class="about">
        <div class="container">
          <div class="section-title" data-aos="zoom-out">
            <h2>Trust</h2>
            <p>Client feedback</p>
          </div>
          <div class="row content" data-aos="fade-up">
            <div class="col-lg-8">
              <p class="ip-placeholder-flag">Placeholder — not a published client review</p>
              <!-- TODO: Replace [PLACEHOLDER TESTIMONIAL] and [CLIENT NAME] with a verified review. Do not invent a testimonial. -->
              <blockquote>
                <p>[PLACEHOLDER TESTIMONIAL]</p>
                <footer>[CLIENT NAME], [BUSINESS]</footer>
              </blockquote>
            </div>
            <div class="col-lg-4" id="google-reviews">
              <!-- TODO: Replace [GOOGLE REVIEWS URL] with the Google Business reviews link. -->
              <p><a href="#google-reviews">[GOOGLE REVIEWS URL]</a></p>
              <p>This block is a marked placeholder until a verified Google review is added.</p>
            </div>
          </div>
        </div>
      </section>
"""

FINANCE_MENU = """
            <li class="dropdown dropdown-menu-right">
              <a href="accounting-bookkeeping.html">
                <span>Finance &amp; Advisory</span>
                <i class="bi bi-chevron-down"></i>
              </a>
              <ul class="dropdown-large-screen">
                <div class="row mx-md-0">
                  <div class="col-md-12">
                    <div class="row">
                      <div class="col-12 ps-4 mt-3">
                        <h5 class="border-bottom pb-2">Finance &amp; Advisory</h5>
                      </div>
                    </div>
                    <li><a href="accounting-bookkeeping.html">Accounting and Bookkeeping</a></li>
                    <li><a href="virtual-cfo.html">Virtual CFO</a></li>
                    <li><a href="cma-project-report.html">CMA Report</a></li>
                    <li><a href="tax-notice-response.html">Income-tax Notice Response</a></li>
                  </div>
                </div>
              </ul>
            </li>
"""

REG_LINKS = """
                    <li>
                      <a href="private-limited-company-registration.html">Company Incorporation (SPICe+)</a>
                    </li>
                    <li><a href="llp-registration.html">LLP Incorporation (FiLLiP)</a></li>
                    <li><a href="opc-registration.html">OPC Incorporation</a></li>
                    <li><a href="mca-name-reservation-search-approval.html">Name Reservation</a></li>
                    <li><a href="fssai-registration.html">FSSAI Registration</a></li>
"""


def patch_index(text: str) -> str:
    if 'id="services" class="services ip-service-hub"' not in text:
        text = re.sub(
            r'<section id="services" class="services">.*?</section>\s*<section id="team" class="team">\s*</section>',
            SERVICE_CARDS.strip() + "\n" + TRUST,
            text,
            count=1,
            flags=re.S,
        )
    text = text.replace(">Change in Din<", ">Change in DIN<")
    text = text.replace(">LOGO Designing<", ">Logo Designing<")
    text = text.replace(">Dissolution Of Firms<", ">Dissolution of Firms<")
    text = text.replace(">Change Service<", ">Change Services<")
    text = text.replace(">Legal drafting enquiry<", ">Legal drafting enquiry (contact form)<")
    text = text.replace(">Custom drafting enquiry<", ">Custom drafting enquiry (contact form)<")
    text = re.sub(
        r'<div class="row">\s*<div class="col-12 ps-4 mt-3">\s*<h5 class="border-bottom pb-2">\s*<br\s*/?>\s*</h5>\s*</div>\s*</div>',
        "",
        text,
        count=1,
    )
    if "Company Incorporation (SPICe+)" not in text:
        text, count = re.subn(
            r'(<a href="udyam-registration.html"\s*>)(.*?)(</a\s*>\s*</li>)',
            lambda match: match.group(1) + "Udyam / MSME Registration" + match.group(3) + REG_LINKS,
            text,
            count=1,
            flags=re.S,
        )
        if count != 1:
            raise SystemExit("Could not insert incorporation links in the registration menu")
    if "Accounting and Bookkeeping" not in text:
        marker = """            <li class="dropdown dropdown-menu-right">
              <a href="trademark-registration.html">
                <span>Trademark & other IPRs</span>"""
        if marker not in text:
            raise SystemExit("Trademark menu marker missing")
        text = text.replace(marker, FINANCE_MENU + marker, 1)
    if '"dateModified":"2026-11-23"' not in text:
        text = text.replace('"dateModified":"2026-09-01"', '"dateModified":"2026-11-23"', 1)
    if '"streetAddress":"[REGISTERED OFFICE ADDRESS]"' not in text:
        text = text.replace(
            '"email":"info@instantprofessionals.in","areaServed"',
            '"email":"info@instantprofessionals.in","address":{"@type":"PostalAddress","streetAddress":"[REGISTERED OFFICE ADDRESS]","addressCountry":"IN"},"areaServed"',
            1,
        )
    todo = "<!-- TODO: Replace [REGISTERED OFFICE ADDRESS] in the Organization schema. TODO: Verify the Instagram handle — sameAs and the footer use https://www.instagram.com/instantprofessional/ while LinkedIn and Facebook use instantprofessionals. -->\n      "
    if "Verify the Instagram handle" not in text:
        text = text.replace('<script type="application/ld+json" data-ip-home-schema>', todo + '<script type="application/ld+json" data-ip-home-schema>', 1)
    if 'id="footer" class="ip-footer"' not in text:
        home_footer = footer_html().replace('<footer class="ip-footer">', '<footer id="footer" class="ip-footer">', 1)
        text, count = re.subn(r'<footer id="footer" class="ip-home-footer">.*?</footer>', home_footer, text, count=1, flags=re.S)
        if count != 1:
            raise SystemExit("Could not replace the homepage footer")
    text = text.replace(
        "https://www.instantprofessionals.in/assets/img/instant-professionals-ip-logo-20261122.png",
        "https://www.instantprofessionals.in/assets/img/logo-192.png",
    )
    if 'id="services" class="services ip-service-hub"' not in text:
        raise SystemExit("services section was not replaced")
    if 'id="team"' in text:
        raise SystemExit("team section remains")
    if "Udyam / MSME Registration" not in text or "Change in DIN" not in text:
        raise SystemExit("menu labels were not updated")
    if "<br />" in text and "border-bottom pb-2" in text and text.count("<h5 class=\"border-bottom pb-2\">\n                            <br />") :
        raise SystemExit("empty trademark heading remains")
    return text


def patch_main_js(text: str) -> str:
    text = text.replace(
        'const BRAND_LOGO="assets/img/instant-professionals-ip-logo-20261122.png";',
        'const BRAND_LOGO="assets/img/logo-64.png";',
    )
    text = text.replace(
        'const LIFECYCLE_LOGO=BRAND_LOGO;',
        'const LIFECYCLE_LOGO="assets/img/logo-192.png";',
    )
    text = text.replace(
        """    logo.width=68;
    logo.height=68;""",
        """    logo.width=64;
    logo.height=58;""",
    )
    text = text.replace('href="#team">Meet our professionals', 'href="#about">Meet our professionals')
    text = text.replace('width="64" height="64" decoding="async" alt="Instant Professionals"', 'width="64" height="58" decoding="async" alt="Instant Professionals"')
    old = '''    {no:"01",icon:"bi-building",title:"Business & Tax Registrations",desc:"Set up the registrations your business needs to start, trade and remain compliant.",primary:"gst-registration.html",links:[["GST Registration","gst-registration.html"],["MSME Registration","udyam-registration.html"],["IEC Registration","iec-registration.html"]]},
    {no:"02",icon:"bi-receipt",title:"GST & Indirect Tax",desc:"Recurring GST compliance, returns and special filings supported by practical indirect-tax guidance.",primary:"gst-returns.html",links:[["GST Returns","gst-returns.html"],["GST LUT","gst-lut.html"],["GST Cancellation","gst-cancellation.html"]]},
    {no:"03",icon:"bi-calculator",title:"Income Tax & TDS",desc:"Return filing and tax compliance for individuals, professionals and businesses throughout the year.",primary:"income-tax-return-filing.html",links:[["Income Tax Returns","income-tax-return-filing.html"],["TDS Returns","tds-returns.html"],["TDS Revision","tds-return-revision.html"]]},
    {no:"04",icon:"bi-diagram-3",title:"Corporate & Secretarial",desc:"Structured statutory support for companies and LLPs—from recurring filings to governance changes.",primary:"company-annual-filing.html",links:[["Company Annual Filing","company-annual-filing.html"],["LLP Annual Filing","llp-annual-filing.html"],["Add a Director","add-a-director.html"]]},
    {no:"05",icon:"bi-shield-check",title:"Trademark & Intellectual Property",desc:"Protect the identity and intellectual assets behind your business with coordinated IPR support.",primary:"trademark-registration.html",links:[["Trademark Registration","trademark-registration.html"],["Copyright Application","copyright-application.html"],["Trademark Objections","trademark-objection-reply.html"]]},
    {no:"06",icon:"bi-people",title:"Workforce Compliance",desc:"Registration and recurring labour-law filings to keep employee compliance organised and current.",primary:"epf-registration.html",links:[["EPF Registration","epf-registration.html"],["PF Returns","pf-returns.html"],["ESI Returns","esi-returns.html"]]}'''
    new = '''    {no:"01",icon:"bi-receipt",title:"GST",desc:"GST registration, amendments and returns under the current GST law, with a document check and portal filing support across India.",primary:"gst-registration.html",links:[["GST registration","gst-registration.html"],["GST returns","gst-returns.html"],["GST amendment","gst-registration-amendment.html"]]},
    {no:"02",icon:"bi-calculator",title:"Income Tax / ITR",desc:"Income-tax return preparation and filing for salary, business and professional income, including the records the e-filing portal needs.",primary:"income-tax-return-filing.html",links:[["ITR filing","income-tax-return-filing.html"],["TDS returns","tds-returns.html"],["Tax notice response","tax-notice-response.html"]]},
    {no:"03",icon:"bi-diagram-3",title:"MCA / ROC Compliance",desc:"Annual ROC filings and event-based MCA forms for companies and LLPs under the Companies Act, 2013 and the LLP Act, 2008.",primary:"company-annual-filing.html",links:[["Company annual filing","company-annual-filing.html"],["LLP annual filing","llp-annual-filing.html"],["DIR-3 KYC","dir-3-kyc.html"]]},
    {no:"04",icon:"bi-building",title:"Company Incorporation",desc:"Private limited, LLP and One Person Company incorporation through SPICe+ or FiLLiP, including name reservation and DSC or DIN where required.",primary:"private-limited-company-registration.html",links:[["Private limited (SPICe+)","private-limited-company-registration.html"],["LLP (FiLLiP)","llp-registration.html"],["OPC (SPICe+)","opc-registration.html"]]},
    {no:"05",icon:"bi-shield-check",title:"Trademark",desc:"Trademark search and filing before the Trade Marks Registry, with support for examination replies, opposition, renewal and watch.",primary:"trademark-registration.html",links:[["Trademark registration","trademark-registration.html"],["Objection reply","trademark-objection-reply.html"],["Trademark watch","trademark-watch-service.html"]]},
    {no:"06",icon:"bi-check2-square",title:"FSSAI",desc:"FSSAI basic registration or a State or Central food licence through FoSCoS, matched to the food activity, premises and turnover.",primary:"fssai-registration.html",links:[["FSSAI registration","fssai-registration.html"],["GST registration","gst-registration.html"],["Udyam registration","udyam-registration.html"]]}'''
    if old not in text:
        if "Company Incorporation" not in text:
            raise SystemExit("main.js service array not found")
    else:
        text = text.replace(old, new, 1)
    return text


def patch_sitemap(text: str) -> str:
    if "private-limited-company-registration.html" not in text:
        addition = """
  <url>
    <loc>https://www.instantprofessionals.in/private-limited-company-registration.html</loc>
    <lastmod>2026-11-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.instantprofessionals.in/llp-registration.html</loc>
    <lastmod>2026-11-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.instantprofessionals.in/opc-registration.html</loc>
    <lastmod>2026-11-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
"""
        text = text.replace("</urlset>", addition + "</urlset>", 1)

    def add_lastmod(match: re.Match[str]) -> str:
        block = match.group(0)
        if "<lastmod>" in block:
            return block
        return block.replace("</loc>", "</loc>\n    <lastmod>2026-11-23</lastmod>", 1)

    text = re.sub(r"<url>.*?</url>", add_lastmod, text, flags=re.S)
    text = text.replace(
        "<loc>https://www.instantprofessionals.in/</loc>\n    <lastmod>2026-11-15</lastmod>",
        "<loc>https://www.instantprofessionals.in/</loc>\n    <lastmod>2026-11-23</lastmod>",
    )
    text = text.replace(
        "<loc>https://www.instantprofessionals.in/services.html</loc>\n    <lastmod>2026-09-28</lastmod>",
        "<loc>https://www.instantprofessionals.in/services.html</loc>\n    <lastmod>2026-11-23</lastmod>",
    )
    return text


def write_incorporation_pages() -> None:
    pages = incorporation_pages()
    for page in pages:
        path = ROOT / page["file"]
        path.write_text(render_page(page), encoding="utf-8")
        print("wrote", page["file"])


def render_page(page: dict) -> str:
    faqs = page["faqs"]
    faq_html = "".join(
        f"<details><summary>{html.escape(q)}</summary><p>{a}</p></details>" for q, a in faqs
    )
    faq_entities = [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
        for q, a in faqs
    ]
    graph = [
        {
            "@type": "Service",
            "@id": f"https://www.instantprofessionals.in/{page['file']}#service",
            "name": page["service"],
            "serviceType": page["service"],
            "url": f"https://www.instantprofessionals.in/{page['file']}",
            "description": page["description"],
            "provider": {"@type": "Organization", "@id": "https://www.instantprofessionals.in/#organization", "name": "Instant Professionals", "url": "https://www.instantprofessionals.in/"},
            "areaServed": {"@type": "Country", "name": "India"},
        },
        {
            "@type": "FAQPage",
            "@id": f"https://www.instantprofessionals.in/{page['file']}#faq",
            "url": f"https://www.instantprofessionals.in/{page['file']}",
            "mainEntity": faq_entities,
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.instantprofessionals.in/"},
                {"@type": "ListItem", "position": 2, "name": "Services", "item": "https://www.instantprofessionals.in/services.html"},
                {"@type": "ListItem", "position": 3, "name": page["crumb"], "item": f"https://www.instantprofessionals.in/{page['file']}"},
            ],
        },
    ]
    schema = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    steps = "".join(f"<li><strong>{html.escape(title)}</strong> {body}</li>" for title, body in page["steps"])
    docs = "".join(f"<li>{item}</li>" for item in page["documents"])
    suits = "".join(f"<article class=\"ip-info-card\"><h3>{html.escape(title)}</h3><p>{body}</p></article>" for title, body in page["suits"])
    timeline = "".join(f"<li>{item}</li>" for item in page["timeline"])
    included = "".join(f"<li>{item}</li>" for item in page["included"])
    banner = page["banner"]
    title = page["title"]
    desc = page["description"]
    if len(title) > 60 or len(desc) > 155:
        raise SystemExit(f"SEO length {page['file']}: title {len(title)} desc {len(desc)}")
    return f"""<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(desc, quote=True)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="https://www.instantprofessionals.in/{page['file']}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Instant Professionals">
  <meta property="og:locale" content="en_IN">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(desc, quote=True)}">
  <meta property="og:url" content="https://www.instantprofessionals.in/{page['file']}">
  <meta property="og:image" content="https://www.instantprofessionals.in/assets/img/banners/{banner}-1200x630.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="{html.escape(page['banner_alt'], quote=True)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(title)}">
  <meta name="twitter:description" content="{html.escape(desc, quote=True)}">
  <meta name="twitter:image" content="https://www.instantprofessionals.in/assets/img/banners/{banner}-1200x630.jpg">
  <meta name="twitter:image:alt" content="{html.escape(page['banner_alt'], quote=True)}">
  <meta name="theme-color" content="#071d3d">
  <link rel="icon" href="assets/img/favicon/favicon.ico">
  <link rel="apple-touch-icon" href="assets/img/favicon/apple-touch-icon.png">
  <link rel="stylesheet" href="assets/css/service-icons.css?v=20260930-1">
  <link rel="stylesheet" href="assets/css/service-page-v3.css?v=20261123-incorporation">
  <script type="application/ld+json">{schema}</script>
</head>
<body>
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="ip-header">
  <div class="ip-container ip-header-inner">
    <a class="ip-brand" href="index.html" aria-label="Instant Professionals home">
      <picture>
        <source srcset="assets/img/logo-64.webp" type="image/webp">
        <img src="assets/img/logo-64.png" width="64" height="58" alt="Instant Professionals logo" decoding="async">
      </picture>
      <span>Instant Professionals<small>COMPLIANCE • TAX • ADVISORY</small></span>
    </a>
    <button class="ip-nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><i class="bi bi-list" aria-hidden="true"></i><span>Menu</span></button>
    <nav id="site-nav" class="ip-nav" aria-label="Primary navigation">
      <a href="index.html">Home</a>
      <a href="services.html">All services</a>
      <details><summary>Registrations</summary><div class="ip-nav-menu">
        <a href="private-limited-company-registration.html">Company Incorporation</a>
        <a href="llp-registration.html">LLP Incorporation</a>
        <a href="opc-registration.html">OPC Incorporation</a>
        <a href="mca-name-reservation-search-approval.html">Name Reservation</a>
        <a href="fssai-registration.html">FSSAI Registration</a>
        <a href="gst-registration.html">GST Registration</a>
      </div></details>
      <details><summary>Returns</summary><div class="ip-nav-menu">
        <a href="gst-returns.html">GST Returns</a><a href="income-tax-return-filing.html">Income Tax Returns</a>
        <a href="company-annual-filing.html">Company Annual Filing</a><a href="llp-annual-filing.html">LLP Annual Filing</a>
      </div></details>
      <a href="index.html#contact">Contact</a>
    </nav>
  </div>
</header>
<main id="main-content">
  <picture>
    <source srcset="assets/img/banners/{banner}-1600x500.webp" type="image/webp">
    <img class="ip-page-banner" src="assets/img/banners/{banner}-1600x500.jpg" width="1600" height="500" alt="{html.escape(page['banner_alt'], quote=True)}">
  </picture>
  <nav class="ip-breadcrumb ip-container" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><a href="services.html">Services</a><span aria-hidden="true">›</span><span aria-current="page">{html.escape(page['crumb'])}</span></nav>
  <section class="ip-hero"><div class="ip-container ip-hero-grid"><div>
    <span class="ip-eyebrow">{html.escape(page['eyebrow'])}</span>
    <h1>{html.escape(page['h1'])}</h1>
    <p class="ip-lead">{page['lead']}</p>
    <p><a class="ip-primary-button" href="#enquiry-title" data-enquiry-cta data-service="{html.escape(page['service'], quote=True)}">Discuss documents and the fee</a></p>
    <div class="ip-trust"><span><i class="bi bi-person-check" aria-hidden="true"></i> Professional review</span><span><i class="bi bi-shield-check" aria-hidden="true"></i> Scope confirmed first</span><span><i class="bi bi-chat-square-text" aria-hidden="true"></i> MCA filing support</span></div>
  </div>
  <aside class="ip-form-card" aria-labelledby="enquiry-title">
    <h2 id="enquiry-title">Discuss your requirement</h2>
    <p>Share the basic details. Your enquiry opens in WhatsApp for you to review before it is sent. <!-- TODO: Replace [FEE] with the current professional fee. --></p>
    <form class="ip-enquiry-form" data-service="{html.escape(page['service'], quote=True)}">
      <input type="hidden" name="service" value="{html.escape(page['service'], quote=True)}">
      <div class="ip-field"><label for="enquiry-name">Name <span aria-hidden="true">*</span></label><input id="enquiry-name" name="name" type="text" autocomplete="name" required></div>
      <div class="ip-field"><label for="enquiry-phone">Phone <span aria-hidden="true">*</span></label><input id="enquiry-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>
      <div class="ip-field"><label for="enquiry-email">Email</label><input id="enquiry-email" name="email" type="email" autocomplete="email"></div>
      <div class="ip-field"><label for="enquiry-package">Professional fee</label><select id="enquiry-package" name="package"><option value="Professional fee [FEE]">Professional fee — [FEE]</option></select></div>
      <div class="ip-field"><label for="enquiry-message">Message</label><textarea id="enquiry-message" name="message" rows="3"></textarea></div>
      <label class="ip-consent"><input name="consent" type="checkbox" required><span>I agree to be contacted about this enquiry and have read the <a href="privacy-policy.html">Privacy Policy</a>.</span></label>
      <button class="ip-submit" type="submit"><i class="bi bi-whatsapp" aria-hidden="true"></i> Send enquiry on WhatsApp</button>
      <p class="ip-form-status" role="status" aria-live="polite"></p>
      <p class="ip-privacy-note">Nothing is sent until you confirm the message in WhatsApp.</p>
    </form>
  </aside></div></section>
  <section class="ip-section"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">WHO IT SUITS</span><h2>{html.escape(page['suits_heading'])}</h2><p>{page['suits_intro']}</p></div><div class="ip-card-grid">{suits}</div></div></section>
  <section class="ip-section ip-section-alt"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">DOCUMENTS</span><h2>Documents required</h2><p>The final list depends on whether the promoters are Indian residents, NRIs or foreign nationals, and on the registered-office arrangement. Names and identity numbers must match the DSC.</p></div><ul class="ip-list">{docs}</ul><p class="ip-source-note">Authoritative portal: <a href="https://www.mca.gov.in/" target="_blank" rel="noopener">Ministry of Corporate Affairs</a>. Portal instructions prevail over this overview.</p></div></section>
  <section class="ip-section"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">PROCESS</span><h2>Step-by-step process</h2></div><ol class="ip-list">{steps}</ol></div></section>
  <section class="ip-section ip-section-alt"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">TIMELINE</span><h2>Indicative timeline</h2><p>These are working estimates after a complete document set. MCA processing, resubmission and DSC verification are outside a fixed promise.</p></div><ul class="ip-list">{timeline}</ul></div></section>
  <section id="pricing" class="ip-section"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">WHAT IS INCLUDED</span><h2>What the professional fee covers</h2><p>Professional fee: <strong>[FEE]</strong>. <!-- TODO: Replace [FEE] with the current professional fee. Do not publish an unverified price. --> Government fees, stamp duty and GST are additional unless the written quote includes them.</p></div><ul class="ip-list">{included}</ul><p>{page['excluded']}</p></div></section>
  <section id="service-questions" class="ip-section ip-section-alt"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">FAQ</span><h2>Common questions</h2></div><div class="ip-faq">{faq_html}</div><p class="ip-source-note">Checked against the Companies Act, 2013, the LLP Act, 2008 and the Companies (Incorporation) Rules, 2014 as amended by the Companies (Incorporation) Second Amendment Rules, 2021. Confirm the current MCA instruction kit before filing.</p></div></section>
  <section class="ip-end-cta"><div class="ip-container ip-end-inner"><div><h2>Ready to start the incorporation?</h2><p>Share the promoters, the proposed name and the registered-office city. We will confirm the form, the documents and [FEE] before filing.</p></div><a class="ip-primary-button" href="#enquiry-title" data-enquiry-cta data-service="{html.escape(page['service'], quote=True)}">Get started — +91 82097 85294</a></div></section>
</main>
{footer_html()}
<a class="ip-whatsapp" href="{WA}?text=Hello%2C%20I%20would%20like%20to%20discuss%20{page['wa']}" target="_blank" rel="noopener" aria-label="Contact Instant Professionals on WhatsApp"><i class="bi bi-whatsapp" aria-hidden="true"></i><span>WhatsApp</span></a>
<script src="assets/js/enquiry.js" defer></script>
</body>
</html>
"""


def incorporation_pages() -> list[dict]:
    shared_docs_tail = "Registered-office proof: an ownership document, or a rent or lease agreement with a no-objection letter from the owner, plus a recent utility bill."
    return [
        {
            "file": "private-limited-company-registration.html",
            "banner": "private-limited-company",
            "banner_alt": "Private limited company registration. SPICe+ and AGILE-PRO-S incorporation support. Get started — +91 82097 85294",
            "title": "Private Limited Company Registration | Instant Professionals",
            "description": "Incorporate a private limited company in India through SPICe+ and AGILE-PRO-S, with name reservation, DSC, DIN and MCA filing support.",
            "crumb": "Private Limited Company",
            "service": "Private Limited Company Registration",
            "eyebrow": "COMPANIES ACT, 2013 • SPICe+",
            "h1": "Private limited company registration",
            "lead": "Name reservation, SPICe+ (INC-32) and the linked AGILE-PRO-S filing for a private company limited by shares. At least two subscribers and two directors are required, and one director must be resident in India.",
            "suits_heading": "Who a private limited company suits",
            "suits_intro": "A private company is a separate legal entity under the Companies Act, 2013. It is usually the right vehicle when two or more promoters want limited liability and a share structure.",
            "suits": [
                ("Two or more promoters", "You need at least two subscribers and two directors. The same people can hold both roles. There is no statutory minimum paid-up capital."),
                ("Equity and limited liability", "The company owns its assets and the members’ liability is limited to the unpaid amount on their shares. This is the usual structure when investment is planned."),
                ("Not a sole founder", "A single Indian citizen who does not want a co-founder should look at <a href=\"opc-registration.html\">OPC registration</a>. Professional partnerships often fit an <a href=\"llp-registration.html\">LLP</a> better."),
            ],
            "documents": [
                "PAN, photograph and address proof of every subscriber and director. A foreign national uses a passport, and the DSC must match that name.",
                "Proposed names in order of preference, a short description of the main objects, authorised and paid-up capital, and the shareholding.",
                "Digital signature certificates for the subscribers and directors. A DIN is not a precondition: SPICe+ can allot a DIN for up to three proposed directors who do not already have one.",
                shared_docs_tail,
                "Director consent (DIR-2) and the subscribers’ declaration (INC-9). We prepare these with the SPICe+ set; they are not extra forms you draft alone.",
            ],
            "steps": [
                ("Confirm the structure.", "Check that a private company, rather than an OPC, LLP or proprietorship, matches the promoters and the proposed activity."),
                ("Reserve the name.", "Apply through SPICe+ Part A, or through RUN where a separate reservation is needed. Use the approved name in Part B while the reservation is valid, and confirm the current validity on the MCA portal."),
                ("Prepare SPICe+ Part B.", "Complete INC-32 with capital, subscribers, directors and the registered office. Link e-MOA (INC-33) and e-AOA (INC-34)."),
                ("File AGILE-PRO-S where it is useful.", "The linked AGILE-PRO-S form can cover GSTIN, EPFO, ESIC, Profession Tax in Maharashtra, bank-account opening and Shops and Establishment registration. Each registration still follows its own approval."),
                ("Sign and track.", "Subscribers and directors sign with their DSC. Keep the SRN, answer any resubmission, and collect the certificate of incorporation, PAN and TAN."),
                ("Plan the first filings.", "A company with share capital files the commencement declaration (INC-20A) within 180 days of incorporation, after the subscribers have paid for their shares. That filing is a separate scope unless the quote includes it."),
            ],
            "timeline": [
                "DSC: commonly one or two working days after the identity check is complete.",
                "Name reservation: often a few working days when the name is available and MCA does not ask for a resubmission.",
                "Certificate of incorporation: often about 7 to 15 working days after a complete SPICe+ filing. Resubmission resets that expectation.",
                "INC-20A: within 180 days of incorporation for a company with share capital, and only after share money is received.",
            ],
            "included": [
                "Name check and one SPICe+ Part A (or RUN) reservation application.",
                "Drafting of the e-MOA and e-AOA from the agreed objects and capital.",
                "SPICe+ Part B preparation, DSC coordination and filing, including DIN allotment for up to three directors who need one.",
                "AGILE-PRO-S preparation for the registrations you choose to include.",
                "Follow-up until the certificate of incorporation is issued or MCA raises a resubmission we can answer from the agreed papers.",
            ],
            "excluded": "Not included unless the quote says so: government fees, stamp duty (which depends on the state and the capital), GST on the professional fee, a fresh name application after rejection, trademark clearance, GST returns, a bank-branch visit, and post-incorporation work such as <a href=\"commencement-of-business.html\">INC-20A</a>, <a href=\"company-annual-filing.html\">annual ROC filing</a> or <a href=\"gst-registration.html\">GST registration</a> outside AGILE-PRO-S.",
            "wa": "private%20limited%20company%20registration",
            "faqs": [
                ("What is SPICe+?", "SPICe+ (INC-32) is the MCA integrated web form for incorporating a company. Part A reserves the name. Part B is the incorporation application and is linked to the e-MOA, e-AOA and, where used, AGILE-PRO-S."),
                ("How many directors and shareholders are required?", "A private company needs at least two members and at least two directors. The same two people can be both. At least one director must stay in India for 182 days or more in the financial year, applied proportionately in the year of incorporation, under section 149 of the Companies Act, 2013."),
                ("Can an NRI or a foreign national be a director or shareholder?", "Yes, subject to the resident-director rule and to FEMA reporting where the investment is from outside India. A foreign national needs a passport and a DSC in that name. We confirm the route from the promoters’ residence and the source of capital before filing."),
                ("Do we need a DIN and DSC before filing?", "Every subscriber and director who signs needs a DSC. A DIN is allotted through SPICe+ for up to three proposed directors who do not already have one. A person who already has a DIN must use that DIN and must not apply again."),
                ("What does AGILE-PRO-S cover?", "It is the linked form for GSTIN, EPFO, ESIC, Profession Tax in Maharashtra, opening a bank account and Shops and Establishment registration, as those regimes apply. Filing the form is not the same as approval of each registration."),
                ("Is the professional fee the full cost?", "No. The professional fee is [FEE]. MCA fees and stamp duty depend on authorised capital and the state of the registered office, and they are extra unless the written quote includes them."),
            ],
        },
        {
            "file": "llp-registration.html",
            "banner": "llp",
            "banner_alt": "LLP registration. FiLLiP incorporation and LLP agreement support. Get started — +91 82097 85294",
            "title": "LLP Registration in India | Instant Professionals",
            "description": "Incorporate a limited liability partnership through FiLLiP under the LLP Act, 2008, including name reservation, DSC and the Form 3 agreement.",
            "crumb": "LLP Registration",
            "service": "LLP Registration",
            "eyebrow": "LLP ACT, 2008 • FiLLiP",
            "h1": "LLP registration",
            "lead": "Incorporation of a limited liability partnership through FiLLiP, with name reservation and the LLP agreement filed in Form 3. An LLP needs at least two partners, and at least one designated partner must be resident in India.",
            "suits_heading": "Who an LLP suits",
            "suits_intro": "An LLP under the Limited Liability Partnership Act, 2008 combines a separate legal entity with a partnership-style agreement. It is not a company and it does not issue shares.",
            "suits": [
                ("Two or more partners", "You need at least two partners and at least two designated partners. There is no statutory minimum contribution; the agreement states what each partner contributes."),
                ("Professional practices", "Firms that want limited liability without company meetings and share capital often use an LLP. The agreement records profit sharing, duties and exit."),
                ("A different vehicle", "Two promoters who want shares and equity investment usually need a <a href=\"private-limited-company-registration.html\">private limited company</a>. One Indian citizen acting alone should consider an <a href=\"opc-registration.html\">OPC</a>."),
            ],
            "documents": [
                "PAN, photograph and address proof of each partner and designated partner. A foreign national uses a passport.",
                "Proposed LLP names, a description of the activity, and the contribution and profit-sharing ratio.",
                "DSC for the partners who will sign. DPIN or DIN for up to two designated partners can be applied for through FiLLiP if they do not already have one.",
                shared_docs_tail,
                "The agreed commercial terms for the LLP agreement: contributions, profit share, management rights and what happens if a partner leaves. The agreement itself is filed after incorporation.",
            ],
            "steps": [
                ("Confirm that an LLP fits.", "Check the number of partners, whether one designated partner is resident in India, and whether a company structure would serve the activity better."),
                ("Reserve the name.", "Apply through RUN-LLP, or with the incorporation form where the current MCA flow allows it. Confirm that the reservation is still valid before filing FiLLiP."),
                ("File FiLLiP.", "Prepare the incorporation form with partner details, contributions and the registered office, and sign with DSC."),
                ("Collect the certificate.", "Track the SRN, answer any resubmission, and obtain the certificate of incorporation together with PAN and TAN."),
                ("File the LLP agreement.", "Execute the agreement and file it in Form 3 within 30 days of incorporation. Stamp duty on the agreement depends on the state."),
                ("Register only what the activity needs.", "GST, FSSAI, shops and establishment, or professional-tax registration is a separate decision. Incorporation does not create those registrations."),
            ],
            "timeline": [
                "DSC: commonly one or two working days after identity verification.",
                "Name reservation: often a few working days if RUN-LLP does not ask for a change.",
                "Certificate of incorporation: often about 7 to 15 working days after a complete FiLLiP filing.",
                "Form 3: within 30 days of the incorporation date. Missing that window needs a separate regularisation, which is not part of the incorporation filing.",
            ],
            "included": [
                "Name check and one RUN-LLP reservation application.",
                "FiLLiP preparation and filing, including DPIN allotment for up to two designated partners who need one.",
                "Drafting the LLP agreement from the terms the partners confirm, and Form 3 filing within the statutory window.",
                "Follow-up on the SRN until the certificate is issued or a resubmission can be answered from the agreed papers.",
            ],
            "excluded": "Not included unless the quote says so: government fees, stamp duty on the LLP agreement, GST on the professional fee, a second name application, partner visas or FEMA filings, and later work such as <a href=\"llp-annual-filing.html\">LLP annual filing</a> or <a href=\"gst-registration.html\">GST registration</a>.",
            "wa": "LLP%20registration",
            "faqs": [
                ("What is FiLLiP?", "FiLLiP is the MCA form used to incorporate an LLP. It records the partners, designated partners, contribution and registered office. The LLP agreement is not part of FiLLiP; it is filed afterwards in Form 3."),
                ("How many partners does an LLP need?", "At least two partners, of whom at least two are designated partners. Section 7 of the LLP Act, 2008 requires at least one designated partner to be resident in India, meaning a stay of at least 182 days during the immediately preceding one year."),
                ("Is there a minimum capital?", "The LLP Act does not set a minimum contribution. The agreement must still state each partner’s contribution. Stamp duty, if any, follows the state law and the agreement value."),
                ("When is the LLP agreement filed?", "Form 3 is filed within 30 days of incorporation. The agreement should be stamped as the state requires before it is uploaded."),
                ("Can a foreign national be a partner?", "Yes, with a passport and DSC in that name, provided one designated partner is resident in India. Investment from outside India can need a separate FEMA check, which we scope before filing."),
                ("What is the professional fee?", "The professional fee is [FEE]. MCA fees, stamp duty and GST are additional unless the written quote includes them."),
            ],
        },
        {
            "file": "opc-registration.html",
            "banner": "opc",
            "banner_alt": "One Person Company registration. SPICe+ OPC incorporation, including NRI promoters. Get started — +91 82097 85294",
            "title": "OPC Registration in India | Instant Professionals",
            "description": "Incorporate a One Person Company through SPICe+. An Indian citizen, including an NRI, can form an OPC, with no mandatory conversion threshold since 2021.",
            "crumb": "OPC Registration",
            "service": "OPC Registration",
            "eyebrow": "COMPANIES ACT, 2013 • ONE PERSON COMPANY",
            "h1": "One Person Company registration",
            "lead": "SPICe+ incorporation of a One Person Company for a single Indian citizen, including an NRI. You appoint one nominee. Since the 2021 amendment there is no mandatory conversion when capital or turnover crosses the old limits.",
            "suits_heading": "Who an OPC suits",
            "suits_intro": "An OPC is a private company with one member. It gives limited liability without a second shareholder. It is available only to a natural person who is an Indian citizen.",
            "suits": [
                ("One Indian citizen", "Only a natural person who is an Indian citizen can be the member, whether that person is resident in India or not. A body corporate cannot be the member."),
                ("NRIs", "An NRI who is an Indian citizen can incorporate an OPC and can be the nominee. The company must still have one director who meets the resident-director test in section 149."),
                ("When not to use an OPC", "Two promoters should use a <a href=\"private-limited-company-registration.html\">private limited company</a>. A partnership-style firm should look at an <a href=\"llp-registration.html\">LLP</a>. A person who only needs GST should not incorporate a company for that alone."),
            ],
            "documents": [
                "PAN, photograph and address proof of the member and of the nominee. An NRI uses the passport and overseas address proof that the DSC and SPICe+ require.",
                "Nominee consent in INC-3. The nominee must be a natural person and an Indian citizen, and must not already be a member or nominee of another OPC.",
                "DSC of the member and of any other first director. DIN allotment for directors who do not have one is part of SPICe+, up to three directors.",
                shared_docs_tail,
                "Proposed name, objects, capital and the member’s subscriber details. There is no statutory minimum paid-up capital.",
            ],
            "steps": [
                ("Confirm OPC eligibility.", "The member must be a natural person and an Indian citizen. A person cannot be a member of more than one OPC, or a nominee of more than one OPC, at the same time."),
                ("Appoint the nominee.", "The nominee becomes the member if the sole member dies or becomes incapacitated. Take consent in INC-3 before filing."),
                ("Reserve the name and file SPICe+.", "Use SPICe+ Part A for the name and Part B for incorporation, with e-MOA and e-AOA. The memorandum of an OPC follows the OPC form of memorandum."),
                ("Meet the resident-director rule.", "Section 149 still requires at least one director who stays in India for 182 days in the financial year, proportionately in the year of incorporation. An NRI member who does not meet that test needs a resident director."),
                ("Use AGILE-PRO-S only where needed.", "GST, EPFO, ESIC and the other linked registrations are optional and are not granted merely because the company is incorporated."),
                ("File INC-20A after share money is received.", "An OPC with share capital files the commencement declaration within 180 days. There is no rule that forces the OPC to convert into another company when capital or turnover grows."),
            ],
            "timeline": [
                "DSC and nominee consent: commonly a few working days, longer if the member or nominee signs from outside India.",
                "Name reservation and SPICe+ scrutiny: often about 7 to 15 working days after a complete filing, subject to MCA resubmission.",
                "INC-20A: within 180 days of incorporation, as a separate filing.",
                "Conversion, if you later want a private or public company, is voluntary. It is not triggered by a capital or turnover threshold.",
            ],
            "included": [
                "Eligibility check for the member and the nominee, including the one-OPC limit.",
                "Name reservation and SPICe+ filing with e-MOA, e-AOA and INC-3.",
                "DIN allotment through SPICe+ for directors who do not have a DIN, within the form’s limit of three.",
                "AGILE-PRO-S for the linked registrations you ask to include.",
                "Follow-up until the certificate of incorporation is issued or a resubmission is answered from the agreed papers.",
            ],
            "excluded": "Not included unless the quote says so: government fees, stamp duty, a resident director’s separate appointment paperwork beyond the SPICe+ set, FEMA advice, and later filings such as <a href=\"commencement-of-business.html\">INC-20A</a> or <a href=\"opc-annual-filing.html\">OPC annual filing</a>. The professional fee is [FEE].",
            "wa": "OPC%20registration",
            "faqs": [
                ("Who can form an OPC?", "A natural person who is an Indian citizen. Under rule 3 of the Companies (Incorporation) Rules, 2014, as substituted in 2021, the citizen may be resident in India or otherwise. A company or an LLP cannot be the sole member."),
                ("Can an NRI form an OPC?", "Yes. An Indian citizen living outside India can be the member and can be a nominee. The OPC must still have at least one director who meets the 182-day resident-director test in section 149 of the Companies Act, 2013."),
                ("Is there a mandatory conversion threshold?", "No. The Companies (Incorporation) Second Amendment Rules, 2021 removed the rule that forced an OPC to convert when paid-up capital crossed ₹50 lakh or average turnover crossed ₹2 crore. Conversion to a private or public company is voluntary."),
                ("What does the nominee do?", "The nominee is named in the memorandum and consents in INC-3. The nominee becomes the member if the sole member dies or is incapacitated. The nominee is not a second shareholder while the member is in place."),
                ("Which form is used?", "SPICe+ (INC-32), with Part A for the name and Part B for incorporation, linked to the e-MOA, e-AOA and INC-3. AGILE-PRO-S is added only for the registrations you want to start with the company."),
                ("What is the fee?", "The professional fee is [FEE]. MCA fees and stamp duty depend on capital and the state, and they are quoted separately."),
            ],
        },
    ]


def main() -> None:
    for old, new in list(TITLES.items()):
        if len(new) > 60:
            raise SystemExit(f"title map {len(new)} {new}")
    for old, new in list(DESCS.items()):
        if len(new) > 155:
            raise SystemExit(f"desc map {len(new)} {new}")
    write_incorporation_pages()
    main_js = ROOT / "assets/js/main.js"
    main_js.write_text(patch_main_js(main_js.read_text(encoding="utf-8")), encoding="utf-8")
    for path in iter_html():
        text = path.read_text(encoding="utf-8")
        original = text
        if path == ROOT / "index.html":
            text = patch_index(text)
        elif path.name == "services.html":
            text = patch_services(text)
        elif path.name == "terms.html":
            text = patch_terms(text)
        text = replace_logos(text)
        text = replace_share_image(text)
        text = replace_titles_and_descriptions(text)
        if path != ROOT / "index.html":
            text = ensure_footer(text, path)
            text = ensure_schema(text, path)
            text = add_registration_links(text)
        text = text.replace('href="index.html#team"', 'href="index.html#about"')
        if text != original:
            path.write_text(text, encoding="utf-8")
            print("patched", path.relative_to(ROOT))
    sitemap = ROOT / "sitemap.xml"
    sitemap.write_text(patch_sitemap(sitemap.read_text(encoding="utf-8")), encoding="utf-8")
    robots = ROOT / "robots.txt"
    robots.write_text(
        "\n".join(
            line for line in robots.read_text(encoding="utf-8").splitlines() if "seo-sitemap.xml" not in line
        ).rstrip()
        + "\n",
        encoding="utf-8",
    )
    print("sitemap and robots updated")


if __name__ == "__main__":
    main()
