const { getStore } = require("@netlify/blobs");

function getA2FuelStore() {
  try {
    return getStore("a2-fuel");
  } catch (err) {
    if (err.name !== "MissingBlobsEnvironmentError") throw err;

    const siteID = process.env.SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN;

    if (!siteID || !token) {
      const missing = [];
      if (!siteID) missing.push("SITE_ID (should be automatic — if missing, something else is wrong)");
      if (!token) missing.push("NETLIFY_BLOBS_TOKEN (you need to add this — see README)");
      throw new Error(
        "Automatic Blobs setup isn't available on this site, and manual fallback is missing: " + missing.join(", ")
      );
    }

    return getStore({ name: "a2-fuel", siteID, token });
  }
}

module.exports = { getA2FuelStore };
