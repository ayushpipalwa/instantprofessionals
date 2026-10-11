const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
async function scenario(file, fails=false) {
  const events=[], status={dataset:{}}, fields={}; let reset=false;
  const form={getAttribute:n=>n==='data-sheet-endpoint'?'https://script.google.com/macros/s/test/exec':'ROC Search Report',checkValidity:()=>true,reportValidity(){},setAttribute(){},querySelectorAll:()=>[],reset(){reset=true},querySelector:s=>s==='.ip-form-status'?status:(fields[s]||={setCustomValidity(){},focus(){}})};
  class FormData {constructor(){this.data={name:'PRIVATE_NAME',phone:'1234567890',email:'private@example.com',consent:'yes',service:'ROC Search Report'}}get(k){return this.data[k]||''}set(k,v){this.data[k]=v}}
  const window={location:{origin:'https://www.instantprofessionals.in',pathname:'/roc-search-report.html',href:'https://www.instantprofessionals.in/roc-search-report.html?email=private@example.com'},gtag:(...a)=>events.push(a),open:()=>({})};
  const document={readyState:'loading',querySelector:()=>null,addEventListener(){},createElement:()=>({}),head:{appendChild(){}}};
  let code=readFileSync(path.join(root,'assets/js',file),'utf8');
  const i=code.lastIndexOf('})();');
  code=code.slice(0,i)+'window.testFunctions={submitOnline,continueOnWhatsApp};'+code.slice(i);
  vm.runInNewContext(code,{window,document,FormData,fetch:async()=>{if(fails)throw Error('offline');return {type:'opaque'}},URLSearchParams,console});
  await window.testFunctions.submitOnline(form);
  assert(!reset,'Keep form values when receipt is unknown');
  if(fails){assert.equal(events.filter(e=>e[0]==='event').length,0);assert.equal(status.dataset.state,'error');}
  else {assert(events.some(e=>e[1]==='enquiry_submit_attempt'));assert.match(status.textContent,/receipt is not yet confirmed/);}
  events.length=0;
  window.testFunctions.continueOnWhatsApp(form);
  assert(events.some(e=>e[1]==='enquiry_handoff'));
  assert(!events.some(e=>e[1]==='generate_lead'));
  assert(!JSON.stringify(events).includes('private@example.com'));
  assert(!JSON.stringify(events).includes('PRIVATE_NAME'));
}
(async()=>{
  for(const file of ['enquiry.js','enquiry-home.js']){await scenario(file);await scenario(file,true)}
  const events=[],listeners=[];
  const window={location:{origin:'https://www.instantprofessionals.in',pathname:'/guide.html'},gtag:(...a)=>events.push(a),__ipGoogleAnalyticsId:'G-TG0272S260'};
  const document={title:'Guide',addEventListener:(n,f)=>listeners.push(f)};
  const code=readFileSync(path.join(root,'assets/js/analytics.js'),'utf8');
  vm.runInNewContext(code,{window,document});vm.runInNewContext(code,{window,document});
  assert.equal(listeners.length,1);
  for(const href of ['tel:+918209785294','https://wa.me/918209785294?text=PRIVATE_NAME','roc-search-report.html#enquiry-title']){
    const link={getAttribute:n=>n==='href'?href:'ROC Search Report',hasAttribute:()=>href.startsWith('roc-')};
    listeners[0]({target:{closest:()=>link}});
  }
  assert.deepEqual(events.map(e=>e[1]),['phone_click','whatsapp_click','enquiry_cta_click']);
  assert(!JSON.stringify(events).includes('PRIVATE_NAME'));
  console.log('PASS: both enquiry flows, network failures, receipt wording, contact privacy, guide contact events and duplicate binding');
})().catch(e=>{console.error(e);process.exit(1)});
