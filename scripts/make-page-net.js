// Generates src/assets/img/page-net.svg: the faint, still network of dots behind
// the inner pages' title band (the same look as the home hero's animated one).
// Run: node scripts/make-page-net.js
const fs = require("node:fs");
const path = require("node:path");

const W = 1600, H = 360, LINK = 110;
let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const dots = Array.from({ length: Math.round(W * H / 9000) }, () => ({ x: +(rnd() * W).toFixed(1), y: +(rnd() * H).toFixed(1) }));

const lines = [];
for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
  const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
  if (d < LINK) lines.push(`<line x1="${dots[i].x}" y1="${dots[i].y}" x2="${dots[j].x}" y2="${dots[j].y}" stroke-opacity="${(.1 * (1 - d / LINK)).toFixed(3)}"/>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<g stroke="#446ba4">${lines.join("")}</g>
<g fill="#446ba4" fill-opacity=".22">${dots.map((d) => `<circle cx="${d.x}" cy="${d.y}" r="1.8"/>`).join("")}</g>
</svg>
`;
fs.writeFileSync(path.join(__dirname, "../src/assets/img/page-net.svg"), svg);
console.log(`page-net.svg: ${dots.length} dots, ${lines.length} lines, ${svg.length} bytes`);
