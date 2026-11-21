# AI Solutions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the "פתרונות שירותי AI" page into three editable sections (cards with icons on the right, a looping decorative animation on the left) at the new address `/ai-solutions/`.

**Architecture:** The page file moves to `src/pages/ai-solutions.md` with a 301 from the old address. Its front matter holds `sections` (title, tagline, groups of cards), edited through its own Sveltia `files` entry. A front-matter flag (`system: special`) keeps it out of the generic `pages` / `system_pages` forms. A dedicated layout renders the sections and includes one fixed animation partial per section (by position). The markup is the animation's *finished frame*. One deferred page script (`pageScript`) plays each animation as a looping timeline only while it is on screen. With reduced motion or no JS, the finished frame stays.

**Tech Stack:** Eleventy 3 + Nunjucks, plain CSS (`site.css`), vanilla JS, Sveltia CMS (`src/admin/config.yml`), `node:test` + cheerio.

**Spec:** `docs/superpowers/specs/2026-11-21-ai-solutions-page-design.md`. Mockups to copy look and timing from (local, git-ignored): `.superpowers/brainstorm/91427-1795294299/content/section-layout-v3.html` (layout B + voice bot), `animation-concepts-2.html` (sparkle-on-blue avatar, section 1 "1C"), `section3-round3.html` (section 3 "3E").

## Global Constraints

- No new libraries or build steps. Hebrew RTL, Heebo, colors only from `site.css` `:root` tokens (new tokens allowed for the sentiment dial red/yellow/green and the success green `#3fbf7f`).
- Address `/ai-solutions/`; `/call-transcription` → `/ai-solutions/` 301 in `src/_redirects`.
- Exactly three sections, in spec order; animation chosen by position (1 → `analysis`, 2 → `voicebot`, 3 → `handoff`), never by a CMS field.
- Animations: `aria-hidden="true"`, nothing focusable inside, no pointer or touch handlers, the Hebrew inside them fixed in code (spec §5 wording verbatim).
- Bot avatar = white sparkle on brand-blue gradient circle, labels "לקוח" / "בוט AI" / "נציג".
- Loop only while on screen and tab visible; restart from the beginning when it comes back; `prefers-reduced-motion: reduce` → finished frame, no motion.
- Layout: text right, animation left; ≤ 820px stack (text first, animation under it); cards 2 columns, 1 column ≤ 520px.
- Commit messages in the repo's Hebrew style (`אתר: …`, `תוכן: …`, `תיעוד: …`).

## Review Focus

1. Editor empties a group's heading, deletes every card in a group, or leaves a tagline empty. Expected: no empty `h3`, `p` or grid rendered (Task 3 test).
2. Editor clears a card's icon, or the value is unknown. Expected: the default sparkle icon, never an empty chip (Task 3 test).
3. Visitor scrolls a section in and out quickly. Expected: one timeline per stage at a time, restarting cleanly, with no doubled bubbles (Task 5: generation token, browser check).
4. No JS, or reduced motion. Expected: each animation shows its complete finished frame, with all text, bubbles, ✓ and dial settled (Task 4 test on built HTML, Task 5 browser check).
5. Old links to `/call-transcription/`. Expected: a 301 to `/ai-solutions/`, and the home tile points at the new address (Task 1 test).

---

### Task 1: Move the page to `/ai-solutions/`

**Files:**
- Rename: `src/pages/call-transcription.md` → `src/pages/ai-solutions.md` (`git mv`)
- Modify: `src/_redirects` (add `/call-transcription  /ai-solutions/  301`)
- Modify: `src/content/home.json:59` (`"link": "ai-solutions"`)
- Modify: `docs/מדריך-ניהול-האתר.md:240` (checklist line → `פתרונות שירותי AI (ai-solutions)`)
- Move: the three `WhatsApp Image 2026-11-21 at …jpeg` files in the repo root → `docs/superpowers/specs/assets/ai-solutions/ai-call-analysis.jpeg`, `ai-voice-bot.jpeg`, `ai-smart-service.jpeg` (22.32.49, 22.33.16, 22.33.45 respectively)
- Test: `tests/urls.test.js` (or `tests/deploy.test.js`, whichever already reads `_redirects`; else `tests/urls.test.js`)

**Interfaces:**
- Produces: page slug `ai-solutions` (used by `home.json` and the CMS entry in Task 2).

- [ ] **Step 0: Commit the spec and this plan** (`תיעוד: אפיון ותוכנית לעמוד פתרונות AI`).
- [ ] **Step 1: Write the failing test** `"AI page lives at /ai-solutions/ and the old address redirects"`: the preview build has `/ai-solutions/index.html` and no `/call-transcription/index.html`; `src/_redirects` has a line matching `/^\/call-transcription\s+\/ai-solutions\/\s+301$/m`; `home.json` has a tile with `link === "ai-solutions"` and none with `"call-transcription"`.
- [ ] **Step 2: Run** `node --test tests/urls.test.js`. Expected: FAIL on the new test.
- [ ] **Step 3: Implement** the rename, the redirect line, the home link, the guide line and the image move.
- [ ] **Step 4: Run** `npm test`. Expected: all pass (the link checker proves nothing links to the old address).
- [ ] **Step 5: Commit** `אתר: עמוד פתרונות AI עובר לכתובת /ai-solutions/ (עם הפניה מהכתובת הישנה)`.

### Task 2: The page's own CMS form and its content

**Files:**
- Modify: `src/admin/config.yml` (new collection after `system_pages`)
- Modify: `src/pages/ai-solutions.md` (front matter rewritten, body emptied)
- Test: `tests/cms.test.js`

**Interfaces:**
- Produces, as front matter of `src/pages/ai-solutions.md` (consumed by Task 3):
  ```yaml
  system: special
  sitemap: true
  title: פתרונות ושירותי AI
  intro: <spec §5 intro>
  sections:            # exactly 3, spec order
    - title: <string>
      tagline: <string, may be "">
      groups:
        - heading: <string, may be "">
          cards:
            - { keyword: <string>, text: <string>, icon: <icon value> }
  contactForm: true
  menu: { inMenu: true, parent: advanced, order: 1, title: פתרונות שירותי AI }
  seoTitle: פתרונות AI לעסקים – ניתוח שיחות ובוט קולי
  seoDescription: <one line covering analysis, voice bot, 24/7 service, ≤ 155 chars>
  ```
- Icon values (the CMS select, and the names Task 3's icon macro must draw): `transcript, summary, sentiment, insight, search, review, devices, mic, calendar, payment, automation, clock24, routing, service, sparkle`. `sparkle` is the default.
- CMS collection: `name: special_pages`, `label: עמודים מיוחדים`, `files: [{ name: ai-solutions, label: פתרונות שירותי AI, file: src/pages/ai-solutions.md, format: frontmatter, fields: … }]`.

- [ ] **Step 1: Write the failing tests** in `tests/cms.test.js`:
  - `"the AI page has its own form, outside the generic page views"`: `special_pages` has one file entry for `src/pages/ai-solutions.md`. Its field names are exactly the front-matter keys of that file plus none extra (`system`, `sitemap` hidden). `sections` is a list with `allow_add: false`, `allow_remove: false`, `allow_reorder: false`. Each card's `icon` is a select whose option values equal the icon list above, with `default: sparkle`.
  - `"AI page content matches the spec"`: 3 sections; titles in spec order; the section 2 tagline is `משיחה לפעולה – באופן אוטומטי`, the others are empty; card counts per section `[4+3, 4, 3]`; section 1's second group heading is `איתור מידע וייעול תהליכי עבודה`; every card has a non-empty keyword, text and a known icon.
  - Update the existing tests: `"file collections match their JSON keys exactly"` skips non-`.json` files. `"every page carries explicit system and sitemap flags"` accepts `fm.system === "special"` for slugs in `SPECIAL_PAGES = ["ai-solutions"]`. `"every front-matter key is a field of the view that shows the page"` uses the `special_pages` file entry's fields for special pages.
- [ ] **Step 2: Run** `node --test tests/cms.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the collection (Hebrew labels: כותרת העמוד, משפט פתיחה, אזורים, כותרת האזור, שורה קצרה, קבוצות, כותרת קבוצה (לא חובה), כרטיסים, מילת מפתח, הסבר, אייקון, plus the menu/SEO/contactForm fields copied from `pages`; icon option labels in Hebrew), and the front matter with the spec §5 text verbatim. Keep `menu.inMenu` explicit.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `אתר: טופס עריכה ייעודי לעמוד פתרונות AI ותוכן שלושת האזורים`.

### Task 3: Layout, section text and card icons (no animations yet)

**Files:**
- Create: `src/pages/ai-solutions.11tydata.json` → `{ "layout": "layouts/ai-solutions.njk", "pageScript": "/assets/js/ai-solutions.js" }`
- Create: `src/_includes/layouts/ai-solutions.njk` (chains to `layouts/page.njk` with `wide: true`)
- Create: `src/_includes/partials/contact-cta.njk` (the "רוצים לשמוע עוד?" block moved verbatim out of `layouts/content.njk`, which now includes it)
- Modify: `src/_includes/partials/icons.njk` (add the 15 icon names; `sparkle` also used as the fallback)
- Modify: `src/assets/css/site.css` (new block `/* ---------- AI solutions page ---------- */`)
- Test: `tests/ai-solutions.test.js` (new) + `tests/pages.test.js` (`ROUTES` gains `/ai-solutions/`)

**Interfaces:**
- Consumes: Task 2 front matter.
- Produces the markup Task 4/5 rely on:
  `section.ai-section[data-anim="analysis|voicebot|handoff"]` > `.ai-section__text` (`h2`, optional `p.ai-section__tagline`, per group optional `h3.ai-group__title` + `ul.ai-cards` > `li.ai-card` > `span.ai-card__icon` (svg) + `b.ai-card__key` + `p.ai-card__text`) and `.ai-section__anim` (empty in this task; Task 4 fills it).
- Icon macro call: `icons.icon(card.icon or "sparkle")`. Unknown names must fall back to `sparkle` (add an `else` branch to the macro that draws the sparkle).

- [ ] **Step 1: Write the failing tests** in `tests/ai-solutions.test.js`, on the preview build of `/ai-solutions/`:
  - `"renders the three sections from front matter"`: 3 `section.ai-section`, with `data-anim` `["analysis","voicebot","handoff"]`; each `h2` equals its front-matter title; `.ai-card__key` texts equal the front-matter keywords in order; every `.ai-card__icon` contains an `svg` with at least one child.
  - `"empty tagline and group heading render nothing"`: sections 1 and 3 have no `.ai-section__tagline`; section 1 has exactly one `h3.ai-group__title`.
  - `"editor mistakes don't break the page"`: via `buildCopy` (see `tests/content.test.js`), edit the front matter so that one card has `icon: ""`, one has `icon: nope`, and section 3's only group has `cards: []`. Expected: the build succeeds; both broken-icon cards still contain a non-empty `svg`; section 3 renders no empty `ul.ai-cards`.
  - `"contact form at the bottom"`: one `form[name="contact"]` when `contactForm` is true.
- [ ] **Step 2: Run** `node --test tests/ai-solutions.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the data file, the layout, the contact partial, the icons and the CSS: a white card per section (`.prose` look), grid `1.1fr .9fr`, text first in DOM (RTL → right); cards as in mockup option B (`--bg` card, white icon chip with blue stroke, bold navy keyword, muted text); `@media (max-width: 820px)` single column; `@media (max-width: 520px)` one card per row. Since `ai-solutions.js` doesn't exist yet, create it as an empty IIFE stub so the build's script reference resolves.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `אתר: עמוד פתרונות AI – שלושה אזורים עם כרטיסים ואייקונים`.

### Task 4: The three animations as static finished frames

**Files:**
- Create: `src/_includes/partials/ai-anim-analysis.njk`, `ai-anim-voicebot.njk`, `ai-anim-handoff.njk`
- Create: `src/_includes/partials/ai-avatars.njk` (macros `customer()`, `bot()`, `agent()`: the clay circles from the mockups; the bot = white sparkle on `--blue` gradient)
- Modify: `src/_includes/layouts/ai-solutions.njk` (include `partials/ai-anim-{{ section's data-anim }}.njk` inside `.ai-section__anim`)
- Modify: `src/assets/css/site.css` (stage, avatars, bubbles, tiles, dial, card, plus the animated states, all scoped under `.ai-stage.is-live`)
- Test: `tests/ai-solutions.test.js`

**Interfaces:**
- Produces, for Task 5: each partial's root is `div.ai-stage[aria-hidden="true"][data-anim="…"]`. Every element that appears during the animation has class `ai-step`, and its order is given by `data-step="N"` (1-based). Elements whose content changes mid-animation hold the **final** content in markup:
  - analysis: `.ai-words > span` words; `.ai-dial` (needle settled); `.ai-todo` (checked)
  - voicebot: `.ai-msg--bot[data-typing]` (holds the final reply text); `.ai-booked`
  - handoff: `.ai-handoff-card` (sits at the agent end in the final frame, hidden by `.is-gone`)
- The CSS contract: without `.is-live` on `.ai-stage`, every `.ai-step` is fully visible (finished frame). With `.is-live`, `.ai-step` is hidden until it gets `.is-in`. Motion keyframes (sound bars, rings, twinkle, typing dots) only run under `.is-live`.

- [ ] **Step 1: Write the failing tests**:
  - `"each section has one decorative animation"`: inside every `section.ai-section`, exactly one `.ai-stage[aria-hidden="true"]` whose `data-anim` equals the section's; no `a, button, input, [tabindex]` inside any `.ai-stage`.
  - `"finished frames carry the spec text"`: analysis stage text includes `המשלוח`, `סיכום`, `סנטימנט`, `משימה`; voicebot includes `אפשר לקבוע תור ליום שלישי?`, `בטח! יש מקום ביום ג׳ ב־10:00`, `מעולה, מתאים לי!`, `התור נקבע`; handoff includes `חייבו אותי פעמיים על אותה חשבונית`, `סיכום להעברה`, `כבר מטפל בזיכוי`, `בלי לחזור על הפרטים`; labels `לקוח`, `בוט AI`, `נציג` appear where the spec places them.
  - `"no hidden steps without JS"`: `site.css` has no rule hiding `.ai-step` that isn't scoped under `.is-live` (regex over the AI block: every selector containing `.ai-step` with `opacity:\s*0` also contains `.is-live`).
- [ ] **Step 2: Run** `node --test tests/ai-solutions.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the partials and CSS, copying look and sizes from the mockups (bot icon swapped to sparkle on blue). Stage: `aspect-ratio: 1 / 1`, rounded, radial white-to-pale-blue gradient with the faint dot grid.
- [ ] **Step 4: Run** `npm test`. Expected: all pass. Then open `/ai-solutions/` (`npm start`) and check the three finished frames look right at 1440 and 390.
- [ ] **Step 5: Commit** `אתר: עמוד פתרונות AI – שלוש האנימציות (מסגרת סופית, ללא תנועה)`.

### Task 5: Play the animations (loop on screen, pause off screen, reduced motion)

**Files:**
- Modify: `src/assets/js/ai-solutions.js`
- Test: `tests/ai-solutions.test.js`, `tests/pages.test.js`

**Interfaces:**
- Consumes: Task 4's `.ai-stage[data-anim]`, `.ai-step[data-step]` and named parts.
- Produces: no globals. The IIFE exits if there is no `.ai-stage`.
- Shape: `const TIMELINES = { analysis: [...], voicebot: [...], handoff: [...] }`. Each is an array of `[atMs, (stage) => void]` steps, with timings from the mockups (analysis ≈ 10s, voicebot ≈ 10.5s, handoff ≈ 10s, then a 0.7s fade and restart). `play(stage)` runs the timeline with a per-stage generation number: `stop(stage)` increments it, clears pending timers, removes `.is-in`/state classes and restores the markup's final text (store it in `data-final` on first run). Any scheduled step whose generation is stale does nothing. An IntersectionObserver (threshold ≈ 0.35) calls `play` on enter and `stop` on leave. `visibilitychange` stops all stages when hidden and replays the visible ones when shown. If `matchMedia('(prefers-reduced-motion: reduce)')` matches, never add `.is-live` (and react to changes of that query).

- [ ] **Step 1: Write the failing tests**:
  - `"the animation script loads only on the AI page"` (in `tests/pages.test.js`): `script[src="/assets/js/ai-solutions.js"][defer]` appears once on `/ai-solutions/` and on no other built page.
  - `"script plays only on screen and respects reduced motion"` (static check on `src/assets/js/ai-solutions.js`): it references `IntersectionObserver`, `visibilitychange`, `prefers-reduced-motion`, and the three keys `analysis`, `voicebot`, `handoff`.
- [ ] **Step 2: Run** `node --test tests/ai-solutions.test.js tests/pages.test.js`. Expected: the second test FAILS (the stub has none of these).
- [ ] **Step 3: Implement** the script per the shape above.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Browser check with the `test-site` skill** (real browser; headless virtual time doesn't run timers reliably): at 1440 and 390 each animation plays in spec order and loops. Scroll a section off and back: it restarts from step 1 with no doubled bubbles. Do it quickly 5 times. Hidden tab, then back: it restarts. Emulate `prefers-reduced-motion: reduce`: finished frames, nothing moves. No console errors.
- [ ] **Step 6: Commit** `אתר: עמוד פתרונות AI – הנפשה בלולאה רק כשהאזור על המסך`.

### Task 6: Documentation

**Files:**
- Modify: `docs/מדריך-ניהול-האתר.md` (a short section "עמוד פתרונות שירותי AI": where to find it in the CMS (עמודים מיוחדים), what can be edited (titles, short line, cards, icons), that the animations are fixed, and that it can't be deleted or renamed)
- Modify: `docs/developer-setup.md:11` (mention the third flag value `system: special`, edited through `special_pages`)
- Modify: `.claude/skills/add-page/SKILL.md` (a special page is never moved or deleted through the content/system recipes)
- Test: `tests/docs.test.js`

- [ ] **Step 1: Write the failing test**: extend the editor-guide headings check with `"עמוד פתרונות שירותי AI"`, and the developer-setup check with `"system: special"`.
- [ ] **Step 2: Run** `node --test tests/docs.test.js`. Expected: FAIL.
- [ ] **Step 3: Write** the three doc changes.
- [ ] **Step 4: Run** `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** `תיעוד: עמוד פתרונות AI במדריך העורך ובמדריך המפתח`.
