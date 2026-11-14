// Netlify sets CONTEXT=production only for deploys of the production branch.
// Every other build (master preview, local) is treated as a preview.
function isProduction() {
  return process.env.CONTEXT === "production";
}

function subjectPrefix() {
  return isProduction() ? "" : "[בדיקה] ";
}

module.exports = { isProduction, subjectPrefix };
