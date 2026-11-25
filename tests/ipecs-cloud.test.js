// The IPECS Cloud page (/ipecs-cloud/): fixed sections (overview, audience,
// quote strip, highlights, features, security) filled from front matter.
// Expectations are computed from the front matter, so editor changes to the
// wording or the number of cards don't break these tests.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const cheerio = require("cheerio");
const { buildSite, load, ROOT } = require("./helpers/build");
const { buildCopy } = require("./helpers/build-copy");

const FILE = path.join(ROOT, "src/pages/ipecs-cloud.md");
const fm = () => YAML.parse(fs.readFileSync(FILE, "utf8").match(/^---\n([\s\S]*?)\n---/)[1]);
const page = () => load(buildSite("preview"), "/ipecs-cloud/");
const txt = ($, el) => $(el).text().replace(/\s+/g, " ").trim();

function editPage(dir, change) {
  const file = path.join(dir, "src/pages/ipecs-cloud.md");
  const [, raw, body] = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = YAML.parse(raw);
  change(data);
  fs.writeFileSync(file, `---\n${YAML.stringify(data)}---\n${body}`);
}
function buildEdited(change) {
  let $;
  const r = buildCopy(
    (dir) => editPage(dir, change),
    (out) => { $ = cheerio.load(fs.readFileSync(path.join(out, "ipecs-cloud/index.html"), "utf8")); }
  );
  assert.ok(r.ok, r.output);
  return $;
}
const drawn = ($, scope) => $(scope).find(".ipc-ico").each((_, e) => assert.ok($(e).find("svg").children().length > 0, "icon drawn"));

test("uses its own layout, not the generic content layout", () => {
  const $ = page();
  assert.strictEqual($(".content-layout").length, 0);
  assert.strictEqual($(".ipc-overview").length, 1);
  assert.ok($(".ipc-overview").hasClass("prose"), "overview sits on the site's white card");
});

test("overview: heading, text and facts from front matter", () => {
  const $ = page(), o = fm().overview;
  assert.strictEqual(txt($, ".ipc-overview h2"), o.heading);
  assert.strictEqual(txt($, ".ipc-overview__text"), o.text);
  assert.deepStrictEqual($(".ipc-facts li").map((_, e) => txt($, e)).get(), o.facts.map((f) => f.text));
  drawn($, ".ipc-facts");
  const img = $(".ipc-overview__img");
  if (o.image) {
    assert.ok($(".ipc-overview").hasClass("ipc-overview--img"));
    assert.strictEqual(img.attr("src"), o.image);
    assert.strictEqual(img.attr("alt"), o.alt);
  } else assert.strictEqual(img.length, 0);
});

test("overview without a picture: no image and the text takes the full width", () => {
  const $ = buildEdited((d) => { delete d.overview.image; delete d.overview.alt; });
  assert.strictEqual($(".ipc-overview__img").length, 0);
  assert.ok(!$(".ipc-overview").hasClass("ipc-overview--img"));
});

test("card sections render their heading, subtitle and cards", () => {
  const $ = page(), d = fm();
  for (const key of ["audience", "features", "security"]) {
    const sec = $(`[data-section="${key}"]`);
    assert.strictEqual(sec.length, 1, key);
    assert.strictEqual(txt($, sec.find("h2")), d[key].heading, `${key} heading`);
    assert.strictEqual(txt($, sec.find(".ipc-sub")), d[key].subtitle, `${key} subtitle`);
    assert.deepStrictEqual(sec.find(".ipc-card h3").map((_, e) => txt($, e)).get(), d[key].cards.map((c) => c.title), `${key} titles`);
    assert.deepStrictEqual(sec.find(".ipc-card p").map((_, e) => txt($, e)).get(), d[key].cards.map((c) => c.text), `${key} texts`);
    drawn($, sec);
  }
  // card titles are h3 under the section's h2
  assert.strictEqual($("h1").length, 1);
});

test("quote strip: title, text and a button to the contact form", () => {
  const $ = page(), c = fm().cta;
  assert.strictEqual(txt($, ".ipc-band strong"), c.title);
  assert.strictEqual(txt($, ".ipc-band span"), c.text);
  const btn = $(".ipc-band a");
  assert.strictEqual(txt($, btn), c.button);
  assert.strictEqual(btn.attr("href"), "#contact");
  assert.strictEqual($("#contact form[name=\"contact\"]").length, 1);
});

test("highlights: tag, title, text, points and image from front matter", () => {
  const $ = page(), h = fm().highlights;
  assert.strictEqual(txt($, '[data-section="highlights"] h2'), h.heading);
  const spots = $(".ipc-spot");
  assert.strictEqual(spots.length, h.items.length);
  spots.each((i, e) => {
    const it = h.items[i], s = $(e);
    assert.strictEqual(txt($, s.find(".ipc-tag")), it.tag);
    assert.strictEqual(txt($, s.find("h3")), it.title);
    assert.strictEqual(txt($, s.find(".ipc-spot__text > p")), it.text);
    assert.deepStrictEqual(s.find("li").map((_, l) => txt($, l)).get(), it.points);
    assert.strictEqual(s.find("img").attr("src"), it.image);
    assert.strictEqual(s.find("img").attr("alt"), it.alt);
  });
});

test("a feature card with a page link shows it; others have no link", () => {
  const $ = page(), cards = fm().features.cards;
  $('[data-section="features"] .ipc-card').each((i, e) => {
    const a = $(e).find("a");
    if (cards[i].link) {
      assert.strictEqual(a.attr("href"), `/${cards[i].link}/`, cards[i].title);
      assert.ok(txt($, a).startsWith(cards[i].linkText || "לפרטים נוספים"), cards[i].title);
    } else assert.strictEqual(a.length, 0, cards[i].title);
  });
});

test("entrance animations: highlights and card grids reveal late, cards stagger", () => {
  const $ = page();
  $(".ipc-spot").each((_, e) => {
    assert.strictEqual($(e).attr("data-reveal"), "late");
    assert.strictEqual($(e).find(".reveal").length, 2, "text and image");
  });
  for (const key of ["audience", "features"]) {
    const grid = $(`[data-section="${key}"] .ipc-grid`);
    assert.strictEqual(grid.attr("data-reveal"), "late", key);
    grid.find(".ipc-card").each((i, c) => {
      assert.ok($(c).hasClass("reveal"), `${key} card ${i}`);
      assert.strictEqual($(c).attr("style"), `--i:${i}`);
    });
  }
});

test("site.js reveals data-reveal=\"late\" sections once their top is well inside the screen", () => {
  const js = fs.readFileSync(path.join(ROOT, "src/assets/js/site.js"), "utf8");
  assert.match(js, /reveal === "late"/);
  assert.match(js, /rootMargin: "0px 0px -25% 0px"/);
});

test("editor mistakes don't break the page", () => {
  const $ = buildEdited((d) => {
    d.overview.facts[0].icon = "nope";
    delete d.overview.facts[1].icon;
    d.audience.cards = [];
    d.security.heading = "";
    d.security.subtitle = "";
    d.features.subtitle = "";
    d.highlights.items[0].tag = "";
    d.highlights.items[0].points = [];
    delete d.highlights.items[1].points;
  });
  drawn($, ".ipc-facts");
  assert.strictEqual($('[data-section="audience"]').length, 0, "a section with no cards disappears");
  assert.strictEqual($('[data-section="security"] h2').length, 0, "empty heading renders nothing");
  assert.strictEqual($('[data-section="security"] .ipc-card').length, fm().security.cards.length, "cards stay");
  assert.strictEqual($('[data-section="features"] .ipc-sub').length, 0, "empty subtitle renders nothing");
  assert.strictEqual($(".ipc-spot").first().find(".ipc-tag, ul").length, 0, "no empty tag or list");
  assert.strictEqual($(".ipc-spot").eq(1).find("ul").length, 0);
  assert.strictEqual($("main h2:empty, main h3:empty, main p:empty:not([role=status]), main ul:empty").length, 0);
});

test("a feature card linking to a deleted page stops the build, like other page links", () => {
  const r = buildCopy((dir) => editPage(dir, (d) => { d.features.cards[0].link = "no-such-page"; }), () => {});
  assert.strictEqual(r.ok, false);
  assert.match(r.output, /no-such-page/);
});

test("without the contact form, the quote button goes to the contact page", () => {
  const $ = buildEdited((d) => { d.contactForm = false; });
  assert.strictEqual($('form[name="contact"]').length, 0);
  assert.strictEqual($(".ipc-band a").attr("href"), "/contact/");
});
