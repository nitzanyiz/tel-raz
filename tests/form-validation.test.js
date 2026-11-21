const test = require("node:test");
const assert = require("node:assert");
const { buildSite, load } = require("./helpers/build");
const { problem, MESSAGES } = require("../src/assets/js/form-validation");

const field = (type, value, required = true) => ({ type, value, required });

test("required fields need a value", () => {
  assert.strictEqual(problem(field("text", "")), MESSAGES.required);
  assert.strictEqual(problem(field("text", "   ")), MESSAGES.required);
  assert.strictEqual(problem(field("text", "דני")), "");
  assert.strictEqual(problem(field("text", "", false)), "");
});

test("phone accepts Israeli numbers in common formats", () => {
  for (const v of ["050-1234567", "0501234567", "09-7601760", "097601760", "+972-50-123-4567", "972501234567", "(09) 760 1760"]) {
    assert.strictEqual(problem(field("tel", v)), "", v);
  }
});

test("phone rejects anything else", () => {
  for (const v of ["abc", "12", "050-12345", "5012345678", "+1 555 123 4567"]) {
    assert.strictEqual(problem(field("tel", v)), MESSAGES.phone, v);
  }
});

test("email needs a basic address shape", () => {
  assert.strictEqual(problem(field("email", "name@company.co.il")), "");
  for (const v of ["name", "name@", "name@company", "a b@c.com"]) {
    assert.strictEqual(problem(field("email", v)), MESSAGES.email, v);
  }
});

test("messages are in Hebrew", () => {
  for (const m of Object.values(MESSAGES)) assert.match(m, /[֐-׿]/);
});

test("site forms opt into our validation, and every page loads it", () => {
  const out = buildSite("preview");
  for (const [url, name] of [["/contact/", "contact"], ["/", "contact"], ["/support/service-call/", "service-call"]]) {
    const $ = load(out, url);
    assert.strictEqual($(`form[name="${name}"]`).attr("data-validate"), "", `${url} ${name}`);
    assert.strictEqual($('script[src="/assets/js/form-validation.js"]').length, 1, url);
  }
});
