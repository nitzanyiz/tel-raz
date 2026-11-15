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
  assert.ok(folders.length >= 1);
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

test("routing is not editor-editable front matter", () => {
  for (const c of config.collections.filter((c) => c.folder)) {
    const names = c.fields.map((f) => f.name);
    assert.ok(!names.includes("layout") && !names.includes("permalink"), c.name);
    const dir = path.join(ROOT, c.folder);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const keys = frontMatterKeys(path.join(dir, file));
      assert.ok(!keys.includes("layout") && !keys.includes("permalink"), `${c.folder}/${file}`);
    }
  }
});

test("every menu page declares a developer-owned menu label", () => {
  for (const c of config.collections.filter((c) => c.folder)) {
    const dir = path.join(ROOT, c.folder);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const m = fs.readFileSync(path.join(dir, file), "utf8").match(/^---\n([\s\S]*?)\n---/);
      const fm = YAML.parse(m[1]);
      if (fm.menu) assert.ok(fm.menu.title, `${c.folder}/${file} needs menu.title`);
    }
  }
});

test("settings fields validate their format", () => {
  const fields = config.collections.find((c) => c.name === "settings").files[0].fields;
  const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
  const social = Object.fromEntries(byName.social.fields.map((f) => [f.name, f]));
  const check = (field, good, bad) => {
    assert.ok(field.pattern, `${field.name} has no pattern`);
    const re = new RegExp(field.pattern[0]);
    for (const v of good) assert.ok(re.test(v), `${field.name} should accept ${v}`);
    for (const v of bad) assert.ok(!re.test(v), `${field.name} should reject ${v}`);
  };
  check(byName.whatsapp, ["97297601760", "972541234567", ""], ["054-1234567", "+97297601760", "0541234567"]);
  check(byName.phoneDial, ["+97297601760", "+972541234567"], ["09-7601760", "97297601760"]);
  check(byName.email, ["info@tel-raz.com", ""], ["info@", "info tel-raz.com"]);
  check(byName.remoteSupportUrl, ["https://anydesk.com/he/downloads", ""], ["anydesk.com", "javascript:alert(1)", "http://x.com"]);
  for (const s of Object.values(social)) check(s, ["https://facebook.com/telraz", ""], ["facebook.com/telraz", "javascript:alert(1)"]);
});
