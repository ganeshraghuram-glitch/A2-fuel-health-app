const { getStore } = require("@netlify/blobs");

// Generic key/value read-write for this single-user app.
// Keys used by the frontend: "settings", "log:YYYY-MM-DD", "weightlog", "health:YYYY-MM-DD"
exports.handler = async (event) => {
  const store = getStore("a2-fuel");
  const key = event.queryStringParameters && event.queryStringParameters.key;

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'key' query parameter" }) };
  }

  if (event.httpMethod === "GET") {
    const value = await store.get(key);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: value || "null"
    };
  }

  if (event.httpMethod === "POST") {
    await store.set(key, event.body || "null");
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod === "DELETE") {
    await store.delete(key);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: "Method not allowed" };
};
