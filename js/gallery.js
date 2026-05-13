/* =========================================================
   ECHODOME — js/gallery.js
   Dados da galeria + lógica do lightbox + filtros + busca.
   ========================================================= */


/* ── 1. DADOS ─────────────────────────────────────────────
   Cada entrada: { file, label, placeholder, tags[] }
   tags → 'live' | 'studio' | 'band' | 'portrait' | 'gif' | 'artwork'
   ───────────────────────────────────────────────────────── */

const GALLERY_ITEMS = [

  /* LIVE */
  { file: 'assets/gallery/trace-live.jpg',             label: 'TRACE — LIVE',                placeholder: '◈', tags: ['live'] },
  { file: 'assets/gallery/ember-live.jpg',             label: 'EMBER — LIVE',                placeholder: '★', tags: ['live'] },
  { file: 'assets/gallery/lyra-live.jpg',              label: 'LYRA — LIVE',                 placeholder: '⟁', tags: ['live'] },
  { file: 'assets/gallery/od-live.jpg',                label: 'OD — LIVE',                   placeholder: '◆', tags: ['live'] },
  { file: 'assets/gallery/dusk-live.jpg',              label: 'DUSK — LIVE',                 placeholder: '✶', tags: ['live'] },
  { file: 'assets/gallery/show.png',                   label: 'THE SHOW',                    placeholder: '◈', tags: ['live'] },

  /* STUDIO / BASTIDORES */
  { file: 'assets/gallery/in-studio.png',              label: 'IN STUDIO',                   placeholder: '◈', tags: ['studio'] },
  { file: 'assets/gallery/in-studio2.png',             label: 'IN STUDIO II',                placeholder: '◈', tags: ['studio'] },
  { file: 'assets/gallery/studio.jpeg',                label: 'STUDIO SESSION',              placeholder: '◈', tags: ['studio'] },

  /* BANDA */
  { file: 'assets/gallery/band.png',                   label: 'THE BAND',                    placeholder: '◈', tags: ['band'] },
  { file: 'assets/gallery/band2.png',                  label: 'THE BAND II',                 placeholder: '◈', tags: ['band'] },
  { file: 'assets/gallery/band3.png',                  label: 'THE BAND III',                placeholder: '◈', tags: ['band'] },
  { file: 'assets/gallery/full-band.jpeg',             label: 'FULL BAND',                   placeholder: '◈', tags: ['band'] },
  { file: 'assets/gallery/full-band-logo.jpg',         label: 'FULL BAND — LOGO',            placeholder: '◈', tags: ['band'] },

  /* RETRATOS — SOFÁ */
  { file: 'assets/gallery/trace-sofa.jpg',             label: 'TRACE',                       placeholder: '◈', tags: ['portrait'] },
  { file: 'assets/gallery/od-sofa.jpg',                label: 'OD',                          placeholder: '◆', tags: ['portrait'] },
  { file: 'assets/gallery/dusk-sofa.png',              label: 'DUSK',                        placeholder: '✶', tags: ['portrait'] },
  { file: 'assets/gallery/ember-sofa.jpg',             label: 'EMBER',                       placeholder: '★', tags: ['portrait'] },
  { file: 'assets/gallery/lyra-sofa.png',              label: 'LYRA',                        placeholder: '⟁', tags: ['portrait'] },

  /* GIFs */
  { file: 'assets/gallery/trace.gif',                  label: 'TRACE — ANIMATED',            placeholder: '◈', tags: ['gif'] },
  { file: 'assets/gallery/od.gif',                     label: 'OD — ANIMATED',               placeholder: '◆', tags: ['gif'] },
  { file: 'assets/gallery/dusk.gif',                   label: 'DUSK — ANIMATED',             placeholder: '✶', tags: ['gif'] },
  { file: 'assets/gallery/ember.gif',                  label: 'EMBER — ANIMATED',            placeholder: '★', tags: ['gif'] },
  { file: 'assets/gallery/lyra.gif',                   label: 'LYRA — ANIMATED',             placeholder: '⟁', tags: ['gif'] },

  /* ARTWORK / SINGLES */
  { file: 'assets/gallery/i-feel-stuck.png',           label: 'I FEEL STUCK',                placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/between-the-lines.png',      label: 'BETWEEN THE LINES',           placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/vozes-em-mim.png',           label: 'VOZES EM MIM',                placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/te-voy-a-cambiar.png',       label: 'TE VOY A CAMBIAR',            placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/somewhere-between-us.png',   label: 'SOMEWHERE BETWEEN US',        placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/what-if.png',                label: 'WHAT IF',                     placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/ate-onde-vale.png',          label: 'ATÉ ONDE VALE',               placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/eu-nao-queria-sentir-assim.png', label: 'EU NÃO QUERIA SENTIR ASSIM', placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/depois-das-2-da-manha.png',  label: 'DEPOIS DAS 2 DA MANHÃ',       placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/nunca-es-suficiente.png',    label: 'NUNCA ES SUFICIENTE',         placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/after-everybody-sleeps.png', label: 'AFTER EVERYBODY SLEEPS',      placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/echoes-of-yesterday.png',    label: 'ECHOES OF YESTERDAY',         placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/letters-i-never-send.png',   label: 'LETTERS I NEVER SEND',        placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/love-story.png',             label: 'LOVE STORY',                  placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/the-boy-i-was.png',          label: 'THE BOY I WAS',               placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/album1.png',                 label: 'ALBUM ARTWORK I',             placeholder: '◈', tags: ['artwork'] },
  { file: 'assets/gallery/album2.png',                 label: 'ALBUM ARTWORK II',            placeholder: '◈', tags: ['artwork'] },

];


/* ── 2. LIGHTBOX ──────────────────────────────────────────
   Abre a imagem em tela cheia com navegação prev/next.
   Controlado por teclado (← → Esc) e swipe no mobile.
   ───────────────────────────────────────────────────────── */

const GalleryLightbox = (() => {

  let currentIndex = 0;
  let el = {};         // referências aos elementos do DOM
  let touchStartX = 0; // para suporte a swipe

  /* Cria o markup do lightbox uma única vez */
  function _build() {
    if (document.getElementById('galleryLightbox')) return;

    const overlay = document.createElement('div');
    overlay.id        = 'galleryLightbox';
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Visualizador de imagem');

    overlay.innerHTML = `
      <button class="lb-btn lb-close" id="lbClose" aria-label="Fechar" data-icon="close"></button>
      <button class="lb-btn lb-prev"  id="lbPrev"   aria-label="Anterior" data-icon="prev"></button>
      <button class="lb-btn lb-next"  id="lbNext"   aria-label="Próximo"  data-icon="next"></button>

      <div class="lb-stage">
        <img class="lb-img" id="lbImg" src="" alt="" />
      </div>

      <footer class="lb-footer">
        <span class="lb-label"   id="lbLabel"></span>
        <span class="lb-counter" id="lbCounter"></span>
      </footer>
    `;

    document.body.appendChild(overlay);
    Icons.applyAll();

    /* Guarda referências */
    el = {
      overlay,
      img:     document.getElementById('lbImg'),
      label:   document.getElementById('lbLabel'),
      counter: document.getElementById('lbCounter'),
    };

    /* Eventos */
    document.getElementById('lbClose').addEventListener('click', close);
    document.getElementById('lbPrev').addEventListener('click', prev);
    document.getElementById('lbNext').addEventListener('click', next);

    /* Clique no fundo fecha */
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    /* Teclado */
    document.addEventListener('keydown', _onKey);

    /* Swipe mobile */
    overlay.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    overlay.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    });
  }

  function _onKey(e) {
    if (!el.overlay || !el.overlay.classList.contains('lb-open')) return;
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape')     close();
  }

  function _render() {
    const item = _visibleItems[currentIndex] || GALLERY_ITEMS[currentIndex];
    /* Usa WebP no lightbox se disponível */
    const webpMatch = item.file.match(/^(assets\/gallery\/)(.+)\.(png)$/);
    if (webpMatch) {
      const webpSrc = `assets/gallery/webp/${webpMatch[2]}.webp`;
      el.img.src = webpSrc;
      el.img.onerror = () => { el.img.src = item.file; el.img.onerror = null; };
    } else {
      el.img.src = item.file;
    }
    el.img.alt           = item.label;
    el.label.textContent   = item.label;
    el.counter.textContent = `${currentIndex + 1} / ${_visibleItems.length || GALLERY_ITEMS.length}`;
  }

  function open(index) {
    _build();
    currentIndex = index;
    _render();
    el.overlay.classList.add('lb-open');
    document.body.classList.add('lb-active');
    el.img.focus();
  }

  function close() {
    el.overlay.classList.remove('lb-open');
    document.body.classList.remove('lb-active');
  }

  function prev() {
    const total = _visibleItems.length || GALLERY_ITEMS.length;
    currentIndex = (currentIndex - 1 + total) % total;
    _render();
  }

  function next() {
    const total = _visibleItems.length || GALLERY_ITEMS.length;
    currentIndex = (currentIndex + 1) % total;
    _render();
  }

  return { open, close, prev, next };

})();


/* ── 3. RENDER DA GRADE ───────────────────────────────────
   Renderiza o grid, os botões de filtro e a busca.
   ───────────────────────────────────────────────────────── */

/* Estado do filtro/busca */
let _galleryFilter = 'all';
let _galleryQuery  = '';

/* Índice "global" dos itens visíveis — usado pelo lightbox */
let _visibleItems  = [...GALLERY_ITEMS];

const FILTER_LABELS = {
  all:      'ALL',
  live:     'LIVE',
  studio:   'STUDIO',
  band:     'BAND',
  portrait: 'PORTRAITS',
  gif:      'ANIMATED',
  artwork:  'ARTWORK',
};

function _buildFilterBar(container) {
  /* Evita duplicar se já existir */
  if (document.getElementById('galleryFilterBar')) return;

  const bar = document.createElement('div');
  bar.id        = 'galleryFilterBar';
  bar.className = 'gallery-filter-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filtrar galeria');

  Object.entries(FILTER_LABELS).forEach(([value, label]) => {
    const btn = document.createElement('button');
    btn.className        = 'gallery-filter-btn' + (value === 'all' ? ' active' : '');
    btn.dataset.filter   = value;
    btn.textContent      = label;
    btn.setAttribute('aria-pressed', value === 'all' ? 'true' : 'false');
    btn.addEventListener('click', () => {
      _galleryFilter = value;
      document.querySelectorAll('.gallery-filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === value);
        b.setAttribute('aria-pressed', b.dataset.filter === value ? 'true' : 'false');
      });
      _renderGalleryItems();
    });
    bar.appendChild(btn);
  });

  /* Insere a barra logo antes do grid */
  const grid = document.getElementById('galleryGrid');
  grid.parentNode.insertBefore(bar, grid);
}

function _renderGalleryItems() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;
  container.innerHTML = '';

  const q = _galleryQuery.toLowerCase().trim();

  _visibleItems = GALLERY_ITEMS.filter(item => {
    const matchFilter = _galleryFilter === 'all' || (item.tags && item.tags.includes(_galleryFilter));
    const matchSearch = !q || item.label.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  if (_visibleItems.length === 0) {
    container.innerHTML = `<p class="gallery-empty">// NO RESULTS FOR "${q || _galleryFilter.toUpperCase()}"</p>`;
    return;
  }

  _visibleItems.forEach((item, visIdx) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.tabIndex  = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver ${item.label}`);

    card.innerHTML = `
      <div class="gallery-placeholder">${item.placeholder}</div>
      <span class="gallery-item-label">${item.label}</span>
    `;

    /* Usa WebP se disponível (apenas PNGs grandes têm versão WebP) */
    function _webpSrc(file) {
      const match = file.match(/^(assets\/gallery\/)(.+)\.(png)$/);
      if (!match) return null;
      return `assets/gallery/webp/${match[2]}.webp`;
    }

    const webp = _webpSrc(item.file);
    const imgEl = new Image();
    imgEl.onload = () => {
      if (webp) {
        card.innerHTML = `
          <picture>
            <source srcset="${webp}" type="image/webp" />
            <img src="${item.file}" alt="${item.label}" loading="lazy" />
          </picture>
          <span class="gallery-item-label">${item.label}</span>
        `;
      } else {
        card.innerHTML = `
          <img src="${item.file}" alt="${item.label}" loading="lazy" />
          <span class="gallery-item-label">${item.label}</span>
        `;
      }
    };
    imgEl.src = webp || item.file;

    card.addEventListener('click',   ()  => GalleryLightbox.open(visIdx));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') GalleryLightbox.open(visIdx);
    });

    container.appendChild(card);
  });
}

function renderGallery() {
  _buildFilterBar();
  _renderGalleryItems();

  /* Busca na galeria */
  const searchEl = document.getElementById('gallerySearch');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      _galleryQuery = searchEl.value;
      _renderGalleryItems();
    });
  }
}
