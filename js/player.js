/* =========================================================
   ECHODOME — js/player.js  v2
   Audio engine + mini player + fullscreen imersivo.
   Implementa todos os 9 pontos do redesign.
   ========================================================= */

const Player = (() => {

  /* ---- Estado ---- */
  let audio        = null;
  let playlist     = [];
  let shuffleOrder = [];   // índices embaralhados (ponto 4)
  let currentIdx  = -1;
  let isPlaying   = false;
  let isLooping   = false;
  let isShuffling = false;   // ponto 4
  let shufflePos  = 0;       // posição atual dentro de shuffleOrder
  let isBandMode  = false;
  let isFocusMode = false;
  let isBoost     = false;
  let _playRecorded = false;

  /* ---- Personagens (ponto 3) ---- */
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
      elFSBgCover,
      elFSCharIcon, elFSCharName, elFSCharRole,
      elFSCoverImg, elFSCoverFallback, elFSCoverGlow, elFSCoverRing,
      elFSBandMode, elFSBandBtn, elFSFocusBtn, elFSBoostBtn, elFSLoopBtn,
      elFSShuffleBtn;

  /* ---- Helpers ---- */
  function fmt(sec) {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  function setPlayIcon(playing) {
    const icon = playing ? Icons.get('pause') : Icons.get('play');
    if (elMiniPlay) elMiniPlay.innerHTML = icon;
    if (elFSPlay)   elFSPlay.innerHTML   = icon;
    const ov = document.getElementById('fsPlayOverlay');
    if (ov) ov.innerHTML = icon;
  }

  /* Pulso animado: força reflow e adiciona classe */
  function pulse(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener('animationend', function() { el.classList.remove(cls); }, { once: true });
  }

  /* ---- Progresso ---- */
  function updateProgress() {
    if (!audio || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (elMiniFill) elMiniFill.style.width = pct + '%';
    if (elFSFill)   elFSFill.style.width   = pct + '%';
    if (elFSHead)   elFSHead.style.left    = pct + '%';
    if (elFSCurrent) elFSCurrent.textContent = fmt(audio.currentTime);
    if (elFSBar)    elFSBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  /* ---- Fundo dinâmico (ponto 8) ---- */
  function updateDynamicBg(album) {
    if (!elFSBgCover) return;
    if (album && album.cover) {
      elFSBgCover.style.backgroundImage = 'url("' + album.cover + '")';
      elFSBgCover.style.opacity = '0.28';
    } else {
      elFSBgCover.style.backgroundImage = 'none';
      elFSBgCover.style.opacity = '0';
    }
  }

  /* ---- Capa no fullscreen (ponto 1) ---- */
  function updateFSCover(album) {
    if (!elFSCoverImg || !elFSCoverFallback) return;
    if (album && album.cover) {
      elFSCoverImg.src     = album.cover;
      elFSCoverImg.style.display = 'block';
      elFSCoverFallback.style.display = 'none';
    } else {
      elFSCoverImg.src     = '';
      elFSCoverImg.style.display     = 'none';
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

  /* ---- Transição da capa: explode e volta (ponto 6) ---- */
  function transitionCover(album) {
    if (!elFSCoverImg) return;
    const wrap = elFSCoverImg.closest('.fs-cover-img-wrap');
    if (!wrap) { updateFSCover(album); return; }
    // Escala para cima rápido, troca a imagem, volta
    wrap.style.transition = 'transform 0.15s ease-in, opacity 0.15s ease-in';
    wrap.style.transform  = 'scale(1.08)';
    wrap.style.opacity    = '0.4';
    setTimeout(function() {
      updateFSCover(album);
      wrap.style.transition = 'transform 0.3s cubic-bezier(.2,1.4,.4,1), opacity 0.25s ease-out';
      wrap.style.transform  = 'scale(1)';
      wrap.style.opacity    = '1';
    }, 160);
  }

  /* ---- Carregar música ---- */
  function loadSong(idx, playAfterLoad) {
    if (idx < 0 || idx >= playlist.length) return;
    currentIdx = idx;
    _playRecorded = false;  /* reset para nova música */
    const song  = playlist[idx];
    const album = (typeof ALBUMS !== 'undefined')
      ? ALBUMS.find(function(a) { return a.id === song.albumId; })
      : null;

    audio.src = '';
    if (playAfterLoad) {
      const onCanPlay = function() {
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
      if (album && album.cover) {
        elMiniCoverImg.src   = album.cover;
        elMiniCoverImg.alt   = album.name || '';
        elMiniCoverImg.style.display      = 'block';
        elMiniCoverFallback.style.display = 'none';
      } else {
        elMiniCoverImg.src   = '';
        elMiniCoverImg.style.display      = 'none';
        elMiniCoverFallback.style.display = 'flex';
        elMiniCoverFallback.innerHTML = Icons.get('music');
      }
    }

    /* Fullscreen */
    glitchTitle(song.title);
    transitionCover(album);
    if (elFSDuration) elFSDuration.textContent = song.duration;
    if (elFSCurrent)  elFSCurrent.textContent  = '0:00';
    if (elFSFill)     elFSFill.style.width      = '0%';
    if (elFSHead)     elFSHead.style.left        = '0%';
    if (elMiniFill)   elMiniFill.style.width    = '0%';

    updateDynamicBg(album);
    updateCharacter();
    updateMediaSession(song, album);  /* ponto 2 — tela de lock */

    /* Lyrics & story */
    if (elFSLyrics) elFSLyrics.innerHTML =
      '<p>' + ((song.lyrics || '// no lyrics').replace(/\[([^\]]+)\]/g,
        '<strong>[$1]</strong>').replace(/\n/g, '<br>')) + '</p>';
    if (elFSStory) elFSStory.innerHTML =
      '<p>' + ((song.story || '// no story yet').replace(/\n\n/g, '</p><p>')) + '</p>';

    /* Highlight tracklist */
    document.querySelectorAll('.track-item').forEach(function(el, i) {
      el.classList.toggle('playing', i === idx);
    });
  }

  /* ---- Media Session API (ponto 2) ---- */
  /* Preenche os metadados e controles na tela de lock / notificação de mídia */
  function updateMediaSession(song, album) {
    if (!('mediaSession' in navigator)) return;

    // Artwork: prefere capa de single (assets/single/<id>.svg),
    // fallback para capa do álbum, fallback para ícone do app.
    const artworkSrc = song.singleCover
      ? song.singleCover
      : album && album.cover
        ? album.cover
        : 'assets/icons/icon-512.png';

    navigator.mediaSession.metadata = new MediaMetadata({
      title:  song.title,
      artist: 'Echodome',
      album:  album ? album.name : 'Echodome',
      artwork: [
        { src: artworkSrc, sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.setActionHandler('play',          () => play());
    navigator.mediaSession.setActionHandler('pause',         () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack',     () => next());
    navigator.mediaSession.setActionHandler('seekto', details => {
      if (audio && details.seekTime != null) {
        audio.currentTime = details.seekTime;
      }
    });
  }

  /* Mantém o estado playback do Media Session em sincronia */
  function syncMediaSessionState() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    if (audio && audio.duration) {
      navigator.mediaSession.setPositionState({
        duration:     audio.duration,
        playbackRate: audio.playbackRate,
        position:     audio.currentTime,
      });
    }
  }

  /* ---- Shuffle (ponto 4) ---- */
  /* Fisher-Yates colocando o índice atual na primeira posição */
  function buildShuffleOrder(currentSongIdx) {
    const arr = playlist.map((_, i) => i).filter(i => i !== currentSongIdx);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffleOrder = [currentSongIdx, ...arr];
    shufflePos   = 0;
  }

  function toggleShuffle() {
    isShuffling = !isShuffling;
    if (isShuffling) buildShuffleOrder(currentIdx);
    if (elFSShuffleBtn) elFSShuffleBtn.classList.toggle('active', isShuffling);
  }

  /* ---- Play / Pause ---- */
  function play() {
    const promise = audio.play();
    if (promise !== undefined) {
      promise.then(function() {
        isPlaying = true;
        setPlayIcon(true);
        updateTracklistBtns();
        if (elMiniPlayer) elMiniPlayer.classList.add('is-playing');
        if (typeof Visualizer !== 'undefined') Visualizer.start();
        syncMediaSessionState();
      }).catch(function(err) {
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
    syncMediaSessionState();
  }

  function togglePlay() { isPlaying ? pause() : play(); }

  function next() {
    if (isShuffling) {
      shufflePos = (shufflePos + 1) % shuffleOrder.length;
      loadSong(shuffleOrder[shufflePos], isPlaying);
    } else {
      loadSong((currentIdx + 1) % playlist.length, isPlaying);
    }
  }

  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (isShuffling) {
      shufflePos = (shufflePos - 1 + shuffleOrder.length) % shuffleOrder.length;
      loadSong(shuffleOrder[shufflePos], isPlaying);
    } else {
      loadSong((currentIdx - 1 + playlist.length) % playlist.length, isPlaying);
    }
  }
  function playIndex(idx) {
    if (idx === currentIdx) { togglePlay(); return; }
    loadSong(idx, true);
  }

  /* Toca uma música da fila (por objeto, não por índice da playlist) */
  function playQueueItemInternal(song) {
    const idx = playlist.findIndex(s => s.id === song.id);
    if (idx !== -1) { loadSong(idx, true); }
    else {
      /* Música não está na playlist — injeta temporariamente */
      playlist.push(song);
      loadSong(playlist.length - 1, true);
    }
  }

  function updateTracklistBtns() {
    /* track-play-btn removido (#3) — sem-op mantido para compatibilidade */
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
    requestAnimationFrame(function() {
      if (typeof Visualizer !== 'undefined') Visualizer.resize();
    });
  }
  function closeFS() {
    if (elFS) { elFS.classList.remove('open'); elFS.setAttribute('aria-hidden', 'true'); }
  }

  /* ---- Modos extras (ponto 7) ---- */
  function toggleBandMode() {
    isBandMode = !isBandMode;
    /* Troca waveform ↔ band mode panel */
    const waveWrap = document.querySelector('.fs-waveform-wrap');
    if (waveWrap)    waveWrap.classList.toggle('band-active', isBandMode);
    if (elFSBandMode) elFSBandMode.classList.toggle('visible', isBandMode);
    if (elFSBandBtn)  elFSBandBtn.classList.toggle('active', isBandMode);
    if (isBandMode && typeof Visualizer !== 'undefined') Visualizer.initBandMode();
  }
  function toggleFocusMode() {
    isFocusMode = !isFocusMode;
    if (elFS)        elFS.classList.toggle('focus-mode', isFocusMode);
    if (elFSFocusBtn) elFSFocusBtn.classList.toggle('active', isFocusMode);
  }
  function toggleBoost() {
    isBoost = !isBoost;
    if (elFS)        elFS.classList.toggle('boost-mode', isBoost);
    if (elFSBoostBtn) elFSBoostBtn.classList.toggle('active', isBoost);
    if (typeof Visualizer !== 'undefined') Visualizer.setBoost(isBoost);
  }
  function toggleLoop() {
    isLooping = !isLooping;
    audio.loop = isLooping;
    if (elFSLoopBtn) elFSLoopBtn.classList.toggle('active', isLooping);
  }

  /* ---- Beat callbacks do Visualizer (pontos 2, 4) ---- */
  function onBeat() {
    pulse(elFSCoverGlow, 'beat-glow');
    pulse(elFSCoverRing, 'ring-beat');
    pulse(elFSHead,      'beat-pulse');
    pulse(elFSPlay,      'beat-pulse');
    if (elFSCharIcon) pulse(elFSCharIcon, 'beat-pulse');
  }

  /* ---- Tabs ---- */
  function initTabs() {
    document.querySelectorAll('.fs-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.fs-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.fs-tab-pane').forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        const pane = document.getElementById('tab-' + tab.dataset.tab);
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

    elFSShuffleBtn  = document.getElementById('fsShuffleBtn');
    const elFSShareBtn = document.getElementById('fsShareBtn');

    /* Boost ativo por padrão */
    isBoost = true;
    if (elFS)        elFS.classList.add('boost-mode');
    if (elFSBoostBtn) elFSBoostBtn.classList.add('active');

    /* Audio events */
    audio.addEventListener('timeupdate', function() {
      updateProgress();
      syncMediaSessionState();
    });
    audio.addEventListener('ended', function() {
      /* Verifica fila customizada antes de avançar normalmente */
      if (typeof Queue !== 'undefined' && !Queue.isEmpty() && Queue.hasNext()) {
        const nextSong = Queue.shiftNext();
        if (nextSong) { playQueueItemInternal(nextSong); return; }
      }
      next();
    });
    audio.addEventListener('loadedmetadata', function() {
      if (elFSDuration) elFSDuration.textContent = fmt(audio.duration);
    });
    /* Registra play quando passou >10s (confirmado que ouviu) */
    audio.addEventListener('timeupdate', function() {
      if (!_playRecorded && audio.currentTime > 10) {
        _playRecorded = true;
        const song = playlist[currentIdx];
        if (song && typeof Plays !== 'undefined') {
          Plays.record(song.id);
          if (typeof LyricsBrowser !== 'undefined') LyricsBrowser.syncWithPlayer(song.id);
        }
      }
    });

    /* Mini player controls */
    if (elMiniPlay)   elMiniPlay.addEventListener('click', togglePlay);
    if (elMiniPrev)   elMiniPrev.addEventListener('click', prev);
    if (elMiniNext)   elMiniNext.addEventListener('click', next);
    if (elExpandPlayer) elExpandPlayer.addEventListener('click', openFS);
    if (elMiniFillBar)  elMiniFillBar.addEventListener('click', function(e) { seekOnClick(elMiniFillBar, e); });

    /* Fullscreen controls */
    if (elFSPlay)  elFSPlay.addEventListener('click', togglePlay);
    if (elFSPrev)  elFSPrev.addEventListener('click', prev);
    if (elFSNext)  elFSNext.addEventListener('click', next);
    if (elFSClose) elFSClose.addEventListener('click', closeFS);
    if (elFSBar)   elFSBar.addEventListener('click', function(e) { seekOnClick(elFSBar, e); });
    if (elFSVolume) elFSVolume.addEventListener('input', function() {
      audio.volume = parseFloat(elFSVolume.value);
    });

    /* Focus mode overlay controls (espelham os principais) */
    const elFSPlayOverlay = document.getElementById('fsPlayOverlay');
    const elFSPrevOverlay = document.getElementById('fsPrevOverlay');
    const elFSNextOverlay = document.getElementById('fsNextOverlay');
    if (elFSPlayOverlay) elFSPlayOverlay.addEventListener('click', togglePlay);
    if (elFSPrevOverlay) elFSPrevOverlay.addEventListener('click', prev);
    if (elFSNextOverlay) elFSNextOverlay.addEventListener('click', next);

    /* Modos extras (ponto 7) */
    if (elFSBandBtn)    elFSBandBtn.addEventListener('click', toggleBandMode);
    if (elFSFocusBtn)   elFSFocusBtn.addEventListener('click', toggleFocusMode);
    if (elFSBoostBtn)   elFSBoostBtn.addEventListener('click', toggleBoost);
    if (elFSLoopBtn)    elFSLoopBtn.addEventListener('click', toggleLoop);
    if (elFSShuffleBtn) elFSShuffleBtn.addEventListener('click', toggleShuffle);

    /* Share (ponto 18) */
    if (elFSShareBtn) elFSShareBtn.addEventListener('click', () => {
      const song = playlist[currentIdx];
      if (!song) return;
      const shareData = {
        title: song.title + ' — ECHODOME',
        text:  `Ouça "${song.title}" da Echodome 🎸`,
        url:   window.location.href,
      };
      if (navigator.share) {
        navigator.share(shareData).catch(() => {});
      } else {
        /* Fallback: copia o link */
        navigator.clipboard.writeText(shareData.url).then(() => {
          const orig = elFSShareBtn.title;
          elFSShareBtn.title = 'Link copiado!';
          setTimeout(() => { elFSShareBtn.title = orig; }, 2000);
        });
      }
    });

    /* Swipe para fechar fullscreen (mobile) */
    let touchStartY = 0;
    if (elFS) {
      elFS.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });
      elFS.addEventListener('touchend', function(e) {
        const diff = e.changedTouches[0].clientY - touchStartY;
        if (diff > 80) closeFS();
      }, { passive: true });
    }

    /* Keyboard shortcuts */
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT') return;
      if (document.body.classList.contains('lb-active')) return;
      if (e.code === 'Space')      { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') {
        /* Se o player fullscreen estiver aberto, busca +5s; senão, próxima faixa */
        if (elFS && elFS.classList.contains('open')) {
          e.preventDefault();
          if (audio && audio.duration) audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
        } else { next(); }
      }
      if (e.code === 'ArrowLeft') {
        if (elFS && elFS.classList.contains('open')) {
          e.preventDefault();
          if (audio && audio.duration) audio.currentTime = Math.max(audio.currentTime - 5, 0);
        } else { prev(); }
      }
      if (e.code === 'Escape')     closeFS();
      if (e.code === 'KeyF')       { if (elFS && elFS.classList.contains('open')) toggleFocusMode(); }
    });

    /* Atualiza personagem quando muda tema */
    document.addEventListener('themeChanged', updateCharacter);

    initTabs();

    /* Inicializa visualizador */
    if (typeof Visualizer !== 'undefined') {
      Visualizer.init(audio, { onBeat: onBeat });
    }
  }

  return {
    init,
    playIndex,
    playQueueItem: playQueueItemInternal,
    togglePlay,
    next,
    prev,
    toggleShuffle,
    isPlaying:   function() { return isPlaying; },
    isShuffling: function() { return isShuffling; },
    onThemeChange: updateCharacter,
  };
})();
