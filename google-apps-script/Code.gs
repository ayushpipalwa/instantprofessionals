const SPREADSHEET_ID = "1d4ae7SK4p9utA3ALzlGsoOdJHacK5U3x";
const SHEET_NAME = "Website Enquiries";
const NOTIFICATION_EMAIL = "info@instantprofessionals.in";

const HEADERS = [
  "Enquiry ID",
  "Submitted At",
  "Full Name",
  "Email Address",
  "Mobile / WhatsApp",
  "Preferred Contact",
  "Service Area",
  "Enquiry / Message",
  "Consent Given",
  "Source Page",
  "Lead Status",
  "Priority",
  "Assigned To",
  "Follow-up Date",
  "Internal Notes"
];

function setup() {
  const sheet = getEnquirySheet();
  const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];

  if (currentHeaders.every(function (value) { return !value; })) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  MailApp.getRemainingDailyQuota();
  return "Instant Professionals enquiry receiver is ready.";
}

function doGet() {
  return jsonResponse({
    success: true,
    message: "Instant Professionals enquiry endpoint is active."
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);

    const data = e && e.parameter ? e.parameter : {};

    // Hidden field used as a simple spam trap.
    if (clean(data.website, 200)) {
      return jsonResponse({ success: true });
    }

    const name = clean(data.name, 100);
    const email = clean(data.email, 150);
    const phone = clean(data.phone, 30);
    const preferredContact = clean(data.preferredContact, 30) || "No preference";
    const service = clean(data.service, 120);
    const message = clean(data.message, 1500);
    const consent = clean(data.consent, 10);
    const sourcePage = clean(data.sourcePage, 400);

    validateSubmission({
      name: name,
      email: email,
      phone: phone,
      preferredContact: preferredContact,
      service: service,
      consent: consent
    });

    const cache = CacheService.getScriptCache();
    const duplicateKey = submissionKey(email, phone, service);
    if (cache.get(duplicateKey)) {
      return jsonResponse({ success: true, duplicate: true });
    }

    const submittedAt = new Date();
    const enquiryId =
      "IP-" +
      Utilities.formatDate(
        submittedAt,
        Session.getScriptTimeZone(),
        "yyyyMMdd-HHmmss"
      ) +
      "-" +
      Utilities.getUuid().slice(0, 6).toUpperCase();

    getEnquirySheet().appendRow([
      enquiryId,
      submittedAt,
      name,
      email,
      phone,
      preferredContact,
      service,
      message,
      "Yes",
      sourcePage,
      "New",
      "Medium",
      "",
      "",
      ""
    ]);

    cache.put(duplicateKey, "1", 60);
    sendNotification({
      enquiryId: enquiryId,
      name: name,
      email: email,
      phone: phone,
      preferredContact: preferredContact,
      service: service,
      message: message,
      sourcePage: sourcePage
    });

    return jsonResponse({
      success: true,
      enquiryId: enquiryId
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({
      success: false,
      message: error.message
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {}
  }
}

function getEnquirySheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error('Sheet tab "' + SHEET_NAME + '" was not found.');
  }

  return sheet;
}

function validateSubmission(values) {
  if (!values.name) {
    throw new Error("Full name is required.");
  }
  if (!values.service) {
    throw new Error("Service area is required.");
  }
  if (!values.email && !values.phone) {
    throw new Error("Email address or mobile number is required.");
  }
  if (values.consent.toLowerCase() !== "yes") {
    throw new Error("Contact consent is required.");
  }
  if (values.preferredContact === "Email" && !values.email) {
    throw new Error("An email address is required for email contact.");
  }
  if (
    (values.preferredContact === "Phone" ||
      values.preferredContact === "WhatsApp") &&
    !values.phone
  ) {
    throw new Error("A mobile number is required for the selected contact method.");
  }
}

function sendNotification(values) {
  try {
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: "New website enquiry — " + values.service,
      body:
        "Enquiry ID: " + values.enquiryId + "\n" +
        "Name: " + values.name + "\n" +
        "Email: " + (values.email || "Not provided") + "\n" +
        "Phone: " + (values.phone || "Not provided") + "\n" +
        "Preferred contact: " + values.preferredContact + "\n" +
        "Service: " + values.service + "\n" +
        "Message: " + (values.message || "Not provided") + "\n" +
        "Source: " + (values.sourcePage || "Website")
    });
  } catch (notificationError) {
    console.error("Enquiry recorded; email notification failed.", notificationError);
  }
}

function submissionKey(email, phone, service) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    [email, phone, service].join("|")
  );
  return Utilities.base64EncodeWebSafe(digest).slice(0, 40);
}

function clean(value, maximumLength) {
  return String(value || "").trim().slice(0, maximumLength);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
