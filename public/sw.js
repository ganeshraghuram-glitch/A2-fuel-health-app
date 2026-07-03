const CACHE_NAME = "a2fuel-shell-v2";
const SHELL_FILES = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// API calls: always go to the network — this is live tracking data, never cache it.
// HTML (the app itself): network-first, so you always get the latest version you
// just deployed. Falls back to cache only if you're genuinely offline.
// Static assets (icons, manifest): cache-first, since they rarely change.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/.netlify/functions/")) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: "Offline — this needs a connection." }), {
        headers: { "Content-Type": "application/json" }
      })
    ));
    return;
  }

  if (event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
