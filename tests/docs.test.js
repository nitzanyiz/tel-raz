const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./helpers/build");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("all documentation files exist", () => {
  for (const f of [
    "docs/מדריך-ניהול-האתר.md",
    "docs/מדריך-google-search-console.md",
    "docs/מדריך-google-business-profile.md",
    "docs/developer-setup.md",
    "README.md",
    ".claude/skills/add-page/SKILL.md",
  ]) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test("editor guide covers login, publishing and the fill-in checklist", () => {
  const guide = read("docs/מדריך-ניהול-האתר.md");
  for (const heading of ["כניסה לממשק הניהול", "פרסום", "רשימת מילוי לפני השקה", "משהו השתבש"]) {
    assert.ok(guide.includes(heading), heading);
  }
});

test("editor checklist lists every [למילוי] placeholder file", () => {
  const guide = read("docs/מדריך-ניהול-האתר.md");
  const out = require("node:child_process").execFileSync(path.join(ROOT, "scripts/placeholders.sh"), { cwd: ROOT }).toString();
  const files = [...new Set(out.trim().split("\n").map((l) => l.split(":")[0]))];
  assert.ok(files.length > 0);
  for (const f of files) assert.ok(guide.includes(path.basename(f, path.extname(f))), `checklist misses ${f}`);
});

test("developer setup covers launch, oauth and enabling page creation later", () => {
  const doc = read("docs/developer-setup.md");
  for (const s of ["Launch checklist", "https://api.netlify.com/auth/done", "Enabling page creation for the editor (later)", "production"]) {
    assert.ok(doc.includes(s), s);
  }
});

test("add-page skill has frontmatter name", () => {
  assert.match(read(".claude/skills/add-page/SKILL.md"), /^---\nname: add-page\ndescription: .+\n---/);
});

test("editor guide covers the page features and the current admin sections", () => {
  const guide = read("docs/מדריך-ניהול-האתר.md");
  for (const s of ["פעם ראשונה", "הוספת עמוד חדש", "מחיקת עמוד", "קישור לעמוד", "מיקום התמונות", "הצגת עמוד בתפריט", "עמודי מערכת", "master--tel-raz.netlify.app/admin"]) {
    assert.ok(guide.includes(s), s);
  }
  for (const gone of ["שירותים ומוצרים", "מסמכים משפטיים", "הוספת עמודים חדשים ושינוי התפריט נעשים על ידי המפתח"]) {
    assert.ok(!guide.includes(gone), `outdated: ${gone}`);
  }
});

test("developer docs and the add-page skill describe the flat page structure", () => {
  const dev = read("docs/developer-setup.md"), skill = read(".claude/skills/add-page/SKILL.md");
  for (const doc of [dev, skill]) {
    assert.ok(!doc.includes("src/pages/services"), "old services folder");
    assert.ok(!doc.includes("src/pages/legal"), "old legal folder");
  }
  for (const s of ["system: true", "_redirects", "pageUrl"]) assert.ok(dev.includes(s), `developer-setup: ${s}`);
});
