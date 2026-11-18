const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
for(const [file,service] of [['gst-returns.html','GST Return Filing'],['tds-returns.html','TDS Return Filing'],['tds-return-revision.html','TDS Return Revision'],['pf-returns.html','PF Returns and Compliance'],['esi-returns.html','ESI Returns and Compliance'],['llp-annual-filing.html','LLP Annual Filing']]) {
const html=readFileSync(path.join(root,file),'utf8');
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
  assert.equal(ctas.length,2);
  for(const [tag] of ctas) {
    const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    assert.equal(attrs.href,'#enquiry-title');
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
  const llp=window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','llp-annual-filing.html');
  assert.equal(llp.length,5);
  assert(llp.some(x=>x.includes('Form 11/Form 8')));
  assert(!llp.some(x=>x.includes('Event date')));
  assert(window.testFunctions.readinessItems('CORPORATE & SECRETARIAL','company-annual-filing.html').some(x=>x.includes('CIN/LLPIN')));
  const esi=window.testFunctions.readinessItems('WORKFORCE COMPLIANCE','esi-returns.html');
  assert.equal(esi.length,5);
  assert(esi.some(x=>x.includes('insurance numbers')));
  assert(!esi.some(x=>x.includes('UAN')));
  if(file==='esi-returns.html') {
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
console.log('PASS: GST, TDS filing/revision and PF/ESI/LLP enquiry links, native anchors, service name, no lead events, contact deduplication, preview isolation and return-specific readiness');
