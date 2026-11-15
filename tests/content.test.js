const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const cheerio = require("cheerio");
const { buildSite, load } = require("./helpers/build");
const { buildCopy } = require("./helpers/build-copy");

// Rewrites a page's front matter in a throwaway copy of the site.
function editPage(dir, slug, change) {
  const file = path.join(dir, "src/pages", `${slug}.md`);
  const [, fm, body] = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = YAML.parse(fm);
  change(data);
  fs.writeFileSync(file, `---\n${YAML.stringify(data)}---\n${body}`);
}
const page = (out, url) => cheerio.load(fs.readFileSync(path.join(out, url, "index.html"), "utf8"));

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

test("panasonic shows its items as cards, with images, unlinked", () => {
  const $ = load(buildSite("preview"), "/panasonic/");
  const cards = $(".item-card");
  assert.ok(cards.length >= 4);
  assert.strictEqual($(".item-card--link").length, 0);
  assert.strictEqual(cards.first().prop("tagName"), "DIV");
  assert.ok(cards.find("h3").map((_, e) => $(e).text().trim()).get().includes("NS1000"));
});

test("an item without an image shows the placeholder", () => {
  const $ = load(buildSite("preview"), "/panasonic/");
  const ph = $('.item-card img[src^="/assets/img/placeholder"]');
  assert.ok(ph.length >= 1);
  assert.strictEqual(ph.first().attr("alt"), "");
  assert.ok(fs.existsSync(path.join(buildSite("preview"), ph.first().attr("src"))));
});

test("a linked item is a floating card with the default link text", () => {
  let html;
  const r = buildCopy(
    (dir) => editPage(dir, "panasonic", (d) => { d.items[0].link = "grandstream"; }),
    (out) => { html = page(out, "panasonic"); }
  );
  assert.ok(r.ok, r.output);
  const card = html("a.item-card.item-card--link").first();
  assert.strictEqual(card.attr("href"), "/grandstream/");
  assert.match(card.find(".item-card__more").text(), /לפרטים נוספים/);
});

test("a linked item uses its own link text when set", () => {
  let html;
  buildCopy(
    (dir) => editPage(dir, "panasonic", (d) => { d.items[0].link = "contact"; d.items[0].linkText = "לצפייה במוצר"; }),
    (out) => { html = page(out, "panasonic"); }
  );
  const card = html("a.item-card--link").first();
  assert.strictEqual(card.attr("href"), "/contact/");
  assert.match(card.find(".item-card__more").text(), /לצפייה במוצר/);
});

test("a link to a deleted page fails the build, naming the page", () => {
  const r = buildCopy((dir) => editPage(dir, "panasonic", (d) => { d.items[0].link = "deleted-page"; }));
  assert.strictEqual(r.ok, false);
  assert.match(r.output, /deleted-page/);
});

test("contact form appears only when contactForm is on", () => {
  assert.strictEqual(load(buildSite("preview"), "/about/")('form[name="contact"]').length, 0);
  assert.strictEqual(load(buildSite("preview"), "/panasonic/")('form[name="contact"]').length, 1);
});

test("home tiles link through the page dropdown", () => {
  const $ = load(buildSite("preview"), "/");
  const hrefs = $(".tile").map((_, e) => $(e).attr("href")).get();
  assert.deepStrictEqual(hrefs, ["/ipecs-cloud/", "/ip-phones-1000i/", "/panasonic/", "/grandstream/", "/call-transcription/", "/call-center/"]);
  const home = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/content/home.json"), "utf8"));
  assert.ok(home.tiles.every((t) => t.link && !("url" in t)));
});

test("image position puts the gallery above, beside or below the text", () => {
  const img = [{ src: "/assets/img/og.png", alt: "בדיקה" }];
  for (const [pos, expected] of [["top", "gallery-first"], ["side", "side"], ["bottom", "text-first"]]) {
    let $;
    buildCopy((dir) => editPage(dir, "about", (d) => { d.images = img; d.imagePosition = pos; }), (out) => { $ = page(out, "about"); });
    const layout = $(".content-layout");
    assert.ok(layout.hasClass(`content-layout--${pos}`), pos);
    const order = layout.children().map((_, e) => ($(e).hasClass("gallery") ? "gallery" : "text")).get();
    if (expected === "gallery-first") assert.deepStrictEqual(order, ["gallery", "text"]);
    if (expected === "text-first") assert.deepStrictEqual(order, ["text", "gallery"]);
    if (expected === "side") assert.ok(order.includes("gallery") && order.includes("text"));
  }
});

test("a page without images has no gallery", () => {
  assert.strictEqual(load(buildSite("preview"), "/call-center/")(".gallery").length, 0);
});
