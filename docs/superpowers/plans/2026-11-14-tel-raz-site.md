# Tel-Raz Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hebrew RTL static company site for טלרז תקשורת מתקדמת with a floating glass mega-menu, product/service pages, downloads, Netlify forms, a Sveltia CMS admin panel for a non-technical editor, SEO, and Hebrew guides.

**Architecture:** Eleventy 3 builds Nunjucks layouts plus Markdown pages and editor-owned JSON content into static HTML in `_site/`. The menu is assembled at build time by a small, tested function from page front matter (`menu: {parent, order}`) plus `menuGroups.json`. Editor content lives in `src/content/*.json` and `src/pages/**/*.md`, and Sveltia CMS at `/admin` edits it. Netlify deploys `production` (live) and `master` (free preview). The build flags preview builds through the `CONTEXT` env var.

**Tech Stack:** Node 22, Eleventy 3 (`@11ty/eleventy`), Nunjucks, markdown-it (bundled with Eleventy), vanilla CSS/JS, Sveltia CMS (CDN), Netlify Forms, GitHub Actions. Tests use `node:test` and `cheerio` against the built HTML.

**Spec:** `docs/superpowers/specs/2026-11-14-tel-raz-site-design.md`

## Global Constraints

- `<html lang="he" dir="rtl">` on every page. All visitor-facing and editor-facing text is in Hebrew; developer docs are in English.
- Theme tokens (exact): `--navy:#33394f; --navy-dark:#272c3f; --blue:#446ba4; --bg:#f3f5f9; --card:#ffffff; --border:#dde3ee; --text:#1c2433; --muted:#5d6779`. Font: Heebo (Google Fonts, `display=swap`).
- Primary origin is `https://tel-raz.com` for canonicals, OG, sitemap and JSON-LD.
- Production build ⇔ `process.env.CONTEXT === "production"`. Any other value, or unset, is a preview build: `noindex` meta on every page, `robots.txt` = `Disallow: /`, and form subjects prefixed `[בדיקה] `.
- No hard-coded business details in templates: phone, WhatsApp, email, address, hours, social links and the remote-support URL always come from `site` data. An empty value hides its element. An empty link is never rendered.
- Old download URLs stay exactly `/files/<original filename>` (Hebrew, spaces and parentheses included).
- Page URLs (exact): `/`, `/services/ipecs-cloud/`, `/services/ip-phones-1000i/`, `/services/panasonic/`, `/services/grandstream/`, `/services/call-transcription/`, `/services/call-center/`, `/about/`, `/support/guides/`, `/support/service-call/`, `/contact/`, `/accessibility/`, `/privacy/`, `/thanks/`, `/404.html`.
- The editor cannot create or delete pages, and cannot see `menu`, `layout` or `permalink` (hidden CMS fields). They can't see `menuGroups.json` either.
- WCAG 2.0 AA: keyboard-operable menu, visible focus, skip link, labelled form fields, alt text. No accessibility overlay widget.
- No CSS framework. JS stays small and vanilla, in one file, `src/assets/js/site.js`.
- Neutral Hebrew placeholder copy only: no factual claims such as years in business or customer counts. Fill-in slots are marked `[למילוי]`.
- Do not touch Netlify or the live site. Do not push to `production`. Work on `master`.

**Deliberate deviations from the spec's §13 layout (builder's call, same behavior):**
- Editor-owned JSON lives in `src/content/` (`site.json`, `home.json`, `downloads.json`) and is loaded with `addGlobalData`, so tests can swap `site` through the `SITE_DATA_FILE` env var.
- The menu tree is built by `lib/menu.js` instead of the Eleventy Navigation plugin. Same front-matter contract, and testable as a pure function.

## Review Focus

1. **A CMS save dropping hidden front matter** (`menu`, `layout`, `permalink`): the page would vanish from the menu or change its URL. Pinned by the route-list test (Task 6) and a manual CMS round-trip check (Task 8).
2. **Editor-uploaded files with Hebrew names, spaces or parentheses**: the download link must resolve. Pinned by the "every download href resolves to a file in `_site`" test (Task 5).
3. **Empty settings** (address, WhatsApp, social links, remote URL, email): no empty `href`, no map iframe, no empty menu item. Pinned by the empty-settings fixture build tests (Tasks 3, 4, 7).
4. **A menu group with no children** (for example, the only page under a header removed): it must not render an empty panel. Pinned by the `buildMenu` unit test (Task 3).
5. **Mid-width desktop (900–1100px) and long Hebrew labels**: the mega panel and bar must not overflow horizontally. Pinned by the screenshot check at 1000px and 390px (Task 9).

---

## File Structure

```
.eleventy.js                 config: dirs, passthrough, global data, filters, shortcodes
package.json                 scripts: start, build, test
lib/menu.js                  buildMenu(groups, pages, site) → tree (pure)
lib/env.js                   isProduction(), subjectPrefix()
tests/helpers/build.js       buildSite(name, env) → path of a built _site copy (cached per run)
tests/fixtures/site-empty.json
tests/*.test.js
src/_data/menuGroups.json   developer-only menu headers + external link
src/content/site.json        "פרטי האתר" (CMS)
src/content/home.json        "דף הבית" (CMS)
src/content/downloads.json   "קבצים להורדה" (CMS)
src/_includes/layouts/       base.njk page.njk product.njk legal.njk guides.njk service-call.njk contact.njk
src/_includes/partials/      header.njk footer.njk seo.njk contact-form.njk service-call-form.njk whatsapp.njk icons.njk
src/index.njk                home (reads home.json)
src/pages/*.md               about, guides, service-call, contact, thanks, 404
src/pages/services/*.md      6 product/service pages (+ services.11tydata.json)
src/pages/legal/*.md         accessibility, privacy (+ legal.11tydata.json)
src/assets/{css,js,img,uploads}/
src/files/                   the 8 migrated guides (+ future uploads)
src/admin/index.html, config.yml
src/robots.txt.njk, sitemap.xml.njk, _redirects
src/favicon.ico
netlify.toml
.github/workflows/publish.yml
docs/…, .claude/skills/add-page/SKILL.md, README.md
```

---

### Task 1: Scaffold Eleventy and the test harness

**Files:**
- Create: `package.json`, `.eleventy.js`, `.gitignore`, `.nvmrc` (`22`), `lib/env.js`, `tests/helpers/build.js`, `tests/smoke.test.js`, `src/_includes/layouts/base.njk` (minimal for now), `src/index.njk` (minimal)
- Move: `assets/*` → `src/assets/img/`, `favicon.ico` → `src/favicon.ico`

**Interfaces:**
- Produces: `buildSite(name: string, env?: object) => Promise<string>` (absolute output dir; builds once per `name` per test run with `npx @11ty/eleventy --output=<tmp>/<name>` and the given env merged over `process.env`). `load(dir, urlPath) => CheerioAPI`. `lib/env.js`: `isProduction(): boolean`, `subjectPrefix(): string` (`""` or `"[בדיקה] "`).
- Eleventy dirs: input `src`, includes `_includes`, data `_data`, output `_site`. Passthrough: `src/assets`, `src/files`, `src/favicon.ico`, `src/admin`, `src/_redirects`.
- Global data `env = { isProduction, subjectPrefix }`. Global data `site`, read from `process.env.SITE_DATA_FILE || "src/content/site.json"` (the file is created in Task 2; until then, guard with `{}` if it's missing).
- Scripts: `start` = `eleventy --serve`, `build` = `eleventy`, `test` = `node --test tests/`.

- [ ] **Step 1:** `npm init -y`, then `npm i -D @11ty/eleventy@3 cheerio`. Write `.gitignore` (`node_modules/`, `_site/`, `.tmp-builds/`).
- [ ] **Step 2: Write the failing test** `tests/smoke.test.js`: `test("home is Hebrew RTL")`, which builds `"preview"` and asserts `$("html").attr("lang") === "he"` and `$("html").attr("dir") === "rtl"`. Also `test("favicon and logo are copied")`: `_site/favicon.ico` and `_site/assets/img/logo.png` exist.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (no config or templates yet).
- [ ] **Step 4:** Implement `.eleventy.js`, `lib/env.js`, `tests/helpers/build.js`, a minimal `base.njk` (doctype, `lang="he" dir="rtl"`, `{{ content | safe }}`) and `src/index.njk` (layout base), and do the `git mv` of the assets.
- [ ] **Step 5:** Run `npm test`. Expected: PASS. Then run `npm run build` and confirm `_site/index.html` exists.
- [ ] **Step 6: Commit** `chore: scaffold eleventy site and test harness`

### Task 2: Content data and migrated downloads

**Files:**
- Create: `src/content/site.json`, `src/content/home.json`, `src/content/downloads.json`, `src/_data/menuGroups.json`, `tests/fixtures/site-empty.json`, `src/files/*` (8 files), `tests/data.test.js`
- Modify: `.eleventy.js`: add global data `home` and `downloads` from `src/content/`, and ignore `src/content/` as template input.

**Interfaces:**
- `site.json` keys (exact): `name` ("טלרז תקשורת מתקדמת"), `url` ("https://tel-raz.com"), `phoneDisplay` ("09-7601760"), `phoneDial` ("+97297601760"), `whatsapp` ("97297601760", digits only), `email` ("info@tel-raz.com"), `address` ("[למילוי]"), `hours` ("[למילוי]"), `social: {facebook, instagram, linkedin, youtube}` (all `""`), `remoteSupportUrl` (`""`), `footerAbout`, `seoDescription`.
- `site-empty.json`: the same keys, with every optional value `""`: `whatsapp`, `email`, `address`, `hours`, all `social.*` and `remoteSupportUrl`. `name`, `url`, `phoneDisplay` and `phoneDial` keep their values.
- `downloads.json`: `{ "items": [ { "title", "desc", "file" } ] }`, where `file` is a site path such as `/files/<name>`. Initial items are copied from `https://tel-raz.com/files.json` in that order, with `file` prefixed by `/`.
- `home.json` keys: `heroTitle`, `heroSubtitle`, `heroCtaContact`, `heroCtaCall`, `tilesTitle`, `tiles: [{title, text, image, url}]` (6 items, `url` = the 6 service URLs; the editor can't change `url`), `whyTitle`, `why: [{title, text, icon}]` (4 items, `icon` ∈ `cloud|support|shield|headset`), `customersTitle`, `customers: []` (`{name, logo}`), `contactTitle`, `contactText`.
- `menuGroups.json`: an array of `{ key, title, parent?, order, url?, urlFromSite?, external? }`, with exactly these entries:
  - `services` / שירותים / order 1
  - `cloud-pbx` / שירותי מרכזיה בענן / parent `services` / order 1
  - `pbx` / מרכזיה / parent `services` / order 2
  - `support` / שירות ותמיכה / order 3
  - `remote` / השתלטות מרחוק / parent `support` / order 2 / `urlFromSite: "remoteSupportUrl"` / `external: true`

- [ ] **Step 1: Write the failing tests** `tests/data.test.js`:
  - `test("every download file exists in src")`: for each item, `fs.existsSync("src" + decodeURI(item.file))`.
  - `test("downloads has the 8 migrated guides")`: `items.length === 8`, and `items[0].title === "מדריך מקוצר למשתמש למרכזיות Panasonic"`.
  - `test("fixture and site share keys")`: deep key sets are equal.
- [ ] **Step 2:** Run `node --test tests/data.test.js`. Expected: FAIL.
- [ ] **Step 3:** Download the 8 files read-only: `curl -fsSL "https://tel-raz.com/<encoded path>" -o "src/files/<name>"` for each entry in the live `files.json`. Write the four JSON files. Home and tile copy is neutral Hebrew placeholder text.
- [ ] **Step 4:** Run the tests. Expected: PASS. Also check `file src/files/*.pdf` reports PDF documents.
- [ ] **Step 5: Commit** `feat: add content data and migrate downloadable guides`

### Task 3: Menu builder

**Files:**
- Create: `lib/menu.js`, `tests/menu.test.js`
- Modify: `.eleventy.js` (add a `menuPages` collection and a global `menu` via computed data)

**Interfaces:**
- `buildMenu(groups: Group[], pages: {url, title, menu: {parent?, order}}[], site: object) => Node[]`.
  - `Node = { key, title, url?: string, external?: boolean, children: Node[] }`.
  - Top level = groups without a parent plus pages without `menu.parent`, sorted by `order`. Children are attached by `parent` key and sorted by `order`.
  - `urlFromSite` resolves to `site[urlFromSite]`.
  - **Dropped:** link nodes with an empty URL, and group nodes (no URL) whose children are empty after pruning, applied recursively.
- Pages opt into the menu by having `menu` in front matter. The collection is every template whose data has `menu`.
- Register `buildMenu` as a Nunjucks filter. `header.njk` (Task 4) calls `{% set tree = collections.menuPages | buildMenu(menuGroups, site) %}`; the filter maps collection items to `{url, title, menu}` from `item.url` and `item.data`.
- The groups file is named `src/_data/menuGroups.json` (instead of the spec's `menuGroups.json`), so Eleventy exposes it automatically as `menuGroups`.

- [ ] **Step 1: Write the failing tests** `tests/menu.test.js` (pure unit tests, no build):
  - `orders top level`: groups `services`(1) and `support`(3), plus pages about(`order 2`) and contact(`order 4`) → titles in order `[שירותים, עלינו, שירות ותמיכה, צור קשר]`.
  - `nests pages under groups`: a page with `parent: "pbx"` appears at `services → pbx → children[0]`.
  - `resolves urlFromSite and marks external`: `remote` gets `url === site.remoteSupportUrl` and `external === true`.
  - `drops link with empty url`: `remoteSupportUrl: ""` → no `remote` node.
  - `drops empty groups recursively`: with no pages under `cloud-pbx`, `services` has no `cloud-pbx` child. With no pages anywhere under `services`, `services` is absent.
- [ ] **Step 2:** Run `node --test tests/menu.test.js`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `lib/menu.js` and register the filter and the `menuPages` collection in `.eleventy.js`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: build menu tree from page front matter and menu groups`

### Task 4: Base layout, header (glass mega menu), footer, WhatsApp, SEO

**Files:**
- Create: `src/_includes/partials/{header,footer,seo,whatsapp,icons}.njk`, `src/assets/css/site.css`, `src/assets/js/site.js`, `src/assets/img/og.png` (1200×630, the logo centered on white with a navy bottom band; make it with `magick`), `tests/layout.test.js`
- Modify: `src/_includes/layouts/base.njk`

**Interfaces:**
- Consumes: the `buildMenu` filter, `site`, `env`, `menuGroups`, `collections.menuPages`.
- Page data used by `base.njk`: `title`, `seoTitle?`, `seoDescription?`, `image?`. `<title>` = `seoTitle or title` + ` | ` + `site.name`. On home it's just `site.name`.
- **Header markup contract:**
  - `<header class="site-header">` containing `<a class="skip-link" href="#main">דלג לתוכן</a>`, logo link `/`, and `<nav aria-label="תפריט ראשי">`.
  - For each top node with children: `<button class="nav-trigger" aria-expanded="false" aria-controls="panel-<key>">` and `<div class="mega-panel" id="panel-<key>" hidden>`, where each child group is a column with `<p class="mega-col-title">` and its links. Direct page children are collected into one untitled column placed last.
  - A top node with a URL renders a plain `<a>`.
  - External links get `target="_blank" rel="noopener"`.
  - Phone: `<a class="phone-btn" href="tel:{{site.phoneDial}}">`.
  - Mobile: `<button class="menu-toggle" aria-expanded="false" aria-controls="mobile-menu">` and a call icon link.
- **`site.js` behavior:**
  - Desktop: hover or click on a trigger opens its panel, sets `aria-expanded`, and adds `is-open` to the header (solid white). Esc or an outside click closes it.
  - Mobile: the toggle opens a full-screen menu; triggers act as accordions.
  - Adds `is-scrolled` to the header once `scrollY > 8`.
- **CSS:**
  - Glass bar: `position: sticky; top: 12px; margin-inline: 16px; border-radius: 999px; background: rgb(255 255 255 / .6); backdrop-filter: blur(16px) saturate(1.4)`, with an `@supports not (backdrop-filter: …)` fallback of `rgb(255 255 255 / .95)`.
  - Open state: solid white, and the panel is full width and opaque.
  - Active trigger: navy pill with white text.
  - Phone button: white with navy text → `--blue` with white text, `transition: .25s`.
  - Breakpoint 900px. `prefers-reduced-motion` disables transitions.
- **Footer:** navy background, with the logo (white version via the CSS `filter: brightness(0) invert(1)`), `site.footerAbout`, quick links, contact details, social icons (each only if non-empty), legal links `/accessibility/` and `/privacy/`, and `© {{ year }} {{ site.name }}`. Add a `year` shortcode/global.
- **`whatsapp.njk`:** `<a class="whatsapp-fab" href="https://wa.me/{{site.whatsapp}}" aria-label="שלחו לנו הודעה בוואטסאפ">`, only if `site.whatsapp`. Fixed bottom-left.
- **`seo.njk`:** description, canonical `site.url + page.url`, OG and Twitter tags (`og:image` = `site.url + "/assets/img/og.png"`), JSON-LD `LocalBusiness` (`name, url, telephone, email?, address?, openingHours?, sameAs: non-empty social`), and `<meta name="robots" content="noindex">` iff `!env.isProduction`.

- [ ] **Step 1: Write the failing tests** `tests/layout.test.js`, using builds `"preview"` (default env), `"prod"` (`CONTEXT=production`) and `"empty"` (`SITE_DATA_FILE=tests/fixtures/site-empty.json`), on `/`:
  - `menu order`: the `.site-header nav` top-level labels are `["שירותים","עלינו","שירות ותמיכה","צור קשר"]`. (Pages from Task 6 don't exist yet, so assert this test after Task 6; mark it `{ todo: "needs pages" }` until then and remove the todo in Task 6.)
  - `phone button`: `.phone-btn` has `href` `tel:+97297601760` and text containing `09-7601760`.
  - `noindex only on preview`: preview has `meta[name=robots][content=noindex]`; prod does not.
  - `canonical`: prod has `link[rel=canonical]` with `href` `https://tel-raz.com/`.
  - `json-ld`: the parsed `script[type="application/ld+json"]` has `@type === "LocalBusiness"` and `telephone === "+97297601760"`.
  - `empty settings hide elements`: in the empty build, there's no `.whatsapp-fab`, no `a[href^="mailto:"]`, no `a[href=""]`, and no `.social a`.
  - `skip link and landmarks`: `.skip-link[href="#main"]` and `main#main` exist.
- [ ] **Step 2:** Run `npm test`. Expected: the new tests FAIL.
- [ ] **Step 3:** Implement the partials, CSS, JS and the `base.njk` structure (`header`, `<main id="main">`, footer, WhatsApp, `site.js` with `defer`, the Heebo link and `site.css`).
- [ ] **Step 4:** Run `npm test`. Expected: PASS (except the menu-order todo).
- [ ] **Step 5: Commit** `feat: base layout with glass mega menu, footer, whatsapp and seo`

### Task 5: Forms, downloads list and system layouts

**Files:**
- Create: `src/_includes/partials/{contact-form,service-call-form}.njk`, `src/_includes/layouts/{page,guides,service-call,contact}.njk`, `tests/forms.test.js`, `tests/downloads.test.js`

**Interfaces:**
- **`contact-form.njk`:**
  - Form element: `<form name="contact" method="POST" action="/thanks/" data-netlify="true" netlify-honeypot="bot-field">`, containing hidden `form-name=contact`, hidden `subject` = `env.subjectPrefix + "פנייה חדשה מהאתר"`, and hidden `page` = `page.url`.
  - Honeypot: `<p hidden><label>אל תמלאו <input name="bot-field"></label></p>`.
  - Fields (all `required`, each with a `<label>`): `name` (שם מלא), `phone` (טלפון, `type=tel`), `company` (שם חברה).
  - Button: `<button type="submit">דברו איתנו</button>`. Privacy line linking `/privacy/`.
  - Variable `formTitle`/`formText` from the caller.
- **`service-call-form.njk`:** `name="service-call"`, same mechanics, subject `env.subjectPrefix + "טופס קריאת שירות חדש"`. Fields (all required): `company` (שם חברה), `name` (שם מלא), `phone` (מספר טלפון ישיר, tel), `mobile` (מספר טלפון סלולרי, tel), `email` (דוא"ל, email), `details` (פירוט התקלה, textarea). Button: "שליחת קריאת שירות".
- **Layouts (all extend `base.njk`):**
  - `page.njk`: `h1` title, `intro`, optional `image`/`imageAlt`, body.
  - `guides.njk`: page plus a list from `downloads.items`. Each item is `<a href="{{ item.file | url }}" download>` with a badge from the extension (PDF/DOC/XLS/other uppercase), title and desc.
  - `service-call.njk`: page plus the service-call form.
  - `contact.njk`: page plus a details list (each line only if non-empty) plus the contact form plus a map `<iframe title="מפה" loading="lazy" src="https://www.google.com/maps?q={{ site.address | urlencode }}&output=embed">`, only if `site.address` is set and doesn't contain `[למילוי]`.

- [ ] **Step 1: Write the failing tests.** These need the pages from Task 6, so create minimal stubs now: `src/pages/{guides,service-call,contact}.md`, with front matter `layout` and `permalink` from the Global Constraints and `title`.
  - `forms.test.js`, on `/support/service-call/`:
    - `form[name=service-call][data-netlify=true]` exists.
    - Its required fields are exactly `["company","name","phone","mobile","email","details"]`.
    - `input[name=subject]` value is `"[בדיקה] טופס קריאת שירות חדש"` on preview and `"טופס קריאת שירות חדש"` on prod.
    - `input[name=bot-field]` exists, and every input/textarea except hidden ones and the honeypot has an associated `label`.
  - `forms.test.js`, on `/contact/`: `form[name=contact]` has required fields `["name","phone","company"]`; on prod the subject is `"פנייה חדשה מהאתר"`. In the empty build, there's no `iframe` and no `mailto:`.
  - `downloads.test.js`, on `/support/guides/`: 8 `a[download]`, and for each, `fs.existsSync(path.join(outDir, decodeURIComponent(href)))`. Also the first link's `href` begins with `/files/`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the partials and layouts.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: netlify forms, downloads list and system page layouts`

### Task 6: All pages, home, robots, sitemap, redirects

**Files:**
- Create: `src/index.njk` (full home), `src/pages/{about,thanks,404}.md`, fill in `src/pages/{guides,service-call,contact}.md`, `src/pages/services/{ipecs-cloud,ip-phones-1000i,panasonic,grandstream,call-transcription,call-center}.md`, `src/pages/services/services.11tydata.json` (`{"layout":"product.njk","permalink":"/services/{{ page.fileSlug }}/"}`), `src/pages/legal/{accessibility,privacy}.md`, `src/pages/legal/legal.11tydata.json` (`layout: legal.njk`, `permalink: /{{ page.fileSlug }}/`), `src/_includes/layouts/{product,legal}.njk`, `src/robots.txt.njk`, `src/sitemap.xml.njk`, `src/_redirects`, `tests/pages.test.js`

**Interfaces:**
- **Front matter `menu` (exact):**
  - ipecs-cloud `{parent: cloud-pbx, order: 1}`; ip-phones-1000i `{parent: cloud-pbx, order: 2}`
  - panasonic `{parent: pbx, order: 1}`; grandstream `{parent: pbx, order: 2}`
  - call-transcription `{parent: services, order: 3}`; call-center `{parent: services, order: 4}`
  - about `{order: 2}`; guides `{parent: support, order: 1}`; service-call `{parent: support, order: 3}`; contact `{order: 4}`
- **Product front matter:** `title, seoTitle, seoDescription, intro, image, imageAlt, models: [{name, image, text}]`. Body in Markdown. Panasonic models: NS1000, NS500, HT32, טלפונים. Grandstream: טלפונים. The others get `models: []`. `product.njk` = page + a models grid (only if non-empty) + "רוצים לשמוע עוד?" + the contact form.
- **Legal pages:** a template with the sections from spec §8. The accessibility page has the slots `[למילוי]` for coordinator name/phone/email and the review date.
- **Home** (`index.njk`, from `home.json`):
  - Hero: `hero.png` background with a dark overlay, `h1` = `heroTitle`, and buttons to `/contact/` and `tel:`. The glass header overlays the hero.
  - Tiles grid, why-us grid (icons from `icons.njk`), customers strip (only if `customers.length`), and a contact strip with the contact form.
- **System pages:** `thanks.md` and `404.md` set `sitemap: false`; `404.md` has `permalink: /404.html`.
- **`robots.txt.njk`:** prod → `User-agent: *\nAllow: /\nSitemap: https://tel-raz.com/sitemap.xml`; preview → `User-agent: *\nDisallow: /`.
- **`sitemap.xml.njk`:** all HTML pages except `sitemap: false`, with absolute `site.url` URLs.
- **`_redirects`:**
  ```
  https://tel-raz.co.il/*      https://tel-raz.com/:splat  301!
  https://www.tel-raz.co.il/*  https://tel-raz.com/:splat  301!
  ```

- [ ] **Step 1: Write the failing tests** `tests/pages.test.js`:
  - `every route exists`: each URL in Global Constraints maps to an existing file in `_site` (`/x/` → `x/index.html`).
  - `one h1 per page`: for each route, `$("h1").length === 1`.
  - `services panel`: on `/`, `#panel-services .mega-col-title` texts are `["שירותי מרכזיה בענן","מרכזיה"]`, and the last column's links are `["תמלול שיחות","מוקד קול סנטר"]`. No remote link (`remoteSupportUrl` empty) appears in `#panel-support`.
  - `product models`: `/services/panasonic/` shows 4 model names, including `NS1000`.
  - `home sections`: 6 tiles linking to the 6 service URLs; no customers section while `customers` is empty; a `form[name=contact]` on the home page.
  - `robots`: prod contains `Sitemap: https://tel-raz.com/sitemap.xml`; preview contains `Disallow: /`.
  - `sitemap`: contains `https://tel-raz.com/services/panasonic/` and not `/thanks/`.
  - `redirects`: `_site/_redirects` contains both `.co.il` rules.
  - In `layout.test.js`, remove the `todo` from `menu order`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement the pages, layouts and files.
- [ ] **Step 4:** Run `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat: add all pages, home, sitemap, robots and domain redirects`

### Task 7: Image optimization of shipped assets

**Files:**
- Create: `src/assets/img/hero.webp`, `src/assets/img/logo.webp` (keep the PNGs as the fallback/OG source)
- Modify: the home hero CSS (`image-set()` webp, png fallback), header/footer `<picture>` for the logo, `tests/pages.test.js`

- [ ] **Step 1: Write the failing test:** `test("hero uses webp")`: `site.css` contains `hero.webp`, and `_site/assets/img/hero.webp` is smaller than 150 KB.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Run `cwebp -q 80 -resize 1600 0` for hero and `cwebp -q 90` for the logo, then update the references.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `perf: serve webp hero and logo`

### Task 8: Sveltia CMS admin panel

**Files:**
- Create: `src/admin/index.html`, `src/admin/config.yml`, `tests/cms.test.js`
- Modify: `package.json` (add a `yaml` dev dependency)

**Interfaces:**
- **`index.html`:** loads `https://unpkg.com/@sveltia/cms@<pinned version>/dist/sveltia-cms.js` and sets `<meta name="robots" content="noindex">`.
- **`config.yml`:**
  - Backend: `backend: {name: github, repo: nitzanyiz/tel-raz, branch: master, base_url: https://api.netlify.com, site_domain: tel-raz.com}`.
  - Media: `media_folder: src/assets/uploads`, `public_folder: /assets/uploads`, with Sveltia image transformations (webp, max width 1600).
  - Locale: `locale: he` if Sveltia supports it; otherwise the UI stays English and labels are Hebrew.
- **Collections (Hebrew labels):**
  - `site` (file, `src/content/site.json`, label "פרטי האתר"). `url` is a hidden field.
  - `home` (file `src/content/home.json`, "דף הבית"). Tile `url` is hidden.
  - `downloads` (file `src/content/downloads.json`, "קבצים להורדה"). The `items` list uses a file widget with `media_folder: /src/files` and `public_folder: /files`.
  - `services` (folder `src/pages/services`, "שירותים ומוצרים", `create: false, delete: false`, fields: title, seoTitle, seoDescription, intro, image, imageAlt, models list, body markdown, plus a `menu` **hidden** field).
  - `pages` (folder `src/pages`, "עמודים", `create: false, delete: false`, no subfolders, fields: title, seoTitle, seoDescription, intro, image, imageAlt, body, plus hidden `layout`, `permalink`, `menu`, `sitemap`).
  - `legal` (folder `src/pages/legal`, "מסמכים משפטיים", `create: false, delete: false`, title and body).
  - Image fields require `imageAlt` (alt text is a required string field).

- [ ] **Step 1: Write the failing tests** `tests/cms.test.js`:
  - The config parses.
  - Every `file` collection's file exists, and every top-level field `name` in it is a key of that JSON.
  - Every key in each JSON appears as a field (so the editor can't silently lose data).
  - Every folder collection has `create: false` and `delete: false`.
  - `pages` and `services` declare hidden fields for every front-matter key that exists in their `.md` files but isn't an editable field (for each md file, front-matter keys ⊆ configured field names).
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement `index.html` and `config.yml`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Manual CMS round-trip check.** Run `npm start`, open `http://localhost:8080/admin/` in Chrome and choose "Work with Local Repository" on the repo folder.
  - Edit the phone in פרטי האתר, the intro on Panasonic and the about page, add and then remove a dummy download, and save each.
  - Then `git diff`: only the intended values changed, and `menu`, `layout` and `permalink` are intact. `npm test` still passes.
  - Revert with `git checkout -- src`. If hidden fields are dropped, fix the config before continuing.
- [ ] **Step 6: Commit** `feat: sveltia cms admin panel`

### Task 9: Visual check and polish

**Files:**
- Modify: `src/assets/css/site.css`, `src/assets/js/site.js` as needed
- Create: `scripts/screens.sh` (dev helper: builds, serves `_site` on a port, runs headless Chrome screenshots into `.tmp-builds/screens/`)

- [ ] **Step 1:** Write `scripts/screens.sh`. It uses `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --screenshot=<file> --window-size=<w>,<h>` for `/`, `/services/panasonic/`, `/contact/` and `/support/guides/` at 1280×900, 1000×800 and 390×844.
- [ ] **Step 2:** Run it, look at every screenshot and fix any issues.
  - No horizontal overflow at 1000 or 390.
  - The glass bar is readable over the hero and over a white page.
  - The footer, WhatsApp button and hero are legible.
- [ ] **Step 3:** Manually check in a real browser (`npm start`):
  - Hover and keyboard (Tab, Enter, Esc) open and close the panels.
  - The phone button fades to blue.
  - The mobile menu accordions work at 390px.
  - Focus outlines are visible.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `style: polish layout after visual review`

### Task 10: Netlify config and publish action

**Files:**
- Create: `netlify.toml`, `.github/workflows/publish.yml`, `tests/deploy.test.js`

**Interfaces:**
- **`netlify.toml`:**
  ```toml
  [build]
    command = "npm run build"
    publish = "_site"
    ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- . ':(exclude)docs' ':(exclude).claude' ':(exclude)README.md'"
  [build.environment]
    NODE_VERSION = "22"
  ```
- **`publish.yml`:**
  - `name: פרסום האתר`, `on: workflow_dispatch`, `permissions: contents: write`.
  - Steps: checkout with `fetch-depth: 0`, then `git push origin origin/master:refs/heads/production` (a fast-forward only; it fails loudly if `production` diverged).

- [ ] **Step 1: Write the failing test** `tests/deploy.test.js`:
  - `netlify.toml` contains `publish = "_site"` and `ignore =`.
  - The workflow YAML parses, its `on` has only `workflow_dispatch`, and its run step contains `origin/master:refs/heads/production` and no `--force`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement both files.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Do **not** run the workflow.
- [ ] **Step 5: Commit** `ci: netlify build config and manual publish workflow`

### Task 11: Documentation and agent skill

**Files:**
- Create: `docs/מדריך-ניהול-האתר.md`, `docs/מדריך-google-search-console.md`, `docs/מדריך-google-business-profile.md`, `docs/developer-setup.md`, `README.md`, `.claude/skills/add-page/SKILL.md`, `scripts/placeholders.sh` (lists every `[למילוי]` in `src/`), `tests/docs.test.js`

**Interfaces:**
- **Editor guide** (Hebrew, sections in this order):
  1. מה זה האתר
  2. כניסה לממשק הניהול
  3. איך שינוי מגיע לאתר (תצוגה מקדימה → פרסום)
  4. משימות נפוצות (one subsection each: עריכת טקסט בעמוד, הוספה/הסרה/סידור קובץ להורדה, שינוי פרטי קשר, עריכת דף הבית, החלפת תמונה, עריכת הצהרת נגישות ומדיניות פרטיות)
  5. כללים חשובים (publish in batches, about 15 a month; image sizes; alt text; don't rename uploaded files that are already linked)
  6. רשימת מילוי לפני השקה (generated from `scripts/placeholders.sh` output and the fields in פרטי האתר)
  7. משהו השתבש
  8. מילון מונחים

  Screenshot slots are marked `> 📷 צילום מסך: …`.
- **`developer-setup.md`:** local development; the CMS local mode; architecture overview; the launch sequence copied from spec §14 as a checklist; Netlify settings; the GitHub OAuth app; the OAuth fallback (`sveltia-cms-auth`); adding the editor; the credits model; "Enabling page creation for the editor (later)" (spec §12); how to run tests and `scripts/screens.sh`.
- **`SKILL.md`:** frontmatter `name: add-page` and a description. Steps:
  1. Choose a folder (`services/` for product pages, else `pages/`).
  2. Create the md with front matter (title, seo fields, `menu: {parent, order}` where parent is a key from `menuGroups.json`, or omit `parent` for top level).
  3. Add a group to `menuGroups.json` if needed.
  4. Ensure `tests/pages.test.js` route list and `config.yml` hidden fields cover it.
  5. Run `npm test` and `scripts/screens.sh`.
  6. Commit to master.

  Also covers removing a page and adding an external link.

- [ ] **Step 1: Write the failing test** `tests/docs.test.js`: each doc file exists. The editor guide contains the headings `כניסה לממשק הניהול`, `רשימת מילוי לפני השקה` and `פרסום`. `SKILL.md` frontmatter has `name: add-page`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Write the docs.
- [ ] **Step 4:** Run `npm test`. Expected: PASS. Run `scripts/placeholders.sh` and confirm the checklist in the guide matches its output.
- [ ] **Step 5: Commit** `docs: editor guide, google guides, developer setup and add-page skill`; also commit the spec and plan if they aren't committed yet.
