#!/usr/bin/env bash
# Builds the site, serves it locally and saves headless-Chrome screenshots of
# key pages at desktop, mid-width and phone sizes into .tmp-builds/screens/.
# Usage: scripts/screens.sh [port]
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8799}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=".tmp-builds/screens"

npx eleventy --quiet
rm -rf "$OUT" && mkdir -p "$OUT"
python3 -m http.server "$PORT" --directory _site >/dev/null 2>&1 &
SERVER=$!
sleep 1

# Headless Chrome can't make a window narrower than 500px, so each page is
# rendered inside an iframe of the exact size.
FRAME="_site/__frame.html"
trap 'kill $SERVER; rm -f "$FRAME"' EXIT
cat > "$FRAME" <<'HTML'
<!doctype html><style>html,body{margin:0}iframe{border:0;display:block}</style>
<iframe id="f"></iframe>
<script>const q=new URLSearchParams(location.search),f=document.getElementById("f");
f.width=q.get("w");f.height=q.get("h");f.src=q.get("p");
f.onload=()=>{const d=f.contentDocument;
  // headless virtual time doesn't advance CSS transitions; show end states
  const st=d.createElement("style");st.textContent="*,*::before,*::after{transition:none!important}";d.head.append(st);
  (q.get("click")||"").split(",").filter(Boolean)
  .forEach(sel=>d.querySelector(sel).click());};</script>
HTML

for page in / /services/panasonic/ /contact/ /support/guides/; do
  name=$(echo "$page" | tr '/' '_' | sed 's/^_$/home/; s/^_//; s/_$//')
  for size in 1280,900 1000,800 390,844; do
    w=${size%,*}; h=${size#*,}
    "$CHROME" --headless --disable-gpu --hide-scrollbars --virtual-time-budget=4000 \
      --window-size="$(( w > 500 ? w : 500 )),$h" --screenshot="$OUT/${name}-${w}x${h}.png" \
      "http://localhost:$PORT/__frame.html?w=$w&h=$h&p=$page" >/dev/null 2>&1
  done
done
# Open states: desktop mega panel and the mobile menu with an open section.
shot() { "$CHROME" --headless --disable-gpu --hide-scrollbars --virtual-time-budget=4000 \
  --window-size="$(( $1 > 500 ? $1 : 500 )),$2" --screenshot="$OUT/$3.png" \
  "http://localhost:$PORT/__frame.html?w=$1&h=$2&p=/services/panasonic/&click=$4" >/dev/null 2>&1; }
shot 1280 600 open-services-1280 '[aria-controls=panel-services]'
shot 1000 600 open-support-1000 '[aria-controls=panel-support]'
shot 390 844 open-mobile-390 '.menu-toggle,[aria-controls=panel-services]'

echo "Screenshots in $OUT"
