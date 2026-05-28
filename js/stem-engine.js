/* =========================================================
   ECHODOME — js/stem-engine.js
   Gerencia stems separados por instrumento (saída do Demucs).
   Carrega SOMENTE quando o Band Mode é ativado.

   Estrutura de stems esperada (Demucs htdemucs, 4 stems):
     assets/songs/<song-id>/stems/vocals.mp3  (ou .ogg)
     assets/songs/<song-id>/stems/bass.mp3
     assets/songs/<song-id>/stems/drums.mp3
     assets/songs/<song-id>/stems/other.mp3   (guitarra / keys)

   No campo `stems` de cada música em songs/index.js você pode
   sobrescrever os caminhos padrão e definir quais canais exibir:

   stems: {
     vocals: "assets/songs/love-story/stems/vocals.mp3",
     bass:   "assets/songs/love-story/stems/bass.mp3",
     drums:  "assets/songs/love-story/stems/drums.mp3",
     guitar: "assets/songs/love-story/stems/other.mp3",
     keys:   null,   // null = não existe nessa música
   }

   EQ por instrumento (BiquadFilter nodes):
   ┌────────────┬──────────┬────────────┬──────────────────────────────┐
   │ Canal      │ Filtro 1 │ Filtro 2   │ Justificativa                │
   ├────────────┼──────────┼────────────┼──────────────────────────────┤
   │ vocals     │ HPF 80Hz │ Presence   │ Corta grave do microfone;    │
   │            │          │ 3kHz +2dB  │ destaca dicção               │
   ├────────────┼──────────┼────────────┼──────────────────────────────┤
   │ bass       │ LPF 500Hz│ Low shelf  │ Mantém frequências de baixo; │
   │            │          │ 60Hz +3dB  │ punch no bumbo               │
   ├────────────┼──────────┼────────────┼──────────────────────────────┤
   │ drums      │ HPF 60Hz │ Presence   │ Corta rumble; brilho em hi-  │
   │            │          │ 8kHz +2dB  │ hat e pratos                 │
   ├────────────┼──────────┼────────────┼──────────────────────────────┤
   │ guitar     │ HPF 100Hz│ Peak       │ Corta mud; mid-range         │
   │            │          │ 2kHz +1dB  │ presença da guitarra         │
   ├────────────┼──────────┼────────────┼──────────────────────────────┤
   │ keys       │ HPF 60Hz │ High shelf │ Corta sub; abre o brilho     │
   │            │          │ 6kHz +1.5dB│ dos teclados                 │
   └────────────┴──────────┴────────────┴──────────────────────────────┘
   ========================================================= */

const StemEngine = (() => {

  /* ---- Estado ---- */
  let audioCtx    = null;   // AudioContext compartilhado com o Visualizer
  let channels    = {};     // { id: { el, source, gainNode, eq[], analyser, muted, vol } }
  let currentSongId = null;
  let loadAbort   = null;   // AbortController para cancelar fetch em andamento

  /* ---- Mapa de EQ por instrumento ---- */
  /*
     Cada entrada é uma lista de filtros:
       { type, frequency, gain, Q }
     Os filtros são encadeados em série na cadeia de áudio.
  */
  const EQ_PRESETS = {
    vocals: [
      { type: 'highpass',  frequency: 80,   gain: 0,   Q: 0.7  },
      { type: 'peaking',   frequency: 3000, gain: 2.0, Q: 1.2  },
    ],
    bass: [
      { type: 'lowshelf',  frequency: 60,   gain: 3.0, Q: 0.7  },
      { type: 'lowpass',   frequency: 500,  gain: 0,   Q: 0.7  },
    ],
    drums: [
      { type: 'highpass',  frequency: 60,   gain: 0,   Q: 0.7  },
      { type: 'peaking',   frequency: 8000, gain: 2.0, Q: 0.8  },
    ],
    guitar: [
      { type: 'highpass',  frequency: 100,  gain: 0,   Q: 0.7  },
      { type: 'peaking',   frequency: 2000, gain: 1.0, Q: 1.0  },
    ],
    keys: [
      { type: 'highpass',  frequency: 60,   gain: 0,   Q: 0.7  },
      { type: 'highshelf', frequency: 6000, gain: 1.5, Q: 0.7  },
    ],
    other: [
      { type: 'highpass',  frequency: 100,  gain: 0,   Q: 0.7  },
      { type: 'peaking',   frequency: 2000, gain: 1.0, Q: 1.0  },
    ],
  };

  /* Labels e IDs dos canais para o painel */
  const CHANNEL_META = [
    { id: 'vocals', label: 'VOX',   icon: '🎤' },
    { id: 'bass',   label: 'BASS',  icon: '🎸' },
    { id: 'drums',  label: 'DRUMS', icon: '🥁' },
    { id: 'guitar', label: 'GTR',   icon: '🎸' },
    { id: 'keys',   label: 'KEYS',  icon: '🎹' },
    { id: 'other',  label: 'OTHER', icon: '🎵' },
  ];

  /* ---- Helpers ---- */

  function getCtx() {
    /* Reutiliza o AudioContext do Visualizer se disponível */
    if (window._vizAudioCtx) return window._vizAudioCtx;
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      window._vizAudioCtx = audioCtx;
    }
    return audioCtx;
  }

  function buildEqChain(ctx, preset) {
    return preset.map(cfg => {
      const f = ctx.createBiquadFilter();
      f.type            = cfg.type;
      f.frequency.value = cfg.frequency;
      if (cfg.gain !== undefined) f.gain.value = cfg.gain;
      if (cfg.Q    !== undefined) f.Q.value    = cfg.Q;
      return f;
    });
  }

  /* Conecta nós em série: source → n[0] → n[1] → ... → dest */
  function chainConnect(nodes, dest) {
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }
    nodes[nodes.length - 1].connect(dest);
  }

  function disposeChannels() {
    for (const id in channels) {
      const ch = channels[id];
      try {
        if (ch.el) { ch.el.pause(); ch.el.src = ''; }
        if (ch.source)   ch.source.disconnect();
        if (ch.gainNode) ch.gainNode.disconnect();
        ch.eq.forEach(f => { try { f.disconnect(); } catch(_) {} });
        if (ch.analyser) ch.analyser.disconnect();
      } catch(_) {}
    }
    channels = {};
  }

  /* ---- Painel de controles no DOM ---- */

  function buildPanel(availableIds) {
    const panel = document.getElementById('fsBandModePanel');
    if (!panel) return;
    panel.innerHTML = '';

    availableIds.forEach(id => {
      const meta = CHANNEL_META.find(m => m.id === id) || { id, label: id.toUpperCase(), icon: '♪' };

      /* Wrapper do canal */
      const col = document.createElement('div');
      col.className  = 'band-channel';
      col.dataset.stemId = id;

      /* Canvas do EQ visualizer desse stem */
      const cv = document.createElement('canvas');
      cv.className = 'band-eq-canvas';
      cv.id        = 'eqStem_' + id;
      col.appendChild(cv);

      /* Label */
      const lbl = document.createElement('span');
      lbl.className   = 'band-channel-label';
      lbl.textContent = meta.label;
      col.appendChild(lbl);

      /* Controles: volume slider + mute */
      const ctrl = document.createElement('div');
      ctrl.className = 'stem-controls';

      const vol = document.createElement('input');
      vol.type  = 'range';
      vol.min   = '0';
      vol.max   = '1';
      vol.step  = '0.01';
      vol.value = '1';
      vol.className       = 'stem-vol-slider';
      vol.dataset.stemId  = id;
      vol.setAttribute('aria-label', meta.label + ' volume');

      const muteBtn = document.createElement('button');
      muteBtn.className       = 'stem-mute-btn';
      muteBtn.dataset.stemId  = id;
      muteBtn.setAttribute('aria-label', 'Mute ' + meta.label);
      muteBtn.innerHTML = '🔊';

      ctrl.appendChild(vol);
      ctrl.appendChild(muteBtn);
      col.appendChild(ctrl);

      panel.appendChild(col);

      /* Eventos */
      vol.addEventListener('input', () => setVolume(id, parseFloat(vol.value)));
      muteBtn.addEventListener('click', () => toggleMute(id));
    });

    /* Indicador de carregamento */
    const loading = document.createElement('div');
    loading.className = 'stem-loading-indicator';
    loading.id        = 'stemLoadingMsg';
    loading.textContent = 'Carregando stems…';
    panel.appendChild(loading);
  }

  function setLoadingState(visible) {
    const el = document.getElementById('stemLoadingMsg');
    if (el) el.style.display = visible ? 'flex' : 'none';
  }

  /* ---- Carregamento de um stem ---- */

  function createChannel(ctx, id, url) {
    return new Promise((resolve, reject) => {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload     = 'auto';

      el.addEventListener('canplaythrough', () => {
        const source   = ctx.createMediaElementSource(el);
        const preset   = EQ_PRESETS[id] || EQ_PRESETS.other;
        const eq       = buildEqChain(ctx, preset);
        const gainNode = ctx.createGain();
        const analyser = ctx.createAnalyser();
        analyser.fftSize               = 1024;
        analyser.smoothingTimeConstant = 0.8;

        /* Cadeia: source → eq[0..n] → gainNode → analyser → destination */
        source.connect(eq[0]);
        chainConnect(eq, gainNode);
        gainNode.connect(analyser);
        analyser.connect(ctx.destination);

        channels[id] = { el, source, gainNode, eq, analyser, muted: false, vol: 1 };
        resolve();
      }, { once: true });

      el.addEventListener('error', reject, { once: true });
      el.src = url;
    });
  }

  /* ---- Sincroniza playback de todos os stems com o áudio principal ---- */

  function syncAll(masterAudio) {
    const masterTime = masterAudio.currentTime;
    for (const id in channels) {
      const el = channels[id].el;
      el.currentTime = masterTime;
      if (!masterAudio.paused) el.play().catch(() => {});
    }
  }

  /* ---- API pública ---- */

  /* Chamado pelo Player ao entrar em band mode */
  async function load(song, masterAudio) {
    if (!song) return;
    if (currentSongId === song.id) { syncAll(masterAudio); return; }

    /* Cancela carregamento anterior */
    if (loadAbort) loadAbort.abort();
    loadAbort = new AbortController();

    disposeChannels();
    currentSongId = song.id;

    /* Descobre quais stems estão disponíveis */
    const stemMap = song.stems || buildDefaultStems(song);
    const availableIds = Object.keys(stemMap).filter(k => stemMap[k]);

    /* Reconstrói o painel antes de carregar */
    buildPanel(availableIds);
    setLoadingState(true);

    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      await Promise.all(
        availableIds.map(id => createChannel(ctx, id, stemMap[id]))
      );
      setLoadingState(false);
      syncAll(masterAudio);

      /* Sincroniza eventos do audio principal com os stems */
      masterAudio.addEventListener('play',   () => resumeAll(),  { signal: loadAbort.signal });
      masterAudio.addEventListener('pause',  () => pauseAll(),   { signal: loadAbort.signal });
      masterAudio.addEventListener('seeked', () => syncAll(masterAudio), { signal: loadAbort.signal });

      /* Notifica Visualizer sobre os novos analysers */
      if (typeof Visualizer !== 'undefined') {
        Visualizer.setStemAnalysers(getStemAnalysers());
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[StemEngine] Erro ao carregar stems:', err);
        setLoadingState(false);
        showStemError();
      }
    }
  }

  /* Caminho padrão baseado no song.id (convenção Demucs htdemucs) */
  function buildDefaultStems(song) {
    const base = 'assets/songs/' + song.id + '/stems/';
    return {
      vocals: base + 'vocals.mp3',
      bass:   base + 'bass.mp3',
      drums:  base + 'drums.mp3',
      other:  base + 'other.mp3',
    };
  }

  function showStemError() {
    const panel = document.getElementById('fsBandModePanel');
    if (!panel) return;
    const msg = document.createElement('p');
    msg.className   = 'stem-error-msg';
    msg.textContent = 'Stems não encontrados para esta música.';
    panel.appendChild(msg);
  }

  function pauseAll() {
    for (const id in channels) channels[id].el.pause();
  }

  function resumeAll() {
    for (const id in channels) {
      if (!channels[id].muted) channels[id].el.play().catch(() => {});
    }
  }

  function setVolume(id, value) {
    if (!channels[id]) return;
    channels[id].vol = value;
    channels[id].gainNode.gain.value = channels[id].muted ? 0 : value;
  }

  function toggleMute(id) {
    if (!channels[id]) return;
    const ch = channels[id];
    ch.muted = !ch.muted;
    ch.gainNode.gain.value = ch.muted ? 0 : ch.vol;

    const btn = document.querySelector(`.stem-mute-btn[data-stem-id="${id}"]`);
    if (btn) {
      btn.innerHTML = ch.muted ? '🔇' : '🔊';
      btn.classList.toggle('muted', ch.muted);
    }
    const col = document.querySelector(`.band-channel[data-stem-id="${id}"]`);
    if (col) col.classList.toggle('stem-muted', ch.muted);
  }

  /* Retorna os analysers dos stems para o Visualizer desenhar */
  function getStemAnalysers() {
    const result = {};
    for (const id in channels) {
      result[id] = channels[id].analyser;
    }
    return result;
  }

  /* Liberação total (ex: troca de música sem band mode) */
  function unload() {
    if (loadAbort) { loadAbort.abort(); loadAbort = null; }
    disposeChannels();
    currentSongId = null;
  }

  return { load, unload, pauseAll, resumeAll, getStemAnalysers };
})();
