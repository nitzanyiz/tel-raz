// CMS lab: serves the REAL admin panel (pinned Sveltia, real config.yml) with
// the in-browser "test-repo" backend, seeded with a copy of the current src/.
// No GitHub login, nothing written to the repo — saves land in the browser's
// private storage (OPFS) and can be read back from there.
//
// Usage: node .claude/skills/test-site/cms-lab.mjs [port]   (default 8820)
// Then open http://localhost:<port>/admin/ and click "Start Demo".
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const YAML = createRequire(path.join(ROOT, "package.json"))("yaml");
const port = Number(process.argv[2] || 8820);
const lab = fs.mkdtempSync(path.join(os.tmpdir(), "cms-lab-"));

// Admin page + config: real ones, backend swapped to the in-browser test repo.
fs.mkdirSync(path.join(lab, "admin"), { recursive: true });
const config = YAML.parse(fs.readFileSync(path.join(ROOT, "src/admin/config.yml"), "utf8"));
config.backend = { name: "test-repo" };
fs.writeFileSync(path.join(lab, "admin/config.yml"), YAML.stringify(config));
const html = fs.readFileSync(path.join(ROOT, "src/admin/index.html"), "utf8")
  .replace("<script", '<link rel="cms-seed-url" href="/seed/manifest.json">\n  <script');
fs.writeFileSync(path.join(lab, "admin/index.html"), html);

// Seed: a copy of src/ plus the manifest the test-repo backend reads.
fs.cpSync(path.join(ROOT, "src"), path.join(lab, "seed/src"), { recursive: true });
const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(path.join(lab, "seed/src")).map((f) => path.relative(path.join(lab, "seed"), f));
fs.writeFileSync(path.join(lab, "seed/manifest.json"), JSON.stringify({ files }));

const types = { ".html": "text/html; charset=utf-8", ".yml": "text/yaml; charset=utf-8", ".json": "application/json",
  ".md": "text/markdown; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".pdf": "application/pdf", ".js": "text/javascript" };
http.createServer((req, res) => {
  const p = path.join(lab, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, "index.html") : p;
  if (!file.startsWith(lab) || !fs.existsSync(file)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => {
  console.log(`CMS lab: http://localhost:${port}/admin/  (${files.length} seed files, lab dir ${lab})`);
});
process.on("SIGINT", () => { fs.rmSync(lab, { recursive: true, force: true }); process.exit(0); });
process.on("SIGTERM", () => { fs.rmSync(lab, { recursive: true, force: true }); process.exit(0); });
