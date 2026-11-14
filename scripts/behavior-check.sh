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
  d.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  ok("mobile menu: Esc releases inert", d.querySelector("main").inert === false);
  ok("mobile menu: Esc returns focus to toggle", d.activeElement === d.querySelector(".menu-toggle"));

  const w = await frame(1280), e = w.document;
  const t = e.querySelector("[aria-controls=panel-services]");
  t.parentElement.dispatchEvent(new MouseEvent("mouseenter"));
  t.click();
  ok("desktop: hover then click keeps the panel open", t.getAttribute("aria-expanded") === "true");
  await new Promise((r) => setTimeout(r, 450));
  t.click();
  ok("desktop: a second click closes it", t.getAttribute("aria-expanded") === "false");
  document.getElementById("o").textContent = "RESULT\n" + out.join("\n") + "\nEND";
})();
</script>
HTML
sleep 1
RESULT=$("$CHROME" --headless --disable-gpu --virtual-time-budget=6000 --window-size=1400,900 --dump-dom "http://localhost:$PORT/__behavior.html" 2>/dev/null | sed -n '/RESULT/,/END/p' | grep -E "^(PASS|FAIL)")
echo "$RESULT"
! grep -q FAIL <<<"$RESULT"
