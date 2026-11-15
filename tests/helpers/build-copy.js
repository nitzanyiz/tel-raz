// Builds a throwaway copy of the site after applying `mutate(dir)`, to test
// that the build fails (or passes) for content an editor could create.
// `inspect(outDir)` (optional) runs on the built site before it's deleted.
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ROOT } = require("./build");

function buildCopy(mutate, inspect) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "site-copy-"));
  for (const p of ["src", "lib", ".eleventy.js", "package.json"]) fs.cpSync(path.join(ROOT, p), path.join(dir, p), { recursive: true });
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"));
  mutate(dir);
  const env = { ...process.env };
  delete env.CONTEXT;
  const r = spawnSync(path.join(ROOT, "node_modules/.bin/eleventy"), ["--quiet"], { cwd: dir, env, encoding: "utf8" });
  try {
    if (inspect && r.status === 0) inspect(path.join(dir, "_site"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return { ok: r.status === 0, output: `${r.stdout}\n${r.stderr}` };
}

module.exports = { buildCopy };
