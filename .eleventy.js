const fs = require("node:fs");
const { isProduction, subjectPrefix } = require("./lib/env");

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

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
