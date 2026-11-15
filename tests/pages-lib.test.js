const test = require("node:test");
const assert = require("node:assert");
const { resolvePageLink, invalidPageNames } = require("../lib/pages");

const pages = [
  { fileSlug: "ns1000", url: "/ns1000/", inputPath: "./src/pages/ns1000.md" },
  { fileSlug: "guides", url: "/support/guides/", inputPath: "./src/pages/guides.md" },
];

test("resolves a page file name to its URL", () => {
  assert.strictEqual(resolvePageLink("ns1000", pages), "/ns1000/");
  assert.strictEqual(resolvePageLink("guides", pages), "/support/guides/");
});

test("an empty link resolves to null", () => {
  assert.strictEqual(resolvePageLink("", pages), null);
  assert.strictEqual(resolvePageLink(undefined, pages), null);
});

test("a link to a missing page throws, naming the page", () => {
  assert.throws(() => resolvePageLink("deleted-page", pages), /deleted-page/);
});

test("page file names must be valid, non-reserved addresses", () => {
  assert.deepStrictEqual(invalidPageNames(["about", "ns1000", "winter-sale", "404"]), []);
  assert.deepStrictEqual(invalidPageNames(["admin", "Files", "hello world", "שלום", "files", "a--b"]), ["admin", "Files", "hello world", "שלום", "files", "a--b"]);
});
