const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const cheerio = require("cheerio");
const { buildCopy } = require("./helpers/build-copy");

const IMGS = [
  { src: "/assets/img/og.png", alt: "תמונה ראשונה" },
  { src: "/assets/img/hero.png", alt: "תמונה שנייה" },
  { src: "/assets/img/logo.png", alt: "תמונה שלישית" },
];

function aboutWith(images) {
  let $;
  const r = buildCopy((dir) => {
    const file = path.join(dir, "src/pages/about.md");
    const [, fm, body] = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const d = YAML.parse(fm);
    d.images = images;
    fs.writeFileSync(file, `---\n${YAML.stringify(d)}---\n${body}`);
  }, (out) => { $ = cheerio.load(fs.readFileSync(path.join(out, "about/index.html"), "utf8")); });
  assert.ok(r.ok, r.output);
  return $;
}

test("one image: main image only, no thumbnails, still opens full screen", () => {
  const $ = aboutWith(IMGS.slice(0, 1));
  assert.strictEqual($(".gallery-thumbs").length, 0);
  assert.strictEqual($("button.gallery-main img").attr("alt"), "תמונה ראשונה");
  assert.strictEqual($("dialog.lightbox").length, 1);
  assert.strictEqual($("dialog.lightbox .lightbox-next").length, 0, "no arrows for a single image");
});

test("three images: three thumbnails, the first one current", () => {
  const $ = aboutWith(IMGS);
  const thumbs = $(".gallery-thumbs button.gallery-thumb");
  assert.strictEqual(thumbs.length, 3);
  assert.strictEqual(thumbs.first().attr("aria-current"), "true");
  assert.strictEqual(thumbs.eq(1).attr("aria-current"), undefined);
  assert.strictEqual(thumbs.eq(2).attr("aria-label"), "תמונה 3 מתוך 3");
  assert.strictEqual(thumbs.eq(1).attr("data-src"), "/assets/img/hero.png");
  assert.strictEqual(thumbs.eq(1).attr("data-alt"), "תמונה שנייה");
  assert.strictEqual($("dialog.lightbox .lightbox-next").length, 1);
});

test("every main and full-screen image has alt text; thumbnails are labelled buttons", () => {
  const $ = aboutWith(IMGS);
  assert.ok($(".gallery-main img").attr("alt"));
  $(".gallery-thumb").each((_, b) => assert.ok($(b).attr("aria-label")));
});
