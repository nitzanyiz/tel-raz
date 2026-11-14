// Encodes a site path (such as a CMS-uploaded file) segment by segment, so
// names with spaces, Hebrew, "#", "?" or "%" still resolve. Segments that are
// already encoded are decoded first, so they aren't encoded twice.
function encodeFilePath(p) {
  return p
    .split("/")
    .map((segment) => {
      let raw = segment;
      try { raw = decodeURIComponent(segment); } catch { /* a literal "%": keep as typed */ }
      return encodeURIComponent(raw);
    })
    .join("/");
}

module.exports = { encodeFilePath };
