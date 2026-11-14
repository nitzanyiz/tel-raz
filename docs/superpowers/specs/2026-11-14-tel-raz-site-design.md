# Tel-Raz company website — design

Date: 2026-11-14
Status: approved 2026-11-14

## 1. Intent

Replace the temporary "האתר בבנייה" page at tel-raz.com with a real company site for **טלרז תקשורת מתקדמת** (business phone systems, cloud PBX, IP phones, call transcription, call-center services, support).

The developer (owner of this repo) builds it now. Day-to-day upkeep then moves to a **non-technical employee** ("the editor"), who must be able to edit texts, add and remove downloadable guides, and fill in business details **without touching code**. A Hebrew guide in the repo teaches them how. Adding new pages and menu items stays with the developer, assisted by a Claude agent skill in the repo.

The site is in **Hebrew, RTL**. Working docs for the developer are in English. Everything for the editor is in Hebrew.

## 2. Goals, non-goals, anti-goals

**Goals**
- A static, fast, mobile-friendly Hebrew site with a sticky top menu (two-level dropdowns) and a standard company footer.
- Product and service pages, a downloads page carrying the current 8 guides, a service-call form and a contact form.
- An admin panel at `tel-raz.com/admin` where the editor edits content through forms.
- Every business detail (phone, WhatsApp, email, address, hours, social links, remote-support link, legal texts) lives in **one editable "פרטי האתר" form**. Nothing like this is hard-coded.
- Basic SEO built in from day one.
- Stays within Netlify's **free plan** (credit-based, 300 credits/month).
- Hebrew guides: site management, Google Search Console, Google Business Profile.
- A Claude agent skill for the developer to add pages and menu items.

**Non-goals (for now)**
- The editor creating pages or changing the menu.
- Grouping downloads by product, or linking downloads from product pages.
- Multi-language support, blog/news, e-commerce, customer login.
- Analytics. Not requested; can be added later.

**Anti-goals (a failure even if it "works")**
- The editor needing a terminal, a code editor, or GitHub's UI beyond one bookmarked "publish" button.
- An editor change silently breaking the layout or menu.
- Running out of Netlify credits because every small edit triggers a production deploy.
- Visible "lorem ipsum" or broken links on the live site after launch.

## 3. Stack and hosting

| Concern | Choice |
|---|---|
| Site generator | **Eleventy (11ty)** v3, Nunjucks templates, Markdown + JSON content |
| CSS/JS | Hand-written CSS (custom properties) + small vanilla JS (mobile menu, dropdown keyboard support). No CSS framework. |
| Admin panel | **Sveltia CMS** (Decap-compatible config), loaded from CDN at `/admin` |
| Admin login | GitHub OAuth through Netlify (editor gets their own GitHub account, added as repo collaborator) |
| Hosting | **Netlify**, the existing project (domains already attached) |
| Forms | **Netlify Forms** (free and unlimited on credit plans), email notifications to `info@tel-raz.com` |
| Repo | `github.com/nitzanyiz/tel-raz` |
| Font | Heebo (Google Fonts). Builder may substitute another Hebrew web font if it looks better. |

**Costs:** Eleventy, Sveltia CMS and Netlify Forms are free. Netlify free plan: 300 credits/month; each **production** deploy costs 15, bandwidth about 20/GB, branch/preview deploys are free. Expected traffic is about 1,000 visits/month.

### 3.1 Deploy flow (credit-saving)

```
editor saves in /admin ──► commit to master ──► Netlify BRANCH deploy (free)
                                                 preview: master--<site>.netlify.app
editor clicks "פרסום האתר" (GitHub Action, manual) ──► fast-forward production ◄── master
                                                 ──► Netlify PRODUCTION deploy (15 credits) ──► tel-raz.com
```

- Netlify **production branch = `production`**. Branch deploys are enabled for `master`.
- GitHub Action `publish.yml` (`workflow_dispatch` only), named **"פרסום האתר"**: fast-forwards `production` to `master` and pushes. The developer can do the same with `git push origin master:production`.
- `netlify.toml` uses an `ignore` command so commits that only touch `docs/`, `.claude/` or `README*` don't trigger a build.
- The preview site is public but unlisted. When the build is not running in Netlify's `production` context (`CONTEXT` env var), Eleventy adds `<meta name="robots" content="noindex">` to every page, emits a `Disallow: /` robots.txt. Forms **work on the preview too**, but their email subject is prefixed with **"[בדיקה]"** (via Netlify's hidden `subject` form field), so they can be tested end to end and whoever reads info@ can tell them apart from real customers (decided by the developer). (`netlify.toml` can't set headers per deploy context, so this is done in the build.)
- Developer flow is the same: push to master, check the preview, then publish.

### 3.2 Domains

- **Primary: `https://tel-raz.com`** (already set in Netlify; `www.tel-raz.com` already 301s to it). `tel-raz.co.il` and `www.tel-raz.co.il` are Netlify domain aliases and currently serve the site with **200 (not redirected)**, verified 2026-11-14. The build adds `_redirects` rules: `https://tel-raz.co.il/*` and `https://www.tel-raz.co.il/*` → `https://tel-raz.com/:splat 301!`.
- Canonical URLs and the sitemap always use `https://tel-raz.com`.

## 4. Site map and menu

Main menu, displayed right-to-left: **logo (→ home) · שירותים ▾ · עלינו · שירות ותמיכה ▾ · צור קשר · ☎ phone (tel: link, value from settings)**

```
/                                  דף הבית
├─ שירותים ▾                        (header only, no page)
│  ├─ שירותי מרכזיה בענן ▸           (header only)
│  │  ├─ iPECS Cloud                /services/ipecs-cloud/
│  │  └─ טלפוני IP מסדרה 1000i       /services/ip-phones-1000i/
│  ├─ מרכזיה ▸                       (header only)
│  │  ├─ מרכזיית Panasonic           /services/panasonic/
│  │  └─ מרכזיית Grandstream         /services/grandstream/
│  ├─ תמלול שיחות                    /services/call-transcription/
│  └─ מוקד קול סנטר                  /services/call-center/
├─ עלינו                             /about/
├─ שירות ותמיכה ▾                    (header only)
│  ├─ מדריכים                        /support/guides/
│  ├─ השתלטות מרחוק                  external link from settings, new tab
│  └─ טופס קריאת שירות               /support/service-call/
├─ צור קשר                           /contact/
└─ ☎ 09-7601760                      tel: link

Not in the menu (footer / system):
  /accessibility/   הצהרת נגישות
  /privacy/         מדיניות פרטיות
  /thanks/          תודה (after form submit)
  /404.html         page not found
```

- URLs are English slugs (my call): Hebrew URLs turn into long percent-encoded strings when shared.
- If the remote-support link in settings is empty, that menu item is hidden.

### 4.1 Menu look and behavior (decided by the developer, from reference screenshots)
- **Floating "liquid glass" bar**, sticky at the top while scrolling: a rounded (pill-like) bar with a small gap from the top and sides of the viewport, semi-transparent white with a backdrop blur (`backdrop-filter: blur(...)`, with a near-opaque white fallback where it's unsupported), and a soft shadow. It overlays the page content (the hero sits behind it).
- **Layout (RTL):** logo on the right · main items in the centre · **phone button** on the left.
- **Phone button:** a white button with navy text and a phone icon. On hover/focus it fades (CSS transition) to a blue (`--blue`) background with white text. It's a `tel:` link, and the number comes from settings.
- **Mega panel:** opening "שירותים" or "שירות ותמיכה" (hover or keyboard on desktop) turns the bar solid white and opens a **full-width, fully opaque white panel** below it. The open main item gets a dark navy rounded highlight. Both dropdown menus use this panel, for consistency.
  - שירותים panel, three columns: **שירותי מרכזיה בענן** (grey header, not a link) → iPECS Cloud, טלפוני IP מסדרה 1000i · **מרכזיה** (grey header) → מרכזיית Panasonic, מרכזיית Grandstream · a third column **without a header**, aligned with the links of the other columns → תמלול שיחות, מוקד קול סנטר (my call on placement).
  - שירות ותמיכה panel: מדריכים, השתלטות מרחוק (external, new tab), טופס קריאת שירות.
  - Main items with a panel (שירותים, שירות ותמיכה) aren't links themselves.
- **Mobile (< ~900px):** the same floating glass bar with the logo, a call icon and a hamburger. The hamburger opens a full-screen solid white menu, where the groups become expandable sections (accordions).
- **Accessible:** `aria-expanded`, Esc closes, Tab order works, visible focus styles, `prefers-reduced-motion` respected.
- The menu is built automatically with the official **Eleventy Navigation** plugin: each page declares its own menu position in its front matter (`menu: { parent, order }`), so adding or deleting a page file adds or removes it from the menu. Only non-page entries (the headers שירותים / שירותי מרכזיה בענן / מרכזיה / שירות ותמיכה and the external השתלטות מרחוק link) live in a small `src/_data/menu-groups.json`. Menu fields and `menu-groups.json` are developer-only, not exposed in the CMS (my call). Page creation in the CMS could be turned on later by exposing these fields with a parent dropdown.

## 5. Pages

All page body texts start as **neutral Hebrew placeholder copy** (my call: generic, no factual claims such as years in business or customer counts). The editor guide includes a checklist of everything to replace before launch.

| Page | Content |
|---|---|
| **Home** | Hero (`hero.png` with dark overlay, headline, sub-headline, two buttons: "צור קשר" → `/contact/` and a call button) · service tiles (6 cards linking to the 6 service pages) · "למה טלרז" (3–4 points with icons) · customer logos strip (editable list; **section hidden while empty**) · contact strip with the short contact form |
| **Service/product pages** (6) | One shared layout: title, intro text, optional image, body text (Markdown), optional **list of models** (name, image, short description). Panasonic starts with models NS1000, NS500, HT32 and "טלפונים"; Grandstream with "טלפונים". Bottom CTA: "רוצים לשמוע עוד?" + the short contact form. |
| **עלינו** | Title, Markdown body, optional image. |
| **מדריכים** | Flat list of downloads (title, description, file-type badge), like the current site. |
| **טופס קריאת שירות** | Intro text + service-call form (§6). |
| **צור קשר** | Contact details (phone, email, WhatsApp, address, hours), the short contact form, and an embedded Google Map of the address (hidden if the address is empty). |
| **הצהרת נגישות / מדיניות פרטיות** | Title + Markdown body, editable. Start as placeholder templates with fields to fill in (see §8). |
| **תודה** | Confirmation message + link back to the home page. |
| **404** | Friendly Hebrew message + links to home and contact. |

### 5.1 Global elements
- **Footer** (dark navy): logo + short "about" line · quick links (the main pages) · contact details (phone, email, WhatsApp, address, hours) · social icons (**each shown only if filled in**) · legal links (הצהרת נגישות, מדיניות פרטיות) · `© <current year> טלרז תקשורת מתקדמת`.
- **WhatsApp floating button**, bottom-left (RTL convention), linking to `https://wa.me/<number>`. The number comes from settings (initially 972-9-7601760) and is hidden if empty.
- **Favicon/touch icons:** use the existing files.

## 6. Forms (Netlify Forms)

Both forms: HTML forms with `data-netlify="true"`, a honeypot field for spam, client-side `required` validation, and a redirect to `/thanks/` on success. The developer configures email notifications to `info@tel-raz.com` in the Netlify UI (documented in the developer setup doc). Labels and placeholders in Hebrew. Styled in the site theme, not the green in the reference screenshots.

| Form name | Fields (all required) | Where |
|---|---|---|
| `service-call` | שם חברה, שם מלא, מספר טלפון ישיר, מספר טלפון סלולרי, דוא"ל, פירוט התקלה (textarea) | `/support/service-call/` |
| `contact` | שם מלא, טלפון, שם חברה · button "דברו איתנו" · hidden field `page` (which page it was sent from) | home page strip, `/contact/`, bottom of service pages |

The short contact form is one Nunjucks partial reused everywhere, with the same Netlify form name. Netlify needs each form to exist in the built HTML, which it does.

**Email subject:** each form sets Netlify's hidden `subject` field: `טופס קריאת שירות חדש` / `פנייה חדשה מהאתר`. On preview builds, prefixed with `[בדיקה] ` (see §3.1).

**Privacy (my call):** a short line under each form linking to the privacy policy, since forms collect personal data.

## 7. Theme

From the logo:
- `--navy: #33394f` (primary, headings, footer)
- `--navy-dark: #272c3f`
- `--blue: #446ba4` (accent, links, buttons, hover)
- light background `#f3f5f9`, white cards, borders `#dde3ee`, text `#1c2433`, muted `#5d6779`

The hero uses `hero.png` (chrome logo on dark) with a dark overlay. Visual style: clean, corporate, rounded cards, plenty of white space. The temporary site's CSS is a good reference for tone. Text and background combinations must meet WCAG AA contrast.

## 8. Content model (what the editor can edit)

Everything editable is a file in the repo, and the CMS shows each one as a Hebrew-labeled form. The editor **cannot** create or delete pages (`create: false`, `delete: false` on page collections), and cannot see menu fields or `menu-groups.json`.

| CMS section (Hebrew label) | File(s) | Fields |
|---|---|---|
| **פרטי האתר** | `src/_data/site.json` | company name, phone (display), phone (dial format), WhatsApp number, email, address, opening hours, Facebook/Instagram/LinkedIn/YouTube URLs, remote-support link (השתלטות מרחוק), short footer "about" line, default SEO description |
| **קבצים להורדה** | `src/_data/downloads.json` + uploads to `src/files/` | ordered list: title, description, file (upload). Drag to reorder. |
| **דף הבית** | `src/_data/home.json` | hero headline, sub-headline, button labels, service-tile texts (title, short text, image; links fixed), "why us" items (title, text), customer logos (name, image), contact-strip heading and text |
| **עמודים** | `src/pages/*.md`: one per page, **including** the guides, service-call, contact, thank-you and 404 pages (their intro/body text); layouts are picked by front matter, not by `.njk` page files | title, SEO title, SEO description, intro, image + alt text, body (rich text/Markdown), models list (product pages only) |
| **מסמכים משפטיים** | `src/pages/accessibility.md`, `privacy.md` | title, body |

- **The "form of things to fill later"** is the פרטי האתר section plus the legal pages. Every field starts with a clearly recognizable value (empty, or a value tagged `[למילוי]` where empty would hide something needed). The guide includes a fill-in checklist.
- The **accessibility statement** starts from a template with the standard sections an Israeli accessibility statement has (what was done, accessibility coordinator contact details, date of last review, how to report a problem), with `[למילוי]` slots.
- **Rule:** every text a visitor sees on any page is editable in the CMS (my call, from "the editor edits texts"), except menu labels, form field labels and footer structure.
- **Old links keep working:** downloads keep their exact current URLs `/files/<original Hebrew filename>` (customers may have links or QR codes), so `src/files/` is copied to `/files/` unchanged (my call).
- **Uploads:** PDFs, Word and Excel files go to `src/files/`, images to `src/assets/uploads/`. Hebrew filenames are allowed (the current files use them) (my call).
- **Migration:** the 8 current guides are downloaded from `https://tel-raz.com/files/...` (the list is in the live `files.json`) into `src/files/` and copied into `downloads.json` as-is.

## 9. Editor workflow and access

1. The developer adds the editor's GitHub account as a repo collaborator.
2. The editor goes to `tel-raz.com/admin` → "Sign in with GitHub" (once; then it remembers them).
3. They edit forms and upload files → **Save**. Each save commits to `master` and updates the **preview site** within about a minute.
4. They check the preview link (bookmarked).
5. When satisfied, they open the bookmarked **"פרסום האתר"** GitHub Action page → **Run workflow**. The live site updates within about a minute.
6. Guidance in the guide: batch your changes, publish once (each publish costs credits; about 15 a month is comfortable).

The editor never uses GitHub beyond the login and the publish button. Every change is in git history under their name, so the developer can revert anything.

## 10. SEO

- Per-page `<title>` and meta description (CMS fields, with site-wide defaults).
- `<html lang="he" dir="rtl">`, canonical URLs on `https://tel-raz.com`.
- `sitemap.xml` (generated), `robots.txt` (pointing to the sitemap). The preview is noindexed.
- Open Graph + Twitter card tags (default share image derived from the logo/hero, 1200×630).
- JSON-LD `LocalBusiness` built from `site.json` (name, phone, email, address, hours, social links).
- Semantic headings (one `h1` per page), image `alt` text required in CMS image fields.
- Performance: compressed and resized images (the Eleventy image plugin, or pre-optimized assets), minimal JS, font `display=swap`.

## 11. Accessibility

Target **WCAG 2.0 AA** (the basis of Israeli standard IS 5568): semantic HTML, keyboard-operable menu, visible focus, skip-to-content link, form labels, contrast, `alt` texts, `prefers-reduced-motion`. **No accessibility overlay widget** (my call; these widgets are widely criticized and don't make a site compliant). The developer can revisit this.

## 12. Documentation deliverables

| File | Language | Audience | Contents |
|---|---|---|---|
| `docs/מדריך-ניהול-האתר.md` | Hebrew | editor | What the site is · how to log in · the preview → publish flow · step-by-step for each task (edit text, add/remove/reorder a download, change phone/WhatsApp/hours, edit legal pages, change home-page sections, replace an image) · do's and don'ts (batch publishes, image sizes, alt texts) · fill-in checklist before launch · "something went wrong" (who to call; changes can be undone) · glossary. Screenshots added by the developer after setup (placeholders marked). |
| `docs/מדריך-google-search-console.md` | Hebrew | editor | Registering the site, verifying the domain, submitting the sitemap, reading basic reports |
| `docs/מדריך-google-business-profile.md` | Hebrew | editor | Creating/claiming the profile, filling in details consistently with the site, photos, reviews, posts |
| `docs/developer-setup.md` | English | developer | Local dev (`npm install`, `npm start`) · Netlify setup (link repo, production branch = `production`, branch deploys for master, primary domain, form notifications to info@, ignore rule) · GitHub OAuth app for the CMS · adding the editor as collaborator · publish action · the credits model |
| (section in `developer-setup.md`) | English | developer | **"Enabling page creation for the editor (later)"**: how to allow create/delete on the pages CMS collection, expose menu fields (parent as a select limited to `menu-groups.json` headers, order, English slug), allow renaming/reordering headers, add a build-time check for invalid/duplicate slugs, and the Hebrew guide section to add. Not enabled now. |
| `README.md` | English | developer | Short overview + links to the above |
| `.claude/skills/add-page/SKILL.md` | English | developer + Claude | How to add a page: pick a layout, create `src/pages/<slug>.md` with front matter (including its menu parent/order), add any new product-specific CMS fields to `admin/config.yml` if needed, check SEO fields, build and check locally. Also covers removing a page and adding a menu header or external link in `menu-groups.json`. |

## 12a. Risks to verify first
- **CMS login:** Sveltia CMS with Netlify's GitHub OAuth provider (Netlify → Access & security → OAuth) is the plan. **The developer chose to verify it at the end** (at launch), so during development the CMS is built and tested with Sveltia's "work with local repository" mode. Config must set `backend.repo`, `branch: master`, and `site_domain`/`base_url` so OAuth also works from the `master--` preview hostname. Fallback: Sveltia's own `sveltia-cms-auth` Cloudflare Worker. If the fallback is needed, update `developer-setup.md` and the editor guide accordingly.
- **Netlify plan and pricing:** credit figures in §3 come from Netlify docs as of Nov 2026. The developer confirms the team is on the credit-based free plan (the preview → publish flow is kept either way as good practice).
- **Cut-over:** **the live temporary site must not be touched during development.** The Netlify project is not linked to the repo until launch. A `production` branch already exists on origin (created by the developer) but contains no site yet. Linking makes Netlify deploy `production` immediately, so `production` must hold the finished site (with the migrated `/files/`) **before** linking (§14). The 8 guide files are downloaded from the live site into `src/files/` during the build (read-only, doesn't affect the live site).

## 13. Repository layout (target)

```
/
├─ .eleventy.js
├─ package.json
├─ netlify.toml                  build cmd, publish dir, ignore rule, headers
├─ .github/workflows/publish.yml "פרסום האתר"
├─ src/
│  ├─ _data/  site.json · menu-groups.json · downloads.json · home.json
│  ├─ _includes/
│  │  ├─ layouts/  base.njk · page.njk · product.njk · legal.njk
│  │  └─ partials/ header.njk · footer.njk · contact-form.njk · whatsapp.njk · seo.njk
│  ├─ pages/      about.md · ipecs-cloud.md · … · accessibility.md · privacy.md
│  ├─ index.njk (home)   (guides/service-call/contact/thanks/404 are .md pages using dedicated layouts)
│  ├─ assets/     css/ · js/ · img/ (logo, hero, icons) · uploads/
│  ├─ files/      downloadable guides
│  ├─ admin/      index.html · config.yml
│  ├─ robots.txt.njk · sitemap.xml.njk
├─ docs/ …                        (§12)
└─ .claude/skills/add-page/SKILL.md
```

The existing root `assets/` and `favicon.ico` move under `src/`. `dantelraz.excalidrawlib` stays at the root as reference.

## 14. Launch sequence (after the build; nothing on Netlify changes before this)

1. The site is finished and checked locally on master (including the CMS in local-repository mode). Placeholder copy is replaced, or the developer accepts launching with generic copy.
2. Fast-forward `production` to `master` and push (`production` must hold the full site before linking).
3. Developer, in GitHub: create the OAuth app (callback `https://api.netlify.com/auth/done`). In Netlify: Access & security → OAuth → install the GitHub provider.
4. Netlify: link the repo (Build & deploy → Continuous deployment → Link repository), **branch to deploy = `production`**. Build settings come from `netlify.toml`. This first deploy is the launch.
5. Netlify: enable branch deploys for `master` (preview). Form detection is already on, and email notifications to info@ are already set for every form; check both new forms appear and notify.
6. Verify: CMS login at `/admin` (on production and on the preview), both `.co.il` domains 301 to tel-raz.com, the forms send email (preview emails tagged \"[בדיקה]\"), the old `/files/...` links work, the preview is noindexed.
7. Add the editor as a GitHub collaborator once they have an account. Then the editor does Search Console and Google Business Profile, per the guides.

## 15. Decided by the developer (in conversation)
- Menu structure exactly as in §4. "שירותי מרכזיה בענן" and "מרכזיה" are headers only.
- השתלטות מרחוק = external link (configurable).
- Form fields as in §6. Submissions go to info@tel-raz.com. The contact form also appears on the home page.
- The contact page includes the details and a map.
- Placeholder content to start.
- Downloads: flat list, the same 8 files.
- Footer contents including the accessibility statement and privacy policy. All details configurable.
- The editor edits text and files only. The developer adds pages, assisted by an agent skill.
- Eleventy, Netlify, an admin panel with GitHub login, the editor guide in Hebrew in the repo.
- Primary domain tel-raz.com. WhatsApp = 09-7601760 for now, configurable.
- SEO included. A WhatsApp floating button. Google Business Profile guide.
- Theme from the logo, not the green in the reference screenshots.
- Floating glass menu bar, full-width opaque mega panels, phone as a white button that fades to blue on hover, mobile full-screen menu (§4.1).
- The editor cannot add or delete pages for now; enabling it later is documented (§12).
- Credit-saving flow: master previews for free, publishing is manual.
- Preview forms send real emails, tagged "[בדיקה]" in the subject.

## 16. Left to the builder
- Exact visual design within §7 (spacing, card styles, icons; an inline SVG icon set is fine).
- Exact placeholder wording.
- The Sveltia CMS configuration details (widgets, Hebrew labels, previews).
- Image optimization approach.
- How "why us" icons and service-tile images are chosen (placeholders allowed).
- Tooling for local dev (npm scripts), Node version pin.
