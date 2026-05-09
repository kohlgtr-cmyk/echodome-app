/* =========================================================
   ECHODOME — js/downloader.js
   Gerencia downloads de faixas via Service Worker.

   API pública:
     Downloader.init(songs)
     Downloader.isDownloaded(songId)       → bool
     Downloader.downloadSong(song)         → Promise
     Downloader.downloadAlbum(albumId)     → Promise
     Downloader.downloadAll()              → Promise
     Downloader.removeSong(song)           → Promise
     Downloader.onStateChange(cb)          → cancela com retorno
   ========================================================= */

const Downloader = (() => {
  /* ---- Estado ---- */
  let _songs       = [];
  let _downloaded  = new Set();   // Set de songIds
  let _downloading = new Set();   // Set de songIds em progresso
  let _listeners   = [];
  let _sw          = null;

  /* ---- Init ---- */
  async function init(songs) {
    _songs = songs;
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      _sw = reg.active || reg.waiting || reg.installing;
    } catch (e) {
      console.warn('[Downloader] SW não disponível:', e);
      return;
    }

    await _refreshCachedList();
    _notify();
  }

  /* ── Comunicação com o SW via MessageChannel ── */
  function _swMessage(data) {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('SW controller not ready'));
        return;
      }
      const channel = new MessageChannel();
      channel.port1.onmessage = e => resolve(e.data);
      navigator.serviceWorker.controller.postMessage(data, [channel.port2]);
    });
  }

  /* ── Busca lista de URLs cacheadas no SW ── */
  async function _refreshCachedList() {
    try {
      const res = await _swMessage({ type: 'CHECK_CACHED' });
      _downloaded = new Set(
        _songs
          .filter(s => res.cached.some(url => url.endsWith(s.file.replace(/^\//, ''))))
          .map(s => s.id)
      );
    } catch (e) {
      console.warn('[Downloader] _refreshCachedList:', e);
    }
  }

  /* ── Baixar uma faixa ── */
  async function downloadSong(song) {
    if (_downloaded.has(song.id) || _downloading.has(song.id)) return;
    _downloading.add(song.id);
    _notify();

    const url = new URL(song.file, location.origin).href;

    try {
      // Aguarda SW estar pronto
      await _waitForController();
      const res = await _swMessage({ type: 'CACHE_SONG', url, songId: song.id });
      if (res.type === 'CACHE_DONE') {
        _downloaded.add(song.id);
      }
    } catch (e) {
      console.error('[Downloader] downloadSong error:', e);
    } finally {
      _downloading.delete(song.id);
      _notify();
    }
  }

  /* ── Baixar álbum inteiro ── */
  async function downloadAlbum(albumId) {
    const albumSongs = _songs.filter(s => s.albumId === albumId && !_downloaded.has(s.id));
    if (!albumSongs.length) return;

    albumSongs.forEach(s => _downloading.add(s.id));
    _notify();

    const urls = albumSongs.map(s => ({
      songId: s.id,
      url: new URL(s.file, location.origin).href,
    }));

    try {
      await _waitForController();
      await new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = e => {
          const { type, songId } = e.data;
          if (type === 'CACHE_PROGRESS') {
            _downloaded.add(songId);
            _downloading.delete(songId);
            _notify();
          }
          if (type === 'CACHE_ERROR') {
            _downloading.delete(songId);
            _notify();
          }
          if (type === 'CACHE_BATCH_DONE') resolve();
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'CACHE_SONGS', urls, albumId },
          [channel.port2]
        );
      });
    } catch (e) {
      console.error('[Downloader] downloadAlbum error:', e);
      albumSongs.forEach(s => _downloading.delete(s.id));
      _notify();
    }
  }

  /* ── Baixar tudo ── */
  async function downloadAll() {
    const notDownloaded = _songs.filter(s => !_downloaded.has(s.id));
    if (!notDownloaded.length) return;

    notDownloaded.forEach(s => _downloading.add(s.id));
    _notify();

    const urls = notDownloaded.map(s => ({
      songId: s.id,
      url: new URL(s.file, location.origin).href,
    }));

    try {
      await _waitForController();
      await new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = e => {
          const { type, songId } = e.data;
          if (type === 'CACHE_PROGRESS') {
            _downloaded.add(songId);
            _downloading.delete(songId);
            _notify();
          }
          if (type === 'CACHE_ERROR') {
            _downloading.delete(songId);
            _notify();
          }
          if (type === 'CACHE_BATCH_DONE') resolve();
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'CACHE_SONGS', urls, albumId: 'all' },
          [channel.port2]
        );
      });
    } catch (e) {
      console.error('[Downloader] downloadAll error:', e);
      notDownloaded.forEach(s => _downloading.delete(s.id));
      _notify();
    }
  }

  /* ── Remover download ── */
  async function removeSong(song) {
    const url = new URL(song.file, location.origin).href;
    try {
      await _waitForController();
      await _swMessage({ type: 'REMOVE_SONG', url, songId: song.id });
      _downloaded.delete(song.id);
      _notify();
    } catch (e) {
      console.error('[Downloader] removeSong error:', e);
    }
  }

  /* ── Aguarda SW controller ativo ── */
  function _waitForController(timeout = 4000) {
    return new Promise((resolve, reject) => {
      if (navigator.serviceWorker.controller) { resolve(); return; }
      const t = setTimeout(() => reject(new Error('SW timeout')), timeout);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(t);
        resolve();
      }, { once: true });
    });
  }

  /* ── Observadores ── */
  function onStateChange(cb) {
    _listeners.push(cb);
    return () => { _listeners = _listeners.filter(l => l !== cb); };
  }

  function _notify() {
    const state = {
      downloaded:  new Set(_downloaded),
      downloading: new Set(_downloading),
    };
    _listeners.forEach(cb => cb(state));
  }

  /* ── Getters ── */
  function isDownloaded(songId)  { return _downloaded.has(songId);  }
  function isDownloading(songId) { return _downloading.has(songId); }

  function albumStatus(albumId) {
    const albumSongs = _songs.filter(s => s.albumId === albumId);
    const total      = albumSongs.length;
    const done       = albumSongs.filter(s => _downloaded.has(s.id)).length;
    const inProgress = albumSongs.some(s => _downloading.has(s.id));
    return { total, done, inProgress, allDone: total > 0 && done === total };
  }

  function allStatus() {
    const total      = _songs.length;
    const done       = _songs.filter(s => _downloaded.has(s.id)).length;
    const inProgress = _songs.some(s => _downloading.has(s.id));
    return { total, done, inProgress, allDone: total > 0 && done === total };
  }

  return {
    init,
    isDownloaded, isDownloading,
    albumStatus, allStatus,
    downloadSong, downloadAlbum, downloadAll,
    removeSong,
    onStateChange,
  };
})();
