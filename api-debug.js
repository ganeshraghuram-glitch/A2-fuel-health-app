const { getStore } = require("@netlify/blobs");

// Visit this directly in a browser: https://<your-site>.netlify.app/.netlify/functions/api-debug
// It writes a test value, reads it back, and reports exactly what happened —
// no dev tools or console needed, just look at what the page shows.
exports.handler = async () => {
  const report = { steps: [] };

  try {
    report.steps.push("Initializing store...");
    const store = getStore("a2-fuel");
    report.steps.push("Store initialized OK");

    const testKey = "debug-test";
    const testValue = JSON.stringify({ timestamp: new Date().toISOString(), random: Math.random() });

    report.steps.push("Writing test value...");
    await store.set(testKey, testValue);
    report.steps.push("Write OK");

    report.steps.push("Reading test value back...");
    const readBack = await store.get(testKey);
    report.steps.push("Read OK");

    report.success = readBack === testValue;
    report.written = testValue;
    report.readBack = readBack;

    // Also report what's actually in the real keys, so we can see current state
    const [settings, todayLog] = await Promise.all([
      store.get("settings"),
      store.get("log:" + new Date().toISOString().slice(0, 10))
    ]);
    report.currentSettings = settings || "(nothing saved yet)";
    report.currentTodayLog = todayLog || "(nothing saved yet)";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report, null, 2)
    };
  } catch (err) {
    report.error = err.message;
    report.stack = err.stack;
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report, null, 2)
    };
  }
};
