(function () {
  "use strict";

  // Lightweight GA4 bootstrap for informational pages without enquiry.js.
  if (!["instantprofessionals.in", "www.instantprofessionals.in"].includes(window.location.hostname)) return;
  const measurementId = "G-TG0272S260";
  // Informational pages also need contact and guide-to-service attribution.
  if (!window.__ipGuideContactTracking) {
    window.__ipGuideContactTracking = true;
    let pendingNavigation = false;
    window.addEventListener("pageshow", function () { pendingNavigation = false; });
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented) return;
      const link = event.target.closest && event.target.closest("a[href]");
      if (!link || typeof window.gtag !== "function") return;
      const href = link.getAttribute("href") || "";
      let name;
      if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href)) name = "whatsapp_click";
      else if (/^tel:/i.test(href)) name = "phone_click";
      else if (link.hasAttribute("data-enquiry-cta")) name = "enquiry_cta_click";
      if (!name) return;
      const parameters = {
        service_name: link.getAttribute("data-service") || document.title,
        page_location: window.location.origin + window.location.pathname
      };
      const destination = new URL(href, window.location.href);
      const target = link.getAttribute("target");
      const sameTabNavigation = name === "enquiry_cta_click" &&
        event.button === 0 && !event.ctrlKey && !event.metaKey &&
        !event.shiftKey && !event.altKey && (!target || target === "_self") &&
        !link.hasAttribute("download") &&
        destination.origin === window.location.origin &&
        destination.pathname !== window.location.pathname;

      if (!sameTabNavigation) {
        window.gtag("event", name, parameters);
        return;
      }

      // ROC guide clicks are sent once on arrival, avoiding unload-time batching loss.
      // Store only a timestamp: no visitor, form, query-string or transaction data.
      if (sameTabNavigation && link.hasAttribute("data-enquiry-arrival") &&
          window.location.pathname === "/roc-search-report-fees-format.html" &&
          destination.pathname === "/roc-search-report.html" && destination.hash === "#enquiry-title") {
        try {
          window.sessionStorage.setItem("ip.rocEnquiryArrival", String(Date.now()));
          return; // Preserve native same-tab navigation; the service page owns this event.
        } catch (_) {
          // Storage restrictions retain the callback/timeout fallback below.
        }
      }

      // Let GA process the click before unloading this page. A separate timer
      // keeps the link usable even when the Google tag is blocked or never loads.
      event.preventDefault();
      if (pendingNavigation) return;
      pendingNavigation = true;
      let navigated = false;
      let timer;
      function navigate() {
        if (navigated) return;
        navigated = true;
        window.clearTimeout(timer);
        window.location.assign(destination.href);
      }
      timer = window.setTimeout(navigate, 1000);
      parameters.event_callback = navigate;
      parameters.event_timeout = 1000;
      try {
        window.gtag("event", name, parameters);
      } catch (_) {
        navigate();
      }
    });
  }
  if (window.__ipGoogleAnalyticsId === measurementId) return;
  const existingTag = document.querySelector(
    'script[src*="googletagmanager.com/gtag/js?id=' + measurementId + '"]'
  );
  if (existingTag && typeof window.gtag === "function") {
    window.__ipGoogleAnalyticsId = measurementId;
    return;
  }

  window.__ipGoogleAnalyticsId = measurementId;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
  if (!existingTag) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
    document.head.appendChild(script);
  }
})();
