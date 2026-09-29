(function () {
  "use strict";

  // Lightweight GA4 bootstrap for informational pages without enquiry.js.
  const measurementId = "G-TG0272S260";
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
