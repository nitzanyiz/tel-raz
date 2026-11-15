const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { ROOT } = require("./helpers/build");

test("netlify.toml builds eleventy into _site and skips docs-only commits", () => {
  const toml = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
  assert.match(toml, /command = "npm run build"/);
  assert.match(toml, /publish = "_site"/);
  assert.match(toml, /ignore = ".*':\(exclude\)docs'.*"/);
  assert.match(toml, /NODE_VERSION = "22"/);
});

test("publish workflow is manual-only and fast-forwards production", () => {
  const wf = YAML.parse(fs.readFileSync(path.join(ROOT, ".github/workflows/publish.yml"), "utf8"));
  assert.strictEqual(wf.name, "פרסום האתר");
  assert.deepStrictEqual(Object.keys(wf.on), ["workflow_dispatch"]);
  assert.strictEqual(wf.permissions.contents, "write");
  const run = Object.values(wf.jobs).flatMap((j) => j.steps).map((s) => s.run || "").join("\n");
  assert.ok(run.includes("origin/master:refs/heads/production"), run);
  assert.ok(!/--force|-f\b|\+origin/.test(run), "must not force-push");
});

test("no manual preview deploy script (master's branch deploy is the preview)", () => {
  const { scripts } = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.strictEqual(scripts.preview, undefined);
});

test("publishing builds the site first, so a broken preview can't be published", () => {
  const wf = YAML.parse(fs.readFileSync(path.join(ROOT, ".github/workflows/publish.yml"), "utf8"));
  const steps = Object.values(wf.jobs)[0].steps.map((s) => s.run || "");
  const build = steps.findIndex((r) => /npm ci/.test(r) && /npm run build/.test(r));
  const push = steps.findIndex((r) => r.includes("refs/heads/production"));
  assert.ok(build !== -1, "no build step");
  assert.ok(build < push, "build must run before the push");
});

