#!/usr/bin/env python3
"""Generate the consistent, accessible Instant Professionals service site.

The legacy repository contained dozens of copied page fragments.  This script
keeps the multipage information architecture while generating one audited
template, clean URLs, compatibility redirect pages, metadata, and policies.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = "https://instantprofessionals.in"
PHONE_DISPLAY = "+91 82097 85294"
PHONE_LINK = "+918209785294"
EMAIL = "info@instantprofessionals.in"
PRICE_FACTOR = 0.70


# old filename: (clean filename, title, category, concise current-safe summary)
CATALOG = {
    "Appointmentofauditors.html": ("appointment-of-auditor.html", "Appointment of Auditor", "corporate", "Documentation and MCA filing support for appointment, reappointment or change of a company auditor."),
    "Commencement-of-Business.html": ("commencement-of-business.html", "Commencement of Business Filing", "corporate", "Professional support for the declaration and supporting records required before an eligible company commences business or borrowing."),
    "Copyright-application.html": ("copyright-application.html", "Copyright Application", "ipr", "Copyright application assistance for eligible literary, artistic, software and other protected works."),
    "Digital-marketting.html": ("digital-marketing.html", "Digital Marketing Support", "design", "Practical digital marketing planning, content coordination and campaign support for growing businesses."),
    "Din application.html": ("din-application.html", "DIN Application", "corporate", "Document review and filing support for obtaining a Director Identification Number through the applicable MCA process."),
    "Dissolution-of-firms.html": ("dissolution-of-firm.html", "Dissolution of Firm", "corporate", "Documentation and closure support for partnership firms, subject to the partnership deed, registrations and outstanding obligations."),
    "Esi returns.html": ("esi-returns.html", "ESI Returns and Compliance", "labour", "Periodic ESI contribution and return support based on establishment coverage, employee data and portal records."),
    "GST Modify.html": ("gst-registration-amendment.html", "GST Registration Amendment", "gst", "Support for core and non-core amendments to GST registration particulars and supporting documents."),
    "GST Registration.html": ("gst-registration.html", "GST Registration", "gst", "GST registration eligibility review, document preparation, application filing and ARN follow-up."),
    "GST-LUT-LETTEROFundertaking.html": ("gst-lut.html", "GST Letter of Undertaking (LUT)", "gst", "LUT filing support for eligible exporters and zero-rated suppliers, based on the current GST portal process."),
    "GSTreturns.html": ("gst-returns.html", "GST Return Filing", "gst", "GST return preparation and filing support with reconciliation of outward supplies, input tax credit and books."),
    "International-trademark-registration.html": ("international-trademark-registration.html", "International Trademark Registration", "ipr", "International trademark filing coordination based on the applicant’s home registration, target jurisdictions and filing strategy."),
    "LOGO-Designing.html": ("logo-design.html", "Professional Logo Design", "design", "Brand-led logo design support with defined concepts, revisions and final-use formats."),
    "MOA AOA amendment.html": ("moa-aoa-amendment.html", "MOA and AOA Amendment", "corporate", "Corporate approval, drafting and MCA filing support for amendments to the memorandum or articles."),
    "MOAAOAprinting.html": ("moa-aoa-printing.html", "MOA and AOA Printing", "corporate", "Preparation and organised printing support for updated constitutional documents and company records."),
    "MSME Registration.html": ("udyam-registration.html", "Udyam MSME Registration", "business", "Professional assistance for Udyam registration, classification review and information validation."),
    "Pan application.html": ("pan-application.html", "PAN Application", "tax", "PAN application and correction support for eligible individuals and entities with document review."),
    "ROC-Search-Report.html": ("roc-search-report.html", "ROC Search Report", "corporate", "Structured review of publicly available MCA records for corporate due diligence and decision support."),
    "TAN  Application.html": ("tan-application.html", "TAN Application", "tax", "Application assistance for Tax Deduction and Collection Account Number registration and corrections."),
    "Trademark-assignment.html": ("trademark-assignment.html", "Trademark Assignment", "ipr", "Drafting and recordal support for transfer of trademark ownership and associated rights."),
    "Trademark-opposition.html": ("trademark-opposition.html", "Trademark Opposition", "ipr", "Professional support for trademark opposition strategy, pleadings, evidence and procedural follow-up."),
    "Trademark-registration.html": ("trademark-registration.html", "Trademark Registration", "ipr", "Trademark search, classification, application filing and prosecution support for brand protection."),
    "addadirector.html": ("add-a-director.html", "Add a Director", "corporate", "Consent, eligibility, corporate approvals and MCA filing support for appointment of a director."),
    "addremove a partner in llp.html": ("add-remove-llp-partner.html", "Add or Remove an LLP Partner", "corporate", "Documentation, LLP agreement update and MCA filing support for partner changes."),
    "change of register officeaddress.html": ("change-registered-office.html", "Change of Registered Office", "corporate", "Approval, address-proof and MCA filing support for a company’s registered-office change."),
    "chnage in llp aggrement.html": ("change-llp-agreement.html", "Change in LLP Agreement", "corporate", "Drafting, partner approval and filing support for amendments to an LLP agreement."),
    "chnagein din.html": ("change-din-particulars.html", "Change in DIN Particulars", "corporate", "Document and filing support for updating permitted particulars associated with a DIN."),
    "companyannualfilling.html": ("company-annual-filing.html", "Company Annual Filing", "corporate", "Coordinated financial-statement and annual-return filing support based on the company’s applicable MCA requirements."),
    "companynamechange.html": ("company-name-change.html", "Company Name Change", "corporate", "Name availability, corporate approval, constitutional-document and MCA filing support for a company name change."),
    "digital signature.html": ("digital-signature-certificate.html", "Digital Signature Certificate", "business", "DSC application and renewal coordination for authorised business and statutory portal use."),
    "dir-3KYC.html": ("dir-3-kyc.html", "DIR-3 KYC", "corporate", "KYC filing support for DIN holders based on the applicable MCA form and verification process."),
    "epf registration.html": ("epf-registration.html", "EPF Registration", "labour", "EPF coverage review, establishment registration and document support through the applicable portal."),
    "esic registration.html": ("esic-registration.html", "ESIC Registration", "labour", "ESIC applicability review and establishment registration support with employee and business records."),
    "gst-cancellation.html": ("gst-cancellation.html", "GST Registration Cancellation", "gst", "Application support for GST cancellation, pending-compliance review and final-return requirements, where applicable."),
    "iesmodification.html": ("iec-modification.html", "IEC Modification", "trade", "DGFT profile and IEC modification support for changes in business particulars."),
    "iesregistration.html": ("iec-registration.html", "IEC Registration", "trade", "Importer Exporter Code application support with PAN, business and bank-information validation."),
    "incometaxreturns.html": ("income-tax-return-filing.html", "Income Tax Return Filing", "tax", "Return-form selection, income and tax-credit reconciliation, disclosure review and filing support."),
    "increase in authorizedcapital.html": ("increase-authorised-capital.html", "Increase Authorised Share Capital", "corporate", "Corporate approval, constitutional-document and MCA filing support for an increase in authorised capital."),
    "llpannualfilling.html": ("llp-annual-filing.html", "LLP Annual Filing", "corporate", "Statement of account, solvency and annual-return filing support for LLPs based on applicable MCA requirements."),
    "llpnamechange.html": ("llp-name-change.html", "LLP Name Change", "corporate", "Name reservation, partner approval, agreement update and MCA filing support for an LLP name change."),
    "opcfilling.html": ("opc-annual-filing.html", "OPC Annual Filing", "corporate", "Annual financial-statement, return and related compliance support for One Person Companies."),
    "patient-registration.html": ("patent-registration.html", "Patent Application Support", "ipr", "Patent filing coordination, documentation and prosecution support with an appropriate patent professional."),
    "pfreturns.html": ("pf-returns.html", "PF Returns and Compliance", "labour", "Periodic EPF contribution and return support with payroll and employee-data reconciliation."),
    "removal regisnationofdirector.html": ("director-resignation-removal.html", "Director Resignation or Removal", "corporate", "Board-process, notice, documentation and MCA filing support for resignation or removal of a director."),
    "sharetransfer&transmission.html": ("share-transfer-transmission.html", "Share Transfer and Transmission", "corporate", "Instrument, approval, register and certificate support for transfer or transmission of company shares."),
    "strike-off-llp.html": ("llp-strike-off.html", "LLP Strike Off", "corporate", "Eligibility review, partner documentation and MCA filing support for closure of an inactive LLP."),
    "strikeoffcompany.html": ("company-strike-off.html", "Company Strike Off", "corporate", "Eligibility review, closure documentation and MCA filing support for striking off an eligible company."),
    "surrenderyourdin.html": ("din-surrender.html", "DIN Surrender", "corporate", "Eligibility and documentation review for surrender or cancellation of a DIN in permitted circumstances."),
    "tdsreturnrevision.html": ("tds-return-revision.html", "TDS Return Revision", "tax", "Correction-statement support based on filed returns, challans, deductee records and identified defaults."),
    "tdsreturns.html": ("tds-returns.html", "TDS Return Filing", "tax", "Quarterly TDS statement preparation, challan and deductee reconciliation, validation and filing support."),
    "trademark-objections.html": ("trademark-objection-reply.html", "Trademark Objection Reply", "ipr", "Examination-report review, legal response drafting and filing support for trademark objections."),
    "trademark-renewal.html": ("trademark-renewal.html", "Trademark Renewal", "ipr", "Renewal-status review, document preparation and filing support for registered trademarks."),
    "trademark-restification.html": ("trademark-rectification.html", "Trademark Rectification", "ipr", "Professional support for rectification or cancellation proceedings concerning the trademark register."),
    "trademark-watch-service.html": ("trademark-watch-service.html", "Trademark Watch Service", "ipr", "Periodic monitoring support for potentially conflicting trademark applications and brand-risk alerts."),
    "trademark-withdrawal.html": ("trademark-withdrawal.html", "Trademark Withdrawal", "ipr", "Status review and filing support for withdrawal of an eligible trademark application or proceeding."),
}


BASE_PRICES = {
    "Appointmentofauditors.html": [2999], "Commencement-of-Business.html": [1299, 1999, 2499],
    "Copyright-application.html": [3499, 8499, 12999], "Digital-marketting.html": [4999, 18999, 59999],
    "Din application.html": [1799, 2999, 7299], "Dissolution-of-firms.html": [1999, 3499],
    "Esi returns.html": [999, 8999], "GST Modify.html": [1799, 2999, 7299],
    "GST Registration.html": [1799, 2999, 7299], "GST-LUT-LETTEROFundertaking.html": [1499],
    "GSTreturns.html": [1799, 2999, 7299], "International-trademark-registration.html": [35499],
    "LOGO-Designing.html": [1999, 3999, 4999], "MOA AOA amendment.html": [4999, 8999],
    "MOAAOAprinting.html": [1999], "MSME Registration.html": [1799, 2999, 7299],
    "Pan application.html": [1799, 2999, 7299], "ROC-Search-Report.html": [1299, 2499],
    "TAN  Application.html": [1799, 2999, 7299], "Trademark-assignment.html": [14999],
    "Trademark-opposition.html": [15500, 7500], "Trademark-registration.html": [6199, 7699, 11799],
    "addadirector.html": [1999, 3999, 4999], "addremove a partner in llp.html": [999, 1999, 2999],
    "change of register officeaddress.html": [999, 1999, 2999], "chnage in llp aggrement.html": [1999],
    "chnagein din.html": [999, 1299, 2299], "companyannualfilling.html": [3499, 9999, 19999],
    "companynamechange.html": [2999], "digital signature.html": [1799, 2999, 7299],
    "dir-3KYC.html": [799, 1199, 4999], "epf registration.html": [1799, 2999, 7299],
    "esic registration.html": [1799, 2999, 7299], "gst-cancellation.html": [1499],
    "iesmodification.html": [1799, 2999, 7299], "iesregistration.html": [1799, 2999, 7299],
    "incometaxreturns.html": [899, 1999, 3499], "increase in authorizedcapital.html": [3499, 4499, 5499],
    "llpannualfilling.html": [1499, 2499, 3999], "llpnamechange.html": [1999],
    "opcfilling.html": [3499, 9999, 19999], "patient-registration.html": [29899, 39899, 49899],
    "pfreturns.html": [1799, 2999, 7299], "removal regisnationofdirector.html": [4999, 8999],
    "sharetransfer&transmission.html": [1999, 5999, 8999], "strike-off-llp.html": [1999, 3999, 4999],
    "strikeoffcompany.html": [17999, 20299, 23999], "surrenderyourdin.html": [2999],
    "tdsreturnrevision.html": [999, 2999, 7299], "tdsreturns.html": [599, 5999, 8999],
    "trademark-objections.html": [1999, 2499, 9399], "trademark-renewal.html": [12499, 13499, 13999],
    "trademark-restification.html": [2499], "trademark-watch-service.html": [999],
    "trademark-withdrawal.html": [2499],
}


CATEGORY = {
    "gst": {
        "label": "GST & INDIRECT TAX", "source": ("GST Portal", "https://www.gst.gov.in/"),
        "points": ["Applicability and filing position reviewed from the client’s facts", "Portal-ready documents and authorised-signatory information", "Filing, acknowledgement tracking and follow-up support"],
        "documents": ["PAN and identity/address proof", "Business constitution and authorisation records", "Principal place of business proof", "Registration, invoice and reconciliation data, as applicable"],
    },
    "tax": {
        "label": "INCOME TAX & TDS", "source": ("Income Tax Portal", "https://www.incometax.gov.in/iec/foportal/"),
        "points": ["Taxpayer, form and disclosure applicability review", "Reconciliation of records, tax credits and supporting information", "Preparation, validation, filing and acknowledgement support"],
        "documents": ["PAN and contact details", "Income, deduction and tax-payment records", "Bank and tax-credit information", "Prior filings and relevant supporting documents"],
    },
    "corporate": {
        "label": "CORPORATE & SECRETARIAL", "source": ("Ministry of Corporate Affairs", "https://www.mca.gov.in/"),
        "points": ["Applicable approvals, notices and resolutions identified", "MCA form and attachment review before filing", "Filing follow-up and statutory-record update support"],
        "documents": ["Certificate and constitutional documents", "Director, partner or member information", "Applicable approvals and signed documents", "Financial or event-specific records, where relevant"],
    },
    "labour": {
        "label": "WORKFORCE COMPLIANCE", "source": ("EPFO", "https://www.epfindia.gov.in/"),
        "points": ["Establishment and employee applicability review", "Payroll and employee-record reconciliation", "Portal registration or periodic filing support"],
        "documents": ["Establishment registration records", "Employee and payroll information", "Authorisation and bank details", "Prior challans, filings and notices, where applicable"],
    },
    "ipr": {
        "label": "INTELLECTUAL PROPERTY", "source": ("IP India", "https://ipindia.gov.in/"),
        "points": ["Ownership, classification and filing-position review", "Application, response or instrument drafting support", "Filing, prosecution and status-monitoring assistance"],
        "documents": ["Applicant identity and address details", "Work, mark, invention or ownership material", "Authorisation and supporting declarations", "Earlier applications, notices or registrations, if any"],
    },
    "trade": {
        "label": "IMPORT & EXPORT", "source": ("DGFT", "https://www.dgft.gov.in/"),
        "points": ["Applicant and IEC profile review", "Business, bank and signatory-information validation", "DGFT filing and acknowledgement follow-up"],
        "documents": ["PAN and constitution records", "Business address and bank proof", "Authorised-signatory information", "Existing IEC or DGFT records, where applicable"],
    },
    "business": {
        "label": "BUSINESS REGISTRATION", "source": ("Udyam Registration", "https://udyamregistration.gov.in/"),
        "points": ["Eligibility and classification review", "Business and authorised-person information validation", "Application support and registration-record review"],
        "documents": ["PAN and Aadhaar details, where applicable", "Business constitution and address records", "Bank and activity information", "Existing registration information, if any"],
    },
    "design": {
        "label": "BUSINESS GROWTH", "source": ("Instant Professionals", SITE + "/"),
        "points": ["Business objectives and target audience clarified", "Scope, deliverables and approval stages documented", "Practical execution and handover support"],
        "documents": ["Business and brand brief", "Existing brand assets and references", "Target-audience and channel information", "Authorised feedback and approval contact"],
    },
}


def money(value: int) -> str:
    return f"₹{value:,}".replace(",", ",")


def final_prices(old: str) -> list[int]:
    return [round(price * PRICE_FACTOR) for price in BASE_PRICES.get(old, [])]


def route(old: str) -> str:
    return CATALOG[old][0]


def header_markup() -> str:
    return f"""
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="ip-header">
  <div class="ip-container ip-header-inner">
    <a class="ip-brand" href="index.html" aria-label="Instant Professionals home">
      <img src="assets/img/instant-professionals-logo-2026.png" width="58" height="58" alt="Instant Professionals registered logo">
      <span>Instant Professionals<small>COMPLIANCE • TAX • ADVISORY</small></span>
    </a>
    <button class="ip-nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><i class="bi bi-list" aria-hidden="true"></i><span>Menu</span></button>
    <nav id="site-nav" class="ip-nav" aria-label="Primary navigation">
      <a href="index.html">Home</a>
      <a href="services.html">Services</a>
      <details><summary>Registrations</summary><div class="ip-nav-menu">
        <a href="{route('GST Registration.html')}">GST Registration</a><a href="{route('MSME Registration.html')}">Udyam Registration</a>
        <a href="{route('iesregistration.html')}">IEC Registration</a><a href="{route('epf registration.html')}">EPF Registration</a>
        <a href="{route('esic registration.html')}">ESIC Registration</a><a href="{route('digital signature.html')}">Digital Signature</a>
      </div></details>
      <details><summary>Returns</summary><div class="ip-nav-menu">
        <a href="{route('GSTreturns.html')}">GST Returns</a><a href="{route('incometaxreturns.html')}">Income Tax Returns</a>
        <a href="{route('tdsreturns.html')}">TDS Returns</a><a href="{route('companyannualfilling.html')}">Company Annual Filing</a>
        <a href="{route('llpannualfilling.html')}">LLP Annual Filing</a><a href="{route('pfreturns.html')}">PF Returns</a>
      </div></details>
      <details><summary>IPR</summary><div class="ip-nav-menu">
        <a href="{route('Trademark-registration.html')}">Trademark Registration</a><a href="{route('trademark-objections.html')}">Trademark Objection Reply</a>
        <a href="{route('Copyright-application.html')}">Copyright Application</a><a href="{route('patient-registration.html')}">Patent Application Support</a>
      </div></details>
      <a href="index.html#contact">Contact</a>
    </nav>
  </div>
</header>"""


def footer_markup() -> str:
    return f"""
<footer class="ip-footer">
  <div class="ip-container">
    <div class="ip-footer-grid">
      <div><h2>Instant Professionals</h2><p>A multidisciplinary compliance, tax, corporate and intellectual-property advisory team serving businesses and professionals across India.</p></div>
      <div><h3>Popular services</h3><ul><li><a href="{route('GST Registration.html')}">GST Registration</a></li><li><a href="{route('incometaxreturns.html')}">Income Tax Returns</a></li><li><a href="{route('companyannualfilling.html')}">Company Annual Filing</a></li><li><a href="{route('Trademark-registration.html')}">Trademark Registration</a></li></ul></div>
      <div><h3>Policies</h3><ul><li><a href="privacy-policy.html">Privacy Policy</a></li><li><a href="terms.html">Terms of Service</a></li><li><a href="refund-policy.html">Refund and Cancellation</a></li><li><a href="sitemap.xml">Sitemap</a></li></ul></div>
      <div><h3>Contact</h3><p><a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a></p><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>Serving clients across India</p></div>
    </div>
    <div class="ip-footer-bottom">© 2026 Instant Professionals. Professional scope and statutory applicability are confirmed at the time of engagement.</div>
  </div>
</footer>
<a class="ip-whatsapp" href="https://wa.me/918209785294?text=Hello%2C%20I%20would%20like%20to%20speak%20with%20Instant%20Professionals." target="_blank" rel="noopener" aria-label="Contact Instant Professionals on WhatsApp"><i class="bi bi-whatsapp" aria-hidden="true"></i><span>WhatsApp</span></a>
<script src="assets/js/enquiry.js" defer></script>"""


def form_markup(title: str, prices: list[int]) -> str:
    options = ["<option value=\"\">Select a package</option>"]
    names = ["Essential", "Enhanced", "Complete"]
    for index, price in enumerate(prices):
        name = names[min(index, len(names) - 1)]
        options.append(f'<option value="{name} — {money(price)}">{name} — {money(price)}</option>')
    if not prices:
        options.append('<option value="Custom quotation">Custom quotation</option>')
    return f"""
<aside class="ip-form-card" aria-labelledby="enquiry-title">
  <h2 id="enquiry-title">Discuss your requirement</h2><p>Share the basic details. Your enquiry will open securely in WhatsApp for your review before sending.</p>
  <form class="ip-enquiry-form" data-service="{html.escape(title)}">
    <input type="hidden" name="service" value="{html.escape(title)}">
    <div class="ip-field"><label for="enquiry-name">Name <span aria-hidden="true">*</span></label><input id="enquiry-name" name="name" type="text" autocomplete="name" required></div>
    <div class="ip-field"><label for="enquiry-phone">Phone <span aria-hidden="true">*</span></label><input id="enquiry-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>
    <div class="ip-field"><label for="enquiry-email">Email</label><input id="enquiry-email" name="email" type="email" autocomplete="email"></div>
    <div class="ip-field"><label for="enquiry-package">Package</label><select id="enquiry-package" name="package">{''.join(options)}</select></div>
    <div class="ip-field"><label for="enquiry-message">Message</label><textarea id="enquiry-message" name="message" rows="3"></textarea></div>
    <label class="ip-consent"><input name="consent" type="checkbox" required><span>I agree to be contacted about this enquiry and have read the <a href="privacy-policy.html">Privacy Policy</a>.</span></label>
    <button class="ip-submit" type="submit"><i class="bi bi-whatsapp" aria-hidden="true"></i> Send enquiry on WhatsApp</button>
    <p class="ip-form-status" role="status" aria-live="polite"></p>
    <p class="ip-privacy-note">Nothing is sent until you confirm the message in WhatsApp.</p>
  </form>
</aside>"""


def pricing_markup(prices: list[int]) -> str:
    if not prices:
        return """
<section id="pricing" class="ip-section ip-section-alt"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">PRICING</span><h2>Scope-based quotation</h2><p>We will confirm the professional fee after reviewing the matter, records and expected deliverables.</p></div><button class="ip-package-button" type="button" data-package="Custom quotation">Request a quotation</button></div></section>"""
    names = ["Essential", "Enhanced", "Complete"]
    cards = []
    for index, price in enumerate(prices[:3]):
        name = names[min(index, len(names) - 1)]
        cards.append(f"""<article class="ip-price-card"><div class="ip-price-head"><span>{name}</span><strong>{money(price)}</strong></div><div class="ip-price-body"><p>Professional support for the stated service. Exact inclusions are confirmed in writing after document and scope review.</p><button class="ip-package-button" type="button" data-package="{name} — {money(price)}">Select package</button></div></article>""")
    return f"""
<section id="pricing" class="ip-section ip-section-alt"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">TRANSPARENT PRICING</span><h2>Professional-fee options</h2><p>All displayed service prices have been reconciled to the approved 30% reduction.</p></div><div class="ip-price-grid">{''.join(cards)}</div><p class="ip-price-note">Government fees, stamp duty, taxes and third-party charges are additional unless a written quotation expressly includes them.</p></div></section>"""


def service_page(old: str) -> str:
    clean, title, category_key, summary = CATALOG[old]
    category = CATEGORY[category_key]
    prices = final_prices(old)
    canonical = f"{SITE}/{clean}"
    seo_name = {
        "international-trademark-registration.html": "Instant International Trademark",
        "digital-signature-certificate.html": "Instant Digital Signature (DSC)",
        "director-resignation-removal.html": "Instant Director Resignation",
        "share-transfer-transmission.html": "Instant Share Transfer",
        "increase-authorised-capital.html": "Instant Authorised Capital Increase",
        "gst-registration-amendment.html": "Instant GST Amendment",
        "income-tax-return-filing.html": "Instant Income Tax Return Filing",
    }.get(clean, f"Instant {title}")
    description = f"Instant Professionals provides {title} support across India with clear scope, transparent pricing and coordinated assistance."
    cards = "".join(
        f'<article class="ip-info-card"><i class="bi {icon}" aria-hidden="true"></i><h3>{heading}</h3><p>{html.escape(point)}</p></article>'
        for icon, heading, point in zip(
            ["bi-search", "bi-file-earmark-check", "bi-check2-circle"],
            ["Review", "Prepare", "Complete"],
            category["points"],
        )
    )
    documents = "".join(f"<li>{html.escape(item)}</li>" for item in category["documents"])
    source_name, source_url = category["source"]
    structured = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Service", "@id": canonical + "#service",
                "name": f"{title} by Instant Professionals", "alternateName": seo_name,
                "serviceType": title, "description": description, "url": canonical,
                "provider": {"@id": SITE + "/#organization"},
                "areaServed": {"@type": "Country", "name": "India"},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "Services", "item": SITE + "/services.html"},
                    {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
                ],
            },
        ],
    }, ensure_ascii=False)
    return f"""<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>{html.escape(seo_name)} | Instant Professionals</title>
  <meta name="description" content="{html.escape(description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="website"><meta property="og:site_name" content="Instant Professionals">
  <meta property="og:title" content="{html.escape(seo_name)} | Instant Professionals"><meta property="og:description" content="{html.escape(description)}"><meta property="og:url" content="{canonical}">
  <meta property="og:image" content="{SITE}/assets/img/instant-professionals-logo-2026.png"><meta property="og:locale" content="en_IN">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="{html.escape(seo_name)} | Instant Professionals"><meta name="twitter:description" content="{html.escape(description)}"><meta name="theme-color" content="#071d3d">
  <link rel="icon" href="assets/img/favicon/favicon.ico"><link rel="apple-touch-icon" href="assets/img/favicon/apple-touch-icon.png">
  <link rel="stylesheet" href="assets/vendor/bootstrap-icons/bootstrap-icons.css"><link rel="stylesheet" href="assets/css/service-page-v3.css?v=20260820-mobile-1">
  <script type="application/ld+json" data-ip-seo-schema>{structured}</script>
</head>
<body>
{header_markup()}
<main id="main-content">
  <nav class="ip-breadcrumb ip-container" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">›</span><a href="services.html">Services</a><span aria-hidden="true">›</span><span aria-current="page">{html.escape(title)}</span></nav>
  <section class="ip-hero"><div class="ip-container ip-hero-grid"><div><span class="ip-eyebrow">INSTANT PROFESSIONALS • {category['label']}</span><h1>{html.escape(title)}</h1><p class="ip-lead">{html.escape(summary)}<span class="ip-seo-context">Instant Professionals supports this service across India with professional review and a confirmed scope.</span></p><div class="ip-trust"><span><i class="bi bi-person-check" aria-hidden="true"></i> Professional review</span><span><i class="bi bi-shield-check" aria-hidden="true"></i> Scope confirmed first</span><span><i class="bi bi-chat-square-text" aria-hidden="true"></i> Coordinated support</span></div></div>{form_markup(title, prices)}</div></section>
  <section class="ip-section"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">HOW WE HELP</span><h2>A clear, review-led process</h2><p>Applicability, forms, portal requirements and statutory timelines can change. We confirm the current position from your facts before filing or advising.</p></div><div class="ip-card-grid">{cards}</div></div></section>
  <section class="ip-section ip-section-alt"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">DOCUMENT CHECKLIST</span><h2>Information generally required</h2><p>The final checklist depends on the applicant, transaction and current portal requirements.</p></div><ul class="ip-list">{documents}</ul><div class="ip-source-note">Authoritative portal: <a href="{source_url}" target="_blank" rel="noopener">{html.escape(source_name)}</a>. The portal and applicable law prevail over general website information.</div></div></section>
{pricing_markup(prices).lstrip()}
  <section class="ip-section"><div class="ip-container"><div class="ip-section-head"><span class="ip-eyebrow">COMMON QUESTIONS</span><h2>Before we begin</h2></div><div class="ip-faq"><details><summary>What determines the final scope?</summary><p>The applicant type, facts, available records, pending defaults, notices and the required filing or deliverable determine the final scope.</p></details><details><summary>How long will the process take?</summary><p>We confirm an expected turnaround after document review. Government or portal processing time remains outside professional control.</p></details><details><summary>Are government charges included?</summary><p>Only when expressly stated in the written quotation. Government fees, taxes, stamp duty and third-party charges are otherwise additional.</p></details></div></div></section>
  <section class="ip-end-cta"><div class="ip-container ip-end-inner"><div><h2>Ready to discuss your requirement?</h2><p>Share the facts first. We will confirm the right scope before proceeding.</p></div><a class="ip-primary-button" href="#enquiry-title">Start an enquiry</a></div></section>
</main>
{footer_markup()}
</body></html>"""


def redirect_page(clean: str, title: str) -> str:
    target = html.escape(clean, quote=True)
    return f"""<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><title>Redirecting to {html.escape(title)} | Instant Professionals</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="{SITE}/{target}"><meta http-equiv="refresh" content="0; url={target}"><script>window.location.replace({json.dumps(clean)});</script></head><body><main><h1>{html.escape(title)}</h1><p>This service has moved to a cleaner address. <a href="{target}">Continue to {html.escape(title)}</a>.</p></main></body></html>"""


def policy_page(filename: str, title: str, sections: list[tuple[str, str]]) -> str:
    body = "".join(f"<h2>{html.escape(heading)}</h2><p>{text}</p>" for heading, text in sections)
    canonical = f"{SITE}/{filename}"
    return f"""<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><title>{html.escape(title)} | Instant Professionals</title><meta name="description" content="{html.escape(title)} for users and clients of Instant Professionals."><meta name="robots" content="index,follow"><link rel="canonical" href="{canonical}"><link rel="icon" href="assets/img/favicon/favicon.ico"><link rel="stylesheet" href="assets/vendor/bootstrap-icons/bootstrap-icons.css"><link rel="stylesheet" href="assets/css/service-page-v3.css?v=20260820-mobile-1"></head><body>{header_markup()}<main id="main-content" class="ip-container ip-policy"><span class="ip-eyebrow">POLICY</span><h1>{html.escape(title)}</h1><p><strong>Last updated:</strong> 18 August 2026</p>{body}</main>{footer_markup()}</body></html>"""


def update_homepage() -> None:
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    text = text.replace('<html lang="en">', '<html lang="en-IN">', 1)
    text = re.sub(r'<title>.*?</title>', '<title>Instant Professionals | GST, Trademark & Compliance Services</title>', text, count=1, flags=re.S)
    metadata = f"""
    <link rel="canonical" href="{SITE}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Instant Professionals" />
    <meta property="og:title" content="Instant Professionals | GST, Trademark & Compliance Services" />
    <meta property="og:description" content="Tax, corporate compliance, intellectual property and business advisory services across India." />
    <meta property="og:url" content="{SITE}/" />
    <meta property="og:image" content="{SITE}/assets/img/instant-professionals-logo-2026.png" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link href="assets/css/home-fixes.css?v=20260820-circle-gold-4" rel="stylesheet" />"""
    if 'rel="canonical"' not in text:
        text = text.replace("    <!-- Favicons -->", metadata + "\n\n    <!-- Favicons -->", 1)
    if 'class="skip-link"' not in text:
        text = text.replace("  <body>", '  <body>\n    <a class="skip-link" href="#main">Skip to main content</a>', 1)

    home_hero = f"""<section class="ip-home-hero ip-os-home" aria-labelledby="home-heading">
      <div class="ip-os-grid-bg" aria-hidden="true"></div>
      <div class="container ip-os-shell">
        <div class="ip-os-copy" data-aos="fade-up">
          <div class="ip-os-index"><img src="assets/img/instant-professionals-logo-2026.png" alt="Instant Professionals registered logo"><b>NEW-GENERATION COMPLIANCE PARTNER</b></div>
          <h1 id="home-heading">Compliance,<br><em>engineered around</em><br>your business.</h1>
          <p class="ip-os-lead">One professional relationship connecting corporate compliance, tax, audit, registrations, intellectual property and business advisory—structured around how your business operates.</p>
          <div class="ip-os-actions"><a class="ip-os-btn ip-os-btn-primary" href="#services">Explore services <i class="bi bi-arrow-right" aria-hidden="true"></i></a><a class="ip-os-btn ip-os-btn-ghost" href="#team">Meet our professionals</a></div>
          <div class="ip-os-credibility"><div><strong>2018</strong><span>Built on professional practice</span></div><div><strong>360°</strong><span>Compliance and advisory coverage</span></div><div><strong>1</strong><span>Coordinated professional relationship</span></div></div>
        </div>
        <aside class="ip-os-system" data-aos="fade-left" aria-label="Business compliance lifecycle">
          <div class="ip-os-system-top"><div><span>IP / OPERATING SYSTEM</span><small>BUSINESS COMPLIANCE LIFECYCLE</small></div><b>01—05</b></div>
          <div class="ip-os-core"><div class="ip-os-center"><img src="assets/img/instant-professionals-logo-2026.png" alt=""><small>COORDINATED<br>OVERSIGHT</small></div><div class="ip-os-track ip-os-track-1"><i>01</i><div><b>START</b><small>Registration &amp; setup</small></div></div><div class="ip-os-track ip-os-track-2"><i>02</i><div><b>RUN</b><small>Tax &amp; recurring compliance</small></div></div><div class="ip-os-track ip-os-track-3"><i>03</i><div><b>VERIFY</b><small>Audit, accounts &amp; controls</small></div></div><div class="ip-os-track ip-os-track-4"><i>04</i><div><b>PROTECT</b><small>IPR &amp; documentation</small></div></div><div class="ip-os-track ip-os-track-5"><i>05</i><div><b>GROW</b><small>Advisory &amp; business support</small></div></div></div>
          <div class="ip-os-system-foot"><span>Clarity</span><span>Control</span><span>Continuity</span></div>
        </aside>
      </div>
      <div class="container ip-os-bottom"><span>INSTANT PROFESSIONALS</span><p>Professional judgement <i></i> Practical execution <i></i> Long-term support</p></div>
    </section>

    <!-- End Hero -->"""
    text = re.sub(r'<div\s+id="carouselExampleCaptions".*?<!-- End Hero -->', home_hero, text, count=1, flags=re.S)

    about = """<p>Instant Professionals is a multidisciplinary platform managed by experienced Chartered Accountants, Company Secretaries, Cost and Management Accountants, and legal professionals. Founded in 2018, we provide registrations, licences, financial reporting, tax planning, labour-law compliance, intellectual-property protection and business advisory services across India. We differentiate ourselves through transparent pricing, defined turnaround times and dedicated Compliance Managers.</p><p>With more than 1,100 clients, we support startups, MSMEs, professionals and established businesses through coordinated professional services under one roof.</p>"""
    text = re.sub(r'<div class="row content" data-aos="fade-up">.*?</div>\s*</div>\s*</section>', f'<div class="row content" data-aos="fade-up"><div class="col-lg-12">{about}</div></div></div></section>', text, count=1, flags=re.S)

    contact_panel = f"""<div class="col-lg-5" data-aos="fade-right"><div class="ip-home-contact-card"><span>CONTACT</span><h3>Talk to a professional</h3><p>Discuss the facts, timelines and required outcome with our team before engagement.</p><ul><li><i class="bi bi-telephone" aria-hidden="true"></i><a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a></li><li><i class="bi bi-envelope" aria-hidden="true"></i><a href="mailto:{EMAIL}">{EMAIL}</a></li><li><i class="bi bi-whatsapp" aria-hidden="true"></i><a href="https://wa.me/918209785294" target="_blank" rel="noopener">WhatsApp</a></li></ul><p class="ip-home-contact-note">Serving businesses and professionals across India.</p></div></div>"""
    text = re.sub(r'<div class="col-lg-5" data-aos="fade-right">\s*<iframe.*?</iframe>\s*</div>', contact_panel, text, count=1, flags=re.S)

    home_form = """<form class="ip-enquiry-form ip-home-form" data-service="General website enquiry"><input type="hidden" name="service" value="General website enquiry"><div class="form-group"><label for="home-name">Name</label><input id="home-name" type="text" name="name" class="form-control" autocomplete="name" required></div><div class="form-group mt-3"><label for="home-phone">Phone</label><input id="home-phone" type="tel" name="phone" class="form-control" autocomplete="tel" inputmode="tel" required></div><div class="form-group mt-3"><label for="home-email">Email</label><input id="home-email" type="email" name="email" class="form-control" autocomplete="email"></div><div class="form-group mt-3"><label for="home-package">Service area</label><select id="home-package" name="package" class="form-control"><option value="General enquiry">General enquiry</option><option value="GST and indirect tax">GST and indirect tax</option><option value="Income tax and TDS">Income tax and TDS</option><option value="Corporate and secretarial">Corporate and secretarial</option><option value="Intellectual property">Intellectual property</option><option value="Workforce compliance">Workforce compliance</option></select></div><div class="form-group mt-3"><label for="home-message">Message</label><textarea id="home-message" class="form-control" name="message" rows="5"></textarea></div><label class="ip-home-consent"><input type="checkbox" name="consent" required><span>I agree to be contacted about this enquiry and have read the <a href="privacy-policy.html">Privacy Policy</a>.</span></label><div class="text-center"><button type="submit"><i class="bi bi-whatsapp" aria-hidden="true"></i> Send enquiry on WhatsApp</button></div><p class="ip-form-status" role="status" aria-live="polite"></p><p class="ip-home-privacy">Nothing is sent until you confirm the message in WhatsApp.</p></form>"""
    text = re.sub(r'<form\s+action="https://script\.google\.com/.*?</form>', home_form, text, count=1, flags=re.S)

    service_links = {
        "INDIRECT TAX": route("GSTreturns.html"), "LITIGATION": route("trademark-objections.html"),
        "TAX": route("incometaxreturns.html"), "GST ADVISORY": route("GST Registration.html"),
        "TRANSACTION ADVISORY": route("sharetransfer&transmission.html"), "TAX & COMPLIANCE": route("companyannualfilling.html"),
    }
    for label, href in service_links.items():
        text = re.sub(rf'<a href="\s*">\s*{re.escape(label)}\s*</a>', f'<a href="{href}">{label}</a>', text, flags=re.I)
    for old, (clean, _title, _cat, _summary) in CATALOG.items():
        text = text.replace(f'href="{old}"', f'href="{clean}"')
    link_repairs = {
        'href="changein din.html"': 'href="change-din-particulars.html"',
        '>ADD/Remove a Partner in LLP<': '>Add or Remove an LLP Partner<',
        '>Removal/Registration of Director<': '>Director Resignation or Removal<',
        '>Increase in Authirized Capital<': '>Increase in Authorised Capital<',
        '>GST LUT Letter Of understaking<': '>GST Letter of Undertaking (LUT)<',
        '>Commencement of Business (INC 2OA) Filling<': '>Commencement of Business Filing<',
        '>Trademark Assignent<': '>Trademark Assignment<',
        '>Tradenark opposition<': '>Trademark Opposition<',
        '>Trademark Restification<': '>Trademark Rectification<',
        '<a href="">Download Library</a>': '<a href="#contact">Legal drafting enquiry</a>',
        '<a href="">Customized Drafting</a>': '<a href="#contact">Custom drafting enquiry</a>',
        '<a href="">GOODS AND SERVICES TAX</a>': '<a href="gst-registration.html">GOODS AND SERVICES TAX</a>',
    }
    for old_text, new_text in link_repairs.items():
        text = text.replace(old_text, new_text)
    dropdown_targets = iter(["gst-registration.html", "gst-returns.html", "company-annual-filing.html", "trademark-registration.html"])
    text = re.sub(r'<a href="#">(\s*<span>(?:Registration|Returns|Compliances|Trademark &amp; other IPRs|Trademark & other IPRs)</span>)', lambda match: f'<a href="{next(dropdown_targets)}">{match.group(1)}', text)
    carousel_alts = {
        "image-1.jpg": "Professional business compliance support",
        "image-2.jpg": "Tax and filing advisory services",
        "image-3.jpg": "Coordinated corporate compliance",
        "image-4.jpg": "Business registration assistance",
        "image-5.jpg": "Professional documentation review",
        "image-6.jpg": "Intellectual-property advisory support",
        "image-7.png": "Instant Professionals advisory team",
    }
    for filename, alt_text in carousel_alts.items():
        text = re.sub(rf'(src="\.?/?assets/img/top-section/{re.escape(filename)}"[^>]*?alt=")[^"]*(")', rf'\1{alt_text}\2', text)
    text = re.sub(r'<img(?![^>]*\balt=)([^>]*?)>', r'<img alt=""\1>', text, flags=re.I)
    text = re.sub(r'alt="\.\.\."', 'alt=""', text)
    text = re.sub(r'(<img[^>]+class="[^"]*(?:member-img|team|testimonial)[^"]*"[^>]*?)alt=""', r'\1alt="Instant Professionals team member"', text, flags=re.I)
    platform_names = {"twitter": "X (Twitter)", "facebook": "Facebook", "instagram": "Instagram", "linkedin": "LinkedIn"}
    def label_social_link(match: re.Match[str]) -> str:
        opening, body, platform = match.groups()
        if "aria-label=" in opening:
            return match.group(0)
        return f'<a{opening} aria-label="{platform_names[platform.lower()]} profile">{body}</a>'
    text = re.sub(r'<a([^>]*?)>\s*(<i[^>]+(?:bi|bxl)-(twitter|facebook|instagram|linkedin)[^>]*>.*?</i>)\s*</a>', label_social_link, text, flags=re.I | re.S)
    for platform, accessible in platform_names.items():
        text = re.sub(
            rf'<a(?![^>]*aria-label)([^>]*href="[^"]*{re.escape(platform)}[^"]*"[^>]*)>',
            rf'<a\1 aria-label="{accessible} profile">',
            text,
            flags=re.I,
        )
    text = re.sub(r'(href="https?://[^"]*?)\s+("[^>]*>)', r'\1\2', text)
    text = text.replace('https://www.facebook.com/Instantprofessional/', 'https://www.facebook.com/instantprofessionals')
    text = text.replace('class="twitter"\n                ><i class="bx bxl-linkedin"></i', 'class="twitter" aria-label="LinkedIn"\n                ><i class="bx bxl-linkedin" aria-hidden="true"></i')
    text = text.replace('class="facebook"\n                ><i class="bx bxl-facebook"></i', 'class="facebook" aria-label="Facebook"\n                ><i class="bx bxl-facebook" aria-hidden="true"></i')
    text = text.replace('class="instagram"\n                ><i class="bx bxl-instagram"></i', 'class="instagram" aria-label="Instagram"\n                ><i class="bx bxl-instagram" aria-hidden="true"></i')
    text = text.replace('<b>L:</b>', '<b>Landline:</b>').replace('<b>W:</b>', '<b>WhatsApp:</b>').replace('<b>E:</b>', '<b>Email:</b>')
    home_footer = f"""<footer id="footer" class="ip-home-footer">
      <div class="container ip-home-footer-grid">
        <div><a class="ip-home-footer-brand" href="index.html"><img src="assets/img/instant-professionals-logo-2026.png" alt="Instant Professionals registered logo"><span>Instant Professionals</span></a><p>Coordinated compliance, tax, corporate and intellectual-property support for businesses and professionals across India.</p><div class="ip-home-footer-social"><a href="https://www.linkedin.com/company/instantprofessionals" target="_blank" rel="noopener">LinkedIn</a><a href="https://www.facebook.com/instantprofessionals" target="_blank" rel="noopener">Facebook</a><a href="https://www.instagram.com/instantprofessional/" target="_blank" rel="noopener">Instagram</a></div></div>
        <div><h2>Popular services</h2><ul><li><a href="gst-registration.html">GST Registration</a></li><li><a href="income-tax-return-filing.html">Income Tax Returns</a></li><li><a href="company-annual-filing.html">Company Annual Filing</a></li><li><a href="trademark-registration.html">Trademark Registration</a></li></ul></div>
        <div><h2>Policies</h2><ul><li><a href="privacy-policy.html">Privacy Policy</a></li><li><a href="terms.html">Terms of Service</a></li><li><a href="refund-policy.html">Refund and Cancellation</a></li><li><a href="sitemap.xml">Sitemap</a></li></ul></div>
        <div><h2>Contact</h2><p><a href="tel:{PHONE_LINK}">{PHONE_DISPLAY}</a></p><p><a href="mailto:{EMAIL}">{EMAIL}</a></p><p>Serving clients across India</p></div>
      </div><div class="container ip-home-footer-bottom">© 2026 Instant Professionals. Professional scope and statutory applicability are confirmed at engagement.</div>
    </footer>
    <!-- End Footer -->"""
    text = re.sub(r'<footer id="footer">.*?<!-- End Footer -->', home_footer, text, count=1, flags=re.S)
    text = text.replace('href="#"\n      class="back-to-top', 'href="#main"\n      aria-label="Back to top"\n      class="back-to-top')
    text = text.replace('href="//api.whatsapp.com/send?phone=918209785294&text=Hello,I am connecting to Instant Professional."\n      class="whatsapp-float"', 'href="https://wa.me/918209785294?text=Hello%2C%20I%20am%20contacting%20Instant%20Professionals."\n      target="_blank"\n      rel="noopener"\n      aria-label="Contact Instant Professionals on WhatsApp"\n      class="whatsapp-float"')
    text = text.replace("has a vide range", "has a wide range")
    text = text.replace("complex tax casesr", "complex tax cases")
    text = text.replace("Monthly/ Quarterly Compliances", "Monthly and quarterly compliance")
    text = re.sub(r'\s*<!--.*?-->', '', text, flags=re.S)
    text = text.replace('    <link href="assets/css/home-fixes.css?v=20260820-circle-gold-4" rel="stylesheet" />\n', '')
    text = text.replace('    <link href="assets/css/style.css" rel="stylesheet" />', '    <link href="assets/css/style.css" rel="stylesheet" />\n    <link href="assets/css/home-fixes.css?v=20260820-circle-gold-4" rel="stylesheet" />', 1)
    if 'assets/js/enquiry.js' not in text:
        text = text.replace('    <script src="assets/js/main.js"></script>', '    <script src="assets/js/main.js"></script>\n    <script src="assets/js/enquiry.js" defer></script>')
    path.write_text(text, encoding="utf-8")


def update_shared_files() -> None:
    main = ROOT / "assets/js/main.js"
    text = main.read_text(encoding="utf-8")
    text = text.replace("loadCurrentLaw();", "// Current-law content is now generated statically on service pages.")
    text = text.replace("const SERVICE_RATE_MULTIPLIER=2.5;", "const SERVICE_RATE_MULTIPLIER=1;")
    text = text.replace('photo:"assets/img/team/live/sachin.jpg"', 'photo:"assets/img/team/live/sachin.jpg"')
    text = text.replace('name:"Sachin",role:', 'name:"Sachin",role:').replace('name:"Sachin",role:"Team Professional",experience:"Professional Support",initials:"S",', 'name:"Sachin",role:"Team Professional",experience:"Professional Support",photo:"assets/img/team/live/sachin.jpg",')
    text = text.replace('href="#contact"><i class="bi bi-whatsapp"></i><span>WhatsApp</span>', 'href="https://wa.me/918209785294" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i><span>WhatsApp</span>')
    for old, (clean, _title, _cat, _summary) in CATALOG.items():
        text = text.replace(old, clean)
    main.write_text(text, encoding="utf-8")

    vision = ROOT / "assets/css/vision-2.css"
    css = vision.read_text(encoding="utf-8")
    css = css.replace("--ip-green:#3f8f4d", "--ip-green:#176b35").replace("--ip-gold:#c28a32", "--ip-gold:#8a5b12")
    css = css.replace("#3f8f4d", "#176b35").replace("#6b7986", "#596a78").replace("#687787", "#596a78")
    if "/* ip-accessibility-v3 */" not in css:
        css += "\n/* ip-accessibility-v3 */\n.ip-profile-placeholder{display:grid;width:100%;height:320px;min-height:320px;place-items:center;background:linear-gradient(135deg,#eaf5ed,#eef3f7);color:#176b35;font-size:52px;font-weight:850;letter-spacing:-.04em}.ip-profile-role,.ip-team-eyebrow,.ip-social-kicker,.ip-service-kicker{color:#8a5b12!important}@media(max-width:991px){.ip-profile-placeholder{height:340px;min-height:340px}}@media(max-width:575px){.ip-profile-placeholder{height:320px;min-height:320px}.ip-os-copy h1{font-size:2.45rem}}\n"
    vision.write_text(css, encoding="utf-8")


def write_policies() -> None:
    policies = {
        "privacy-policy.html": ("Privacy Policy", [
            ("Information we collect", "We collect information that you voluntarily provide, such as your name, phone number, email address, service requirement and supporting documents shared during an engagement."),
            ("How information is used", "Information is used to respond to enquiries, provide professional services, meet legal or regulatory obligations, maintain engagement records and improve service delivery."),
            ("WhatsApp enquiries", "Website enquiry forms prepare a WhatsApp message for your review. Nothing is transmitted through the website form until you choose to send that message in WhatsApp."),
            ("Sharing and retention", "Information is shared only with authorised team members, professional advisers, service providers or authorities where necessary for the engagement or required by law. Records are retained for the period reasonably required for those purposes."),
            ("Your choices", f"To request access, correction or deletion, subject to professional and legal retention duties, contact <a href=\"mailto:{EMAIL}\">{EMAIL}</a>."),
        ]),
        "terms.html": ("Terms of Service", [
            ("Website information", "Website content is general information and is not a substitute for advice based on complete facts. Applicable law, forms, portal requirements, fees and timelines may change."),
            ("Engagement", "A professional engagement begins only after scope, responsibility, fees, exclusions and required documents are confirmed in writing."),
            ("Client responsibility", "Clients are responsible for providing complete, accurate and timely information and for reviewing drafts or confirmations before filing or submission."),
            ("Third-party systems", "Government portals, banks, payment providers and other third-party systems operate independently. Their availability and processing timelines are outside our control."),
        ]),
        "refund-policy.html": ("Refund and Cancellation Policy", [
            ("Before work begins", "A cancellation request received before substantive work begins may be eligible for refund after deduction of payment-processing or work-allocation costs, if any."),
            ("After work begins", "Professional fees relating to review, drafting, consultation, filing preparation or other work already performed are not refundable. Unused third-party or government charges may be refundable only if they have not been incurred."),
            ("Government rejection or delay", "A filing rejection, resubmission, objection or delay by an authority does not automatically create a refund entitlement where the agreed professional work has been performed."),
            ("How to request", f"Send the engagement reference and reason to <a href=\"mailto:{EMAIL}\">{EMAIL}</a>. Each request is reviewed against the written scope and work completed."),
        ]),
    }
    for filename, (title, sections) in policies.items():
        (ROOT / filename).write_text(policy_page(filename, title, sections), encoding="utf-8")


def write_technical_files() -> None:
    clean_routes = sorted({data[0] for data in CATALOG.values()})
    specialist = ["cma-project-report.html", "accounting-bookkeeping.html", "virtual-cfo.html", "tax-notice-response.html"]
    pages = ["", "services.html", *specialist, *clean_routes, "privacy-policy.html", "terms.html", "refund-policy.html"]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for page in pages:
        changefreq, priority = ("monthly", "0.8")
        if page == "":
            changefreq, priority = ("weekly", "1.0")
        elif page == "services.html":
            changefreq, priority = ("weekly", "0.9")
        elif page in {"privacy-policy.html", "terms.html", "refund-policy.html"}:
            changefreq, priority = ("yearly", "0.3")
        sitemap.append(f"  <url><loc>{SITE}/{page}</loc><lastmod>2026-08-20</lastmod><changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>")
    sitemap.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(sitemap) + "\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    (ROOT / "404.html").write_text(f"""<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><title>Page not found | Instant Professionals</title><meta name="robots" content="noindex"><link rel="stylesheet" href="assets/css/service-page-v3.css?v=20260820-mobile-1"></head><body>{header_markup()}<main id="main-content" class="ip-container ip-policy"><span class="ip-eyebrow">404</span><h1>Page not found</h1><p>The address may have changed during our website quality upgrade.</p><p><a class="ip-primary-button" href="index.html#services">Browse services</a></p></main>{footer_markup()}</body></html>""", encoding="utf-8")
    for obsolete in ("form.html", "inner-page.html", "pdflist.html", "portfolio-details.html"):
        (ROOT / obsolete).write_text(redirect_page("index.html", "Instant Professionals"), encoding="utf-8")


def main() -> None:
    for old, (clean, title, _category, _summary) in CATALOG.items():
        (ROOT / clean).write_text(service_page(old), encoding="utf-8")
        if old != clean:
            (ROOT / old).write_text(redirect_page(clean, title), encoding="utf-8")
    write_policies()
    write_technical_files()
    update_homepage()
    update_shared_files()
    print(f"Generated {len(CATALOG)} audited service pages and {sum(1 for old, data in CATALOG.items() if old != data[0])} compatibility redirects.")


if __name__ == "__main__":
    main()
