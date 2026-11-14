---
name: add-page
description: Use when adding, removing or moving a page or menu item on the tel-raz.com site (a new service/product page, a new info page, a new menu header, or an external menu link).
---

# Add a page to tel-raz.com

The menu builds itself from page front matter plus `src/_data/menuGroups.json` (see `lib/menu.js`). Adding a page is: one Markdown file, an optional menu group, and keeping the CMS config and tests in sync.

## 1. Decide the kind of page

| Kind | Folder | Layout / URL |
|---|---|---|
| Service or product (has a "models" list and a contact form at the bottom) | `src/pages/services/` | Set by `services.11tydata.js`: `layouts/product.njk`, URL `/services/<file-name>/` |
| General page (text, optional image) | `src/pages/` | Front matter `layout: layouts/page.njk`, `permalink: /<slug>/` |
| Legal | `src/pages/legal/` | Set by `legal.11tydata.js`: URL `/<file-name>/` |

File names and slugs are English, lowercase, with dashes (`cloud-backup.md`). Never Hebrew: Hebrew URLs get percent-encoded when shared.

## 2. Create the Markdown file

Copy the closest existing page and keep **all** its front-matter keys (the CMS expects them):

```yaml
---
title: גיבוי בענן
seoTitle: ""
seoDescription: "One sentence, up to ~155 chars, in Hebrew."
intro: משפט פתיחה קצר.
image: ""
imageAlt: ""
models: []                 # services only
layout: layouts/page.njk   # general pages only
permalink: /cloud-backup/  # general pages only
menu:
  parent: cloud-pbx        # a key from src/_data/menuGroups.json; omit `parent` for the top bar
  order: 3                 # position among its siblings
---
Body in Markdown. Use `##` for section headings (the page already has the h1).
Mark unknown content with [למילוי: ...] so scripts/placeholders.sh lists it.
```

- No `menu` key = the page exists but isn't in the menu (like `/thanks/`).
- Don't put `{{ }}` or `{% %}` in Markdown; templating is off for Markdown.
- Pages that shouldn't be in the sitemap get `sitemap: false`.

## 3. Menu groups (only if needed)

Edit `src/_data/menuGroups.json`:
- **New header** (a dropdown with no page of its own): `{ "key": "backup", "title": "גיבוי", "parent": "services", "order": 3 }`. Top-level headers have no `parent` and open a full-width panel. Second-level headers become a titled column in the panel.
- **External link:** `{ "key": "x", "title": "...", "parent": "support", "order": 4, "url": "https://..." , "external": true }`. Use `urlFromSite: "<site.json key>"` instead of `url` when the editor should control the link, and add that key to `src/content/site.json`, `tests/fixtures/site-empty.json`, `tests/fixtures/site-address.json` and the `settings` collection in `src/admin/config.yml`.
- Headers with no children and links with empty URLs disappear automatically.

## 4. Keep the CMS and tests in sync

- `src/admin/config.yml`: the page's folder collection must have a field for **every** front-matter key (`tests/cms.test.js` enforces this). Developer-only keys (`menu`, `layout`, `permalink`, `sitemap`) are `widget: hidden`. A new subfolder needs its own collection (`create: false`, `delete: false`).
- `tests/pages.test.js`: add the new URL to `ROUTES`. If it's a service page, the home tiles test expects one tile per service URL. Add a tile to `src/content/home.json` (with its `url`), or adjust the test.
- If the page changes the menu's top level, update `tests/layout.test.js` "menu order".

## 5. Verify

```bash
npm test
scripts/screens.sh      # look at the open-menu screenshots in .tmp-builds/screens/
npm start               # click through the menu at desktop and phone widths
```

Commit to `master`, push, check the preview (`https://master--tel-raz.netlify.app`), then publish (Actions → פרסום האתר, or `git push origin master:production`).

## Removing a page

Delete the `.md` file and remove its URL from `tests/pages.test.js` (and its home tile, if it's a service). The menu entry disappears on its own, and so does its header if it was the last child. If the URL was public, consider adding a redirect to `src/_redirects` (`/old/  /new/  301`).
