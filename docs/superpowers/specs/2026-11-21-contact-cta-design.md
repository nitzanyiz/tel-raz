# Contact form CTA – design

**Status:** chosen by the client from the `/cta-demo/` page (2026-11-21); implemented 2026-11-21.

## Intent
Make the short contact form ("רוצים לשמוע עוד?") draw the eye and feel alive, in the
spirit of a communications company, without being pushy or annoying.

## What was chosen
1. **Phone-ring button** (demo option "א. צלצול טלפון"): the "דברו איתנו" button carries a
   phone icon; every 3.2 s the icon rings (±18°) and the button buzzes slightly, twice, then rests.
2. **"✓ נשלח!" feedback** (demo "טוען ← ✓ נשלח"): on a valid send the label becomes a spinner
   + "שולח...", then the button turns green with "✓ נשלח!".
3. **Staggered entrance** (demo "כניסה מדורגת"): the title, the text line and the form rise in
   one after another (90 ms apart, 0.6 s each) the first time the section scrolls into view.

All three apply in the three places the contact form appears: the home page strip, the
contact page, and the bottom of content pages. The service-call form is not changed.

## Rules (from the discussion)
- The ring runs only while the form is on screen (≥ 40% visible).
- Focus inside the form → the button returns at once to its plain, still state (no frozen tilt).
  Leaving the form without typing anything → the ring starts again.
- The ring rings **3 times** (3 × 3.2 s ≈ 10 s) each time the form comes into view, then rests.
  Scrolling away and back → 3 new rings. Stops for good after a successful send.
- "Reduce motion" users: no ring, no entrance (content simply shown), no spinner motion.
- Without JavaScript: no hidden content, the form posts to `/thanks/` as today.

## Approaches for sending (for the "✓ נשלח!" state)
- **A. Send in the background, stay on the page (chosen 2026-11-21):** `fetch` POST
  to Netlify, show ✓, clear the form. Needed for the ✓ to be seen at all.
- B. Spinner, then go to `/thanks/` as today: no ✓ state, so not what was chosen.
- C. Show ✓ for ~1.5 s, then go to `/thanks/`: both, but slower and the ✓ is barely seen.

On success a screen-reader-only status line announces "הפנייה נשלחה. נחזור אליכם בהקדם." (the button text alone is not announced).
On failure (network / server error) the button returns and a visible message under it says:
"השליחה נכשלה. נסו שוב, או התקשרו אלינו: {phone}" (the phone is a `tel:` link). `/thanks/` stays only as the no-JS target. No tracking exists today; if ads are added later, a conversion event can fire on the success state.

## Not in scope
Section waves, other button variants, any change to the service-call form's sending.
The `/cta-demo/` page is removed at the end (the choice is made).
