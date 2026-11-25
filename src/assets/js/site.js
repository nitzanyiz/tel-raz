// Staggered entrance for [data-reveal] sections: shown once, the first time a
// quarter of the section is in view. data-reveal="late" waits until the section's
// top is a quarter of the way up the screen, so the motion isn't over before the
// reader gets there (and works for sections taller than the screen).
// First in this file, so an error in a later block can't leave the sections hidden.
(function () {
  window.revealReady = true; // see the inline script in base.njk
  const sections = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    sections.forEach((s) => s.classList.add("is-in"));
    return;
  }
  const reveal = (entries, observer) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    observer.unobserve(e.target);
  });
  const io = new IntersectionObserver(reveal, { threshold: 0.25 });
  const late = new IntersectionObserver(reveal, { rootMargin: "0px 0px -25% 0px" });
  sections.forEach((s) => (s.dataset.reveal === "late" ? late : io).observe(s));
})();

// Header behavior: desktop mega panels (hover / click / keyboard) and the
// mobile full-screen menu with accordion sections.
(function () {
  const header = document.querySelector("[data-header]");
  if (!header) return;
  const triggers = [...header.querySelectorAll(".nav-trigger")];
  const toggle = header.querySelector(".menu-toggle");
  const mobile = window.matchMedia("(max-width: 900px)");
  const canHover = window.matchMedia("(hover: hover)");
  let closeTimer;
  let hoverOpenedAt = 0;

  const panelOf = (trigger) => document.getElementById(trigger.getAttribute("aria-controls"));

  function setOpen(trigger, open) {
    trigger.setAttribute("aria-expanded", String(open));
    panelOf(trigger).hidden = !open;
  }

  function closeAll(except) {
    triggers.forEach((t) => t !== except && setOpen(t, false));
    header.classList.toggle("is-open", Boolean(except) && !mobile.matches);
  }

  function open(trigger) {
    clearTimeout(closeTimer);
    closeAll(trigger);
    setOpen(trigger, true);
  }

  triggers.forEach((trigger) => {
    const item = trigger.parentElement;
    trigger.addEventListener("click", () => {
      // A click right after hover opened the panel means "open", not "toggle".
      if (Date.now() - hoverOpenedAt < 400) return;
      if (trigger.getAttribute("aria-expanded") === "true") {
        setOpen(trigger, false);
        if (!mobile.matches) closeAll();
      } else if (mobile.matches) {
        setOpen(trigger, true);
      } else {
        open(trigger);
      }
    });
    item.addEventListener("mouseenter", () => {
      if (mobile.matches || !canHover.matches) return;
      // Re-entering (e.g. moving down from the trigger into the panel) always
      // cancels a pending close.
      clearTimeout(closeTimer);
      if (trigger.getAttribute("aria-expanded") !== "true") {
        open(trigger);
        hoverOpenedAt = Date.now();
      }
    });
    item.addEventListener("mouseleave", () => {
      if (!mobile.matches && canHover.matches) closeTimer = setTimeout(() => closeAll(), 300);
    });
  });

  // While the mobile menu covers the page, everything behind it is inert so
  // keyboard focus and screen readers stay inside the menu.
  const behind = document.querySelectorAll("main, .site-footer, .whatsapp-fab, .skip-link");

  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
    behind.forEach((el) => (el.inert = open));
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) header.querySelector("#site-nav a, #site-nav button").focus();
  }

  toggle.addEventListener("click", () => setMenu(!header.classList.contains("menu-open")));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openTrigger = triggers.find((t) => t.getAttribute("aria-expanded") === "true");
    if (header.classList.contains("menu-open")) {
      setMenu(false);
      toggle.focus();
    } else if (openTrigger) {
      closeAll();
      openTrigger.focus();
    }
  });

  document.addEventListener("click", (e) => {
    if (!mobile.matches && !header.contains(e.target)) closeAll();
  });

  header.addEventListener("focusout", (e) => {
    if (!mobile.matches && !header.contains(e.relatedTarget)) closeAll();
  });

  mobile.addEventListener("change", () => {
    closeAll();
    setMenu(false);
  });
})();

// Page galleries: thumbnails swap the main image, swipe moves between images,
// clicking the main image opens a full-screen <dialog> (arrows, swipe, Esc).
// RTL: the next image is to the left (ArrowLeft / swipe right).
(function () {
  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const mainBtn = gallery.querySelector(".gallery-main");
    const mainImg = mainBtn.querySelector("img");
    const thumbs = [...gallery.querySelectorAll(".gallery-thumb")];
    const images = thumbs.length
      ? thumbs.map((t) => ({ src: t.dataset.src, alt: t.dataset.alt }))
      : [{ src: mainImg.getAttribute("src"), alt: mainImg.alt }];
    const dialog = gallery.querySelector(".lightbox");
    const big = dialog.querySelector(".lightbox-img");
    const count = dialog.querySelector(".lightbox-count");
    let current = 0;

    function show(i) {
      current = (i + images.length) % images.length;
      const { src, alt } = images[current];
      mainImg.src = src;
      mainImg.alt = alt;
      big.src = src;
      big.alt = alt;
      thumbs.forEach((t, n) => (n === current ? t.setAttribute("aria-current", "true") : t.removeAttribute("aria-current")));
      if (count) count.textContent = `${current + 1} / ${images.length}`;
    }

    // Horizontal swipe on an element: calls onSwipe(+1 next / -1 previous);
    // returns a function telling whether the last pointer gesture was a swipe.
    function swipeable(el, onSwipe) {
      let startX = null, swiped = false;
      el.addEventListener("pointerdown", (e) => { startX = e.clientX; swiped = false; });
      el.addEventListener("pointerup", (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 40 && images.length > 1) { swiped = true; onSwipe(dx > 0 ? 1 : -1); }
      });
      return () => swiped;
    }

    thumbs.forEach((t, n) => t.addEventListener("click", () => show(n)));
    const mainSwiped = swipeable(mainBtn, (d) => show(current + d));
    swipeable(big, (d) => show(current + d));

    mainBtn.addEventListener("click", () => {
      if (mainSwiped()) return;
      show(current);
      document.documentElement.style.overflow = "hidden"; // no page scroll (or scrollbar) behind it
      dialog.showModal();
    });
    dialog.querySelector(".lightbox-close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".lightbox-next")?.addEventListener("click", () => show(current + 1));
    dialog.querySelector(".lightbox-prev")?.addEventListener("click", () => show(current - 1));
    // Click on the dark backdrop (outside the image and buttons) closes.
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => {
      document.documentElement.style.overflow = "";
      mainBtn.focus();
    });
    document.addEventListener("keydown", (e) => {
      if (!dialog.open || images.length < 2) return;
      if (e.key === "ArrowLeft") show(current + 1);
      if (e.key === "ArrowRight") show(current - 1);
    });
  });
})();

