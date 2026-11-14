const test = require("node:test");
const assert = require("node:assert");
const { encodeFilePath } = require("../lib/urls");

const roundTrip = (p) => decodeURIComponent(encodeFilePath(p));

test("encodes characters that would cut the URL short", () => {
  assert.strictEqual(encodeFilePath("/files/מדריך #2?.pdf").includes("#"), false);
  assert.strictEqual(encodeFilePath("/files/מדריך #2?.pdf").includes("?"), false);
  assert.strictEqual(roundTrip("/files/מדריך #2?.pdf"), "/files/מדריך #2?.pdf");
});

test("keeps spaces, parentheses, Hebrew and percent signs resolvable", () => {
  assert.strictEqual(roundTrip("/files/מדריך לחיבור (אוזניה).pdf"), "/files/מדריך לחיבור (אוזניה).pdf");
  assert.strictEqual(roundTrip("/files/100% done.pdf"), "/files/100% done.pdf");
});

test("does not double-encode an already encoded path", () => {
  assert.strictEqual(encodeFilePath("/files/a%20b.pdf"), "/files/a%20b.pdf");
});

test("keeps the slashes", () => {
  assert.strictEqual(encodeFilePath("/files/a.pdf"), "/files/a.pdf");
});
