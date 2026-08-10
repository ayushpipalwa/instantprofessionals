(function () {
  "use strict";

  const select = (el, all = false) =>
    all ? [...document.querySelectorAll(el.trim())] : document.querySelector(el.trim());

  const on = (type, el, listener, all = false) => {
    const elements = select(el, all);
    if (!elements) return;
    if (all) elements.forEach((element) => element.addEventListener(type, listener));
    else elements.addEventListener(type, listener);
  };

  const onscroll = (el, listener) => el.addEventListener("scroll", listener);

  const loadVisionStyles = () => {
    if (document.querySelector('link[data-ip-vision="2"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "assets/css/vision-2.css?v=20260811-0050";
    link.dataset.ipVision = "2";
    document.head.appendChild(link);
  };

  loadVisionStyles();

  const navbarlinks = select("#navbar .scrollto", true);
  const navbarlinksActive = () => {
    const position = window.scrollY + 200;
    navbarlinks.forEach((navbarlink) => {
      if (!navbarlink.hash) return;
      const section = select(navbarlink.hash);
      if (!section) return;
      navbarlink.classList.toggle(
        "active",
        position >= section.offsetTop && position <= section.offsetTop + section.offsetHeight
      );
    });
  };

  window.addEventListener("load", navbarlinksActive);
  onscroll(document, navbarlinksActive);

  const scrollto = (el) => {
    const header = select("#header");
    const element = select(el);
    if (!element) return;
    window.scrollTo({
      top: element.offsetTop - (header ? header.offsetHeight : 0),
      behavior: "smooth",
    });
  };

  const header = select("#header");
  if (header) {
    const headerScrolled = () =>
      header.classList.toggle("header-scrolled", window.scrollY > 80);
    window.addEventListener("load", headerScrolled);
    onscroll(document, headerScrolled);
  }

  const backtotop = select(".back-to-top");
  if (backtotop) {
    const toggleBacktotop = () =>
      backtotop.classList.toggle("active", window.scrollY > 100);
    window.addEventListener("load", toggleBacktotop);
    onscroll(document, toggleBacktotop);
  }

  on("click", ".mobile-nav-toggle", function () {
    select("#navbar").classList.toggle("navbar-mobile");
    this.classList.toggle("bi-list");
    this.classList.toggle("bi-x");
  });

  on(
    "click",
    ".navbar .dropdown > a",
    function (e) {
      if (select("#navbar").classList.contains("navbar-mobile")) {
        e.preventDefault();
        this.nextElementSibling.classList.toggle("dropdown-active");
      }
    },
    true
  );

  on(
    "click",
    ".scrollto",
    function (e) {
      if (!this.hash || !select(this.hash)) return;
      e.preventDefault();
      const navbar = select("#navbar");
      if (navbar.classList.contains("navbar-mobile")) {
        navbar.classList.remove("navbar-mobile");
        const navbarToggle = select(".mobile-nav-toggle");
        if (navbarToggle) {
          navbarToggle.classList.toggle("bi-list");
          navbarToggle.classList.toggle("bi-x");
        }
      }
      scrollto(this.hash);
    },
    true
  );

  window.addEventListener("load", () => {
    if (window.location.hash && select(window.location.hash)) scrollto(window.location.hash);
  });

  const modernizeHeader = () => {
    const logo = document.querySelector("#header .logo-brand img");
    if (logo) {
      logo.src = "assets/img/LOGO.png?v=20260811-0050";
      logo.alt = "Instant Professionals";
      logo.removeAttribute("style");
    }
  };

  const modernizeHome = () => {
    const carousel = document.getElementById("carouselExampleCaptions");
    if (!carousel || carousel.dataset.ipModernized) return;
    carousel.dataset.ipModernized = "1";
    const hero = document.createElement("section");
    hero.className = "ip-home-hero";
    hero.innerHTML = `
      <div class="container ip-grid">
        <div data-aos="fade-up">
          <div class="ip-eyebrow">A new generation compliance partner</div>
          <h1>Compliance that keeps your <span>business moving.</span></h1>
          <p class="lead">Instant Professionals brings corporate compliance, taxation, accounting, intellectual property and business advisory under one coordinated professional platform — practical, responsive and built around business outcomes.</p>
          <div class="ip-actions">
            <a class="ip-btn ip-btn-primary" href="#services">Explore Services</a>
            <a class="ip-btn ip-btn-secondary" href="#team">Meet Our Professionals</a>
          </div>
          <div class="ip-trust">
            <span><i class="bi bi-check-circle-fill"></i>Founded in 2018</span>
            <span><i class="bi bi-check-circle-fill"></i>Pan-India support</span>
            <span><i class="bi bi-check-circle-fill"></i>Multi-disciplinary expertise</span>
          </div>
        </div>
        <aside class="ip-hero-panel" data-aos="fade-left">
          <div class="label">One coordinated platform</div>
          <h2>From incorporation to ongoing compliance and strategic advisory.</h2>
          <div class="ip-capability">
            <span>Corporate & Secretarial</span><span>GST & Direct Tax</span>
            <span>Audit & Accounting</span><span>IPR & Legal Support</span>
            <span>Registrations & Licences</span><span>Business Advisory</span>
          </div>
        </aside>
      </div>`;
    carousel.replaceWith(hero);

    const about = document.querySelector("#about .content .col-lg-12");
    if (about) {
      about.innerHTML = `
        <p>Instant Professionals is a multidisciplinary professional-services platform helping businesses manage regulatory obligations with greater clarity, speed and accountability. Since 2018, we have supported entrepreneurs, start-ups, MSMEs and established businesses across corporate compliance, taxation, accounting, registrations, intellectual property and business advisory.</p>
        <p>Our model combines specialised professionals with coordinated execution. Instead of navigating multiple service providers, clients receive practical support through a single professional relationship — from routine filings and registrations to complex advisory, risk management and business-critical compliance.</p>`;
    }

    document.querySelectorAll("#services .title a").forEach((el) => {
      const fixes = {
        "LIGITATION": "TAX LITIGATION & REPRESENTATION",
        "TAX": "DIRECT TAX & COMPLIANCE",
        "GOODS AND SERVICES TAX": "GST ADVISORY & COMPLIANCE"
      };
      const key = el.textContent.trim().toUpperCase();
      if (fixes[key]) el.textContent = fixes[key];
    });
  };

  const PHOTO_VERSION = "20260811-0050";
  const team = [
    {name:"Ayush Pipalwa",role:"Founder",experience:"10+ Years",photo:"assets/img/team/live/ayush-pipalwa.jpg",bio:"Practising professional with more than a decade of experience across corporate and secretarial compliance, governance, risk advisory and business consulting. He leads client strategy and complex regulatory engagements with a practical, business-first approach.",expertise:["Corporate Compliance","Risk Advisory","Business Consulting"]},
    {name:"CA Mayank Jain",role:"Founder",experience:"Direct Tax Professional",photo:"assets/img/team/live/mayank-jain.jpg",bio:"Direct tax professional advising individuals, founders and businesses on income-tax compliance, assessments, tax planning and practical tax-efficient structuring.",expertise:["Direct Tax","Tax Advisory","Assessments"]},
    {name:"CA Renu Sharma",role:"Indirect Tax & GST Advisor",experience:"Senior Professional",photo:"assets/img/team/live/renu-sharma.jpg",bio:"Specialises in indirect taxation, GST advisory and tax litigation, supporting businesses with compliance, departmental proceedings, notices, assessments and dispute resolution.",expertise:["GST Advisory","Indirect Tax","Tax Litigation"]},
    {name:"CA Navdha Puri",role:"Audit & Assurance Advisor",experience:"15+ Years",photo:"assets/img/team/live/navdha-puri.jpg",bio:"Experienced Chartered Accountant focused on statutory audit, internal audit and assurance, with emphasis on controls, reliable reporting and risk-based recommendations.",expertise:["Statutory Audit","Internal Audit","Risk & Controls"]},
    {name:"CA Rohit Sharma",role:"Audit & Assurance Advisor",experience:"10+ Years",photo:"assets/img/team/live/rohit-sharma.jpg",bio:"Chartered Accountant specialising in audit and assurance, financial reporting, audit readiness and internal-control reviews for growing businesses.",expertise:["Audit & Assurance","Financial Reporting","Internal Controls"]},
    {name:"CA Mayank Hoiyani",role:"Chartered Accountant",experience:"Professional Expert",photo:"assets/img/team/live/mayank-hoiyani.jpg",bio:"Advises clients on GST, income tax, statutory compliance, financial reporting and ongoing business support.",expertise:["GST","Income Tax","Financial Reporting"]},
    {name:"CMA Surbhi Sharma",role:"Cost & Management Accountant",experience:"5+ Years",photo:"assets/img/team/live/surbhi-sharma.png",bio:"Cost and management accounting professional focused on budgeting, costing, MIS reporting, financial planning and operational efficiency.",expertise:["Costing","Budgeting","MIS & Analysis"]},
    {name:"Nisha Pal",role:"Manager",experience:"Client Operations",photo:"assets/img/team/live/nisha-pal.jpg",bio:"Manages client engagements, compliance coordination, documentation and timely delivery across recurring professional assignments.",expertise:["Client Management","Operations","Compliance Coordination"]}
  ];

  const renderTeam = () => {
    const section = document.getElementById("team");
    if (!section) return;
    section.className = "team ip-team-section";
    section.innerHTML = `
      <div class="container">
        <div class="text-center" data-aos="fade-up">
          <div class="ip-team-eyebrow">Our Professionals</div>
          <h2 class="ip-team-title">Expertise that works together.</h2>
          <p class="ip-team-subtitle">A coordinated team across corporate compliance, taxation, audit, accounting and operations — aligned around timely execution and practical advice.</p>
        </div>
        <div class="ip-team-grid">
          ${team.map((member, index) => `
            <article class="ip-profile-card" data-aos="fade-up" data-aos-delay="${Math.min(index * 45, 270)}">
              <img class="ip-profile-photo" src="${member.photo}?v=${PHOTO_VERSION}" alt="${member.name}" loading="lazy" />
              <div class="ip-profile-body">
                <h3 class="ip-profile-name">${member.name}</h3>
                <div class="ip-profile-role">${member.role}</div>
                <div class="ip-experience"><i class="bi bi-award"></i>${member.experience}</div>
                <p class="ip-profile-bio">${member.bio}</p>
                <div class="ip-tags">${member.expertise.map((item) => `<span class="ip-tag">${item}</span>`).join("")}</div>
              </div>
            </article>`).join("")}
        </div>
      </div>`;
  };

  const runVision = () => { modernizeHeader(); modernizeHome(); renderTeam(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", runVision); else runVision();
  window.addEventListener("load", () => { if (typeof AOS !== "undefined") { AOS.init({duration:800,easing:"ease-in-out",once:true,mirror:false}); AOS.refresh(); } });
})();
