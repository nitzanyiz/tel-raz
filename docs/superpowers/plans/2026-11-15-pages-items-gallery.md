# Pages, Linked Items and Image Gallery: Design and Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline, as last time). Steps use `- [ ]`.
> Written outside the repo; on "go" it's copied to `docs/superpowers/plans/2026-11-15-pages-items-gallery.md` and committed first.

**Goal:** Let the editor add and delete pages, link item cards to any page with a floating hover card, and show several images per page as a gallery with full-screen view.

**Architecture:**
- **One folder.** All pages live flat in `src/pages/*.md`, at the address `/<file-name>/`, with explicit overrides for a few system pages.
- **Two filtered admin sections over that folder.** "עמודים" is for content pages: add and delete allowed. "עמודי מערכת" is filtered on a hidden `system: true` key: text and menu only, no add or delete. A third, hidden section lists every page and feeds the "קישור לעמוד" dropdowns.
- **Links resolve at build time.** A dropdown stores the target's **file name**. The build turns it into a URL and **fails loudly** if the page no longer exists.

**Tech:** Eleventy 3, Nunjucks, vanilla JS (gallery and full-screen view via `<dialog>`), and Sveltia CMS. Its relation, select, list, boolean and hidden widgets, plus the slug template, are verified against the pinned version in Task 1.

## Decisions (from the 2026-11-15 grilling)

| # | Decision |
|---|---|
| 1 | Keep the per-page **items list** (name, image, short text) and add an optional **"קישור לעמוד"** dropdown listing **any page**. The card shows the item's own content. There's no "product" page type: a product page is just a page. |
| 2 | **Linked** card: the whole card is clickable, with a link text at the bottom: the item's optional **"טקסט הקישור"** field (for example "לצפייה במוצר"), or **"לפרטים נוספים"** if it's empty, followed by ←. On hover it **floats**: grey turns to white, it rises about 4px and gets a soft shadow, with a ~0.25s transition that's off under `prefers-reduced-motion`. **Unlinked** card: plain, no hover effect. **No label** field. **An item without an image** shows a **placeholder**: the logo's rings symbol in soft grey, centered in the grey frame (`src/assets/img/placeholder.svg` or `.webp`, made from the logo), so it never looks broken. |
| 3 | The editor can **add and delete** content pages. **System pages** (מדריכים, טופס קריאת שירות, צור קשר, תודה, 404, הצהרת נגישות, מדיניות פרטיות) can't be deleted and their address can't change, but their **text and menu placement are editable**. |
| 4 | **One** "עמודים" section and one add button. **Flat addresses** `/<english-name>/`. The 6 service pages move from `/services/x/` to `/x/` (the site isn't launched, so no redirects are needed). |
| 5 | The **address is fixed at creation** (option A). The title, menu label and SEO are freely editable. Links store the file name, so title changes never break them. |
| 6 | **Menu settings per page (optional):** in menu yes/no, header dropdown (existing headers or top level), position, short label. **Header editing is deferred.** |
| 7 | The **home tiles** get the same "קישור לעמוד" dropdown instead of fixed URLs. |
| 8 | **Images:** a page's image becomes a **list**, each with alt text. Display: **main image plus thumbnails**; a click opens **full screen** (arrows, swipe, Esc/✕); phones can swipe the main image. **A single image looks as it does today**: no thumbnails, still opens full screen. |
| 9 | **Image position per page:** **"בצד"** (default: gallery on the left, text on the right, stacked on mobile), **"למעלה"**, or **"למטה"** (after the text, before the items and contact form). |
| 10 | **Mixed image shapes:** fixed-ratio frames (main 4:3, thumbnails square, item cards 4:3) with `object-fit: contain` on a light-grey background. Nothing is ever cropped. Full screen shows the natural shape. |
| 11 | New pages have a **"show contact form at the bottom"** checkbox, on by default. The current service pages have it on and עלינו has it off. |

## Global Constraints
- Everything from the first plan still holds: RTL Hebrew, theme tokens, no hard-coded business details, WCAG AA, vanilla JS, Markdown not run through Nunjucks, and `npm test` plus `scripts/behavior-check.sh` green.
- **Address names:** `^[a-z0-9]+(-[a-z0-9]+)*$`, excluding the reserved `admin|assets|files|support`. Enforced in the CMS (pattern) **and** by a build check.
- Any **build failure** names the file and the reason in Hebrew and English. The preview fails; the live site is never affected.
- **Old URLs** under `/services/` aren't redirected (pre-launch).

## Review Focus
1. **The editor deletes a page that's still linked** from an item, tile or menu. The preview build must fail with a message naming the page. Pinned by the `pageUrl` unit test and a fixture build (Task 2).
2. **The editor creates an address that clashes** (`contact`, `admin`, an existing page). The CMS pattern rejects reserved names, and Eleventy's duplicate-permalink error catches the rest. Pinned by `reserved slug` tests (Task 2).
3. **A CMS save drops the hidden `system` flag.** The system page would then show up in "עמודים" and become deletable. Pinned by the cms test that system pages carry `system: true` and that the field is hidden in both views (Task 4), plus the manual CMS round-trip.
4. **Galleries with 1 image, many images, or mixed shapes,** on mobile and desktop; keyboard use of the thumbnails and the full-screen view. Pinned by behavior-check additions (Task 6) and the screenshots.
5. **A page hidden from the menu that still had a header,** or an item with no image. No empty menu entries, and the card shows a neutral placeholder frame. Pinned by menu and items tests (Tasks 3 and 5).

---

### Task 1: Verify CMS capabilities (spike, no product code)
Load the pinned Sveltia (0.262.4) in local mode on a scratch copy of `config.yml` and confirm, with a decision recorded in the ledger for each:
- **(a)** two `folder` collections on the same folder with `filter: {field: system, value: true}` / `{field: system, value: false}` (or the `pattern` filter);
- **(b)** a hidden third collection (`hide: true`) used as a relation source;
- **(c)** `relation` with `value_field: "{{slug}}"`, `display_fields: ["{{title}}"]`, `search_fields: [title]`;
- **(d)** the slug template for user-typed addresses. Prefer `slug: "{{fields._slug}}"` if supported; otherwise an `address` string field plus `slug: "{{fields.address}}"`, and a build check that `address === fileSlug`;
- **(e)** a `hidden` field with a `default` keeps existing values on save.

**If something isn't supported:** upgrade Sveltia to the newest version that is at least 2 weeks old and re-check. If a capability still fails, fall back:
- **(a)** without filters, use two folders (`pages/` and `pages/system/`) and limit the dropdown to content pages plus a fixed list of the three linkable system pages;
- **(b)** without the hidden collection, use the same fallback as (a).

Record the outcome; Tasks 2–4 follow it.

### Task 2: Flat pages, routing and link resolution
**Files:**
- `git mv` the 6 service pages and the 2 legal pages into `src/pages/`; delete `services.11tydata.js` and `legal.11tydata.js`.
- `src/pages/pages.11tydata.js`: default `layout: layouts/content.njk`, permalink `/<fileSlug>/`.
- Per-page `.11tydata.json` for the system pages: guides `/support/guides/`, service-call `/support/service-call/`, contact, thanks, 404, accessibility, privacy; layouts as today; `system: true`.
- `lib/pages.js`: `resolvePageLink(slug, pages) → url`. It **throws** `Error('קישור לעמוד שלא קיים: "<slug>" (in <file>)')` when the slug is missing, and returns `null` for an empty value.
- `.eleventy.js`: the `pageUrl` filter; a `reservedSlugs` build check.
- Update `tests/pages.test.js` ROUTES.

**Tests (written first):**
- `resolvePageLink` returns `/ns1000/` for `ns1000`, `null` for `""`, and throws on `"missing"`.
- A build with a fixture page linking to a missing slug **fails**, and its output contains the slug.
- A reserved address (`admin.md` fixture) fails the build.
- All routes exist at their new flat URLs: `/panasonic/` … `/call-center/`, `/about/`, the system URLs unchanged, and `/services/panasonic/` **absent**.
- The sitemap lists the flat URLs.

### Task 3: Menu settings per page
**Files:**
- `lib/menu.js`: include a page only if `menu && menu.inMenu !== false`. The label is `menu.title || title`. `parent: ""` or missing means top level.
- Migrate front matter: `menu: { inMenu: true, title, parent, order }` on today's menu pages.

**Tests:**
- `inMenu: false` excludes the page.
- `parent: ""` puts it at top level.
- A page whose parent key doesn't exist is **excluded and reported** as a build warning, not a crash. (Header editing comes later, so a stale key is possible only by hand-editing.)
- The existing menu-order tests still pass.

### Task 4: CMS configuration
**`src/admin/config.yml`**, per the Task 1 outcome:
- **`pages` ("עמודים"):** filter `system != true`, `create: true`, `delete: true`, slug template, and these fields:
  - `title`
  - the address (on create; label "נקבע ביצירת העמוד ולא ניתן לשינוי"; pattern above)
  - `intro`
  - `images` (list: `src` image, `alt` string required)
  - `imagePosition` (select: בצד/side, למעלה/top, למטה/bottom; default side)
  - `body` (markdown)
  - `items` (list: `name`, `image`, `text`, `link` relation, optional; `linkText` string, optional, label "טקסט הקישור (ברירת מחדל: לפרטים נוספים)")
  - `contactForm` (boolean, default true)
  - `menu` (object: `inMenu` boolean, `parent` select with "" + `services|cloud-pbx|pbx|support` labeled in Hebrew, `order` number, `title` string)
  - `seoTitle`, `seoDescription`
  - `system` (hidden, default false)
- **`system_pages` ("עמודי מערכת"):** filter `system == true`, no create or delete. Fields: `title`, `intro`, `body`, `menu` (same object), `seoTitle`, `seoDescription`, `system` (hidden), `sitemap` (hidden).
- **`all_pages`:** hidden; the source for the relation.
- **`home.tiles[].link`:** a relation instead of the hidden `url`.

**Tests (`tests/cms.test.js`):**
- The `pages` collection has create and delete true; the `system_pages` collection has both false.
- Every system page file has `system: true`, and no content page has it.
- The relation fields point at `all_pages` with `value_field` `{{slug}}`.
- The `menu.parent` select options equal the non-link keys in `menuGroups.json`, plus "".
- The front-matter keys ⊆ the collection fields, for both views.
- The address pattern rejects `Admin`, `contact us`, `admin`, `files`, `שלום`, and accepts `ns1000`, `winter-sale`.

**Manual step:** a CMS round trip in local mode:
1. create a test page;
2. link an item to it;
3. edit a system page's text and menu placement;
4. delete the test page.

`git diff` should show only the intended changes, and the build should fail while the dangling link exists and pass once it's removed. Then revert.

### Task 5: Content layout, item cards and contact-form toggle
**Files:**
- `layouts/content.njk` replaces `product.njk`, and `page.njk` is used for content. It has a page hero, then the body arranged by `imagePosition` (gallery partial plus text), then items, then the contact form if `contactForm`.
- `partials/item-card.njk`.
- `src/assets/img/placeholder.webp`: the logo's rings symbol cropped from `logo.png`, desaturated to soft grey (~35% opacity look) on a transparent background, made with `magick`.
- Migrate front matter: `models` → `items` (no link yet), `image`/`imageAlt` → `images[]`, `imagePosition: side`, and `contactForm` (services true, about false).
- Home tiles: `url` → `link` slug.
- CSS: `.item-card` (grey, rounded, 4:3 contain frame) and `.item-card--link:hover` / `:focus-visible` (white, `translateY(-4px)`, shadow, 0.25s transition, honoring reduced motion).

**Tests:**
- A linked item renders `<a class="item-card item-card--link" href="/ns1000/">` whose link text is "לפרטים נוספים" by default, or the item's `linkText` when set.
- An unlinked item is a `div` with no `--link` class.
- An item without an image renders `<img src="/assets/img/placeholder…" alt="">` (decorative) inside the frame. The placeholder file exists in the build.
- A page with `contactForm: false` has no contact form; with `true` it has one, and `page` equals the URL.
- Home tiles link to the resolved URLs.
- All 3 `imagePosition` values put the gallery before, beside or after the text, by DOM order and class.

### Task 6: Gallery and full-screen view
**Files:**
- `partials/gallery.njk`: one image renders as a single `<button class="gallery-main">` with an `<img>`. Several images add a `.gallery-thumbs` strip of buttons with `aria-label="תמונה N מתוך M"`, `aria-current` on the active one, and a `<dialog class="lightbox">`.
- `site.js` additions:
  - a thumbnail click swaps the main image;
  - swiping on the main image goes to the next or previous image (pointer events, 40px threshold);
  - a click on the main image opens the dialog at the current index;
  - inside the dialog: ←/→ keys, arrow buttons, swipe, and Esc/✕ to close;
  - focus returns to the main image when the dialog closes.
- CSS: frames per Decision 10; on desktop the side layout is a two-column grid (gallery on the left in RTL, i.e. `order` end), stacked under 900px.

**Tests:**
- One image: no thumbs, and the dialog markup is still present.
- Three images: 3 thumbs, the first marked `aria-current`.
- Every img has a non-empty alt.

**`scripts/behavior-check.sh` additions** (real-browser timing confirmed with Playwright, as before):
- a thumb click swaps the main image `src` and `aria-current`;
- a main-image click opens the dialog;
- ArrowLeft/ArrowRight change the image;
- Esc closes the dialog and focus returns;
- the hover float on a linked card changes `transform`.
- `scripts/screens.sh` gains a gallery page at 1280, 1000 and 390px, plus the open full-screen view.

### Task 7: Docs, skill and final checks
- **Editor guide:**
  - new 4.x sections: "הוספת עמוד חדש", "מחיקת עמוד", "קישור כרטיס לעמוד", "תמונות וגלריה (מיקום: בצד/למעלה/למטה)", "הצגת עמוד בתפריט";
  - rule 6 in section 5 changes to "אי אפשר למחוק עמודי מערכת; כתובת עמוד נקבעת ביצירה";
  - the glossary gains "כתובת עמוד" and "עמודי מערכת";
  - the fill-in checklist uses the new paths;
  - a "0. התחלה – פעם ראשונה" section (GitHub account, accepting the invite, private email, authorize the app) and the temporary admin address, both agreed earlier.
- **`docs/developer-setup.md`:** the new structure, the build checks, how to rename an address (rename the file and add a `_redirects` line), and how to enable header editing later.
- **`.claude/skills/add-page/SKILL.md`:** rewrite for the flat structure. The developer usually lets the editor do it now; the skill covers system pages and headers.
- **Final:** `npm test`, behavior-check, screens and the overflow check; a fresh whole-branch review; push to `master`; verify on the preview.
