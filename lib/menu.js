// Builds the site menu tree from developer-defined groups (src/_data/menuGroups.json)
// and pages that declare `menu: { parent?, order }` in their front matter.
// Links without a URL and groups left without children are dropped, so an
// empty settings field or a removed page never leaves a dead menu entry.
const { filled } = require("./seo");

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
    ...pages.map((p) => ({
      key: p.url,
      title: p.menu.title || p.title,
      parent: p.menu.parent,
      order: p.menu.order,
      url: p.url,
      external: false,
      isGroup: false,
    })),
  ];

  const childrenOf = (parentKey) =>
    nodes
      .filter((n) => n.parent === parentKey)
      .sort((a, b) => a.order - b.order)
      .map((n) => ({ key: n.key, title: n.title, url: n.url, external: n.external, isGroup: n.isGroup, children: childrenOf(n.key) }))
      .filter((n) => (n.isGroup ? n.children.length > 0 : Boolean(n.url)))
      .map(({ isGroup, ...n }) => (isGroup ? { ...n, url: undefined } : n));

  return childrenOf(undefined);
}

module.exports = { buildMenu };
