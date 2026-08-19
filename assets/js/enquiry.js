(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918209785294";

  function buildWhatsAppMessage(values) {
    const fields = [
      "Hello, I would like assistance from Instant Professionals.",
      "",
      "Service: " + (values.package || values.service || "General enquiry"),
      "Name: " + (values.name || ""),
      "Phone: " + (values.phone || "Not provided"),
      "Email: " + (values.email || "Not provided"),
      "Preferred contact: " + (values.preferredContact || "No preference"),
      "Message: " + (values.message || "Please contact me with the next steps.")
    ];
    return fields.join("\n");
  }

  function buildWhatsAppUrl(values) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(buildWhatsAppMessage(values));
  }

  function hasOnlineContact(values) {
    return Boolean(String(values.email || "").trim() || String(values.phone || "").trim());
  }

  function isValidSheetEndpoint(endpoint) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(endpoint || "").trim());
  }

  const enquiryApi = {
    buildWhatsAppMessage,
    buildWhatsAppUrl,
    hasOnlineContact,
    isValidSheetEndpoint
  };

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
    document.querySelectorAll('.ip-nav a[href="index.html#services"]').forEach(function (link) {
      link.setAttribute("href", "services.html");
      link.textContent = "All services";
    });

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
      preferredContact: data.get("preferredContact") || "No preference",
      message: data.get("message"),
      consent: data.get("consent") ? "Yes" : "No",
      sourcePage: window.location.href,
      website: data.get("website")
    };
  }

  function setStatus(form, message, state) {
    const status = form.querySelector(".ip-form-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "";
  }

  function clearConditionalValidity(form) {
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');
    if (email) email.setCustomValidity("");
    if (phone) phone.setCustomValidity("");
  }

  function validateOnlineContact(form, values) {
    clearConditionalValidity(form);
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');

    if (!hasOnlineContact(values)) {
      if (email) email.setCustomValidity("Provide an email address or mobile number.");
      if (email) email.focus();
      form.reportValidity();
      setStatus(form, "Provide an email address or mobile number so we can respond.", "error");
      return false;
    }

    if (values.preferredContact === "Email" && !String(values.email || "").trim()) {
      if (email) email.setCustomValidity("Enter an email address or change the preferred contact method.");
      if (email) email.focus();
      form.reportValidity();
      return false;
    }

    if ((values.preferredContact === "Phone" || values.preferredContact === "WhatsApp") && !String(values.phone || "").trim()) {
      if (phone) phone.setCustomValidity("Enter a mobile number or change the preferred contact method.");
      if (phone) phone.focus();
      form.reportValidity();
      return false;
    }

    return true;
  }

  function buildSheetPayload(values) {
    const payload = new FormData();
    payload.set("name", String(values.name || "").trim());
    payload.set("email", String(values.email || "").trim());
    payload.set("phone", String(values.phone || "").trim());
    payload.set("preferredContact", String(values.preferredContact || "No preference").trim());
    payload.set("service", String(values.package || values.service || "General enquiry").trim());
    payload.set("message", String(values.message || "").trim());
    payload.set("consent", values.consent === "Yes" ? "Yes" : "No");
    payload.set("sourcePage", String(values.sourcePage || window.location.href));
    payload.set("website", String(values.website || ""));
    return payload;
  }

  function setSubmitting(form, submitting) {
    form.setAttribute("aria-busy", String(submitting));
    form.querySelectorAll("button").forEach(function (button) {
      button.disabled = submitting;
    });
  }

  async function submitOnline(form) {
    clearConditionalValidity(form);

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, "Please complete the required fields.", "error");
      return;
    }

    const values = formValues(form);
    if (!validateOnlineContact(form, values)) return;

    const endpoint = form.getAttribute("data-sheet-endpoint") || "";
    if (!isValidSheetEndpoint(endpoint)) {
      setStatus(form, "Online submission is awaiting final Google Sheet activation. Please use WhatsApp for now.", "error");
      return;
    }

    setSubmitting(form, true);
    setStatus(form, "Submitting your enquiry securely…", "progress");

    try {
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        body: buildSheetPayload(values),
        keepalive: true
      });
      form.reset();
      clearConditionalValidity(form);
      setStatus(form, "Thank you. Your enquiry has been recorded and our team will contact you shortly.", "success");
    } catch (error) {
      setStatus(form, "We could not submit the enquiry. Please try again or continue on WhatsApp.", "error");
    } finally {
      setSubmitting(form, false);
    }
  }

  function continueOnWhatsApp(form) {
    clearConditionalValidity(form);

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, "Please complete the required fields before continuing.", "error");
      return;
    }

    const url = buildWhatsAppUrl(formValues(form));
    setStatus(form, "Opening WhatsApp with your enquiry…", "progress");
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.href = url;
  }

  function bindForms() {
    document.querySelectorAll(".ip-enquiry-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const endpoint = form.getAttribute("data-sheet-endpoint") || "";
        const hasSeparateWhatsAppAction = Boolean(form.querySelector("[data-whatsapp-submit]"));
        if (!isValidSheetEndpoint(endpoint) && !hasSeparateWhatsAppAction) {
          continueOnWhatsApp(form);
          return;
        }
        submitOnline(form);
      });

      const whatsappButton = form.querySelector("[data-whatsapp-submit]");
      if (whatsappButton) {
        whatsappButton.addEventListener("click", function () {
          continueOnWhatsApp(form);
        });
      }

      ["email", "phone"].forEach(function (name) {
        const field = form.querySelector('[name="' + name + '"]');
        if (field) {
          field.addEventListener("input", function () {
            clearConditionalValidity(form);
          });
        }
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
