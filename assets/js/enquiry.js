(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918209785294";

  const GA_MEASUREMENT_ID = "G-TG0272S260";

  function loadGoogleAnalytics() {
    if (window.__ipGoogleAnalyticsId === GA_MEASUREMENT_ID) return;

    const existingTag = document.querySelector(
      'script[src*="googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID + '"]'
    );
    if (existingTag && typeof window.gtag === "function") {
      window.__ipGoogleAnalyticsId = GA_MEASUREMENT_ID;
      return;
    }

    window.__ipGoogleAnalyticsId = GA_MEASUREMENT_ID;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);

    if (!existingTag) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
      document.head.appendChild(script);
    }
  }

  function trackAnalyticsEvent(name, parameters) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, parameters || {});
  }

  function analyticsService(values) {
    return String((values && (values.package || values.service)) || "General enquiry").slice(0, 100);
  }

  function bindAnalyticsLinks() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const href = String(link.getAttribute("href") || "");

      if (/^(?:https?:\/\/)?(?:api\.)?wa\.me\//i.test(href) || /whatsapp\.com/i.test(href)) {
        trackAnalyticsEvent("whatsapp_click", {
          link_url: link.href,
          page_location: window.location.href
        });
      } else if (/^tel:/i.test(href)) {
        trackAnalyticsEvent("phone_click", {
          page_location: window.location.href
        });
      } else if (/^mailto:/i.test(href)) {
        trackAnalyticsEvent("email_click", {
          page_location: window.location.href
        });
      }
    });
  }


  function buildWhatsAppMessage(values) {
    const fields = [
      "Hello, I would like assistance from Instant Professionals.",
      "",
      "Service: " + (values.package || values.service || "General enquiry"),
      "Name: " + (values.name || ""),
      "Phone: " + (values.phone || "Not provided"),
      "Email: " + (values.email || "Not provided"),
      "Preferred contact: " + (values.preferredContact || "No preference"),
      "Message: " + (values.message || "Please contact me with the next steps.")
    ];
    return fields.join("\n");
  }

  function buildWhatsAppUrl(values) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildWhatsAppMessage(values));
  }

  function hasOnlineContact(values) {
    return Boolean(String(values.email || "").trim() || String(values.phone || "").trim());
  }

  function isValidSheetEndpoint(endpoint) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(endpoint || "").trim());
  }

  const enquiryApi = {
    buildWhatsAppMessage,
    buildWhatsAppUrl,
    hasOnlineContact,
    isValidSheetEndpoint
  };

  if (typeof module !== "undefined" && module.exports) module.exports = enquiryApi;
  if (typeof window !== "undefined") window.InstantProfessionalsEnquiry = enquiryApi;
  if (typeof document === "undefined") return;

  loadGoogleAnalytics();

  const SERVICE_FAQS = {
    "appointment-of-auditor.html": [
      ["What is reviewed before an auditor appointment is filed?", "We review the vacancy or appointment context, the proposed auditor's consent and eligibility, the required corporate approvals and the applicable MCA filing. Appointment, reappointment, casual vacancy and resignation situations do not all follow the same route."],
      ["Does filing the form complete every compliance step?", "Not always. The company should also preserve the consent, eligibility certificate, board or member approvals and updated statutory records that support the filing." ]
    ],
    "commencement-of-business.html": [
      ["Which companies need a commencement-of-business declaration?", "Applicability depends on the company's incorporation date, share-capital status and current law. We verify whether the declaration applies before preparing the filing."],
      ["What evidence is normally checked?", "We generally review subscriber capital receipts, bank evidence, incorporation records, registered-office status and the authorised signatory's digital signature before filing." ]
    ],
    "copyright-application.html": [
      ["Does copyright exist only after registration?", "Copyright may arise automatically when an eligible original work is created, subject to law. Registration creates an official record and can support proof, but it does not cure lack of originality or ownership."],
      ["What material should be provided for an application?", "The work, applicant and author details, publication status, ownership or assignment records, no-objection documents where applicable, and a clear description of the work are normally reviewed." ]
    ],
    "digital-marketing.html": [
      ["What is included in a digital-marketing engagement?", "The written scope should identify channels, campaign objectives, deliverables, content responsibility, approval stages, reporting frequency and advertising budgets. These are not assumed from the package name alone."],
      ["Are media spend and platform charges included?", "No, unless the quotation expressly says so. Advertising spend, software, stock assets, influencers and other third-party costs are normally paid separately." ]
    ],
    "din-application.html": [
      ["Is DIN obtained through the same form in every case?", "No. A first director may obtain DIN through an incorporation filing, while an existing company proposing another director may use the applicable DIN application process. We confirm the correct route from the facts."],
      ["What is checked before filing?", "Identity and address proofs, eligibility, existing DIN records, proposed appointment details, digital signatures and professional certification requirements are reviewed before submission." ]
    ],
    "dissolution-of-firm.html": [
      ["Can a partnership be closed by signing a dissolution deed alone?", "The deed records the partners' agreement, but bank accounts, assets, liabilities, employees, contracts, tax registrations and other licences may also require settlement or closure."],
      ["What should be agreed between the partners?", "The effective date, settlement of capital and current accounts, allocation of assets and liabilities, collection of debts, custody of records and responsibility for pending proceedings should be addressed." ]
    ],
    "esi-returns.html": [
      ["What records are needed for ESI compliance?", "Employee master data, attendance, wage components, contribution calculations, joiners and exits, challans and earlier portal records are reconciled for the relevant contribution period."],
      ["Are all payments to employees treated the same way?", "No. Contribution treatment depends on the nature of each wage component and current ESI law. Unusual payments should be reviewed before the contribution file is finalised." ]
    ],
    "gst-registration-amendment.html": [
      ["What is the difference between core and non-core GST amendments?", "Core fields generally require tax-officer approval, while permitted non-core changes may update after authenticated filing. The portal classification and supporting documents depend on the field being changed."],
      ["Can a change in PAN be handled as an amendment?", "A change that results in a different PAN generally cannot be treated as an ordinary amendment. The correct registration route must be reviewed from the business restructuring facts." ]
    ],
    "gst-registration.html": [
      ["When should a business examine GST registration?", "Registration should be reviewed against turnover, State or Union Territory, nature of supply, compulsory-registration provisions and any exemption or special category. Turnover alone is not the only test."],
      ["What proof is accepted for the principal place of business?", "The GST Portal lists constitution and premises documents according to whether the property is owned, rented, leased, consent-based or shared. The application should match the legal name, PAN and actual occupancy arrangement." ]
    ],
    "gst-lut.html": [
      ["Who may furnish a Letter of Undertaking?", "An eligible registered person making zero-rated supplies without payment of integrated tax may furnish an LUT, subject to the statutory conditions and current portal process."],
      ["Does an LUT replace GST returns or export evidence?", "No. LUT is one part of the compliance position. Invoices, export realisation or receipt evidence, returns and other zero-rated-supply records must still be maintained as applicable." ]
    ],
    "gst-returns.html": [
      ["Which records should be reconciled before GST returns are filed?", "Sales registers, tax invoices, debit and credit notes, e-invoice and e-way bill data, purchase records, input-tax-credit statements, reverse-charge items and the general ledger should be compared as relevant."],
      ["Can a return be filed if the books are incomplete?", "The portal may technically accept a filing, but incomplete records can create tax, interest, credit and disclosure risks. We first identify gaps and agree how exceptions will be handled." ]
    ],
    "international-trademark-registration.html": [
      ["Is one international application valid in every country?", "No. An international filing designates selected Madrid System members, and each designated office applies its own law when examining protection."],
      ["Is an Indian application or registration required first?", "A Madrid application filed through India generally relies on an eligible basic Indian application or registration and the applicant's entitlement to use India as the office of origin." ]
    ],
    "logo-design.html": [
      ["Will the final logo files be suitable for print and digital use?", "The agreed handover should identify the supplied vector and raster formats, colour variants, usage guidance and any font or stock-asset licensing limitations."],
      ["Does logo design include trademark clearance?", "No, unless specifically included. Creative design, trademark searching and legal registrability review are separate workstreams and should be scoped separately." ]
    ],
    "moa-aoa-amendment.html": [
      ["Can the MOA or AOA be changed by a board decision alone?", "Many amendments require member approval and an MCA filing; some also require additional regulatory approval. The exact process depends on the clause and the company."],
      ["What is checked before drafting the amendment?", "We review the existing constitutional documents, proposed business or governance change, applicable approvals, filing history and whether other registrations or agreements are affected." ]
    ],
    "moa-aoa-printing.html": [
      ["Which version of the MOA and AOA should be printed?", "The latest effective documents should include all approved amendments and match the company's MCA records. A historic incorporation copy may no longer be current."],
      ["Is certified or bound printing the same as legal review?", "No. Printing and certification format do not by themselves confirm that every amendment or filing has been validly completed. Legal and secretarial review is separate." ]
    ],
    "udyam-registration.html": [
      ["Is there a government fee for Udyam registration?", "The official Udyam portal states that government registration is free. Our displayed amount is a professional assistance fee for classification review, data validation and application support—not a government registration charge."],
      ["What information is used for Udyam registration?", "Aadhaar, PAN and GST-linked information is used as applicable, together with business activity and classification details. The enterprise should use only the official Government of India portal for the registration record." ]
    ],
    "pan-application.html": [
      ["Should I apply for a new PAN or request a correction?", "A person should not obtain multiple PANs. We first check whether the requirement is a new allotment, correction, reprint or surrender of an additional PAN."],
      ["Do document requirements differ by applicant type?", "Yes. Individuals, companies, firms, trusts and non-residents may require different identity, address, date-of-birth, incorporation and representative-assessee documents." ]
    ],
    "roc-search-report.html": [
      ["What does an ROC search report cover?", "It summarises selected MCA master data and public filings, such as incorporation details, directors, charges and filing history, within the agreed search date and scope."],
      ["Is an ROC search report a guarantee of all company liabilities?", "No. It is limited to accessible records and may not reveal unfiled events, contractual liabilities, litigation outside the search scope or information recorded with other authorities." ]
    ],
    "tan-application.html": [
      ["Who generally needs a TAN?", "A person responsible for deducting or collecting tax generally requires TAN unless a specific legal exception permits use of PAN. Applicability should be confirmed before applying."],
      ["Is a separate TAN needed for every branch?", "It depends on how deduction, payment and reporting responsibilities are organised. We review the deductor structure and existing TAN records before recommending a fresh application." ]
    ],
    "trademark-assignment.html": [
      ["Does signing an assignment deed automatically update the Trade Marks Registry?", "The deed transfers rights according to its terms, but the change should also be recorded through the prescribed Registry process with the supporting instrument and evidence."],
      ["What issues are checked before assignment?", "Ownership, application or registration status, covered classes, goodwill, territorial scope, consideration, stamp duty, pending proceedings and any licences or security interests should be reviewed." ]
    ],
    "trademark-opposition.html": [
      ["When can a trademark opposition be filed?", "An opposition is filed after publication of the application and within the statutory period shown in the Registry record. The exact deadline should be checked immediately because delay can affect the available remedy."],
      ["Is opposition only a written objection?", "No. It is a contested proceeding that can involve pleadings, counterstatement, evidence, hearings and settlement discussions. Each stage has separate procedural requirements." ]
    ],
    "trademark-registration.html": [
      ["Does a trademark search guarantee registration?", "No. A search helps identify obvious conflicts, but the Registry may raise absolute or relative grounds and third parties may oppose the application. A result cannot be guaranteed."],
      ["Why does the correct class matter?", "Trademark protection is connected to the goods or services claimed. The actual business, intended use and appropriate classification should be reviewed before filing; one application may require more than one class." ]
    ],
    "add-a-director.html": [
      ["What must be checked before appointing a director?", "DIN status, consent, eligibility and disqualification, interest disclosures, digital signature, the company's articles and the required board or member approval should be reviewed."],
      ["When does the appointment become effective?", "The effective date follows the valid corporate approval and applicable law; the MCA filing records the event. A filing acknowledgement should be retained with the underlying minutes and consents." ]
    ],
    "add-remove-llp-partner.html": [
      ["Is partner consent enough to change an LLP's partners?", "The LLP agreement and law determine the approval, but consent, partner-change filing and an amended or supplementary LLP agreement are normally required."],
      ["What happens to capital and profit-sharing ratios?", "Admission or cessation may require settlement of capital, contribution, profit share, drawings, liabilities and indemnities. These commercial terms should be documented, not assumed." ]
    ],
    "change-registered-office.html": [
      ["Does every registered-office change follow the same process?", "No. A move within local limits, outside local limits, between Registrar jurisdictions or between States can require different approvals, notices and filings."],
      ["What address evidence is normally reviewed?", "Ownership or occupancy proof, owner consent where applicable, a recent utility bill, board or member approvals and details of any creditor or regulatory process are reviewed according to the route." ]
    ],
    "change-llp-agreement.html": [
      ["When should an LLP agreement be amended?", "Changes to contribution, profit sharing, business, rights, duties, management or partner arrangements should be compared with the existing agreement and documented as required."],
      ["Are stamp duty and MCA filing the same charge?", "No. Stamp duty is governed by the applicable State framework, while MCA filing fees and additional fees arise under the LLP filing process. Both may need consideration." ]
    ],
    "change-din-particulars.html": [
      ["Which DIN details can be updated?", "Permitted personal particulars such as name, address, contact or citizenship details may be updated with the prescribed proof. The exact form and verification depend on the change."],
      ["Does a DIN update replace annual KYC?", "No. Updating particulars and completing the applicable DIN-holder KYC are separate obligations. Both statuses should be checked." ]
    ],
    "company-annual-filing.html": [
      ["Which company records are needed for annual filing?", "Signed financial statements, audit and board reports where applicable, annual-return information, member and director data, meeting records and the year's event-based filings should be reconciled."],
      ["Can annual forms be prepared independently of the accounts?", "The annual return and financial-statement filing are separate forms, but key data must agree. Differences in capital, members, directors, turnover or events should be resolved before filing." ]
    ],
    "company-name-change.html": [
      ["Does name approval itself change the company's legal name?", "No. Name reservation is an initial step. The company must complete the required approvals, constitutional amendments and MCA filing before the change is evidenced by an updated certificate."],
      ["What should be reviewed before applying for a name?", "Availability, trademark conflicts, regulated words, business objects, domain and brand use, lender or regulator consents and the company's filing status should be checked." ]
    ],
    "digital-signature-certificate.html": [
      ["Which class and type of DSC is needed?", "The required signing or encryption certificate depends on the portal and transaction. We confirm the user's role, validity requirement, identity process and token or cloud-signing arrangement before application."],
      ["Can another person use my DSC and token?", "No. A DSC is linked to the subscriber and should remain under that person's control. Private keys, token PINs and authentication credentials must not be shared." ]
    ],
    "dir-3-kyc.html": [
      ["Who needs to complete DIN-holder KYC?", "DIN holders covered by the applicable MCA KYC rules must complete the prescribed annual process, including the correct form or web verification based on their circumstances."],
      ["What happens if KYC is not completed?", "The DIN may be marked as deactivated for non-filing and a fee may apply for later activation. Current status and form eligibility should be checked on MCA before filing." ]
    ],
    "epf-registration.html": [
      ["Is EPF coverage decided only by employee count?", "Employee strength is important, but establishment type, excluded employees, common ownership or control, voluntary coverage and other statutory facts can affect applicability."],
      ["What data is required for establishment registration?", "Constitution and address records, ownership or management details, bank information, employee strength and wage data, existing registrations and authorised-signatory details are generally reviewed." ]
    ],
    "esic-registration.html": [
      ["How is ESIC applicability reviewed?", "We examine the establishment category, notified area, employee strength, wage data and any branch or common-management facts under the current coverage rules."],
      ["What should be ready before employees are registered?", "Accurate employee identity, family, joining, wage, bank and contact information should agree with payroll and establishment records." ]
    ],
    "gst-cancellation.html": [
      ["Does cancellation remove earlier GST liabilities?", "No. Cancellation does not erase tax, interest, late fee, return or record obligations for the period in which the registration was active."],
      ["What is checked before a cancellation application?", "Reason and effective date, pending returns, stock and input-tax-credit implications, outstanding demand, registrations in other States and final-return requirements are reviewed." ]
    ],
    "iec-modification.html": [
      ["Which IEC details can be modified?", "Permitted changes to business, address, branch, contact and bank information can be updated through the DGFT profile, subject to PAN-linked and supporting records."],
      ["Should IEC details be reviewed even if nothing changed?", "DGFT may require periodic online confirmation or updating of IEC particulars. The current portal requirement and IEC status should be checked directly." ]
    ],
    "iec-registration.html": [
      ["Is a separate IEC required for every branch?", "IEC is generally PAN-based for the applicant entity, so branches are ordinarily handled within the same profile rather than through multiple IECs."],
      ["What information is checked for an IEC application?", "PAN-linked entity details, address, constitution, authorised signatory, bank account and supporting proof should be consistent across the DGFT profile and source records." ]
    ],
    "income-tax-return-filing.html": [
      ["How is the correct income-tax return form selected?", "Selection depends on taxpayer type, residential status, sources of income, business or profession, capital gains, foreign assets, directorship and other disclosures. The simplest form is not always the correct form."],
      ["Are Form 26AS and AIS enough to prepare the return?", "No. They are important reconciliation sources, but the taxpayer must also provide complete income, deduction, asset, liability and transaction records. Missing information is not automatically excused because it does not appear in AIS." ]
    ],
    "increase-authorised-capital.html": [
      ["Can a company issue shares beyond its authorised capital?", "The authorised-capital limit and articles should be checked before an issue. If an increase is required, the company must complete the applicable approvals and MCA filing first."],
      ["Why can government fees vary?", "MCA filing and stamp-related charges can depend on the existing and proposed capital, company details and State. We calculate statutory charges after reviewing the master data and proposed increase." ]
    ],
    "llp-annual-filing.html": [
      ["Which annual filings generally apply to an LLP?", "An LLP ordinarily files an annual return and a statement of account and solvency through the applicable MCA forms, with certification requirements depending on current thresholds and facts."],
      ["Does an inactive LLP still need annual filing?", "Inactivity does not automatically remove statutory filing obligations. Filing status should be reviewed until the LLP is lawfully closed or another valid exemption applies." ]
    ],
    "llp-name-change.html": [
      ["Does reserving a new LLP name complete the change?", "No. After name approval, partner consent, the prescribed filing, an updated certificate and amendment of the LLP agreement and connected registrations may be required."],
      ["Should trademarks be checked before choosing the new name?", "Yes. MCA name availability and trademark rights are different checks. A name accepted on one portal can still create brand or legal conflict." ]
    ],
    "opc-annual-filing.html": [
      ["Does an OPC have annual filing obligations?", "Yes. An OPC generally files financial statements and the applicable annual return, subject to the forms, exemptions and timelines currently prescribed for OPCs."],
      ["What records should the member-director maintain?", "Signed financial statements, board records, auditor documents, member and director data, related-party information and event-based filings should support the annual forms." ]
    ],
    "patent-registration.html": [
      ["Can every new idea be patented?", "No. Patentability depends on statutory requirements such as novelty, inventive step and industrial applicability, as well as excluded subject matter. A professional search and claim strategy may be required."],
      ["Is filing a provisional specification the same as obtaining a patent?", "No. A provisional filing can establish an early filing position, but a complete specification and the remaining examination and prosecution steps are still required within applicable timelines." ]
    ],
    "pf-returns.html": [
      ["What is reconciled before PF contributions are filed?", "Employee UAN data, eligible wages, attendance, joiners and exits, contribution rates, arrears, challans and payroll ledgers should be compared for the wage month."],
      ["Can payroll corrections be made after filing?", "Some errors can be corrected through the permitted EPFO process, but the route depends on the field and period. It is safer to resolve employee and wage data before payment and filing." ]
    ],
    "director-resignation-removal.html": [
      ["Are resignation and removal of a director the same process?", "No. Resignation is initiated by the director, while removal involves company action and procedural rights. The board, members, notices and MCA filings differ."],
      ["Does the MCA filing end every responsibility of the director?", "No. A director may remain responsible for acts or defaults during the period of office. Handover, records, bank mandates, licences and contractual appointments should also be addressed." ]
    ],
    "share-transfer-transmission.html": [
      ["What is the difference between transfer and transmission of shares?", "Transfer is a voluntary transaction between parties, while transmission occurs by operation of law, such as on death or succession. Their documents and approvals differ."],
      ["What is checked in a share transfer?", "Articles, restrictions or agreements, instrument and stamp duty, consideration, certificates, board approval, beneficial ownership and updates to the register of members are reviewed." ]
    ],
    "llp-strike-off.html": [
      ["Can an LLP with assets or liabilities use strike-off?", "Voluntary strike-off is intended for an eligible inactive LLP. Bank accounts, assets, liabilities, taxes, employees, registrations and pending proceedings should be resolved before application."],
      ["Does strike-off cancel earlier defaults?", "No. Closure is not a substitute for settling liabilities or required compliance, and restoration or enforcement may remain possible in appropriate cases." ]
    ],
    "company-strike-off.html": [
      ["When is voluntary company strike-off appropriate?", "It may be considered for an eligible company that has ceased or not commenced business and has resolved assets, liabilities and statutory restrictions. It is not suitable for every closure."],
      ["What should be completed before filing?", "Bank accounts, assets and liabilities, tax and GST matters, employee dues, litigation, charges, necessary filings and the prescribed board or member authorisation should be reviewed." ]
    ],
    "din-surrender.html": [
      ["Can a director surrender DIN simply because they resigned?", "No. Resignation from a company does not by itself make a DIN eligible for surrender. Surrender or cancellation is permitted only in specified circumstances."],
      ["What evidence is required?", "The reason for surrender, DIN usage history, identity records, duplicate or wrongful-allotment facts where relevant, declarations and supporting company records are examined." ]
    ],
    "tds-return-revision.html": [
      ["Which TDS return errors can be corrected?", "Correction may address deductee details, challan linkage, PAN, section, amount or other statement data, depending on the filed record and permitted correction type."],
      ["What records are needed for a correction statement?", "The filed statement, token or acknowledgement, challan and CSI data, deductee ledger, PAN records, defaults and TRACES information should be reconciled first." ]
    ],
    "tds-returns.html": [
      ["What is required to prepare a TDS statement?", "TAN, deductor details, challans, validated PANs, deductee-wise payments and deductions, section and rate, lower-deduction certificates and prior-quarter records are reviewed."],
      ["Does payment of TDS complete compliance?", "No. Deposit and statement filing are separate steps. Challans must be correctly linked to deductee data, and certificates and correction obligations may follow." ]
    ],
    "trademark-objection-reply.html": [
      ["Is a trademark examination objection the same as opposition?", "No. An examination objection is raised by the Registry during examination; opposition is brought by a third party after publication. The response process and evidence differ."],
      ["What should be provided for the reply?", "The examination report, complete application file, actual-use evidence, adoption history, comparable marks, business materials and any cited-mark information should be reviewed before drafting." ]
    ],
    "trademark-renewal.html": [
      ["How often is an Indian trademark registration renewed?", "A registration is generally renewable for successive ten-year periods. The Registry status, expiry date, proprietor details and any grace-period consequence should be verified before filing."],
      ["Can ownership or address changes be handled during renewal?", "Post-registration changes may require a separate prescribed request and supporting evidence. Renewal alone should not be assumed to correct every register entry." ]
    ],
    "trademark-rectification.html": [
      ["What is trademark rectification?", "Rectification is a formal proceeding seeking correction, variation or removal of an entry from the trademark register on legally available grounds."],
      ["Is rectification a routine portal correction?", "No. Many rectification matters are contested and evidence-driven. Standing, grounds, limitation, forum and connected infringement or opposition proceedings require legal review." ]
    ],
    "trademark-watch-service.html": [
      ["What does a trademark watch monitor?", "The agreed watch may monitor newly published applications for identical or similar marks in selected classes or expressions and flag potentially relevant results."],
      ["Does an alert automatically stop the later mark?", "No. Monitoring creates an opportunity to assess risk. Any opposition, notice, negotiation or court action is a separate decision and engagement." ]
    ],
    "trademark-withdrawal.html": [
      ["Can every trademark matter be withdrawn online?", "The available request depends on whether the matter is an application, opposition, rectification or another proceeding and on its present Registry status."],
      ["Will withdrawal refund government fees or preserve priority?", "Usually a filing fee is not refunded merely because a matter is withdrawn, and a later fresh application may have a new priority date. The consequences should be reviewed first." ]
    ]
  };

  const CATEGORY_FAQS = {
    "GST & INDIRECT TAX": [
      ["Why is a GST portal review necessary?", "GST forms, registration status, return history, notices and electronic ledgers can materially affect the work. We check the relevant portal records before confirming the final filing position."],
      ["Can portal filing be treated as legal advice for every transaction?", "No. Portal acceptance does not by itself establish the correct tax treatment. The underlying supply, place, time, value and documentary facts must support the filing." ]
    ],
    "INCOME TAX & TDS": [
      ["Why are tax records reconciled before filing?", "The return or statement should agree with books, bank and transaction records, tax credits, challans and available information statements. Differences should be explained rather than silently carried forward."],
      ["Can a filing be revised later?", "Revision or correction may be available only for specified forms, errors and time limits. It should not be relied on as a substitute for an accurate first filing." ]
    ],
    "CORPORATE & SECRETARIAL": [
      ["Why are supporting corporate records required?", "MCA forms report an underlying legal event. Minutes, notices, consents, registers, agreements and certificates should establish that the event was validly approved and documented."],
      ["Does MCA approval confirm every legal issue?", "No. Portal acceptance records the filing but does not necessarily validate contracts, tax treatment, beneficial ownership, sector approvals or every procedural fact." ]
    ],
    "WORKFORCE COMPLIANCE": [
      ["Why must payroll and portal data agree?", "Employee identity, wages, joining and exit dates, contribution calculations and challans affect both individual benefits and establishment compliance. Differences should be corrected promptly."],
      ["Are coverage rules the same in every location?", "Not always. The establishment type, notified area, employee strength, wage data and other facts may affect coverage under the applicable law." ]
    ],
    "INTELLECTUAL PROPERTY": [
      ["Can filing guarantee registration or protection?", "No. Examination, third-party rights, opposition, evidence and statutory requirements remain relevant. We can perform the agreed professional work but cannot guarantee an authority's decision."],
      ["Why must ownership be checked before filing?", "The applicant should have a valid legal basis for claiming the mark, work or invention. Employment, assignment, licence, collaboration and earlier-use records can affect ownership." ]
    ],
    "IMPORT & EXPORT": [
      ["Why should PAN, bank and DGFT data match?", "IEC and DGFT services rely on consistent entity, signatory, address and bank information. Mismatches can cause validation failure or later compliance issues."],
      ["Does IEC replace product-specific approval?", "No. Restricted goods, sector licences, customs requirements and other registrations may apply separately to a particular import or export." ]
    ],
    "BUSINESS REGISTRATION": [
      ["Does one registration cover every business law?", "No. Udyam, GST, local licences, labour registrations, professional tax and sector approvals are separate regimes with different applicability tests."],
      ["Why must business activity be described accurately?", "The activity description and classification affect the registration record and may influence eligibility, benefits and other compliance. It should reflect actual operations." ]
    ],
    "BUSINESS GROWTH": [
      ["How is the final creative or campaign scope approved?", "We record the brief, deliverables, revision rounds, approval contact, licences, handover formats and schedule in writing before work begins."],
      ["Can business results be guaranteed?", "No. Performance also depends on the offer, market, budget, customer behaviour, platform decisions and execution outside the agreed scope." ]
    ]
  };

  function openNavigation(button, navigation) {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    navigation.classList.toggle("is-open", !expanded);
    document.body.classList.toggle("nav-open", !expanded);
  }

  function bindNavigation() {
    document.querySelectorAll('.ip-nav a[href="index.html#services"]').forEach(function (link) {
      link.setAttribute("href", "services.html");
      link.textContent = "All services";
    });

    const button = document.querySelector(".ip-nav-toggle");
    const navigation = document.getElementById("site-nav");
    if (!button || !navigation) return;

    button.addEventListener("click", function () {
      openNavigation(button, navigation);
    });

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a") && navigation.classList.contains("is-open")) {
        button.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      }
    });
  }

  function selectPackage(button) {
    const form = document.querySelector(".ip-enquiry-form");
    if (!form) return;
    const packageField = form.querySelector('[name="package"]');
    if (packageField) {
      const value = button.getAttribute("data-package") || "Professional support";
      const existing = Array.from(packageField.options).find(function (option) {
        return option.value === value;
      });
      if (!existing) packageField.add(new Option(value, value));
      packageField.value = value;
    }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(function () {
      const nameField = form.querySelector('[name="name"]');
      if (nameField) nameField.focus({ preventScroll: true });
    }, 450);
  }

  function formValues(form) {
    const data = new FormData(form);
    return {
      service: data.get("service") || form.getAttribute("data-service") || "General enquiry",
      package: data.get("package"),
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      preferredContact: data.get("preferredContact") || "No preference",
      message: data.get("message"),
      consent: data.get("consent") ? "Yes" : "No",
      sourcePage: window.location.href,
      website: data.get("website")
    };
  }

  function setStatus(form, message, state) {
    const status = form.querySelector(".ip-form-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "";
  }

  function clearConditionalValidity(form) {
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');
    if (email) email.setCustomValidity("");
    if (phone) phone.setCustomValidity("");
  }

  function validateOnlineContact(form, values) {
    clearConditionalValidity(form);
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');

    if (!hasOnlineContact(values)) {
      if (email) email.setCustomValidity("Provide an email address or mobile number.");
      if (email) email.focus();
      form.reportValidity();
      setStatus(form, "Provide an email address or mobile number so we can respond.", "error");
      return false;
    }

    if (values.preferredContact === "Email" && !String(values.email || "").trim()) {
      if (email) email.setCustomValidity("Enter an email address or change the preferred contact method.");
      if (email) email.focus();
      form.reportValidity();
      return false;
    }

    if ((values.preferredContact === "Phone" || values.preferredContact === "WhatsApp") && !String(values.phone || "").trim()) {
      if (phone) phone.setCustomValidity("Enter a mobile number or change the preferred contact method.");
      if (phone) phone.focus();
      form.reportValidity();
      return false;
    }

    return true;
  }

  function buildSheetPayload(values) {
    const payload = new FormData();
    payload.set("name", String(values.name || "").trim());
    payload.set("email", String(values.email || "").trim());
    payload.set("phone", String(values.phone || "").trim());
    payload.set("preferredContact", String(values.preferredContact || "No preference").trim());
    payload.set("service", String(values.package || values.service || "General enquiry").trim());
    payload.set("message", String(values.message || "").trim());
    payload.set("consent", values.consent === "Yes" ? "Yes" : "No");
    payload.set("sourcePage", String(values.sourcePage || window.location.href));
    payload.set("website", String(values.website || ""));
    return payload;
  }

  function setSubmitting(form, submitting) {
    form.setAttribute("aria-busy", String(submitting));
    form.querySelectorAll("button").forEach(function (button) {
      button.disabled = submitting;
    });
  }

  async function submitOnline(form) {
    clearConditionalValidity(form);

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, "Please complete the required fields.", "error");
      return;
    }

    const values = formValues(form);
    if (!validateOnlineContact(form, values)) return;

    const endpoint = form.getAttribute("data-sheet-endpoint") || "";
    if (!isValidSheetEndpoint(endpoint)) {
      setStatus(form, "Online submission is awaiting final Google Sheet activation. Please use WhatsApp for now.", "error");
      return;
    }

    setSubmitting(form, true);
    setStatus(form, "Submitting your enquiry securely…", "progress");

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        body: buildSheetPayload(values),
        keepalive: true
      });
      trackAnalyticsEvent("generate_lead", {
        lead_method: "website_form",
        service_name: analyticsService(values),
        page_location: window.location.href
      });
      form.reset();
      clearConditionalValidity(form);
      setStatus(form, "Thank you. Your enquiry has been recorded and our team will contact you shortly.", "success");
    } catch (error) {
      setStatus(form, "We could not submit the enquiry. Please try again or continue on WhatsApp.", "error");
    } finally {
      setSubmitting(form, false);
    }
  }

  function continueOnWhatsApp(form) {
    clearConditionalValidity(form);

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, "Please complete the required fields before continuing.", "error");
      return;
    }

    const values = formValues(form);
    const url = buildWhatsAppUrl(values);
    trackAnalyticsEvent("whatsapp_click", {
      link_url: url,
      service_name: analyticsService(values),
      page_location: window.location.href
    });
    trackAnalyticsEvent("generate_lead", {
      lead_method: "whatsapp",
      service_name: analyticsService(values),
      page_location: window.location.href
    });
    setStatus(form, "Opening WhatsApp with your enquiry…", "progress");
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.href = url;
  }

  function bindForms() {
    document.querySelectorAll(".ip-enquiry-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const endpoint = form.getAttribute("data-sheet-endpoint") || "";
        const hasSeparateWhatsAppAction = Boolean(form.querySelector("[data-whatsapp-submit]"));
        if (!isValidSheetEndpoint(endpoint) && !hasSeparateWhatsAppAction) {
          continueOnWhatsApp(form);
          return;
        }
        submitOnline(form);
      });

      const whatsappButton = form.querySelector("[data-whatsapp-submit]");
      if (whatsappButton) {
        whatsappButton.addEventListener("click", function () {
          continueOnWhatsApp(form);
        });
      }

      ["email", "phone"].forEach(function (name) {
        const field = form.querySelector('[name="' + name + '"]');
        if (field) {
          field.addEventListener("input", function () {
            clearConditionalValidity(form);
          });
        }
      });
    });
  }

  function bindPackageButtons() {
    document.querySelectorAll(".ip-package-button").forEach(function (button) {
      button.addEventListener("click", function () {
        trackAnalyticsEvent("select_content", {
          content_type: "service_package",
          item_id: String(button.getAttribute("data-package") || "Package enquiry").slice(0, 100),
          page_location: window.location.href
        });
        selectPackage(button);
      });
    });
  }

  function closeOtherMenus() {
    document.addEventListener("click", function (event) {
      document.querySelectorAll(".ip-nav details[open]").forEach(function (menu) {
        if (!menu.contains(event.target)) menu.removeAttribute("open");
      });
    });
  }

  function appendFaqItem(container, question, answer, isOpen) {
    const details = document.createElement("details");
    if (isOpen) details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = question;
    details.appendChild(summary);

    const paragraph = document.createElement("p");
    paragraph.textContent = answer;
    details.appendChild(paragraph);
    container.appendChild(details);
    return { question, answer };
  }

  function appendOfficialSourceFaq(container, source, isOpen) {
    const sourceName = source.textContent.trim() || "the official government portal";
    const question = "Where can I verify the official requirements?";
    const answer = "Use " + sourceName + " for the current form, portal instructions and official status. Statutory rules, notifications and the authority's records prevail over general website guidance.";
    const details = document.createElement("details");
    if (isOpen) details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = question;
    details.appendChild(summary);

    const paragraph = document.createElement("p");
    paragraph.append("Use ");
    const link = document.createElement("a");
    link.href = source.href;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = sourceName;
    paragraph.appendChild(link);
    paragraph.append(" for the current form, portal instructions and official status. Statutory rules, notifications and the authority's records prevail over general website guidance.");
    details.appendChild(paragraph);
    container.appendChild(details);
    return { question, answer };
  }

  function addFaqSchema(items) {
    if (!items.length) return;
    const existing = document.querySelector('script[data-ip-faq-schema]');
    if (existing) existing.remove();

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.ipFaqSchema = "true";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map(function (item) {
        return {
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer }
        };
      })
    });
    document.head.appendChild(schema);
  }

  function enhanceGenericFaqs() {
    const container = document.querySelector(".ip-faq");
    if (!container || container.dataset.faqEnhanced === "true") return;

    const firstQuestion = container.querySelector("summary");
    if (!firstQuestion || firstQuestion.textContent.trim() !== "What determines the final scope?") return;

    const filename = window.location.pathname.split("/").pop() || "index.html";
    const categoryElement = document.querySelector(".ip-hero .ip-eyebrow");
    const category = categoryElement ? categoryElement.textContent.trim() : "";
    const serviceTitle = (document.querySelector(".ip-hero h1") || {}).textContent || "this service";
    const serviceItems = SERVICE_FAQS[filename] || [];
    const categoryItems = CATEGORY_FAQS[category] || [];
    const source = document.querySelector(".ip-source-note a");
    const items = [];

    container.textContent = "";
    serviceItems.slice(0, 2).forEach(function (item) {
      items.push(appendFaqItem(container, item[0], item[1], items.length === 0));
    });
    if (categoryItems.length) {
      items.push(appendFaqItem(container, categoryItems[0][0], categoryItems[0][1], items.length === 0));
    }
    items.push(appendFaqItem(
      container,
      "How long will " + serviceTitle.trim() + " take?",
      "We confirm a working timeline after checking documents, portal access, filing history and any deadline or notice. Government examination, approval, clarification and portal-processing time remain outside professional control.",
      items.length === 0
    ));
    items.push(appendFaqItem(
      container,
      "Are government fees and outside costs included?",
      "Only when the selected package or written quotation expressly includes them. Government fees, additional filing fees, stamp duty, taxes, certificates, advertisements, software and third-party professional costs are otherwise charged separately.",
      false
    ));
    if (source) items.push(appendOfficialSourceFaq(container, source, false));

    container.dataset.faqEnhanced = "true";
    addFaqSchema(items);
  }


  const LEGAL_CURRENCY_REVIEWED = "12 September 2026";
  const LEGAL_CURRENCY = {
    "GST & INDIRECT TAX": {
      framework: "Central Goods and Services Tax Act, 2017; Integrated Goods and Services Tax Act, 2017; applicable State/UT GST law; CGST Rules, 2017; current notifications, circulars and portal advisories.",
      authority: "CBIC GST law and notifications",
      url: "https://cbic-gst.gov.in/gst-law.html",
      caution: "Rate, exemption, place of supply, registration, return and procedural positions must be checked for the relevant period and State."
    },
    "INCOME TAX & TDS": {
      framework: "Income-tax Act, 2025 and Income-tax Rules, 2026 for Tax Year 2026–27 onward; Income-tax Act, 1961 and Income-tax Rules, 1962 for earlier financial/assessment years, subject to transition provisions.",
      authority: "Income Tax Department",
      url: "https://www.incometax.gov.in/iec/foportal/",
      caution: "Use the law, form, utility and portal process applicable to the transaction, payment or filing period; old and new Act references are not interchangeable."
    },
    "CORPORATE & SECRETARIAL": {
      framework: "Companies Act, 2013 or Limited Liability Partnership Act, 2008, as applicable, together with the current rules, MCA forms, notifications, circulars and entity records.",
      authority: "Ministry of Corporate Affairs",
      url: "https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html",
      caution: "Applicability depends on entity type, event date, capital, listing/status, approvals, registers and the version of the MCA form available on filing date."
    },
    "WORKFORCE COMPLIANCE": {
      framework: "Employees’ Provident Funds and Miscellaneous Provisions Act, 1952 and schemes, or Employees’ State Insurance Act, 1948 and regulations, as applicable, together with current portal directions.",
      authority: "EPFO / ESIC",
      url: "https://www.epfindia.gov.in/site_en/Acts&Manuals.php",
      caution: "Coverage, wage components, employee status, notified area, contribution period and portal records require fact-specific verification."
    },
    "INTELLECTUAL PROPERTY": {
      framework: "Trade Marks Act, 1999 and Trade Marks Rules, 2017; Copyright Act, 1957 and Copyright Rules, 2013; or Patents Act, 1970 and Patents Rules, 2003, as applicable and amended.",
      authority: "IP India — Acts and Rules",
      url: "https://ipindia.gov.in/acts-rules.htm",
      caution: "The applicable statute, class, ownership, use, priority, limitation, evidence and current Registry practice depend on the specific right and proceeding."
    },
    "IMPORT & EXPORT": {
      framework: "Foreign Trade (Development and Regulation) Act, 1992; Foreign Trade Policy 2023 and Handbook of Procedures, as amended; DGFT notifications, public notices and product-specific restrictions.",
      authority: "Directorate General of Foreign Trade",
      url: "https://www.dgft.gov.in/CP/?opt=ft-policy",
      caution: "IEC status does not replace customs, product, sector, sanctions, licensing or destination-specific checks."
    },
    "BUSINESS REGISTRATION": {
      framework: "The governing framework depends on the registration: MSMED/Udyam notifications, Income-tax PAN/TAN rules, Information Technology Act/CCA directions, and applicable Central, State or local licensing law.",
      authority: "Government registration portal",
      url: "https://www.india.gov.in/",
      caution: "Registration names are not substitutes for an applicability review; activity, constitution, location, turnover, workforce and sector may trigger separate laws."
    },
    "BUSINESS GROWTH": {
      framework: "Applicable contract, consumer, advertising, intellectual-property, data-protection, tax and sector rules depend on the engagement and business model.",
      authority: "India Code",
      url: "https://www.indiacode.nic.in/",
      caution: "Commercial support must be scoped separately from legal, tax, financial or regulatory opinions."
    }
  };

  function serviceLegalCurrency() {
    if (document.querySelector("[data-ip-legal-currency]") || document.body.classList.contains("ip-legal-layer-ready")) return;
    const categoryElement = document.querySelector(".ip-hero .ip-eyebrow");
    const sectionHost = document.querySelector(".ip-source-note") || document.querySelector(".ip-faq") || document.querySelector("main");
    if (!categoryElement || !sectionHost) return;
    const categoryText = categoryElement.textContent.toUpperCase();
    let category = Object.keys(LEGAL_CURRENCY).find(function (key) {
      return categoryText.indexOf(key) !== -1;
    });
    const filename = window.location.pathname.split("/").pop() || "";
    if (!category && /tax-notice-response/.test(filename)) category = "INCOME TAX & TDS";
    if (!category && /cma-project-report|accounting-bookkeeping|virtual-cfo/.test(filename)) category = "BUSINESS GROWTH";
    if (!category) return;
    const entry = Object.assign({}, LEGAL_CURRENCY[category]);
    if (/copyright/i.test(filename)) {
      entry.framework = "Copyright Act, 1957 and Copyright Rules, 2013, as amended, together with current Copyright Office procedures.";
    } else if (/patent/i.test(filename)) {
      entry.framework = "Patents Act, 1970 and Patents Rules, 2003, as amended, together with current Patent Office procedures.";
    } else if (/trademark/i.test(filename)) {
      entry.framework = "Trade Marks Act, 1999 and Trade Marks Rules, 2017, as amended, together with current Trade Marks Registry practice and e-filing requirements.";
    } else if (/esic|esi-/.test(filename)) {
      entry.framework = "Employees’ State Insurance Act, 1948 and applicable regulations, contribution rules and ESIC portal directions, as amended.";
      entry.authority = "Employees’ State Insurance Corporation";
      entry.url = "https://www.esic.gov.in/act";
    } else if (/epf|pf-/.test(filename)) {
      entry.framework = "Employees’ Provident Funds and Miscellaneous Provisions Act, 1952 and applicable schemes, notifications and EPFO portal directions, as amended.";
    } else if (/udyam/.test(filename)) {
      entry.framework = "Micro, Small and Medium Enterprises Development Act, 2006 and the current Udyam Registration notification, classification criteria and official portal directions.";
      entry.authority = "Udyam Registration — Ministry of MSME";
      entry.url = "https://udyamregistration.gov.in/";
    } else if (/digital-signature/.test(filename)) {
      entry.framework = "Information Technology Act, 2000, applicable rules and Controller of Certifying Authorities directions governing digital signatures and certifying authorities.";
      entry.authority = "Controller of Certifying Authorities";
      entry.url = "https://cca.gov.in/";
    }

    const panel = document.createElement("aside");
    panel.className = "ip-legal-currency";
    panel.dataset.ipLegalCurrency = "true";
    panel.setAttribute("aria-label", "Legal currency and official source");
    panel.innerHTML =
      '<div class="ip-legal-currency-head"><span>LEGAL CURRENCY</span><strong>Reviewed ' + LEGAL_CURRENCY_REVIEWED + '</strong></div>' +
      '<p><b>Framework:</b> ' + entry.framework + '</p>' +
      '<p><b>Verification note:</b> ' + entry.caution + '</p>' +
      '<p class="ip-legal-currency-source"><a target="_blank" rel="noopener" href="' + entry.url + '">Verify through ' + entry.authority + ' <span aria-hidden="true">↗</span></a></p>' +
      '<p class="ip-legal-currency-limit">This is a service-page currency note, not a legal opinion. The enacted law, rules, notifications, circulars, forms, portal utilities and authority records applicable on the relevant date prevail.</p>';

    const style = document.createElement("style");
    style.textContent =
      ".ip-legal-currency{max-width:1180px;margin:24px auto;padding:20px 22px;border:1px solid #d9e3ef;border-left:5px solid #00a651;border-radius:14px;background:#f7fafc;color:#344054;box-shadow:0 10px 30px rgba(7,29,61,.06)}" +
      ".ip-legal-currency-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.ip-legal-currency-head span{color:#00a651;font-size:.76rem;font-weight:800;letter-spacing:.09em}.ip-legal-currency-head strong{color:#071d3d;font-size:.82rem}.ip-legal-currency p{margin:8px 0;font-size:.92rem;line-height:1.55}.ip-legal-currency-source a{color:#071d3d;font-weight:750}.ip-legal-currency-limit{color:#667085;font-size:.8rem!important}" +
      "@media(max-width:760px){.ip-legal-currency{margin:18px 16px;padding:17px}.ip-legal-currency-head{align-items:flex-start;flex-direction:column;gap:3px}}";
    document.head.appendChild(style);
    if (sectionHost.classList.contains("ip-source-note")) sectionHost.parentNode.insertBefore(panel, sectionHost);
    else sectionHost.parentNode.insertBefore(panel, sectionHost);
    document.body.classList.add("ip-legal-layer-ready");
  }


  const SERVICE_AUTOMATION_CHECKLISTS = {
    "GST & INDIRECT TAX": ["PAN and constitution proof", "Principal place address proof", "Authorised signatory details", "Business activity and HSN/SAC", "Existing GST history or notice"],
    "INCOME TAX & TDS": ["PAN and residential status", "Relevant financial year or tax year", "Income/payment working", "Tax payment and return records", "Notice, order or transaction documents"],
    "CORPORATE & SECRETARIAL": ["Certificate of incorporation and CIN/LLPIN", "Current master data and constitutional documents", "Directors/partners and DSC details", "Event date and approvals", "Latest filings and registers"],
    "WORKFORCE COMPLIANCE": ["Entity PAN and registration details", "Employee-wise wage data", "Joining/leaving dates", "Contribution and challan history", "Notice or inspection records"],
    "INTELLECTUAL PROPERTY": ["Applicant identity and constitution", "Clear representation of the work or mark", "User/priority claim evidence", "Classes, goods or services", "Application, examination or opposition records"],
    "IMPORT & EXPORT": ["Entity PAN and IEC details", "Product description and ITC(HS)", "Country of origin/destination", "Invoice and logistics values", "Product/sector licences"],
    "BUSINESS REGISTRATION": ["Applicant identity and constitution", "PAN and contact details", "Business address proof", "Activity and jurisdiction", "Authorisation and digital signature"],
    "BUSINESS GROWTH": ["Business model and objectives", "Historic financial data", "Revenue and cost assumptions", "Funding or contract documents", "Risk and compliance constraints"]
  };

  function inr(value) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  function numberValue(panel, name) {
    const field = panel.querySelector('[name="' + name + '"]');
    return field ? Number(field.value) || 0 : 0;
  }

  function calculatorMarkup(type) {
    const common = '<p class="ip-tool-note">Indicative arithmetic only. Confirm applicability, rates, ceilings, classification and effective dates before acting.</p>';
    if (type === "gst") return '<h3>GST amount calculator</h3><div class="ip-tool-grid"><label>Amount (₹)<input name="amount" type="number" min="0" step="0.01" value="10000"></label><label>GST rate (%)<select name="rate"><option>0</option><option>5</option><option>12</option><option selected>18</option><option>28</option></select></label><label>Amount type<select name="mode"><option value="exclusive">Exclusive of GST</option><option value="inclusive">Inclusive of GST</option></select></label></div><button type="button" data-calculate>Calculate</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "tds") return '<h3>TDS estimate</h3><div class="ip-tool-grid"><label>Payment/base amount (₹)<input name="amount" type="number" min="0" step="0.01" value="100000"></label><label>Effective TDS rate (%)<input name="rate" type="number" min="0" step="0.001" value="10"></label></div><button type="button" data-calculate>Calculate</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "pf") return '<h3>EPF contribution estimate</h3><div class="ip-tool-grid"><label>PF wage (₹)<input name="amount" type="number" min="0" step="1" value="15000"></label><label>Employee rate (%)<input name="employeeRate" type="number" min="0" step="0.01" value="12"></label><label>Employer rate (%)<input name="employerRate" type="number" min="0" step="0.01" value="12"></label></div><button type="button" data-calculate>Estimate</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "esi") return '<h3>ESI contribution estimate</h3><div class="ip-tool-grid"><label>Monthly wages (₹)<input name="amount" type="number" min="0" step="1" value="18000"></label><label>Employee rate (%)<input name="employeeRate" type="number" min="0" step="0.01" value="0.75"></label><label>Employer rate (%)<input name="employerRate" type="number" min="0" step="0.01" value="3.25"></label></div><button type="button" data-calculate>Estimate</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "trademark") return '<h3>Trademark renewal planner</h3><div class="ip-tool-grid"><label>Registration/last-renewal expiry basis date<input name="date" type="date"></label><label>Renewal cycle (years)<input name="years" type="number" min="1" value="10"></label></div><button type="button" data-calculate>Plan renewal</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "corporate") return '<h3>Corporate filing deadline planner</h3><div class="ip-tool-grid"><label>Trigger/event date<input name="date" type="date"></label><label>Applicable period (days)<input name="days" type="number" min="0" value="30"></label></div><button type="button" data-calculate>Calculate date</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "import") return '<h3>Indicative landed-cost calculator</h3><div class="ip-tool-grid"><label>Assessable value (₹)<input name="amount" type="number" min="0" step="0.01" value="100000"></label><label>BCD/other duty rate (%)<input name="dutyRate" type="number" min="0" step="0.01" value="10"></label><label>IGST rate (%)<input name="rate" type="number" min="0" step="0.01" value="18"></label><label>Freight/other cost (₹)<input name="other" type="number" min="0" step="0.01" value="0"></label></div><button type="button" data-calculate>Estimate</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    if (type === "business") return '<h3>Monthly break-even calculator</h3><div class="ip-tool-grid"><label>Fixed costs (₹)<input name="amount" type="number" min="0" step="0.01" value="100000"></label><label>Selling price per unit (₹)<input name="price" type="number" min="0" step="0.01" value="1000"></label><label>Variable cost per unit (₹)<input name="variable" type="number" min="0" step="0.01" value="600"></label></div><button type="button" data-calculate>Calculate</button><div class="ip-tool-result" aria-live="polite"></div>' + common;
    return "";
  }

  function calculationType(category, filename) {
    if (category === "GST & INDIRECT TAX") return "gst";
    if (category === "INCOME TAX & TDS") return "tds";
    if (category === "WORKFORCE COMPLIANCE" && /esic|esi-/.test(filename)) return "esi";
    if (category === "WORKFORCE COMPLIANCE") return "pf";
    if (category === "INTELLECTUAL PROPERTY" && /trademark/.test(filename)) return "trademark";
    if (category === "CORPORATE & SECRETARIAL") return "corporate";
    if (category === "IMPORT & EXPORT") return "import";
    if (category === "BUSINESS GROWTH") return "business";
    return "";
  }

  function runServiceCalculation(panel, type) {
    const result = panel.querySelector(".ip-tool-result");
    const amount = numberValue(panel, "amount");
    const rate = numberValue(panel, "rate");
    let textValue = "";
    if (type === "gst") {
      const mode = panel.querySelector('[name="mode"]').value;
      const tax = mode === "inclusive" ? amount - amount / (1 + rate / 100) : amount * rate / 100;
      const taxable = mode === "inclusive" ? amount - tax : amount;
      const total = mode === "inclusive" ? amount : amount + tax;
      textValue = "Taxable value: " + inr(taxable) + " · GST: " + inr(tax) + " · Invoice total: " + inr(total);
    } else if (type === "tds") {
      const tax = amount * rate / 100;
      textValue = "Indicative TDS: " + inr(tax) + " · Net payment: " + inr(amount - tax);
    } else if (type === "pf" || type === "esi") {
      const employee = amount * numberValue(panel, "employeeRate") / 100;
      const employer = amount * numberValue(panel, "employerRate") / 100;
      textValue = "Employee contribution: " + inr(employee) + " · Employer contribution: " + inr(employer) + " · Total: " + inr(employee + employer);
    } else if (type === "trademark") {
      const date = panel.querySelector('[name="date"]').value;
      if (!date) textValue = "Select the relevant registration or last-renewal date.";
      else {
        const due = new Date(date + "T00:00:00");
        due.setFullYear(due.getFullYear() + numberValue(panel, "years"));
        textValue = "Indicative next expiry: " + due.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) + ". Verify the register and begin review well before expiry.";
      }
    } else if (type === "corporate") {
      const date = panel.querySelector('[name="date"]').value;
      if (!date) textValue = "Select the statutory trigger or event date.";
      else {
        const due = new Date(date + "T00:00:00");
        due.setDate(due.getDate() + numberValue(panel, "days"));
        textValue = "Indicative calendar date: " + due.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) + ". Confirm how the governing provision counts days and any extension/holiday rule.";
      }
    } else if (type === "import") {
      const duty = amount * numberValue(panel, "dutyRate") / 100;
      const igst = (amount + duty) * rate / 100;
      textValue = "Basic/other duty: " + inr(duty) + " · IGST estimate: " + inr(igst) + " · Landed total: " + inr(amount + duty + igst + numberValue(panel, "other"));
    } else if (type === "business") {
      const margin = numberValue(panel, "price") - numberValue(panel, "variable");
      textValue = margin > 0 ? "Break-even volume: " + Math.ceil(amount / margin).toLocaleString("en-IN") + " units · Contribution per unit: " + inr(margin) : "Selling price must exceed variable cost.";
    }
    result.textContent = textValue;
  }

  function serviceAutomation() {
    if (document.querySelector("[data-ip-service-tool]")) return;
    const categoryElement = document.querySelector(".ip-hero .ip-eyebrow");
    if (!categoryElement) return;
    const categoryText = categoryElement.textContent.toUpperCase();
    let category = Object.keys(SERVICE_AUTOMATION_CHECKLISTS).find(function (key) { return categoryText.indexOf(key) !== -1; });
    const filename = window.location.pathname.split("/").pop() || "";
    if (!category && /tax-notice-response/.test(filename)) category = "INCOME TAX & TDS";
    if (!category && /cma-project-report|accounting-bookkeeping|virtual-cfo/.test(filename)) category = "BUSINESS GROWTH";
    if (!category) return;
    const type = calculationType(category, filename);
    const legalPanel = document.querySelector("[data-ip-legal-currency]");
    const host = legalPanel || document.querySelector(".ip-faq") || document.querySelector("main");
    if (!host || !host.parentNode) return;

    const section = document.createElement("section");
    section.className = "ip-service-tool";
    section.dataset.ipServiceTool = "true";
    section.setAttribute("aria-label", "Service calculator and document readiness");
    const checks = SERVICE_AUTOMATION_CHECKLISTS[category].map(function (item, index) {
      return '<label><input type="checkbox" data-readiness value="' + index + '"> <span>' + item + '</span></label>';
    }).join("");
    section.innerHTML = '<div class="ip-tool-heading"><span>FREE SERVICE TOOL</span><h2>Estimate and prepare before you enquire</h2><p>No data entered here leaves your browser.</p></div>' +
      (type ? '<div class="ip-tool-card" data-calculator="' + type + '">' + calculatorMarkup(type) + '</div>' : '') +
      '<div class="ip-tool-card"><h3>Document-readiness check</h3><div class="ip-readiness-list">' + checks + '</div><div class="ip-readiness-progress"><span style="width:0%"></span></div><p class="ip-readiness-status" aria-live="polite">0 of 5 items ready</p><button type="button" data-send-readiness>Include result in enquiry</button></div>';

    const style = document.createElement("style");
    style.textContent = ".ip-service-tool{max-width:1180px;margin:28px auto;padding:25px;border:1px solid #dbe4ee;border-radius:18px;background:#fff;box-shadow:0 14px 36px rgba(7,29,61,.08);color:#1a1a1a}.ip-tool-heading>span{font-size:.76rem;font-weight:800;letter-spacing:.1em;color:#00a651}.ip-tool-heading h2{margin:6px 0;color:#071d3d;font-size:clamp(1.35rem,3vw,2rem)}.ip-tool-heading p{color:#667085}.ip-tool-card{margin-top:20px;padding:20px;border:1px solid #e4e7ec;border-radius:14px;background:#f8fafc}.ip-tool-card h3{margin:0 0 14px;color:#071d3d}.ip-tool-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}.ip-tool-grid label,.ip-readiness-list label{display:flex;flex-direction:column;gap:6px;font-weight:650;font-size:.9rem}.ip-tool-grid input,.ip-tool-grid select{width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px;background:#fff}.ip-tool-card button{margin-top:15px;padding:11px 16px;border:0;border-radius:9px;background:#071d3d;color:#fff;font-weight:750;cursor:pointer}.ip-tool-result{margin-top:14px;padding:12px;border-left:4px solid #00a651;background:#fff;font-weight:700;color:#071d3d;min-height:46px}.ip-tool-note{font-size:.78rem;color:#667085;margin:12px 0 0}.ip-readiness-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.ip-readiness-list label{flex-direction:row;align-items:flex-start;font-weight:500}.ip-readiness-progress{height:9px;margin-top:16px;border-radius:99px;background:#e4e7ec;overflow:hidden}.ip-readiness-progress span{display:block;height:100%;background:#00a651;transition:width .2s}.ip-readiness-status{margin:8px 0 0;color:#475467}@media(max-width:760px){.ip-service-tool{margin:20px 16px;padding:18px}.ip-tool-card{padding:16px}}";
    document.head.appendChild(style);
    host.parentNode.insertBefore(section, host);

    const calc = section.querySelector("[data-calculator]");
    if (calc) calc.querySelector("[data-calculate]").addEventListener("click", function () { runServiceCalculation(calc, type); });
    const boxes = Array.from(section.querySelectorAll("[data-readiness]"));
    const status = section.querySelector(".ip-readiness-status");
    const bar = section.querySelector(".ip-readiness-progress span");
    function updateReadiness() {
      const count = boxes.filter(function (box) { return box.checked; }).length;
      status.textContent = count + " of " + boxes.length + " items ready";
      bar.style.width = Math.round(count / boxes.length * 100) + "%";
    }
    boxes.forEach(function (box) { box.addEventListener("change", updateReadiness); });
    section.querySelector("[data-send-readiness]").addEventListener("click", function () {
      const ready = boxes.filter(function (box) { return box.checked; }).map(function (box) { return box.parentNode.textContent.trim(); });
      const pending = boxes.filter(function (box) { return !box.checked; }).map(function (box) { return box.parentNode.textContent.trim(); });
      const form = document.querySelector(".ip-enquiry-form");
      const message = "Document readiness — Ready: " + (ready.join(", ") || "none") + ". Pending: " + (pending.join(", ") || "none") + ".";
      if (form) {
        const field = form.querySelector('[name="message"]');
        if (field) field.value = message;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        if (field) field.focus();
      } else {
        navigator.clipboard && navigator.clipboard.writeText(message);
        status.textContent = "Readiness summary copied. Include it with your enquiry.";
      }
    });
  }

  function initialise() {
    bindAnalyticsLinks();
    serviceLegalCurrency();
    serviceAutomation();
    bindNavigation();
    bindForms();
    bindPackageButtons();
    closeOtherMenus();
    enhanceGenericFaqs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise);
  } else {
    initialise();
  }
})();
