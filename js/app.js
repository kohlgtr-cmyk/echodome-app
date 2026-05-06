/* =========================================================
   ECHODOME — js/app.js  v3.0
   Navegação, renderização por álbum, integração de download.
   ========================================================= */

const BAND_MEMBERS = [
  { id:'trace', name:'TRACE', role:'VOX / GUITAR', icon:'◈',
    bio:'The voice and face of Echodome — if you can call a mask a face. Trace writes the lyrics and leads the guitars, layering riffs that feel like transmissions from somewhere far away.' },
  { id:'od',    name:'OD',    role:'GUITAR',       icon:'◆',
    bio:"Three fuzz pedals, one expression: controlled destruction. OD's playing sits between punk rawness and prog precision. He builds walls of sound and then tears them down mid-song." },
  { id:'dusk',  name:'DUSK',  role:'BASS',         icon:'✶',
    bio:"The low end architect. Dusk's bass is less instrument, more seismic event. When the rest of the band stops, Dusk keeps moving — the last signal still alive in the room." },
  { id:'ember', name:'EMBER', role:'DRUMS',        icon:'★',
    bio:"Ember hits hard and hits precise. The drum kit is wrapped in bandages and so is she — a ritual before every show. She calls it 'becoming the machine.'" },
  { id:'lyra',  name:'LYRA',  role:'KEYS',         icon:'⟁',
    bio:'Lyra plays synths and keyboards with a coldness that borders on algorithmic. Her patches are built from field recordings, FM synthesis, and sounds she refuses to name.' },
];

/* GALLERY_ITEMS → js/gallery.js */

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
const app = (() => {
  function navigate(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const section = document.getElementById('section-' + sectionId);
    if (section) section.classList.add('active');

    const btn = document.querySelector('.nav-btn[data-section="' + sectionId + '"]');
    if (btn) btn.classList.add('active');

    document.body.className = document.body.className.replace(/\bsection-\S+/g, '').trim();
    document.body.classList.add('section-' + sectionId);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.CharDesign) window.CharDesign.triggerEnter();
  }

  /* ── Tracklist agrupada por álbum ── */
  function renderTracklist() {
    const container = document.getElementById('tracklist');
    if (!container) return;
    container.innerHTML = '';

    // Banner "Download All"
    const allBar = _buildDownloadAllBar();
    container.appendChild(allBar);

    // Agrupa por álbum
    const albumIds = [...new Set(SONGS.map(s => s.albumId))];
    albumIds.forEach(albumId => {
      const album = ALBUMS.find(a => a.id === albumId);
      const songs = SONGS.filter(s => s.albumId === albumId).sort((a,b) => a.track - b.track);
      if (!album || !songs.length) return;

      // Header do álbum
      const header = _buildAlbumHeader(album, songs);
      container.appendChild(header);

      // Faixas
      songs.forEach(song => {
        const globalIdx = SONGS.indexOf(song);
        const item = _buildTrackItem(song, globalIdx);
        container.appendChild(item);
      });
    });

    // Atualiza visuais de download ao mudar estado
    Downloader.onStateChange(() => _refreshDownloadUI());
    _refreshDownloadUI();
  }

  /* ── Download All Bar ── */
  function _buildDownloadAllBar() {
    const bar = document.createElement('div');
    bar.className = 'download-all-bar';
    bar.id = 'downloadAllBar';
    bar.innerHTML = `
      <div>
        <div class="download-all-info">
          OFFLINE LIBRARY — <strong id="dlAllStatus">0 / ${SONGS.length}</strong> faixas
        </div>
        <div class="download-all-progress" id="dlAllProgress">
          <div class="download-all-progress-fill" id="dlAllFill" style="width:0%"></div>
        </div>
      </div>
      <button class="download-all-btn" id="dlAllBtn">
        ⬇ DOWNLOAD ALL
      </button>
    `;
    bar.querySelector('#dlAllBtn').addEventListener('click', () => {
      Downloader.downloadAll();
    });
    return bar;
  }

  /* ── Header de álbum ── */
  function _buildAlbumHeader(album, songs) {
    const header = document.createElement('div');
    header.className = 'album-header';
    header.dataset.albumId = album.id;

    const coverHTML = album.cover
      ? `<img src="${album.cover}" alt="${album.name}" onerror="this.parentElement.textContent='${album.coverEmoji || '🎵'}'"/>`
      : `<span>${album.coverEmoji || '🎵'}</span>`;

    header.innerHTML = `
      <div class="album-cover">${coverHTML}</div>
      <div class="album-meta">
        <span class="album-name">${album.name}</span>
        <span class="album-year">${album.year}
          <span class="album-track-count">${songs.length} TRACKS</span>
        </span>
      </div>
      <button class="album-dl-btn" data-album-id="${album.id}" aria-label="Download ${album.name}">
        <span class="dl-icon">⬇</span>
        <span class="dl-label">DOWNLOAD</span>
        <span class="dl-progress"></span>
      </button>
    `;

    header.querySelector('.album-dl-btn').addEventListener('click', e => {
      e.stopPropagation();
      Downloader.downloadAlbum(album.id);
    });
    return header;
  }

  /* ── Item de faixa ── */
  function _buildTrackItem(song, globalIdx) {
    const album = ALBUMS.find(a => a.id === song.albumId);
    const coverHTML = album?.cover
      ? `<img src="${album.cover}" alt="${album.name}" class="track-cover-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const fallbackHTML = `<span class="track-cover-fallback" ${album?.cover ? 'style="display:none"' : ''}>${album?.coverEmoji || '🎵'}</span>`;

    const item = document.createElement('div');
    item.className = 'track-item';
    item.dataset.idx = globalIdx;
    item.dataset.songId = song.id;
    item.innerHTML = `
      <div class="track-cover">${coverHTML}${fallbackHTML}</div>
      <div class="track-info">
        <span class="track-name">${song.title}</span>
        <div class="track-tags">
          ${(song.tags || []).map(t => `<span class="track-tag">${t}</span>`).join('')}
        </div>
      </div>
      <span class="track-duration">${song.duration}</span>
      <button class="track-dl-btn" data-song-id="${song.id}"
        aria-label="Download ${song.title}"
        data-remove-label="REMOVER">⬇</button>
      <button class="track-play-btn" aria-label="Play ${song.title}">&#9654;</button>
    `;
    item.addEventListener('click', e => {
      if (!e.target.closest('.track-dl-btn')) Player.playIndex(globalIdx);
    });
    item.querySelector('.track-dl-btn').addEventListener('click', e => {
      e.stopPropagation();
      const songId = parseInt(e.currentTarget.dataset.songId);
      if (Downloader.isDownloaded(songId)) {
        Downloader.removeSong(song);
      } else {
        Downloader.downloadSong(song);
      }
    });
    return item;
  }

  /* ── Atualiza todos os botões de download ── */
  function _refreshDownloadUI() {
    // Botões por faixa
    document.querySelectorAll('.track-dl-btn').forEach(btn => {
      const songId = parseInt(btn.dataset.songId);
      const downloaded  = Downloader.isDownloaded(songId);
      const downloading = Downloader.isDownloading(songId);
      btn.classList.toggle('is-downloaded', downloaded && !downloading);
      btn.classList.toggle('is-downloading', downloading);
      btn.innerHTML = downloading ? '↻' : downloaded ? '✓' : '⬇';
      btn.title = downloading ? 'Baixando…' : downloaded ? 'Baixado — clique para remover' : 'Baixar para ouvir offline';
    });

    // Botões por álbum
    document.querySelectorAll('.album-dl-btn').forEach(btn => {
      const albumId = btn.dataset.albumId;
      const status  = Downloader.albumStatus(albumId);
      const prog    = btn.querySelector('.dl-progress');
      const icon    = btn.querySelector('.dl-icon');
      const label   = btn.querySelector('.dl-label');

      btn.classList.toggle('is-complete', status.allDone);
      btn.classList.toggle('is-loading',  status.inProgress);

      if (status.inProgress) {
        icon.textContent  = '↻';
        label.textContent = 'BAIXANDO';
        if (prog) prog.textContent = ` ${status.done}/${status.total}`;
      } else if (status.allDone) {
        icon.textContent  = '✓';
        label.textContent = 'BAIXADO';
        if (prog) prog.textContent = '';
      } else {
        icon.textContent  = '⬇';
        label.textContent = 'DOWNLOAD';
        if (prog) prog.textContent = status.done > 0 ? ` ${status.done}/${status.total}` : '';
      }
    });

    // Download All bar
    const allStatus = Downloader.allStatus();
    const statusEl  = document.getElementById('dlAllStatus');
    const fillEl    = document.getElementById('dlAllFill');
    const progressEl = document.getElementById('dlAllProgress');
    const btnEl     = document.getElementById('dlAllBtn');

    if (statusEl) statusEl.textContent = `${allStatus.done} / ${allStatus.total}`;
    if (fillEl && allStatus.total > 0) {
      fillEl.style.width = (allStatus.done / allStatus.total * 100) + '%';
    }
    if (progressEl) progressEl.classList.toggle('visible', allStatus.done > 0 || allStatus.inProgress);
    if (btnEl) {
      btnEl.disabled = allStatus.allDone || allStatus.inProgress;
      btnEl.innerHTML = allStatus.allDone
        ? '✓ TUDO BAIXADO'
        : allStatus.inProgress
          ? `↻ BAIXANDO… ${allStatus.done}/${allStatus.total}`
          : '⬇ DOWNLOAD ALL';
    }
  }

  /* ── Band ── */
  function renderBand() {
    const container = document.getElementById('bandGrid');
    if (!container) return;
    container.innerHTML = '';
    BAND_MEMBERS.forEach(member => {
      const card = document.createElement('div');
      card.className = 'band-card';
      card.innerHTML = `
        <span class="band-card-icon">${member.icon}</span>
        <span class="band-card-name">${member.name}</span>
        <span class="band-card-role">${member.role}</span>
        <p class="band-card-bio">${member.bio}</p>
      `;
      container.appendChild(card);
    });
  }

  /* ── Nav ── */
  function initNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.section));
    });
  }

  /* ── Indicador offline ── */
  function initOfflineIndicator() {
    const badge = document.getElementById('offlineBadge');
    if (!badge) return;
    function update() {
      badge.classList.toggle('visible', !navigator.onLine);
    }
    update();
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
  }

  /* ── Init ── */
  async function init() {
    document.body.classList.add('section-home');
    initNav();
    renderGallery();
    renderBand();
    ThemeManager.init();
    Player.init(SONGS);
    CharBg.init();
    renderTracklist();
    initOfflineIndicator();
    await Downloader.init(SONGS);
    _refreshDownloadUI();
  }

  return { init, navigate };
})();

/* ── PWA: Service Worker ── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('[SW] registered:', reg.scope))
      .catch(err => console.warn('[SW] failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', app.init);
