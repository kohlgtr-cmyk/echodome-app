/* =========================================================
   ECHODOME — js/visualizer.js  v2 (UNIFIED)
   Web Audio API: waveform, partículas, beat detection,
   band mode (ponto 5), boost (ponto 7).
   Substitui visualizer.js + visualizer-particles.js.
   ========================================================= */

const Visualizer = (() => {

  /* ---- Estado ---- */
  let ctx       = null;
  let analyser  = null;
  let source    = null;
  let rafId     = null;
  let connected = false;
  let isRunning = false;
  let boostMode = false;
  let onBeatCb  = null;

  /* ---- Canvas refs ---- */
  let cvFS        = null;
  let cvMini      = null;
  let cvBands     = {};
  let stemAnalysers = {};   /* { id: AnalyserNode } — fornecido pelo StemEngine */

  /* ---- Config ---- */
  const CFG = {
    fftSize    : 2048,
    lineWidth  : 2,
    miniLine   : 1.5,
    smoothing  : 0.82,
    beatThresh : 170,
  };

  /* ---- Conecta ao <audio> ---- */
  function connect(audioEl) {
    if (connected) return;
    try {
      ctx      = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize               = CFG.fftSize;
      analyser.smoothingTimeConstant = CFG.smoothing;
      source   = ctx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      connected = true;
    } catch (e) {
      console.warn('[Visualizer] Web Audio API indisponível:', e);
    }
  }

  /* ---- Cor neon do tema atual ---- */
  function neonColor(alpha) {
    alpha = alpha === undefined ? 1 : alpha;
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#00ffe0';
    /* Hex 6 dígitos */
    if (/^#[0-9a-f]{6}$/i.test(raw)) {
      const r = parseInt(raw.slice(1,3), 16);
      const g = parseInt(raw.slice(3,5), 16);
      const b = parseInt(raw.slice(5,7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    /* Hex 3 dígitos */
    if (/^#[0-9a-f]{3}$/i.test(raw)) {
      const r = parseInt(raw[1]+raw[1], 16);
      const g = parseInt(raw[2]+raw[2], 16);
      const b = parseInt(raw[3]+raw[3], 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    /* rgb(...) */
    if (raw.startsWith('rgb(')) {
      return raw.replace('rgb(', 'rgba(').replace(')', ',' + alpha + ')');
    }
    /* rgba(...) — substitui o alpha existente */
    if (raw.startsWith('rgba(')) {
      return raw.replace(/,[^,)]+\)$/, ',' + alpha + ')');
    }
    return raw;
  }

  /* ---- Waveform ---- */
  function drawWave(canvas, dataArray, bufferLen, lineW) {
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    c.clearRect(0, 0, W, H);

    const glow = boostMode ? 18 : 8;
    c.shadowColor = neonColor(0.6);
    c.shadowBlur  = glow;
    c.lineWidth   = lineW;
    c.strokeStyle = neonColor(0.9);
    c.beginPath();

    const step = bufferLen / W;
    for (var i = 0; i < W; i++) {
      const v = dataArray[Math.floor(i * step)] / 128.0;
      const y = (v * H) / 2;
      i === 0 ? c.moveTo(i, y) : c.lineTo(i, y);
    }
    c.lineTo(W, H / 2);
    c.stroke();
  }

  /* ---- Band equalizer bars ---- */
  function drawBand(canvas, freqData, startBin, endBin) {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width  || canvas.offsetWidth  || 60;
    const H = canvas.height || canvas.offsetHeight || 60;
    if (!canvas.width) { canvas.width = W; canvas.height = H; }
    c.clearRect(0, 0, W, H);

    const bins = endBin - startBin;
    if (bins <= 0) return;
    /* Agrupa bins em ~16 barras visuais para legibilidade */
    const BAR_COUNT = Math.min(bins, 16);
    const barW = Math.max(2, (W / BAR_COUNT) - 1);
    const gap  = Math.max(1, W / BAR_COUNT - barW);

    for (var i = 0; i < BAR_COUNT; i++) {
      /* Média dos bins correspondentes */
      const binStart = startBin + Math.floor(i * bins / BAR_COUNT);
      const binEnd   = startBin + Math.floor((i + 1) * bins / BAR_COUNT);
      let sum = 0;
      for (var b = binStart; b < binEnd; b++) sum += freqData[b];
      const v  = (sum / (binEnd - binStart)) / 255;
      const bH = Math.max(2, v * H);
      const x  = i * (barW + gap);

      /* Gradiente usando neonColor() que já converte qualquer formato de cor */
      const grad = c.createLinearGradient(0, H - bH, 0, H);
      grad.addColorStop(0, neonColor(0.45));
      grad.addColorStop(1, neonColor(0.95));

      c.fillStyle   = grad;
      c.shadowColor = neonColor(1);
      c.shadowBlur  = boostMode ? 12 : 5;
      c.globalAlpha = 0.35 + v * 0.65;
      c.fillRect(x, H - bH, barW, bH);
      c.globalAlpha = 1;
    }
  }

  /* ---- Beat detection ---- */
  function pulseBars(bassEnergy) {
    const active = bassEnergy > CFG.beatThresh;
    document.getElementById('miniProgressFill')?.classList.toggle('pulse-beat', active);
    document.getElementById('fsProgressFill')?.classList.toggle('pulse-beat', active);
    if (active && onBeatCb) onBeatCb();
  }

  /* ---- Loop de animação ---- */
  function loop() {
    if (!isRunning) return;
    rafId = requestAnimationFrame(loop);
    if (!analyser) return;

    const bufLen   = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufLen);
    const freqData = new Uint8Array(bufLen);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    /* Bass energy (kick detection) */
    const bassEnd = Math.floor(bufLen * 0.06);
    let bassSum = 0;
    for (var i = 0; i < bassEnd; i++) bassSum += freqData[i];
    const bassEnergy = bassSum / bassEnd;

    /* Fullscreen waveform */
    if (cvFS && cvFS.offsetParent !== null) {
      const wrap = cvFS.parentElement;
      if (wrap && wrap.offsetWidth > 0 && cvFS.width !== wrap.offsetWidth) {
        cvFS.width  = wrap.offsetWidth;
        cvFS.height = wrap.offsetHeight;
      }
      drawWave(cvFS, timeData, bufLen, CFG.lineWidth);
    }

    /* Mini waveform */
    if (cvMini) drawWave(cvMini, timeData, bufLen, CFG.miniLine);

    /* Band mode EQ bars — usa analysers dos stems se disponíveis,
       senão faz fallback para faixas de frequência do mix master */
    if (Object.keys(stemAnalysers).length > 0) {
      /* Modo stems: cada canal tem seu próprio AnalyserNode */
      for (const id in stemAnalysers) {
        const cv = document.getElementById('eqStem_' + id);
        if (!cv) continue;
        const stemBuf = new Uint8Array(stemAnalysers[id].frequencyBinCount);
        stemAnalysers[id].getByteFrequencyData(stemBuf);
        drawBand(cv, stemBuf, 0, stemBuf.length);
      }
    } else {
      /* Fallback: divisão de frequências do mix completo (comportamento original) */
      const total = bufLen;
      if (cvBands.bass)   drawBand(cvBands.bass,   freqData, 0,                       Math.floor(total*0.06));
      if (cvBands.guitar) drawBand(cvBands.guitar, freqData, Math.floor(total*0.06),  Math.floor(total*0.18));
      if (cvBands.keys)   drawBand(cvBands.keys,   freqData, Math.floor(total*0.18),  Math.floor(total*0.40));
      if (cvBands.drums)  drawBand(cvBands.drums,  freqData, Math.floor(total*0.40),  Math.floor(total*0.70));
    }

    pulseBars(bassEnergy);
  }

  /* ---- Resize helper ---- */
  function sizeCanvas(canvas) {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const W = parent.offsetWidth  || 300;
    const H = parent.offsetHeight || 120;
    if (W > 0) canvas.width  = W;
    if (H > 0) canvas.height = H;
  }

  /* ---- API pública ---- */
  function init(audioEl, callbacks) {
    callbacks = callbacks || {};
    cvFS   = document.getElementById('vizCanvasFS');
    cvMini = document.getElementById('vizCanvasMini');
    onBeatCb = callbacks.onBeat || null;

    sizeCanvas(cvFS);
    sizeCanvas(cvMini);

    window.addEventListener('resize', function() {
      sizeCanvas(cvFS);
      sizeCanvas(cvMini);
    });

    connect(audioEl);
  }

  function initBandMode() {
    cvBands.bass   = document.getElementById('eqBass');
    cvBands.guitar = document.getElementById('eqGuitar');
    cvBands.keys   = document.getElementById('eqKeys');
    cvBands.drums  = document.getElementById('eqDrums');

    /* Dimensiona canvas via atributo width/height (não CSS).
       getBoundingClientRect() é usado porque clientWidth pode ser 0
       imediatamente após display:flex ser aplicado. */
    function sizeBandCanvas(cv) {
      if (!cv) return;
      var ch = cv.parentElement; /* .band-channel */
      if (!ch) return;
      var rect = ch.getBoundingClientRect();
      if (rect.width === 0) return;  /* ainda não no DOM visível — tenta de novo */
      var labelEl = ch.querySelector('.band-channel-label');
      var labelH  = labelEl ? Math.round(labelEl.getBoundingClientRect().height) + 4 : 20;
      var W = Math.max(Math.round(rect.width),  10);
      var H = Math.max(Math.round(rect.height) - labelH, 20);
      cv.width  = W;
      cv.height = H;
      cv.getContext('2d').clearRect(0, 0, W, H);
    }

    function sizeAll() {
      Object.values(cvBands).forEach(sizeBandCanvas);
    }

    /* Estratégia de timing:
       1) rAF duplo — garante que o browser calculou o layout após display:flex
       2) ResizeObserver no painel — lida com resize/rotação depois */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        sizeAll();
        /* Se ainda zeros (animação CSS atrasou o reflow), tenta mais uma vez */
        var panel = document.getElementById('fsBandModePanel');
        if (panel && panel.getBoundingClientRect().width === 0) {
          setTimeout(sizeAll, 200);
        }
      });
    });

    /* ResizeObserver: redimensiona se o painel mudar de tamanho */
    var panel = document.getElementById('fsBandModePanel');
    if (panel && typeof ResizeObserver !== 'undefined') {
      /* Desconecta observer anterior se existir */
      if (panel._bandRO) { panel._bandRO.disconnect(); }
      panel._bandRO = new ResizeObserver(function() { sizeAll(); });
      panel._bandRO.observe(panel);
    }
  }

  function setStemAnalysers(map) {
    stemAnalysers = map || {};
  }

  function setBoost(active) { boostMode = active; }

  function start() {
    if (!connected) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(function() {
        isRunning = true;
        loop();
      });
    } else {
      isRunning = true;
      loop();
    }
  }

  function stop() {
    isRunning = false;
    cancelAnimationFrame(rafId);
    [cvFS, cvMini].forEach(function(cv) {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    });
    document.getElementById('miniProgressFill')?.classList.remove('pulse-beat');
    document.getElementById('fsProgressFill')?.classList.remove('pulse-beat');
  }

  function resize() {
    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
  }

  return { init, start, stop, resize, initBandMode, setBoost, setStemAnalysers };
})();