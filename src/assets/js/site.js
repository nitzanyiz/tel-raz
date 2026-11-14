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
      if (!mobile.matches && canHover.matches) open(trigger);
    });
    item.addEventListener("mouseleave", () => {
      if (!mobile.matches && canHover.matches) closeTimer = setTimeout(() => closeAll(), 180);
    });
  });

  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "סגירת תפריט" : "פתיחת תפריט");
    document.body.style.overflow = open ? "hidden" : "";
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
