// Builds the site menu tree from developer-defined groups (src/_data/menuGroups.json)
// and pages that declare `menu: { inMenu, parent?, order, title? }` in their
// front matter (editable per page in the CMS). parent "" means the top level.
// Links without a URL and groups left without children are dropped, so an
// empty settings field or a removed page never leaves a dead menu entry.
const { filled } = require("./seo");

const inMenu = (p) => Boolean(p.menu) && p.menu.inMenu !== false;
// An empty position (the editor left the field blank) goes last, not first.
const position = (n) => (typeof n.order === "number" ? n.order : Infinity);
const parentOf = (p) => p.menu.parent || undefined;

function buildMenu(groups, pages, site = {}) {
  const nodes = [
    ...groups.map((g) => ({
      key: g.key,
      title: g.title,
      parent: g.parent,
      order: g.order,
      url: g.urlFromSite ? (filled(site[g.urlFromSite]) ? site[g.urlFromSite].trim() : "") : g.url,
      external: Boolean(g.external),
      isGroup: !g.urlFromSite && !g.url,
    })),
    ...pages.filter(inMenu).map((p) => ({
      key: p.url,
      title: p.menu.title || p.title,
      parent: parentOf(p),
      order: p.menu.order,
      url: p.url,
      external: false,
      isGroup: false,
    })),
  ];

  const childrenOf = (parentKey) =>
    nodes
      .filter((n) => n.parent === parentKey)
      .sort((a, b) => position(a) - position(b))
      .map((n) => ({ key: n.key, title: n.title, url: n.url, external: n.external, isGroup: n.isGroup, children: childrenOf(n.key) }))
      .filter((n) => (n.isGroup ? n.children.length > 0 : Boolean(n.url)))
      .map(({ isGroup, ...n }) => (isGroup ? { ...n, url: undefined } : n));

  return childrenOf(undefined);
}

// Pages placed under a header that doesn't exist (e.g. a stale key): they're
// left out of the menu; the build reports them as a warning.
function orphanMenuPages(groups, pages) {
  const keys = new Set(groups.map((g) => g.key));
  return pages.filter(inMenu).filter((p) => parentOf(p) && !keys.has(parentOf(p))).map((p) => p.url);
}

module.exports = { buildMenu, orphanMenuPages };
