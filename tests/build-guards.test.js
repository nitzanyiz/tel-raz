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

test("deleting a content page that the footer links to (עלינו) still builds, without that link", () => {
  let footerLinks;
  const r = buildCopy(
    (dir) => fs.rmSync(path.join(dir, "src/pages/about.md"), { force: true }),
    (out) => {
      const $ = require("cheerio").load(fs.readFileSync(path.join(out, "index.html"), "utf8"));
      footerLinks = $(".footer-links a").map((_, a) => $(a).attr("href")).get();
    }
  );
  assert.ok(r.ok, r.output);
  assert.ok(!footerLinks.includes("/about/"));
  assert.ok(footerLinks.includes("/contact/"));
});
