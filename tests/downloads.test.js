const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { buildSite, load } = require("./helpers/build");

test("every download href resolves to a file in the build", () => {
  const out = buildSite("preview");
  const $ = load(out, "/support/guides/");
  const links = $("a[download]");
  assert.strictEqual(links.length, 8);
  links.each((_, el) => {
    const href = $(el).attr("href");
    assert.ok(href.startsWith("/files/"), href);
    assert.ok(fs.existsSync(path.join(out, decodeURIComponent(href))), `missing ${href}`);
  });
});

test("download badges reflect file type", () => {
  const $ = load(buildSite("preview"), "/support/guides/");
  const badges = $("a[download] .badge").map((_, el) => $(el).text()).get();
  assert.strictEqual(badges[0], "PDF");
  assert.ok(badges.includes("XLS"));
});
