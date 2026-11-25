const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const source=readFileSync(path.join(root,'assets/js/analytics.js'),'utf8');
let target=readFileSync(path.join(root,'assets/js/enquiry.js'),'utf8');
target=target.replace('  loadGoogleAnalytics();','  window.receiveRoc=trackRocEnquiryArrival;\n  loadGoogleAnalytics();');
const origin='https://www.instantprofessionals.in';
function scenario({stored=null,blocked=false,hash='#enquiry-title',hostname='www.instantprofessionals.in'}={}) {
 const values=new Map(stored===null?[]:[['ip.rocEnquiryArrival',stored]]),events=[],handlers={};
 const storage={setItem:(k,v)=>{if(blocked)throw Error('blocked');values.set(k,v)},getItem:k=>values.get(k)||null,removeItem:k=>values.delete(k)};
 const location={hostname,origin,pathname:'/roc-search-report-fees-format.html',href:origin+'/roc-search-report-fees-format.html?private=secret',hash:''};
 const window={location,sessionStorage:storage,__ipGoogleAnalyticsId:'G-TG0272S260',gtag:(...a)=>events.push(a),addEventListener:(n,f)=>handlers[n]=f,setTimeout:()=>1,clearTimeout:()=>{}};
 const document={readyState:'loading',title:'Guide',addEventListener:(n,f)=>handlers[n]=f};
 vm.runInNewContext(source,{window,document,URL});
 const click=handlers.click;
 function receive(){location.pathname='/roc-search-report.html';location.hash=hash;vm.runInNewContext(target,{window,document});}
 return {window,values,events,receive,click};
}
const html=readFileSync(path.join(root,'roc-search-report-fees-format.html'),'utf8');
const tags=html.match(/<a\b[^>]*data-enquiry-cta[^>]*>/g);
assert.equal(tags.length,2);
for(const tag of tags) {
 assert(tag.includes('data-enquiry-arrival'));
 const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 const s=scenario();
 const link={getAttribute:n=>attrs[n]??null,hasAttribute:n=>['data-enquiry-cta','data-enquiry-arrival'].includes(n)};
 s.click({button:0,target:{closest:()=>link},preventDefault(){throw Error('Arrival handoff preserves native navigation')}});
 assert.equal(s.events.length,0,'No source event to duplicate on arrival');
 assert.equal(s.values.size,1);
 assert(!JSON.stringify([...s.values]).includes('private'));
 s.receive();
 assert.equal(s.events.length,1);
 assert.equal(s.events[0][1],'enquiry_cta_click');
 assert.equal(s.events[0][2].service_name,'ROC Search Report');
 assert.equal(s.events[0][2].page_location,origin+'/roc-search-report-fees-format.html');
 assert.equal(s.values.size,0);
 s.window.receiveRoc();
 assert.equal(s.events.length,1,'Reload/history cannot replay consumed handoff');
 assert(!s.events.some(e=>e[1]==='generate_lead'));
}
for(const stored of ['invalid',String(Date.now()-60000),String(Date.now()+60000),null]) {
 const s=scenario({stored});s.receive();assert.equal(s.events.length,0);
}
for(const options of [{stored:String(Date.now()),hash:''},{stored:String(Date.now()),hostname:'localhost'},{blocked:true}]) {
 const s=scenario(options);s.receive();assert.equal(s.events.length,0);
}
console.log('PASS: both ROC handoffs, one-time consumption, expiry, privacy, destination guard and preview isolation');
