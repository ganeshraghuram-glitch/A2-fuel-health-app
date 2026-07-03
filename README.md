# A2 Fuel

A personal calorie tracker: photograph a meal, get a calorie/macro estimate,
track against a daily limit, and see it adjust for workouts, caffeine, and
Apple Watch activity data. Named for Arjun and Agastya.

## Project structure

```
a2-fuel/
├── public/
│   └── index.html          ← the app (frontend)
├── netlify/functions/
│   ├── api-analyze.js      ← proxies food photos to the Anthropic API
│   ├── api-data.js         ← reads/writes settings, logs, weight via Netlify Blobs
│   └── health-webhook.js   ← receives Apple Health data from your iPhone
├── netlify.toml
└── package.json
```

## 1. Open this in Claude Code

```
cd a2-fuel
claude
```

From there you can ask Claude Code to add features, fix bugs, or restyle —
it has the whole project in context.

## 2. Set up Netlify

You'll need a free Netlify account and the Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
cd a2-fuel
netlify init
```

Choose "Create & configure a new site" and link it to a new or existing Git
repo (recommended, so future edits redeploy automatically) or deploy manually.

## 3. Set your environment variables

In the Netlify dashboard → Site settings → Environment variables, add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (from console.anthropic.com) |
| `WEBHOOK_SECRET` | Any random string you make up — this protects your Health webhook from strangers |

## 4. Deploy

```bash
netlify deploy --prod
```

Netlify will print your live URL, something like `https://a2-fuel-xyz.netlify.app`.

## 5. Connect your Apple Watch data (via Apple Shortcuts — no extra app)

Browsers can't read Apple HealthKit directly — Apple doesn't expose it to
websites. Since you're using the built-in **Shortcuts** app instead of a
third-party exporter, here's the exact shortcut to build. It sends a flat
JSON body the webhook already expects.

**Build the shortcut:**

1. Open **Shortcuts** on your iPhone → tap **+** to create a new shortcut.
2. Add action **Get Health Sample** → set type to **Steps**, range **Today**.
   Add another **Get Health Sample** for **Active Energy**, range **Today**.
   Add another for **Sleep Analysis**, range **Last Night**.
   (For each, tap the result and choose "Sum" or "Total" where offered —
   Steps and Active Energy should sum; Sleep Analysis gives you a duration.)
3. Add action **Text**, and build this JSON, tapping the blue variable chips
   from your Health Sample results in the right spots:

   ```
   {"steps": [Steps Total], "activeCalories": [Active Energy Total], "sleepHours": [Sleep Hours]}
   ```

   If "Sleep Hours" isn't directly available, use a **Calculate** action to
   convert the sleep duration to hours first (minutes ÷ 60).

4. Add action **Get Contents of URL**:
   - URL: `https://<your-site>.netlify.app/.netlify/functions/health-webhook?token=YOUR_WEBHOOK_SECRET`
   - Method: `POST`
   - Request Body: `JSON`, set to **Text** → the JSON from step 3
   - Headers: `Content-Type: application/json`
5. Name it something like "Sync Health to A2 Fuel" and run it once manually
   to test. Check `netlify functions:log health-webhook` to confirm it
   landed.
6. In the **Shortcuts app → Automation tab**, create a **Personal
   Automation** → "Time of Day" (e.g. every morning) or "When I open [an
   app]" → **Run Immediately** → choose "Sync Health to A2 Fuel".

The webhook URL is also shown in the app's Settings panel once your site
is live, so you can copy it directly into step 4 instead of retyping it.

If you later want to add workout logging from the Watch automatically
(instead of the in-app manual form), a **Get Health Sample → Workouts**
action can be added the same way, formatted as a `workouts` array in the
JSON body — happy to help wire that up when you're ready.

## What's already wired up

- **Photo → calories**: uses Claude (Sonnet) vision via a serverless function,
  so your API key never reaches the browser.
- **Daily gauge**: fills as you log meals; status flips from on-track → near
  limit → over limit.
- **Activity-adjusted budget**: today's active calories (from Apple Health
  sync, or logged manually) add back roughly half their value to your daily
  budget — a common, moderate approach so a big hike or gym session doesn't
  need to be perfectly "earned back" calorie-for-calorie.
- **Manual workout logging**: quick way to log Yoga, Hiking, Gym, Swimming,
  or Badminton sessions even before Health sync is set up.
- **Caffeine tracker**: quick-add for coffee/tea, a meter against the 400mg/day
  general guideline, and a cutoff-time warning if a drink is logged too close
  to sleep.
- **Weight goal**: BMI, healthy BMI weight range, and progress bar toward
  your target weight.

## A note on accuracy

Photo-based calorie estimates are a ballpark, not a lab measurement — always
worth a glance and an edit before saving. Likewise, "calories burned" from
wearables (including Apple Watch) tend to run high for some activity types;
treat the activity-adjusted budget as a helpful nudge, not gospel. The
400mg/day caffeine guideline is general public-health guidance for healthy
adults, not personalized medical advice.

This app is a personal tracking tool, not a source of medical or nutrition
advice — for anything about how much you should be eating or drinking given
your health history, that's a conversation for a doctor or registered
dietitian.
