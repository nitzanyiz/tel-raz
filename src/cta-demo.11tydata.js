// Client demo: send-button / contact-section animation and Hebrew validation
// options. Built only on preview builds (the master branch deploy), never on
// production, and linked from nowhere. Remove once a design is chosen.
module.exports = {
  eleventyExcludeFromCollections: true,
  permalink: (data) => (data.env.isProduction ? false : "/cta-demo/"),
  title: "הדגמה: כפתור שליחה ואזור יצירת קשר",
};
