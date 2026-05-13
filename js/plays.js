/* =========================================================
   ECHODOME — js/plays.js
   #16 — Contador de plays por música (localStorage).
   Badge "MOST PLAYED" e ordenação por popularidade.
   ========================================================= */

const Plays = (() => {
  const KEY = 'echodome_plays_v1';

  /* Carrega mapa { songId: count } do localStorage */
  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }

  function _save(map) {
    try { localStorage.setItem(KEY, JSON.stringify(map)); }
    catch { /* storage cheio — ignora */ }
  }

  /* Registra um play para uma música */
  function record(songId) {
    const map = _load();
    map[songId] = (map[songId] || 0) + 1;
    _save(map);
    _updateBadges();
  }

  /* Retorna total de plays de uma música */
  function count(songId) {
    return _load()[songId] || 0;
  }

  /* Retorna array de { songId, plays } ordenado por plays desc */
  function ranking() {
    const map = _load();
    return Object.entries(map)
      .map(([id, plays]) => ({ songId: Number(id), plays }))
      .sort((a, b) => b.plays - a.plays);
  }

  /* Threshold: músicas entre os top-3 mais tocadas ganham o badge */
  function _topIds() {
    return ranking().slice(0, 3).map(r => r.songId);
  }

  /* Atualiza badges MOST PLAYED nos track-items do DOM */
  function _updateBadges() {
    const top = _topIds();
    document.querySelectorAll('.track-item').forEach(item => {
      const songId = Number(item.dataset.songId);
      const isTop  = top.includes(songId) && count(songId) >= 3;
      let badge = item.querySelector('.track-plays-badge');

      if (isTop) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'track-plays-badge';
          /* insere antes do duration */
          const dur = item.querySelector('.track-duration');
          if (dur) item.insertBefore(badge, dur);
          else item.appendChild(badge);
        }
        badge.textContent = '★ TOP';
      } else {
        if (badge) badge.remove();
      }

      /* Contador de plays visível ao lado da duração */
      let counter = item.querySelector('.track-play-count');
      const plays = count(songId);
      if (plays > 0) {
        if (!counter) {
          counter = document.createElement('span');
          counter.className = 'track-play-count';
          const dur = item.querySelector('.track-duration');
          if (dur) dur.after(counter);
          else item.appendChild(counter);
        }
        counter.textContent = plays + (plays === 1 ? ' play' : ' plays');
      }
    });
  }

  /* Chama logo após renderizar a tracklist */
  function applyToDOM() { _updateBadges(); }

  return { record, count, ranking, applyToDOM };
})();
