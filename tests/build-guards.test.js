const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { buildCopy } = require("./helpers/build-copy");

const page = (title) => `---\ntitle: ${title}\nsystem: false\nsitemap: true\n---\nטקסט\n`;

test("the unmodified site builds", () => {
  assert.ok(buildCopy(() => {}).ok);
});

test("a page with a reserved address fails the build", () => {
  const r = buildCopy((dir) => fs.writeFileSync(path.join(dir, "src/pages/admin.md"), page("ניהול")));
  assert.strictEqual(r.ok, false);
  assert.match(r.output, /admin/);
});

test("a page whose address clashes with a system page fails the build", () => {
  const r = buildCopy((dir) => fs.writeFileSync(path.join(dir, "src/pages/thanks-copy.md"), page("x").replace("---\ntitle", "---\npermalink: /thanks/\ntitle")));
  assert.strictEqual(r.ok, false);
});
