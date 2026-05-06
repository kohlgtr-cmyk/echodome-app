/* =========================================================
   ECHODOME — js/visualizer.js  (SEM partículas)
   Web Audio API: waveform nos dois players + pulse na progress.
   Troque por visualizer-particles.js no index.html para testar
   a versão COM partículas.
   ========================================================= */

const Visualizer = (() => {
  /* ---- Estado ---- */
  let ctx        = null;   // AudioContext
  let analyser   = null;
  let source     = null;
  let rafId      = null;
  let connected  = false;
  let isRunning  = false;

  /* ---- Canvas refs ---- */
  let cvFS   = null;   // canvas fullscreen
  let cvMini = null;   // canvas mini player

  /* ---- Configuração da waveform ---- */
  const CFG = {
    fftSize      : 2048,
    lineWidth    : 2,
    miniLineWidth: 1.5,
    smoothing    : 0.82,
  };

  /* ---- Conecta ao elemento <audio> ---- */
  function connect(audioEl) {
    if (connected) return;
    try {
      ctx      = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize           = CFG.fftSize;
      analyser.smoothingTimeConstant = CFG.smoothing;
      source   = ctx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      connected = true;
    } catch (e) {
      console.warn('[Visualizer] Web Audio API indisponível:', e);
    }
  }

  /* ---- Resolve cor neon do tema atual ---- */
  function neonColor(alpha = 1) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--neon').trim() || '#00ffe0';
    // Converte hex para rgba se necessário
    if (raw.startsWith('#')) {
      const r = parseInt(raw.slice(1,3),16);
      const g = parseInt(raw.slice(3,5),16);
      const b = parseInt(raw.slice(5,7),16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return raw.replace(')', `,${alpha})`).replace('rgb(', 'rgba(');
  }

  /* ---- Desenha waveform num canvas ---- */
  function drawWave(canvas, dataArray, bufferLen, lineW) {
    const c   = canvas.getContext('2d');
    const W   = canvas.width;
    const H   = canvas.height;

    c.clearRect(0, 0, W, H);

    // Sombra neon
    c.shadowColor = neonColor(0.6);
    c.shadowBlur  = 8;

    c.lineWidth   = lineW;
    c.strokeStyle = neonColor(0.9);
    c.beginPath();

    const step = bufferLen / W;
    let x = 0;

    for (let i = 0; i < W; i++) {
      const idx = Math.floor(i * step);
      const v   = dataArray[idx] / 128.0;   // 0..2
      const y   = (v * H) / 2;

      if (i === 0) c.moveTo(x, y);
      else         c.lineTo(x, y);
      x += 1;
    }

    c.lineTo(W, H / 2);
    c.stroke();
  }

  /* ---- Pulse na progress bar (adiciona classe CSS) ---- */
  function pulseBars(energy) {
    const threshold = 180;   // 0-255; bate no kick
    const active    = energy > threshold;
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

    // Energia média nas baixas frequências (kick / bass)
    const bassEnd   = Math.floor(bufferLen * 0.06);
    let   bassSum   = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];
    const bassEnergy = bassSum / bassEnd;

    // Desenha nos dois canvases se visíveis
    if (cvFS && cvFS.offsetParent !== null) {
      // Sincroniza resolução do canvas com o tamanho CSS real
      const wrap = cvFS.parentElement;
      if (wrap && wrap.offsetWidth > 0 && cvFS.width !== wrap.offsetWidth) {
        cvFS.width  = wrap.offsetWidth;
        cvFS.height = wrap.offsetHeight;
      }
      drawWave(cvFS, timeData, bufferLen, CFG.lineWidth);
    }
    if (cvMini) {
      drawWave(cvMini, timeData, bufferLen, CFG.miniLineWidth);
    }

    pulseBars(bassEnergy);
  }

  /* ---- Redimensiona canvas ao container ---- */
  function sizeCanvas(canvas) {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    // offsetWidth funciona mesmo com opacity:0; clientWidth falha em display:none
    const w = parent.offsetWidth  || parent.clientWidth  || 300;
    const h = parent.offsetHeight || parent.clientHeight || 120;
    // Só atualiza se tiver valores reais — evita zerar o canvas desnecessariamente
    if (w > 0) canvas.width  = w;
    if (h > 0) canvas.height = h;
  }

  /* ---- API pública ---- */
  function init(audioEl) {
    cvFS   = document.getElementById('vizCanvasFS');
    cvMini = document.getElementById('vizCanvasMini');

    sizeCanvas(cvFS);
    sizeCanvas(cvMini);

    window.addEventListener('resize', () => {
      sizeCanvas(cvFS);
      sizeCanvas(cvMini);
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
    // Limpa os canvases
    [cvFS, cvMini].forEach(cv => {
      if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    });
    // Remove pulse
    document.getElementById('miniProgressFill')?.classList.remove('pulse-beat');
    document.getElementById('fsProgressFill')?.classList.remove('pulse-beat');
  }

  function resize() {
    sizeCanvas(cvFS);
    sizeCanvas(cvMini);
  }

  return { init, start, stop, resize };
})();
