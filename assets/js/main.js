(function(){
"use strict";
const $=(s,a=false)=>a?[...document.querySelectorAll(s)]:document.querySelector(s);
const on=(t,s,f,a=false)=>{const e=$(s,a);if(!e)return;a?e.forEach(x=>x.addEventListener(t,f)):e.addEventListener(t,f)};
const VERSION="20260827-lifecycle-dashboard-2";
const BRAND_LOGO=`assets/img/instant-professionals-logo-2026.png?v=${VERSION}`;

function loadVisionStyles(){
  if(!document.querySelector('link[data-ip-vision="2"]')){
    const l=document.createElement("link");
    l.rel="stylesheet";
    l.href=`assets/css/vision-2.css?v=${VERSION}`;
    l.dataset.ipVision="2";
    document.head.appendChild(l);
  }
}
function loadCurrentLaw(){
  if(document.querySelector('script[data-ip-current-law="1"]'))return;
  const s=document.createElement("script");
  s.src=`assets/js/current-law.js?v=${VERSION}`;
  s.dataset.ipCurrentLaw="1";
  s.defer=true;
  document.head.appendChild(s);
}
loadVisionStyles();
// Current-law content is now generated statically on service pages.

const navlinks=$("#navbar .scrollto",true);
function setActiveNav(){const p=window.scrollY+200;navlinks.forEach(l=>{if(!l.hash)return;const s=$(l.hash);if(!s)return;l.classList.toggle("active",p>=s.offsetTop&&p<=s.offsetTop+s.offsetHeight)})}
window.addEventListener("load",setActiveNav);document.addEventListener("scroll",setActiveNav);
function scrollto(sel){const h=$("#header"),e=$(sel);if(e)window.scrollTo({top:e.offsetTop-(h?h.offsetHeight:0),behavior:"smooth"})}
const header=$("#header");if(header){const f=()=>header.classList.toggle("header-scrolled",window.scrollY>80);window.addEventListener("load",f);document.addEventListener("scroll",f)}
const topBtn=$(".back-to-top");if(topBtn){const f=()=>topBtn.classList.toggle("active",window.scrollY>100);window.addEventListener("load",f);document.addEventListener("scroll",f)}
on("click",".mobile-nav-toggle",function(){const n=$("#navbar");if(!n)return;n.classList.toggle("navbar-mobile");this.classList.toggle("bi-list");this.classList.toggle("bi-x")});
on("click",".navbar .dropdown > a",function(e){const n=$("#navbar");if(n&&n.classList.contains("navbar-mobile")){e.preventDefault();if(this.nextElementSibling)this.nextElementSibling.classList.toggle("dropdown-active")}},true);
on("click",".scrollto",function(e){if(!this.hash||!$(this.hash))return;e.preventDefault();const n=$("#navbar");if(n&&n.classList.contains("navbar-mobile")){n.classList.remove("navbar-mobile");const b=$(".mobile-nav-toggle");if(b){b.classList.toggle("bi-list");b.classList.toggle("bi-x")}}scrollto(this.hash)},true);
window.addEventListener("load",()=>{if(location.hash&&$(location.hash))scrollto(location.hash)});

function modernizeHeader(){
  const logo=$("#header .logo-brand img");
  if(logo){
    logo.src=BRAND_LOGO;
    logo.alt="Instant Professionals registered logo";
    logo.removeAttribute("style");
    logo.removeAttribute("srcset");
    logo.style.width="68px";
    logo.style.height="68px";
    logo.style.objectFit="contain";
    logo.style.display="block";
  }
}

function modernizeHome(){
  const c=$("#carouselExampleCaptions");
  if(!c||c.dataset.ipModernized)return;
  c.dataset.ipModernized="1";
  const hero=document.createElement("section");
  hero.className="ip-home-hero ip-os-home";
  hero.setAttribute("aria-label","Instant Professionals — compliance operating system");
  hero.innerHTML=`
    <div class="ip-os-grid-bg" aria-hidden="true"></div>
    <div class="container ip-os-shell">
      <div class="ip-os-copy" data-aos="fade-up">
        <div class="ip-os-index"><img src="${BRAND_LOGO}" alt="Instant Professionals registered logo"><b>NEW-GENERATION COMPLIANCE PARTNER</b></div>
        <h1>Compliance,<br><em>engineered around</em><br>your business.</h1>
        <p class="ip-os-lead">One professional relationship connecting corporate compliance, tax, audit, registrations, intellectual property and business advisory — structured around how your business actually operates.</p>
        <div class="ip-os-actions">
          <a class="ip-os-btn ip-os-btn-primary" href="#services">Explore services <i class="bi bi-arrow-right"></i></a>
          <a class="ip-os-btn ip-os-btn-ghost" href="#team">Meet our professionals</a>
        </div>
        <div class="ip-os-credibility">
          <div><strong>2018</strong><span>Built on professional practice</span></div>
          <div><strong>360°</strong><span>Compliance and advisory coverage</span></div>
          <div><strong>1</strong><span>Coordinated professional relationship</span></div>
        </div>
      </div>
      <aside class="ip-os-system" data-aos="fade-left" aria-label="Business compliance lifecycle">
        <div class="ip-os-system-top">
          <div><span>IP / OPERATING SYSTEM</span><small>BUSINESS COMPLIANCE LIFECYCLE</small></div>
          <b>01—05</b>
        </div>
        <div class="ip-os-core">
          <div class="ip-os-center"><span class="ip-os-logo-mark"><img src="assets/img/logo.jpg?v=${VERSION}" alt="Instant Professionals registered logo" width="6250" height="6250" decoding="async"></span><span class="ip-os-center-copy"><b>ONE TEAM</b><small>Coordinated oversight</small></span></div>
          <div class="ip-os-track ip-os-track-1"><i>01</i><div><b>START</b><small>Registration & setup</small></div></div>
          <div class="ip-os-track ip-os-track-2"><i>02</i><div><b>RUN</b><small>Tax & recurring compliance</small></div></div>
          <div class="ip-os-track ip-os-track-3"><i>03</i><div><b>VERIFY</b><small>Audit, accounts & controls</small></div></div>
          <div class="ip-os-track ip-os-track-4"><i>04</i><div><b>PROTECT</b><small>IPR & documentation</small></div></div>
          <div class="ip-os-track ip-os-track-5"><i>05</i><div><b>GROW</b><small>Advisory & business support</small></div></div>
        </div>
        <div class="ip-os-system-foot"><span>Clarity</span><span>Control</span><span>Continuity</span></div>
      </aside>
    </div>
    <div class="container ip-os-bottom">
      <span>INSTANT PROFESSIONALS</span>
      <p>Professional judgement <i></i> Practical execution <i></i> Long-term support</p>
    </div>`;
  c.replaceWith(hero);
}

function modernizeServices(){
  const section=$("#services");
  if(!section||section.dataset.ipServiceHub)return;
  section.dataset.ipServiceHub="1";
  section.className="services ip-service-hub";
  const services=[
    {no:"01",icon:"bi-building",title:"Business & Tax Registrations",desc:"Set up the registrations your business needs to start, trade and remain compliant.",primary:"gst-registration.html",links:[["GST Registration","gst-registration.html"],["MSME Registration","udyam-registration.html"],["IEC Registration","iec-registration.html"]]},
    {no:"02",icon:"bi-receipt",title:"GST & Indirect Tax",desc:"Recurring GST compliance, returns and special filings supported by practical indirect-tax guidance.",primary:"gst-returns.html",links:[["GST Returns","gst-returns.html"],["GST LUT","gst-lut.html"],["GST Cancellation","gst-cancellation.html"]]},
    {no:"03",icon:"bi-calculator",title:"Income Tax & TDS",desc:"Return filing and tax compliance for individuals, professionals and businesses throughout the year.",primary:"income-tax-return-filing.html",links:[["Income Tax Returns","income-tax-return-filing.html"],["TDS Returns","tds-returns.html"],["TDS Revision","tds-return-revision.html"]]},
    {no:"04",icon:"bi-diagram-3",title:"Corporate & Secretarial",desc:"Structured statutory support for companies and LLPs—from recurring filings to governance changes.",primary:"company-annual-filing.html",links:[["Company Annual Filing","company-annual-filing.html"],["LLP Annual Filing","llp-annual-filing.html"],["Add a Director","add-a-director.html"]]},
    {no:"05",icon:"bi-shield-check",title:"Trademark & Intellectual Property",desc:"Protect the identity and intellectual assets behind your business with coordinated IPR support.",primary:"trademark-registration.html",links:[["Trademark Registration","trademark-registration.html"],["Copyright Application","copyright-application.html"],["Trademark Objections","trademark-objection-reply.html"]]},
    {no:"06",icon:"bi-people",title:"Workforce Compliance",desc:"Registration and recurring labour-law filings to keep employee compliance organised and current.",primary:"epf-registration.html",links:[["EPF Registration","epf-registration.html"],["PF Returns","pf-returns.html"],["ESI Returns","esi-returns.html"]]}
  ];
  section.innerHTML=`<div class="container">
    <div class="ip-service-head" data-aos="fade-up">
      <div><span class="ip-service-kicker">SERVICES / 360° COVERAGE</span><h2>One relationship.<br><em>Multiple professional capabilities.</em></h2></div>
      <p>Choose a service area to go directly to the relevant page. Each category connects to the existing specialised pages across the Instant Professionals multipage website.</p>
    </div>
    <div class="ip-service-grid">
      ${services.map((s,i)=>`<article class="ip-service-card" data-aos="fade-up" data-aos-delay="${Math.min(i*65,260)}">
        <div class="ip-service-top"><span>${s.no}</span><i class="bi ${s.icon}"></i></div>
        <h3>${s.title}</h3><p>${s.desc}</p>
        <div class="ip-service-links">${s.links.map(l=>`<a href="${l[1]}">${l[0]} <i class="bi bi-arrow-up-right"></i></a>`).join("")}</div>
        <a class="ip-service-primary" href="${s.primary}"><span>Explore service</span><i class="bi bi-arrow-right"></i></a>
      </article>`).join("")}
    </div>
    <div class="ip-service-foot" data-aos="fade-up"><span>Need something else?</span><p>Use the Registration, Returns, Compliances and Trademark & other IPR menus above to access the complete service directory.</p><a href="#contact">Talk to our team <i class="bi bi-arrow-right"></i></a></div>
  </div>`;
}

const SERVICE_RATE_MULTIPLIER=1;
function updateServiceRates(){
  document.querySelectorAll(".card-header h1, .card-header h2, .card-header h3, .card-header h4").forEach(el=>{
    if(el.dataset.ipRateAdjusted==="1")return;
    const text=el.textContent.trim();
    const match=text.match(/(₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)(\s*\/-)?/i);
    if(!match)return;
    const oldRate=Number(match[2].replace(/,/g,""));
    if(!Number.isFinite(oldRate)||oldRate<=0)return;
    const revisedRate=Math.round(oldRate*SERVICE_RATE_MULTIPLIER);
    const formatted=new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(revisedRate);
    const suffix=match[3]||"";
    el.textContent=text.replace(match[0],`₹ ${formatted}${suffix}`);
    el.dataset.ipRateAdjusted="1";
    el.setAttribute("data-original-rate",String(oldRate));
    el.setAttribute("data-rate-multiplier",String(SERVICE_RATE_MULTIPLIER));
  });
}

const team=[
{name:"Ayush Pipalwa",role:"Founder",experience:"10+ Years",photo:"assets/img/team/live/ayush-pipalwa.jpg",bio:"Practising professional with more than a decade of experience across corporate and secretarial compliance, governance, risk advisory and business consulting.",expertise:["Corporate Compliance","Risk Advisory","Business Consulting"]},
{name:"Mayank Jain",role:"Founder",experience:"Direct Tax Professional",photo:"assets/img/team/live/mayank-jain.jpg",bio:"Direct tax professional advising individuals, founders and businesses on income-tax compliance, assessments, tax planning and practical tax-efficient structuring.",expertise:["Direct Tax","Tax Advisory","Assessments"]},
{name:"Renu Sharma",role:"Indirect Tax & GST Advisor",experience:"Senior Professional",photo:"assets/img/team/live/renu-sharma.jpg",bio:"Specialises in indirect taxation, GST advisory and tax litigation, supporting businesses with compliance, departmental proceedings, notices, assessments and dispute resolution.",expertise:["GST Advisory","Indirect Tax","Tax Litigation"]},
{name:"Navdha Puri",role:"Audit & Assurance Advisor",experience:"15+ Years",photo:"assets/img/team/live/navdha-puri.jpg",bio:"Experienced Chartered Accountant focused on statutory audit, internal audit and assurance, with emphasis on controls, reliable reporting and risk-based recommendations.",expertise:["Statutory Audit","Internal Audit","Risk & Controls"]},
{name:"Rohit Sharma",role:"Audit & Assurance Advisor",experience:"10+ Years",photo:"assets/img/team/live/ROHIT-SHARMA.jpg",bio:"Chartered Accountant specialising in audit and assurance, financial reporting, audit readiness and internal-control reviews for growing businesses.",expertise:["Audit & Assurance","Financial Reporting","Internal Controls"]},
{name:"Mayank Hoiyani",role:"Chartered Accountant",experience:"7+ Years",photo:"assets/img/team/live/mayank-hoiyani.jpg",bio:"With 7+ years of professional experience, he advises businesses on GST, income tax, audit and assurance, statutory compliance and financial reporting. He also develops practical SOPs and internal-control frameworks to strengthen accuracy, accountability and operational efficiency.",expertise:["GST & Income Tax","Audit & Assurance","SOP Development","Financial Reporting"]},
{name:"Surbhi Sharma",role:"Cost & Management Accountant",experience:"5+ Years",photo:"assets/img/team/live/surbhi-sharma.png",bio:"Cost and management accounting professional focused on budgeting, costing, MIS reporting, financial planning and operational efficiency.",expertise:["Costing","Budgeting","MIS & Analysis"]},
{name:"Nisha Pal",role:"Manager",experience:"Client Operations",photo:"assets/img/team/live/nisha-pal.jpg",bio:"Manages client engagements, compliance coordination, documentation and timely delivery across recurring professional assignments.",expertise:["Client Management","Operations","Compliance Coordination"]},
{name:"Yash Sharma",role:"Accounts Executive",experience:"Accounts & Compliance",photo:"assets/img/team/live/YASH-SHARMA.jpg",bio:"Supports bookkeeping, GST reconciliations, financial records and routine statutory compliance assignments.",expertise:["Bookkeeping","GST Reconciliation","Documentation"]},
{name:"Vishal",role:"Accounts Executive",experience:"Accounts & Compliance",photo:"assets/img/team/live/VISHAL.jpg",bio:"Supports accounting operations, financial documentation, GST assistance and recurring compliance processes.",expertise:["Accounting Support","GST","Compliance"]},
{name:"Aaradhya",role:"Accounts Executive",experience:"Accounts & Compliance",photo:"assets/img/team/live/aaradhya.jpg",bio:"Supports financial record-keeping, accounting documentation and day-to-day compliance execution.",expertise:["Record Keeping","Accounts Support","Compliance"]},
{name:"Prashant",role:"Executive Assistant",experience:"Professional Support",photo:"assets/img/team/live/PRASHANT.jpg",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]},
{name:"Sachin",role:"Executive Assistant",experience:"Professional Support",photo:"assets/img/team/live/sachin.jpg",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]},
{name:"Ashutosh",role:"Executive Assistant",experience:"Professional Support",photo:"assets/img/team/live/ashutosh.jpg",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]},
{name:"Sparsh",role:"Executive Assistant",experience:"Statutory & Digital Coordination",photo:"assets/img/team/live/sparsh.jpg",bio:"Supports executive coordination, tracks statutory and regulatory updates, and manages the organisation’s social-media calendar, publishing and routine engagement.",expertise:["Executive Assistance","Statutory Updates","Social Media Management"]}
];

function renderTeam(){const s=$("#team");if(!s)return;s.className="team ip-team-section";s.innerHTML=`<div class="container"><div class="text-center" data-aos="fade-up"><div class="ip-team-eyebrow">Our Professionals</div><h2 class="ip-team-title">Expertise that works together.</h2><p class="ip-team-subtitle">A coordinated team across corporate compliance, taxation, audit, accounting and operations — aligned around timely execution and practical advice.</p></div><div class="ip-team-grid">${team.map((m,i)=>`<article class="ip-profile-card" data-aos="fade-up" data-aos-delay="${Math.min(i*45,270)}">${m.photo?`<img class="ip-profile-photo" src="${m.photo}?v=${VERSION}" alt="${m.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">`:""}<div class="ip-profile-placeholder" style="${m.photo?"display:none":"display:grid"}">${m.initials||m.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div class="ip-profile-body"><h3 class="ip-profile-name">${m.name}</h3><div class="ip-profile-role">${m.role}</div><span class="ip-experience">${m.experience}</span><p class="ip-profile-bio">${m.bio}</p><div class="ip-tags">${m.expertise.map(x=>`<span class="ip-tag">${x}</span>`).join("")}</div></div></article>`).join("")}</div></div>`}

function modernizeSocialPresence(){
  const main=$("#main");
  if(!main||document.getElementById("social-presence"))return;
  const section=document.createElement("section");
  section.id="social-presence";
  section.className="ip-social-presence";
  section.innerHTML=`<div class="container"><div class="ip-social-shell" data-aos="fade-up"><div class="ip-social-copy"><span class="ip-social-kicker">SOCIAL / COMMUNITY</span><h2>Stay connected with<br><em>Instant Professionals.</em></h2><p>Follow our updates on compliance, taxation, registrations, business advisory and important professional developments — without the clutter of an outdated embedded social feed.</p><div class="ip-social-actions"><a href="https://www.facebook.com/instantprofessionals" target="_blank" rel="noopener" class="ip-social-btn ip-social-btn-primary"><i class="bi bi-facebook"></i> Follow on Facebook</a><a href="#contact" class="ip-social-btn ip-social-btn-secondary"><i class="bi bi-chat-dots"></i> Talk to our team</a></div></div><div class="ip-social-card"><div class="ip-social-brand"><img src="${BRAND_LOGO}" alt="Instant Professionals"><div><strong>Instant Professionals</strong><span>Professional updates • Compliance • Tax • Advisory</span></div></div><div class="ip-social-feature"><span class="ip-social-pill">LATEST FROM OUR NETWORK</span><h3>Professional insights, timely updates and practical guidance.</h3><p>We are simplifying the website experience by replacing the dated embedded Facebook window with a clean, responsive social presence panel.</p></div><div class="ip-social-links"><a href="https://www.facebook.com/instantprofessionals" target="_blank" rel="noopener"><i class="bi bi-facebook"></i><span>Facebook</span><b>Follow</b></a><a href="https://wa.me/918209785294" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i><span>WhatsApp</span><b>Connect</b></a><a href="#services"><i class="bi bi-grid"></i><span>Services</span><b>Explore</b></a></div></div></div></div>`;
  const contact=$("#contact");
  if(contact)main.insertBefore(section,contact);else main.appendChild(section);
}

function modernizeContact(){const s=$("#contact");if(!s)return;s.classList.add("ip-contact-modern");const t=s.querySelector(".section-title");if(t){const p=t.querySelector("p");if(p)p.textContent="Talk to a professional"}}

function runSafely(label,fn){try{fn()}catch(error){console.error("[Instant Professionals] "+label+" failed",error)}}
function boot(){
  [["header",modernizeHeader],["homepage",modernizeHome],["services",modernizeServices],["rates",updateServiceRates],["team",renderTeam],["social",modernizeSocialPresence],["contact",modernizeContact]]
    .forEach(([label,fn])=>runSafely(label,fn));
  if(window.AOS)AOS.init({duration:650,easing:"ease-out-cubic",once:true,mirror:false});
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>runSafely("team",renderTeam),{once:true});
  window.addEventListener("load",boot,{once:true});
}else{
  boot();
}
})();
