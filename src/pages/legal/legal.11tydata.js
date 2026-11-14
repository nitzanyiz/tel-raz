module.exports = {
  layout: "layouts/page.njk",
  permalink: (data) => `/${data.page.fileSlug}/`,
};
