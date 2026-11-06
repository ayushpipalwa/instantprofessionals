const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = readFileSync(join(__dirname, "../google-apps-script/Code.gs"), "utf8");
const validLead = {
  name: "Test Customer",
  email: "customer@example.com",
  phone: "9876543210",
  preferredContact: "Email",
  service: "GST registration",
  message: "Please explain the required documents.",
  consent: "yes",
  sourcePage: "https://example.com/gst-registration.html"
};

function receiver({ notificationFails = false, appendFails = false } = {}) {
  const rows = [];
  const emails = [];
  const errors = [];
  const cache = new Map();
  let now = 0;
  let uuid = 0;
  const lock = {
    held: false,
    waitLock() { this.held = true; },
    releaseLock() { this.held = false; }
  };
  const context = vm.createContext({
    console: { error: (...args) => errors.push(args) },
    LockService: { getScriptLock: () => lock },
    CacheService: {
      getScriptCache: () => ({
        get(key) {
          const entry = cache.get(key);
          return entry && entry.expires > now ? entry.value : null;
        },
        put(key, value, seconds) { cache.set(key, { value, expires: now + seconds }); }
      })
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => ({
          appendRow(row) {
            assert.equal(lock.held, true);
            if (appendFails) throw new Error("Sheet write failed.");
            rows.push(Array.from(row));
          }
        })
      })
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (algorithm, value) => createHash(algorithm).update(value).digest(),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString("base64url"),
      formatDate: () => "20261002-120000",
      getUuid: () => (++uuid).toString(16).padStart(6, "0") + "-test"
    },
    Session: { getScriptTimeZone: () => "Etc/UTC" },
    MailApp: {
      sendEmail(email) {
        assert.equal(rows.length > 0, true, "lead must be persisted before notification");
        if (notificationFails) throw new Error("Email quota exhausted.");
        emails.push(email);
      }
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: text => ({
        text,
        setMimeType(type) { this.mimeType = type; return this; }
      })
    }
  });
  vm.runInContext(source, context, { filename: "Code.gs" });
  return {
    rows, emails, errors, cache,
    advance(seconds) { now += seconds; },
    post(overrides = {}) {
      const response = context.doPost({ parameter: { ...validLead, ...overrides } });
      assert.equal(response.mimeType, "application/json");
      assert.equal(lock.held, false, "every request must release its lock");
      return JSON.parse(response.text);
    }
  };
}

test("valid enquiry preserves the existing row schema and sends its notification", () => {
  const app = receiver();
  const response = app.post();
  assert.equal(response.success, true);
  assert.match(response.enquiryId, /^IP-\d{8}-\d{6}-[0-9A-F]{6}$/);
  assert.equal(app.rows.length, 1);
  const [row] = app.rows;
  assert.equal(row.length, 15);
  assert.equal(row[0], response.enquiryId);
  assert.equal(Object.prototype.toString.call(row[1]), "[object Date]");
  assert.deepEqual(row.slice(2), [
    validLead.name, validLead.email, validLead.phone, validLead.preferredContact,
    validLead.service, validLead.message, "Yes", validLead.sourcePage,
    "New", "Medium", "", "", ""
  ]);
  assert.equal(app.emails.length, 1);
  assert.equal(app.emails[0].to, "info@instantprofessionals.in");
  assert.match(app.emails[0].body, new RegExp(response.enquiryId));
});

test("invalid consent or absent contact details never persist or notify", () => {
  for (const [overrides, error] of [
    [{ consent: "" }, "Contact consent is required."],
    [{ consent: "no" }, "Contact consent is required."],
    [{ email: "", phone: "" }, "Email address or mobile number is required."],
    [{ email: "" }, "An email address is required for email contact."],
    [{ preferredContact: "WhatsApp", phone: "" }, "A mobile number is required for the selected contact method."]
  ]) {
    const app = receiver();
    assert.deepEqual(app.post(overrides), { success: false, message: error });
    assert.equal(app.rows.length, 0);
    assert.equal(app.emails.length, 0);
    assert.equal(app.cache.size, 0);
  }
});

test("exact normalized retries return the original ID without another row or email", () => {
  const app = receiver();
  const first = app.post();
  const retry = app.post({ name: "  " + validLead.name + "  ", consent: "YES" });
  assert.deepEqual(retry, { success: true, duplicate: true, enquiryId: first.enquiryId });
  assert.equal(app.rows.length, 1);
  assert.equal(app.emails.length, 1);

  app.advance(60);
  const later = app.post();
  assert.equal(later.success, true);
  assert.notEqual(later.enquiryId, first.enquiryId);
  assert.equal(app.rows.length, 2);
});

test("changed messages and all other persisted lead fields are accepted immediately", () => {
  for (const field of ["name", "email", "phone", "preferredContact", "service", "message", "sourcePage"]) {
    const app = receiver();
    const first = app.post();
    const changed = app.post({ [field]: validLead[field] + " changed" });
    assert.equal(changed.success, true, field);
    assert.equal(changed.duplicate, undefined, field);
    assert.notEqual(changed.enquiryId, first.enquiryId, field);
    assert.equal(app.rows.length, 2, field);
    assert.equal(app.emails.length, 2, field);
  }
});

test("delimiter characters in lead fields cannot collide in the duplicate key", () => {
  const app = receiver();
  const first = app.post({ email: "A|B", phone: "C" });
  const second = app.post({ email: "A", phone: "B|C" });
  assert.notEqual(second.enquiryId, first.enquiryId);
  assert.equal(app.rows.length, 2);
});

test("notification failures keep the persisted lead and still deduplicate its retry", () => {
  const app = receiver({ notificationFails: true });
  const first = app.post();
  assert.equal(first.success, true);
  assert.equal(app.rows.length, 1);
  assert.equal(app.errors.length, 1);
  assert.match(app.errors[0][0], /Enquiry recorded; email notification failed/);
  assert.deepEqual(app.post(), { success: true, duplicate: true, enquiryId: first.enquiryId });
  assert.equal(app.rows.length, 1);
});

test("failed Sheet writes never cache a success or send a notification", () => {
  const app = receiver({ appendFails: true });
  assert.deepEqual(app.post(), { success: false, message: "Sheet write failed." });
  assert.equal(app.rows.length, 0);
  assert.equal(app.cache.size, 0);
  assert.equal(app.emails.length, 0);
});

test("formula-like input is escaped in every lead column, but not notification text", () => {
  const fields = { name: 2, email: 3, phone: 4, preferredContact: 5, service: 6, message: 7, sourcePage: 9 };
  for (const prefix of ["=", "+", "-", "@"]) {
    const app = receiver();
    const value = prefix + "SUM(1,2)";
    const response = app.post(Object.fromEntries(Object.keys(fields).map(field => [field, " \t" + value])));
    assert.equal(response.success, true);
    for (const [field, column] of Object.entries(fields)) {
      assert.equal(app.rows[0][column], "'" + value, field);
    }
    assert.equal(app.rows[0][0], response.enquiryId);
    assert.equal(Object.prototype.toString.call(app.rows[0][1]), "[object Date]");
    assert.ok(app.emails[0].body.includes("Name: " + value + "\n"));
    assert.ok(!app.emails[0].body.includes("'" + value));
  }
  const phone = receiver();
  assert.equal(phone.post({ phone: "+919876543210" }).success, true);
  assert.equal(phone.rows[0][4], "'+919876543210");
});
