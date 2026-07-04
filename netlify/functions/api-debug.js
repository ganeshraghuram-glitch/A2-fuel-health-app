const { kvGet, kvSet } = require("./lib/supabase");

exports.handler = async () => {
  const report = { steps: [] };

  report.diagnostics = {
    supabaseUrlSet: !!process.env.SUPABASE_URL,
    supabaseKeySet: !!process.env.SUPABASE_SERVICE_KEY
  };

  try {
    const testKey = "debug-test";
    const testValue = JSON.stringify({ timestamp: new Date().toISOString(), random: Math.random() });

    report.steps.push("Writing test value...");
    await kvSet(testKey, testValue);
    report.steps.push("Write OK");

    report.steps.push("Reading test value back...");
    const readBack = await kvGet(testKey);
    report.steps.push("Read OK");

    report.success = readBack === testValue;
    report.written = testValue;
    report.readBack = readBack;

    const [settings, todayLog] = await Promise.all([
      kvGet("settings"),
      kvGet("log:" + new Date().toISOString().slice(0, 10))
    ]);
    report.currentSettings = settings || "(nothing saved yet)";
    report.currentTodayLog = todayLog || "(nothing saved yet)";

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(report, null, 2) };
  } catch (err) {
    report.error = err.message;
    report.stack = err.stack;
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify(report, null, 2) };
  }
};
