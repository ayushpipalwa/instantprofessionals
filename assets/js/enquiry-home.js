(function () {
  "use strict";

  const WHATSAPP_NUMBER = "918209785294";

  function track(name, parameters) {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters || {});
  }

  function serviceName(values) {
    return String(values.package || values.service || "General enquiry").slice(0, 100);
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

  function setSubmitting(form, submitting) {
    form.setAttribute("aria-busy", String(submitting));
    form.querySelectorAll("button").forEach(function (button) {
      button.disabled = submitting;
    });
  }

  function clearContactValidity(form) {
    ["email", "phone"].forEach(function (name) {
      const field = form.querySelector('[name="' + name + '"]');
      if (field) field.setCustomValidity("");
    });
  }

  function validateContact(form, values) {
    clearContactValidity(form);
    const email = form.querySelector('[name="email"]');
    const phone = form.querySelector('[name="phone"]');
    const emailValue = String(values.email || "").trim();
    const phoneValue = String(values.phone || "").trim();

    if (!emailValue && !phoneValue) {
      if (email) {
        email.setCustomValidity("Provide an email address or mobile number.");
        email.focus();
      }
      form.reportValidity();
      setStatus(form, "Provide an email address or mobile number so we can respond.", "error");
      return false;
    }
    if (values.preferredContact === "Email" && !emailValue) {
      email.setCustomValidity("Enter an email address or change the preferred contact method.");
      email.focus();
      form.reportValidity();
      return false;
    }
    if ((values.preferredContact === "Phone" || values.preferredContact === "WhatsApp") && !phoneValue) {
      phone.setCustomValidity("Enter a mobile number or change the preferred contact method.");
      phone.focus();
      form.reportValidity();
      return false;
    }
    return true;
  }

  function validSheetEndpoint(endpoint) {
    return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(endpoint || "").trim());
  }

  function sheetPayload(values) {
    const payload = new FormData();
    payload.set("name", String(values.name || "").trim());
    payload.set("email", String(values.email || "").trim());
    payload.set("phone", String(values.phone || "").trim());
    payload.set("preferredContact", String(values.preferredContact || "No preference").trim());
    payload.set("service", serviceName(values));
    payload.set("message", String(values.message || "").trim());
    payload.set("consent", values.consent);
    payload.set("sourcePage", values.sourcePage);
    payload.set("website", String(values.website || ""));
    return payload;
  }

  function whatsappUrl(values) {
    const message = [
      "Hello, I would like assistance from Instant Professionals.",
      "",
      "Service: " + serviceName(values),
      "Name: " + (values.name || ""),
      "Phone: " + (values.phone || "Not provided"),
      "Email: " + (values.email || "Not provided"),
      "Preferred contact: " + (values.preferredContact || "No preference"),
      "Message: " + (values.message || "Please contact me with the next steps.")
    ].join("\n");
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
  }

  async function submitOnline(form) {
    clearContactValidity(form);
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, "Please complete the required fields.", "error");
      return;
    }
    const values = formValues(form);
    if (!validateContact(form, values)) return;
    const endpoint = form.getAttribute("data-sheet-endpoint") || "";
    if (!validSheetEndpoint(endpoint)) {
      setStatus(form, "Online submission is awaiting final activation. Please use WhatsApp for now.", "error");
      return;
    }

    setSubmitting(form, true);
    setStatus(form, "Submitting your enquiry securely…", "progress");
    try {
      await fetch(endpoint, { method: "POST", mode: "no-cors", body: sheetPayload(values), keepalive: true });
      track("generate_lead", {
        lead_method: "website_form",
        service_name: serviceName(values),
        page_location: window.location.href
      });
      form.reset();
      clearContactValidity(form);
      setStatus(form, "Thank you. Your enquiry has been recorded and our team will contact you shortly.", "success");
    } catch (error) {
      setStatus(form, "We could not submit the enquiry. Please try again or continue on WhatsApp.", "error");
    } finally {
      setSubmitting(form, false);
    }
  }

  function continueOnWhatsApp(form) {
    clearContactValidity(form);
    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, "Please complete the required fields before continuing.", "error");
      return;
    }
    const values = formValues(form);
    if (!validateContact(form, values)) return;
    const url = whatsappUrl(values);
    track("whatsapp_click", { link_url: url, service_name: serviceName(values), page_location: window.location.href });
    track("generate_lead", { lead_method: "whatsapp", service_name: serviceName(values), page_location: window.location.href });
    setStatus(form, "Opening WhatsApp with your enquiry…", "progress");
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.href = url;
  }

  function bindAnalyticsLinks() {
    document.addEventListener("click", function (event) {
      const link = event.target.closest("a[href]");
      if (!link) return;
      const href = String(link.getAttribute("href") || "");
      if (/^(?:https?:\/\/)?(?:api\.)?wa\.me\//i.test(href) || /whatsapp\.com/i.test(href)) {
        track("whatsapp_click", { link_url: link.href, page_location: window.location.href });
      } else if (/^tel:/i.test(href)) {
        track("phone_click", { page_location: window.location.href });
      } else if (/^mailto:/i.test(href)) {
        track("email_click", { page_location: window.location.href });
      }
    });
  }

  function initialise() {
    bindAnalyticsLinks();
    document.querySelectorAll(".ip-enquiry-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitOnline(form);
      });
      const whatsappButton = form.querySelector("[data-whatsapp-submit]");
      if (whatsappButton) whatsappButton.addEventListener("click", function () { continueOnWhatsApp(form); });
      ["email", "phone"].forEach(function (name) {
        const field = form.querySelector('[name="' + name + '"]');
        if (field) field.addEventListener("input", function () { clearContactValidity(form); });
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialise, { once: true });
  else initialise();
})();
