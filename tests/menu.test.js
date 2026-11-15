const test = require("node:test");
const assert = require("node:assert");
const { buildMenu, orphanMenuPages } = require("../lib/menu");

const groups = [
  { key: "services", title: "שירותים", order: 1 },
  { key: "cloud-pbx", title: "שירותי מרכזיה בענן", parent: "services", order: 1 },
  { key: "pbx", title: "מרכזיה", parent: "services", order: 2 },
  { key: "support", title: "שירות ותמיכה", order: 3 },
  { key: "remote", title: "השתלטות מרחוק", parent: "support", order: 2, urlFromSite: "remoteSupportUrl", external: true },
];
const site = { remoteSupportUrl: "https://example.com/remote" };
const pages = [
  { url: "/about/", title: "עלינו", menu: { order: 2 } },
  { url: "/contact/", title: "צור קשר", menu: { order: 4 } },
  { url: "/services/panasonic/", title: "מרכזיית Panasonic", menu: { parent: "pbx", order: 1 } },
  { url: "/services/ipecs-cloud/", title: "iPECS Cloud", menu: { parent: "cloud-pbx", order: 1 } },
  { url: "/support/guides/", title: "מדריכים", menu: { parent: "support", order: 1 } },
];
const find = (nodes, key) => nodes.find((n) => n.key === key);

test("orders top level", () => {
  const tree = buildMenu(groups, pages, site);
  assert.deepStrictEqual(tree.map((n) => n.title), ["שירותים", "עלינו", "שירות ותמיכה", "צור קשר"]);
});

test("nests pages under groups", () => {
  const pbx = find(find(buildMenu(groups, pages, site), "services").children, "pbx");
  assert.strictEqual(pbx.children[0].url, "/services/panasonic/");
});

test("resolves urlFromSite and marks external", () => {
  const remote = find(find(buildMenu(groups, pages, site), "support").children, "remote");
  assert.strictEqual(remote.url, "https://example.com/remote");
  assert.strictEqual(remote.external, true);
  assert.deepStrictEqual(
    find(buildMenu(groups, pages, site), "support").children.map((n) => n.title),
    ["מדריכים", "השתלטות מרחוק"]
  );
});

test("drops link with empty url", () => {
  const support = find(buildMenu(groups, pages, { remoteSupportUrl: "" }), "support");
  assert.strictEqual(find(support.children, "remote"), undefined);
});

test("drops empty groups recursively", () => {
  const noCloud = pages.filter((p) => p.menu.parent !== "cloud-pbx");
  const services = find(buildMenu(groups, noCloud, site), "services");
  assert.strictEqual(find(services.children, "cloud-pbx"), undefined);

  const noServices = noCloud.filter((p) => p.menu.parent !== "pbx");
  assert.strictEqual(find(buildMenu(groups, noServices, site), "services"), undefined);
});

test("menu label comes from menu.title, not the editable page title", () => {
  const tree = buildMenu(groups, [{ url: "/about/", title: "אודות טלרז תקשורת מתקדמת בע\"מ", menu: { title: "עלינו", order: 2 } }], site);
  assert.strictEqual(find(tree, "/about/").title, "עלינו");
});

test("drops a settings link that is blank or still a placeholder", () => {
  for (const v of ["  ", "[למילוי]"]) {
    const support = find(buildMenu(groups, pages, { remoteSupportUrl: v }), "support");
    assert.strictEqual(find(support.children, "remote"), undefined, JSON.stringify(v));
  }
});

test("a page with inMenu: false is left out of the menu", () => {
  const hidden = pages.map((p) => (p.url === "/about/" ? { ...p, menu: { ...p.menu, inMenu: false } } : p));
  assert.strictEqual(find(buildMenu(groups, hidden, site), "/about/"), undefined);
});

test('parent "" puts a page at the top level', () => {
  const extra = [...pages, { url: "/sale/", title: "מבצע", menu: { inMenu: true, parent: "", order: 5 } }];
  assert.ok(find(buildMenu(groups, extra, site), "/sale/"));
});

test("a page under a header that doesn't exist is reported, not shown", () => {
  const extra = [...pages, { url: "/x/", title: "x", menu: { inMenu: true, parent: "no-such-header", order: 1 } }];
  assert.deepStrictEqual(orphanMenuPages(groups, extra), ["/x/"]);
  assert.strictEqual(JSON.stringify(buildMenu(groups, extra, site)).includes("/x/"), false);
});

test("a menu page without a position goes last, not first", () => {
  for (const order of [null, undefined]) {
    const extra = [...pages, { url: "/sale/", title: "מבצע", menu: { inMenu: true, parent: "", order } }];
    const titles = buildMenu(groups, extra, site).map((n) => n.title);
    assert.strictEqual(titles[titles.length - 1], "מבצע", String(order));
    assert.strictEqual(titles[0], "שירותים");
  }
});
