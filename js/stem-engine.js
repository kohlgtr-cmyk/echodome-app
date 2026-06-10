/* =========================================================
   ECHODOME — js/stem-engine.js
   Gerencia stems separados por instrumento (saída do Demucs).
   Carrega SOMENTE quando o Band Mode é ativado.

   Estrutura de stems esperada em songs/index.js:

   stems: {
     vocals:       'assets/songs/nome/stems/vocals.mp3',
     bass:         'assets/songs/nome/stems/bass.mp3',
     drums:        'assets/songs/nome/stems/drums.mp3',
     guitar:       'assets/songs/nome/stems/guitar.mp3',
     keys:         'assets/songs/nome/stems/keys.mp3',
     other:        'assets/songs/nome/stems/other.mp3',
     instrumental: 'assets/songs/nome/stems/instrumental.mp3',
   }

   Qualquer campo pode ser null ou omitido — o canal é ignorado.

   EQ por instrumento (BiquadFilter nodes):
   ┌──────────────┬──────────┬────────────┬──────────────────────────────┐
   │ Canal        │ Filtro 1 │ Filtro 2   │ Justificativa                │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ vocals       │ HPF 80Hz │ Presence   │ Corta grave do microfone;    │
   │              │          │ 3kHz +2dB  │ destaca dicção               │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ bass         │ LPF 500Hz│ Low shelf  │ Mantém frequências de baixo; │
   │              │          │ 60Hz +3dB  │ punch no bumbo               │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ drums        │ HPF 60Hz │ Presence   │ Corta rumble; brilho em hi-  │
   │              │          │ 8kHz +2dB  │ hat e pratos                 │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ guitar       │ HPF 100Hz│ Peak       │ Corta mud; mid-range         │
   │              │          │ 2kHz +1dB  │ presença da guitarra         │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ keys         │ HPF 60Hz │ High shelf │ Corta sub; abre o brilho     │
   │              │          │ 6kHz +1.5dB│ dos teclados                 │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ other        │ HPF 100Hz│ Peak       │ Igual guitar — mix de        │
   │              │          │ 2kHz +1dB  │ instrumentos não mapeados    │
   ├──────────────┼──────────┼────────────┼──────────────────────────────┤
   │ instrumental │ HPF 40Hz │ High shelf │ Mix sem vocal — EQ suave     │
   │              │          │ 8kHz +1dB  │ para não colorir demais      │
   └──────────────┴──────────┴────────────┴──────────────────────────────┘
   ========================================================= */

const StemEngine = (() => {

  /* ---- Estado ---- */
  let audioCtx      = null;
  let channels      = {};     // { id: { el, source, gainNode, eq[], analyser, muted, vol } }
  let currentSongId = null;
  let loadAbort     = null;   // AbortController para cancelar fetch em andamento

  /* ---- EQ por instrumento ---- */
  const EQ_PRESETS = {
    vocals: [
      { type: 'highpass',  frequency: 80,   gain: 0,   Q: 0.7 },
      { type: 'peaking',   frequency: 3000, gain: 2.0, Q: 1.2 },
    ],
    bass: [
      { type: 'lowshelf',  frequency: 60,   gain: 3.0, Q: 0.7 },
      { type: 'lowpass',   frequency: 500,  gain: 0,   Q: 0.7 },
    ],
    drums: [
      { type: 'highpass',  frequency: 60,   gain: 0,   Q: 0.7 },
      { type: 'peaking',   frequency: 8000, gain: 2.0, Q: 0.8 },
    ],
    guitar: [
      { type: 'highpass',  frequency: 100,  gain: 0,   Q: 0.7 },
      { type: 'peaking',   frequency: 2000, gain: 1.0, Q: 1.0 },
    ],
    keys: [
      { type: 'highpass',  frequency: 60,   gain: 0,   Q: 0.7 },
      { type: 'highshelf', frequency: 6000, gain: 1.5, Q: 0.7 },
    ],
    other: [
      { type: 'highpass',  frequency: 100,  gain: 0,   Q: 0.7 },
      { type: 'peaking',   frequency: 2000, gain: 1.0, Q: 1.0 },
    ],
    instrumental: [
      { type: 'highpass',  frequency: 40,   gain: 0,   Q: 0.7 },
      { type: 'highshelf', frequency: 8000, gain: 1.0, Q: 0.7 },
    ],
  };

  /* ---- Metadados dos canais (ordem de exibição no painel) ---- */
  const CHANNEL_META = [
    { id: 'vocals',       label: 'VOX',   icon: '🎤' },
    { id: 'guitar',       label: 'GTR',   icon: '🎸' },
    { id: 'bass',         label: 'BASS',  icon: '🎸' },
    { id: 'drums',        label: 'DRUMS', icon: '🥁' },
    { id: 'keys',         label: 'KEYS',  icon: '🎹' },
    { id: 'other',        label: 'OTHER', icon: '🎵' },
    { id: 'instrumental', label: 'INST',  icon: '🎼' },
  ];

  /* ---- Helpers de áudio ---- */

  function getCtx() {
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
        ch.eq.forEach(f => { try { f.disconnect(); } catch (_) {} });
        if (ch.analyser) ch.analyser.disconnect();
      } catch (_) {}
    }
    channels = {};
  }

  /* ---- Painel de controles no DOM ---- */

  function buildPanel(availableIds) {
    const panel = document.getElementById('fsBandModePanel');
    if (!panel) return;
    panel.innerHTML = '';

    /* Ordena de acordo com CHANNEL_META */
    const ordered = CHANNEL_META
      .map(m => m.id)
      .filter(id => availableIds.includes(id));

    /* Adiciona qualquer id que não esteja no meta (futura expansão) */
    availableIds.forEach(id => {
      if (!ordered.includes(id)) ordered.push(id);
    });

    ordered.forEach(id => {
      const meta = CHANNEL_META.find(m => m.id === id) || { id, label: id.toUpperCase(), icon: '♪' };

      const col = document.createElement('div');
      col.className      = 'band-channel';
      col.dataset.stemId = id;

      /* Canvas do mini-visualizador desse stem */
      const cv = document.createElement('canvas');
      cv.className = 'band-eq-canvas';
      cv.id        = 'eqStem_' + id;
      col.appendChild(cv);

      /* Label */
      const lbl = document.createElement('span');
      lbl.className   = 'band-channel-label';
      lbl.textContent = meta.label;
      col.appendChild(lbl);

      /* Controles */
      const ctrl = document.createElement('div');
      ctrl.className = 'stem-controls';

      const vol = document.createElement('input');
      vol.type            = 'range';
      vol.min             = '0';
      vol.max             = '1';
      vol.step            = '0.01';
      vol.value           = '1';
      vol.className       = 'stem-vol-slider';
      vol.dataset.stemId  = id;
      vol.setAttribute('aria-label', meta.label + ' volume');

      const muteBtn = document.createElement('button');
      muteBtn.className      = 'stem-mute-btn';
      muteBtn.dataset.stemId = id;
      muteBtn.setAttribute('aria-label', 'Mute ' + meta.label);
      muteBtn.innerHTML = '🔊';

      ctrl.appendChild(vol);
      ctrl.appendChild(muteBtn);
      col.appendChild(ctrl);
      panel.appendChild(col);

      vol.addEventListener('input',  () => setVolume(id, parseFloat(vol.value)));
      muteBtn.addEventListener('click', () => toggleMute(id));
    });

    /* Indicador de carregamento */
    const loading = document.createElement('div');
    loading.className   = 'stem-loading-indicator';
    loading.id          = 'stemLoadingMsg';
    loading.textContent = 'Carregando stems…';
    panel.appendChild(loading);
  }

  function setLoadingState(visible) {
    const el = document.getElementById('stemLoadingMsg');
    if (el) el.style.display = visible ? 'flex' : 'none';
  }

  /* ---- Criação de um canal de áudio ---- */

  function createChannel(ctx, id, url) {
    return new Promise((resolve, reject) => {
      const el = new Audio();
      /* Só usa crossOrigin se o stem for de outro domínio.
         Mesmo domínio: sem crossOrigin evita erros CORS desnecessários. */
      try {
        const stemOrigin = new URL(url, location.href).origin;
        if (stemOrigin !== location.origin) el.crossOrigin = 'anonymous';
      } catch (_) {
        el.crossOrigin = 'anonymous';
      }
      el.preload = 'auto';

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

      el.addEventListener('error', (e) => {
        console.warn('[StemEngine] Falha ao carregar stem "' + id + '":', url, e);
        reject(e);
      }, { once: true });
      el.src = url;
    });
  }

  /* ---- Sincronização com o áudio principal ---- */

  function syncAll(masterAudio) {
    const masterTime = masterAudio.currentTime;
    for (const id in channels) {
      const el = channels[id].el;
      el.currentTime = masterTime;
      if (!masterAudio.paused) el.play().catch(() => {});
    }
  }

  /* ---- Caminhos padrão (convenção Demucs htdemucs 4-stem) ---- */
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

  /* ---- Controles individuais ---- */

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
    const ch   = channels[id];
    ch.muted   = !ch.muted;
    ch.gainNode.gain.value = ch.muted ? 0 : ch.vol;

    const btn = document.querySelector(`.stem-mute-btn[data-stem-id="${id}"]`);
    if (btn) {
      btn.innerHTML = ch.muted ? '🔇' : '🔊';
      btn.classList.toggle('muted', ch.muted);
    }
    const col = document.querySelector(`.band-channel[data-stem-id="${id}"]`);
    if (col) col.classList.toggle('stem-muted', ch.muted);
  }

  function getStemAnalysers() {
    const result = {};
    for (const id in channels) result[id] = channels[id].analyser;
    return result;
  }

  /* ---- API pública ---- */

  async function load(song, masterAudio) {
    if (!song) return;

    /* Mesma música já carregada — apenas sincroniza */
    if (currentSongId === song.id) {
      syncAll(masterAudio);
      return;
    }

    /* Cancela carregamento anterior */
    if (loadAbort) loadAbort.abort();
    loadAbort = new AbortController();

    disposeChannels();
    currentSongId = song.id;

    /* Monta o mapa de stems: prefere song.stems, fallback para convenção de pastas */
    const stemMap      = song.stems || buildDefaultStems(song);
    const availableIds = Object.keys(stemMap).filter(k => stemMap[k]);

    if (availableIds.length === 0) {
      buildPanel([]);
      showStemError();
      return;
    }

    buildPanel(availableIds);
    setLoadingState(true);

    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    try {
      const results = await Promise.allSettled(
        availableIds.map(id => createChannel(ctx, id, stemMap[id]))
      );

      const loaded = availableIds.filter((_, i) => results[i].status === 'fulfilled');
      const failed = availableIds.filter((_, i) => results[i].status === 'rejected');

      if (failed.length) {
        console.warn('[StemEngine] Stems que falharam:', failed);
      }

      if (loaded.length === 0) {
        setLoadingState(false);
        showStemError();
        return;
      }

      setLoadingState(false);
      syncAll(masterAudio);

      /* Espelha eventos do áudio principal */
      masterAudio.addEventListener('play',   () => resumeAll(),              { signal: loadAbort.signal });
      masterAudio.addEventListener('pause',  () => pauseAll(),               { signal: loadAbort.signal });
      masterAudio.addEventListener('seeked', () => syncAll(masterAudio),     { signal: loadAbort.signal });

      /* Passa analysers para o Visualizer */
      if (typeof Visualizer !== 'undefined') {
        Visualizer.setStemAnalysers(getStemAnalysers());
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[StemEngine] Erro inesperado:', err);
        setLoadingState(false);
        showStemError();
      }
    }
  }

  function unload() {
    if (loadAbort) { loadAbort.abort(); loadAbort = null; }
    disposeChannels();
    currentSongId = null;
  }

  return { load, unload, pauseAll, resumeAll, getStemAnalysers };
})();