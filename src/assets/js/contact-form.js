// Short contact form (partials/contact-form.njk): the ringing "דברו איתנו" button
// and sending in the background with a "✓ נשלח!" state.
// Without JS the form simply posts to /thanks/.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.init(document);
})(this, function () {
  const encode = (entries) => new URLSearchParams([...entries]).toString();

  // Netlify Forms accepts a URL-encoded POST to any path; "/" is the documented one.
  async function send(entries, fetchImpl = fetch) {
    try {
      const res = await fetchImpl("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(entries),
      });
      return Boolean(res.ok);
    } catch {
      return false;
    }
  }

  const MSG = { sending: "שולח...", sent: "✓ נשלח!", announce: "הפנייה נשלחה. נחזור אליכם בהקדם." };
  const SENT_MS = 4000;

  // Something the visitor typed (hidden fields and the honeypot don't count).
  const typed = (form) =>
    [...form.querySelectorAll("input, textarea")].some(
      (el) => el.type !== "hidden" && el.name !== "bot-field" && el.value.trim()
    );

  function init(doc) {
    const forms = [...doc.querySelectorAll('form[name="contact"]')];
    if (!forms.length) return;

    // Ring only while on screen; leaving and coming back restarts the 3 rings.
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.target.classList.toggle("is-live", e.isIntersecting)),
        { threshold: 0.4 }
      );
      forms.forEach((f) => io.observe(f));
    }

    forms.forEach((form) => {
      form.addEventListener("focusin", () => form.classList.add("is-engaged"));
      form.addEventListener("focusout", () =>
        setTimeout(() => {
          if (!form.contains(doc.activeElement) && !typed(form)) form.classList.remove("is-engaged");
        })
      );
    });

    // On the document, so form-validation.js (listening on the form) runs first
    // and cancels the submit when something is wrong.
    doc.addEventListener("submit", async (e) => {
      const form = e.target;
      if (e.defaultPrevented || !forms.includes(form)) return;
      e.preventDefault();
      if (form.dataset.sending) return;

      const btn = form.querySelector(".cta-btn");
      const label = btn.querySelector(".cta-label");
      const error = form.querySelector(".form-error");
      const status = form.querySelector(".form-status");
      const original = label.textContent;

      form.dataset.sending = "1";
      error.hidden = true;
      status.textContent = "";
      btn.disabled = true;
      btn.classList.add("is-sending");
      label.textContent = MSG.sending;

      const ok = await send(new FormData(form));
      btn.classList.remove("is-sending");
      delete form.dataset.sending;

      if (!ok) {
        btn.disabled = false;
        label.textContent = original;
        error.hidden = false;
        btn.focus(); // disabling it dropped focus to <body>
        return;
      }
      btn.classList.add("is-sent");
      label.textContent = MSG.sent;
      status.textContent = MSG.announce;
      form.classList.add("is-done");
      form.reset();
      // Fresh form: no "checked" fields left from form-validation.js.
      form.querySelectorAll("[data-checked]").forEach((el) => delete el.dataset.checked);
      setTimeout(() => {
        btn.classList.remove("is-sent");
        label.textContent = original;
        btn.disabled = false;
      }, SENT_MS);
    });
  }

  return { encode, send, init };
});
