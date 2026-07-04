const { kvGet, kvSet } = require("./lib/supabase");

// Receives a POST from an iOS Shortcuts automation.
// Protected by a shared-secret token so randoms can't write to your store.
// Expected URL: https://<your-site>.netlify.app/.netlify/functions/health-webhook?token=YOUR_SECRET
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const token = event.queryStringParameters && event.queryStringParameters.token;
  if (!process.env.WEBHOOK_SECRET || token !== process.env.WEBHOOK_SECRET) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  try {
    const payload = JSON.parse(event.body);

    const today = new Date().toISOString().slice(0, 10);
    const existingRaw = await kvGet("health:" + today);
    const existing = existingRaw ? JSON.parse(existingRaw) : {};

    const summary = {
      ...existing,
      updatedAt: new Date().toISOString(),
      steps: payload.steps ?? existing.steps,
      activeCalories: payload.activeCalories ?? existing.activeCalories,
      sleepHours: payload.sleepHours ?? existing.sleepHours,
      workouts: Array.isArray(payload.workouts) ? payload.workouts : existing.workouts
    };

    await kvSet("health:" + today, JSON.stringify(summary));

    return { statusCode: 200, body: JSON.stringify({ ok: true, saved: summary }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
