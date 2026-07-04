const { kvGet } = require("./lib/supabase");

// Gathers ~30 days of the user's data and asks Claude to summarize patterns
// and give practical, non-medical suggestions. This is lifestyle coaching
// framing, not diagnosis — the prompt and the disclaimer both make that explicit.
exports.handler = async () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not set in Netlify environment variables." })
    };
  }

  try {
    const settingsRaw = await kvGet("settings");
    const settings = settingsRaw ? JSON.parse(settingsRaw) : null;

    const weightlogRaw = await kvGet("weightlog");
    const weightlog = weightlogRaw ? JSON.parse(weightlogRaw) : [];

    const days = 30;
    const today = new Date();
    const dayRecords = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);

      const [logRaw, alcoholRaw, workoutsRaw, caffeineRaw, healthRaw] = await Promise.all([
        kvGet("log:" + key),
        kvGet("alcohol:" + key),
        kvGet("workouts:" + key),
        kvGet("caffeine:" + key),
        kvGet("health:" + key)
      ]);

      const log = logRaw ? JSON.parse(logRaw) : [];
      const alcohol = alcoholRaw ? JSON.parse(alcoholRaw) : [];
      const workouts = workoutsRaw ? JSON.parse(workoutsRaw) : [];
      const caffeine = caffeineRaw ? JSON.parse(caffeineRaw) : [];
      const health = healthRaw ? JSON.parse(healthRaw) : null;

      const hasData = log.length || alcohol.length || workouts.length || caffeine.length || health;
      if (!hasData) continue;

      dayRecords.push({
        date: key,
        foodCalories: log.reduce((s, e) => s + Number(e.calories || 0), 0),
        alcoholCalories: alcohol.reduce((s, e) => s + Number(e.calories || 0), 0),
        workouts: workouts.map(w => ({ type: w.type, duration: w.duration, calories: w.calories })),
        caffeineMg: caffeine.reduce((s, c) => s + Number(c.mg || 0), 0),
        lateCaffeine: caffeine.some(c => {
          const m = c.time && c.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (!m) return false;
          let h = parseInt(m[1]);
          if (m[3] && m[3].toUpperCase() === "PM" && h !== 12) h += 12;
          return h >= 15; // rough "afternoon or later" flag
        }),
        steps: health ? health.steps : null,
        activeCalories: health ? health.activeCalories : null,
        sleepHours: health ? health.sleepHours : null
      });
    }

    if (dayRecords.length === 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insufficientData: true,
          message: "Not enough logged days yet to generate a meaningful report. Log meals, workouts, and drinks for a few more days and try again."
        })
      };
    }

    const prompt = `You are a supportive lifestyle/fitness data summarizer for a personal tracking app. You are NOT a doctor and must not diagnose conditions or give medical advice. Given this user's profile and ~${dayRecords.length} days of logged data (JSON below), produce a short, practical, encouraging report.

User profile: ${JSON.stringify(settings)}
Weight history: ${JSON.stringify(weightlog)}
Daily records (most recent first): ${JSON.stringify(dayRecords)}

Reply with ONLY raw JSON, no markdown fences, no preamble, in this exact shape:
{
  "overallStatus": "one short sentence, encouraging but honest",
  "alerts": ["short specific pattern-based flags, e.g. 'Caffeine after 3pm on 4 of the last 7 days may be affecting sleep' — max 4 items, omit if genuinely nothing notable"],
  "recommendations": ["short, practical, non-numeric-diet-plan suggestions tied to what the data actually shows — max 5 items"],
  "foodSuggestions": ["2-4 general food/meal ideas or swaps relevant to patterns seen, kept general not prescriptive"]
}
Do not invent data not present. If sleep or steps data is missing, don't fabricate concern about it. Keep tone warm and non-judgmental, like a supportive coach, not a lecture.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data }) };
    }

    const textBlock = (data.content || []).find(b => b.type === "text");
    let raw = textBlock ? textBlock.text : "{}";
    raw = raw.replace(/```json|```/g, "").trim();
    JSON.parse(raw); // validate

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: raw };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
