const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
for(const [file,service] of [['gst-returns.html','GST Return Filing'],['tds-returns.html','TDS Return Filing'],['tds-return-revision.html','TDS Return Revision'],['pf-returns.html','PF Returns and Compliance'],['esi-returns.html','ESI Returns and Compliance'],['llp-annual-filing.html','LLP Annual Filing'],['esic-registration.html','ESIC Registration'],['epf-registration.html','EPF Registration'],['company-annual-filing.html','Company Annual Filing'],['income-tax-return-filing.html','Income Tax Return Filing'],['gst-registration.html','GST Registration'],['accounting-bookkeeping.html','Accounting and bookkeeping'],['virtual-cfo.html','Virtual finance function'],['cma-project-report.html','CMA and project report'],['tax-notice-response.html','Income-tax notice response'],['opc-annual-filing.html','OPC Annual Filing'],['iec-registration.html','IEC Registration']]) {
const html=readFileSync(path.join(root,file),'utf8');
if(file==='opc-annual-filing.html'){assert(!html.includes('<li>MGT 7 Filing</li>'));assert.equal((html.match(/MGT-7A annual-return filing/g)||[]).length,3);assert(html.includes('id="service-preparation"'));}
let code=readFileSync(path.join(root,'assets/js/enquiry.js'),'utf8');
const end=code.lastIndexOf('})();');
code=code.slice(0,end)+'window.testFunctions={bindAnalyticsLinks,readinessItems};'+code.slice(end);
for(const hostname of ['www.instantprofessionals.in','localhost']) {
  const events=[],handlers=[];
  const window={location:{hostname,origin:'https://'+hostname,pathname:'/'+file},
    __ipGoogleAnalyticsId:'G-TG0272S260',gtag:(...args)=>events.push(args)};
  const document={readyState:'loading',addEventListener:(name,fn)=>{if(name==='click')handlers.push(fn)}};
  vm.runInNewContext(code,{window,document});
  window.testFunctions.bindAnalyticsLinks();
  assert.equal(handlers.length,1);
  const ctas=[...html.matchAll(/<a\b[^>]*\bdata-enquiry-cta\b[^>]*>/g)];
  assert.equal(ctas.length,file==='cma-project-report.html'?4:['company-annual-filing.html','income-tax-return-filing.html','gst-registration.html','accounting-bookkeeping.html','virtual-cfo.html','tax-notice-response.html'].includes(file)?3:2);
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
