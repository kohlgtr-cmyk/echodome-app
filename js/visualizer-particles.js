/* =========================================================
   ECHODOME — js/visualizer-particles.js  (COM partículas)
   Web Audio API: waveform + pulse + partículas no fundo
   reagindo ao som.
   Troque por visualizer.js no index.html para a versão limpa.
   ========================================================= */

const Visualizer = (() => {
  /* ---- Estado ---- */
  let ctx        = null;
  let analyser   = null;
  let source     = null;
  let rafId      = null;
  let connected  = false;
  let isRunning  = false;

  /* ---- Canvas refs ---- */
  let cvFS        = null;
  let cvMini      = null;
  let cvParticles = null;   // canvas de fundo do fullscreen

  /* ---- Partículas ---- */
  const PARTICLE_COUNT = 60;
  let   particles      = [];

  /* ---- Configuração ---- */
  const CFG = {
    fftSize      : 2048,
    lineWidth    : 2,
    miniLineWidth: 1.5,
    smoothing    : 0.82,
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

  /* ---- Cor neon do tema ---- */
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

  /* ---- Inicializa partículas ---- */
  function initParticles(W, H) {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(newParticle(W, H, true));
    }
  }

  function newParticle(W, H, randomY = false) {
    return {
      x    : Math.random() * W,
      y    : randomY ? Math.random() * H : H + 10,
      size : Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.6 + 0.2),
      alpha : Math.random() * 0.5 + 0.1,
      energy: 0,   // será modulado pelo som
    };
  }

  /* ---- Desenha partículas ---- */
  function drawParticles(energy) {
    if (!cvParticles || cvParticles.offsetParent === null) return;
    const c = cvParticles.getContext('2d');
    const W = cvParticles.width;
    const H = cvParticles.height;

    // Fade sem limpar completamente (cria trilha suave)
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(0, 0, W, H);

    const boost = energy / 255;   // 0..1

    particles.forEach(p => {
      // Acelera com o som
      p.y      += p.speedY * (1 + boost * 4);
      p.x      += p.speedX * (1 + boost * 1.5);
      p.size   += boost * 0.08;
      p.alpha   = Math.min(0.85, p.alpha + boost * 0.05);

      // Reseta quando sai da tela
      if (p.y < -10 || p.x < -20 || p.x > W + 20) {
        Object.assign(p, newParticle(W, H));
        p.size  = Math.random() * 2 + 0.5;
        p.alpha = Math.random() * 0.3 + 0.05;
      }

      c.beginPath();
      c.arc(p.x, p.y, Math.max(0.1, p.size), 0, Math.PI * 2);
      c.fillStyle = neonColor(p.alpha);
      c.shadowColor = neonColor(0.4);
      c.shadowBlur  = p.size * 3 * (1 + boost);
      c.fill();
    });
  }

  /* ---- Desenha waveform ---- */
  function drawWave(canvas, dataArray, bufferLen, lineW) {
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    c.clearRect(0, 0, W, H);
    c.shadowColor = neonColor(0.6);
    c.shadowBlur  = 8;
    c.lineWidth   = lineW;
    c.strokeStyle = neonColor(0.9);
    c.beginPath();

    const step = bufferLen / W;
    for (let i = 0; i < W; i++) {
      const v = dataArray[Math.floor(i * step)] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) c.moveTo(i, y);
      else         c.lineTo(i, y);
    }
    c.lineTo(W, H / 2);
    c.stroke();
  }

  /* ---- Pulse na progress bar ---- */
  function pulseBars(energy) {
    const active = energy > 180;
    document.getElementById('miniProgressFill')
      ?.classList.toggle('pulse-beat', active);
    document.getElementById('fsProgressFill')
      ?.classList.toggle('pulse-beat', active);
  }

  /* ---- Loop de animação ---- */
  function loop() {
    if (!isRunning) return;
    rafId = requestAnimationFrame(loop);
    if (!analyser) return;

    const bufferLen = analyser.frequencyBinCount;
    const timeData  = new Uint8Array(bufferLen);
    const freqData  = new Uint8Array(bufferLen);
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    // Energia no bass (kick)
    const bassEnd = Math.floor(bufferLen * 0.06);
    let   bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];
    const bassEnergy = bassSum / bassEnd;

    // Energia geral (para as partículas)
    let totalSum = 0;
    for (let i = 0; i < bufferLen; i++) totalSum += freqData[i];
    const avgEnergy = totalSum / bufferLen;

    // Waveform
    if (cvFS && cvFS.offsetParent !== null) {
      drawWave(cvFS, timeData, bufferLen, CFG.lineWidth);
    }
    if (cvMini) {
      drawWave(cvMini, timeData, bufferLen, CFG.miniLineWidth);
    }

    // Partículas (só no fullscreen quando visível)
    if (cvParticles && cvParticles.offsetParent !== null) {
      drawParticles(avgEnergy);
    }

    pulseBars(bassEnergy);
  }

  /* ---- Resize ---- */
  function sizeCanvas(canvas) {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const W = parent.clientWidth  || canvas.clientWidth  || 300;
    const H = parent.clientHeight || canvas.clientHeight || 40;
    canvas.width  = W;
    canvas.height = H;
    // Re-inicializa partículas no resize do fundo
    if (canvas === cvParticles) initParticles(W, H);
  }

  /* ---- API pública ---- */
  function init(audioEl) {
    cvFS        = document.getElementById('vizCanvasFS');
    cvMini      = document.getElementById('vizCanvasMini');
    cvParticles = document.getElementById('vizCanvasParticles');

    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
    sizeCanvas(cvParticles);

    if (cvParticles) {
      initParticles(cvParticles.width, cvParticles.height);
    }

    window.addEventListener('resize', () => {
      sizeCanvas(cvFS);
      sizeCanvas(cvMini);
      sizeCanvas(cvParticles);
    });

    connect(audioEl);
  }

  function start() {
    if (!connected) return;
    if (ctx.state === 'suspended') ctx.resume();
    isRunning = true;
    loop();
  }

  function stop() {
    isRunning = false;
    cancelAnimationFrame(rafId);
    [cvFS, cvMini, cvParticles].forEach(cv => {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    });
    document.getElementById('miniProgressFill')?.classList.remove('pulse-beat');
    document.getElementById('fsProgressFill')?.classList.remove('pulse-beat');
  }

  return { init, start, stop };
})();
