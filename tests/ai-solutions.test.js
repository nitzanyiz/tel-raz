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

// ---- the animations (decorative, fixed in code; markup = the finished frame)
test("each section has one decorative animation", () => {
  const $ = page();
  $("section.ai-section").each((_, s) => {
    const stage = $(s).find(".ai-section__anim .ai-stage");
    assert.strictEqual(stage.length, 1, $(s).attr("data-anim"));
    assert.strictEqual(stage.attr("aria-hidden"), "true");
    assert.strictEqual(stage.attr("data-anim"), $(s).attr("data-anim"));
  });
  assert.strictEqual($(".ai-stage").find("a, button, input, select, textarea, [tabindex]").length, 0, "nothing focusable");
});

test("finished frames carry the spec text", () => {
  const $ = page();
  const text = (anim) => $(`.ai-stage[data-anim="${anim}"]`).text().replace(/\s+/g, " ");
  for (const s of ["המשלוח", "סיכום", "סנטימנט", "משימה", "לבדוק סטטוס משלוח ולחזור ללקוח"]) assert.ok(text("analysis").includes(s), `analysis: ${s}`);
  for (const s of ["אפשר לקבוע תור ליום שלישי?", "בטח! יש מקום ביום ג׳ ב־10:00", "מעולה, מתאים לי!", "התור נקבע"]) assert.ok(text("voicebot").includes(s), `voicebot: ${s}`);
  for (const s of ["חייבו אותי פעמיים על אותה חשבונית", "סיכום להעברה", "כבר מטפל בזיכוי", "בלי לחזור על הפרטים"]) assert.ok(text("handoff").includes(s), `handoff: ${s}`);
  const label = (anim, who) => $(`.ai-stage[data-anim="${anim}"] .ai-who--${who} .ai-who__label`).text().trim();
  assert.deepStrictEqual([label("voicebot", "customer"), label("voicebot", "bot")], ["לקוח", "בוט AI"]);
  assert.deepStrictEqual([label("handoff", "customer"), label("handoff", "bot"), label("handoff", "agent")], ["לקוח", "בוט AI", "נציג"]);
  assert.strictEqual($('.ai-stage[data-anim="voicebot"] .ai-who--agent').length, 0);
});

test("no hidden steps without JS", () => {
  // Without .is-live (no JS, reduced motion) the stage is its finished frame:
  // a rule may only hide an AI element when it's scoped under .is-live.
  const css = fs.readFileSync(path.join(ROOT, "src/assets/css/site.css"), "utf8");
  const block = css.slice(css.indexOf("/* ---------- AI solutions page")).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(block.includes(".ai-stage"), "AI stage styles exist");
  for (const [, sel, decl] of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/^\s*(from|to|[\d.%,\s]+)\s*$/.test(sel)) continue; // keyframe steps, not selectors
    if (!/(^|;|\s)(opacity:\s*0(?![.\d])|visibility:\s*hidden|display:\s*none)/.test(decl)) continue;
    for (const part of sel.split(",")) assert.ok(part.includes(".is-live"), `hidden without .is-live: ${part.trim()}`);
  }
});

test("script plays only on screen and respects reduced motion", () => {
  const js = fs.readFileSync(path.join(ROOT, "src/assets/js/ai-solutions.js"), "utf8");
  for (const s of ["IntersectionObserver", "visibilitychange", "prefers-reduced-motion", "is-live", "analysis", "voicebot", "handoff"]) assert.ok(js.includes(s), s);
});

test("opening text (page body) shows above the sections, and nothing when empty", () => {
  const $ = page();
  const intro = $(".ai-opening");
  assert.strictEqual(intro.length, 1);
  assert.strictEqual(intro.find("h2").first().text().trim(), "למה שירות AI?");
  assert.ok(intro.text().includes("טכנולוגיות AI מאפשרות"));
  assert.ok($("*").index(intro) < $("*").index($("section.ai-section").first()), "above the sections");
  let empty;
  const r = buildCopy(
    (dir) => { const f = path.join(dir, "src/pages/ai-solutions.md"); fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/^(---\n[\s\S]*?\n---\n)[\s\S]*$/, "$1")); },
    (out) => { empty = cheerio.load(fs.readFileSync(path.join(out, "ai-solutions/index.html"), "utf8")); }
  );
  assert.ok(r.ok, r.output);
  assert.strictEqual(empty(".ai-opening").length, 0);
});

test("section 1 sound: speech bars, then a dashed silence line, flowing left into the AI line", () => {
  const $ = page();
  const track = $('.ai-stage[data-anim="analysis"] .ai-sound__track');
  const bars = track.find("i"), dashes = track.find("b");
  assert.ok(bars.length >= 50, `about 1.5s of speech (${bars.length} bars)`);
  assert.ok(new Set(bars.map((_, e) => $(e).attr("style")).get()).size >= 25, "irregular heights");
  assert.ok(dashes.length >= 30, `a dashed silence line after the speech (${dashes.length} dashes)`);
  assert.ok(track.children().last().is("b") && track.children().first().is("i"), "speech first, silence after it");
  const css = fs.readFileSync(path.join(ROOT, "src/assets/css/site.css"), "utf8");
  assert.ok(!/\.ai-sound__track \{[^}]*linear-gradient/.test(css), "no solid line running through the speech");
  assert.ok(!/\.ai-sound i \{[^}]*height:\s*3px/.test(css) && !/:not\(\.is-hearing\) \.ai-sound i/.test(css), "bars never flatten in place");
  assert.ok(!/\.ai-sound i[^{]*\{[^}]*animation/.test(css), "each bar keeps its own fixed height as it moves (no flicker)");
  const js = fs.readFileSync(path.join(ROOT, "src/assets/js/ai-solutions.js"), "utf8");
  assert.match(js, /\.animate\(/, "the track moves once, right to left, and stays where it ends");
  assert.match(js, /getAnimations\(\)/, "a restart cancels the move");
});
