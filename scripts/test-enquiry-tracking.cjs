const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
async function scenario(file, outcome='acknowledged') {
  const events=[], status={dataset:{}}, fields={}; let reset=false;
  const form={getAttribute:n=>n==='data-sheet-endpoint'?'https://script.google.com/macros/s/test/exec':'ROC Search Report',checkValidity:()=>true,reportValidity(){},setAttribute(){},querySelectorAll:()=>[],reset(){reset=true},querySelector:s=>s==='.ip-form-status'?status:(fields[s]||={setCustomValidity(){},focus(){}})};
  class FormData {constructor(){this.data={name:'PRIVATE_NAME',phone:'1234567890',email:'private@example.com',consent:'yes',service:'ROC Search Report'}}get(k){return this.data[k]||''}set(k,v){this.data[k]=v}}
  const window={location:{hostname:'www.instantprofessionals.in',origin:'https://www.instantprofessionals.in',pathname:'/roc-search-report.html',href:'https://www.instantprofessionals.in/roc-search-report.html?email=private@example.com'},gtag:(...a)=>events.push(a),open:()=>null,setTimeout:()=>1,clearTimeout(){}};
  const document={readyState:'loading',querySelector:()=>null,addEventListener(){},createElement:()=>({}),head:{appendChild(){}}};
  let code=readFileSync(path.join(root,'assets/js',file),'utf8');
  const i=code.lastIndexOf('})();');
  code=code.slice(0,i)+'window.testFunctions={submitOnline,continueOnWhatsApp};'+code.slice(i);
  vm.runInNewContext(code,{window,document,FormData,fetch:async()=>{if(outcome==='offline')throw Error('offline');return outcome==='opaque'?{type:'opaque'}:{ok:true,json:async()=>({success:true,enquiryId:'IP-QA-TRACKING'})}},AbortController,URLSearchParams,console});
  await window.testFunctions.submitOnline(form);
  assert(!reset,'Keep form values when receipt is unknown');
  assert.equal(events.filter(e=>e[1]==='enquiry_submit_attempt').length,1);
  if(outcome==='acknowledged'){assert.equal(events.filter(e=>e[1]==='generate_lead').length,1);assert.match(status.textContent,/has been recorded/);}
  else {assert(!events.some(e=>e[1]==='generate_lead'));assert.equal(status.dataset.state,'error');}
  events.length=0;
  window.testFunctions.continueOnWhatsApp(form);
  assert(events.some(e=>e[1]==='enquiry_handoff'));
  assert(!events.some(e=>e[1]==='generate_lead'));
  assert(!JSON.stringify(events).includes('private@example.com'));
  assert(!JSON.stringify(events).includes('PRIVATE_NAME'));
}
(async()=>{
  for(const file of ['enquiry.js','enquiry-home.js']){for(const outcome of ['acknowledged','opaque','offline'])await scenario(file,outcome)}
  const events=[],listeners=[];
  const window={addEventListener(){},location:{hostname:'www.instantprofessionals.in',origin:'https://www.instantprofessionals.in',pathname:'/guide.html',href:'https://www.instantprofessionals.in/guide.html'},gtag:(...a)=>events.push(a),__ipGoogleAnalyticsId:'G-TG0272S260'};
  const document={title:'Guide',addEventListener:(n,f)=>listeners.push(f)};
  const code=readFileSync(path.join(root,'assets/js/analytics.js'),'utf8');
  vm.runInNewContext(code,{window,document,URL});vm.runInNewContext(code,{window,document,URL});
  assert.equal(listeners.length,1);
  for(const href of ['tel:+918209785294','https://wa.me/918209785294?text=PRIVATE_NAME','roc-search-report.html#enquiry-title']){
    const link={getAttribute:n=>n==='href'?href:'ROC Search Report',hasAttribute:()=>href.startsWith('roc-')};
    listeners[0]({target:{closest:()=>link}});
  }
  assert.deepEqual(events.map(e=>e[1]),['phone_click','whatsapp_click','enquiry_cta_click']);
  assert(!JSON.stringify(events).includes('PRIVATE_NAME'));

  // Exercise the actual informational-page CTAs, not only synthetic attributes.
  for (const [file, service, expectedCount] of [
    ['din-application-documents-process.html', 'DIN Application', 1],
    ['llp-name-change-procedure.html', 'LLP Name Change', 1],
    ['trademark-watch-service-cost.html', 'Trademark Watch Service', 1],
    ['online-ca-services.html', 'Online CA Services', 2],
    ['compliance-handover-checklist.html', 'General enquiry', 2]
  ]) {
    const html=readFileSync(path.join(root,file),'utf8');
    const ctas=[...html.matchAll(/<a\b[^>]*\bdata-enquiry-cta\b[^>]*>/g)];
    assert.equal(ctas.length,expectedCount,file+' CTA coverage');
    window.location.pathname='/'+file;
    for (const [tag] of ctas) {
      const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
      const link={getAttribute:n=>attrs[n]||null,hasAttribute:n=>n==='data-enquiry-cta'};
      const before=events.length;
      listeners[0]({target:{closest:()=>link}});
      assert.equal(events.length,before+1,file+' must track once');
      assert.equal(events.at(-1)[1],'enquiry_cta_click');
      assert.equal(events.at(-1)[2].service_name,service);
      assert.equal(events.at(-1)[2].page_location,'https://www.instantprofessionals.in/'+file);
      assert(!events.slice(before).some(e=>e[1]==='generate_lead'),'CTA is not a received lead');
    }
  }
  // A normal same-tab resource enquiry must wait for GA or its timeout,
  // then navigate once without reporting a completed lead.
  const handover=readFileSync(path.join(root,'compliance-handover-checklist.html'),'utf8');
  const handoverCtas=[...handover.matchAll(/<a\b[^>]*\bdata-enquiry-cta\b[^>]*>/g)];
  for(const [tag] of handoverCtas) for(const completion of ['callback','timeout']) {
    const sent=[], navigations=[], clickHandlers=[], timers=[];
    const w={
      __ipGoogleAnalyticsId:'G-TG0272S260', addEventListener(){},
      location:{hostname:'www.instantprofessionals.in',origin:'https://www.instantprofessionals.in',
        pathname:'/compliance-handover-checklist.html',
        href:'https://www.instantprofessionals.in/compliance-handover-checklist.html?private=DO_NOT_SEND',
        assign:url=>navigations.push(url)},
      gtag:(...args)=>sent.push(args),setTimeout:fn=>{timers.push(fn);return 1},clearTimeout(){}
    };
    const d={title:'Compliance Handover',addEventListener:(name,fn)=>{if(name==='click')clickHandlers.push(fn)}};
    vm.runInNewContext(code,{window:w,document:d,URL});
    const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    let prevented=false;
    clickHandlers[0]({button:0,target:{closest:()=>({
      getAttribute:n=>attrs[n]||null,hasAttribute:n=>n==='data-enquiry-cta'
    })},preventDefault(){prevented=true}});
    assert(prevented);
    assert.equal(navigations.length,0);
    assert.equal(sent.length,1);
    assert.equal(sent[0][1],'enquiry_cta_click');
    assert.equal(sent[0][2].service_name,'General enquiry');
    assert.equal(sent[0][2].event_timeout,1000);
    assert(!JSON.stringify(sent).includes('DO_NOT_SEND'));
    (completion==='callback'?sent[0][2].event_callback:timers[0])();
    sent[0][2].event_callback(); timers[0]();
    assert.deepEqual(navigations,['https://www.instantprofessionals.in/index.html#contact']);
    assert(!sent.some(e=>e[1]==='generate_lead'));
  }
  // Arrival attribution survives source unload and is consumed once.
  for (const stored of [String(Date.now()), String(Date.now()-60000), String(Date.now()+60000), 'invalid', null]) {
    let value=stored; const received=[];
    const w={location:{hostname:'www.instantprofessionals.in',origin:'https://www.instantprofessionals.in',pathname:'/index.html',hash:'#contact'},
      gtag:(...args)=>received.push(args),sessionStorage:{getItem:()=>value,removeItem:()=>{value=null}},
      addEventListener(){}};
    const d={readyState:'complete',addEventListener(){},querySelectorAll:()=>[]};
    const home=readFileSync(path.join(root,'assets/js/enquiry-home.js'),'utf8');
    vm.runInNewContext(home,{window:w,document:d,URL});
    vm.runInNewContext(home,{window:w,document:d,URL});
    assert.equal(value,null);
    assert.equal(received.length,stored && Number.isFinite(Number(stored)) && Math.abs(Date.now()-Number(stored))<5000 ? 1 : 0);
    if(received.length){assert.equal(received[0][1],'enquiry_cta_click');assert.equal(received[0][2].service_name,'General enquiry');assert.equal(received[0][2].page_location,'https://www.instantprofessionals.in/compliance-handover-checklist.html');}
  }
  for(const [tag] of handoverCtas) {
    let handler, saved; const events=[];
    const w={__ipGoogleAnalyticsId:'G-TG0272S260',addEventListener(){},
      location:{hostname:'www.instantprofessionals.in',origin:'https://www.instantprofessionals.in',pathname:'/compliance-handover-checklist.html',href:'https://www.instantprofessionals.in/compliance-handover-checklist.html'},
      sessionStorage:{setItem:(key,value)=>{assert.equal(key,'ip.handoverEnquiryArrival');saved=value}},
      gtag:(...args)=>events.push(args)};
    vm.runInNewContext(code,{window:w,document:{addEventListener:(name,fn)=>{handler=fn}},URL});
    assert(tag.includes('data-handover-arrival'));
    handler({button:0,target:{closest:()=>({getAttribute:n=>n==='href'?'index.html#contact':null,hasAttribute:n=>['data-enquiry-cta','data-handover-arrival'].includes(n)})},preventDefault(){throw Error('Arrival tracking preserves native navigation')}});
    assert(Number.isFinite(Number(saved)));
    assert.equal(events.length,0,'Source must not duplicate the arrival event');
  }
  for (const hostname of ['localhost', '127.0.0.1', 'preview.example.com', '']) {
    const previewWindow={location:{hostname},gtag:()=>{throw Error('Preview must not track')}};
    const previewDocument={readyState:'loading',addEventListener(){},querySelector(){throw Error('Preview must not load GA')}};
    vm.runInNewContext(code,{window:previewWindow,document:previewDocument});
    vm.runInNewContext(readFileSync(path.join(root,'assets/js/enquiry.js'),'utf8'),{window:previewWindow,document:previewDocument});
  }
  console.log('PASS: both enquiry flows, network failures, receipt wording, contact privacy, guide contact events and duplicate binding');
})().catch(e=>{console.error(e);process.exit(1)});
