const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { buildSite, load, fileFor } = require("./helpers/build");

const ROUTES = [
  "/", "/services/ipecs-cloud/", "/services/ip-phones-1000i/", "/services/panasonic/",
  "/services/grandstream/", "/services/call-transcription/", "/services/call-center/",
  "/about/", "/support/guides/", "/support/service-call/", "/contact/",
  "/accessibility/", "/privacy/", "/thanks/", "/404.html",
];
const SERVICE_URLS = ROUTES.filter((r) => r.startsWith("/services/"));
const read = (out, f) => fs.readFileSync(path.join(out, f), "utf8");

test("every route exists", () => {
  const out = buildSite("preview");
  for (const r of ROUTES) assert.ok(fs.existsSync(fileFor(out, r)), `missing ${r}`);
});

test("one h1 per page", () => {
  const out = buildSite("preview");
  for (const r of ROUTES) assert.strictEqual(load(out, r)("h1").length, 1, r);
});

test("services panel columns", () => {
  const $ = load(buildSite("preview"), "/");
  const titles = $("#panel-services .mega-col-title").map((_, el) => $(el).text().trim()).get();
  assert.deepStrictEqual(titles, ["שירותי מרכזיה בענן", "מרכזיה"]);
  const last = $("#panel-services .mega-col").last().find("a").map((_, el) => $(el).text().trim()).get();
  assert.deepStrictEqual(last, ["תמלול שיחות", "מוקד קול סנטר"]);
});

test("support panel hides remote link while its url is empty", () => {
  const $ = load(buildSite("preview"), "/");
  const links = $("#panel-support a").map((_, el) => $(el).text().trim()).get();
  assert.deepStrictEqual(links, ["מדריכים", "טופס קריאת שירות"]);
});

test("product models", () => {
  const $ = load(buildSite("preview"), "/services/panasonic/");
  const names = $(".model h3").map((_, el) => $(el).text().trim()).get();
  assert.strictEqual(names.length, 4);
  assert.ok(names.includes("NS1000"));
  assert.strictEqual(load(buildSite("preview"), "/services/call-center/")(".models").length, 0);
});

test("service pages end with the contact form", () => {
  for (const url of SERVICE_URLS) {
    const $ = load(buildSite("preview"), url);
    assert.strictEqual($('form[name="contact"] input[name="page"]').val(), url);
  }
});

test("home sections", () => {
  const $ = load(buildSite("preview"), "/");
  const tiles = $(".tile").map((_, el) => $(el).attr("href")).get();
  assert.deepStrictEqual(tiles, SERVICE_URLS);
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
  assert.ok(xml.includes("<loc>https://tel-raz.com/services/panasonic/</loc>"));
  assert.ok(xml.includes("<loc>https://tel-raz.com/</loc>"));
  assert.ok(!xml.includes("/thanks/"));
  assert.ok(!xml.includes("404"));
  assert.ok(!xml.includes("/admin/"), "admin panel must not be in the sitemap");
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
