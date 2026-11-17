// Client demo of the home-hero logo animation. Built only on preview builds
// (the master branch deploy), never on production, and linked from nowhere.
module.exports = {
  eleventyExcludeFromCollections: true,
  permalink: (data) => (data.env.isProduction ? false : "/hero-demo/"),
};
