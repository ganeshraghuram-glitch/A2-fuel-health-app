const { getStore } = require("@netlify/blobs");

// Returns per-day calorie totals (food + alcohol) plus day-of-week breakdown,
// for the last N days, so the frontend can render weekly/monthly trend views
// without doing dozens of round trips itself.
exports.handler = async (event) => {
  const store = getStore("a2-fuel");
  const days = Math.min(parseInt((event.queryStringParameters && event.queryStringParameters.days) || "7"), 90);

  const settingsRaw = await store.get("settings");
  const settings = settingsRaw ? JSON.parse(settingsRaw) : { dailyCalorieTarget: 2000 };

  const results = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);

    const [logRaw, alcoholRaw, workoutsRaw, caffeineRaw] = await Promise.all([
      store.get("log:" + key),
      store.get("alcohol:" + key),
      store.get("workouts:" + key),
      store.get("caffeine:" + key)
    ]);

    const log = logRaw ? JSON.parse(logRaw) : [];
    const alcohol = alcoholRaw ? JSON.parse(alcoholRaw) : [];
    const workouts = workoutsRaw ? JSON.parse(workoutsRaw) : [];
    const caffeine = caffeineRaw ? JSON.parse(caffeineRaw) : [];

    const foodCalories = log.reduce((s, e) => s + Number(e.calories || 0), 0);
    const alcoholCalories = alcohol.reduce((s, e) => s + Number(e.calories || 0), 0);
    const burned = workouts.reduce((s, w) => s + Number(w.calories || 0), 0);
    const caffeineMg = caffeine.reduce((s, c) => s + Number(c.mg || 0), 0);

    const consumed = foodCalories + alcoholCalories;
    const target = settings.dailyCalorieTarget + Math.round(burned * 0.5);
    const hasData = log.length > 0 || alcohol.length > 0 || workouts.length > 0 || caffeine.length > 0;

    results.push({
      date: key,
      dayOfWeek: d.toLocaleDateString([], { weekday: "short" }),
      foodCalories,
      alcoholCalories,
      consumed,
      target,
      diff: consumed - target, // positive = over
      burned,
      caffeineMg,
      hasData
    });
  }

  // Oldest first, easier to chart left-to-right
  results.reverse();

  const loggedDays = results.filter(r => r.hasData);
  const avgConsumed = loggedDays.length
    ? Math.round(loggedDays.reduce((s, r) => s + r.consumed, 0) / loggedDays.length)
    : 0;
  const avgTarget = loggedDays.length
    ? Math.round(loggedDays.reduce((s, r) => s + r.target, 0) / loggedDays.length)
    : 0;
  const daysOver = loggedDays.filter(r => r.diff > 0).length;

  // Which day-of-week runs over most often on average — a simple "where you're going wrong" signal
  const byDow = {};
  for (const r of loggedDays) {
    if (!byDow[r.dayOfWeek]) byDow[r.dayOfWeek] = { total: 0, count: 0, alcoholTotal: 0 };
    byDow[r.dayOfWeek].total += r.diff;
    byDow[r.dayOfWeek].count += 1;
    byDow[r.dayOfWeek].alcoholTotal += r.alcoholCalories;
  }
  let worstDay = null, worstAvg = -Infinity;
  for (const [dow, v] of Object.entries(byDow)) {
    const avg = v.total / v.count;
    if (avg > worstAvg) { worstAvg = avg; worstDay = dow; }
  }

  const totalAlcoholCalories = loggedDays.reduce((s, r) => s + r.alcoholCalories, 0);

  // Cumulative "balance" — sum of (budget - spent) across logged days.
  // Positive = net saved (profit), negative = net overspent (loss). This is the
  // headline "game" number: how you're doing overall, not just today.
  const totalBalance = loggedDays.reduce((s, r) => s - r.diff, 0);

  // Current streak: consecutive most-recent days (walking backward from today)
  // where the day was logged and under budget. Breaks on first over-budget or
  // unlogged day.
  let streak = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i];
    if (!r.hasData || r.diff > 0) break;
    streak++;
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      days: results,
      summary: {
        avgConsumed,
        avgTarget,
        daysLogged: loggedDays.length,
        daysOver,
        worstDay: worstAvg > 0 ? worstDay : null,
        worstDayAvgOver: worstAvg > 0 ? Math.round(worstAvg) : 0,
        totalAlcoholCalories,
        totalBalance,
        streak
      }
    })
  };
};
