/* =========================================================
   ECHODOME — js/char-viewer.js
   Fullscreen character SVG viewer.
   - Desktop: ESC to close
   - Mobile:  swipe down to close
   ========================================================= */

const CharViewer = (() => {

  /* Map theme key → SVG path */
  const SVG_MAP = {
    trace: 'assets/characters/trace.svg',
    od:    'assets/characters/od.svg',
    dusk:  'assets/characters/dusk.svg',
    ember: 'assets/characters/ember.svg',
    lyra:  'assets/characters/lyra.svg',
  };

  let viewer    = null;
  let panel     = null;
  let imgWrap   = null;
  let nameEl    = null;
  let isOpen    = false;
  let triggerBtn = null;

  /* ── Drag-to-close state ── */
  let dragStartY  = 0;
  let dragCurrent = 0;
  let isDragging  = false;
  const CLOSE_THRESHOLD = 90; // px pulled down to trigger close

  /* ── Build DOM (once) ── */
  function _build() {
    viewer = document.createElement('div');
    viewer.className = 'char-viewer';
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-label', 'Character viewer');
    viewer.setAttribute('role', 'dialog');

    viewer.innerHTML = `
      <div class="char-viewer__backdrop"></div>
      <div class="char-viewer__panel">
        <div class="char-viewer__drag-hint"></div>
        <span class="char-viewer__close-hint">ESC TO CLOSE</span>
        <div class="char-viewer__img-wrap"></div>
        <div class="char-viewer__base-line"></div>
        <span class="char-viewer__name"></span>
      </div>
    `;

    /* Start hidden — revealed on open() */
    viewer.style.display = 'none';

    document.body.appendChild(viewer);

    panel   = viewer.querySelector('.char-viewer__panel');
    imgWrap = viewer.querySelector('.char-viewer__img-wrap');
    nameEl  = viewer.querySelector('.char-viewer__name');

    /* Close on backdrop click */
    viewer.querySelector('.char-viewer__backdrop')
      .addEventListener('click', close);

    /* Hide overlay after close transition completes */
    panel.addEventListener('transitionend', e => {
      if (e.propertyName === 'transform' && !isOpen) {
        viewer.style.display = 'none';
      }
    });

    /* ESC key */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) close();
    });

    /* Touch drag-to-close (mobile) */
    panel.addEventListener('touchstart', _onTouchStart, { passive: true });
    panel.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    panel.addEventListener('touchend',   _onTouchEnd,   { passive: true });
  }

  /* ── Touch handlers ── */
  function _onTouchStart(e) {
    dragStartY  = e.touches[0].clientY;
    dragCurrent = 0;
    isDragging  = true;
    viewer.classList.add('is-dragging');
  }

  function _onTouchMove(e) {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - dragStartY;
    if (delta < 0) return; // only allow pulling down

    dragCurrent = delta;
    /* Resist a bit: apply sqrt damping beyond halfway threshold */
    const resistance = delta < CLOSE_THRESHOLD
      ? delta
      : CLOSE_THRESHOLD + Math.sqrt((delta - CLOSE_THRESHOLD) * 12);

    panel.style.transform = `translateY(${resistance}px)`;

    /* Fade backdrop proportionally */
    const ratio = Math.min(delta / (CLOSE_THRESHOLD * 1.5), 1);
    viewer.querySelector('.char-viewer__backdrop').style.background =
      `rgba(0,0,0,${0.88 * (1 - ratio)})`;

    /* Prevent page scroll while dragging */
    if (delta > 5) e.preventDefault();
  }

  function _onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    viewer.classList.remove('is-dragging');

    if (dragCurrent >= CLOSE_THRESHOLD) {
      close();
    } else {
      /* Snap back */
      panel.style.transform = '';
      viewer.querySelector('.char-viewer__backdrop').style.background = '';
    }
    dragCurrent = 0;
  }

  /* ── Load SVG inline so currentColor works ── */
  async function _loadSVG(src) {
    try {
      const res  = await fetch(src);
      const text = await res.text();
      /* Inject into wrap, then patch the root <svg> element */
      imgWrap.innerHTML = text;
      const svgEl = imgWrap.querySelector('svg');
      if (svgEl) {
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
        svgEl.classList.add('char-viewer__svg');
      }
    } catch (e) {
      imgWrap.innerHTML = '';
    }
  }

  /* ── Open ── */
  function open(themeKey) {
    if (!viewer) _build();

    const src  = SVG_MAP[themeKey];
    const name = ThemeManager.themes[themeKey]?.label || themeKey.toUpperCase();

    nameEl.textContent = name;
    if (src) _loadSVG(src);

    /* Reset any leftover drag state */
    panel.style.transform = '';
    viewer.querySelector('.char-viewer__backdrop').style.background = '';

    /* Show overlay before transition */
    viewer.style.display = '';
    if (triggerBtn) triggerBtn.classList.add('is-active');

    /* Trigger open animation on next frame so transition fires */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        viewer.classList.add('is-open');
        isOpen = true;
        document.body.style.overflow = 'hidden';
      });
    });
  }

  /* ── Close ── */
  function close() {
    if (!viewer || !isOpen) return;
    viewer.classList.remove('is-open');
    isOpen = false;
    document.body.style.overflow = '';
    if (triggerBtn) triggerBtn.classList.remove('is-active');

    /* Cleanup inline styles from drag */
    panel.style.transform = '';
    viewer.querySelector('.char-viewer__backdrop').style.background = '';
  }

  /* ── Toggle ── */
  function toggle(themeKey) {
    if (isOpen) {
      close();
    } else {
      open(themeKey);
    }
  }

  /* ── Init: wire up the header button ── */
  function init() {
    const btn = document.getElementById('charViewBtn');
    if (!btn) return;
    triggerBtn = btn;

    btn.addEventListener('click', () => {
      const theme = ThemeManager.current();
      toggle(theme);
    });

    /* When theme changes while viewer is open, swap the SVG live */
    document.addEventListener('themeChanged', e => {
      if (!isOpen || !viewer) return;
      const key  = e.detail.theme;
      const name = ThemeManager.themes[key]?.label || key.toUpperCase();
      nameEl.textContent = name;
      if (SVG_MAP[key]) _loadSVG(SVG_MAP[key]);
    });
  }

  return { init, open, close, toggle };
})();