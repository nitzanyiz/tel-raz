const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { buildSite, load } = require("./helpers/build");

test("home is Hebrew RTL", () => {
  const $ = load(buildSite("preview"), "/");
  assert.strictEqual($("html").attr("lang"), "he");
  assert.strictEqual($("html").attr("dir"), "rtl");
});

test("favicon and logo are copied", () => {
  const out = buildSite("preview");
  assert.ok(fs.existsSync(path.join(out, "favicon.ico")));
  assert.ok(fs.existsSync(path.join(out, "assets/img/logo.png")));
});
