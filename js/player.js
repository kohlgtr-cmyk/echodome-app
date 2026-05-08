/* =========================================================
   ECHODOME — js/player.js
   Audio engine + mini player + fullscreen imersivo.
   Implementa todos os 9 pontos do redesign.
   ========================================================= */

const Player = (() => {

  /* ---- Estado ---- */
  let audio       = null;
  let playlist    = [];
  let currentIdx  = -1;
  let isPlaying   = false;
  let isLooping   = false;
  let isBandMode  = false;
  let isFocusMode = false;
  let isBoost     = false;

  /* ---- Personagens da banda (para ponto 3) ---- */
  const CHARS = {
    trace: { name:'TRACE', role:'VOX / GTR', icon:'◈' },
    od:    { name:'OD',    role:'GUITAR',    icon:'◆' },
    dusk:  { name:'DUSK',  role:'BASS',      icon:'✶' },
    ember: { name:'EMBER', role:'DRUMS',     icon:'★' },
    lyra:  { name:'LYRA',  role:'KEYS',      icon:'⟁' },
  };

  /* ---- DOM refs ---- */
  let elMiniPlayer, elMiniTitle, elMiniPlay,
      elMiniPrev, elMiniNext, elMiniFill,
      elMiniFillBar, elMiniCoverImg, elMiniCoverFallback,
      elExpandPlayer,
      elFS, elFSClose, elFSPlay, elFSPrev, elFSNext,
      elFSTitle, elFSCurrent, elFSDuration,
      elFSFill, elFSBar, elFSHead,
      elFSVolume, elFSLyrics, elFSStory,
      elFSBg, elFSBgCover,
      elFSCharIcon, elFSCharName, elFSCharRole,
      elFSCoverImg, elFSCoverFallback, elFSCoverGlow, elFSCoverRing,
      elFSBandMode, elFSBandBtn, elFSFocusBtn, elFSBoostBtn, elFSLoopBtn;

  /* ---- Helpers ---- */
  function fmt(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setPlayIcon(playing) {
    const icon = playing ? '&#9646;&#9646;' : '&#9654;';
    if (elMiniPlay) elMiniPlay.innerHTML = icon;
    if (elFSPlay)   elFSPlay.innerHTML   = icon;
  }

  /* Pulso animado: aplica classe e remove após a animação (ponto 2) */
  function pulse(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  /* ---- Progresso ---- */
  function updateProgress() {
    if (!audio || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (elMiniFill) elMiniFill.style.width = pct + '%';
    if (elFSFill)   elFSFill.style.width   = pct + '%';
    if (elFSHead)   elFSHead.style.left    = pct + '%';
    if (elFSCurrent) elFSCurrent.textContent = fmt(audio.currentTime);
  }

  /* ---- Fundo dinâmico por música (ponto 8) ---- */
  function updateDynamicBg(album) {
    if (!elFSBgCover) return;
    if (album?.cover) {
      elFSBgCover.style.backgroundImage = `url("${album.cover}")`;
      elFSBgCover.style.opacity = '0.3';
    } else {
      elFSBgCover.style.backgroundImage = 'none';
      elFSBgCover.style.opacity = '0';
    }
  }

  /* ---- Capa grande no fullscreen (ponto 1) ---- */
  function updateFSCover(album) {
    if (!elFSCoverImg || !elFSCoverFallback) return;
    if (album?.cover) {
      elFSCoverImg.src     = album.cover;
      elFSCoverImg.style.display = 'block';
      elFSCoverFallback.style.display = 'none';
    } else {
      elFSCoverImg.src     = '';
      elFSCoverImg.style.display = 'none';
      elFSCoverFallback.style.display = 'flex';
    }
  }

  /* ---- Identidade do personagem (ponto 3) ---- */
  function updateCharacter() {
    const theme = document.body.getAttribute('data-theme') || 'trace';
    const char  = CHARS[theme] || CHARS.trace;
    if (elFSCharIcon) elFSCharIcon.textContent = char.icon;
    if (elFSCharName) elFSCharName.textContent = char.name;
    if (elFSCharRole) elFSCharRole.textContent = char.role;
  }

  /* ---- Glitch no título ao trocar música (ponto 6) ---- */
  function glitchTitle(text) {
    if (!elFSTitle) return;
    pulse(elFSTitle, 'glitch-text');
    elFSTitle.textContent = text;
  }

  /* ---- Carregar música ---- */
  function loadSong(idx, playAfterLoad = false) {
    if (idx < 0 || idx >= playlist.length) return;
    currentIdx = idx;
    const song  = playlist[idx];
    const album = typeof ALBUMS !== 'undefined'
      ? ALBUMS.find(a => a.id === song.albumId)
      : null;

    audio.src = '';
    if (playAfterLoad) {
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        play();
      };
      audio.addEventListener('canplay', onCanPlay);
    }
    audio.src = song.file;
    audio.load();

    /* Mini player */
    if (elMiniTitle) elMiniTitle.textContent = song.title;
    if (elMiniPlayer) elMiniPlayer.classList.remove('hidden');

    if (elMiniCoverImg && elMiniCoverFallback) {
      if (album?.cover) {
        elMiniCoverImg.src   = album.cover;
        elMiniCoverImg.alt   = album.name || '';
        elMiniCoverImg.style.display      = 'block';
        elMiniCoverFallback.style.display = 'none';
      } else {
        elMiniCoverImg.src   = '';
        elMiniCoverImg.style.display      = 'none';
        elMiniCoverFallback.style.display = 'flex';
        elMiniCoverFallback.textContent   = album?.coverEmoji || '🎵';
      }
    }

    /* Fullscreen */
    glitchTitle(song.title);
    if (elFSDuration) elFSDuration.textContent = song.duration;
    if (elFSCurrent)  elFSCurrent.textContent  = '0:00';
    if (elFSFill)     elFSFill.style.width      = '0%';
    if (elFSHead)     elFSHead.style.left        = '0%';
    if (elMiniFill)   elMiniFill.style.width    = '0%';

    updateFSCover(album);
    updateDynamicBg(album);
    updateCharacter();

    /* Lyrics & story */
    if (elFSLyrics) elFSLyrics.innerHTML =
      `<p>${(song.lyrics || '// no lyrics').replace(/\[([^\]]+)\]/g,
        '<strong>[$1]</strong>').replace(/\n/g, '<br>')}</p>`;
    if (elFSStory) elFSStory.innerHTML =
      `<p>${(song.story || '// no story yet').replace(/\n\n/g, '</p><p>')}</p>`;

    /* Highlight tracklist */
    document.querySelectorAll('.track-item').forEach((el, i) => {
      el.classList.toggle('playing', i === idx);
      const btn = el.querySelector('.track-play-btn');
      if (btn) btn.innerHTML = i === idx && isPlaying ? '&#9646;&#9646;' : '&#9654;';
    });
  }

  /* ---- Play / Pause ---- */
  function play() {
    const promise = audio.play();
    if (promise !== undefined) {
      promise.then(() => {
        isPlaying = true;
        setPlayIcon(true);
        updateTracklistBtns();
        if (elMiniPlayer) elMiniPlayer.classList.add('is-playing');
        if (typeof Visualizer !== 'undefined') Visualizer.start();
      }).catch(err => {
        console.warn('[Player] play() blocked:', err);
        isPlaying = false;
        setPlayIcon(false);
      });
    }
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    setPlayIcon(false);
    updateTracklistBtns();
    if (elMiniPlayer) elMiniPlayer.classList.remove('is-playing');
    if (typeof Visualizer !== 'undefined') Visualizer.stop();
  }

  function togglePlay() { isPlaying ? pause() : play(); }
  function next() { loadSong((currentIdx + 1) % playlist.length, isPlaying); }
  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    loadSong((currentIdx - 1 + playlist.length) % playlist.length, isPlaying);
  }
  function playIndex(idx) {
    if (idx === currentIdx) { togglePlay(); return; }
    loadSong(idx, true);
  }

  function updateTracklistBtns() {
    document.querySelectorAll('.track-item').forEach((el, i) => {
      const btn = el.querySelector('.track-play-btn');
      if (btn) btn.innerHTML = (i === currentIdx && isPlaying) ? '&#9646;&#9646;' : '&#9654;';
    });
  }

  /* ---- Seek ---- */
  function seekOnClick(bar, e) {
    if (!audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  }

  /* ---- Fullscreen ---- */
  function openFS() {
    if (!elFS) return;
    elFS.classList.add('open');
    elFS.removeAttribute('aria-hidden');
    updateCharacter();
    requestAnimationFrame(() => {
      if (typeof Visualizer !== 'undefined') Visualizer.resize();
    });
  }
  function closeFS() {
    if (elFS) { elFS.classList.remove('open'); elFS.setAttribute('aria-hidden', 'true'); }
  }

  /* ---- Modos extras (ponto 7) ---- */
  function toggleBandMode() {
    isBandMode = !isBandMode;
    elFSBandMode?.classList.toggle('visible', isBandMode);
    elFSBandBtn?.classList.toggle('active', isBandMode);
    if (isBandMode && typeof Visualizer !== 'undefined') Visualizer.initBandMode();
  }
  function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    elFS?.classList.toggle('focus-mode', isFocusMode);
    elFSFocusBtn?.classList.toggle('active', isFocusMode);
  }
  function toggleBoost() {
    isBoost = !isBoost;
    elFS?.classList.toggle('boost-mode', isBoost);
    elFSBoostBtn?.classList.toggle('active', isBoost);
    if (typeof Visualizer !== 'undefined') Visualizer.setBoost(isBoost);
  }
  function toggleLoop() {
    isLooping = !isLooping;
    audio.loop = isLooping;
    elFSLoopBtn?.classList.toggle('active', isLooping);
  }

  /* ---- Beat callbacks vindos do Visualizer (pontos 2, 4) ---- */
  function onBeat() {
    pulse(elFSCoverGlow, 'beat-glow');
    pulse(elFSCoverRing, 'ring-beat');
    pulse(elFSHead,      'beat-pulse');
    pulse(elFSPlay,      'beat-pulse');
    if (elFSCharIcon) pulse(elFSCharIcon, 'beat-pulse');
  }

  /* ---- Tabs ---- */
  function initTabs() {
    document.querySelectorAll('.fs-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.fs-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.fs-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const pane = document.getElementById(`tab-${tab.dataset.tab}`);
        if (pane) pane.classList.add('active');
      });
    });
  }

  /* ---- Init ---- */
  function init(songs) {
    playlist = songs;
    audio    = document.getElementById('audioEngine');
    if (!audio) return;

    /* Mini player refs */
    elMiniPlayer        = document.getElementById('miniPlayer');
    elMiniTitle         = document.getElementById('miniTitle');
    elMiniPlay          = document.getElementById('miniPlay');
    elMiniPrev          = document.getElementById('miniPrev');
    elMiniNext          = document.getElementById('miniNext');
    elMiniFill          = document.getElementById('miniProgressFill');
    elMiniFillBar       = document.getElementById('miniProgressBar');
    elExpandPlayer      = document.getElementById('expandPlayer');
    elMiniCoverImg      = document.getElementById('miniCoverImg');
    elMiniCoverFallback = document.getElementById('miniCoverFallback');

    /* Fullscreen refs */
    elFS            = document.getElementById('fullscreenPlayer');
    elFSClose       = document.getElementById('fsCloseBtn');
    elFSPlay        = document.getElementById('fsPlay');
    elFSPrev        = document.getElementById('fsPrev');
    elFSNext        = document.getElementById('fsNext');
    elFSTitle       = document.getElementById('fsTitle');
    elFSCurrent     = document.getElementById('fsCurrent');
    elFSDuration    = document.getElementById('fsDuration');
    elFSFill        = document.getElementById('fsProgressFill');
    elFSBar         = document.getElementById('fsProgressBar');
    elFSHead        = document.getElementById('fsProgressHead');
    elFSVolume      = document.getElementById('fsVolume');
    elFSLyrics      = document.getElementById('fsLyrics');
    elFSStory       = document.getElementById('fsStory');
    elFSBgCover     = document.getElementById('fsBgCover');
    elFSCharIcon    = document.getElementById('fsCharIcon');
    elFSCharName    = document.getElementById('fsCharName');
    elFSCharRole    = document.getElementById('fsCharRole');
    elFSCoverImg    = document.getElementById('fsCoverImg');
    elFSCoverFallback = document.getElementById('fsCoverFallback');
    elFSCoverGlow   = document.getElementById('fsCoverGlow');
    elFSCoverRing   = document.getElementById('fsCoverRing');
    elFSBandMode    = document.getElementById('fsBandModePanel');
    elFSBandBtn     = document.getElementById('fsBandModeBtn');
    elFSFocusBtn    = document.getElementById('fsFocusModeBtn');
    elFSBoostBtn    = document.getElementById('fsBoostBtn');
    elFSLoopBtn     = document.getElementById('fsLoopBtn');

    /* Boost on por padrão */
    isBoost = true;
    elFS?.classList.add('boost-mode');
    elFSBoostBtn?.classList.add('active');

    /* Audio events */
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', next);
    audio.addEventListener('loadedmetadata', () => {
      if (elFSDuration) elFSDuration.textContent = fmt(audio.duration);
    });

    /* Mini player controls */
    elMiniPlay?.addEventListener('click', togglePlay);
    elMiniPrev?.addEventListener('click', prev);
    elMiniNext?.addEventListener('click', next);
    elExpandPlayer?.addEventListener('click', openFS);
    elMiniFillBar?.addEventListener('click', e => seekOnClick(elMiniFillBar, e));

    /* Fullscreen controls */
    elFSPlay?.addEventListener('click', togglePlay);
    elFSPrev?.addEventListener('click', prev);
    elFSNext?.addEventListener('click', next);
    elFSClose?.addEventListener('click', closeFS);
    elFSBar?.addEventListener('click', e => seekOnClick(elFSBar, e));
    elFSVolume?.addEventListener('input', () => { audio.volume = parseFloat(elFSVolume.value); });

    /* Modos extras (ponto 7) */
    elFSBandBtn?.addEventListener('click', toggleBandMode);
    elFSFocusBtn?.addEventListener('click', toggleFocusMode);
    elFSBoostBtn?.addEventListener('click', toggleBoost);
    elFSLoopBtn?.addEventListener('click', toggleLoop);

    /* Keyboard shortcuts */
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (document.body.classList.contains('lb-active')) return;
      if (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') next();
      if (e.code === 'ArrowLeft')  prev();
      if (e.code === 'Escape')     closeFS();
    });

    /* Atualiza personagem quando muda o tema */
    document.addEventListener('themeChanged', updateCharacter);

    initTabs();

    /* Inicializa visualizador e passa callback de beat */
    if (typeof Visualizer !== 'undefined') {
      Visualizer.init(audio, { onBeat });
    }
  }

  return {
    init,
    playIndex,
    togglePlay,
    next,
    prev,
    isPlaying: () => isPlaying,
    onThemeChange: updateCharacter,
  };
})();
