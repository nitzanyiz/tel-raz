# Home hero: animated scene — design

Date: 2026-11-17
Status: draft, awaiting approval

## 1. Intent

Replace the home page hero (today: a dark photo of the chrome Tel-Raz rings with white text) with a **white, calm, premium animated scene** of soft "clay" 3D objects that stand for what Tel-Raz sells: cloud PBX, desk phones, call center, call transcription, on-site PBX servers, analytics, printing, connectivity. On desktop each object reacts to the mouse in its own way; on phones and tablets the scene floats gently on its own. The headline, subtitle and buttons stay sharp and readable above everything.

The look and behavior were settled through three throwaway demos on the master preview (`/hero-demo/`, `/hero-demo-2/`, `/hero-demo-3/`). **`/hero-demo-3/` is the reference**: this design ships that, with the settings below.

## 2. Goals, non-goals, anti-goals

**Goals**
- The demo-3 scene on the real home hero, with the owner's chosen settings (section 5).
- A layout that works on every screen width, with objects never covering the text.
- Phones and tablets: no touch interaction; gentle constant floating instead.
- A fully still scene for visitors whose system asks for reduced motion.
- The editor's CMS fields (heroTitle, heroSubtitle, the two button texts) keep working unchanged.

**Non-goals**
- Making the objects, their positions or the animations editable in the CMS.
- Sound (the phone "rings" visually only).
- Any change to other pages or to the header/footer.

**Anti-goals (a failure even if it works)**
- Text becoming hard to read, or objects overlapping the text at any width.
- A janky or heavy page: dropped frames on an ordinary laptop, the animation loop running while the hero is off-screen or the tab is hidden, or a noticeable jump in page weight.
- Motion that feels busy rather than calm.
- Anything an editor can do in the CMS breaking the hero.

## 3. Constraints

- Static Eleventy site, plain CSS and vanilla JS, **no new libraries or build steps** (repo convention).
- Hebrew RTL page; the floating glass header overlaps the top of the hero (`main` has a negative top margin and the hero pads by `--header-h`).
- The build fails on dead internal links; `npm test` must stay green.
- `tests/pages.test.js` currently asserts the hero ships `hero.webp` via CSS; that assertion changes with this work.

## 4. Approaches considered

1. **Hand-drawn inline SVG objects, animated with CSS and a small vanilla JS loop** (chosen). Light, sharp at any size, one consistent style in the brand palette, nothing new to install, and quick to iterate. Trade-off: the objects are simple drawings, not detailed illustrations.
2. **Designer-made animations played by a runtime (e.g. Lottie).** Richer motion, but needs a designer for eight animations and adds a ~250KB player.
3. **Real 3D (e.g. three.js).** Most striking, but heavy, slow on weaker machines, a large job, and at odds with "calm and premium".

The owner chose approach 1.

## 5. The design (decided with the owner)

### Look
- **Background:** plain white. No photo, no frosted layer.
- **Style:** soft "clay" 3D — white objects with a soft radial highlight, blue accents (the brand blue `#446ba4` family), and a soft blue-tinted drop shadow. Shadows and accents slightly stronger than a pure pastel clay so the objects hold up on white.
- **The logo** is the rings symbol traced from `logo.png` (text removed), recolored: a graphite band and a pale brand-blue band (the "B" option chosen in the demos).
- **Objects** (eight) plus a background layer:

| Object | Stands for | Desktop interaction |
|---|---|---|
| Cloud | Cloud PBX | Near the mouse it splits into small clouds that flee the cursor; when the mouse leaves they drift back and melt into one cloud ("goo" filter) |
| Desk IP phone | Phones | On hover: rings in bursts (shake), handset lifts, sound arcs, screen brightens |
| Logo symbol | The brand | Strongest depth (parallax); soft signal rings ripple out every few seconds |
| Call-center headset | Call center | On hover: mic glows, sound waves pulse from the ear cup |
| Speech bubble | Call transcription | On hover: the sound wave shrinks away and turns into lines of text |
| PBX server | On-site PBX | On hover: LEDs light up in a chase |
| Bar chart | iPECS Analytics | On hover: bars grow from zero |
| Printer | Office / printing | On hover: pages slide out one after another |
| Network of dots (canvas, behind everything) | Connectivity | Faint dots and lines; dots near the cursor link to it with thin lines |

### Desktop behavior (devices with a mouse: `(hover: hover) and (pointer: fine)`)
- Object size **120%** of the demo's base sizes.
- Logo signal rings **on**. Network of dots **on**. Constant floating **off**.
- Depth/parallax on every object, logo strongest, strength **40px** (the demo default); eases back to rest when the mouse leaves the hero.
- Each object's own hover animation, as in demo 3.

### Phones and tablets (no mouse)
- Decided by input type, not width: any device without a fine hovering pointer.
- **No touch interaction at all:** no tap animations, no parallax, no lines following the finger, the cloud never splits.
- **Constant floating on:** each object drifts slowly around its spot at its own pace, with a slight tilt.
- Logo signal rings and the network of dots stay as gentle background motion (dots don't link to the finger).

### Layout
- **Wide screens:** objects around the edges of the hero, as in demo 3 (cloud top-left, printer top-left-center, logo top-center, speech bubble top-right, server right, chart bottom-right, headset bottom-left-center, phone left). The text block sits in the center.
- **Medium widths:** objects scale with the hero and keep clear of the text block. If an object's box would intersect the text block (with a margin), it is shrunk or nudged outward. No overlap at any width.
- **Narrow screens (phone layout, by width, about ≤ 760px):** the hero is taller; four objects sit in a band above the text and four in a band below, smaller. All eight stay. The cloud is shown whole.
- A narrow window on a computer with a mouse gets the phone layout with desktop behavior.

### Reduced motion
- `prefers-reduced-motion: reduce` → a completely still scene on every device (no floating, ripples, parallax, hover animations or network motion; the dots are drawn once).

### Accessibility and content
- The scene is decorative: `aria-hidden`, nothing focusable, no pointer cursor changes.
- The h1, subtitle and buttons keep their markup, content source (`home.*` from the CMS) and behavior; they sit above the scene.

## 6. Build notes (for the implementer)

- Markup in an include (e.g. `src/_includes/partials/hero-scene.njk`) used by `src/index.njk`; the traced logo symbol as an inline SVG `<symbol>`.
- Styles in `site.css` (replacing the photo hero rules); the scene script as its own deferred file loaded only on the home page.
- One `requestAnimationFrame` loop drives parallax, the cloud, floating and the network; it pauses when the hero is off-screen (IntersectionObserver) or the tab is hidden. Per-object hover animations are CSS, toggled by a class.
- Desktop vs touch via `matchMedia('(hover: hover) and (pointer: fine)')`, re-evaluated on change.
- The old `hero.png` / `hero.webp`: drop the CSS reference; delete the files if nothing else needs them (the gallery test uses the path as fixture data; check before deleting).
- Tests: replace the `hero.webp` assertion with checks that the home page renders the scene (decorative, `aria-hidden`), keeps the h1/subtitle/buttons from `home.json`, and that the script is only loaded on the home page.
- Verify in a real browser at desktop widths (1440, 1280, 1024) and phone width (390, touch emulation), plus reduced motion. Headless "virtual time" doesn't run `requestAnimationFrame`, so motion checks need a real browser session.

## 7. Calls made by Claude (owner may override)

- The three demo pages are **removed** in the same change that ships the real hero, since the decision is made.
- The phone layout breakpoint (~760px) and exact object positions are tuned during the build, starting from demo 3.
- The network of dots is drawn at about one dot per 16,000 px² of hero area.

## 8. Left to the builder

Exact sizes, positions, easing constants and timing, within the look and behavior above.
