const test = require("node:test");
const assert = require("node:assert");
const { buildSite, load } = require("./helpers/build");

const requiredNames = ($, form) =>
  form.find("[required]").map((_, el) => $(el).attr("name")).get();

function assertLabelled($, form) {
  form.find("input, textarea").each((_, el) => {
    const name = $(el).attr("name");
    if ($(el).attr("type") === "hidden" || name === "bot-field") return;
    const id = $(el).attr("id");
    assert.ok(id && form.find(`label[for="${id}"]`).length === 1, `field ${name} has no label`);
  });
}

test("service-call form fields and netlify wiring", () => {
  const $ = load(buildSite("preview"), "/support/service-call/");
  const form = $('form[name="service-call"]');
  assert.strictEqual(form.attr("data-netlify"), "true");
  assert.strictEqual(form.attr("action"), "/thanks/");
  assert.deepStrictEqual(requiredNames($, form), ["company", "name", "phone", "mobile", "email", "details"]);
  assert.strictEqual(form.find('input[name="email"]').attr("type"), "email");
  assert.strictEqual(form.find('input[name="bot-field"]').length, 1);
  assert.strictEqual(form.find('input[name="form-name"]').val(), "service-call");
  assertLabelled($, form);
});

test("service-call subject is tagged on preview only", () => {
  const subject = (name) => load(buildSite(name), "/support/service-call/")('form[name="service-call"] input[name="subject"]').val();
  assert.strictEqual(subject("preview"), "[בדיקה] טופס קריאת שירות חדש");
  assert.strictEqual(subject("prod"), "טופס קריאת שירות חדש");
});

test("contact form fields, page field and subject", () => {
  const $ = load(buildSite("prod"), "/contact/");
  const form = $('form[name="contact"]');
  assert.strictEqual(form.attr("data-netlify"), "true");
  assert.deepStrictEqual(requiredNames($, form), ["name", "phone", "company"]);
  assert.strictEqual(form.find('input[name="subject"]').val(), "פנייה חדשה מהאתר");
  assert.strictEqual(form.find('input[name="page"]').val(), "/contact/");
  assert.strictEqual(form.find('button[type="submit"]').text().trim(), "דברו איתנו");
  assertLabelled($, form);
});

test("contact page hides map and email when settings are empty", () => {
  const $ = load(buildSite("empty"), "/contact/");
  assert.strictEqual($("iframe").length, 0);
  assert.strictEqual($('a[href^="mailto:"]').length, 0);
});

test("contact page hides map while address is a placeholder", () => {
  assert.strictEqual(load(buildSite("preview"), "/contact/")("iframe").length, 0);
});

test("contact page shows map for a real address", () => {
  const out = buildSite("with-address", { SITE_DATA_FILE: "tests/fixtures/site-address.json" });
  const src = load(out, "/contact/")("iframe.map").attr("src");
  assert.ok(src.startsWith("https://www.google.com/maps?q="), src);
  assert.ok(src.includes(encodeURIComponent("הרצל 1, רעננה")), src);
});
