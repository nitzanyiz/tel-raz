// Client demo of the home-hero logo animation (five-logo version). Built only on preview builds
// (the master branch deploy), never on production, and linked from nowhere.
module.exports = {
  eleventyExcludeFromCollections: true,
  permalink: (data) => (data.env.isProduction ? false : "/hero-demo-2/"),
};
