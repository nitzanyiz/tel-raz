// Home hero scene (partials/hero-scene.njk): places the decorative objects
// around the text and runs their motion.
// - Desktop (mouse): parallax, per-object hover animations (CSS, via .hot),
//   the cloud splits away from the pointer, network dots reach for it.
// - Touch: no interaction; every object floats slowly on its own.
// - Reduced motion: one still frame.
(function () {
  const hero = document.querySelector(".hero[data-scene]");
  if (!hero) return;
  const scene = hero.querySelector(".hero-scene");
  const text = hero.querySelector(".hero-text");
  const header = document.querySelector(".site-header");
  const canvas = scene.querySelector(".hero-net");
  const ctx = canvas.getContext("2d");
  const desktopQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const SIZE = 1.2;           // object size, relative to the base widths in the markup
  const PARALLAX = 40;        // px the deepest object travels
  const PHONE_MAX = 760;      // hero width at or below which objects sit in bands above/below the text
  const GAP = 16;             // clearance kept between objects and the text
  const NAMES = ["cloud", "printer", "logo", "bubble", "server", "chart", "headset", "phone"];
  const BANDS = [["cloud", "logo", "printer", "bubble"], ["phone", "headset", "chart", "server"]];
  const SVG_NS = "http://www.w3.org/2000/svg";

  const objs = [...scene.querySelectorAll(".obj")].map((el, i) => {
    const vb = el.querySelector("svg").viewBox.baseVal;
    return {
      el, name: NAMES.find((n) => el.classList.contains(n)),
      x: +el.dataset.x, y: +el.dataset.y, baseW: +el.dataset.w, depth: +el.dataset.depth, ratio: vb.height / vb.width,
      cx: 0, cy: 0, w: 0, h: 0, ox: 0, oy: 0, fx: 0, fy: 0, phase: i * 1.7,
    };
  });
  const logo = objs.find((o) => o.name === "logo");
  const cloud = objs.find((o) => o.name === "cloud");

  // Server LEDs: three rows of five, each with its own delay so they chase.
  const leds = scene.querySelector("#scene-leds");
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const led = document.createElementNS(SVG_NS, "circle");
    led.setAttribute("class", "led");
    led.setAttribute("cx", 28 + c * 8); led.setAttribute("cy", 30 + r * 35); led.setAttribute("r", 2.8);
    led.style.animationDelay = (c * 0.12 + r * 0.2) + "s";
    leds.appendChild(led);
  }

  // The cloud is several small clouds (x, y, scale in the cloud's 260x150 units)
  // that a "goo" filter melts into one shape while they overlap.
  const puffs = [[0, 52, .95], [52, 18, 1.15], [118, 28, 1.05], [36, 66, .9], [104, 70, .9], [158, 56, .8], [76, 46, 1]].map(([x, y, s]) => {
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#hs-puff");
    scene.querySelector("#scene-puffs").appendChild(use);
    return { el: use, hx: x, hy: y, s, cx: x + 60 * s, cy: y + 40 * s, ox: 0, oy: 0 };
  });

  let mode = "touch", pointer = null, W = 0, H = 0, dpr = 1, dots = [], visible = true, running = false, t0 = performance.now();

  // ---- layout

  const relRect = (r, base) => ({ left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top });
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const boxOf = (o) => ({ left: o.cx - o.w / 2, right: o.cx + o.w / 2, top: o.cy - o.h / 2, bottom: o.cy + o.h / 2 });

  function textBox(base) {
    // the union of the actual text and buttons, not their full-width boxes
    const range = document.createRange();
    const parts = [...text.querySelectorAll("h1, p, .btn")].map((el) => {
      if (!el.matches(".btn")) range.selectNodeContents(el);
      return relRect((el.matches(".btn") ? el : range).getBoundingClientRect(), base);
    });
    return {
      left: Math.min(...parts.map((p) => p.left)) - GAP, right: Math.max(...parts.map((p) => p.right)) + GAP,
      top: Math.min(...parts.map((p) => p.top)) - GAP, bottom: Math.max(...parts.map((p) => p.bottom)) + GAP,
    };
  }

  function setSize(o, w) { o.w = w; o.h = w * o.ratio; }

  // Desktop spot for an object, kept clear of the text: at each size (full, then
  // a little smaller) take the shortest move out (left, right, up or down) that
  // stays inside the hero; a small bleed past the side edges is fine.
  function placeClear(o, unit, top, T) {
    const homeX = o.x * W, homeY = top + o.y * (H - top);
    let best = null;
    for (const k of [1, .9, .8, .7]) {
      setSize(o, o.baseW * unit * k);
      const fits = (x, y) => x - o.w * .3 >= 0 && x + o.w * .3 <= W && y - o.h / 2 >= top && y + o.h / 2 <= H;
      const x = Math.min(W - o.w * .3, Math.max(o.w * .3, homeX)), y = Math.min(H - o.h / 2, Math.max(top + o.h / 2, homeY));
      const spots = [[x, y], [T.left - o.w / 2, y], [T.right + o.w / 2, y], [x, T.top - o.h / 2], [x, T.bottom + o.h / 2]]
        .filter(([sx, sy]) => fits(sx, sy) && !overlaps({ left: sx - o.w / 2, right: sx + o.w / 2, top: sy - o.h / 2, bottom: sy + o.h / 2 }, T))
        .map(([sx, sy]) => ({ x: sx, y: sy, k, d: Math.hypot(sx - homeX, sy - homeY) }));
      const near = spots.sort((a, b) => a.d - b.d)[0];
      if (near && (!best || near.d < best.d)) best = near;
      if (best && best.d <= o.w * .35) break;
    }
    best = best || { x: homeX, y: homeY, k: .7 };
    setSize(o, o.baseW * unit * best.k);
    o.cx = best.x; o.cy = best.y;
  }

  function layout() {
    const base = hero.getBoundingClientRect();
    W = hero.clientWidth; H = hero.clientHeight;
    // the floating header overlaps the top of the hero; use its size, not its
    // on-screen position (it's sticky, so that depends on the scroll)
    const top = header ? header.offsetHeight + parseFloat(getComputedStyle(header).marginTop) : 0;
    const T = textBox(base);
    const unit = Math.min(1.15, Math.max(.55, W / 1440)) * SIZE;

    if (W <= PHONE_MAX) {
      // phone: four objects in a band above the text, four below
      const bands = [[top, T.top], [T.bottom, H]];
      BANDS.forEach((names, b) => {
        const [y0, y1] = bands[b], bandH = Math.max(40, y1 - y0), slot = W / names.length;
        names.forEach((name, i) => {
          const o = objs.find((x) => x.name === name);
          setSize(o, Math.min(o.baseW * unit, slot * .82));
          if (o.h > bandH * .8) setSize(o, bandH * .8 / o.ratio);
          o.cx = slot * (i + .5);
          o.cy = y0 + bandH * (i % 2 ? .56 : .44);    // a slight zigzag, less rigid than a row
        });
      });
    } else {
      for (const o of objs) placeClear(o, unit, top, T);
    }
    for (const o of objs) o.el.style.width = o.w + "px";

    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    let seed = 5;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    dots = Array.from({ length: Math.round(W * H / 16000) }, () => ({ x: rnd() * W, y: rnd() * H, depth: .1 + rnd() * .25 }));

    scene.classList.add("is-ready");
    if (!running) frame(performance.now());
  }

  // ---- one frame of motion

  function drawNetwork(px, py) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = dots.map((d) => ({ x: d.x - px * PARALLAX * d.depth, y: d.y - py * PARALLAX * .6 * d.depth }));
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < 110) {
        ctx.strokeStyle = `rgba(68,107,164,${.1 * (1 - d / 110)})`;
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
      }
    }
    for (const p of pts) {
      let alpha = .22, r = 1.8;
      if (pointer) {
        const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
        if (d < 170) {
          const k = 1 - d / 170;
          ctx.strokeStyle = `rgba(68,107,164,${.45 * k})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
          alpha += .5 * k; r += 1.2 * k;
        }
      }
      ctx.fillStyle = `rgba(68,107,164,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
    }
  }

  function moveCloud(t) {
    const r = cloud.el.getBoundingClientRect(), base = hero.getBoundingClientRect(), k = r.width / 260;
    let split = 0, local = null;
    if (pointer) {
      local = { x: (pointer.x + base.left - r.left) / k, y: (pointer.y + base.top - r.top) / k };
      const dx = Math.max(0, Math.abs(local.x - 130) - 130), dy = Math.max(0, Math.abs(local.y - 75) - 75);
      split = Math.max(0, 1 - Math.hypot(dx, dy) / 70);
    }
    for (const p of puffs) {
      let tx = 0, ty = 0;
      if (split > 0) {
        const ax = p.cx - 130, ay = p.cy - 75, an = Math.hypot(ax, ay) || 1;
        tx = ax / an * 80 * split; ty = ay / an * 48 * split;           // spread apart
        const mx = p.cx - local.x, my = p.cy - local.y, md = Math.hypot(mx, my) || 1;
        if (md < 170) { const f = (1 - md / 170) ** 2 * 100; tx += mx / md * f; ty += my / md * f; }   // flee the pointer
        tx += Math.sin(t * 1.3 + p.hx) * 3 * split; ty += Math.cos(t * 1.1 + p.hy) * 3 * split;
      }
      p.ox += (tx - p.ox) * .07; p.oy += (ty - p.oy) * .07;
      p.el.setAttribute("transform", `translate(${p.hx + p.ox} ${p.hy + p.oy}) scale(${p.s})`);
    }
  }

  function frame(now) {
    const t = (now - t0) / 1000;
    const px = pointer ? (pointer.x / W - .5) * 2 : 0, py = pointer ? (pointer.y / H - .5) * 2 : 0;
    const float = mode === "touch" ? 1 : 0;
    const ease = mode === "still" ? 1 : .06;
    for (const o of objs) {
      o.ox += (-px * PARALLAX * o.depth - o.ox) * ease;
      o.oy += (-py * PARALLAX * .6 * o.depth - o.oy) * ease;
      o.fx += (float * Math.sin(t * .23 + o.phase) * (5 + 8 * o.depth) - o.fx) * (mode === "still" ? 1 : .03);
      o.fy += (float * Math.cos(t * .19 + o.phase * 1.3) * (4 + 6 * o.depth) - o.fy) * (mode === "still" ? 1 : .03);
      o.el.style.transform = `translate(${o.cx - o.w / 2 + o.ox + o.fx}px, ${o.cy - o.h / 2 + o.oy + o.fy}px)`;
    }
    moveCloud(t);
    drawNetwork(px, py);
  }

  function loop(now) {
    if (!running) return;
    frame(now);
    requestAnimationFrame(loop);
  }

  // ---- mode and run state

  function update() {
    mode = reducedQuery.matches ? "still" : desktopQuery.matches ? "desktop" : "touch";
    if (mode !== "desktop") { pointer = null; objs.forEach((o) => o.el.classList.remove("hot")); }
    logo.el.classList.toggle("ripples", mode !== "still");
    const shouldRun = mode !== "still" && visible && !document.hidden;
    if (shouldRun && !running) { running = true; requestAnimationFrame(loop); }
    if (!shouldRun) { running = false; frame(performance.now()); }
  }

  hero.addEventListener("pointermove", (e) => {
    if (mode !== "desktop") return;
    const r = hero.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  hero.addEventListener("pointerleave", () => { pointer = null; });
  objs.forEach((o) => {
    if (o === cloud) return;
    o.el.addEventListener("pointerenter", () => { if (mode === "desktop") o.el.classList.add("hot"); });
    o.el.addEventListener("pointerleave", () => o.el.classList.remove("hot"));
  });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(hero);
  document.addEventListener("visibilitychange", update);
  desktopQuery.addEventListener("change", update);
  reducedQuery.addEventListener("change", update);
  new ResizeObserver(layout).observe(hero);

  update();
  layout();
  if (document.fonts) document.fonts.ready.then(layout);
})();
