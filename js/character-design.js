/* =========================================================
   ECHODOME — js/character-design.js
   Sistema de design por personagem.
   Integra com ThemeManager do PWA novo.
   
   COMO USAR:
   1. Adicione no index.html DEPOIS de themes.js:
      <script src="js/character-design.js"></script>
   2. Adicione o CSS companion:
      <link rel="stylesheet" href="css/character-design.css">
   3. Chame em themes.js dentro de apply():
      if (window.CharDesign) window.CharDesign.apply(themeKey);
   ========================================================= */

(function () {
  'use strict';

  // ── GOOGLE FONTS por personagem ──────────────────────────────
  // Carregadas sob demanda na primeira ativação.
  const FONT_URLS = {
    trace: 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400;500&display=swap',
    od:    'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;600;700&display=swap',
    dusk:  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap',
    ember: 'https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;1,400&family=Exo+2:ital,wght@0,300;0,400;0,700;1,400&display=swap',
    lyra:  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Outfit:wght@300;400;500&display=swap',
  };

  const _loadedFonts = new Set();

  function _loadFont(id) {
    if (_loadedFonts.has(id) || !FONT_URLS[id]) return;
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = FONT_URLS[id];
    document.head.appendChild(link);
    _loadedFonts.add(id);
  }

  // ── DEFINIÇÕES POR PERSONAGEM ────────────────────────────────
  const DESIGNS = {

    // ╔══════════════════════════════════╗
    // ║  TRACE — O Silêncio que Grita   ║
    // ╚══════════════════════════════════╝
    trace: {
      fontDisplay:   '"Space Mono", monospace',
      fontBody:      '"DM Mono", monospace',
      fontMono:      '"Space Mono", monospace',
      letterSpacing: '0.08em',
      lineHeight:    '1.8',
      radius:        '2px',
      radiusCard:    '2px',
      radiusBtn:     '2px',
      cursor:        'crosshair',
      bodyClass:     'char-trace',
      enterAnim:     'trace-enter',
      glowIntensity: '0.3',
      textTransform: 'none',
      _desc: 'Minimalismo monospace. Silêncio visual.',
    },

    // ╔══════════════════════════════════╗
    // ║  OD — Overdrive Permanente      ║
    // ╚══════════════════════════════════╝
    od: {
      fontDisplay:   '"Bebas Neue", "Impact", sans-serif',
      fontBody:      '"Barlow Condensed", sans-serif',
      fontMono:      '"Barlow Condensed", sans-serif',
      letterSpacing: '0.14em',
      lineHeight:    '1.25',
      radius:        '0px',
      radiusCard:    '0px',
      radiusBtn:     '0px',
      cursor:        'crosshair',
      bodyClass:     'char-od',
      enterAnim:     'od-enter',
      glowIntensity: '1.0',
      textTransform: 'uppercase',
      _desc: 'Zero curvas. Verde que queima. Uppercase sempre.',
    },

    // ╔══════════════════════════════════╗
    // ║  DUSK — O Mecânico do Abismo    ║
    // ╚══════════════════════════════════╝
    dusk: {
      fontDisplay:   '"Rajdhani", sans-serif',
      fontBody:      '"Share Tech Mono", monospace',
      fontMono:      '"Share Tech Mono", monospace',
      letterSpacing: '0.05em',
      lineHeight:    '1.5',
      radius:        '1px',
      radiusCard:    '3px',
      radiusBtn:     '1px',
      cursor:        'default',
      bodyClass:     'char-dusk',
      enterAnim:     'dusk-enter',
      glowIntensity: '0.6',
      textTransform: 'none',
      _desc: 'Metal, ferrugem, resistência. O ritmo é mecânico mas vivo.',
    },

    // ╔══════════════════════════════════╗
    // ║  EMBER — A Brasa que Nunca Apaga ║
    // ╚══════════════════════════════════╝
    ember: {
      fontDisplay:   '"Chakra Petch", sans-serif',
      fontBody:      '"Exo 2", sans-serif',
      fontMono:      '"Chakra Petch", monospace',
      letterSpacing: '0.04em',
      lineHeight:    '1.6',
      radius:        '6px',
      radiusCard:    '10px',
      radiusBtn:     '6px',
      cursor:        'default',
      bodyClass:     'char-ember',
      enterAnim:     'ember-enter',
      glowIntensity: '0.85',
      textTransform: 'none',
      _desc: 'Tudo pulsa. Calor âmbar. Urgência constante.',
    },

    // ╔══════════════════════════════════╗
    // ║  LYRA — A Constelação Interior  ║
    // ╚══════════════════════════════════╝
    lyra: {
      fontDisplay:   '"Cormorant Garamond", serif',
      fontBody:      '"Outfit", sans-serif',
      fontMono:      '"Outfit", sans-serif',
      letterSpacing: '0.06em',
      lineHeight:    '1.95',
      radius:        '12px',
      radiusCard:    '16px',
      radiusBtn:     '999px',
      cursor:        'default',
      bodyClass:     'char-lyra',
      enterAnim:     'lyra-enter',
      glowIntensity: '0.5',
      textTransform: 'none',
      _desc: 'Etéreo. Amplo. Cada nota é uma estrela.',
    },
  };

  // ── ESTADO ───────────────────────────────────────────────────
  let _current   = null;
  let _styleEl   = null;
  let _prevClass = null;

  // ── APLICAR ──────────────────────────────────────────────────
  function apply(id) {
    const d = DESIGNS[id];
    if (!d) return;

    _loadFont(id);
    _current = { id, ...d };

    _applyVars(d);
    _applyBodyClass(d);
    _injectCSS(id, d);
    _triggerEnter();

    console.log(`[CharDesign] ${id} — ${d._desc}`);
  }

  function _applyVars(d) {
    const root = document.documentElement;
    root.style.setProperty('--font-display',          d.fontDisplay);
    root.style.setProperty('--font-body',             d.fontBody);
    root.style.setProperty('--font-mono',             d.fontMono);
    root.style.setProperty('--char-letter-spacing',   d.letterSpacing);
    root.style.setProperty('--char-line-height',      d.lineHeight);
    root.style.setProperty('--char-radius',           d.radius);
    root.style.setProperty('--char-radius-card',      d.radiusCard);
    root.style.setProperty('--char-radius-btn',       d.radiusBtn);
    root.style.setProperty('--char-glow',             d.glowIntensity);
    root.style.setProperty('--char-text-transform',   d.textTransform);
    document.body.style.cursor = d.cursor;
  }

  function _applyBodyClass(d) {
    if (_prevClass) document.body.classList.remove(_prevClass);
    document.body.classList.add(d.bodyClass);
    _prevClass = d.bodyClass;
  }

  function _injectCSS(id, d) {
    if (!_styleEl) {
      _styleEl = document.createElement('style');
      _styleEl.id = 'char-design-dynamic';
      document.head.appendChild(_styleEl);
    }
    _styleEl.textContent = _buildCSS(id, d);
  }

  function _buildCSS(id, d) {
    return `
/* ── CharDesign: ${id} ── */

/* Typography */
.logo-text,
.section-title,
.hero-title,
.track-name,
.band-card-name,
.fs-title,
.mini-player__title,
.member-name {
  font-family: var(--font-display) !important;
  letter-spacing: var(--char-letter-spacing) !important;
  text-transform: var(--char-text-transform) !important;
  transition: font-family 0.5s ease, letter-spacing 0.4s ease;
}

.nav-btn,
.mini-player__artist,
.fs-artist,
.track-tag,
.track-duration,
.band-card-role,
.member-role,
.hero-eyebrow,
.hero-sub,
.theme-label,
.placeholder-text {
  font-family: var(--font-mono) !important;
  transition: font-family 0.5s ease;
}

.hero-content p,
.band-card-bio,
.fs-lyrics p,
.fs-story p,
.section p {
  font-family: var(--font-body) !important;
  line-height: var(--char-line-height) !important;
  transition: font-family 0.5s ease, line-height 0.4s ease;
}

/* Border radius global */
.track-item,
.member-card,
.band-card,
.gallery-item,
.mini-player,
.fs-progress-bar,
.mini-progress-bar,
.track-play-btn {
  border-radius: var(--char-radius-card) !important;
  transition: border-radius 0.4s ease;
}

.btn-primary,
.btn-ghost,
.ctrl-btn--play,
.fs-ctrl-btn--play,
.nav-btn,
.theme-toggle-btn {
  border-radius: var(--char-radius-btn) !important;
  transition: border-radius 0.4s ease;
}

/* Hover effects */
${_hoverCSS(id)}

/* Player adjustments */
${_playerCSS(id)}

/* Section enter animation */
${_enterCSS(id, d)}
    `.trim();
  }

  function _hoverCSS(id) {
    const effects = {
      trace: `
        /* Scan line desliza por baixo */
        .track-item { position: relative; overflow: hidden; }
        .track-item::after {
          content: '';
          position: absolute;
          bottom: 0; left: -100%;
          width: 100%; height: 1px;
          background: var(--neon);
          opacity: 0.6;
          transition: left 0.35s cubic-bezier(.4,0,.2,1);
        }
        .track-item:hover::after { left: 0; }
        .band-card:hover { box-shadow: 0 0 0 1px var(--neon) !important; transform: none !important; }
        .gallery-item:hover { transform: none !important; box-shadow: 0 0 0 1px var(--neon-40) !important; }
      `,
      od: `
        /* Borda que queima — offset estilo quadrinhos punk */
        .track-item:hover {
          border-color: var(--neon) !important;
          box-shadow: inset 0 0 16px rgba(57,255,20,0.06) !important;
        }
        .band-card:hover {
          box-shadow: 4px 4px 0 var(--neon), -1px -1px 0 rgba(57,255,20,0.4) !important;
          transform: translate(-2px, -2px) !important;
        }
        .gallery-item:hover {
          box-shadow: 3px 3px 0 var(--neon) !important;
          transform: translate(-2px, -2px) scale(1) !important;
        }
      `,
      dusk: `
        /* Placa metálica que desliza */
        .track-item {
          transition: transform 0.2s ease, border-color 0.2s ease, padding-left 0.2s ease !important;
        }
        .track-item:hover {
          transform: translateX(6px) !important;
          border-left: 2px solid var(--neon) !important;
        }
        .band-card:hover {
          transform: translateY(-3px) skewX(-0.5deg) !important;
          box-shadow: 0 6px 0 rgba(255,106,0,0.3) !important;
        }
      `,
      ember: `
        /* Faísca radial — calor irrompe da esquerda */
        .track-item:hover {
          background: radial-gradient(ellipse at left center, rgba(255,230,0,0.08) 0%, transparent 70%) !important;
          border-color: var(--neon-40) !important;
        }
        .band-card:hover {
          box-shadow: 0 0 32px rgba(255,230,0,0.15), 0 0 8px rgba(255,230,0,0.3) !important;
          transform: translateY(-5px) !important;
        }
        .gallery-item:hover {
          box-shadow: 0 0 20px rgba(255,230,0,0.2) !important;
        }
      `,
      lyra: `
        /* Flutua e irradia suavemente */
        .track-item {
          transition: transform 0.5s cubic-bezier(.34,1.56,.64,1), background 0.4s !important;
        }
        .track-item:hover {
          transform: translateY(-3px) !important;
          background: radial-gradient(ellipse at center, rgba(0,200,255,0.06) 0%, transparent 80%) !important;
        }
        .band-card:hover {
          transform: translateY(-8px) scale(1.01) !important;
          box-shadow: 0 24px 60px rgba(0,200,255,0.12) !important;
        }
        .gallery-item:hover {
          transform: scale(1.03) translateY(-3px) !important;
          box-shadow: 0 20px 40px rgba(0,200,255,0.15) !important;
        }
      `,
    };
    return effects[id] || '';
  }

  function _playerCSS(id) {
    const styles = {
      trace: `
        /* Minimal — sem box-shadow, sem decoração */
        .mini-player { border-top: 1px solid var(--neon-20) !important; }
        .fs-progress-fill { box-shadow: none !important; }
        .ctrl-btn--play { box-shadow: none !important; }
        .ctrl-btn--play:hover { box-shadow: 0 0 8px var(--neon-30) !important; }
        .fs-ctrl-btn--play { box-shadow: none !important; }
        .fs-ctrl-btn--play:hover { box-shadow: 0 0 12px var(--neon-30) !important; }
        .mini-progress-fill { box-shadow: none !important; }
      `,
      od: `
        /* Agressivo — bordas retas, glow máximo, offset punk */
        .mini-player {
          border-top: 2px solid var(--neon) !important;
          box-shadow: 0 -4px 24px rgba(57,255,20,0.15) !important;
        }
        .mini-progress-bar { height: 4px !important; border-radius: 0 !important; }
        .mini-progress-fill { border-radius: 0 !important; }
        .fs-progress-bar { height: 5px !important; border-radius: 0 !important; }
        .fs-progress-fill { border-radius: 0 !important; }
        .ctrl-btn--play {
          border-radius: 0 !important;
          box-shadow: 3px 3px 0 rgba(57,255,20,0.5) !important;
        }
        .ctrl-btn--play:hover {
          transform: translate(-2px, -2px) !important;
          box-shadow: 5px 5px 0 rgba(57,255,20,0.6) !important;
          background: var(--neon-20) !important;
        }
        .fs-ctrl-btn--play {
          border-radius: 0 !important;
          box-shadow: 4px 4px 0 rgba(57,255,20,0.4) !important;
        }
        .fs-ctrl-btn--play:hover {
          transform: translate(-2px, -2px) scale(1) !important;
          box-shadow: 6px 6px 0 rgba(57,255,20,0.5) !important;
        }
      `,
      dusk: `
        /* Industrial — borda laranja no topo, play com borda fina */
        .mini-player {
          border-top: 2px solid transparent !important;
          border-image: linear-gradient(90deg, transparent, var(--neon), transparent) 1 !important;
        }
        .fs-progress-bar { height: 3px !important; border-radius: 1px !important; }
        .ctrl-btn--play { border: 1px solid var(--neon) !important; }
        .fs-ctrl-btn--play { border-width: 1px !important; }
      `,
      ember: `
        /* Energético — barra gradiente, glow quente que pulsa */
        .mini-player {
          border-top: 1px solid var(--neon-30) !important;
          box-shadow: 0 -2px 30px rgba(255,230,0,0.08) !important;
        }
        .mini-progress-bar { height: 4px !important; border-radius: 4px !important; }
        .mini-progress-fill {
          background: linear-gradient(90deg, rgba(255,160,0,0.9), var(--neon)) !important;
          box-shadow: 0 0 10px rgba(255,230,0,0.6) !important;
          border-radius: 4px !important;
        }
        .fs-progress-fill {
          background: linear-gradient(90deg, rgba(255,160,0,0.9), var(--neon)) !important;
          box-shadow: 0 0 10px rgba(255,230,0,0.5) !important;
        }
        .ctrl-btn--play {
          box-shadow: 0 0 20px rgba(255,230,0,0.2) !important;
          animation: ember-pulse 2.5s ease-in-out infinite;
        }
        .fs-ctrl-btn--play {
          box-shadow: 0 0 28px rgba(255,230,0,0.25) !important;
          animation: ember-pulse 2.5s ease-in-out infinite;
        }
        @keyframes ember-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,230,0,0.2); }
          50%       { box-shadow: 0 0 32px rgba(255,230,0,0.45); }
        }
      `,
      lyra: `
        /* Etéreo — pill buttons, barra slim, tudo flutua */
        .mini-player {
          border-top: 1px solid rgba(0,200,255,0.15) !important;
          background: rgba(0,8,14,0.75) !important;
          backdrop-filter: blur(28px) !important;
          -webkit-backdrop-filter: blur(28px) !important;
        }
        .mini-progress-bar { height: 2px !important; border-radius: 2px !important; }
        .mini-progress-fill { border-radius: 2px !important; }
        .fs-progress-bar { height: 2px !important; border-radius: 2px !important; }
        .ctrl-btn--play {
          box-shadow: 0 0 20px rgba(0,200,255,0.15), inset 0 0 8px rgba(0,200,255,0.05) !important;
        }
        .ctrl-btn--play:hover {
          box-shadow: 0 0 32px rgba(0,200,255,0.3), inset 0 0 16px rgba(0,200,255,0.1) !important;
        }
        .fs-ctrl-btn--play {
          box-shadow: 0 0 30px rgba(0,200,255,0.2) !important;
        }
        .fs-ctrl-btn--play:hover {
          box-shadow: 0 0 50px rgba(0,200,255,0.35) !important;
        }
      `,
    };
    return styles[id] || '';
  }

  function _enterCSS(id, d) {
    const anims = {
      'trace-enter': `
        @keyframes trace-enter {
          from { opacity: 0; filter: blur(3px); }
          to   { opacity: 1; filter: blur(0); }
        }
        .char-enter { animation: trace-enter 0.65s ease both; }
      `,
      'od-enter': `
        @keyframes od-enter {
          0%   { opacity: 0; transform: translateX(-10px) scaleX(1.01); filter: brightness(2); }
          25%  { opacity: 1; transform: translateX(4px); filter: brightness(1.3); }
          50%  { transform: translateX(-2px); }
          75%  { transform: translateX(1px); }
          100% { opacity: 1; transform: translateX(0) scaleX(1); filter: brightness(1); }
        }
        .char-enter { animation: od-enter 0.35s cubic-bezier(.4,0,.2,1) both; }
      `,
      'dusk-enter': `
        @keyframes dusk-enter {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .char-enter { animation: dusk-enter 0.5s cubic-bezier(.22,1,.36,1) both; }
      `,
      'ember-enter': `
        @keyframes ember-enter {
          0%   { opacity: 0; transform: scale(0.96); filter: brightness(1.8) saturate(1.5); }
          55%  { opacity: 1; transform: scale(1.015); filter: brightness(1.1); }
          100% { opacity: 1; transform: scale(1); filter: brightness(1) saturate(1); }
        }
        .char-enter { animation: ember-enter 0.5s ease both; }
      `,
      'lyra-enter': `
        @keyframes lyra-enter {
          from { opacity: 0; transform: translateY(-8px); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .char-enter { animation: lyra-enter 0.7s cubic-bezier(.34,1.4,.64,1) both; }
      `,
    };
    return anims[d.enterAnim] || '';
  }

  // ── ANIMAÇÃO DE ENTRADA NAS SEÇÕES ───────────────────────────
  function _triggerEnter() {
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;
    const children = Array.from(activeSection.children);
    children.forEach((el, i) => {
      el.classList.remove('char-enter');
      void el.offsetWidth; // force reflow
      el.style.animationDelay = `${i * 0.06}s`;
      el.classList.add('char-enter');
    });
  }

  // ── API PÚBLICA ───────────────────────────────────────────────
  window.CharDesign = {
    apply,
    triggerEnter: _triggerEnter,
    getCurrent:   () => _current,
    getDesign:    (id) => DESIGNS[id] || null,
    DESIGNS,
  };

  // Inicialização automática — lê o tema salvo do ThemeManager
  document.addEventListener('DOMContentLoaded', () => {
    let savedId = 'trace';
    try { savedId = localStorage.getItem('echodome-theme') || 'trace'; } catch (_) {}
    // Pequeno delay pra garantir que o ThemeManager já rodou
    setTimeout(() => apply(savedId), 50);
  });

})();
