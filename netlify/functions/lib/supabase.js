// Thin wrapper around Supabase's REST API (PostgREST) for simple key/value storage.
// Uses the service_role key, which bypasses Row Level Security — this must only
// ever be called from server-side functions, never exposed to the browser.

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_KEY environment variable is not set");
  return {
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json"
  };
}

function supabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL environment variable is not set");
  return url.replace(/\/$/, "");
}

async function kvGet(key) {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase GET failed (${res.status}): ${detail}`);
  }
  const rows = await res.json();
  return rows.length ? rows[0].value : null;
}

async function kvSet(key, value) {
  const res = await fetch(`${supabaseUrl()}/rest/v1/kv_store`, {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ key, value, updated_at: new Date().toISOString() }])
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase POST failed (${res.status}): ${detail}`);
  }
  return true;
}

async function kvDelete(key) {
  const res = await fetch(
    `${supabaseUrl()}/rest/v1/kv_store?key=eq.${encodeURIComponent(key)}`,
    { method: "DELETE", headers: supabaseHeaders() }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase DELETE failed (${res.status}): ${detail}`);
  }
  return true;
}

module.exports = { kvGet, kvSet, kvDelete };
