(function(){
"use strict";
const path=decodeURIComponent(location.pathname.split('/').pop()||'').toLowerCase();
const REVIEWED='11 August 2026';
const QUOTED_PRICE_FACTOR=0.70;

function removeLegacyYearContent(){
  const stale=/\b(2017|2018|2019|2020|2021)\b/;
  const pages=['incometaxreturns.html','tdsreturns.html','gst-lut-letterofundertaking.html','epf registration.html','gst registration.html','msme registration.html','companyannualfilling.html','opcfilling.html','llpannualfilling.html'];
  if(!pages.includes(path))return;
  document.querySelectorAll('.container-one p,.container-one li,.container-one span,.container-two p,.container-two li,.container-two span').forEach(el=>{if(stale.test(el.textContent||''))el.remove();});
}

function addFreshnessNote(){
  if(path==='index.html'||path==='')return;
  const first=document.querySelector('body > .container.my-5.mt-5.py-5');
  if(!first||document.querySelector('.ip-law-freshness'))return;
  const note=document.createElement('div');
  note.className='container ip-law-freshness';
  note.innerHTML='<div><i class="bi bi-shield-check"></i><span><b>Compliance content reviewed '+REVIEWED+'.</b> Statutory forms, thresholds and due dates can change through notifications and portal updates; applicability is checked at the time of engagement.</span></div>';
  first.insertAdjacentElement('afterend',note);
}

function refreshITR(){
  if(path!=='incometaxreturns.html')return;
  document.title='Income Tax Return Filing | Instant Professionals';
  const hero=document.querySelector('body > .container.my-5.mt-5.py-5 .row');
  if(hero){const copy=hero.querySelector('.col-md-4.my-5.py-5');if(copy)copy.innerHTML='<span class="ip-current-kicker">AY 2026-27 / FY 2025-26</span><h1 class="text-style">Income Tax Return Filing</h1><hr><p>Professional ITR preparation and filing for salaried individuals, professionals, businesses, firms, LLPs and companies, with review of income, deductions, tax credits and applicable disclosures.</p>';}
  const section=document.querySelector('.container-one .container');if(!section)return;
  section.innerHTML=`<div class="ip-current-content"><span class="ip-current-kicker">CURRENT FILING POSITION</span><h1>Income Tax Returns — AY 2026-27</h1><p class="ip-current-lead">Income earned during FY 2025-26 is filed for Assessment Year 2026-27. ITR-1 to ITR-7 are the prescribed return forms depending on taxpayer type, residential status and sources of income.</p><div class="ip-current-grid"><article><b>Individuals & HUFs</b><p>Return selection depends on salary, house property, capital gains, business/professional income, foreign assets and other disclosures.</p></article><article><b>Business & Professionals</b><p>Books of account, presumptive taxation, audit applicability, TDS/TCS credits and financial disclosures are reviewed before filing.</p></article><article><b>Firms, LLPs & Companies</b><p>Entity-specific return forms and mandatory filing requirements apply even in several loss or nil-income situations.</p></article></div><h3>Statutory due-date framework</h3><div class="ip-date-grid"><div><strong>31 July</strong><span>Other assessees</span></div><div><strong>31 August</strong><span>Business/profession cases not requiring audit</span></div><div><strong>31 October</strong><span>Companies and cases requiring audit, where transfer-pricing reporting does not apply</span></div><div><strong>30 November</strong><span>Cases where section 92E transfer-pricing reporting applies</span></div></div><div class="ip-current-note"><i class="bi bi-info-circle"></i><p>For AY 2026-27, the return relates to FY 2025-26 and continues to be governed by the Income-tax Act, 1961. The Income-tax Act, 2025 applies from 1 April 2026 for Tax Year 2026-27 onward. We verify the portal, applicable form and any notified extension before filing.</p></div></div>`;
}

function refreshGST(){
  if(path!=='gst registration.html')return;
  document.title='GST Registration | Instant Professionals';
  const section=document.querySelector('.container-one .container');if(!section)return;
  section.innerHTML=`<div class="ip-current-content"><span class="ip-current-kicker">GST REGISTRATION / CURRENT FRAMEWORK</span><h1>GST Registration</h1><p class="ip-current-lead">GST registration is PAN-based and filed electronically in FORM GST REG-01. Liability depends on aggregate turnover, the nature of supply, the State/UT and compulsory-registration provisions.</p><div class="ip-current-grid"><article><b>Threshold based</b><p>The general registration threshold for services is ₹20 lakh, subject to the lower threshold in specified States and exceptions under GST law.</p></article><article><b>Goods threshold</b><p>Eligible persons engaged exclusively in supply of goods may benefit from the notified ₹40 lakh threshold, subject to conditions and State applicability.</p></article><article><b>Compulsory registration</b><p>Section 24 and other special provisions can require registration irrespective of the normal threshold. Each case should be checked before relying on turnover alone.</p></article></div><div class="ip-current-note"><i class="bi bi-info-circle"></i><p>Registration, Aadhaar authentication/verification and document requirements are governed by the GST portal workflow and current notifications. We verify current portal requirements at the time of filing.</p></div></div>`;
}

function refreshMSME(){
  if(path!=='msme registration.html')return;
  document.title='Udyam MSME Registration | Instant Professionals';
  const section=document.querySelector('.container-one .container');if(!section)return;
  section.innerHTML=`<div class="ip-current-content"><span class="ip-current-kicker">UDYAM / MSME REGISTRATION</span><h1>Udyam Registration for MSMEs</h1><p class="ip-current-lead">The current Government system for MSME registration is Udyam Registration. The process is online, paperless and based on self-declaration, with PAN/GST-linked information drawn from Government databases as applicable.</p><div class="ip-date-grid"><div><strong>Micro</strong><span>Investment up to ₹2.5 crore and turnover up to ₹10 crore</span></div><div><strong>Small</strong><span>Investment up to ₹25 crore and turnover up to ₹100 crore</span></div><div><strong>Medium</strong><span>Investment up to ₹125 crore and turnover up to ₹500 crore</span></div></div><div class="ip-current-note"><i class="bi bi-info-circle"></i><p>Udyog Aadhaar/UAM is a legacy system. Existing eligible enterprises should use or migrate to the official Udyam framework. Government Udyam registration itself is free; our displayed fee is for professional assistance and support.</p></div></div>`;
}

function refreshTDS(){
  if(path!=='tdsreturns.html')return;
  const section=document.querySelector('.container-one .container');if(!section)return;
  section.querySelectorAll('p,li,span').forEach(el=>{if(/\b(2018|2019|2020|2021)\b/.test(el.textContent||''))el.remove()});
  const current=document.createElement('div');current.className='ip-current-note ip-current-note-top';current.innerHTML='<i class="bi bi-calendar-check"></i><p><b>Current TDS statement cycle:</b> quarterly statements are generally due on 31 July, 31 October, 31 January and 31 May for Q1, Q2, Q3 and Q4 respectively, subject to notified extensions and statement type.</p>';section.prepend(current);
}

function reduceQuotedPrices(){
  const pricePattern=/(₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)(\s*\/-)?/gi;
  const quoteSelectors=[
    'body > .container.my-5.mt-5.py-5 h1','body > .container.my-5.mt-5.py-5 h2','body > .container.my-5.mt-5.py-5 h3','body > .container.my-5.mt-5.py-5 h4','body > .container.my-5.mt-5.py-5 p','body > .container.my-5.mt-5.py-5 span','body > .container.my-5.mt-5.py-5 strong',
    '.card-header h1','.card-header h2','.card-header h3','.card-header h4','.card-header h5','.card-header p','.card-header span','.card-header strong',
    '.pricing h1','.pricing h2','.pricing h3','.pricing h4','.pricing p','.pricing span','.pricing strong'
  ].join(',');
  document.querySelectorAll(quoteSelectors).forEach(el=>{
    if(el.dataset.ipPrice30==='1'||el.children.length)return;
    const original=el.textContent||'';
    if(!/(₹|Rs\.?|INR)\s*[\d,]+/i.test(original))return;
    let changed=false;
    const revised=original.replace(pricePattern,(full,currency,amount,suffix='')=>{
      const current=Number(String(amount).replace(/,/g,''));
      if(!Number.isFinite(current)||current<=0)return full;
      const next=Math.round(current*QUOTED_PRICE_FACTOR);
      changed=true;
      return `₹ ${new Intl.NumberFormat('en-IN',{maximumFractionDigits:0}).format(next)}${suffix}`;
    });
    if(!changed)return;
    el.textContent=revised;
    el.dataset.ipPrice30='1';
    el.classList.add('ip-price-quote');
  });
}

function schedulePriceRefresh(){
  const apply=()=>reduceQuotedPrices();
  if(document.readyState==='complete'){setTimeout(apply,80);setTimeout(apply,450);}
  else window.addEventListener('load',()=>{setTimeout(apply,80);setTimeout(apply,450);},{once:true});
}

function injectStyles(){
  if(document.getElementById('ip-current-law-styles'))return;
  const s=document.createElement('style');s.id='ip-current-law-styles';s.textContent=`
  .ip-law-freshness{margin-top:-18px;margin-bottom:24px}.ip-law-freshness>div{display:flex;gap:12px;align-items:flex-start;padding:14px 18px;border:1px solid #dbe7df;border-radius:14px;background:#f4faf6;color:#536777;font-size:13px;line-height:1.6}.ip-law-freshness i{color:#3f8f4d;font-size:18px}.ip-law-freshness b{color:#0b2341}
  .ip-current-content{max-width:1080px;margin:auto}.ip-current-kicker{display:inline-block;color:#c28a32;font-family:Poppins,sans-serif;font-size:11px;font-weight:900;letter-spacing:.14em;margin-bottom:10px}.ip-current-content h1{color:#0b2341;font-family:Poppins,sans-serif;font-weight:800;letter-spacing:-.035em}.ip-current-lead{font-size:16px;line-height:1.8;color:#5e6f80;max-width:900px;margin:15px auto 30px;text-align:center}.ip-current-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:28px 0}.ip-current-grid article{padding:22px;border:1px solid #dfe8e3;border-radius:16px;background:#fff}.ip-current-grid b{display:block;color:#0b2341;font-family:Poppins,sans-serif;margin-bottom:8px}.ip-current-grid p{margin:0;color:#637283;line-height:1.7;font-size:14px}.ip-current-content h3{margin:36px 0 18px;color:#0b2341;font-family:Poppins,sans-serif;font-weight:800;text-align:center}.ip-date-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 26px}.ip-date-grid div{padding:18px;border-radius:14px;background:#0b2341;color:#fff}.ip-date-grid strong{display:block;color:#8fd39a;font-family:Poppins,sans-serif;font-size:18px;margin-bottom:5px}.ip-date-grid span{font-size:12px;line-height:1.5;color:#d7e0e9}.ip-current-note{display:flex;gap:12px;align-items:flex-start;padding:18px;border-left:4px solid #3f8f4d;background:#f3f8f5;border-radius:8px;color:#566979}.ip-current-note i{color:#3f8f4d;font-size:19px}.ip-current-note p{margin:0;line-height:1.7}.ip-current-note-top{margin-bottom:24px}
  .ip-price-quote{position:relative}.container.my-5.mt-5.py-5 .ip-price-quote{display:inline-block;padding:8px 12px;margin-top:4px;border-radius:10px;background:rgba(47,143,78,.08);color:#174f2c!important;font-weight:700}.card-header .ip-price-quote,.card-header.ip-price-quote{background:transparent;padding:0;margin:0;color:inherit!important}
  @media(max-width:767px){.ip-current-grid,.ip-date-grid{grid-template-columns:1fr}.ip-law-freshness{margin-top:0}}
  `;document.head.appendChild(s);
}

function run(){injectStyles();removeLegacyYearContent();refreshITR();refreshGST();refreshMSME();refreshTDS();addFreshnessNote();schedulePriceRefresh();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();