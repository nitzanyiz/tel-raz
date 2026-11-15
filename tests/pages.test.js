const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { buildSite, load, fileFor } = require("./helpers/build");

// Home + system pages (the editor can't delete these); content pages are
// checked dynamically from src/pages so editor changes don't break tests.
const ROUTES = ["/", "/about/", "/support/guides/", "/support/service-call/", "/contact/", "/accessibility/", "/privacy/", "/thanks/", "/404.html"].filter(
  (r) => r !== "/about/" || fs.existsSync(path.join(__dirname, "../src/pages/about.md"))
);
const CONTENT_URLS = fs.readdirSync(path.join(__dirname, "../src/pages"))
  .filter((f) => f.endsWith(".md"))
  .filter((f) => /^system: false$/m.test(fs.readFileSync(path.join(__dirname, "../src/pages", f), "utf8")))
  .map((f) => `/${f.slice(0, -3)}/`);
const read = (out, f) => fs.readFileSync(path.join(out, f), "utf8");

test("every route exists", () => {
  const out = buildSite("preview");
  for (const r of [...ROUTES, ...CONTENT_URLS]) assert.ok(fs.existsSync(fileFor(out, r)), `missing ${r}`);
});

test("one h1 per page", () => {
  const out = buildSite("preview");
  for (const r of [...ROUTES, ...CONTENT_URLS]) assert.strictEqual(load(out, r)("h1").length, 1, r);
});

test("dropdown panels: titled columns for sub-headers, an untitled column for direct pages", () => {
  const { expectedMenu } = require("./helpers/menu-data");
  const site = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/content/site.json"), "utf8"));
  const $ = load(buildSite("preview"), "/");
  for (const top of expectedMenu(site).filter((n) => n.children.length)) {
    const panel = $(`#panel-${top.key}`);
    const subGroups = top.children.filter((c) => c.children.length);
    const direct = top.children.filter((c) => !c.children.length);
    assert.deepStrictEqual(panel.find(".mega-col-title").map((_, e) => $(e).text().trim()).get(), subGroups.map((g) => g.title), top.key);
    if (direct.length) {
      const visible = (e) => { const c = $(e).clone(); c.find(".visually-hidden").remove(); return c.text().trim(); };
      assert.deepStrictEqual(panel.find(".mega-col-untitled a").map((_, e) => visible(e)).get(), direct.map((d) => d.title), top.key);
    }
  }
});
test("support panel hides remote link while its url is empty", () => {
  const $ = load(buildSite("empty", { SITE_DATA_FILE: "tests/fixtures/site-empty.json" }), "/");
  const links = $("#panel-support a").map((_, el) => $(el).text().trim()).get();
  assert.deepStrictEqual(links, ["מדריכים", "טופס קריאת שירות"]);
});

test("home sections", () => {
  const $ = load(buildSite("preview"), "/");
  assert.strictEqual($(".customers").length, 0);
  assert.strictEqual($('form[name="contact"]').length, 1);
  assert.strictEqual($(".why-grid > *").length, 4);
});

test("robots", () => {
  assert.match(read(buildSite("prod"), "robots.txt"), /Sitemap: https:\/\/tel-raz\.com\/sitemap\.xml/);
  assert.match(read(buildSite("preview"), "robots.txt"), /Disallow: \//);
});

test("sitemap", () => {
  const xml = read(buildSite("prod"), "sitemap.xml");
  for (const u of CONTENT_URLS) assert.ok(xml.includes(`<loc>https://tel-raz.com${u}</loc>`), u);
  assert.ok(xml.includes("<loc>https://tel-raz.com/</loc>"));
  assert.ok(!xml.includes("/thanks/"));
  assert.ok(!xml.includes("404"));
  assert.ok(!xml.includes("/admin/"), "admin panel must not be in the sitemap");
});

test("support panel shows the remote link when its url is set", () => {
  const $ = load(buildSite("placeholder", { SITE_DATA_FILE: "tests/fixtures/site-placeholder.json" }), "/");
  const remote = $('#panel-support a[href="https://example.com/remote"]');
  assert.strictEqual(remote.attr("target"), "_blank");
});

test("redirects", () => {
  const r = read(buildSite("prod"), "_redirects");
  assert.match(r, /^https:\/\/tel-raz\.co\.il\/\*\s+https:\/\/tel-raz\.com\/:splat\s+301!$/m);
  assert.match(r, /^https:\/\/www\.tel-raz\.co\.il\/\*\s+https:\/\/tel-raz\.com\/:splat\s+301!$/m);
});

test("hero and logo ship as webp", () => {
  const out = buildSite("preview");
  assert.match(read(out, "assets/css/site.css"), /hero\.webp/);
  const hero = path.join(out, "assets/img/hero.webp");
  assert.ok(fs.existsSync(hero), "hero.webp missing");
  assert.ok(fs.statSync(hero).size < 150 * 1024, "hero.webp too large");
  assert.ok(fs.existsSync(path.join(out, "assets/img/logo.webp")), "logo.webp missing");
});
