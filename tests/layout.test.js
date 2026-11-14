const test = require("node:test");
const assert = require("node:assert");
const { buildSite, load } = require("./helpers/build");

const home = (name) => load(buildSite(name), "/");

test("menu order", () => {
  const $ = home("preview");
  const labels = $(".site-header nav .nav-top > li > .nav-link, .site-header nav .nav-top > li > .nav-trigger")
    .map((_, el) => $(el).text().trim())
    .get();
  assert.deepStrictEqual(labels, ["שירותים", "עלינו", "שירות ותמיכה", "צור קשר"]);
});

test("phone button", () => {
  const $ = home("preview");
  const btn = $(".phone-btn").first();
  assert.strictEqual(btn.attr("href"), "tel:+97297601760");
  assert.match(btn.text(), /09-7601760/);
});

test("noindex only on preview", () => {
  assert.strictEqual(home("preview")('meta[name="robots"][content="noindex"]').length, 1);
  assert.strictEqual(home("prod")('meta[name="robots"][content="noindex"]').length, 0);
});

test("canonical", () => {
  assert.strictEqual(home("prod")('link[rel="canonical"]').attr("href"), "https://tel-raz.com/");
});

test("json-ld", () => {
  const data = JSON.parse(home("prod")('script[type="application/ld+json"]').text());
  assert.strictEqual(data["@type"], "LocalBusiness");
  assert.strictEqual(data.telephone, "+97297601760");
});

test("empty settings hide elements", () => {
  const $ = home("empty");
  assert.strictEqual($(".whatsapp-fab").length, 0);
  assert.strictEqual($('a[href^="mailto:"]').length, 0);
  assert.strictEqual($('a[href=""]').length, 0);
  assert.strictEqual($(".social a").length, 0);
});

test("filled settings show whatsapp and email", () => {
  const $ = home("preview");
  assert.strictEqual($(".whatsapp-fab").attr("href"), "https://wa.me/97297601760");
  assert.ok($('a[href="mailto:info@tel-raz.com"]').length > 0);
});

test("skip link and landmarks", () => {
  const $ = home("preview");
  assert.strictEqual($('.skip-link[href="#main"]').length, 1);
  assert.strictEqual($("main#main").length, 1);
});

test("menu labels never wrap inside the bar", () => {
  const css = require("node:fs").readFileSync(require("node:path").join(buildSite("preview"), "assets/css/site.css"), "utf8");
  assert.match(css, /\.nav-link, \.nav-trigger \{[^}]*white-space: nowrap/);
});

