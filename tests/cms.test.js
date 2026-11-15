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

test("admin page loads a pinned sveltia version and is noindexed", () => {
  const html = fs.readFileSync(path.join(ROOT, "src/admin/index.html"), "utf8");
  assert.match(html, /@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js/);
  assert.match(html, /<meta name="robots" content="noindex">/);
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

test("every page that is in the menu says so explicitly (inMenu: true)", () => {
  // The CMS writes the switch's default (false) when an existing page is saved,
  // so a page without an explicit inMenu would drop out of the menu on its first save.
  const dir = path.join(ROOT, "src/pages");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const m = fs.readFileSync(path.join(dir, file), "utf8").match(/^---\n([\s\S]*?)\n---/);
    const fm = YAML.parse(m[1]);
    if (fm.menu && (fm.menu.order !== undefined || fm.menu.parent !== undefined)) {
      assert.strictEqual(fm.menu.inMenu, true, `${file}: menu.inMenu must be true`);
    }
  }
});

// ---- pages: one folder, two filtered views + a hidden view for the link dropdowns
const col = (name) => config.collections.find((c) => c.name === name);
const SYSTEM_PAGES = ["404", "accessibility", "contact", "guides", "privacy", "service-call", "thanks"];
const pageFiles = () => fs.readdirSync(path.join(ROOT, "src/pages")).filter((f) => f.endsWith(".md"));
const pageFm = (file) => YAML.parse(fs.readFileSync(path.join(ROOT, "src/pages", file), "utf8").match(/^---\n([\s\S]*?)\n---/)[1]);

test("עמודים: content pages, editor can add and delete", () => {
  const c = col("pages");
  assert.deepStrictEqual(c.filter, { field: "system", value: false });
  assert.strictEqual(c.create, true);
  assert.strictEqual(c.delete, true);
  assert.deepStrictEqual(c.slug.editable, ["create"], "address is typed only when creating a page");
});

test("עמודי מערכת: system pages, no add or delete", () => {
  const c = col("system_pages");
  assert.deepStrictEqual(c.filter, { field: "system", value: true });
  assert.strictEqual(c.create, false);
  assert.strictEqual(c.delete, false);
});

test("the link dropdowns read from a hidden all-pages view", () => {
  const c = col("all_pages");
  assert.strictEqual(c.hide, true);
  assert.strictEqual(c.folder, "src/pages");
  assert.ok(c.fields.some((f) => f.name === "sitemap"), "relation filter field must be declared here");
});

test("every page carries explicit system and sitemap flags", () => {
  for (const file of pageFiles()) {
    const fm = pageFm(file), slug = file.slice(0, -3);
    assert.strictEqual(fm.system, SYSTEM_PAGES.includes(slug), `${file}: system`);
    assert.strictEqual(typeof fm.sitemap, "boolean", `${file}: sitemap`);
  }
});

test("every front-matter key is a field of the view that shows the page", () => {
  for (const file of pageFiles()) {
    const fm = pageFm(file);
    const names = new Set(col(fm.system ? "system_pages" : "pages").fields.map((f) => f.name));
    for (const key of Object.keys(fm)) assert.ok(names.has(key), `${file}: "${key}" is not a field`);
  }
});

test("system and sitemap flags are hidden from the editor", () => {
  for (const name of ["pages", "system_pages"]) {
    for (const f of col(name).fields.filter((f) => ["system", "sitemap"].includes(f.name))) {
      assert.strictEqual(f.widget, "hidden", `${name}.${f.name}`);
    }
  }
});

test("page links are dropdowns over all pages, storing the file name, without 404/thanks", () => {
  const items = col("pages").fields.find((f) => f.name === "items");
  const link = items.fields.find((f) => f.name === "link");
  assert.strictEqual(link.widget, "relation");
  assert.strictEqual(link.collection, "all_pages");
  assert.strictEqual(link.value_field, "{{slug}}");
  assert.deepStrictEqual(link.filters, [{ field: "sitemap", values: [true] }]);
});

test("menu header options match the menu groups", () => {
  const groups = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/menuGroups.json"), "utf8"));
  const headerKeys = groups.filter((g) => !g.url && !g.urlFromSite).map((g) => g.key).sort();
  for (const name of ["pages", "system_pages"]) {
    const parent = col(name).fields.find((f) => f.name === "menu").fields.find((f) => f.name === "parent");
    const values = parent.options.map((o) => o.value);
    assert.deepStrictEqual(values.filter(Boolean).sort(), headerKeys, name);
    assert.ok(values.includes(""), `${name}: top level option`);
  }
});

test("the address pattern accepts only lowercase English addresses that aren't reserved", () => {
  const re = new RegExp(col("pages").slug.pattern[0]);
  for (const ok of ["ns1000", "winter-sale", "faq"]) assert.ok(re.test(ok), ok);
  for (const bad of ["Admin", "contact us", "admin", "files", "support", "assets", "שלום", "a--b", "-x"]) assert.ok(!re.test(bad), bad);
});

