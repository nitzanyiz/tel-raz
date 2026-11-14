const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { ROOT } = require("./helpers/build");

const config = YAML.parse(fs.readFileSync(path.join(ROOT, "src/admin/config.yml"), "utf8"));
const fieldNames = (fields) => fields.map((f) => f.name).sort();

function frontMatterKeys(file) {
  const m = fs.readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
  return Object.keys(YAML.parse(m[1]) || {});
}

test("backend points at the repo's master branch", () => {
  assert.strictEqual(config.backend.name, "github");
  assert.strictEqual(config.backend.repo, "nitzanyiz/tel-raz");
  assert.strictEqual(config.backend.branch, "master");
});

test("file collections match their JSON keys exactly", () => {
  for (const col of config.collections.filter((c) => c.files)) {
    for (const f of col.files) {
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, f.file), "utf8"));
      assert.deepStrictEqual(fieldNames(f.fields), Object.keys(data).sort(), f.file);
    }
  }
});

test("folder collections cannot create or delete pages", () => {
  const folders = config.collections.filter((c) => c.folder);
  assert.ok(folders.length >= 3);
  for (const c of folders) {
    assert.strictEqual(c.create, false, c.name);
    assert.strictEqual(c.delete, false, c.name);
  }
});

test("every front-matter key of every page is a configured field", () => {
  for (const c of config.collections.filter((c) => c.folder)) {
    const dir = path.join(ROOT, c.folder);
    const names = new Set(c.fields.map((f) => f.name));
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      for (const key of frontMatterKeys(path.join(dir, file))) {
        assert.ok(names.has(key), `${c.folder}/${file}: "${key}" missing from collection ${c.name}`);
      }
    }
  }
});

test("developer-only keys are hidden fields", () => {
  for (const c of config.collections.filter((c) => c.folder)) {
    for (const f of c.fields.filter((f) => ["menu", "layout", "permalink", "sitemap"].includes(f.name))) {
      assert.strictEqual(f.widget, "hidden", `${c.name}.${f.name}`);
    }
  }
});

test("admin page loads a pinned sveltia version and is noindexed", () => {
  const html = fs.readFileSync(path.join(ROOT, "src/admin/index.html"), "utf8");
  assert.match(html, /@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js/);
  assert.match(html, /<meta name="robots" content="noindex">/);
});
