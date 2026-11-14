// Finds internal links (href/src starting with "/") in the built HTML that
// don't resolve to a file. Run after every build: a CMS edit that moves or
// drops a page fails the build instead of shipping a dead link.
const fs = require("node:fs");
const path = require("node:path");

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".html"))
    .map((e) => path.join(e.parentPath ?? e.path, e.name));
}

function resolves(outDir, url) {
  const clean = url.split(/[?#]/)[0];
  let p;
  try { p = decodeURIComponent(clean); } catch { return false; }
  const file = path.join(outDir, p);
  if (p.endsWith("/")) return fs.existsSync(path.join(file, "index.html"));
  return fs.existsSync(file) && fs.statSync(file).isFile();
}

function findBrokenLinks(outDir) {
  const broken = [];
  for (const file of htmlFiles(outDir)) {
    const html = fs.readFileSync(file, "utf8");
    for (const [, url] of html.matchAll(/\s(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
      if (!resolves(outDir, url)) broken.push(`${path.relative(outDir, file)} → ${url}`);
    }
  }
  return [...new Set(broken)].sort();
}

module.exports = { findBrokenLinks };
