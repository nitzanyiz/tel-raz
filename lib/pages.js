// Page links and page addresses.
// A link (from the CMS "קישור לעמוד" dropdown) stores the target page's file
// name; the build turns it into a URL and fails loudly if the page is gone,
// so a deleted page never leaves a dead card or tile on the site.
const ADDRESS = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED = ["admin", "assets", "files", "support"];

function resolvePageLink(slug, pages) {
  if (!slug) return null;
  const target = pages.find((p) => p.fileSlug === slug && p.inputPath.includes("/src/pages/"));
  if (!target) {
    throw new Error(`קישור לעמוד שלא קיים / link to a page that doesn't exist: "${slug}"`);
  }
  return target.url;
}

function invalidPageNames(names) {
  return names.filter((n) => !ADDRESS.test(n) || RESERVED.includes(n));
}

module.exports = { resolvePageLink, invalidPageNames, ADDRESS, RESERVED };
