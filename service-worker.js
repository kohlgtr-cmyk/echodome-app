/* =========================================================
   ECHODOME — sw.js
   Service Worker: cache-first for static assets,
   network-first for audio files.
   ========================================================= */

const CACHE_NAME   = "echodome-v2.0.03";
const AUDIO_CACHE  = "echodome-audio-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/css/themes.css",
  "/css/player.css",
  "/js/app.js",
  "/js/player.js",
  "/js/themes.js",
  "/js/songs/index.js",
  "/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== AUDIO_CACHE)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Audio: network-first, cache fallback
  if (url.pathname.startsWith("/assets/songs/")) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(AUDIO_CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      })
    )
  );
});
