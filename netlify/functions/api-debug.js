const { getA2FuelStore } = require("./lib/blobStore");

exports.handler = async () => {
  const report = { steps: [] };
  try {
    report.steps.push("Initializing store...");
    const store = getA2FuelStore();
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
    const [settings, todayLog] = await Promise.all([
      store.get("settings"),
      store.get("log:" + new Date().toISOString().slice(0, 10))
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
