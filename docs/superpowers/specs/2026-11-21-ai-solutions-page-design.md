# "פתרונות שירותי AI" page: three animated sections — design

Date: 2026-11-21
Status: draft, waiting for the owner's approval

## 1. Intent

The AI solutions page (today `src/pages/call-transcription.md`, address `/call-transcription/`; moving to `/ai-solutions/`, see section 5; menu: שירותים › פתרונות מתקדמים › פתרונות שירותי AI) is today a short placeholder about transcription only. The owner wants it to present Tel-Raz's three AI offerings in a way that is "cooler than just text": three sections, each with its points as text on the right and, on the left, a looping animation that shows what that product does.

The content comes from three WhatsApp screenshots the owner placed in the repo root (section 7). The look and the animations were chosen with the owner through mockups on the brainstorming companion (section 6).

## 2. Goals, non-goals, anti-goals

**Goals**
- Three sections on the page, in this order:
  1. ניתוח שיחות באמצעות iPECS Cloud – AI
  2. בוט קולי חכם – שירות לקוחות אוטומטי מבוסס AI
  3. שירות זמין וחכם יותר (the benefits of the voice bot)
- Each section: title, optional short line under it, the points as cards with icons (style "B"), and the section's animation beside them.
- The editor can change all the text in the CMS: titles, short lines, card keywords, explanations and icons. They can also add, remove and reorder cards.
- The animations loop and feel calm and premium, in the same family as the home hero.

**Non-goals**
- Editing or choosing animations in the CMS (they are fixed in code, one per section).
- Adding or removing whole sections in the CMS (there are exactly three, each tied to its animation).
- Reusing this block on other pages.
- Changing the page's menu position.

**Anti-goals (a failure even if it works)**
- Text that is hard to read, or an animation that crowds or overlaps the text at any width.
- A heavy or janky page: animation loops running while off-screen or in a hidden tab, or a noticeable jump in page weight.
- Motion that feels busy or childish rather than calm.
- Anything the editor can do in the CMS breaking the page (an empty field, a removed card, a reordered card).
- The page's form in the CMS losing fields because a different, generic form saved over it.

## 3. Constraints

- Static Eleventy site, plain CSS and vanilla JS, **no new libraries or build steps** (repo convention).
- Hebrew RTL. Heebo font, colors from `site.css` `:root` (`--navy`, `--blue`, `--blue-dark`, `--bg`, `--border`, `--muted`, …).
- CMS is Sveltia (`src/admin/config.yml`). All pages live in `src/pages/`. Two folder collections filter that folder: `pages` (`system: false`, generic content form) and `system_pages` (`system: true`, generic text-and-menu form). A hidden `all_pages` collection lists every page for the "קישור לעמוד" dropdowns.
- Routing: `src/pages/pages.11tydata.js` gives every page `layouts/content.njk` and `/<file-name>/`. A page that needs its own layout gets a `<file-name>.11tydata.json` next to it (as `contact`, `guides`, `service-call` do).
- `base.njk` loads a per-page deferred script from front matter `pageScript` (used by the home hero).
- The build fails on dead internal links; `npm test` must stay green. Verifying uses the `test-site` skill.

## 4. Approaches considered

1. **A dedicated page with its own CMS form (chosen).** The page gets its own layout and its own CMS entry with fields made for it: title, intro, three sections, and cards with an icon picker. The animations are fixed in code, one per section. The script is loaded only on this page. Trade-off: the editor can't delete the page or change its address, like the other system pages.
2. **A reusable "animated sections" block on every content page**, with a "which animation" dropdown per section. Adds fields every page's form would show but only one page uses. These animations are product-specific, so there's little real reuse.
3. **Keep the content in the markdown body with shortcodes** (`{% section %}…`). Fragile for an editor: one wrong character breaks the page.

The owner chose approach 1.

## 5. The design (decided with the owner)

### Address
The page moves from `/call-transcription/` to **`/ai-solutions/`** (owner's decision): the file becomes `src/pages/ai-solutions.md`, and the home page card that links to it (`src/content/home.json`, `"link": "call-transcription"`) is updated. A permanent (301) redirect from `/call-transcription/` to `/ai-solutions/` goes in `src/_redirects`, so old links and Google results keep working.

### Page structure
- The usual page banner: breadcrumbs, `title`, `intro`.
- Three sections, stacked, each a white card (like `.prose`: white, border, radius, soft shadow) laid out in two columns. **Text on the right** (first in RTL), **animation on the left**.
  - Text column: the section title (`h2`), the optional short line in brand blue, bold, then the cards.
  - The cards (style "B"): a 2-column grid of small light-grey (`--bg`) cards. Each has a small white rounded-square icon chip with a blue stroke icon, the keyword in bold navy, and the explanation in muted grey.
  - A section can have more than one group of cards, each with an optional small heading. Section 1 uses this: 4 cards, then the heading "איתור מידע וייעול תהליכי עבודה" and 3 more cards.
- The contact form at the bottom ("רוצים לשמוע עוד?"), as on other content pages.

### Narrow screens
*(Claude's call)* Below about 820px the two columns stack: the text first, then the animation, full width. Cards go to one column on phones (about ≤ 520px).

### The bot's look in all animations
The bot is a **white sparkle (✦ and a small ✧) on a brand-blue gradient circle**, gently twinkling. The customer is a blue person icon on a white "clay" circle. The human agent is a person with a headset on a white clay circle. Avatar labels: "לקוח", "בוט AI", "נציג". The stage background is a soft white-to-pale-blue radial gradient with a faint dot grid, as in the mockups.

### Section 1 animation — "Sound becomes text" (mockup 1C)
Plays in order, then fades and repeats:
1. A white strip appears. On its right half a sound wave of animated bars (the customer speaking). In the middle a glowing vertical AI line with the sparkle badge. On its left half the words appear one by one, as if the sound comes out of the line as text: "היי, המשלוח שלי עוד לא הגיע. אפשר לבדוק?"
2. The wave stops. Three tiles open one after another:
   - **סיכום** (full width): "הלקוח מברר על משלוח שהתעכב ומבקש בדיקה."
   - **סנטימנט:** a half-circle dial (red, yellow, green) whose needle swings with a slight overshoot and settles on the positive side.
   - **משימה:** a checkbox that gets ticked green next to "לבדוק סטטוס משלוח ולחזור ללקוח".
3. Hold about 3s, fade, repeat. Loop about 10s.

### Section 2 animation — the voice bot conversation (mockup "section-layout-v3", bot icon swapped to the sparkle)
- The customer avatar is at the top right, the bot avatar at the top left. A dashed "call line" joins them. A dot runs along the line from the speaker to the listener. The speaker's avatar grows slightly and gets pulsing rings.
- The chat below, with customer bubbles (white) on the right and bot bubbles (blue gradient) on the left:
  1. Customer: a voice bubble (microphone icon and animated sound bars).
  2. Customer: "אפשר לקבוע תור ליום שלישי?" (what the AI heard).
  3. Bot: typing dots, then "בטח! יש מקום ביום ג׳ ב־10:00".
  4. Customer: "מעולה, מתאים לי!"
  5. Bot: a calendar card pops in (date "14", "יום ג׳, 10:00", "התור נקבע") with a green ✓.
- Hold, fade, repeat. Loop about 10.5s.

### Section 3 animation — "Hand-off with the full story" (mockup 3E)
- Three avatars in a row joined by a dashed line: customer (right), bot (middle), agent (left, dimmed until it takes the call).
- Plays in order:
  1. Customer, speaking: "חייבו אותי פעמיים על אותה חשבונית".
  2. Bot, speaking: "אני מעביר אותך לנציג מחלקת חשבונות, עם כל הפרטים".
  3. A small summary card pops up at the bot ("✦ סיכום להעברה · יוסי ל. · חשבונית 4471 · חויב פעמיים, מבקש זיכוי"). It travels along the line to the agent and disappears into them. The agent lights up.
  4. Agent, speaking (green bubble): "שלום יוסי, אני רואה את החיוב הכפול – כבר מטפל בזיכוי".
  5. A green chip: "✓ בלי לחזור על הפרטים".
- Hold, fade, repeat. Loop about 10s.

### Motion behavior (all three)
- Each animation loops from the beginning, starting when its section scrolls into view. It pauses when off-screen (IntersectionObserver) or the tab is hidden, and restarts from the beginning when it comes back. *(Claude's call: whether they should loop at all, or play once on scroll, is to be revisited by the owner once the page is built.)*
- No mouse or touch interaction.
- `prefers-reduced-motion: reduce`: no motion. Each animation shows its finished state as a still picture: all bubbles and tiles shown, the dial settled, the ✓ ticked.
- The animations are decorative: `aria-hidden="true"`, nothing focusable. The Hebrew inside them is fixed in code. The real content is the section text.

### CMS (the editor's form)
- The page gets its own entry in the CMS with a form made for it. Fields:
  - כותרת העמוד, משפט פתיחה
  - three sections (a fixed set of three, not addable or removable). Each has:
    - כותרת
    - שורה קצרה (optional)
    - groups of cards. Each group has an optional heading and a list of cards, each with מילת מפתח, הסבר and an icon chosen from a fixed list.
  - הצגת טופס יצירת קשר, תפריט and the SEO fields, as on other pages
- The section's animation is not in the form. Section 1 always shows animation 1, and so on.
- Card icons, chosen from a fixed list of stroke icons in the site's icon style: microphone, transcript (text lines), summary (document), sentiment (smiley), insight (light bulb), search, fast review (fast-forward), anywhere (devices), calendar, payment (card), automation (gear), 24/7 (clock), routing (split arrows), service (heart or star). A card with no icon chosen gets a default.
- The page must not appear in the generic `pages` or `system_pages` forms, since saving through them would drop its section fields. It stays visible to `all_pages`, so other pages can still link to it.

### Content (from the screenshots)

**Section 1 — ניתוח שיחות באמצעות iPECS Cloud – AI** (no short line)
- תמלול: המרת הקלטות שיחה לטקסט מלא, המאפשר תיעוד וחיפוש מידע ללא צורך בהאזנה להקלטה. *(icon: transcript)*
- סיכום: הפקת סיכומים אוטומטיים ותמציתיים הכוללים את עיקרי השיחה ונקודות חשובות להמשך טיפול. *(summary)*
- ניתוח והבנה: ניתוח תוכן השיחה וזיהוי סנטימנט הלקוח – חיובי, ניטרלי או שלילי – להבנת חוויית השירות. *(sentiment)*
- תובנות ופעולות: זיהוי פעולות נדרשות והפקת תובנות המסייעות בשיפור תהליכי העבודה והשירות. *(insight)*
- group heading **איתור מידע וייעול תהליכי עבודה**:
  - חיפוש לפי מילות מפתח: חיפוש מהיר לאיתור שיחות ונושאים ספציפיים מתוך תמלולי השיחות. *(search)*
  - סקירה מהירה: סקירת סיכומים ותמלולים במקום האזנה להקלטות מלאות, לחיסכון בזמן ולייעול תהליכי הבקרה. *(fast review)*
  - זמינות מכל מקום: גישה למידע, לתמלולים ולסיכומים מממשקי iPECS ONE ו־iPECS Analytics, בהתאם להרשאות ולתצורת המערכת. *(anywhere)*

**Section 2 — בוט קולי חכם – שירות לקוחות אוטומטי מבוסס AI**, short line: משיחה לפעולה – באופן אוטומטי
- עוזר קולי חכם: ניהול שיחות טבעיות עם לקוחות, הבנת בקשות ומתן מענה קולי חכם בזמן אמת. *(microphone)*
- קביעת תורים: בדיקת זמינות ביומן, הצעת מועדים וקביעת תורים באופן אוטומטי. *(calendar)*
- תשלומים וגבייה: ביצוע תהליכי תשלום וגבייה באמצעות חיבור למערכות סליקה תומכות. *(payment)*
- אוטומציה: ביצוע פעולות ועדכון מערכות הארגון בהתאם לבקשות הלקוח ולתהליכים שהוגדרו. *(automation)*

**Section 3 — שירות זמין וחכם יותר** (no short line)
- זמינות מסביב לשעון: מתן מענה ללקוחות גם מחוץ לשעות הפעילות של העסק. *(24/7)*
- ניתוב חכם: ניתוב פניות לגורם המתאים והעברת השיחה לנציג אנושי כאשר נדרש טיפול נוסף. *(routing)*
- חוויית שירות משופרת: קיצור זמני המתנה, הפחתת עומס מצוותי השירות והענקת חוויית שירות מהירה ונוחה. *(service)*

The line "ההמלצה שלי: …" at the bottom of the third screenshot is the writer's layout advice, not page text. It is left out.

**Page title and intro** *(Claude's call, the editor can change them)*: title stays "פתרונות ושירותי AI". New intro: "ניתוח שיחות חכם, בוט קולי שמטפל בלקוחות ושירות זמין מסביב לשעון – פתרונות AI שעובדים בשבילכם." SEO title: "פתרונות AI לעסקים – ניתוח שיחות ובוט קולי". SEO description updated to cover all three. The old body ("למה לתמלל שיחות?" and the `[למילוי…]` placeholder) is removed.

## 6. References

Mockups (local only, `.superpowers/` is git-ignored), under `.superpowers/brainstorm/91427-1795294299/content/`:
- `section-layout-v3.html`: the section layout (option B) and the voice bot animation (with the old robot icon)
- `animation-concepts-2.html`: the bot icon options ("Sparkle on blue" chosen) and section 1 animation **C**
- `section3-round3.html`: section 3 animation **E**

## 7. Source images

The three screenshots in the repo root are renamed to say what they hold and moved to `docs/superpowers/specs/assets/ai-solutions/`, so they stay with this design as the source of the text *(Claude's call)*:
- `WhatsApp Image 2026-11-21 at 22.32.49.jpeg` → `ai-call-analysis.jpeg`
- `WhatsApp Image 2026-11-21 at 22.33.16.jpeg` → `ai-voice-bot.jpeg`
- `WhatsApp Image 2026-11-21 at 22.33.45.jpeg` → `ai-smart-service.jpeg`

## 8. Left to the builder

- How the page is wired to its own CMS form and kept out of the generic forms (for example a Sveltia `files` collection for this one file plus a front-matter flag that both folder filters exclude). The build must not drop the page from `all_pages`.
- Field names, the icon names, and how a missing icon or an empty group falls back.
- Markup structure, class names, exact sizes, easing and timing within the look above, and whether each animation is CSS-driven, JS-driven or both.
- Tests: the page renders three sections with the text from front matter, each with its decorative animation (`aria-hidden`); the script loads only on this page; the CMS config has the new form and the page stays out of the generic forms. Also update any existing test that assumed this page used the content layout.
- Verify in a real browser at desktop (1440, 1024) and phone (390) widths, plus reduced motion, using the `test-site` skill.
