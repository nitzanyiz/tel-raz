// AI solutions page (layouts/ai-solutions.njk): plays the three section animations
// (partials/ai-anim-*.njk). Their markup is the finished frame; while playing, the
// stage gets .is-live (steps hidden until .is-in) and a timeline reveals them.
// - Each stage loops only while it's on screen and the tab is visible, and starts
//   over from the beginning when it comes back.
// - prefers-reduced-motion: reduce → never .is-live, so the finished frame stays.
(function () {
  const stages = [...document.querySelectorAll(".ai-stage[data-anim]")];
  if (!stages.length) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FADE = 700;

  const $ = (st, sel) => st.querySelector(sel);
  const show = (n) => (st) => $(st, `.ai-step[data-step="${n}"]`).classList.add("is-in");
  const talk = (who) => (st) => st.querySelectorAll(".ai-who").forEach((el) => el.classList.toggle("is-talking", !!who && el.classList.contains(`ai-who--${who}`)));
  // the dot on a call line: "rtl" runs from the right avatar to the left one. `which` picks the line
  // (section 3 has two: .ai-line--customer and .ai-line--agent); every other line stops.
  // A new message's dot always starts fresh from the speaker's end (the run restarts, never mirrors).
  const flow = (dir, which = ".ai-line") => (st) => st.querySelectorAll(".ai-line").forEach((line) => {
    const on = !!dir && line.matches(which), rev = on && dir === "ltr";
    if (on && line.classList.contains("is-flowing") && line.classList.contains("is-reverse") === rev) return;   // same run: keep going
    line.classList.remove("is-flowing", "is-reverse");
    if (!on) return;
    void line.offsetWidth;
    line.classList.add("is-flowing");
    line.classList.toggle("is-reverse", rev);
  });
  const hearing = (on) => (st) => st.classList.toggle("is-hearing", on);
  const all = (...fns) => (st) => fns.forEach((fn) => fn(st));
  // apply a change instantly (no transitions), e.g. jumping back to "empty" on a restart
  const snap = (st, fn) => { st.classList.add("is-snapping"); fn(); void st.offsetWidth; st.classList.remove("is-snapping"); };

  // [atMs, step] pairs; END is when the loop fades out and starts over
  const TIMELINES = {
    // the speech fills the strip and flows left into the AI line, the dashed silence line follows it,
    // and everything stops once the last bar has gone in; the words appear while the speech passes
    analysis: (st) => {
      const SPEED = 120;                                     // px per second
      const START = 200;
      const track = $(st, ".ai-sound__track"), bars = track.querySelectorAll("i");
      const speech = bars[bars.length - 1].offsetLeft + bars[bars.length - 1].offsetWidth - bars[0].offsetLeft;
      const gone = START + (speech / SPEED) * 1000;          // last bar has gone into the AI line
      const words = st.querySelectorAll(".ai-word");
      return {
        end: gone + 6300,
        steps: [
          [0, all(show(1), () => track.animate(
            [{ transform: "translateX(0)" }, { transform: `translateX(${-speech}px)` }],
            { duration: gone - START, delay: START, easing: "linear", fill: "forwards" }))],
          [START, hearing(true)],
          ...[...words].map((el, i) => [START + 250 + i * ((gone - START - 500) / Math.max(1, words.length - 1)), () => el.classList.add("is-in")]),
          [gone, hearing(false)],
          [gone + 300, show(2)],
          [gone + 900, show(3)],
          [gone + 2200, show(4)],
          [gone + 3000, (s) => $(s, '.ai-step[data-step="4"]').classList.add("is-done")],
        ],
      };
    },
    voicebot: {
      end: 9800,
      steps: [
        [300, all(talk("customer"), flow("rtl"), hearing(true), show(1))],
        [1900, show(2)],
        [3000, all(talk("bot"), flow("ltr"), hearing(false), (st) => {
          const msg = $(st, "[data-typing]");
          msg.innerHTML = '<span class="ai-dots"><i></i><i></i><i></i></span>';
          msg.classList.add("is-in");
        })],
        [4300, (st) => { const msg = $(st, "[data-typing]"); msg.textContent = msg.dataset.final; }],
        [5300, all(talk("customer"), flow("rtl"), show(4))],
        [6400, all(talk("bot"), flow("ltr"), show(5))],
        [7600, all(talk(null), flow(null))],
      ],
    },
    handoff: {
      end: 9300,
      steps: [
        [500, all(talk("customer"), flow("rtl", ".ai-line--customer"), show(1))],   // 1. customer → bot
        [2100, all(talk("bot"), flow("ltr", ".ai-line--customer"), show(2))],       // 2. bot → customer
        [3000, (st) => {
          // the summary card appears under the bot (middle), then slides to the agent's side
          const card = $(st, ".ai-handoff-card"), chat = $(st, ".ai-chat").getBoundingClientRect(), r = card.getBoundingClientRect();
          snap(st, () => { card.style.transform = `translateX(${chat.left + chat.width / 2 - (r.left + r.width / 2)}px)`; });
          card.classList.add("is-in");
          flow("rtl", ".ai-line--agent")(st);                                        // 3. bot → agent (the summary)
        }],
        [3900, all(flow("rtl", ".ai-line--agent"), (st) => {
          const card = $(st, ".ai-handoff-card");
          card.classList.add("is-sending");
          void card.offsetWidth;
          card.style.transform = "";
        })],
        [4900, all(flow("ltr", ".ai-line--full"), talk("agent"), show(4), (st) => $(st, ".ai-who--agent").classList.add("is-on"))],   // 4. agent → customer
        [6400, all(flow(null), talk(null), show(5))],
      ],
    },
  };

  const runs = new Map(stages.map((st) => [st, { gen: 0, timers: [] }]));
  const onScreen = new Set();

  function reset(st) {
    st.classList.remove("is-hearing", "is-fading");
    st.querySelectorAll(".is-in, .is-done, .is-talking, .is-on, .is-flowing, .is-reverse, .is-sending").forEach((el) =>
      el.classList.remove("is-in", "is-done", "is-talking", "is-on", "is-flowing", "is-reverse", "is-sending"));
    st.querySelectorAll("[data-typing]").forEach((el) => { if (el.dataset.final) el.textContent = el.dataset.final; });
    st.querySelectorAll(".ai-handoff-card").forEach((el) => { el.style.transform = ""; });
    st.querySelectorAll(".ai-sound__track").forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  }

  function stop(st) {
    const run = runs.get(st);
    run.gen++;
    run.timers.forEach(clearTimeout);
    run.timers = [];
    snap(st, () => reset(st));
  }

  function play(st) {
    stop(st);
    if (reduced.matches) { st.classList.remove("is-live"); return; }
    st.classList.add("is-live");
    const run = runs.get(st), gen = run.gen, def = TIMELINES[st.dataset.anim], tl = typeof def === "function" ? def(st) : def;
    const at = (ms, fn) => run.timers.push(setTimeout(() => { if (run.gen === gen) fn(st); }, ms));
    tl.steps.forEach(([ms, fn]) => at(ms, fn));
    at(tl.end, () => st.classList.add("is-fading"));
    at(tl.end + FADE, play);
  }

  function update() {
    for (const st of stages) {
      if (reduced.matches) { stop(st); st.classList.remove("is-live"); }
      else if (onScreen.has(st) && !document.hidden) play(st);
      else { stop(st); st.classList.add("is-live"); }   // waits, empty, for its turn on screen
    }
  }

  stages.forEach((st) => st.querySelectorAll("[data-typing]").forEach((el) => { el.dataset.final = el.textContent; }));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const was = onScreen.has(e.target);
      if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target);
      if (was === e.isIntersecting) continue;
      if (e.isIntersecting && !document.hidden && !reduced.matches) play(e.target);
      else if (!e.isIntersecting) { stop(e.target); if (!reduced.matches) e.target.classList.add("is-live"); }
    }
  }, { threshold: 0.35 });
  stages.forEach((st) => io.observe(st));
  document.addEventListener("visibilitychange", update);
  reduced.addEventListener("change", update);
  if (!reduced.matches) stages.forEach((st) => st.classList.add("is-live"));
})();
