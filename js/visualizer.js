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
  let cvParticles = null;
  let cvBands     = {};

  /* ---- Partículas ---- */
  const PARTICLE_COUNT = 55;
  let particles = [];

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
    if (raw.startsWith('#')) {
      const r = parseInt(raw.slice(1,3), 16);
      const g = parseInt(raw.slice(3,5), 16);
      const b = parseInt(raw.slice(5,7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    return raw.replace(')', ',' + alpha + ')').replace('rgb(', 'rgba(');
  }

  /* ---- Partículas ---- */
  function initParticles(W, H) {
    particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(newParticle(W, H, true));
    }
  }

  function newParticle(W, H, randomY) {
    return {
      x     : Math.random() * W,
      y     : randomY ? Math.random() * H : H + 10,
      size  : Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.6 + 0.2),
      alpha : Math.random() * 0.4 + 0.1,
    };
  }

  function drawParticles(energy) {
    if (!cvParticles || cvParticles.offsetParent === null) return;
    const c = cvParticles.getContext('2d');
    const W = cvParticles.width;
    const H = cvParticles.height;

    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(0, 0, W, H);

    const boost = energy / 255;
    const glow  = boostMode ? 8 : 4;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y     += p.speedY * (1 + boost * 4);
      p.x     += p.speedX * (1 + boost * 1.5);
      p.size  += boost * 0.06;
      p.alpha  = Math.min(0.85, p.alpha + boost * 0.04);

      if (p.y < -10 || p.x < -20 || p.x > W + 20) {
        var np = newParticle(W, H, false);
        p.x = np.x; p.y = np.y; p.speedX = np.speedX; p.speedY = np.speedY;
        p.size  = Math.random() * 2 + 0.5;
        p.alpha = Math.random() * 0.3 + 0.05;
      }

      c.beginPath();
      c.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      c.fillStyle   = neonColor(p.alpha);
      c.shadowColor = neonColor(0.4);
      c.shadowBlur  = p.size * glow * (1 + boost);
      c.fill();
    }
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
    const barW = Math.max(2, W / bins - 1);
    const col  = getComputedStyle(document.documentElement)
                   .getPropertyValue('--neon').trim() || '#00ffe0';

    for (var i = 0; i < bins; i++) {
      const v  = freqData[startBin + i] / 255;
      const bH = v * H;
      c.fillStyle   = col;
      c.shadowColor = col;
      c.shadowBlur  = boostMode ? 8 : 4;
      c.fillRect(i * (barW + 1), H - bH, barW, bH);
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

    /* General energy for particles */
    let totalSum = 0;
    for (var j = 0; j < bufLen; j++) totalSum += freqData[j];
    const avgEnergy = totalSum / bufLen;

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

    /* Particles */
    if (cvParticles && cvParticles.offsetParent !== null) {
      drawParticles(avgEnergy);
    }

    /* Band mode EQ bars */
    const total = bufLen;
    if (cvBands.bass)   drawBand(cvBands.bass,   freqData, 0,                       Math.floor(total*0.06));
    if (cvBands.guitar) drawBand(cvBands.guitar, freqData, Math.floor(total*0.06),  Math.floor(total*0.18));
    if (cvBands.keys)   drawBand(cvBands.keys,   freqData, Math.floor(total*0.18),  Math.floor(total*0.40));
    if (cvBands.drums)  drawBand(cvBands.drums,  freqData, Math.floor(total*0.40),  Math.floor(total*0.70));

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
    if (canvas === cvParticles && particles.length > 0) {
      initParticles(W, H);
    }
  }

  /* ---- API pública ---- */
  function init(audioEl, callbacks) {
    callbacks = callbacks || {};
    cvFS        = document.getElementById('vizCanvasFS');
    cvMini      = document.getElementById('vizCanvasMini');
    cvParticles = document.getElementById('vizCanvasParticles');
    onBeatCb    = callbacks.onBeat || null;

    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
    sizeCanvas(cvParticles);

    if (cvParticles) initParticles(cvParticles.width || 300, cvParticles.height || 600);

    window.addEventListener('resize', function() {
      sizeCanvas(cvFS);
      sizeCanvas(cvMini);
      sizeCanvas(cvParticles);
    });

    connect(audioEl);
  }

  function initBandMode() {
    cvBands.guitar = document.getElementById('eqGuitar');
    cvBands.bass   = document.getElementById('eqBass');
    cvBands.keys   = document.getElementById('eqKeys');
    cvBands.drums  = document.getElementById('eqDrums');
    Object.values(cvBands).forEach(function(cv) {
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
    [cvFS, cvMini, cvParticles].forEach(function(cv) {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    });
    document.getElementById('miniProgressFill')?.classList.remove('pulse-beat');
    document.getElementById('fsProgressFill')?.classList.remove('pulse-beat');
  }

  function resize() {
    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
    sizeCanvas(cvParticles);
  }

  return { init, start, stop, resize, initBandMode, setBoost };
})();
