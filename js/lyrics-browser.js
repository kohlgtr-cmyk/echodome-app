/* =========================================================
   ECHODOME — js/lyrics-browser.js
   #20 — Seção de letras independente do player.
   Adiciona aba "LYRICS" ao nav e renderiza sem precisar tocar.
   ========================================================= */

const LyricsBrowser = (() => {

  let _currentSongId = null;

  /* ── Renderiza o painel de letras ── */
  function _render(songId) {
    const song = SONGS.find(s => s.id === songId);
    if (!song) return;
    _currentSongId = songId;

    const content = document.getElementById('lyricsBrowserContent');
    if (!content) return;

    const album = (typeof ALBUMS !== 'undefined')
      ? ALBUMS.find(a => a.id === song.albumId)
      : null;

    const lyricsHTML = song.lyrics
      ? song.lyrics
          .replace(/\[([^\]]+)\]/g, '<strong class="lyrics-section-tag">[$1]</strong>')
          .replace(/\n/g, '<br>')
      : '<span class="placeholder-text">// letra não disponível para esta música</span>';

    content.innerHTML = `
      <div class="lb-song-header">
        ${album && album.cover ? `<img class="lb-album-cover" src="${album.cover}" alt="${album.name}" />` : ''}
        <div class="lb-song-meta">
          <h2 class="lb-song-title">${song.title}</h2>
          <p class="lb-song-album">ECHODOME${album ? ' — ' + album.name : ''} · ${song.duration}</p>
        </div>
        <button class="lb-play-btn" id="lbPlayBtn" aria-label="Tocar ${song.title}">▶ TOCAR</button>
      </div>
      <div class="lb-lyrics-body">${lyricsHTML}</div>
    `;

    /* Botão tocar: delega ao Player */
    const playBtn = document.getElementById('lbPlayBtn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const idx = SONGS.indexOf(song);
        if (idx !== -1 && typeof Player !== 'undefined') {
          Player.playIndex(idx);
          /* Navega de volta para home para ver o mini player */
          if (typeof app !== 'undefined') app.navigate('home');
        }
      });
    }

    /* Highlight na lista lateral */
    document.querySelectorAll('.lb-song-list-item').forEach(li => {
      li.classList.toggle('active', Number(li.dataset.songId) === songId);
    });
  }

  /* ── Monta a seção inteira ── */
  function _buildSection() {
    if (document.getElementById('section-lyrics')) return;

    const section = document.createElement('section');
    section.className = 'section';
    section.id        = 'section-lyrics';

    /* Agrupa músicas por álbum */
    const albumGroups = (typeof ALBUMS !== 'undefined' ? ALBUMS : []).map(album => ({
      album,
      songs: SONGS.filter(s => s.albumId === album.id),
    }));

    /* Músicas sem álbum */
    const noAlbum = SONGS.filter(s => !(typeof ALBUMS !== 'undefined' && ALBUMS.find(a => a.id === s.albumId)));

    let listHTML = '';
    albumGroups.forEach(({ album, songs }) => {
      if (!songs.length) return;
      listHTML += `<p class="lb-album-label">${album.name}</p>`;
      songs.forEach(song => {
        listHTML += `<button class="lb-song-list-item" data-song-id="${song.id}" aria-label="Ver letra de ${song.title}">
          ${song.title}${!song.lyrics ? ' <span class="lb-no-lyrics">—</span>' : ''}
        </button>`;
      });
    });
    if (noAlbum.length) {
      listHTML += `<p class="lb-album-label">OUTRAS</p>`;
      noAlbum.forEach(song => {
        listHTML += `<button class="lb-song-list-item" data-song-id="${song.id}">${song.title}</button>`;
      });
    }

    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">LYRICS</h2>
        <div class="section-line"></div>
      </div>
      <div class="lyrics-browser-wrap">
        <aside class="lb-sidebar">
          <div class="lb-song-list" id="lbSongList">${listHTML}</div>
        </aside>
        <div class="lb-content" id="lyricsBrowserContent">
          <p class="placeholder-text lb-placeholder">// selecione uma música ao lado</p>
        </div>
      </div>
    `;

    /* Insere antes da seção Gallery */
    const gallerySection = document.getElementById('section-gallery');
    if (gallerySection) {
      gallerySection.parentNode.insertBefore(section, gallerySection);
    } else {
      document.querySelector('.main-content').appendChild(section);
    }

    /* Eventos da lista */
    section.querySelectorAll('.lb-song-list-item').forEach(btn => {
      btn.addEventListener('click', () => _render(Number(btn.dataset.songId)));
    });

    /* Abre automaticamente a primeira música com letra */
    const first = SONGS.find(s => s.lyrics);
    if (first) _render(first.id);
  }

  /* ── Adiciona botão LYRICS ao nav ── */
  function _addNavBtn() {
    if (document.querySelector('.nav-btn[data-section="lyrics"]')) return;
    const nav = document.querySelector('.main-nav');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.className     = 'nav-btn';
    btn.dataset.section = 'lyrics';
    btn.textContent   = 'LYRICS';
    /* Insere antes de BAND */
    const bandBtn = nav.querySelector('[data-section="about"]');
    if (bandBtn) nav.insertBefore(btn, bandBtn);
    else nav.appendChild(btn);
    btn.addEventListener('click', () => {
      if (typeof app !== 'undefined') app.navigate('lyrics');
    });
  }

  function init() {
    _buildSection();
    _addNavBtn();
  }

  /* Pode ser chamado externamente para sincronizar com a música tocando */
  function syncWithPlayer(songId) {
    if (songId !== _currentSongId) _render(songId);
  }

  return { init, syncWithPlayer };
})();
