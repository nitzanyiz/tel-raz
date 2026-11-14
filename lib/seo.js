// schema.org LocalBusiness built from the editor's "פרטי האתר" settings.
// Empty or unfilled ([למילוי]) values are left out.
const filled = (v) => typeof v === "string" && v.trim() !== "" && !v.includes("[למילוי]");

function localBusiness(site) {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    url: site.url,
    telephone: site.phoneDial,
    image: `${site.url}/assets/img/og.png`,
    logo: `${site.url}/assets/img/logo.png`,
  };
  if (filled(site.email)) data.email = site.email;
  if (filled(site.address)) data.address = site.address;
  if (filled(site.hours)) data.openingHours = site.hours;
  const sameAs = Object.values(site.social || {}).filter(filled);
  if (sameAs.length) data.sameAs = sameAs;
  return JSON.stringify(data);
}

module.exports = { localBusiness, filled };
