(function(){
"use strict";
const $=(s,a=false)=>a?[...document.querySelectorAll(s)]:document.querySelector(s);
const on=(t,s,f,a=false)=>{const e=$(s,a);if(!e)return;a?e.forEach(x=>x.addEventListener(t,f)):e.addEventListener(t,f)};
const VERSION="20260811-0218";

function loadVisionStyles(){if(document.querySelector('link[data-ip-vision="2"]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href=`assets/css/vision-2.css?v=${VERSION}`;l.dataset.ipVision="2";document.head.appendChild(l)}
loadVisionStyles();

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

function modernizeHeader(){const logo=$("#header .logo-brand img");if(logo){logo.src=`assets/img/LOGO.png?v=${VERSION}`;logo.alt="Instant Professionals";logo.removeAttribute("style")}}

function modernizeHome(){
  const c=$("#carouselExampleCaptions");
  if(!c||c.dataset.ipModernized)return;
  c.dataset.ipModernized="1";
  const hero=document.createElement("section");
  hero.className="ip-home-hero ip-signature-home";
  hero.setAttribute("aria-label","Instant Professionals — new generation compliance partner");
  hero.innerHTML=`
    <div class="ip-orbit ip-orbit-one" aria-hidden="true"></div>
    <div class="ip-orbit ip-orbit-two" aria-hidden="true"></div>
    <div class="container ip-home-shell">
      <div class="ip-home-copy" data-aos="fade-up">
        <div class="ip-home-code"><span>IP / 2018</span><b>COMPLIANCE • TAX • ADVISORY</b></div>
        <h1>Professional judgement.<br><span>Coordinated execution.</span></h1>
        <p class="ip-home-lead">Instant Professionals is a new-generation compliance partner for businesses that need more than filing support. We connect corporate compliance, taxation, audit, registrations, intellectual property and advisory into one accountable professional relationship.</p>
        <div class="ip-home-actions">
          <a class="ip-home-btn ip-home-btn-primary" href="#services">Explore our capabilities <i class="bi bi-arrow-up-right"></i></a>
          <a class="ip-home-btn ip-home-btn-ghost" href="#team">Meet the professionals</a>
        </div>
        <div class="ip-home-proof" aria-label="Key strengths">
          <div><strong>01</strong><span>One coordinated<br>professional team</span></div>
          <div><strong>02</strong><span>Business-first<br>regulatory advice</span></div>
          <div><strong>03</strong><span>Timely, accountable<br>execution</span></div>
        </div>
      </div>

      <aside class="ip-command-card" data-aos="fade-left" aria-label="Compliance command grid">
        <div class="ip-command-head">
          <div>
            <small>IP COMPLIANCE COMMAND</small>
            <h2>From obligation<br>to outcome.</h2>
          </div>
          <div class="ip-command-mark">IP</div>
        </div>
        <div class="ip-command-flow">
          <div class="ip-flow-row"><span class="ip-flow-no">01</span><div><b>STRUCTURE</b><small>Registration • Corporate • Secretarial</small></div><i class="bi bi-arrow-right"></i></div>
          <div class="ip-flow-row"><span class="ip-flow-no">02</span><div><b>COMPLY</b><small>GST • Income Tax • Returns • Licences</small></div><i class="bi bi-arrow-right"></i></div>
          <div class="ip-flow-row"><span class="ip-flow-no">03</span><div><b>ASSURE</b><small>Audit • Accounting • Controls • Reporting</small></div><i class="bi bi-arrow-right"></i></div>
          <div class="ip-flow-row"><span class="ip-flow-no">04</span><div><b>PROTECT</b><small>Trademark • IPR • Documentation</small></div><i class="bi bi-arrow-right"></i></div>
          <div class="ip-flow-row"><span class="ip-flow-no">05</span><div><b>GROW</b><small>Advisory • Risk • Business Support</small></div><i class="bi bi-arrow-up-right"></i></div>
        </div>
        <div class="ip-command-foot"><span>Solutions</span><span>Compliance</span><span>Growth</span></div>
      </aside>
    </div>
    <div class="container ip-home-signature" aria-label="Instant Professionals promise">
      <span>NEW-GENERATION COMPLIANCE PARTNER</span>
      <p>Clarity in advice. Discipline in execution. Continuity in support.</p>
      <div class="ip-signature-line"></div>
    </div>`;
  c.replaceWith(hero);
}

const team=[
{name:"Ayush Pipalwa",role:"Founder",experience:"10+ Years",photo:"assets/img/team/live/ayush-pipalwa.jpg",bio:"Practising professional with more than a decade of experience across corporate and secretarial compliance, governance, risk advisory and business consulting.",expertise:["Corporate Compliance","Risk Advisory","Business Consulting"]},
{name:"CA Mayank Jain",role:"Founder",experience:"Direct Tax Professional",photo:"assets/img/team/live/mayank-jain.jpg",bio:"Direct tax professional advising individuals, founders and businesses on income-tax compliance, assessments, tax planning and practical tax-efficient structuring.",expertise:["Direct Tax","Tax Advisory","Assessments"]},
{name:"CA Renu Sharma",role:"Indirect Tax & GST Advisor",experience:"Senior Professional",photo:"assets/img/team/live/renu-sharma.jpg",bio:"Specialises in indirect taxation, GST advisory and tax litigation, supporting businesses with compliance, departmental proceedings, notices, assessments and dispute resolution.",expertise:["GST Advisory","Indirect Tax","Tax Litigation"]},
{name:"CA Navdha Puri",role:"Audit & Assurance Advisor",experience:"15+ Years",photo:"assets/img/team/live/navdha-puri.jpg",bio:"Experienced Chartered Accountant focused on statutory audit, internal audit and assurance, with emphasis on controls, reliable reporting and risk-based recommendations.",expertise:["Statutory Audit","Internal Audit","Risk & Controls"]},
{name:"CA Rohit Sharma",role:"Audit & Assurance Advisor",experience:"10+ Years",photo:"assets/img/team/live/ROHIT-SHARMA.jpg",bio:"Chartered Accountant specialising in audit and assurance, financial reporting, audit readiness and internal-control reviews for growing businesses.",expertise:["Audit & Assurance","Financial Reporting","Internal Controls"]},
{name:"CA Mayank Hoiyani",role:"Chartered Accountant",experience:"Professional Expert",photo:"assets/img/team/live/mayank-hoiyani.jpg",bio:"Advises clients on GST, income tax, statutory compliance, financial reporting and ongoing business support.",expertise:["GST","Income Tax","Financial Reporting"]},
{name:"CMA Surbhi Sharma",role:"Cost & Management Accountant",experience:"5+ Years",photo:"assets/img/team/live/surbhi-sharma.png",bio:"Cost and management accounting professional focused on budgeting, costing, MIS reporting, financial planning and operational efficiency.",expertise:["Costing","Budgeting","MIS & Analysis"]},
{name:"Nisha Pal",role:"Manager",experience:"Client Operations",photo:"assets/img/team/live/nisha-pal.jpg",bio:"Manages client engagements, compliance coordination, documentation and timely delivery across recurring professional assignments.",expertise:["Client Management","Operations","Compliance Coordination"]},
{name:"Yash Sharma",role:"Accounts Executive",experience:"Accounts & Compliance",photo:"assets/img/team/live/YASH-SHARMA.jpg",bio:"Supports bookkeeping, GST reconciliations, financial records and routine statutory compliance assignments.",expertise:["Bookkeeping","GST Reconciliation","Documentation"]},
{name:"Vishal",role:"Accounts Executive",experience:"Accounts & Compliance",photo:"assets/img/team/live/VISHAL.jpg",bio:"Supports accounting operations, financial documentation, GST assistance and recurring compliance processes.",expertise:["Accounting Support","GST","Compliance"]},
{name:"Aaradhya",role:"Accounts Executive",experience:"Accounts & Compliance",initials:"A",bio:"Supports financial record-keeping, accounting documentation and day-to-day compliance execution.",expertise:["Record Keeping","Accounts Support","Compliance"]},
{name:"Prashant",role:"Team Professional",experience:"Professional Support",photo:"assets/img/team/live/PRASHANT.jpg",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]},
{name:"Sachin",role:"Team Professional",experience:"Professional Support",initials:"S",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]},
{name:"Ashutosh",role:"Team Professional",experience:"Professional Support",initials:"AS",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]},
{name:"Parth",role:"Team Professional",experience:"Professional Support",initials:"P",bio:"Supports client assignments, documentation and coordinated professional-service delivery.",expertise:["Client Support","Documentation","Compliance"]}
];

function renderTeam(){const s=$("#team");if(!s)return;s.className="team ip-team-section";s.innerHTML=`<div class="container"><div class="text-center" data-aos="fade-up"><div class="ip-team-eyebrow">Our Professionals</div><h2 class="ip-team-title">Expertise that works together.</h2><p class="ip-team-subtitle">A coordinated team across corporate compliance, taxation, audit, accounting and operations — aligned around timely execution and practical advice.</p></div><div class="ip-team-grid">${team.map((m,i)=>`<article class="ip-profile-card" data-aos="fade-up" data-aos-delay="${Math.min(i*45,270)}">${m.photo?`<img class="ip-profile-photo" src="${m.photo}?v=${VERSION}" alt="${m.name}" loading="lazy">`:`<div class="ip-profile-photo" role="img" aria-label="${m.name}" style="display:flex!important;align-items:center;justify-content:center;background:linear-gradient(145deg,#0b2341,#245f9b);color:#fff;font-family:Poppins,sans-serif;font-size:64px;font-weight:800">${m.initials}</div>`}<div class="ip-profile-body"><h3 class="ip-profile-name">${m.name}</h3><div class="ip-profile-role">${m.role}</div><div class="ip-experience"><i class="bi bi-award"></i>${m.experience}</div><p class="ip-profile-bio">${m.bio}</p><div class="ip-tags">${m.expertise.map(x=>`<span class="ip-tag">${x}</span>`).join("")}</div></div></article>`).join("")}</div></div>`}
function run(){modernizeHeader();modernizeHome();renderTeam()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
window.addEventListener("load",()=>{if(typeof AOS!=="undefined"){AOS.init({duration:800,easing:"ease-in-out",once:true,mirror:false});AOS.refresh()}});
})();
