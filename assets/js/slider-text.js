// Instant Professionals brand presentation and approved team portraits.
(function () {
  "use strict";

  const PHOTO_VERSION = "20260811-0032";
  const LOGO_PATH = "assets/img/instant-professionals-logo-2026.png?v=20260811-0032";
  const APPROVED_PHOTOS = {
    "Ayush Pipalwa": "assets/img/team/live/ayush-pipalwa.jpg",
    "Renu Sharma": "assets/img/team/live/renu-sharma.jpg",
    "Navdha Puri": "assets/img/team/live/navdha-puri.jpg",
    "Rohit Sharma": "assets/img/team/live/rohit-sharma.jpg",
    "Mayank Jain": "assets/img/team/live/mayank-jain.jpg",
    "Mayank Hoiyani": "assets/img/team/live/mayank-hoiyani.jpg",
    "Surbhi Sharma": "assets/img/team/live/surbhi-sharma.png",
    "Nisha Pal": "assets/img/team/live/nisha-pal.jpg"
  };

  const cleanName = (value) => value.trim().replace(/^(CA|CMA|CS)\s+/i, "").trim();

  const installBrandStyles = () => {
    if (document.getElementById("ip-brand-system-2026")) return;
    const style = document.createElement("style");
    style.id = "ip-brand-system-2026";
    style.textContent = `
      :root{--ip-navy:#071b3f;--ip-navy-2:#0d3157;--ip-green:#55b84f;--ip-green-dark:#318c3c;--ip-ink:#172b3d;--ip-muted:#647482;--ip-soft:#f5f8f6;--ip-border:#dfe8e2}
      body{font-family:"Open Sans",sans-serif;color:var(--ip-ink);background:#fff}
      h1,h2,h3,h4,h5,h6{font-family:"Poppins",sans-serif;color:var(--ip-navy)}
      a{transition:color .2s ease,background .2s ease,border-color .2s ease,transform .2s ease}
      #header{height:82px;background:rgba(255,255,255,.97)!important;border-bottom:1px solid rgba(7,27,63,.08);box-shadow:0 8px 26px rgba(7,27,63,.08)!important;backdrop-filter:blur(12px)}
      #header.header-scrolled{background:rgba(255,255,255,.98)!important}
      #header .logo-brand{margin-top:0;display:flex;align-items:center}
      #header .logo-brand img{width:68px!important;height:68px!important;max-height:68px!important;object-fit:contain;border-radius:12px;background:#fff}
      .navbar a,.navbar a:focus{font-family:"Poppins",sans-serif;font-size:13px;font-weight:600;color:var(--ip-navy)!important;border-radius:9px}
      .navbar a:hover,.navbar .active,.navbar .active:focus,.navbar li:hover>a{background:rgba(85,184,79,.11)!important;color:var(--ip-green-dark)!important}
      .navbar .dropdown ul{border:1px solid var(--ip-border);border-radius:16px;box-shadow:0 20px 52px rgba(7,27,63,.14)}
      .navbar .dropdown ul a{color:var(--ip-ink)!important;border-radius:8px}
      .navbar .dropdown ul a:hover,.navbar .dropdown ul li:hover>a{background:rgba(85,184,79,.1)!important;color:var(--ip-green-dark)!important}
      .mobile-nav-toggle{color:var(--ip-navy)!important}
      section{padding:76px 0}
      .section-title h2{color:var(--ip-green-dark);font-weight:700}
      .section-title h2::after{background:var(--ip-green)}
      .section-title p{color:var(--ip-navy);text-transform:none;letter-spacing:-.5px}
      .services .icon-box,.features .icon-box,.pricing .box,.member,.ip-profile-card{border:1px solid var(--ip-border)!important;border-radius:18px!important;box-shadow:0 10px 30px rgba(7,27,63,.07)!important;background:#fff!important}
      .services .icon-box:hover,.features .icon-box:hover,.pricing .box:hover,.member:hover,.ip-profile-card:hover{transform:translateY(-5px);box-shadow:0 20px 44px rgba(7,27,63,.12)!important;border-color:rgba(85,184,79,.5)!important}
      .services .icon-box h4 a,.features h4,.pricing h3{color:var(--ip-navy)!important}
      .services .icon-box .icon i,.features .icon-box i{color:var(--ip-green-dark)!important}
      .btn-get-started,.btn-learn-more,.pricing .btn-buy,.contact button[type=submit]{background:var(--ip-green)!important;border-color:var(--ip-green)!important;color:#071b3f!important;font-family:"Poppins",sans-serif;font-weight:700!important;border-radius:9px!important}
      .btn-get-started:hover,.btn-learn-more:hover,.pricing .btn-buy:hover,.contact button[type=submit]:hover{background:var(--ip-green-dark)!important;border-color:var(--ip-green-dark)!important;color:#fff!important;transform:translateY(-2px)}
      .back-to-top{background:var(--ip-green)!important}
      #footer{background:var(--ip-navy)!important}
      @media(max-width:991px){#header{height:74px}#header .logo-brand img{width:60px!important;height:60px!important}.navbar-mobile a{color:var(--ip-navy)!important}.navbar-mobile a:hover,.navbar-mobile .active,.navbar-mobile li:hover>a{color:var(--ip-green-dark)!important}}
    `;
    document.head.appendChild(style);
  };

  const installLogo = () => {
    document.querySelectorAll('img[src*="LOGO.png"], img[alt*="Instant Professionals"]').forEach((img) => {
      img.src = LOGO_PATH;
      img.removeAttribute("srcset");
    });
    document.querySelectorAll('link[rel="icon"]').forEach((link) => { link.href = LOGO_PATH; });
  };

  const installHomeHero = () => {
    const hero = document.getElementById("carouselExampleCaptions");
    if (!hero || hero.dataset.ipModernHome === "true") return;
    hero.dataset.ipModernHome = "true";
    hero.removeAttribute("data-bs-ride");
    hero.removeAttribute("style");
    hero.className = "ip-nextgen-hero";
    hero.innerHTML = `
      <div class="container ip-nextgen-shell">
        <div class="ip-nextgen-copy">
          <span class="ip-nextgen-kicker">Compliance • Tax • Audit • Advisory</span>
          <h1>Your New-Generation<br><span>Compliance Partner.</span></h1>
          <p>Instant Professionals brings corporate compliance, taxation, audit, registrations and business advisory together through one coordinated professional team—so you can operate with clarity and grow with confidence.</p>
          <div class="ip-nextgen-actions">
            <a class="ip-action-primary" href="#services">Explore Services</a>
            <a class="ip-action-secondary" href="#contact">Talk to Our Team</a>
          </div>
          <div class="ip-nextgen-proof">
            <span><i class="bi bi-shield-check"></i> Professional oversight</span>
            <span><i class="bi bi-diagram-3"></i> Integrated expertise</span>
            <span><i class="bi bi-clock-history"></i> Timely execution</span>
          </div>
        </div>
        <div class="ip-nextgen-panel">
          <div class="ip-panel-mark"><img src="${LOGO_PATH}" alt="Instant Professionals registered logo"></div>
          <h2>Modern compliance. Practical advice.</h2>
          <p>Built for startups, growing businesses, established enterprises and individuals who value dependable execution and clear professional guidance.</p>
          <div class="ip-panel-services">
            <span>Corporate & Secretarial</span><span>GST & Indirect Tax</span><span>Direct Tax</span><span>Audit & Assurance</span><span>Business Setup</span><span>IP & Legal Support</span>
          </div>
        </div>
      </div>`;

    if (!document.getElementById("ip-nextgen-hero-styles")) {
      const style = document.createElement("style");
      style.id = "ip-nextgen-hero-styles";
      style.textContent = `
        .ip-nextgen-hero{position:relative;overflow:hidden;min-height:720px;padding:150px 0 84px;display:flex;align-items:center;background:radial-gradient(circle at 82% 15%,rgba(85,184,79,.26),transparent 28%),linear-gradient(135deg,#061733 0%,#0a294d 57%,#0c3a59 100%);color:#fff}
        .ip-nextgen-hero:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(to bottom,black,transparent 92%)}
        .ip-nextgen-shell{position:relative;z-index:2;display:grid;grid-template-columns:minmax(0,1.13fr) minmax(360px,.87fr);gap:68px;align-items:center}
        .ip-nextgen-kicker{display:inline-flex;padding:8px 13px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(255,255,255,.07);color:#8de284;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;margin-bottom:23px}
        .ip-nextgen-copy h1{font-size:60px;line-height:1.07;font-weight:800;letter-spacing:-2px;color:#fff;margin:0 0 23px}.ip-nextgen-copy h1 span{color:#71cf68}
        .ip-nextgen-copy>p{max-width:760px;color:rgba(255,255,255,.82);font-size:18px;line-height:1.75;margin:0 0 30px}
        .ip-nextgen-actions{display:flex;gap:13px;flex-wrap:wrap;margin-bottom:30px}.ip-nextgen-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:51px;padding:0 23px;border-radius:9px;font-weight:800;text-decoration:none}
        .ip-action-primary{background:#67c85e;color:#071b3f!important;box-shadow:0 12px 30px rgba(0,0,0,.2)}.ip-action-primary:hover{background:#82dc79;transform:translateY(-2px)}
        .ip-action-secondary{border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.05);color:#fff!important}.ip-action-secondary:hover{background:#fff;color:#071b3f!important}
        .ip-nextgen-proof{display:flex;flex-wrap:wrap;gap:20px;color:rgba(255,255,255,.76);font-size:13px;font-weight:700}.ip-nextgen-proof span{display:inline-flex;align-items:center;gap:7px}.ip-nextgen-proof i{color:#79d570;font-size:16px}
        .ip-nextgen-panel{background:rgba(255,255,255,.97);color:#172b3d;border-radius:25px;padding:30px;box-shadow:0 30px 72px rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.7)}
        .ip-panel-mark{width:104px;height:104px;margin-bottom:20px}.ip-panel-mark img{width:100%;height:100%;object-fit:contain;border-radius:12px}
        .ip-nextgen-panel h2{font-size:26px;font-weight:800;color:#071b3f;margin-bottom:12px}.ip-nextgen-panel>p{color:#647482;line-height:1.7;margin-bottom:20px}
        .ip-panel-services{display:flex;flex-wrap:wrap;gap:8px}.ip-panel-services span{padding:8px 10px;border-radius:8px;border:1px solid #dfe8e2;background:#f5f8f6;color:#21425d;font-size:11px;font-weight:800}
        @media(max-width:991px){.ip-nextgen-hero{padding:132px 0 70px;min-height:auto}.ip-nextgen-shell{grid-template-columns:1fr;gap:40px}.ip-nextgen-copy h1{font-size:49px}.ip-nextgen-panel{max-width:720px}}
        @media(max-width:575px){.ip-nextgen-hero{padding:112px 0 55px}.ip-nextgen-copy h1{font-size:38px;letter-spacing:-1px}.ip-nextgen-copy>p{font-size:16px}.ip-nextgen-proof{flex-direction:column;gap:9px}.ip-nextgen-panel{padding:21px}.ip-nextgen-actions a{width:100%}}
      `;
      document.head.appendChild(style);
    }
  };

  const installPhotoStyles = () => {
    if (document.getElementById("ip-approved-team-photo-styles")) return;
    const style = document.createElement("style");
    style.id = "ip-approved-team-photo-styles";
    style.textContent = `
      #team .ip-folder-team-photo{width:100%;height:350px;overflow:hidden;background:#edf3ef;border-radius:18px 18px 0 0}
      #team .ip-folder-team-photo img,#team .member-img>img.ip-approved-photo{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center top!important;image-rendering:auto!important}
      #team .member-img{height:350px;overflow:hidden}
      @media(max-width:575px){#team .ip-folder-team-photo,#team .member-img{height:380px}}
    `;
    document.head.appendChild(style);
  };

  const updateCard = (card, headingSelector, holderSelector) => {
    const heading = card.querySelector(headingSelector);
    if (!heading) return;
    const name = cleanName(heading.textContent);
    heading.textContent = name;
    const path = APPROVED_PHOTOS[name];
    if (!path) return;
    let holder = card.querySelector(holderSelector);
    if (!holder && card.classList.contains("ip-profile-card")) {
      holder = document.createElement("div");
      holder.className = "ip-folder-team-photo";
      card.insertBefore(holder, card.querySelector(".ip-profile-body") || card.firstChild);
    }
    if (!holder) return;
    let image = holder.querySelector("img");
    if (!image) { image = document.createElement("img"); holder.appendChild(image); }
    image.src = `${path}?v=${PHOTO_VERSION}`;
    image.alt = name;
    image.width = 400;
    image.height = 500;
    image.loading = "eager";
    image.decoding = "async";
    image.classList.add("ip-approved-photo");
  };

  const applyFounderProfiles = (section) => {
    const cards = [...section.querySelectorAll(".ip-profile-card")];
    if (!cards.length) return;

    const findCard = (name) => cards.find(card => {
      const heading = card.querySelector(".ip-profile-name");
      return heading && cleanName(heading.textContent) === name;
    });

    const ayushCard = findCard("Ayush Pipalwa");
    const mayankCard = findCard("Mayank Jain");

    if (ayushCard) {
      const role = ayushCard.querySelector(".ip-profile-role");
      if (role) role.textContent = "Founder";
      const bio = ayushCard.querySelector(".ip-profile-bio");
      if (bio) bio.textContent = "Founder of Instant Professionals and a practising professional with over a decade of experience in corporate and secretarial compliance, risk advisory and business consulting. He works closely with businesses on governance, regulatory strategy and practical growth-oriented solutions.";
    }

    if (mayankCard) {
      const role = mayankCard.querySelector(".ip-profile-role");
      if (role) role.textContent = "Founder";
      const bio = mayankCard.querySelector(".ip-profile-bio");
      if (bio) bio.textContent = "Founder of Instant Professionals and a direct tax professional advising individuals and businesses on income-tax compliance, tax planning, assessments and practical tax-efficient structuring.";

      const grid = mayankCard.parentElement;
      const firstCard = grid && grid.querySelector(".ip-profile-card");
      if (grid && firstCard && firstCard !== mayankCard) {
        grid.insertBefore(mayankCard, firstCard.nextSibling);
      }
    }
  };

  const syncTeam = () => {
    const section = document.getElementById("team");
    if (!section) return;
    const oldHideStyle = document.getElementById("ip-hide-team-photos");
    if (oldHideStyle) oldHideStyle.remove();
    installPhotoStyles();
    section.querySelectorAll(".ip-profile-card").forEach(card => updateCard(card, ".ip-profile-name", ".ip-folder-team-photo"));
    section.querySelectorAll(".member").forEach(card => updateCard(card, ".member-info h4, h4", ".member-img"));
    applyFounderProfiles(section);
  };

  const start = () => {
    installBrandStyles();
    installLogo();
    installHomeHero();
    installLogo();
    const floating = document.getElementById("slider-text");
    if (floating) floating.textContent = "Your new-generation compliance partner — professional expertise, practical execution.";
    syncTeam();
    const team = document.getElementById("team");
    if (team && team.dataset.ipObserver !== "active") {
      team.dataset.ipObserver = "active";
      new MutationObserver(() => requestAnimationFrame(syncTeam)).observe(team,{childList:true,subtree:true});
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.addEventListener("load", () => { start(); setTimeout(start,300); });
})();
