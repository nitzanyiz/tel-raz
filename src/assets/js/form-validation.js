// Form validation with our own Hebrew messages (instead of the browser's bubbles,
// whose language follows the visitor's browser). Applies to <form data-validate>.
// Without JS the browser's own `required` checks still apply.
// - On send: every field is checked, messages appear under the fields and the
//   first problem gets focus.
// - After that (or once a visitor leaves a field they typed in) a field is
//   re-checked as they type, so a fixed message disappears right away.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else api.init(document);
})(this, function () {
  const MESSAGES = {
    required: "נא למלא שדה זה",
    email: "נא להזין כתובת דוא\"ל תקינה, למשל name@company.co.il",
    phone: "נא להזין מספר טלפון תקין, למשל 050-1234567",
  };

  // Israeli number: 9–10 digits starting with 0, or the same with a 972 / +972 prefix.
  const phoneOk = (v) => /^(0\d{8,9}|972\d{8,9})$/.test(v.replace(/[\s\-().]/g, "").replace(/^\+/, ""));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // `el` is anything with { type, value, required } (an input, or a plain object in tests).
  function problem(el) {
    const v = el.value.trim();
    if (!v) return el.required ? MESSAGES.required : "";
    if (el.type === "email" && !emailOk(v)) return MESSAGES.email;
    if (el.type === "tel" && !phoneOk(v)) return MESSAGES.phone;
    return "";
  }

  function show(el, msg) {
    const field = el.closest(".field") || el.parentElement;
    let p = field.querySelector(".field-error");
    if (!msg) {
      if (p) p.remove();
      el.removeAttribute("aria-invalid");
      el.removeAttribute("aria-describedby");
    } else {
      if (!p) {
        p = document.createElement("p");
        p.className = "field-error";
        p.id = `${el.id}-error`;
        field.appendChild(p);
      }
      p.textContent = msg;
      el.setAttribute("aria-invalid", "true");
      el.setAttribute("aria-describedby", p.id);
    }
    el.form.classList.toggle("has-errors", Boolean(el.form.querySelector(".field-error")));
  }

  function init(doc) {
    doc.querySelectorAll("form[data-validate]").forEach((form) => {
      form.noValidate = true;
      const fields = [...form.querySelectorAll("input, textarea")].filter(
        (el) => el.type !== "hidden" && el.name !== "bot-field"
      );
      fields.forEach((el) => {
        el.addEventListener("blur", () => {
          if (!el.value.trim()) return; // don't scold someone just tabbing through
          el.dataset.checked = "";
          show(el, problem(el));
        });
        el.addEventListener("input", () => {
          if ("checked" in el.dataset) show(el, problem(el));
        });
      });
      form.addEventListener("submit", (e) => {
        const bad = fields.filter((el) => {
          el.dataset.checked = "";
          const msg = problem(el);
          show(el, msg);
          return msg;
        });
        if (bad.length) {
          e.preventDefault();
          bad[0].focus();
        }
      });
    });
  }

  return { MESSAGES, problem, init };
});
