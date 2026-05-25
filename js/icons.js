/* =========================================================
   ECHODOME — js/icons.js
   Biblioteca central de ícones SVG.
   Use: Icons.get('play') → string SVG inline.
   ========================================================= */

const Icons = (() => {

  const defs = {

    /* ── Player controls ── */
    play: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21"/>
    </svg>`,

    pause: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="3" width="4" height="18" rx="1"/>
      <rect x="15" y="3" width="4" height="18" rx="1"/>
    </svg>`,

    prev: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="3" height="18" rx="1"/>
      <polygon points="20,3 7,12 20,21"/>
    </svg>`,

    next: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="4,3 17,12 4,21"/>
      <rect x="17" y="3" width="3" height="18" rx="1"/>
    </svg>`,

    close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <line x1="4" y1="4" x2="20" y2="20"/>
      <line x1="20" y1="4" x2="4" y2="20"/>
    </svg>`,

    expand: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="14,4 20,4 20,10"/>
      <polyline points="10,20 4,20 4,14"/>
      <line x1="20" y1="4" x2="13" y2="11"/>
      <line x1="4" y1="20" x2="11" y2="13"/>
    </svg>`,

    /* ── Mode buttons ── */
    shuffle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="16,3 21,3 21,8"/>
      <line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21,16 21,21 16,21"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
    </svg>`,

    loop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="17,1 21,5 17,9"/>
      <path d="M3,11V9a4,4,0,0,1,4-4h14"/>
      <polyline points="7,23 3,19 7,15"/>
      <path d="M21,13v2a4,4,0,0,1-4,4H3"/>
    </svg>`,

    focus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M3,9V5a2,2,0,0,1,2-2h4"/>
      <path d="M21,9V5a2,2,0,0,0-2-2H15"/>
      <path d="M3,15v4a2,2,0,0,0,2,2h4"/>
      <path d="M21,15v4a2,2,0,0,1-2,2H15"/>
    </svg>`,

    boost: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
    </svg>`,

    band: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <path d="M9,18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>`,

    /* ── Volume ── */
    volume: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
      <path d="M15.54,8.46a5,5,0,0,1,0,7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M19.07,4.93a10,10,0,0,1,0,14.14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    /* ── Download states ── */
    download: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="15"/>
      <polyline points="8,11 12,15 16,11"/>
      <line x1="5" y1="20" x2="19" y2="20"/>
    </svg>`,

    loading: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" class="icon-spin">
      <path d="M21,12a9,9,0,1,1-9-9"/>
    </svg>`,

    check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polyline points="20,6 9,17 4,12"/>
    </svg>`,

    /* ── Music note (fallback capa) ── */
    music: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9,18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>`,

    /* ── Share ── */
    share: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>`,

  };

  function get(name) {
    return defs[name] || '';
  }

  /* Conveniência: insere SVG em todos os elementos com data-icon="name" */
  function applyAll() {
    document.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.dataset.icon;
      const svg = get(name);
      if (svg) el.innerHTML = svg;
    });
  }

  return { get, applyAll };
})();
