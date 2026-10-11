(function () {
  "use strict";

  // Lightweight GA4 bootstrap for informational pages without enquiry.js.
  const measurementId = "G-TG0272S260";
  // Informational pages also need contact and guide-to-service attribution.
  if (!window.__ipGuideContactTracking) {
    window.__ipGuideContactTracking = true;
    document.addEventListener("click", function (event) {
      const link = event.target.closest && event.target.closest("a[href]");
      if (!link || typeof window.gtag !== "function") return;
      const href = link.getAttribute("href") || "";
      let name;
      if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href)) name = "whatsapp_click";
      else if (/^tel:/i.test(href)) name = "phone_click";
      else if (link.hasAttribute("data-enquiry-cta")) name = "enquiry_cta_click";
      if (name) window.gtag("event", name, {
        service_name: link.getAttribute("data-service") || document.title,
        page_location: window.location.origin + window.location.pathname
      });
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
