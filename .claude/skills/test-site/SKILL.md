---
name: test-site
description: Use when verifying a change to the tel-raz.com site or its CMS (Sveltia admin panel) — templates, CSS/JS, page features, src/admin/config.yml, content structure — or when asked "does this work?", before pushing, or after a Sveltia upgrade.
---

# Testing the tel-raz site and its CMS

Every change is verified at the level the user experiences it: **built HTML → real browser → real CMS → preview**. Each layer below has a tool in this repo; use the ones the change touches, in this order.

## The ladder

| # | Layer | Tool | Catches |
|---|---|---|---|
| 1 | Built site | `npm test` (node:test + cheerio over real builds) | markup, routes, forms, SEO, menu, CMS-config/content consistency |
| 2 | Behavior | `bash scripts/behavior-check.sh <port>` (headless Chrome, throwaway copy with a fixture gallery page) | menu hover/keyboard/mobile, gallery, full screen, card links |
| 3 | Visual | `bash scripts/screens.sh` → `.tmp-builds/screens/*.png`, **look at them** (they show only the *real* content; a feature no page uses yet needs layer 4 with temporary content) | layout, overflow, 390/1000/1280px |
| 4 | Real browser | Playwright MCP against `npx eleventy --serve --port=8080` | hover, timing, swipe, anything 2–3 can't drive |
| 5 | **CMS** | **CMS lab** (below) | what the editor can do and what a save writes |
| 6 | Preview | push to `master` → `https://master--tel-raz.netlify.app` (curl / Playwright) | the real Netlify build |

## Writing tests (layer 1)

- **Never pin editor content.** The editor changes pages, cards, tiles and the menu, so a test that asserts today's Panasonic models or menu order goes red for no reason.
  - For behavior, use **fixture pages** in a throwaway copy: `buildCopy(mutate, inspect)` from `tests/helpers/build-copy.js`.
  - For settings variants, use fixture data (`SITE_DATA_FILE=tests/fixtures/site-*.json`).
  - Or compute the expected result from the content (`tests/helpers/menu-data.js`).
- **Builds that should fail:** `buildCopy(...)` returns `{ ok, output }`. Assert `ok === false` and that the output names the culprit.
- **Write the test first and watch it fail** for the right reason before implementing.

## Real browser (layer 4)

- **Temporary content:** to see a feature the real content doesn't use yet (a linked card, a 3-image gallery), add a temporary page or edit locally, check it, then **remove or `git checkout --` it before committing**. Back up first if you're editing an existing page.
- **Screenshots:** Playwright MCP saves under `.playwright-mcp/` (it's gitignored). Read them, then delete them.
- **Headless Chrome quirks** (`behavior-check`, `screens`):
  - the minimum window width is 500px, so the scripts render inside an exact-size iframe;
  - virtual time doesn't run CSS transitions or `setTimeout`-based timing reliably, so verify timing in Playwright instead;
  - give harness pages `<meta charset="utf-8">`, or Hebrew assertions fail.

## CMS lab (layer 5)

This runs the **real admin panel** (the pinned Sveltia version and the real `config.yml`) with Sveltia's in-browser `test-repo` backend, seeded with a copy of the current `src/`. There's no GitHub login and no folder picker, and nothing is written to the repo. Saves go into the browser's private storage (OPFS), where you read them back.

```bash
node .claude/skills/test-site/cms-lab.mjs 8820     # run in background; prints the URL
```

**1. Start fresh (Playwright MCP, `browser_run_code_unsafe`):**

```js
async (page) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:8820/admin/');
  await page.evaluate(async () => {            // wipe the previous run, so each run starts from the seed
    const r = await navigator.storage.getDirectory();
    for await (const [n] of r.entries()) await r.removeEntry(n, { recursive: true });
    localStorage.clear(); for (const d of await indexedDB.databases()) indexedDB.deleteDatabase(d.name);
  });
  await page.reload(); await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Start Demo' }).click(); await page.waitForTimeout(3500);
  const gs = page.getByRole('button', { name: 'Get Started' });
  if (await gs.isVisible().catch(() => false)) await gs.click();
}
```

**2. Read what a save wrote:**

```js
const read = (p) => page.evaluate(async (p) => {
  let d = await (await navigator.storage.getDirectory()).getDirectoryHandle('sveltia-cms-test');
  const parts = p.split('/'); const name = parts.pop();
  for (const part of parts) d = await d.getDirectoryHandle(part);
  try { return await (await (await d.getFileHandle(name)).getFile()).text(); } catch { return null; }
}, p);
// read('src/pages/panasonic.md'), read('src/content/site.json')
```

**3. Drive it:**
- **URLs:**
  - list: `#/collections/pages`
  - new page: `#/collections/pages/new`
  - edit: `#/collections/<collection>/entries/<file-name>`
  - settings: `#/collections/settings/entries/site`
- **Saving and creating:**
  - Save is `getByRole('button', { name: 'Save' })`. After a save that succeeds, the page title changes from "Creating…/<entry>" to the collection.
  - On a new page, the **address ("Slug") input is the last visible input**, in the right-hand panel.
- **Relation dropdowns:** click the `(None)` text, then `getByRole('option', { name: '<title>' })`.
- **A "Restore Draft" dialog** appears after an unsaved attempt. Click **Discard**.
- **Locked or disabled actions:** select a row's checkbox, then check `getByRole('button', { name: 'Delete' }).isDisabled()`.

**4. Judge a save by values, not by text.** Sveltia **always rewrites** the front matter: quote style, key order, blank lines. A `git diff`-style "no churn" expectation is wrong. Parse the YAML before and after (the `yaml` package) and compare: **only the intended keys may change**, and the body must be identical. Check the hidden keys (`system`, `sitemap`, `menu.inMenu`) and any default the save adds (for example `images: []`, `contactForm: true`) against how the templates read them.

**5. Close the loop.** To prove the site builds from what the CMS wrote, copy the saved file into a `buildCopy` (`mutate` writes the saved text into `src/...`) and assert `ok`, or assert the expected failure.

**What to cover for a CMS change:**
- the config loads with no console errors;
- the field is present and labelled;
- invalid input is refused (`pattern`);
- saving an **existing** page changes only that field;
- creating a page writes the right defaults;
- deletes are allowed or blocked as designed;
- relation dropdowns list the right pages and store the file name.

**Config gotchas** (Sveltia validates strictly, and an error blanks the whole admin panel):
- a relation `filters` field must also be declared in the **target** collection;
- the slug uses the object form, `slug: { editable: [create], pattern, hint }`;
- a boolean inside an object writes its `default` on every save.

Kill the lab when done (`TaskStop`). Its temp dir removes itself.

## Preview (layer 6)

After pushing, poll until the new build is live. For example, `curl` a page and grep for a marker from your change, every 10s.
- A failed Netlify build leaves the **old** preview up; that's not a pass.
- Check the critical URLs: `/`, a content page, `/admin/`, `/support/guides/`, and an old file link.
- **Don't** run "פרסום האתר" (production) unless asked.

## Common mistakes

| Mistake | Instead |
|---|---|
| Adding `local_backend` or editing `config.yml` to test the CMS | Use the CMS lab; it never touches the repo |
| Using the "Work with Local Repository" folder picker | Agents can't drive the OS picker. Use the lab |
| Expecting a CMS save to leave formatting alone | Compare parsed values |
| Asserting today's content in tests | Fixtures, `buildCopy`, or expectations computed from content |
| Treating headless timing results as truth | Confirm in Playwright with real waits |
| Leaving fixture pages or edits in `src/` | Revert before committing (`git status` must be clean of them) |
| Calling it verified because `npm test` passed | Run the layers the change touches, including the browser and the CMS lab |
