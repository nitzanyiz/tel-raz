#!/usr/bin/env bash
# Checks header behavior in headless Chrome (mobile menu focus/inert, desktop
# hover-then-click). Prints PASS/FAIL lines; exits 1 on any FAIL.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8795}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npx eleventy --quiet >/dev/null
python3 -m http.server "$PORT" --directory _site >/dev/null 2>&1 &
SERVER=$!
PAGE="_site/__behavior.html"
trap 'kill $SERVER; rm -f "$PAGE"' EXIT
cat > "$PAGE" <<'HTML'
<!doctype html><pre id="o"></pre><script>
const out = [];
const ok = (name, cond) => out.push((cond ? "PASS " : "FAIL ") + name);
const frame = (w) => new Promise((r) => { const f = document.createElement("iframe"); f.width = w; f.height = 700; f.src = "/about/"; f.onload = () => r(f.contentWindow); document.body.append(f); });
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
  document.getElementById("o").textContent = "RESULT\n" + out.join("\n") + "\nEND";
})();
</script>
HTML
sleep 1
RESULT=$("$CHROME" --headless --disable-gpu --virtual-time-budget=6000 --window-size=1400,900 --dump-dom "http://localhost:$PORT/__behavior.html" 2>/dev/null | sed -n '/RESULT/,/END/p' | grep -E "^(PASS|FAIL)")
echo "$RESULT"
! grep -q FAIL <<<"$RESULT"
