const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const cheerio = require("cheerio");
const { breadcrumbs, breadcrumbList } = require("../lib/breadcrumbs");
const { buildSite, load } = require("./helpers/build");
const { buildCopy } = require("./helpers/build-copy");

const groups = [
  { key: "services", title: "שירותים", order: 1 },
  { key: "pbx", title: "מרכזיה", parent: "services", order: 2 },
  { key: "remote", title: "השתלטות מרחוק", order: 3, urlFromSite: "remoteSupportUrl", external: true },
];
const p = (slug, extra = {}) => ({ slug, url: `/${slug}/`, title: slug.toUpperCase(), links: [], ...extra });
const trail = (crumbs) => crumbs.map((c) => (c.url ? `${c.title}@${c.url}` : c.title));

// ---------- The trail (lib/breadcrumbs.js) ----------

test("a top-level menu page: home › page", () => {
  const pages = [p("about", { menu: { inMenu: true, parent: "" } })];
  assert.deepStrictEqual(trail(breadcrumbs("about", pages, groups)), ["ראשי@/", "ABOUT@/about/"]);
});

test("a page under menu headers: the headers have no link", () => {
  const pages = [p("panasonic", { menu: { inMenu: true, parent: "pbx" } })];
  assert.deepStrictEqual(trail(breadcrumbs("panasonic", pages, groups)), ["ראשי@/", "שירותים", "מרכזיה", "PANASONIC@/panasonic/"]);
});

test("the menu label is used when set", () => {
  const pages = [p("panasonic", { title: "מרכזיות Panasonic", menu: { inMenu: true, parent: "", title: "Panasonic" } })];
  assert.deepStrictEqual(trail(breadcrumbs("panasonic", pages, groups)), ["ראשי@/", "Panasonic@/panasonic/"]);
});

test("a page outside the menu hangs under the page whose card links to it", () => {
  const pages = [
    p("panasonic", { menu: { inMenu: true, parent: "pbx" }, links: ["phones"] }),
    p("phones", { menu: { inMenu: false, parent: "" }, links: ["nt680"] }),
    p("nt680", { menu: { inMenu: false, parent: "" } }),
  ];
  assert.deepStrictEqual(trail(breadcrumbs("nt680", pages, groups)),
    ["ראשי@/", "שירותים", "מרכזיה", "PANASONIC@/panasonic/", "PHONES@/phones/", "NT680@/nt680/"]);
});

test("a page nobody links to and not in the menu: home › page", () => {
  const pages = [p("orphan", { menu: { inMenu: false, parent: "" } })];
  assert.deepStrictEqual(trail(breadcrumbs("orphan", pages, groups)), ["ראשי@/", "ORPHAN@/orphan/"]);
});

test("the menu wins over a card link", () => {
  const pages = [
    p("other", { menu: { inMenu: true, parent: "" }, links: ["panasonic"] }),
    p("panasonic", { menu: { inMenu: true, parent: "pbx" } }),
  ];
  assert.deepStrictEqual(trail(breadcrumbs("panasonic", pages, groups)), ["ראשי@/", "שירותים", "מרכזיה", "PANASONIC@/panasonic/"]);
});

test("two parents: the one with the longer trail wins", () => {
  const pages = [
    p("about", { menu: { inMenu: true, parent: "" }, links: ["child"] }),
    p("deep", { menu: { inMenu: true, parent: "pbx" }, links: ["child"] }),
    p("child"),
  ];
  assert.deepStrictEqual(trail(breadcrumbs("child", pages, groups)), ["ראשי@/", "שירותים", "מרכזיה", "DEEP@/deep/", "CHILD@/child/"]);
});

test("two parents with equally long trails: the first file name alphabetically wins", () => {
  const pages = [
    p("zeta", { menu: { inMenu: true, parent: "" }, links: ["child"] }),
    p("alpha", { menu: { inMenu: true, parent: "" }, links: ["child"] }),
    p("child"),
  ];
  assert.deepStrictEqual(trail(breadcrumbs("child", pages, groups)), ["ראשי@/", "ALPHA@/alpha/", "CHILD@/child/"]);
});

test("a loop of card links ends instead of hanging", () => {
  const pages = [p("a", { links: ["b"] }), p("b", { links: ["c"] }), p("c", { links: ["a", "c"] })];
  assert.deepStrictEqual(trail(breadcrumbs("a", pages, groups)), ["ראשי@/", "B@/b/", "C@/c/", "A@/a/"]);
  assert.deepStrictEqual(trail(breadcrumbs("c", pages, groups)), ["ראשי@/", "A@/a/", "B@/b/", "C@/c/"]);
});

test("a page under a missing header, or a header that is a link, gets no dead crumb", () => {
  const pages = [p("stale", { menu: { inMenu: true, parent: "gone" } }), p("odd", { menu: { inMenu: true, parent: "remote" } })];
  assert.deepStrictEqual(trail(breadcrumbs("stale", pages, groups)), ["ראשי@/", "STALE@/stale/"]);
  assert.deepStrictEqual(trail(breadcrumbs("odd", pages, groups)), ["ראשי@/", "השתלטות מרחוק", "ODD@/odd/"]);
});

test("Google's BreadcrumbList lists only the crumbs that have a page", () => {
  const crumbs = [{ title: "ראשי", url: "/" }, { title: "מרכזיה" }, { title: "Panasonic", url: "/panasonic/" }];
  assert.deepStrictEqual(JSON.parse(breadcrumbList(crumbs, "https://tel-raz.com")), {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ראשי", item: "https://tel-raz.com/" },
      { "@type": "ListItem", position: 2, name: "Panasonic", item: "https://tel-raz.com/panasonic/" },
    ],
  });
});

// ---------- The built site ----------

const nav = ($) => $("nav.breadcrumbs");
const ld = ($) => $('script[type="application/ld+json"]').map((_, e) => JSON.parse($(e).html())).get().find((d) => d["@type"] === "BreadcrumbList");

test("home, 404 and thanks have no breadcrumbs; every other page does", () => {
  const out = buildSite("preview");
  for (const r of ["/", "/404.html", "/thanks/"]) {
    const $ = load(out, r);
    assert.strictEqual(nav($).length, 0, r);
    assert.strictEqual(ld($), undefined, r);
  }
  const pages = fs.readdirSync(path.join(__dirname, "../src/pages")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
  const urls = pages.filter((s) => !["404", "thanks"].includes(s)).map((s) => ({ guides: "/support/guides/", "service-call": "/support/service-call/" }[s] || `/${s}/`));
  for (const u of urls) {
    const $ = load(out, u);
    assert.strictEqual(nav($).length, 1, u);
    assert.ok(ld($), `${u}: BreadcrumbList`);
  }
});

test("every breadcrumb link points to a built page, and the current page is the last crumb, not a link", () => {
  const out = buildSite("preview");
  const $ = load(out, "/support/guides/");
  const items = nav($).find("li");
  assert.strictEqual(items.first().find("a").attr("href"), "/");
  const last = items.last();
  assert.strictEqual(last.find("a").length, 0);
  assert.strictEqual(last.find('[aria-current="page"]').length, 1);
  assert.strictEqual(nav($).attr("aria-label"), "פירורי לחם");
});

// Fixture pages in a throwaway copy, so these checks don't depend on the editor's content.
const fixture = (title, { inMenu = false, parent = "", links = [] } = {}) => {
  const items = links.length ? `items:\n${links.map((l) => `  - { name: כרטיס, link: ${l} }\n`).join("")}` : "items: []\n";
  return `---\nsystem: false\nsitemap: true\ntitle: ${title}\nimages: []\n${items}contactForm: false\nmenu:\n  inMenu: ${inMenu}\n  parent: "${parent}"\n  order: 99\n  title: ""\n---\nטקסט\n`;
};
const write = (dir, slug, text) => fs.writeFileSync(path.join(dir, "src/pages", `${slug}.md`), text);
const crumbs = (out, slug) => {
  const $ = cheerio.load(fs.readFileSync(path.join(out, slug, "index.html"), "utf8"));
  return nav($).find("li").map((_, li) => {
    const a = $(li).find("a");
    return a.length ? `${a.text().trim()}@${a.attr("href")}` : $(li).text().trim();
  }).get();
};

test("an orphan page gets its trail as soon as a card links to it", () => {
  let before, after;
  const orphan = (dir) => write(dir, "fx-orphan", fixture("יתום"));
  assert.ok(buildCopy(orphan, (out) => { before = crumbs(out, "fx-orphan"); }).ok);
  const r = buildCopy((dir) => { orphan(dir); write(dir, "fx-parent", fixture("הורה", { inMenu: true, parent: "pbx", links: ["fx-orphan"] })); },
    (out) => { after = crumbs(out, "fx-orphan"); });
  assert.ok(r.ok, r.output);
  assert.deepStrictEqual(before, ["ראשי@/", "יתום"]);
  assert.deepStrictEqual(after, ["ראשי@/", "שירותים", "מרכזיה", "הורה@/fx-parent/", "יתום"]);
});

test("a loop of card links builds, and both pages get a finite trail", () => {
  let a, b;
  const r = buildCopy((dir) => {
    write(dir, "fx-a", fixture("א", { links: ["fx-b"] }));
    write(dir, "fx-b", fixture("ב", { links: ["fx-a"] }));
  }, (out) => { a = crumbs(out, "fx-a"); b = crumbs(out, "fx-b"); });
  assert.ok(r.ok, r.output);
  assert.deepStrictEqual(a, ["ראשי@/", "ב@/fx-b/", "א"]);
  assert.deepStrictEqual(b, ["ראשי@/", "א@/fx-a/", "ב"]);
});

test("a page with two parents builds and goes under the deeper one", () => {
  let child;
  const r = buildCopy((dir) => {
    write(dir, "fx-shallow", fixture("רדוד", { inMenu: true, links: ["fx-child"] }));
    write(dir, "fx-deep", fixture("עמוק", { inMenu: true, parent: "pbx", links: ["fx-child"] }));
    write(dir, "fx-child", fixture("ילד"));
  }, (out) => { child = crumbs(out, "fx-child"); });
  assert.ok(r.ok, r.output);
  assert.deepStrictEqual(child, ["ראשי@/", "שירותים", "מרכזיה", "עמוק@/fx-deep/", "ילד"]);
});
