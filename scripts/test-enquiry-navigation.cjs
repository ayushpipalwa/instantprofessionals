const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const code=readFileSync(path.join(root,'assets/js/analytics.js'),'utf8');
const guides=[
  ['din-application-documents-process.html','DIN Application'],
  ['llp-name-change-procedure.html','LLP Name Change'],
  ['trademark-watch-service-cost.html','Trademark Watch Service']
];
function setup(file, mode='callback') {
  const events=[], navigations=[], timers=new Map(), handlers={};
  let nextTimer=0;
  const window={
    location:{hostname:'www.instantprofessionals.in',origin:'https://www.instantprofessionals.in',
      pathname:'/'+file,href:'https://www.instantprofessionals.in/'+file+'?private=value',
      assign:url=>navigations.push(url)},
    __ipGoogleAnalyticsId:'G-TG0272S260',
    addEventListener:(name,fn)=>{handlers[name]=fn},
    setTimeout:(fn,ms)=>{assert.equal(ms,1000);timers.set(++nextTimer,fn);return nextTimer},
    clearTimeout:id=>timers.delete(id),
    gtag:(...args)=>{events.push(args);if(mode==='throw')throw Error('tag failure')}
  };
  const document={title:'Guide',addEventListener:(name,fn)=>{handlers[name]=fn}};
  vm.runInNewContext(code,{window,document,URL});
  vm.runInNewContext(code,{window,document,URL});
  const tag=readFileSync(path.join(root,file),'utf8').match(/<a\b[^>]*\bdata-enquiry-cta\b[^>]*>/)[0];
  const attrs=Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  assert.match(readFileSync(path.join(root,file),'utf8'),/analytics\.js\?v=20261115-1/);
  const click=(overrides={},extraAttrs={})=>{
    const a={...attrs,...extraAttrs};
    const link={getAttribute:n=>a[n]??null,hasAttribute:n=>Object.hasOwn(a,n)||n==='data-enquiry-cta'};
    const event={button:0,target:{closest:()=>link},defaultPrevented:false,
      preventDefault(){this.defaultPrevented=true},...overrides};
    handlers.click(event);
    return event;
  };
  return {events,navigations,timers,handlers,click,attrs,window};
}
for(const [file,service] of guides) {
  for(const mode of ['callback','timeout','throw']) {
    const s=setup(file,mode);
    assert(s.click().defaultPrevented,file+' must defer native navigation');
    assert.equal(s.events.length,1);
    assert.equal(s.events[0][1],'enquiry_cta_click');
    const params=s.events[0][2];
    assert.equal(params.service_name,service);
    assert.equal(params.page_location,'https://www.instantprofessionals.in/'+file);
    assert.equal(params.event_timeout,1000);
    assert(!JSON.stringify(s.events).includes('private'));
    assert(!s.events.some(e=>e[1]==='generate_lead'));
    if(mode!=='throw') {
      assert.equal(s.navigations.length,0,'No unload before processing');
      assert(s.click().defaultPrevented);
      assert.equal(s.events.length,1,'Rapid duplicate click must not send twice');
      const timer=[...s.timers.values()][0];
      if(mode==='callback')params.event_callback();else timer();
      params.event_callback();timer();
    }
    assert.deepEqual(s.navigations,['https://www.instantprofessionals.in/'+s.attrs.href]);
    assert.equal(s.timers.size,0);
  }
  for(const overrides of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}]) {
    const s=setup(file);assert(!s.click(overrides).defaultPrevented);
    assert.equal(s.events.length,1);assert.equal(s.timers.size,0);assert.equal(s.navigations.length,0);
  }
  for(const attrs of [{target:'_blank'},{download:''},{href:'#details'},{href:'https://example.com/service'}]) {
    const s=setup(file);assert(!s.click({},attrs).defaultPrevented);
    assert.equal(s.timers.size,0);assert.equal(s.navigations.length,0);
  }
  const prevented=setup(file);prevented.click({defaultPrevented:true});assert.equal(prevented.events.length,0);
  const missing=setup(file);delete missing.window.gtag;assert(!missing.click().defaultPrevented);
  const restored=setup(file);restored.click();restored.events[0][2].event_callback();
  restored.handlers.pageshow();restored.click();assert.equal(restored.events.length,2,'Back navigation remains usable');
  console.log('PASS: '+service+' callback, timeout, failure, modifiers, privacy, repeat clicks and history restore');
}
