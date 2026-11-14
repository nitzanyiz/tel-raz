const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./helpers/build");

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));

function keyPaths(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? keyPaths(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  ).sort();
}

test("every download file exists in src", () => {
  for (const item of read("src/content/downloads.json").items) {
    assert.ok(fs.existsSync(path.join(ROOT, "src", item.file)), `missing ${item.file}`);
  }
});

test("downloads has the 8 migrated guides", () => {
  const { items } = read("src/content/downloads.json");
  assert.strictEqual(items.length, 8);
  assert.strictEqual(items[0].title, "מדריך מקוצר למשתמש למרכזיות Panasonic");
});

test("fixture and site share keys", () => {
  assert.deepStrictEqual(keyPaths(read("tests/fixtures/site-empty.json")), keyPaths(read("src/content/site.json")));
});
