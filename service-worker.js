/* =========================================================
   ECHODOME — service-worker.js
   v3.1 — cache-first estático + fontes Google + download de áudio.
   ========================================================= */

const STATIC_CACHE = 'echodome-static-v3.3.91';
const AUDIO_CACHE  = 'echodome-audio-v3';
const FONT_CACHE   = 'echodome-fonts-v2';

/* URLs das fontes Google — pré-cacheadas no install para funcionar offline */
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&family=Barlow:wght@400;500;600&display=swap',
];

const STATIC_ASSETS = [
  '/','/index.html',
  '/css/style.css','/css/themes.css','/css/player.css',
  '/css/character-design.css','/css/char-bg.css','/css/mobile.css',
  '/css/downloader.css','/css/gallery.css','/css/visualizer.css',
  '/js/app.js','/js/gallery.js','/js/player.js','/js/themes.js',
  '/js/character-design.js','/js/char-bg.js','/js/char-viewer.js','/js/songs/index.js',
  '/js/downloader.js','/js/visualizer.js',
  '/js/plays.js','/js/queue.js','/js/lyrics-browser.js','/js/push-notifications.js',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)),
      /* Pré-cacheia as fontes do Google no install para funcionar offline */
      caches.open(FONT_CACHE).then(async cache => {
        for (const url of FONT_URLS) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              await cache.put(url, res.clone());
              /* Extrai e cacheia também os arquivos .woff2 referenciados pelo CSS */
              const css = await res.text();
              const woff2Urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)]
                .map(m => m[1]);
              await Promise.all(woff2Urls.map(async wUrl => {
                try {
                  const wRes = await fetch(wUrl);
                  if (wRes.ok) await cache.put(wUrl, wRes);
                } catch (_) {}
              }));
            }
          } catch (_) { /* offline durante install — tenta de novo na próxima visita */ }
        }
      }),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const KEEP = [STATIC_CACHE, AUDIO_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  /* ── Fontes Google: cache-first, stale-while-revalidate ── */
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const network = fetch(event.request).then(res => {
            if (res && res.ok) cache.put(event.request, res.clone());
            return res;
          }).catch(() => null);
          return cached || network;
        })
      )
    );
    return;
  }

  /* ── Áudio: cache-first (download explícito via downloader.js) ── */
  if (url.includes('/assets/songs/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache =>
        cache.match(event.request).then(cached => cached || fetch(event.request))
      )
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(res => {
        if (res && res.ok) {
          caches.open(STATIC_CACHE).then(c => c.put(event.request, res.clone()));
        }
        return res;
      })
    )
  );
});

self.addEventListener('message', event => {
  const { type, url, songId, urls, albumId } = event.data || {};
  const port = event.ports[0];

  if (type === 'CACHE_SONG') {
    cacheSong(url, songId)
      .then(() => port && port.postMessage({ type: 'CACHE_DONE', songId }))
      .catch(err => port && port.postMessage({ type: 'CACHE_ERROR', songId, err: err.message }));
    return;
  }

  if (type === 'CACHE_SONGS') {
    (async () => {
      for (const item of urls) {
        try {
          await cacheSong(item.url, item.songId);
          port && port.postMessage({ type: 'CACHE_PROGRESS', songId: item.songId, albumId });
        } catch (err) {
          port && port.postMessage({ type: 'CACHE_ERROR', songId: item.songId, err: err.message });
        }
      }
      port && port.postMessage({ type: 'CACHE_BATCH_DONE', albumId });
    })();
    return;
  }

  if (type === 'REMOVE_SONG') {
    caches.open(AUDIO_CACHE).then(cache =>
      cache.delete(url).then(() => port && port.postMessage({ type: 'REMOVE_DONE', songId }))
    );
    return;
  }

  if (type === 'CHECK_CACHED') {
    caches.open(AUDIO_CACHE).then(async cache => {
      const keys = await cache.keys();
      port && port.postMessage({ type: 'CACHED_LIST', cached: keys.map(r => r.url) });
    });
    return;
  }
});

async function cacheSong(url, songId) {
  const cache = await caches.open(AUDIO_CACHE);
  if (await cache.match(url)) return;
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  await cache.put(url, response);
}