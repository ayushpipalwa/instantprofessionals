const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'assets/js/main.js'),'utf8');
const start=source.indexOf('function scrollto(sel)');
const end=source.indexOf('\non("click",".mobile-nav-toggle"',start);
assert(start>=0 && end>start);
const scrollCode=source.slice(start,end);
for(const headerHeight of [78,68]){
  for(const scrollY of [0,600]){
    for(const reduced of [false,true]){
      const before=[{style:{}},{style:{}}],after={style:{}};
      before.forEach(s=>{s.contains=()=>false;s.compareDocumentPosition=()=>4});
      after.contains=()=>false;after.compareDocumentPosition=()=>2;
      const actualTop=7000;
      const target={style:{},contains:()=>false,compareDocumentPosition:()=>0,
        get offsetTop(){return 5600},
        getBoundingClientRect(){return {top:actualTop-scrollY-before.filter(s=>s.style.contentVisibility!=='visible').length*700}}};
      const sections=[...before,target,after],calls=[];
      const context={
        $:sel=>sel==='#contact'?target:sel==='#header'?{offsetHeight:headerHeight}:null,
        document:{querySelectorAll:()=>sections},
        Node:{DOCUMENT_POSITION_FOLLOWING:4},
        window:{scrollY,matchMedia:()=>({matches:reduced}),scrollTo:x=>calls.push(x)}
      };
      vm.runInNewContext(scrollCode,context);
      context.scrollto('#missing');
      assert.equal(calls.length,0);
      assert(sections.every(s=>!s.style.contentVisibility));
      context.scrollto('#contact');
      assert.equal(calls.length,1);
      assert.equal(calls[0].top,actualTop-headerHeight,'Measure actual layout, not estimated offsetTop');
      assert.equal(calls[0].behavior,reduced?'instant':'smooth');
      assert(before.every(s=>s.style.contentVisibility==='visible'));
      assert.equal(target.style.contentVisibility,'visible');
      assert.equal(after.style.contentVisibility,undefined,'Keep later sections deferred');
      context.scrollto('#contact');
      assert.equal(calls[1].top,calls[0].top,'Repeat navigation remains stable');
    }
  }
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('assets/js/main.js?v=20261115-anchor-1'));
assert.match(html,/<a[^>]*class="[^"]*scrollto[^"]*"[^>]*href="#contact"[^>]*data-enquiry-cta[^>]*data-service="General enquiry"/);
console.log('PASS: fresh/repeat scroll, desktop/mobile offsets, reduced motion, missing anchor and deferred sections');
