(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918209785294";

  function buildWhatsAppMessage(values) {
    const fields = [
      "Hello, I would like assistance from Instant Professionals.",
      "",
      "Service: " + (values.service || "General enquiry"),
      "Package: " + (values.package || "To be discussed"),
      "Name: " + (values.name || ""),
      "Phone: " + (values.phone || ""),
      "Email: " + (values.email || "Not provided"),
      "Message: " + (values.message || "Please contact me with the next steps.")
    ];
    return fields.join("\n");
  }

  function buildWhatsAppUrl(values) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildWhatsAppMessage(values));
  }

  const enquiryApi = { buildWhatsAppMessage, buildWhatsAppUrl };
  if (typeof module !== "undefined" && module.exports) module.exports = enquiryApi;
  if (typeof window !== "undefined") window.InstantProfessionalsEnquiry = enquiryApi;
  if (typeof document === "undefined") return;

  function openNavigation(button, navigation) {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!expanded));
    navigation.classList.toggle("is-open", !expanded);
    document.body.classList.toggle("nav-open", !expanded);
  }

  function bindNavigation() {
    const button = document.querySelector(".ip-nav-toggle");
    const navigation = document.getElementById("site-nav");
    if (!button || !navigation) return;

    button.addEventListener("click", function () {
      openNavigation(button, navigation);
    });

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a") && navigation.classList.contains("is-open")) {
        button.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      }
    });
  }

  function selectPackage(button) {
    const form = document.querySelector(".ip-enquiry-form");
    if (!form) return;
    const packageField = form.querySelector('[name="package"]');
    if (packageField) {
      const value = button.getAttribute("data-package") || "Professional support";
      const existing = Array.from(packageField.options).find(function (option) {
        return option.value === value;
      });
      if (!existing) packageField.add(new Option(value, value));
      packageField.value = value;
    }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(function () {
      const nameField = form.querySelector('[name="name"]');
      if (nameField) nameField.focus({ preventScroll: true });
    }, 450);
  }

  function formValues(form) {
    const data = new FormData(form);
    return {
      service: data.get("service") || form.getAttribute("data-service") || "General enquiry",
      package: data.get("package"),
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      message: data.get("message")
    };
  }

  function bindForms() {
    document.querySelectorAll(".ip-enquiry-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const status = form.querySelector(".ip-form-status");

        if (!form.checkValidity()) {
          form.reportValidity();
          if (status) status.textContent = "Please complete the required fields.";
          return;
        }

        const url = buildWhatsAppUrl(formValues(form));
        if (status) status.textContent = "Opening WhatsApp with your enquiry…";
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) window.location.href = url;
      });
    });
  }

  function bindPackageButtons() {
    document.querySelectorAll(".ip-package-button").forEach(function (button) {
      button.addEventListener("click", function () {
        selectPackage(button);
      });
    });
  }

  function closeOtherMenus() {
    document.addEventListener("click", function (event) {
      document.querySelectorAll(".ip-nav details[open]").forEach(function (menu) {
        if (!menu.contains(event.target)) menu.removeAttribute("open");
      });
    });
  }

  function initialise() {
    bindNavigation();
    bindForms();
    bindPackageButtons();
    closeOtherMenus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise);
  } else {
    initialise();
  }
})();
