// Routing for the pages in src/pages/ (developer-owned, not editable in the CMS).
// Default: /<file-name>/ with the plain page layout. Pages that differ have a
// <file-name>.11tydata.json next to them; subfolders have their own data files.
module.exports = {
  layout: "layouts/page.njk",
  permalink: (data) => `/${data.page.fileSlug}/`,
};
