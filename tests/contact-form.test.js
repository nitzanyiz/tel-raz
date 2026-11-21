const test = require("node:test");
const assert = require("node:assert");
const { encode, send } = require("../src/assets/js/contact-form");

const entries = [["form-name", "contact"], ["name", "דני כהן"]];

test("encode makes a URL-encoded body", () => {
  assert.strictEqual(encode(entries), "form-name=contact&name=%D7%93%D7%A0%D7%99+%D7%9B%D7%94%D7%9F");
});

test("send POSTs the encoded form to / and reports success", async () => {
  const calls = [];
  const ok = await send(entries, async (...args) => { calls.push(args); return { ok: true }; });
  assert.strictEqual(ok, true);
  assert.deepStrictEqual(calls, [["/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encode(entries),
  }]]);
});

test("send reports failure on an error status", async () => {
  assert.strictEqual(await send(entries, async () => ({ ok: false })), false);
});

test("send reports failure when the network fails", async () => {
  assert.strictEqual(await send(entries, async () => { throw new TypeError("offline"); }), false);
});
