const fs = require("node:fs");
const { isProduction, subjectPrefix } = require("./lib/env");
const { buildMenu, orphanMenuPages } = require("./lib/menu");
const { localBusiness, filled } = require("./lib/seo");
const { findBrokenLinks } = require("./lib/check-links");
const { encodeFilePath } = require("./lib/urls");
const { resolvePageLink, invalidPageNames } = require("./lib/pages");

function readJson(file, fallback = {}) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

module.exports = function (eleventyConfig) {
  ["src/assets", "src/files", "src/favicon.ico", "src/admin", "src/_redirects"].forEach((p) =>
    eleventyConfig.addPassthroughCopy(p)
  );
  // The CMS page is copied as-is, not rendered as a site page (keeps it out of the sitemap).
  eleventyConfig.ignores.add("src/admin/**");

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

  // "קישור לעמוד" values are page file names: {{ item.link | pageUrl(collections.all) }}
  eleventyConfig.addFilter("pageUrl", (slug, all) =>
    resolvePageLink(slug, all.map((p) => ({ fileSlug: p.page.fileSlug, url: p.url, inputPath: p.inputPath })))
  );

  // Every page's file name is its address: refuse invalid or reserved ones
  // (e.g. a page called "admin" would shadow the CMS).
  eleventyConfig.on("eleventy.before", ({ directories }) => {
    const dir = `${directories.input}pages`;
    const names = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
    const bad = invalidPageNames(names);
    if (bad.length) throw new Error(`כתובת עמוד לא חוקית / invalid page address: ${bad.join(", ")} (src/pages/)`);
  });

  eleventyConfig.addCollection("menuPages", (api) => api.getAll().filter((item) => item.data.menu));
  eleventyConfig.addFilter("buildMenu", (items, groups, site) => {
    const pages = items.map((item) => ({ url: item.url, title: item.data.title, menu: item.data.menu }));
    const orphans = orphanMenuPages(groups, pages);
    if (orphans.length) console.warn(`[menu] pages under a missing header (left out of the menu): ${orphans.join(", ")}`);
    return buildMenu(groups, pages, site);
  });

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
