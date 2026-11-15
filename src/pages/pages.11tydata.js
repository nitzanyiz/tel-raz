// Routing for every page in src/pages/ (developer-owned, not editable in the CMS).
// A page's address is its file name: src/pages/ns1000.md → /ns1000/.
// Content pages use the content layout; system pages that differ have a
// <file-name>.11tydata.json next to them (layout and/or fixed permalink).
module.exports = {
  layout: "layouts/content.njk",
  permalink: (data) => `/${data.page.fileSlug}/`,
};
