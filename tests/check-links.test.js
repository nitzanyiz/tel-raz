const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { findBrokenLinks } = require("../lib/check-links");

function site(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "links-"));
  for (const [f, html] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), html);
  }
  return dir;
}

test("reports internal links to missing pages", () => {
  const dir = site({ "index.html": '<a href="/about/">x</a><a href="/contact/">y</a>', "contact/index.html": "" });
  assert.deepStrictEqual(findBrokenLinks(dir), ["index.html → /about/"]);
});

test("resolves encoded file links, anchors, queries and assets", () => {
  const dir = site({
    "index.html":
      '<a href="/files/%D7%90%20(1).pdf">f</a><a href="/#main">a</a><a href="/?x=1">q</a>' +
      '<img src="/img/a.png"><link rel="stylesheet" href="/a.css"><a href="tel:+972">t</a>' +
      '<a href="https://example.com/">e</a><a href="mailto:a@b.c">m</a><a href="#top">h</a>',
    "files/א (1).pdf": "", "img/a.png": "", "a.css": "",
  });
  assert.deepStrictEqual(findBrokenLinks(dir), []);
});

test("reports missing assets", () => {
  const dir = site({ "x/index.html": '<img src="/missing.png">' });
  assert.deepStrictEqual(findBrokenLinks(dir), ["x/index.html → /missing.png"]);
});

test("the real site has no broken internal links", () => {
  const { buildSite } = require("./helpers/build");
  assert.deepStrictEqual(findBrokenLinks(buildSite("preview")), []);
});
