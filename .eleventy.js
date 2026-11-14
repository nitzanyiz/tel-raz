const fs = require("node:fs");
const { isProduction, subjectPrefix } = require("./lib/env");
const { buildMenu } = require("./lib/menu");
const { localBusiness, filled } = require("./lib/seo");
const { findBrokenLinks } = require("./lib/check-links");
const { encodeFilePath } = require("./lib/urls");

function readJson(file, fallback = {}) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

module.exports = function (eleventyConfig) {
  ["src/assets", "src/files", "src/favicon.ico", "src/admin", "src/_redirects"].forEach((p) =>
    eleventyConfig.addPassthroughCopy(p)
  );

  eleventyConfig.addGlobalData("env", { isProduction: isProduction(), subjectPrefix: subjectPrefix() });
  eleventyConfig.addGlobalData("site", () =>
    readJson(process.env.SITE_DATA_FILE || "src/content/site.json")
  );
  eleventyConfig.addGlobalData("home", () => readJson("src/content/home.json"));
  eleventyConfig.addGlobalData("downloads", () => readJson("src/content/downloads.json", { items: [] }));

  eleventyConfig.addGlobalData("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("filled", filled);
  eleventyConfig.addFilter("localBusiness", localBusiness);
  eleventyConfig.addFilter("encodeFilePath", encodeFilePath);

  eleventyConfig.addCollection("menuPages", (api) => api.getAll().filter((item) => item.data.menu));
  eleventyConfig.addFilter("buildMenu", (items, groups, site) =>
    buildMenu(
      groups,
      items.map((item) => ({ url: item.url, title: item.data.title, menu: item.data.menu })),
      site
    )
  );

  // Fail the build on dead internal links (e.g. a CMS save that moved a page),
  // so a broken preview never reaches the publish button.
  eleventyConfig.on("eleventy.after", ({ directories }) => {
    const broken = findBrokenLinks(directories.output);
    if (broken.length) throw new Error(`Broken internal links:\n  ${broken.join("\n  ")}`);
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
};
