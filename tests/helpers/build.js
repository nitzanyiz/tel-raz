// Builds the site into .tmp-builds/<name> (once per name per test process)
// and loads built pages with cheerio.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const cheerio = require("cheerio");

const ROOT = path.resolve(__dirname, "../..");
const built = new Map();

const BUILDS = {
  preview: {},
  prod: { CONTEXT: "production" },
  empty: { SITE_DATA_FILE: "tests/fixtures/site-empty.json" },
};

function buildSite(name, env = BUILDS[name] || {}) {
  if (built.has(name)) return built.get(name);
  const out = path.join(ROOT, ".tmp-builds", name);
  fs.rmSync(out, { recursive: true, force: true });
  const childEnv = { ...process.env, ...env };
  if (!("CONTEXT" in env)) delete childEnv.CONTEXT;
  execFileSync(
    path.join(ROOT, "node_modules/.bin/eleventy"),
    [`--output=${out}`, "--quiet"],
    { cwd: ROOT, env: childEnv, stdio: "pipe" }
  );
  built.set(name, out);
  return out;
}

function fileFor(dir, urlPath) {
  const p = decodeURIComponent(urlPath);
  return path.join(dir, p.endsWith("/") ? p + "index.html" : p);
}

function load(dir, urlPath) {
  return cheerio.load(fs.readFileSync(fileFor(dir, urlPath), "utf8"));
}

module.exports = { buildSite, load, fileFor, ROOT };
