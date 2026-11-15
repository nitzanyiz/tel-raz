const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const cheerio = require("cheerio");
const { buildSite, load } = require("./helpers/build");
const { buildCopy } = require("./helpers/build-copy");

// Rewrites a page's front matter in a throwaway copy of the site
// (fixture pages are created first if needed).
function editPage(dir, slug, change) {
  const file = path.join(dir, "src/pages", `${slug}.md`);
  if (!fs.existsSync(file) && FIXTURES[slug]) fs.writeFileSync(file, FIXTURES[slug]);
  const [, fm, body] = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = YAML.parse(fm);
  change(data);
  fs.writeFileSync(file, `---\n${YAML.stringify(data)}---\n${body}`);
}
const page = (out, url) => cheerio.load(fs.readFileSync(path.join(out, url, "index.html"), "utf8"));

// Fixture pages, built once in a throwaway copy, so these checks don't depend
// on what the editor has written in the real pages.
const FIXTURES = {
  "fixture-cards": "---\nsystem: false\nsitemap: true\ntitle: כרטיסים\nimages: []\nitems:\n  - { name: דגם א, image: /assets/img/og.png, text: תיאור }\n  - { name: דגם ב }\ncontactForm: true\n---\nטקסט\n",
  "fixture-plain": "---\nsystem: false\nsitemap: true\ntitle: עמוד פשוט\nimages: []\nitems: []\ncontactForm: false\n---\nטקסט\n",
};

test("current content was migrated: items and images, no legacy keys", () => {
  const dir = path.join(__dirname, "../src/pages");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const fm = YAML.parse(fs.readFileSync(path.join(dir, f), "utf8").match(/^---\n([\s\S]*?)\n---/)[1]);
    if (fm.system) continue;
    for (const legacy of ["models", "image", "imageAlt"]) assert.ok(!(legacy in fm), `${f} still has ${legacy}`);
    assert.ok(Array.isArray(fm.images), `${f}: images`);
    assert.ok(Array.isArray(fm.items), `${f}: items`);
  }
});

test("a linked item is a floating card with the default link text", () => {
  let html;
  const r = buildCopy(
    (dir) => { fs.writeFileSync(path.join(dir, "src/pages/fixture-plain.md"), FIXTURES["fixture-plain"]); editPage(dir, "fixture-cards", (d) => { d.items[0].link = "fixture-plain"; }); },
    (out) => { html = page(out, "fixture-cards"); }
  );
  assert.ok(r.ok, r.output);
  const card = html("a.item-card.item-card--link").first();
  assert.strictEqual(card.attr("href"), "/fixture-plain/");
  assert.match(card.find(".item-card__more").text(), /לפרטים נוספים/);
});

test("a linked item uses its own link text when set", () => {
  let html;
  buildCopy(
    (dir) => editPage(dir, "fixture-cards", (d) => { d.items[0].link = "contact"; d.items[0].linkText = "לצפייה במוצר"; }),
    (out) => { html = page(out, "fixture-cards"); }
  );
  const card = html("a.item-card--link").first();
  assert.strictEqual(card.attr("href"), "/contact/");
  assert.match(card.find(".item-card__more").text(), /לצפייה במוצר/);
});

test("a link to a deleted page fails the build, naming the page", () => {
  const r = buildCopy((dir) => editPage(dir, "fixture-cards", (d) => { d.items[0].link = "deleted-page"; }));
  assert.strictEqual(r.ok, false);
  assert.match(r.output, /deleted-page/);
});

test("image position puts the gallery above, beside or below the text", () => {
  const img = [{ src: "/assets/img/og.png", alt: "בדיקה" }];
  for (const [pos, expected] of [["top", "gallery-first"], ["side", "side"], ["bottom", "text-first"]]) {
    let $;
    buildCopy((dir) => editPage(dir, "fixture-plain", (d) => { d.images = img; d.imagePosition = pos; }), (out) => { $ = page(out, "fixture-plain"); });
    const layout = $(".content-layout");
    assert.ok(layout.hasClass(`content-layout--${pos}`), pos);
    const order = layout.children().map((_, e) => ($(e).hasClass("gallery") ? "gallery" : "text")).get();
    if (expected === "gallery-first") assert.deepStrictEqual(order, ["gallery", "text"]);
    if (expected === "text-first") assert.deepStrictEqual(order, ["text", "gallery"]);
    if (expected === "side") assert.ok(order.includes("gallery") && order.includes("text"));
  }
});

let built;
function fixtures() {
  if (built) return built;
  built = {};
  const r = buildCopy(
    (dir) => { for (const [n, md] of Object.entries(FIXTURES)) fs.writeFileSync(path.join(dir, "src/pages", `${n}.md`), md); },
    (out) => { for (const n of Object.keys(FIXTURES)) built[n] = page(out, n); built.home = cheerio.load(fs.readFileSync(path.join(out, "index.html"), "utf8")); }
  );
  assert.ok(r.ok, r.output);
  return built;
}

test("items render as cards; unlinked cards are plain", () => {
  const $ = fixtures()["fixture-cards"];
  assert.strictEqual($(".item-card").length, 2);
  assert.strictEqual($(".item-card--link").length, 0);
  assert.strictEqual($(".item-card").first().prop("tagName"), "DIV");
  assert.deepStrictEqual($(".item-card h3").map((_, e) => $(e).text().trim()).get(), ["דגם א", "דגם ב"]);
});

test("an item without an image shows the placeholder", () => {
  const $ = fixtures()["fixture-cards"];
  const img = $(".item-card").eq(1).find("img");
  assert.match(img.attr("src"), /^\/assets\/img\/placeholder/);
  assert.strictEqual(img.attr("alt"), "");
  assert.ok(fs.existsSync(path.join(__dirname, "../src", img.attr("src"))));
});

test("contact form appears only when contactForm is on", () => {
  assert.strictEqual(fixtures()["fixture-cards"]('form[name="contact"]').length, 1);
  assert.strictEqual(fixtures()["fixture-plain"]('form[name="contact"]').length, 0);
});

test("a page without images has no gallery", () => {
  assert.strictEqual(fixtures()["fixture-plain"](".gallery").length, 0);
});

test("home tiles link to the pages chosen in home.json", () => {
  const $ = fixtures().home;
  const home = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/content/home.json"), "utf8"));
  const expected = home.tiles.filter((t) => t.link).map((t) => `/${t.link}/`);
  assert.deepStrictEqual($("a.tile").map((_, e) => $(e).attr("href")).get(), expected);
  assert.ok(home.tiles.every((t) => !("url" in t)), "tiles use link, not url");
});

