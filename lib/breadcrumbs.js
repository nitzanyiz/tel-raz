// Breadcrumb trail for a page: home › menu headers › parent pages › the page.
// Nothing is stored per page; the parent comes from what the editor already sets:
//   1. a page in the menu hangs under its menu.parent (a header, or the top level);
//   2. any other page hangs under the page whose item card links to it;
//   3. a page nobody links to hangs directly under home.
// When several pages link to the same page, the longer trail wins (that's the
// specific catalog page, not a cross-link); a tie goes to the first file name
// alphabetically, so the same content always gives the same trail.
// Menu headers have no page, so their crumbs have no url.
const HOME = { title: "ראשי", url: "/" };

const inMenu = (p) => Boolean(p.menu) && p.menu.inMenu !== false;

// pages: [{ slug, url, title, menu?, links: [slug, ...] }], groups: menuGroups.json
function breadcrumbs(slug, pages, groups) {
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const groupByKey = new Map(groups.map((g) => [g.key, g]));

  function headerCrumbs(key) {
    const crumbs = [];
    const seen = new Set();
    for (let g = groupByKey.get(key); g && !seen.has(g.key); g = groupByKey.get(g.parent)) {
      seen.add(g.key);
      crumbs.unshift({ title: g.title });
    }
    return crumbs;
  }

  // Crumbs above `page`, not counting home. `seen` is the pages already on the
  // trail, so a loop of card links stops instead of going round forever.
  function above(page, seen) {
    if (inMenu(page)) return headerCrumbs(page.menu.parent);
    const next = new Set(seen).add(page.slug);
    const parents = pages
      .filter((p) => !next.has(p.slug) && p.links.includes(page.slug))
      .map((p) => ({ slug: p.slug, trail: [...above(p, next), crumbOf(p)] }))
      .sort((a, b) => b.trail.length - a.trail.length || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    return parents.length ? parents[0].trail : [];
  }

  const page = bySlug.get(slug);
  if (!page) return [HOME];
  return [HOME, ...above(page, new Set()), crumbOf(page)];
}

function crumbOf(p) {
  return { title: (p.menu && p.menu.title) || p.title, url: p.url };
}

// Google's BreadcrumbList: only crumbs that have a page can be listed.
function breadcrumbList(crumbs, siteUrl) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs
      .filter((c) => c.url)
      .map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, item: `${siteUrl}${c.url}` })),
  });
}

module.exports = { breadcrumbs, breadcrumbList };
