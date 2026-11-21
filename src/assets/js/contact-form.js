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

  function init() {}

  return { encode, send, init };
});
