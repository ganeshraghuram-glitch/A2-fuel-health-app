const { kvGet, kvSet, kvDelete } = require("./lib/supabase");

exports.handler = async (event) => {
  const key = event.queryStringParameters && event.queryStringParameters.key;

  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing 'key' query parameter" }) };
  }

  try {
    if (event.httpMethod === "GET") {
      const value = await kvGet(key);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: value || "null"
      };
    }

    if (event.httpMethod === "POST") {
      await kvSet(key, event.body || "null");
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === "DELETE") {
      await kvDelete(key);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: "Method not allowed" };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Storage operation failed", detail: err.message, key })
    };
  }
};
