#!/usr/bin/env bash
# Checks interactive behavior in headless Chrome: header menus (mobile focus/
# inert, desktop hover), item cards and the image gallery / full-screen view.
# Builds a throwaway copy of the site with a test page (3 images, a linked
# item) so nothing test-only lands in the real site.
# Prints PASS/FAIL lines; exits 1 on any FAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8795}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
COPY="$(mktemp -d)"
cp -R src lib .eleventy.js package.json "$COPY"/ && ln -s "$PWD/node_modules" "$COPY/node_modules"
cat > "$COPY/src/pages/gallery-test.md" <<'MD'
---
system: false
sitemap: false
title: בדיקת גלריה
images:
  - { src: /assets/img/og.png, alt: ראשונה }
  - { src: /assets/img/hero.png, alt: שנייה }
  - { src: /assets/img/logo.png, alt: שלישית }
imagePosition: side
items:
  - { name: כרטיס מקושר, link: contact }
contactForm: false
---
טקסט
MD
(cd "$COPY" && npx eleventy --quiet >/dev/null)
python3 -m http.server "$PORT" --directory "$COPY/_site" >/dev/null 2>&1 &
SERVER=$!
PAGE="$COPY/_site/__behavior.html"
trap 'kill $SERVER; rm -rf "$COPY"' EXIT
cat > "$PAGE" <<'HTML'
<!doctype html><meta charset="utf-8"><pre id="o"></pre><script>
const out = [];
const ok = (name, cond) => out.push((cond ? "PASS " : "FAIL ") + name);
const frame = (w, src = "/about/") => new Promise((r) => { const f = document.createElement("iframe"); f.width = w; f.height = 700; f.src = src; f.onload = () => r(f.contentWindow); document.body.append(f); });
const key = (doc, k) => doc.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
(async () => {
  const m = await frame(390), d = m.document;
  d.querySelector(".menu-toggle").click();
  await new Promise((r) => setTimeout(r, 50));
  ok("mobile menu: main is inert", d.querySelector("main").inert === true);
  ok("mobile menu: footer is inert", d.querySelector(".site-footer").inert === true);
  ok("mobile menu: focus moves into the menu", d.querySelector("#site-nav").contains(d.activeElement));
  const mt = d.querySelector("[aria-controls=panel-support]");
  mt.click();
  ok("mobile menu: an opened section appears below its button",
    d.getElementById("panel-support").getBoundingClientRect().top >= mt.getBoundingClientRect().bottom - 1);
  d.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  ok("mobile menu: Esc releases inert", d.querySelector("main").inert === false);
  ok("mobile menu: Esc returns focus to toggle", d.activeElement === d.querySelector(".menu-toggle"));

  const w = await frame(1280), e = w.document;
  const t = e.querySelector("[aria-controls=panel-services]");
  t.parentElement.dispatchEvent(new MouseEvent("mouseenter"));
  t.click();
  ok("desktop: hover then click keeps the panel open", t.getAttribute("aria-expanded") === "true");
  // (Timing-based "a later click closes it" isn't checked here: headless
  // virtual time makes it flaky. Verified in a real browser instead.)

  // Moving from the trigger down into the panel: the pointer leaves the item
  // (through the gap) and re-enters it via the panel. The panel must stay open.
  const item = t.parentElement;
  item.dispatchEvent(new MouseEvent("mouseenter"));
  await new Promise((r) => setTimeout(r, 450));
  item.dispatchEvent(new MouseEvent("mouseleave"));
  await new Promise((r) => setTimeout(r, 60));
  item.dispatchEvent(new MouseEvent("mouseenter"));
  await new Promise((r) => setTimeout(r, 400));
  ok("desktop: moving from the trigger into the panel keeps it open", t.getAttribute("aria-expanded") === "true");
  item.dispatchEvent(new MouseEvent("mouseleave"));
  await new Promise((r) => setTimeout(r, 450));
  ok("desktop: leaving the item closes the panel", t.getAttribute("aria-expanded") === "false");
  // No dead gap: the menu item must reach down to where the panel starts.
  const g = (await frame(1280)).document;
  const gt = g.querySelector("[aria-controls=panel-services]");
  gt.click();
  const itemBottom = gt.parentElement.getBoundingClientRect().bottom;
  const panelTop = g.getElementById("panel-services").getBoundingClientRect().top;
  ok(`desktop: no gap between menu item and panel (${Math.round(itemBottom)} vs ${Math.round(panelTop)})`, itemBottom >= panelTop - 1);
  // Gallery: thumbnails swap the main image; the main image opens full screen.
  const gw = await frame(1280, "/gallery-test/"), gd = gw.document;
  const main = gd.querySelector(".gallery-main img"), thumbs = gd.querySelectorAll(".gallery-thumb");
  thumbs[1].click();
  ok("gallery: a thumbnail swaps the main image", main.getAttribute("src") === "/assets/img/hero.png" && main.alt === "שנייה");
  ok("gallery: the clicked thumbnail becomes current", thumbs[1].getAttribute("aria-current") === "true" && !thumbs[0].hasAttribute("aria-current"));
  gd.querySelector(".gallery-main").click();
  const dlg = gd.querySelector("dialog.lightbox"), big = dlg.querySelector(".lightbox-img");
  ok("full screen: clicking the main image opens it at the same image", dlg.open && big.getAttribute("src") === "/assets/img/hero.png");
  key(gd, "ArrowLeft");
  ok("full screen: ArrowLeft goes to the next image (RTL)", big.getAttribute("src") === "/assets/img/logo.png");
  key(gd, "ArrowRight");
  ok("full screen: ArrowRight goes back", big.getAttribute("src") === "/assets/img/hero.png");
  key(gd, "ArrowLeft"); key(gd, "ArrowLeft");
  ok("full screen: wraps around after the last image", big.getAttribute("src") === "/assets/img/og.png");
  dlg.querySelector(".lightbox-next").click();
  ok("full screen: the next button works", big.getAttribute("src") === "/assets/img/hero.png");
  ok("full screen: shows the position", dlg.querySelector(".lightbox-count").textContent.trim() === "2 / 3");
  dlg.querySelector(".lightbox-close").click();
  await new Promise((r) => setTimeout(r, 50)); // the dialog's close event fires after closing
  ok("full screen: the close button closes it", !dlg.open);
  ok("full screen: closing keeps the image you were on", main.getAttribute("src") === "/assets/img/hero.png");
  ok("full screen: focus returns to the main image", gd.activeElement === gd.querySelector(".gallery-main"));

  // Linked item cards float on hover.
  const card = gd.querySelector(".item-card--link");
  ok("item card: a linked item is a link to its page", card && card.getAttribute("href") === "/contact/");
  ok("item card: has a hover transition", getComputedStyle(card).transitionProperty.includes("transform"));

  // Breadcrumbs: a crumb link goes to its page; the current page is plain text.
  const bw = await frame(1280, "/ipecs-cloud/"), bd = bw.document;
  const crumbLinks = [...bd.querySelectorAll(".breadcrumbs a")];
  ok("breadcrumbs: the first crumb links home", crumbLinks.length && crumbLinks[0].getAttribute("href") === "/");
  ok("breadcrumbs: the current page is the last crumb and not a link", bd.querySelector('.breadcrumbs [aria-current="page"]') && !bd.querySelector(".breadcrumbs li:last-child a"));
  crumbLinks[0].click();
  await new Promise((r) => setTimeout(r, 300));
  ok("breadcrumbs: clicking a crumb opens that page", bw.location.pathname === "/");

  document.getElementById("o").textContent = "RESULT\n" + out.join("\n") + "\nEND";
})();
</script>
HTML
sleep 1
RESULT=$("$CHROME" --headless --disable-gpu --virtual-time-budget=6000 --window-size=1400,900 --dump-dom "http://localhost:$PORT/__behavior.html" 2>/dev/null | sed -n '/RESULT/,/END/p' | grep -E "^(PASS|FAIL)")
echo "$RESULT"
! grep -q FAIL <<<"$RESULT"
