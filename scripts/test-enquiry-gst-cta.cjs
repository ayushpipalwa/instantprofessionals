const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
for(const [file,service] of [['logo-design.html','Professional Logo Design'],['digital-marketing.html','Digital Marketing Support'],['llp-registration.html','LLP Registration'],['opc-registration.html','OPC Registration'],['private-limited-company-registration.html','Private Limited Company Registration'],['international-trademark-registration.html','International Trademark Registration'],['trademark-withdrawal.html','Trademark Withdrawal'],['trademark-rectification.html','Trademark Rectification'],['trademark-opposition.html','Trademark Opposition'],['trademark-assignment.html','Trademark Assignment'],['iec-modification.html','IEC Modification'],['gst-registration-amendment.html','GST Registration Amendment'],['gst-lut.html','GST Letter of Undertaking (LUT)'],['tan-application.html','TAN Application'],['pan-application.html','PAN Application'],['mca-name-reservation-search-approval.html','MCA Name Reservation, Search & Approval Support'],['trademark-watch-service.html','Trademark Watch Service'],['llp-name-change.html','LLP Name Change'],['din-application.html','DIN Application'],['roc-search-report.html','ROC Search Report'],['trademark-renewal.html','Trademark Renewal'],['trademark-objection-reply.html','Trademark Objection Reply'],['gst-cancellation.html','GST Registration Cancellation'],['llp-strike-off.html','LLP Strike Off'],['company-strike-off.html','Company Strike Off'],['share-transfer-transmission.html','Share Transfer and Transmission'],['company-name-change.html','Company Name Change'],['moa-aoa-amendment.html','MOA and AOA Amendment'],['increase-authorised-capital.html','Increase Authorised Share Capital'],['change-llp-agreement.html','Change in LLP Agreement'],['add-remove-llp-partner.html','Add or Remove an LLP Partner'],['director-resignation-removal.html','Director Resignation or Removal'],['add-a-director.html','Add a Director'],['change-registered-office.html','Change of Registered Office'],['commencement-of-business.html','Commencement of Business Filing'],['dir-3-kyc.html','DIR-3 KYC'],['appointment-of-auditor.html','Appointment of Auditor'],['patent-registration.html','Patent Application Support'],['copyright-application.html','Copyright Application'],['digital-signature-certificate.html','Digital Signature Certificate'],['udyam-registration.html','Udyam MSME Registration'],['gst-returns.html','GST Return Filing'],['tds-returns.html','TDS Return Filing'],['tds-return-revision.html','TDS Return Revision'],['pf-returns.html','PF Returns and Compliance'],['esi-returns.html','ESI Returns and Compliance'],['llp-annual-filing.html','LLP Annual Filing'],['esic-registration.html','ESIC Registration'],['epf-registration.html','EPF Registration'],['company-annual-filing.html','Company Annual Filing'],['income-tax-return-filing.html','Income Tax Return Filing'],['gst-registration.html','GST Registration'],['accounting-bookkeeping.html','Accounting and bookkeeping'],['virtual-cfo.html','Virtual finance function'],['cma-project-report.html','CMA and project report'],['tax-notice-response.html','Income-tax notice response'],['opc-annual-filing.html','OPC Annual Filing'],['iec-registration.html','IEC Registration']]) {
const html=readFileSync(path.join(root,file),'utf8');
if(file==='opc-annual-filing.html'){assert(!html.includes('<li>MGT 7 Filing</li>'));assert.equal((html.match(/MGT-7A annual-return filing/g)||[]).length,3);assert(html.includes('id="service-preparation"'));}
let code=readFileSync(path.join(root,'assets/js/enquiry.js'),'utf8');
const end=code.lastIndexOf('})();');
code=code.slice(0,end)+'window.testFunctions={bindAnalyticsLinks,readinessItems,calculationType};'+code.slice(end);
for(const hostname of ['www.instantprofessionals.in','localhost']) {
  const events=[],handlers=[];
  const window={location:{hostname,origin:'https://'+hostname,pathname:'/'+file},
    __ipGoogleAnalyticsId:'G-TG0272S260',gtag:(...args)=>events.push(args)};
  const document={readyState:'loading',addEventListener:(name,fn)=>{if(name==='click')handlers.push(fn)}};
  vm.runInNewContext(code,{window,document});
  window.testFunctions.bindAnalyticsLinks();
  assert.equal(handlers.length,1);
  if(['private-limited-company-registration.html','llp-registration.html','opc-registration.html'].includes(file)) {
    assert(html.includes('class="ip-quote-link"'));
    assert(html.includes('service-page-v3.css?v=20261127-quote-contrast'));
    const enquiryLinks=[...html.matchAll(/<a\b[^>]*href="#enquiry-title"[^>]*>/g)];
    assert.equal(enquiryLinks.length,3);
    for(const [tag] of enquiryLinks) assert(tag.includes('data-enquiry-cta'), 'Every incorporation enquiry link must be tracked');
  }
  const ctas=[...html.matchAll(/<a\b[^>]*\bdata-enquiry-cta\b[^>]*>/g)];
  assert.equal(ctas.length,file==='cma-project-report.html'?4:['private-limited-company-registration.html','llp-registration.html','opc-registration.html','company-annual-filing.html','income-tax-return-filing.html','gst-registration.html','accounting-bookkeeping.html','virtual-cfo.html','tax-notice-response.html'].includes(file)?3:2);
  for(const [tag] of ctas) {
    const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    assert.equal(attrs.href,['accounting-bookkeeping.html','virtual-cfo.html','cma-project-report.html','tax-notice-response.html'].includes(file)?'#enquiry':'#enquiry-title');
    const link={getAttribute:n=>attrs[n]??null,hasAttribute:n=>n==='data-enquiry-cta'};
    const before=events.length;
    handlers[0]({target:{closest:()=>link},preventDefault(){throw Error('Same-page link must retain native navigation')}});
    assert.equal(events.length,before+(hostname==='localhost'?0:1));
    if(hostname!=='localhost') {
      assert.equal(events.at(-1)[1],'enquiry_cta_click');
      assert.equal(events.at(-1)[2].service_name,service);
      assert.equal(events.at(-1)[2].page_location,'https://www.instantprofessionals.in/'+file);
    }
  }
  assert(!events.some(e=>e[1]==='generate_lead'));
  // Contact tracking must still run once; no second analytics bootstrap is added.
  assert(!html.includes('assets/js/analytics.js'));
  assert.equal((html.match(/src="assets\/js\/enquiry.js/g)||[]).length,1);
  for(const [href,eventName] of [['tel:+918209785294','phone_click'],['https://wa.me/918209785294?text=PRIVATE','whatsapp_click']]) {
    const before=events.length;
    handlers[0]({target:{closest:()=>({href,getAttribute:()=>href,hasAttribute:()=>false})}});
    assert.equal(events.length,before+(hostname==='localhost'?0:1));
    if(hostname!=='localhost') assert.equal(events.at(-1)[1],eventName);
  }
  assert(!JSON.stringify(events).includes('PRIVATE'));
  if(file==='gst-registration-amendment.html') {
    const items=window.testFunctions.readinessItems('GST & INDIRECT TAX',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('change dates')));
    assert(items.some(x=>x.includes('Pending amendment ARNs')));
    assert.equal(window.testFunctions.calculationType('GST & INDIRECT TAX',file),'');
    assert.equal(window.testFunctions.calculationType('GST & INDIRECT TAX','gst-returns.html'),'gst');
    assert(html.includes('enquiry.js?v=20261126-gst-amendment-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹700','₹1,900','₹2,300']) assert(html.includes(price));
  }
  if(file==='gst-lut.html') {
    const items=window.testFunctions.readinessItems('GST & INDIRECT TAX',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('LUT financial year')));
    assert(items.some(x=>x.includes('Previous LUT')));
    assert.equal(window.testFunctions.calculationType('GST & INDIRECT TAX',file),'');
    assert.equal(window.testFunctions.calculationType('GST & INDIRECT TAX','gst-returns.html'),'gst');
    assert(html.includes('enquiry.js?v=20261126-lut-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    assert(html.includes('₹2,600'));
    assert(html.includes('Filing of One Letter of Undertaking with GST authorities'));
  }
  if(file==='tan-application.html') {
    const items=window.testFunctions.readinessItems('INCOME TAX & TDS',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('Existing TAN')));
    assert(items.some(x=>x.includes('Responsible-person')));
    assert.equal(window.testFunctions.calculationType('INCOME TAX & TDS',file),'');
    assert.equal(window.testFunctions.calculationType('INCOME TAX & TDS','tds-returns.html'),'tds');
    assert(html.includes('enquiry.js?v=20261126-tan-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹700','₹2,200','₹6,700']) assert(html.includes(price));
    assert(!html.includes('<li>Income, deduction and tax-payment records</li>'));
  }
  if(file==='pan-application.html') {
    const items=window.testFunctions.readinessItems('INCOME TAX & TDS',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('Existing PAN')));
    assert(items.some(x=>x.includes('Correction fields')));
    assert(!items.some(x=>/Income\/payment|tax year/.test(x)));
    assert.equal(window.testFunctions.calculationType('INCOME TAX & TDS',file),'');
    assert.equal(window.testFunctions.calculationType('INCOME TAX & TDS','tds-returns.html'),'tds');
    assert(html.includes('enquiry.js?v=20261126-pan-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹700','₹1,200','₹2,700']) assert(html.includes(price));
    assert(!html.includes('<li>Income, deduction and tax-payment records</li>'));
  }
  if(file==='director-resignation-removal.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('delivery evidence')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(!html.includes('DIR 11 Filing for One director Resignation/Removal'));
    assert(html.includes('enquiry.js?v=20261123-cessation-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  if(file==='add-a-director.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('DIN and DSC')));
    assert(items.some(x=>x.includes('consent and eligibility')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(html.includes('enquiry.js?v=20261123-director-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  if(file==='add-remove-llp-partner.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('LLPIN')));
    assert(items.some(x=>x.includes('Consent or cessation')));
    assert(items.some(x=>x.includes('profit-sharing')));
    assert(!items.some(x=>/Company CIN|directors/.test(x)));
    assert(html.includes('enquiry.js?v=20261123-llp-partner-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  if(file==='trademark-renewal.html') {
    const items=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('Official expiry')));
    assert(items.some(x=>x.includes('removal status')));
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'trademark');
    assert(html.includes('enquiry.js?v=20261125-renewal-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹12,700','₹13,700','₹14,200']) assert(html.includes(price));
  }
  if(file==='trademark-objection-reply.html') {
    const items=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('receipt date')));
    assert(items.some(x=>x.includes('Cited marks')));
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY','trademark-renewal.html'),'trademark');
    assert(html.includes('enquiry.js?v=20261125-objection-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹3,800','₹4,400','₹9,600']) assert(html.includes(price));
  }
  if(file==='gst-cancellation.html') {
    const items=window.testFunctions.readinessItems('GST & INDIRECT TAX',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('Pending returns')));
    assert(items.some(x=>x.includes('GSTR-10')));
    assert(!items.some(x=>/Principal place|HSN/.test(x)));
    assert(html.includes('enquiry.js?v=20261125-gst-cancellation-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    assert(html.includes('₹2,500'));
  }
  if(file==='company-strike-off.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('liabilities')));
    assert(items.some(x=>x.includes('pending proceedings')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(html.includes('enquiry.js?v=20261125-strike-off-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹16,200','₹19,200','₹25,200']) assert(html.includes(price));
  }
  if(file==='llp-strike-off.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('All-partner consent')));
    assert(items.some(x=>x.includes('Form 8/Form 11')));
    assert(!items.some(x=>/Company CIN|directors/.test(x)));
    assert(html.includes('enquiry.js?v=20261125-llp-strike-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹10,200','₹11,200','₹22,800']) assert(html.includes(price));
  }
  if(file==='share-transfer-transmission.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('demat')));
    assert(items.some(x=>x.includes('entitlement')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(html.includes('enquiry.js?v=20261124-share-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹4,200','₹6,200','₹9,200']) assert(html.includes(price));
  }
  if(file==='company-name-change.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('name reservation')));
    assert(items.some(x=>x.includes('MGT-14')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(html.includes('enquiry.js?v=20261124-company-name-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹13,500','₹25,200']) assert(html.includes(price));
  }
  if(file==='moa-aoa-amendment.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('clause wording')));
    assert(items.some(x=>x.includes('resolution dates')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(html.includes('enquiry.js?v=20261124-moa-aoa-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹6,200','₹11,200']) assert(html.includes(price));
  }
  if(file==='increase-authorised-capital.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('face value')));
    assert(items.some(x=>x.includes('Paid-up capital')));
    assert(!items.some(x=>/LLPIN|partners/.test(x)));
    assert(html.includes('enquiry.js?v=20261124-capital-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹3,700','₹4,700','₹5,700']) assert(html.includes(price));
  }
  if(file==='change-llp-agreement.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('clause changes')));
    assert(!items.some(x=>/Company CIN|directors/.test(x)));
    assert(html.includes('enquiry.js?v=20261123-agreement-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  if(file==='din-application.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('Existing DIN')));
    assert(items.some(x=>x.includes('DSC validity')));
    assert(!items.some(x=>/constitutional|financial statements/i.test(x)));
    assert.equal(window.testFunctions.calculationType('CORPORATE & SECRETARIAL',file),'');
    assert(html.includes('enquiry.js?v=20261126-din-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹2,700','₹3,200','₹4,200']) assert(html.includes(price));
    assert(html.includes('not a promise that MCA will allot a DIN within 24 hours'));
  }
  if(file==='llp-name-change.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('RUN-LLP')));
    assert(items.some(x=>x.includes('GST/Udyam')));
    assert(!items.some(x=>/Company CIN|directors/.test(x)));
    assert(html.includes('enquiry.js?v=20261126-llp-name-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    for(const price of ['₹4,500','₹8,500']) assert(html.includes(price));
  }
  if(file==='trademark-watch-service.html') {
    const items=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('end stage')));
    assert(items.some(x=>x.includes('pending action')));
    assert(!items.some(x=>/invention|expiry|registration certificate/i.test(x)));
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY','trademark-renewal.html'),'trademark');
    assert(html.includes('enquiry.js?v=20261126-watch-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    assert(html.includes('₹2,300'));
  }
  if(file==='mca-name-reservation-search-approval.html') {
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('Preferred names')));
    assert(items.some(x=>x.includes('Brand ownership')));
    assert(!items.some(x=>/Event date|Latest filings/.test(x)));
    assert.equal(window.testFunctions.calculationType('CORPORATE & SECRETARIAL',file),'');
    assert(html.includes('enquiry.js?v=20261126-name-search-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    assert(html.includes('Extensive Name Reservation Review — From ₹25,000'));
    assert(html.includes('no approval can be guaranteed'));
  }
  const kyc=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','dir-3-kyc.html');
  assert.equal(kyc.length,5);
  assert(kyc.some(x=>x.includes('Last completed KYC')));
  assert(!kyc.some(x=>/CIN|LLPIN|constitutional/.test(x)));
  assert.equal(window.testFunctions.calculationType('CORPORATE & SECRETARIAL','dir-3-kyc.html'),'');
  assert.equal(window.testFunctions.calculationType('CORPORATE & SECRETARIAL','company-annual-filing.html'),'corporate');
  if(file==='dir-3-kyc.html') {
    assert(html.includes('enquiry.js?v=20261123-dir3-kyc'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  const office=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','change-registered-office.html');
  assert.equal(office.length,5);
  assert(office.some(x=>x.includes('owner consent')));
  assert(!office.some(x=>/LLPIN|partners/.test(x)));
  if(file==='change-registered-office.html') {
    assert(html.includes('enquiry.js?v=20261123-office-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  const commencement=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','commencement-of-business.html');
  assert.equal(commencement.length,5);
  assert(commencement.some(x=>x.includes('payment evidence')));
  assert(!commencement.some(x=>/LLPIN|partners/.test(x)));
  if(file==='commencement-of-business.html') {
    assert(html.includes('enquiry.js?v=20261123-commencement-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  const auditor=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','appointment-of-auditor.html');
  assert.equal(auditor.length,5);
  assert(auditor.some(x=>x.includes('consent and eligibility')));
  assert(!auditor.some(x=>/LLPIN|partners/.test(x)));
  if(file==='appointment-of-auditor.html') {
    assert(html.includes('enquiry.js?v=20261122-auditor-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  const patent=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY','patent-registration.html');
  assert.equal(patent.length,5);
  assert(patent.some(x=>x.includes('disclosure dates')));
  assert(!patent.some(x=>/goods|classes|mark/i.test(x)));
  if(file==='patent-registration.html') {
    assert(html.includes('enquiry.js?v=20261122-patent-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    assert(html.includes('https://ipindia.gov.in/page-content/filing-process-1'));
  }
  const copyright=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY','copyright-application.html');
  assert.equal(copyright.length,5);
  assert(copyright.some(x=>x.includes('Publication status')));
  assert(!copyright.some(x=>/priority|goods|classes|mark/i.test(x)));
  if(file==='copyright-application.html') {
    assert(html.includes('enquiry.js?v=20261122-copyright-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
    assert(html.includes('https://ipindia.gov.in/acts/copyright-rules-2013/rule-70-4'));
  }
  const dsc=window.testFunctions.readinessItems('BUSINESS REGISTRATION','digital-signature-certificate.html');
  assert.equal(dsc.length,5);
  assert(dsc.some(x=>x.includes('existing DSC expiry')));
  assert(!dsc.some(x=>/jurisdiction|Bank/.test(x)));
  if(file==='digital-signature-certificate.html') {
    assert(html.includes('enquiry.js?v=20261122-dsc-readiness'));
    for(const id of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+id+'"'));
  }
  const udyam=window.testFunctions.readinessItems('BUSINESS REGISTRATION','udyam-registration.html');
  assert.equal(udyam.length,5);
  assert(udyam.some(x=>x.includes('UAM')));
  assert(!udyam.some(x=>/signature|jurisdiction/i.test(x)));
  const iec=window.testFunctions.readinessItems('IMPORT & EXPORT','iec-registration.html');
  assert.equal(iec.length,5);
  assert(iec.some(x=>x.includes('owner NOC')));
  assert(iec.some(x=>x.includes('bank certificate')));
  assert(!iec.some(x=>x.includes('logistics')||x.includes('ITC(HS)')));
  if(file==='iec-registration.html') {
    assert(html.includes('src="assets/js/enquiry.js?v=20261122-iec-readiness"'));
    assert(!html.includes('src="assets/js/enquiry.js"'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    assert(html.includes('https://content.dgft.gov.in/Website/IEC_Manual_V4.1.pdf'));
  }
  if(file==='iec-modification.html') {
    assert.equal(window.testFunctions.calculationType('IMPORT & EXPORT',file),'');
    const changed=window.testFunctions.readinessItems('IMPORT & EXPORT',file);
    assert.equal(changed.length,5);
    assert(changed.some(x=>x.includes('proposed profile')));
    assert(!changed.some(x=>x.includes('ITC(HS)')||x.includes('logistics')));
    assert(html.includes('enquiry.js?v=20261126-iec-modification-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    for(const price of ['₹2,600','₹4,200','₹4,700']) assert(html.includes(price));
  }
  if(file==='trademark-assignment.html') {
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    const transfer=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(transfer.length,5);
    assert(transfer.some(x=>x.includes('Assignor')));
    assert(transfer.some(x=>x.includes('Goodwill')));
    assert(!transfer.some(x=>x.includes('priority')));
    assert(html.includes('enquiry.js?v=20261126-assignment-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    assert(html.includes('₹15,200'));
    assert(html.includes('1 Assignment 1 Class Small Enterprise'));
  }
  if(file==='trademark-opposition.html') {
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    const opposition=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(opposition.length,5);
    assert(opposition.some(x=>x.includes('service records')));
    assert(opposition.some(x=>x.includes('Hearing')));
    assert(html.includes('enquiry.js?v=20261126-opposition-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    for(const scope of ['Reply to Trademark Opposition','Evidence Submission','Hearing','₹15,701']) assert(html.includes(scope));
    assert(html.includes('not cumulative bundles'));
  }
  if(file==='trademark-rectification.html') {
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    const rectification=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(rectification.length,5);
    assert(rectification.some(x=>x.includes('Requested relief')));
    assert(rectification.some(x=>x.includes('Connected proceedings')));
    assert(html.includes('enquiry.js?v=20261126-rectification-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    assert(html.includes('₹2,700'));
    assert(html.includes('Filing of form TM-M'));
    assert(html.includes('not a quote for a contested rectification'));
  }
  if(file==='trademark-withdrawal.html') {
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    const withdrawal=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(withdrawal.length,5);
    assert(withdrawal.some(x=>x.includes('signing authority')));
    assert(withdrawal.some(x=>x.includes('Exact withdrawal')));
    assert(html.includes('enquiry.js?v=20261126-withdrawal-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    for(const scope of ['₹3,200','Online Application to Trademark registry','Written Application to Trademark registry']) assert(html.includes(scope));
  }
  if(file==='international-trademark-registration.html') {
    assert.equal(window.testFunctions.calculationType('INTELLECTUAL PROPERTY',file),'');
    const international=window.testFunctions.readinessItems('INTELLECTUAL PROPERTY',file);
    assert.equal(international.length,5);
    assert(international.some(x=>x.includes('Target countries')));
    assert(international.some(x=>x.includes('Basic application')));
    assert(html.includes('enquiry.js?v=20261126-international-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    assert(html.includes('₹35,700'));
    assert(html.includes('one class application for one country'));
    assert(html.includes('not worldwide protection'));
  }
  if(file==='private-limited-company-registration.html') {
    assert.equal(window.testFunctions.calculationType('CORPORATE & SECRETARIAL',file),'');
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('shareholding')));
    assert(html.includes('enquiry.js?v=20261126-company-readiness-2'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    assert(!/<a[^>]*href="#pricing"[^>]*data-enquiry-cta/.test(html));
    for(const price of ['₹9,999','₹14,999','₹54,599']) assert(html.includes(price));
  }
  if(file==='llp-registration.html'||file==='opc-registration.html') {
    assert.equal(window.testFunctions.calculationType('CORPORATE & SECRETARIAL',file),'');
    const items=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes(file==='llp-registration.html'?'profit-sharing':'Nominee')));
    assert(code.includes('["private-limited-company-registration.html", "llp-registration.html", "opc-registration.html"].includes(filename)'));
    assert(html.includes('enquiry.js?v=20261126-llp-opc-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    assert(!/<a[^>]*href="#pricing"[^>]*data-enquiry-cta/.test(html));
  }
  if(file==='digital-marketing.html') {
    assert.equal(window.testFunctions.calculationType('BUSINESS GROWTH',file),'');
    const items=window.testFunctions.readinessItems('BUSINESS GROWTH',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('promotion budget')));
    assert(html.includes('enquiry.js?v=20261126-marketing-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    for(const price of ['₹5,200','₹8,200','₹16,200']) assert(html.includes(price));
    assert(!html.includes('What determines the final scope?'));
  }
  if(file==='logo-design.html') {
    assert.equal(window.testFunctions.calculationType('BUSINESS GROWTH',file),'');
    const items=window.testFunctions.readinessItems('BUSINESS GROWTH',file);
    assert.equal(items.length,5);
    assert(items.some(x=>x.includes('File formats')));
    assert(html.includes('enquiry.js?v=20261127-logo-readiness'));
    for(const target of ['pricing','service-preparation','enquiry-title']) assert(html.includes('id="'+target+'"'));
    for(const price of ['₹5,700','₹7,000','₹11,200']) assert(html.includes(price));
    assert(!html.includes('labour law compliance'));
    assert(!html.includes('What determines the final scope?'));
  }
  const llp=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','llp-annual-filing.html');
  assert.equal(llp.length,5);
  assert(llp.some(x=>x.includes('Form 11/Form 8')));
  assert(!llp.some(x=>x.includes('Event date')));
  const itr=window.testFunctions.readinessItems('INCOME TAX & TDS','income-tax-return-filing.html');
  assert.equal(itr.length,5);
  assert(itr.some(x=>x.includes('Form 26AS')));
  assert(itr.some(x=>x.includes('foreign-income')));
  assert(itr.some(x=>x.includes('residential status')));
  assert(!itr.some(x=>x.includes('Deductor TAN')));
  const company=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','company-annual-filing.html');
  assert.equal(company.length,5);
  assert(company.some(x=>x.includes('financial year')));
  assert(company.some(x=>x.includes('shareholder')));
  assert(company.some(x=>x.includes('Meeting dates')));
  assert(!company.some(x=>x.includes('LLPIN')||x.includes('Event date')));
  const epf=window.testFunctions.readinessItems('WORKFORCE COMPLIANCE','epf-registration.html');
  assert.equal(epf.length,5);
  assert(epf.some(x=>x.includes('existing UANs')));
  assert(epf.some(x=>x.includes('Ownership')));
  assert(!epf.some(x=>x.includes('insurance numbers')));
  const esic=window.testFunctions.readinessItems('WORKFORCE COMPLIANCE','esic-registration.html');
  assert.equal(esic.length,5);
  assert(esic.some(x=>x.includes('Principal employer')));
  assert(esic.some(x=>x.includes('existing insurance numbers')));
  assert(!esic.some(x=>x.includes('UAN')));
  const esi=window.testFunctions.readinessItems('WORKFORCE COMPLIANCE','esi-returns.html');
  assert.equal(esi.length,5);
  assert(esi.some(x=>x.includes('insurance numbers')));
  assert(!esi.some(x=>x.includes('UAN')));
  if(file==='esi-returns.html'||file==='esic-registration.html') {
    const source=html.match(/<div class="ip-source-note">[\s\S]*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    assert.equal(source[1],'https://www.esic.gov.in/');
    assert.equal(source[2],'ESIC');
    assert(!html.includes('https://www.epfindia.gov.in/'));
  }
  const pf=window.testFunctions.readinessItems('WORKFORCE COMPLIANCE','pf-returns.html');
  assert.equal(pf.length,5);
  assert(pf.some(x=>x.includes('UANs')));
  assert(pf.some(x=>x.includes('non-contributory')));
  assert(window.testFunctions.readinessItems('WORKFORCE COMPLIANCE','epf-registration.html').some(x=>x.includes('Entity PAN')));
  const correction=window.testFunctions.readinessItems('INCOME TAX & TDS','tds-return-revision.html');
  assert.equal(correction.length,5);
  assert(correction.some(x=>x.includes('Original token')));
  assert(correction.some(x=>x.includes('proposed changes')));
  assert(!correction.some(x=>x.includes('residential status')));
  const tds=window.testFunctions.readinessItems('INCOME TAX & TDS','tds-returns.html');
  assert.equal(tds.length,5);
  assert(tds.some(x=>x.includes('Deductor TAN')));
  assert(tds.some(x=>x.includes('Challans')));
  assert(!tds.some(x=>x.includes('residential status')));
  const items=window.testFunctions.readinessItems('GST & INDIRECT TAX','gst-returns.html');
  assert.equal(items.length,5);
  assert(items.some(x=>x.includes('GSTR-2B')));
  assert(!items.some(x=>x.includes('place address')));
  const registration=window.testFunctions.readinessItems('GST & INDIRECT TAX','gst-registration.html');
  assert(registration.some(x=>x.includes('place address')),'Registration retains its own checklist');
}
}
console.log('PASS: GST, TDS filing/revision and PF/ESI/LLP and EPF/ESIC registration enquiry links, native anchors, service name, no lead events, contact deduplication, preview isolation and return-specific readiness');
