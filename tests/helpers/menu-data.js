// The menu as the real content defines it (front matter + menu groups), so
// menu tests check the rendering without pinning the editor's choices.
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { buildMenu } = require("../../lib/menu");
const { ROOT } = require("./build");

function expectedMenu(site) {
  const dir = path.join(ROOT, "src/pages");
  const groups = JSON.parse(fs.readFileSync(path.join(ROOT, "src/_data/menuGroups.json"), "utf8"));
  const routes = { guides: "/support/guides/", "service-call": "/support/service-call/", 404: "/404.html" };
  const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const fm = YAML.parse(fs.readFileSync(path.join(dir, f), "utf8").match(/^---\n([\s\S]*?)\n---/)[1]);
    const slug = f.slice(0, -3);
    return { url: routes[slug] || `/${slug}/`, title: fm.title, menu: fm.menu };
  }).filter((p) => p.menu);
  return buildMenu(groups, pages, site);
}

module.exports = { expectedMenu };
