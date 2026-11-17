# Home Hero Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home page photo hero with the demo-3 animated clay scene, with the approved desktop / touch / reduced-motion behavior.

**Architecture:** Scene markup (inline SVG objects + the traced logo `<symbol>` + a `<canvas>` for the dot network) lives in one Nunjucks include rendered inside the existing `.hero` section. CSS for the scene goes in `site.css` (replacing the photo rules). One deferred script, loaded only on the home page, runs a single `requestAnimationFrame` loop (parallax, cloud, floating, network) and toggles `.hot` classes for the CSS hover animations.

**Tech Stack:** Eleventy 3 + Nunjucks, plain CSS, vanilla JS, `node:test` + cheerio.

**Spec:** `docs/superpowers/specs/2026-11-17-home-hero-scene-design.md` (reference implementation: `src/hero-demo-3.njk`, live at `/hero-demo-3/` on the master preview).

## Global Constraints

- No new libraries or build steps.
- Desktop = `matchMedia('(hover: hover) and (pointer: fine)')`; everything else is "touch".
- Desktop: object size factor **1.2**, logo ripples **on**, network **on**, floating **off**, parallax strength **40px**.
- Touch: no pointer/touch listeners act on the scene; floating **on**; ripples and network on (dots never link to a finger); cloud never splits.
- `prefers-reduced-motion: reduce` → fully still on every device (network drawn once).
- Phone layout (bands above and below the text) at hero width **≤ 760px**.
- Scene is `aria-hidden="true"`, nothing focusable; h1/subtitle/buttons unchanged and fed from `home.*`.

## Review Focus

1. Medium desktop widths (1024–1280px): an object box intersecting the text block. Expected: no overlap at any width (test in Task 3, browser check in Task 4).
2. Tablet in landscape with a wide screen (touch, desktop layout): expected floating, no reactions.
3. Hero scrolled off-screen / tab hidden: the rAF loop must stop (Task 2 browser check: frame counter stops).
4. Editor enters a very long heroTitle/subtitle: the text block grows; objects still keep clear (layout reads the live text rect, Task 2).
5. Window resize across 760px and across a mouse/touch change: layout and mode re-evaluate without reload.

---

### Task 1: Scene markup and styles on the home page (static)

**Files:**
- Create: `src/_includes/partials/hero-scene.njk` (all scene SVG markup from `src/hero-demo-3.njk`: the gradients, `#puff`, `#goo`, the logo `<symbol id="rings-symbol">`, the eight `.obj` blocks with their `data-x/data-y/data-w/data-depth`, the `<canvas>`)
- Modify: `src/index.njk:6-15` (the `.hero` section: include the partial, wrap the text in `.hero-text`)
- Modify: `src/assets/css/site.css:203-218` (replace the photo hero rules with the scene rules from demo 3: white background, `.obj`, the per-object keyframes, phone-layout and reduced-motion media queries)
- Delete: `src/assets/img/hero.webp` (keep `hero.png`: gallery tests and `scripts/behavior-check.sh` use it as a fixture)
- Test: `tests/pages.test.js` (replace "hero and logo ship as webp")

**Interfaces:**
- Produces: `.hero[data-scene]` containing `.hero-scene[aria-hidden="true"]` with `canvas.hero-net`, `.obj.<name>` for name in `cloud printer logo bubble server chart headset phone`, each with `data-x data-y data-w data-depth`; `#scene-puffs` (cloud group) and `#scene-leds` (server LED group) as empty containers the script fills; `.hero-text` holding the existing h1, p and `.hero-actions`.

- [ ] **Step 1: Write the failing test** `"home hero is the decorative scene"`: on `/`, `.hero .hero-scene` exists with `aria-hidden="true"`; it contains exactly the 8 `.obj` names above and one `canvas`; no element inside it matches `a, button, [tabindex]`; `.hero h1` text equals `home.json` heroTitle; `site.css` no longer contains `hero.webp`; `assets/img/logo.webp` still exists.
- [ ] **Step 2: Run** `node --test tests/pages.test.js` — expected FAIL on the new test.
- [ ] **Step 3: Implement** the partial, the index change, the CSS and the deletion. Object sizes in markup are the demo's base sizes; the 1.2 factor is applied by the script (Task 2).
- [ ] **Step 4: Run** `npm test` — expected all pass.
- [ ] **Step 5: Commit** `אתר: סצנת ענן/טלפון/לוגו בראש עמוד הבית (סטטית)`.

### Task 2: Scene script (desktop interaction, touch floating, reduced motion)

**Files:**
- Create: `src/assets/js/hero-scene.js`
- Modify: `src/index.njk` (front matter or block that adds `<script src="/assets/js/hero-scene.js" defer>` on the home page only — follow how `base.njk` loads `site.js`; add a `headScripts`/`pageScript` hook in `base.njk` if none exists)
- Test: `tests/pages.test.js`

**Interfaces:**
- Consumes: Task 1 markup.
- Produces: no globals. The IIFE exits early if `document.querySelector('.hero[data-scene]')` is missing.

- [ ] **Step 1: Write the failing test** `"scene script loads only on the home page"`: `/` has a `script[src="/assets/js/hero-scene.js"][defer]`; `/contact/` and `/about/` (if present) do not.
- [ ] **Step 2: Run** `node --test tests/pages.test.js` — expected FAIL.
- [ ] **Step 3: Implement `hero-scene.js`** by porting demo 3's script, with these differences:
  - `mode()` returns `'still'` if reduced motion, else `'desktop'` if the desktop media query matches, else `'touch'`; listen to both media queries' `change` and re-apply.
  - Desktop: pointer listeners on the hero (`pointermove`, `pointerleave`), `.hot` toggled on `pointerenter/leave` of each `.obj`, cloud split, parallax 40, network links to the cursor, floating off, ripples on.
  - Touch: no pointer listeners act (`mouse` stays `null`; `.hot` never set); floating on; ripples on; network static apart from nothing following the finger.
  - Still: render one frame (objects at rest, network drawn once), no loop, ripple class removed.
  - `layout()`: unit = `clamp(W/1440, .55, 1.15) * 1.2`; at hero width ≤ 760 use band positions (4 objects in a row above the text, 4 below, order: cloud, logo, printer, bubble / phone, headset, chart, server); otherwise demo-3 positions; then, for each object, if its box (plus 16px) intersects the live `.hero-text` rect, shrink it (down to 0.6 of its size) and then nudge it horizontally outward until clear.
  - The loop pauses when the hero is not intersecting the viewport (IntersectionObserver) or `document.hidden`, and resumes on change.
- [ ] **Step 4: Run** `npm test` — expected all pass.
- [ ] **Step 5: Browser check** (Playwright, real time, not headless virtual time) against `npm start`: at 1440×800 hovering each object adds `.hot`; the cloud's `#scene-puffs use` transforms move away from home when the pointer is inside and return within 3s after `pointerleave`; scrolling the hero out of view stops the frame counter.
- [ ] **Step 6: Commit** `אתר: אנימציות בסצנת עמוד הבית (מחשב: עכבר; מגע: ריחוף; הפחתת תנועה: סטטי)`.

### Task 3: Layout safety across widths

**Files:**
- Test: `scripts/screens.sh` (add the home hero at 1024 and 1280 if not already covered) — no new test file.

- [ ] **Step 1: Browser check** at 1440, 1280, 1024, 800 (mouse) and 390×844 (touch emulation): for every `.obj`, its bounding rect does not intersect `.hero-text`'s rect; no object is more than half outside the hero.
- [ ] **Step 2: Fix positions/sizes** in `hero-scene.js` until Step 1 passes at all widths.
- [ ] **Step 3: Run** `npm test` and `scripts/screens.sh`; review the home screenshots.
- [ ] **Step 4: Commit** `אתר: סצנת עמוד הבית – פריסה בכל הרוחבים`.

### Task 4: Remove the demo pages and show the owner locally

**Files:**
- Delete: `src/hero-demo.njk`, `src/hero-demo.11tydata.js`, `src/hero-demo-2.njk`, `src/hero-demo-2.11tydata.js`, `src/hero-demo-3.njk`, `src/hero-demo-3.11tydata.js`
- Modify: the spec's status line → `approved 2026-11-17`

- [ ] **Step 1: Delete** the demo files; **run** `npm test` — expected all pass and `_site/hero-demo*` absent.
- [ ] **Step 2: Commit** `הדגמות: הסרת עמודי ההדגמה (העיצוב נבחר)`.
- [ ] **Step 3: Run** `npm start` and hand the owner `http://localhost:8080/` to try on desktop and in phone emulation. **Do not push** until the owner approves.
