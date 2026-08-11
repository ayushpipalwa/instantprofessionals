(function(){
"use strict";
const path=decodeURIComponent(location.pathname.split('/').pop()||'').toLowerCase();
const HOME=(path===''||path==='index.html');

const catalog={
  'gst registration.html':{group:'Registration',title:'GST Registration',summary:'Professional support for GST registration, document review and portal filing based on the current statutory framework.',steps:['Eligibility and registration requirement review','Document and business-detail verification','GST REG-01 preparation and filing','Query / verification support where required'],related:[['GST Returns','GSTreturns.html'],['GST LUT','GST-LUT-LETTEROFundertaking.html'],['GST Cancellation','gst-cancellation.html']]},
  'msme registration.html':{group:'Registration',title:'Udyam MSME Registration',summary:'Udyam registration support for eligible micro, small and medium enterprises, including classification and application review.',steps:['Enterprise and activity review','PAN / GST-linked detail verification','Udyam application preparation','Certificate and record handover'],related:[['GST Registration','GST Registration.html'],['IEC Registration','iesregistration.html']]},
  'iesregistration.html':{group:'Registration',title:'IEC Registration',summary:'Import Export Code application support for businesses proposing to import, export or undertake cross-border trade.',steps:['Applicant and constitution review','DGFT application preparation','Document verification','IEC issuance support'],related:[['GST Registration','GST Registration.html'],['MSME Registration','MSME Registration.html']]},
  'incometaxreturns.html':{group:'Returns',title:'Income Tax Return Filing',summary:'Return preparation and filing with a professional review of income, deductions, tax credits, disclosures and applicable schedules.',steps:['Income and information collection','Tax-credit and disclosure review','Return computation and preparation','Filing and acknowledgement support'],related:[['TDS Returns','tdsreturns.html'],['TDS Revision','tdsreturnrevision.html']]},
  'tdsreturns.html':{group:'Returns',title:'TDS Return Filing',summary:'Quarterly TDS statement preparation, validation and filing support for businesses, employers and other deductors.',steps:['Challan and deduction reconciliation','PAN and section review','Statement preparation and validation','Filing and correction support'],related:[['TDS Revision','tdsreturnrevision.html'],['Income Tax Returns','incometaxreturns.html']]},
  'tdsreturnrevision.html':{group:'Returns',title:'TDS Return Revision',summary:'Correction support for filed TDS statements where deductee, challan, PAN or other reporting details need revision.',steps:['Original statement and error review','Correction type identification','Revised statement preparation','Validation and filing support'],related:[['TDS Returns','tdsreturns.html']]},
  'gstreturns.html':{group:'Returns',title:'GST Return Filing',summary:'Recurring GST return support with reconciliation, liability review and filing assistance for registered businesses.',steps:['Sales and purchase data review','Return reconciliation','Tax-liability and ITC review','Return filing and working-paper support'],related:[['GST Registration','GST Registration.html'],['GST LUT','GST-LUT-LETTEROFundertaking.html']]},
  'gst-lut-letterofundertaking.html':{group:'Returns',title:'GST LUT Filing',summary:'Letter of Undertaking filing support for eligible exporters and zero-rated suppliers operating without payment of integrated tax.',steps:['Eligibility review','Financial-year applicability check','LUT preparation','Portal filing and acknowledgement'],related:[['GST Returns','GSTreturns.html'],['GST Registration','GST Registration.html']]},
  'companyannualfilling.html':{group:'Corporate Compliance',title:'Company Annual Filing',summary:'Annual ROC filing support for companies, including document coordination, statutory-form preparation and filing review.',steps:['Annual filing applicability review','Financial and statutory data collection','Form preparation and certification coordination','ROC filing and acknowledgement'],related:[['Add a Director','addadirector.html'],['LLP Annual Filing','llpannualfilling.html']]},
  'llpannualfilling.html':{group:'Corporate Compliance',title:'LLP Annual Filing',summary:'Annual LLP compliance support covering prescribed statements, financial information and ROC filing coordination.',steps:['LLP master-data and filing review','Financial information collection','Form preparation','ROC filing and acknowledgement'],related:[['Company Annual Filing','companyannualfilling.html']]},
  'addadirector.html':{group:'Corporate Compliance',title:'Appointment of Director',summary:'Professional support for director appointment, consent documentation, board process and ROC filing.',steps:['Eligibility and DIN review','Consent and board documentation','Appointment filing preparation','Statutory register and record update'],related:[['Company Annual Filing','companyannualfilling.html']]},
  'trademark-registration.html':{group:'Intellectual Property',title:'Trademark Registration',summary:'Trademark filing support from preliminary review through application preparation and prosecution coordination.',steps:['Applicant and mark-detail review','Classification and filing strategy','Application preparation and filing','Post-filing tracking and response support'],related:[['Trademark Objections','trademark-objections.html'],['Copyright Application','Copyright-application.html']]},
  'trademark-objections.html':{group:'Intellectual Property',title:'Trademark Objection Response',summary:'Professional assistance for examination-report review, legal response preparation and hearing-stage coordination where required.',steps:['Examination report review','Grounds and evidence analysis','Response drafting and filing','Hearing coordination if applicable'],related:[['Trademark Registration','Trademark-registration.html']]},
  'copyright-application.html':{group:'Intellectual Property',title:'Copyright Application',summary:'Application support for eligible literary, artistic, software and other copyrightable works.',steps:['Work and ownership review','Application data preparation','Document and declaration coordination','Filing and diary-number support'],related:[['Trademark Registration','Trademark-registration.html']]},
  'epf registration.html':{group:'Workforce Compliance',title:'EPF Registration',summary:'EPF registration support for establishments requiring or opting for provident-fund coverage.',steps:['Coverage and establishment review','Employer and workforce data collection','Registration preparation','Portal and record support'],related:[['PF Returns','pfreturns.html'],['ESI Returns','Esi returns.html']]},
  'pfreturns.html':{group:'Workforce Compliance',title:'PF Return Support',summary:'Recurring provident-fund compliance support covering payroll data, contribution review and portal coordination.',steps:['Payroll and contribution review','Employee / UAN reconciliation','Return and challan preparation support','Compliance record handover'],related:[['EPF Registration','epf registration.html'],['ESI Returns','Esi returns.html']]},
  'esi returns.html':{group:'Workforce Compliance',title:'ESI Return Support',summary:'Recurring employee-state-insurance compliance support for covered establishments.',steps:['Employee and wage review','Contribution reconciliation','Return / portal support','Compliance record handover'],related:[['EPF Registration','epf registration.html'],['PF Returns','pfreturns.html']]}
};

function titleCaseFile(){
  const raw=(location.pathname.split('/').pop()||'service').replace(/\.html?$/i,'').replace(/[-_]+/g,' ');
  return raw.replace(/\b\w/g,c=>c.toUpperCase());
}

function inferGroup(){
  if(/trademark|copyright|ipr/.test(path))return 'Intellectual Property';
  if(/gst|tax|tds|return/.test(path))return 'Tax & Returns';
  if(/company|director|llp|share|registered|office|moa|aoa|roc|opc/.test(path))return 'Corporate Compliance';
  if(/pf|epf|esi|labour/.test(path))return 'Workforce Compliance';
  if(/registration|license|licence|iec|msme|fssai/.test(path))return 'Registrations & Licences';
  return 'Professional Services';
}

function serviceMeta(){
  if(catalog[path])return catalog[path];
  const h1=document.querySelector('h1');
  const title=(h1&&h1.textContent.trim())||titleCaseFile();
  return {group:inferGroup(),title,summary:'Practical professional assistance for this service, with document review, filing support and coordinated compliance execution.',steps:['Scope and applicability review','Document and information checklist','Preparation and professional review','Filing / execution and acknowledgement'],related:[]};
}

function ensureStyles(){
  if(document.getElementById('ip-multipage-plan-style'))return;
  const s=document.createElement('style');
  s.id='ip-multipage-plan-style';
  s.textContent=`
  :root{--ip-navy:#0b2341;--ip-green:#3f8f4d;--ip-gold:#c28a32;--ip-line:#dfe7e3;--ip-muted:#647486;--ip-soft:#f7faf8}
  .ip-service-shell{padding:34px 0 8px}.ip-service-hero{position:relative;overflow:hidden;border-radius:24px;background:linear-gradient(135deg,#0b2341 0%,#12365d 72%,#19496f 100%);color:#fff;padding:42px;margin-bottom:26px;box-shadow:0 18px 55px rgba(11,35,65,.12)}.ip-service-hero:after{content:"";position:absolute;right:-120px;top:-120px;width:320px;height:320px;border:1px solid rgba(255,255,255,.10);border-radius:50%}.ip-service-hero .ip-kicker{display:inline-block;font:800 11px/1.2 Poppins,sans-serif;letter-spacing:.14em;color:#96d9a1;margin-bottom:13px}.ip-service-hero h1{font:800 clamp(30px,4vw,48px)/1.06 Poppins,sans-serif;letter-spacing:-.045em;margin:0 0 14px;color:#fff}.ip-service-hero p{max-width:760px;color:#dbe5ee;font-size:16px;line-height:1.8;margin:0}.ip-service-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}.ip-service-actions a{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border-radius:999px;font:700 12px/1 Poppins,sans-serif;text-decoration:none}.ip-service-actions .primary{background:#fff;color:#0b2341}.ip-service-actions .secondary{border:1px solid rgba(255,255,255,.28);color:#fff}.ip-service-proof{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:28px}.ip-service-proof div{padding:12px 14px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:rgba(255,255,255,.04)}.ip-service-proof b{display:block;font:800 12px Poppins,sans-serif}.ip-service-proof span{display:block;font-size:11px;color:#cbd8e4;margin-top:3px}
  .ip-process-wrap,.ip-related-wrap{max-width:1100px;margin:0 auto 26px}.ip-section-label{display:block;text-align:center;color:var(--ip-gold);font:800 10px Poppins,sans-serif;letter-spacing:.16em;margin-bottom:8px}.ip-process-wrap h2,.ip-related-wrap h2{color:var(--ip-navy);text-align:center;font:800 26px Poppins,sans-serif;letter-spacing:-.03em;margin:0 0 18px}.ip-process-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.ip-process-card{background:#fff;border:1px solid var(--ip-line);border-radius:17px;padding:19px;min-height:150px}.ip-process-card i{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#eef7f0;color:var(--ip-green);font-style:normal;font:800 11px Poppins,sans-serif;margin-bottom:16px}.ip-process-card b{display:block;color:var(--ip-navy);font:700 14px Poppins,sans-serif;line-height:1.45}.ip-related-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}.ip-related-grid a{padding:10px 13px;border:1px solid var(--ip-line);border-radius:999px;color:var(--ip-navy);background:#fff;text-decoration:none;font:700 12px Poppins,sans-serif}.ip-related-grid a:hover{border-color:#a8cdb0;color:var(--ip-green)}
  body:not(.ip-home-page) .container-one,body:not(.ip-home-page) .container-two{background:var(--ip-soft)!important}body:not(.ip-home-page) .container-one>.container,body:not(.ip-home-page) .container-two>.container{max-width:1100px}body:not(.ip-home-page) .container-one h1,body:not(.ip-home-page) .container-two h1,body:not(.ip-home-page) .container-one h2,body:not(.ip-home-page) .container-two h2{color:var(--ip-navy);font-family:Poppins,sans-serif;font-weight:800;letter-spacing:-.03em}body:not(.ip-home-page) .container-one p,body:not(.ip-home-page) .container-two p,body:not(.ip-home-page) .container-one li,body:not(.ip-home-page) .container-two li{color:var(--ip-muted);line-height:1.75}
  .ip-price-scope-note{max-width:1100px;margin:0 auto 20px;padding:12px 15px;border-radius:12px;background:#fff8eb;border:1px solid #f1ddb6;color:#7d643a;font-size:12px;line-height:1.6}.ip-price-scope-note b{color:#5d4721}
  @media(max-width:991px){.ip-process-grid{grid-template-columns:repeat(2,1fr)}.ip-service-proof{grid-template-columns:1fr}}
  @media(max-width:767px){.ip-service-shell{padding-top:18px}.ip-service-hero{padding:28px 22px;border-radius:18px}.ip-process-grid{grid-template-columns:1fr}.ip-service-actions{flex-direction:column}.ip-service-actions a{justify-content:center}.ip-service-proof{display:none}}
  `;
  document.head.appendChild(s);
}

function removeLegacyTopHero(){
  const legacy=document.querySelector('body > .container.my-5.mt-5.py-5');
  if(legacy)legacy.remove();
}

function buildHero(meta){
  if(document.querySelector('.ip-service-shell'))return;
  const target=document.querySelector('main')||document.querySelector('.container-one')||document.body;
  const wrap=document.createElement('section');
  wrap.className='ip-service-shell';
  wrap.innerHTML=`<div class="container"><div class="ip-service-hero"><span class="ip-kicker">${meta.group.toUpperCase()} / INSTANT PROFESSIONALS</span><h1>${meta.title}</h1><p>${meta.summary}</p><div class="ip-service-actions"><a class="primary" href="#contact">Talk to our team <i class="bi bi-arrow-right"></i></a><a class="secondary" href="index.html#services">Explore all services</a></div><div class="ip-service-proof"><div><b>Professional review</b><span>Scope checked before execution</span></div><div><b>Document-led process</b><span>Clear information and checklist flow</span></div><div><b>Coordinated support</b><span>From preparation to acknowledgement</span></div></div></div></div>`;
  if(target===document.body)document.body.insertBefore(wrap,document.body.firstChild);else target.parentNode.insertBefore(wrap,target);
}

function buildProcess(meta){
  if(document.querySelector('.ip-process-wrap'))return;
  const target=document.querySelector('.container-one')||document.querySelector('main')||document.body;
  const sec=document.createElement('section');
  sec.className='container ip-process-wrap';
  sec.innerHTML=`<span class="ip-section-label">HOW WE HANDLE IT</span><h2>A clearer service process.</h2><div class="ip-process-grid">${meta.steps.map((step,i)=>`<article class="ip-process-card"><i>0${i+1}</i><b>${step}</b></article>`).join('')}</div>`;
  if(target===document.body)document.body.appendChild(sec);else target.parentNode.insertBefore(sec,target);
}

function buildRelated(meta){
  if(!meta.related||!meta.related.length||document.querySelector('.ip-related-wrap'))return;
  const sec=document.createElement('section');
  sec.className='container ip-related-wrap';
  sec.innerHTML=`<span class="ip-section-label">RELATED SERVICES</span><h2>Continue with connected compliance.</h2><div class="ip-related-grid">${meta.related.map(x=>`<a href="${x[1]}">${x[0]} <i class="bi bi-arrow-up-right"></i></a>`).join('')}</div>`;
  const footer=document.querySelector('footer')||document.querySelector('#footer');
  if(footer)footer.parentNode.insertBefore(sec,footer);else document.body.appendChild(sec);
}

function addScopeNote(){
  if(document.querySelector('.ip-price-scope-note'))return;
  const priced=[...document.querySelectorAll('body *')].some(el=>el.children.length===0&&/(₹|Rs\.?|INR)\s*[\d,]+/i.test(el.textContent||''));
  if(!priced)return;
  const n=document.createElement('div');
  n.className='container ip-price-scope-note';
  n.innerHTML='<b>Professional fee note:</b> displayed service fees are indicative professional-assistance charges unless a page expressly states otherwise. Government fees, stamp duty, certification, DSC, portal charges or third-party costs may be additional where applicable.';
  const process=document.querySelector('.ip-process-wrap');
  if(process)process.insertAdjacentElement('afterend',n);
}

function normalizePage(){
  document.body.classList.add('ip-service-page');
  document.querySelectorAll('img').forEach(img=>{if(!img.alt)img.alt='Instant Professionals service information';});
  document.querySelectorAll('a[href="#"]').forEach(a=>{if(/contact|consult|talk|enquir|start/i.test(a.textContent||''))a.setAttribute('href','#contact');});
}

function run(){
  if(HOME){document.body.classList.add('ip-home-page');return;}
  ensureStyles();
  normalizePage();
  const meta=serviceMeta();
  removeLegacyTopHero();
  buildHero(meta);
  buildProcess(meta);
  buildRelated(meta);
  setTimeout(addScopeNote,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();