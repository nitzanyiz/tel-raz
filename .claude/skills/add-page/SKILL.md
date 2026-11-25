---
name: add-page
description: Use when adding, removing, renaming or moving a page or menu item on the tel-raz.com site (a content page, a system page, a menu header, or an external menu link).
---

# Pages and menu on tel-raz.com

**Most of this is the editor's job now.** In the CMS (`/admin`), **עמודים** lets them add and delete content pages, set images, item cards with page links, and menu placement. Do it yourself only when they ask, when you're scripting content, or for the developer-only parts below. In every case, edit the files the same way the CMS would, so the CMS can keep editing them.

## Structure (one folder)

- Every page is `src/pages/<address>.md` and lives at `/<address>/`. The address is `^[a-z0-9]+(-[a-z0-9]+)*$`, and `admin`, `assets`, `files` and `support` are reserved (the build enforces this).
- **Content pages** have `system: false` and use `layouts/content.njk` (the default from `pages.11tydata.js`).
- **System pages** have `system: true`: guides, service-call, contact, thanks, 404, accessibility, privacy. Their layout or URL comes from `<name>.11tydata.json`. The CMS can't delete them.
- Every page has `sitemap: true|false`. `false` hides it from the sitemap, from search engines and from the "קישור לעמוד" dropdowns (as with 404 and thanks).

## Breadcrumbs

Every page except home, 404 and thanks shows a trail (`lib/breadcrumbs.js`), built from existing data, with nothing to fill in:
a page in the menu hangs under its `menu.parent` header(s); any other page hangs under the page whose item card links to it (if two pages link to it, the longer trail wins, then the first file name alphabetically); a page nobody links to shows only "ראשי › page". Headers are plain text, pages are links. To hide it on a system page, add `"noBreadcrumbs": true` to its `.11tydata.json`.

## Add a content page

Create `src/pages/<address>.md`. Keep the front-matter keys the CMS writes:

```yaml
---
system: false
sitemap: true
title: מרכזיית NS1000
intro: משפט פתיחה קצר.
images:                      # first = main image; [] for none
  - { src: /assets/uploads/ns1000.webp, alt: מרכזיית NS1000 }
imagePosition: side          # side | top | bottom
items: []                    # cards: { name, image?, text?, link?: <page file name>, linkText? }
contactForm: true
menu:
  inMenu: false              # true to show it; ALWAYS explicit (the CMS writes false by default)
  parent: ""                 # "" = top level, or a header key from src/_data/menuGroups.json
  order: 1
  title: ""                  # short menu label; empty = page title
seoTitle: ""
seoDescription: "One sentence, up to ~155 chars, in Hebrew."
---
Body in Markdown. Use ## for headings (the page already has the h1).
```

- Don't put `layout` or `permalink` in front matter, and no `{{ }}` or `{% %}` in Markdown (templating is off for Markdown).
- Mark unknown content with `[למילוי: ...]` so `scripts/placeholders.sh` lists it.
- **Link to it** from an item card or home tile with `link: <address>`. The build fails if the target doesn't exist.

## Add or change a system page (developer only)

1. Create the `.md` with `system: true`.
2. Add `<name>.11tydata.json` with its `layout` (and `permalink` if it isn't `/<name>/`).
3. Add its name to `SYSTEM_PAGES` in `tests/cms.test.js`.
4. Add the route to `ROUTES` in `tests/pages.test.js`.

## Special pages (developer only)

A page with a form of its own (today `ai-solutions` and `ipecs-cloud`) has `system: special` and a `files` entry in the `special_pages` collection of `src/admin/config.yml`, so neither the content nor the system view shows it. Don't move it into those views or give it their generic fields: a save through a generic form drops its own fields. To add another one: front matter with `system: special`, a `files` entry listing exactly its front-matter keys, its slug in `SPECIAL_PAGES` in `tests/cms.test.js`, and its route in `ROUTES` in `tests/pages.test.js`.

## Menu headers and external links (developer only)

Edit `src/_data/menuGroups.json`:
- **Header:** `{ "key": "backup", "title": "גיבוי", "parent": "services", "order": 3 }`.
- **External link:** `{ ..., "url": "https://...", "external": true }`, or `urlFromSite: "<site.json key>"` when the editor should control it. In that case also add the key to `src/content/site.json`, the `tests/fixtures/site-*.json` files, and the settings collection in `src/admin/config.yml`.

**A new or removed header must also be updated in the `menu.parent` select options** in **both** page views of `src/admin/config.yml` (`tests/cms.test.js` checks they match). Empty headers and empty links disappear from the menu automatically.

## Remove or rename a page

- **Remove:** delete the `.md`. If anything links to it (`link: <name>` in pages or `src/content/home.json`), the build fails and names it: remove or repoint those links. If it was public, add a redirect to `src/_redirects`.
- **Rename the address:**
  1. `git mv src/pages/old.md src/pages/new.md`.
  2. Fix the `link: old` references (the build lists them).
  3. Add `/old/  /new/  301` to `src/_redirects`.

## Verify

```bash
npm test
scripts/behavior-check.sh   # menu, item cards, gallery behavior
scripts/screens.sh          # screenshots in .tmp-builds/screens/
```

Commit to `master`, push, check the preview at `https://master--tel-raz.netlify.app`, then publish (Actions → פרסום האתר).
