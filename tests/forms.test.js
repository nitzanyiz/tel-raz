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
  const out = buildSite("placeholder", { SITE_DATA_FILE: "tests/fixtures/site-placeholder.json" });
  assert.strictEqual(load(out, "/contact/")("iframe").length, 0);
});

test("contact page shows map for a real address", () => {
  const out = buildSite("with-address", { SITE_DATA_FILE: "tests/fixtures/site-address.json" });
  const src = load(out, "/contact/")("iframe.map").attr("src");
  assert.ok(src.startsWith("https://www.google.com/maps?q="), src);
  assert.ok(src.includes(encodeURIComponent("הרצל 1, רעננה")), src);
});

// Contact form CTA: ringing button, send status lines, staggered entrance (all three places).
for (const [url, label] of [["/", "home strip"], ["/contact/", "contact page"], ["/call-center/", "content page"]]) {
  test(`contact form CTA markup – ${label}`, () => {
    const $ = load(buildSite("preview"), url);
    const form = $('form[name="contact"]');
    const btn = form.find("button.cta-btn");
    assert.strictEqual(btn.find(".cta-ico svg").length, 1, "phone icon");
    assert.strictEqual(btn.find(".cta-spin[aria-hidden=true]").length, 1, "spinner");
    assert.strictEqual(btn.find(".cta-label").text().trim(), "דברו איתנו");
    const err = form.find("p.form-error[hidden]");
    assert.match(err.text(), /השליחה נכשלה\. נסו שוב, או התקשרו אלינו:/);
    assert.strictEqual(err.find('a[href^="tel:"]').text().trim(), "09-7601760");
    assert.strictEqual(form.find('p.form-status.visually-hidden[role="status"]').length, 1);
    const section = form.closest("[data-reveal]");
    assert.strictEqual(section.length, 1, "section has data-reveal");
    assert.ok(section.find(".reveal").length >= 2, "at least two reveal parts");
  });
}

test("base loads the contact form script and marks JS early", () => {
  const $ = load(buildSite("preview"), "/");
  assert.strictEqual($('script[src="/assets/js/contact-form.js"]').length, 1);
  assert.match($("head").html(), /<script>document\.documentElement\.classList\.add\("js"\)<\/script>/);
});

test("service-call button is not the contact CTA", () => {
  const $ = load(buildSite("preview"), "/support/service-call/");
  assert.strictEqual($('form[name="service-call"] .cta-btn').length, 0);
});
