# Contact Form CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phone-ring "דברו איתנו" button, "✓ נשלח!" send feedback and a staggered entrance for the contact form, in its three places.

**Architecture:** Markup changes in `partials/contact-form.njk` and the three sections that hold it; CSS in `site.css`; behavior in a new `src/assets/js/contact-form.js` (ring liveness + background send) and a small reveal block in `site.js`. The pure parts of the send (`encode`, `send`) are exported for Node tests, the same pattern as `form-validation.js`.

**Tech Stack:** Eleventy 3 + Nunjucks, plain CSS/JS, `node --test` + cheerio build tests, Netlify Forms.

**Spec:** `docs/superpowers/specs/2026-11-21-contact-cta-design.md`

## Global Constraints
- Ring: 3.2 s cycle, icon ±18°, button ±2px / ±1.5°, keyframes exactly as `d-ring` / `d-buzz` in `src/cta-demo.njk`.
- Ring live only when the form is ≥ 40% visible: `animation-iteration-count: 3` (≈ 10 s), restarted each time the form re-enters view (toggle `is-live`). Stops for good after a successful send.
- Focus inside the form → `animation: none` (plain button). Focus leaves with all fields empty → 3 new rings.
- Entrance: `translateY(18px)` + opacity, 0.6 s ease, delay `var(--i) * 90ms`, once per page view, threshold 0.25.
- Copy: sending "שולח...", success "✓ נשלח!", success announcement (screen readers only) "הפנייה נשלחה. נחזור אליכם בהקדם.", failure "השליחה נכשלה. נסו שוב, או התקשרו אלינו: {{ site.phoneDisplay }}" with the phone as `<a href="tel:{{ site.phoneDial }}" dir="ltr">`.
- Success: button green `#1d8a4e`, disabled, form reset; after 4 s back to "דברו איתנו", ring stays off.
- Content is never hidden without JS: the hidden-before-entrance state requires `html.js`, set by an inline script in `<head>`.
- `prefers-reduced-motion: reduce` → the existing global rule in `site.css` already removes animation/transition; nothing may depend on an animation ending.
- Service-call form: unchanged (keeps validation, keeps posting to `/thanks/`).

## Review Focus
- Double click on send → only one POST (button disabled while sending).
- Invalid form → validation messages, no POST, no spinner (`contact-form.js` must ignore a submit whose `defaultPrevented` is true).
- Local dev server can't receive POSTs → a local real send shows the failure line; that is expected, success is checked on the preview.
- Send fails (offline / 4xx / 5xx) → button back to "דברו איתנו", failure message with phone shown, typed values kept.
- Visitor with JS but page loaded scrolled past the section (reload mid-page) → content is visible, not stuck at opacity 0.
- Three forms on one page? Never (one per page), but code must not assume ids: work per `form[name="contact"]`.

---

### Task 1: Background send (pure part)

**Files:**
- Create: `src/assets/js/contact-form.js`
- Test: `tests/contact-form.test.js`

**Interfaces:**
- Produces: `encode(entries: Iterable<[string,string]>) => string` (URL-encoded body); `send(entries, fetchImpl = fetch) => Promise<boolean>` (POST to `"/"` with `Content-Type: application/x-www-form-urlencoded`; `true` only for `res.ok`, `false` for non-ok or a thrown error). Module exports `{ encode, send }` in Node; in the browser it calls `init(document)` (Task 3).

- [ ] **Step 1: Write the failing tests** — `encode([["form-name","contact"],["name","דני כהן"]])` equals `"form-name=contact&name=%D7%93%D7%A0%D7%99+%D7%9B%D7%94%D7%9F"`; `send` with a fake fetch returning `{ok:true}` → `true`, and the fake received `("/", {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body})`; `{ok:false}` → `false`; fake that rejects → `false`.
- [ ] **Step 2: Run** `node --test tests/contact-form.test.js` — expect FAIL (module not found).
- [ ] **Step 3: Implement** with the same UMD wrapper as `form-validation.js`; `encode` via `URLSearchParams`.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `אתר: שליחת טופס יצירת הקשר ברקע – בסיס`.

### Task 2: Markup – button, status line, entrance hooks, scripts

**Files:**
- Modify: `src/_includes/partials/contact-form.njk`, `src/index.njk:64-71`, `src/_includes/layouts/contact.njk:16-19`, `src/_includes/layouts/content.njk:21-26`, `src/_includes/layouts/base.njk`
- Test: `tests/forms.test.js`

**Interfaces:**
- Produces (used by Tasks 3–4): button `button.cta-btn` containing `span.cta-ico` (the `icons.icon("phone")` SVG), `span.cta-spin` (empty, `aria-hidden`), `span.cta-label` ("דברו איתנו"); inside the form, after the button, `p.form-error[hidden]` holding the failure copy (phone as `tel:` link) and an empty `p.form-status.visually-hidden[role=status]` for the success announcement (add a `.visually-hidden` utility to `site.css` if none exists); each of the three sections gets `data-reveal`, and its title / text / form wrapper get `class="reveal" style="--i:N"` (0,1,2; contact page: h2=0, form=1); `<head>` gets `<script>document.documentElement.classList.add("js")</script>` before the stylesheet; `contact-form.js` loaded `defer` after `form-validation.js`.

- [ ] **Step 1: Write failing tests** in `tests/forms.test.js`: on `/`, `/contact/` and one content page with the form, `form[name=contact] .cta-btn .cta-ico svg` exists, `.cta-label` text is "דברו איתנו", `.form-error a[href^="tel:"]` text is "09-7601760", `.form-status[role=status]` exists, the section has `[data-reveal]` with ≥ 2 `.reveal` children; base has the inline `js` class script and `script[src="/assets/js/contact-form.js"]`; service-call submit button has no `.cta-btn`. Keep the existing "דברו איתנו" assertion passing.
- [ ] **Step 2: Run** `npm test` — expect the new tests FAIL.
- [ ] **Step 3: Implement** the markup above.
- [ ] **Step 4: Run** `npm test` — expect all PASS.
- [ ] **Step 5: Commit** `אתר: כפתור יצירת קשר – סימון לצלצול, סטטוס שליחה וכניסה מדורגת`.

### Task 3: Ring + send behavior

**Files:**
- Modify: `src/assets/js/contact-form.js` (add `init`), `src/assets/css/site.css` (contact strip / forms section)

**Interfaces:**
- Consumes: Task 1 `send`, Task 2 markup.
- Produces: form classes `is-live`, `is-engaged`, `is-done`; button classes `is-sending`, `is-sent`.

- [ ] **Step 1: CSS** — port from `src/cta-demo.njk`: `.cta-btn{position:relative}`, `.cta-ico` sizing (20px, shown always), `d-ring`/`d-buzz` keyframes on `.is-live .cta-ico` / `.is-live .cta-btn` with `animation-iteration-count: 3`, `.is-engaged`/`.is-done` → `animation:none !important`, `.is-sending .cta-spin` spinner (hide `.cta-ico` while sending/sent), `.is-sent` green. Failure line style `.form-error` (red `#b42318`; `#ffc4ba` in `.contact-strip`; on the one-row strip it spans the whole row: `grid-column: 1 / -1`).
- [ ] **Step 2: JS `init(doc)`** for each `form[name="contact"]`: IntersectionObserver (0.4) toggles `is-live` (removing and re-adding the class restarts the 3 rings); `focusin` → `is-engaged`; `focusout` (focus left the form, all fields empty) → remove `is-engaged`. A `submit` listener on `document` (so validation's form-level listener runs first): ignore if `e.defaultPrevented` or not a contact form; else `preventDefault`, disable button, `is-sending` + "שולח...", `await send(new FormData(form))`; ok → `is-sent` + "✓ נשלח!", status line text = success announcement, `form.reset()`, `is-done`, after 4000 ms restore label and enable; fail → restore button, show `.form-error`. Hide `.form-error` again on the next submit.
- [ ] **Step 3: Verify in the browser** (`npm start`, playwright-core against `http://localhost:8080`): ring visible on `/`, `/contact/`, a content page; after ~10 s the button is still (computed `animation-name` ends / no transform); scroll away and back → rings again; focus → computed `animation-name` of button and icon is `none`, transform `none`; empty submit → Hebrew errors, no POST; valid submit with `/` POST routed to 200 → spinner then "✓ נשלח!", exactly one POST, fields cleared; routed to 500 → failure line with phone, values kept; service-call still navigates to `/thanks/`.
- [ ] **Step 4: Run** `npm test` — all PASS.
- [ ] **Step 5: Commit** `אתר: כפתור "דברו איתנו" מצלצל ושליחה עם אישור ✓ נשלח`.

### Task 4: Staggered entrance

**Files:**
- Modify: `src/assets/js/site.js` (new IIFE at the end), `src/assets/css/site.css`

**Interfaces:**
- Consumes: Task 2 `[data-reveal]`, `.reveal`, `html.js`.

- [ ] **Step 1: CSS** — `.js [data-reveal] .reveal{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s ease;transition-delay:calc(var(--i,0)*90ms)}` and `.js [data-reveal].is-in .reveal{opacity:1;transform:none}`.
- [ ] **Step 2: JS** — IntersectionObserver (threshold 0.25) adds `is-in` once and unobserves; if `IntersectionObserver` is missing, add `is-in` to all at once.
- [ ] **Step 3: Verify in the browser**: sections start hidden below the fold and rise in order; reload scrolled to the bottom → strip visible; with `reducedMotion: "reduce"` → content visible immediately; JS disabled → content visible.
- [ ] **Step 4: Run** `npm test` — all PASS.
- [ ] **Step 5: Commit** `אתר: כניסה מדורגת לאזור "רוצים לשמוע עוד?"`.

### Task 5: Remove the demo, ship to preview

**Files:**
- Delete: `src/cta-demo.njk`, `src/cta-demo.11tydata.js`
- Modify: `docs/superpowers/specs/2026-11-21-contact-cta-design.md` (status line: implemented), `docs/developer-setup.md:20` (forms: the contact form sends in the background and shows ✓; `/thanks/` is only the no-JS fallback; the service-call form still redirects there)

- [ ] **Step 1:** Delete the demo files; run `npm test` — all PASS; `/cta-demo/` no longer built.
- [ ] **Step 2: Commit** `הדגמות: הסרת עמוד הדגמת הכפתור (העיצוב נבחר)` together with this plan and the spec.
- [ ] **Step 3:** `git pull --rebase` and push master; check `https://master--tel-raz.netlify.app/` (ring, entrance) and send one real test from `/contact/` — expect "✓ נשלח!" and a "[בדיקה]" email. Also look at it once on a phone (iOS Safari): ring, entrance, error messages on the one-column strip.
