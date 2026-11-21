// The AI solutions page (/ai-solutions/): three sections of cards from front
// matter, each with a fixed decorative animation.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const cheerio = require("cheerio");
const { buildSite, load, ROOT } = require("./helpers/build");
const { buildCopy } = require("./helpers/build-copy");

const FILE = path.join(ROOT, "src/pages/ai-solutions.md");
const fm = () => YAML.parse(fs.readFileSync(FILE, "utf8").match(/^---\n([\s\S]*?)\n---/)[1]);
const page = () => load(buildSite("preview"), "/ai-solutions/");

function editAiPage(dir, change) {
  const file = path.join(dir, "src/pages/ai-solutions.md");
  const [, raw, body] = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = YAML.parse(raw);
  change(data);
  fs.writeFileSync(file, `---\n${YAML.stringify(data)}---\n${body}`);
}

test("renders the three sections from front matter", () => {
  const $ = page(), data = fm();
  const sections = $("section.ai-section");
  assert.strictEqual(sections.length, 3);
  assert.deepStrictEqual(sections.map((_, e) => $(e).attr("data-anim")).get(), ["analysis", "voicebot", "handoff"]);
  sections.each((i, e) => {
    const s = data.sections[i];
    assert.strictEqual($(e).find(".ai-section__text h2").text().trim(), s.title);
    const keys = s.groups.flatMap((g) => g.cards.map((c) => c.keyword));
    assert.deepStrictEqual($(e).find(".ai-card__key").map((_, k) => $(k).text().trim()).get(), keys);
    const texts = s.groups.flatMap((g) => g.cards.map((c) => c.text));
    assert.deepStrictEqual($(e).find(".ai-card__text").map((_, k) => $(k).text().trim()).get(), texts);
  });
  $(".ai-card__icon").each((_, e) => assert.ok($(e).find("svg").children().length > 0, "icon drawn"));
});

test("empty tagline and group heading render nothing", () => {
  const $ = page();
  const s = $("section.ai-section");
  assert.strictEqual(s.eq(0).find(".ai-section__tagline").length, 0);
  assert.strictEqual(s.eq(1).find(".ai-section__tagline").text().trim(), "משיחה לפעולה – באופן אוטומטי");
  assert.strictEqual(s.eq(2).find(".ai-section__tagline").length, 0);
  assert.deepStrictEqual(s.eq(0).find("h3.ai-group__title").map((_, e) => $(e).text().trim()).get(), ["איתור מידע וייעול תהליכי עבודה"]);
  assert.strictEqual($("h3.ai-group__title:empty, .ai-section__tagline:empty").length, 0);
});

test("editor mistakes don't break the page", () => {
  let $;
  const r = buildCopy(
    (dir) => editAiPage(dir, (d) => {
      d.sections[0].groups[0].cards[0].icon = "";
      d.sections[0].groups[0].cards[1].icon = "nope";
      delete d.sections[1].groups[0].cards[0].icon;
      d.sections[2].groups[0].cards = [];
    }),
    (out) => { $ = cheerio.load(fs.readFileSync(path.join(out, "ai-solutions/index.html"), "utf8")); }
  );
  assert.ok(r.ok, r.output);
  const icons = $("section.ai-section").eq(0).find(".ai-card__icon");
  for (const i of [0, 1]) assert.ok(icons.eq(i).find("svg").children().length > 0, `card ${i} falls back to an icon`);
  assert.ok($("section.ai-section").eq(1).find(".ai-card__icon").eq(0).find("svg").children().length > 0, "missing icon falls back");
  assert.strictEqual($("section.ai-section").eq(2).find("ul.ai-cards").length, 0, "no empty card list");
  assert.strictEqual($("section.ai-section").length, 3, "the section itself stays (with its animation)");
});

test("contact form at the bottom", () => {
  assert.strictEqual(page()('form[name="contact"]').length, 1);
});
