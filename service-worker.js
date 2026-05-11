/* =========================================================
   ECHODOME — service-worker.js
   v3.0 — cache-first estático + download explícito de áudio.
   ========================================================= */

const STATIC_CACHE = 'echodome-static-v3.2.5';
const AUDIO_CACHE  = 'echodome-audio-v3';

const STATIC_ASSETS = [
  '/','/index.html',
  '/css/style.css','/css/themes.css','/css/player.css',
  '/css/character-design.css','/css/char-bg.css','/css/mobile.css',
  '/css/downloader.css','/css/gallery.css','/css/visualizer.css',
  '/js/app.js','/js/gallery.js','/js/player.js','/js/themes.js',
  '/js/character-design.js','/js/char-bg.js','/js/songs/index.js',
  '/js/downloader.js','/js/visualizer.js',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
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
