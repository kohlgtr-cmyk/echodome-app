/* =========================================================
   ECHODOME — js/visualizer.js
   Web Audio API: waveform nos dois players, beat detection,
   band mode (ponto 5) e boost (ponto 7).
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
  let onBeatCb  = null;    // callback do player para beat visual

  /* ---- Canvas refs ---- */
  let cvFS    = null;
  let cvMini  = null;
  let cvBands = {};        // { guitar, bass, keys, drums }

  /* ---- Config ---- */
  const CFG = {
    fftSize     : 2048,
    lineWidth   : 2,
    miniLine    : 1.5,
    smoothing   : 0.82,
    beatThresh  : 175,     // energia do bass para considerar beat
    bandThresh  : 160,
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
  function neonColor(alpha = 1) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#00ffe0';
    if (raw.startsWith('#')) {
      const r = parseInt(raw.slice(1,3),16);
      const g = parseInt(raw.slice(3,5),16);
      const b = parseInt(raw.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return raw.replace(')', `,${alpha})`).replace('rgb(', 'rgba(');
  }

  /* ---- Waveform num canvas ---- */
  function drawWave(canvas, dataArray, bufferLen, lineW) {
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    c.clearRect(0, 0, W, H);

    const glow = boostMode ? 16 : 8;
    c.shadowColor = neonColor(0.6);
    c.shadowBlur  = glow;
    c.lineWidth   = lineW;
    c.strokeStyle = neonColor(0.9);
    c.beginPath();

    const step = bufferLen / W;
    for (let i = 0; i < W; i++) {
      const idx = Math.floor(i * step);
      const v   = dataArray[idx] / 128.0;
      const y   = (v * H) / 2;
      i === 0 ? c.moveTo(i, y) : c.lineTo(i, y);
    }
    c.lineTo(W, H / 2);
    c.stroke();
  }

  /* ---- Barras do band mode (ponto 5) ---- */
  function drawBand(canvas, freqData, startBin, endBin, color) {
    if (!canvas) return;
    const c   = canvas.getContext('2d');
    const W   = canvas.width  || canvas.offsetWidth  || 60;
    const H   = canvas.height || canvas.offsetHeight || 60;
    if (!canvas.width) { canvas.width = W; canvas.height = H; }
    c.clearRect(0, 0, W, H);

    const bins     = endBin - startBin;
    const barW     = Math.max(2, W / bins - 1);
    const neon     = getComputedStyle(document.documentElement)
                       .getPropertyValue('--neon').trim() || '#00ffe0';

    for (let i = 0; i < bins; i++) {
      const v  = freqData[startBin + i] / 255;
      const bH = v * H;
      c.fillStyle = color || neon;
      c.shadowColor = color || neon;
      c.shadowBlur  = 4;
      c.fillRect(i * (barW + 1), H - bH, barW, bH);
    }
  }

  /* ---- Progress pulse (CSS) ---- */
  function pulseBars(energy) {
    const active = energy > CFG.beatThresh;
    document.getElementById('miniProgressFill')
      ?.classList.toggle('pulse-beat', active);
    document.getElementById('fsProgressFill')
      ?.classList.toggle('pulse-beat', active);
    if (active && onBeatCb) onBeatCb();
  }

  /* ---- Loop de animação ---- */
  function loop() {
    if (!isRunning) return;
    rafId = requestAnimationFrame(loop);
    if (!analyser) return;

    const bufLen  = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufLen);
    const freqData = new Uint8Array(bufLen);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    /* Energia do bass (kick detection) */
    const bassEnd = Math.floor(bufLen * 0.06);
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];
    const bassEnergy = bassSum / bassEnd;

    /* Waveform fullscreen */
    if (cvFS && cvFS.offsetParent !== null) {
      const wrap = cvFS.parentElement;
      if (wrap && wrap.offsetWidth > 0 && cvFS.width !== wrap.offsetWidth) {
        cvFS.width  = wrap.offsetWidth;
        cvFS.height = wrap.offsetHeight;
      }
      drawWave(cvFS, timeData, bufLen, CFG.lineWidth);
    }

    /* Waveform mini */
    if (cvMini) drawWave(cvMini, timeData, bufLen, CFG.miniLine);

    /* Band mode: 4 canvases com regiões de frequência (ponto 5) */
    const total = bufLen;
    if (cvBands.guitar) drawBand(cvBands.guitar, freqData, Math.floor(total*0.06), Math.floor(total*0.18));
    if (cvBands.bass)   drawBand(cvBands.bass,   freqData, 0,                      Math.floor(total*0.06));
    if (cvBands.keys)   drawBand(cvBands.keys,   freqData, Math.floor(total*0.18), Math.floor(total*0.40));
    if (cvBands.drums)  drawBand(cvBands.drums,  freqData, Math.floor(total*0.40), Math.floor(total*0.70));

    pulseBars(bassEnergy);
  }

  /* ---- Redimensiona canvas ---- */
  function sizeCanvas(canvas) {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.offsetWidth  || 300;
    const h = parent.offsetHeight || 120;
    if (w > 0) canvas.width  = w;
    if (h > 0) canvas.height = h;
  }

  /* ---- API pública ---- */
  function init(audioEl, callbacks = {}) {
    cvFS   = document.getElementById('vizCanvasFS');
    cvMini = document.getElementById('vizCanvasMini');
    onBeatCb = callbacks.onBeat || null;

    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
    window.addEventListener('resize', () => { sizeCanvas(cvFS); sizeCanvas(cvMini); });

    connect(audioEl);
  }

  /* Inicializa canvases do band mode quando ativado (ponto 5) */
  function initBandMode() {
    cvBands.guitar = document.getElementById('eqGuitar');
    cvBands.bass   = document.getElementById('eqBass');
    cvBands.keys   = document.getElementById('eqKeys');
    cvBands.drums  = document.getElementById('eqDrums');
    [cvBands.guitar, cvBands.bass, cvBands.keys, cvBands.drums].forEach(cv => {
      if (cv) { cv.width = cv.offsetWidth || 60; cv.height = 60; }
    });
  }

  function setBoost(active) { boostMode = active; }

  function start() {
    if (!connected) return;
    if (ctx.state === 'suspended') ctx.resume();
    isRunning = true;
    loop();
  }

  function stop() {
    isRunning = false;
    cancelAnimationFrame(rafId);
    [cvFS, cvMini].forEach(cv => {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    });
    document.getElementById('miniProgressFill')?.classList.remove('pulse-beat');
    document.getElementById('fsProgressFill')?.classList.remove('pulse-beat');
  }

  function resize() {
    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
  }

  return { init, start, stop, resize, initBandMode, setBoost };
})();
