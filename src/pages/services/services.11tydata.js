module.exports = {
  layout: "layouts/product.njk",
  permalink: (data) => `/services/${data.page.fileSlug}/`,
};
