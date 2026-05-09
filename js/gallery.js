/* =========================================================
   ECHODOME — js/gallery.js
   Dados da galeria + lógica do lightbox.

   Para adicionar ou remover fotos: edite só GALLERY_ITEMS.
   Para mudar o comportamento do lightbox: edite só GalleryLightbox.
   ========================================================= */


/* ── 1. DADOS ─────────────────────────────────────────────
   Cada entrada: { file, label, placeholder }
   - file        → caminho relativo a partir da raiz do projeto
   - label       → legenda exibida no hover e no lightbox
   - placeholder → ícone exibido enquanto a imagem carrega
   ───────────────────────────────────────────────────────── */

const GALLERY_ITEMS = [

  /* LIVE */
  { file: 'assets/gallery/trace-live.jpg',             label: 'TRACE — LIVE',                placeholder: '◈' },
  { file: 'assets/gallery/ember-live.jpg',             label: 'EMBER — LIVE',                placeholder: '★' },
  { file: 'assets/gallery/lyra-live.jpg',              label: 'LYRA — LIVE',                 placeholder: '⟁' },
  { file: 'assets/gallery/od-live.jpg',                label: 'OD — LIVE',                   placeholder: '◆' },
  { file: 'assets/gallery/dusk-live.jpg',              label: 'DUSK — LIVE',                 placeholder: '✶' },
  { file: 'assets/gallery/show.png',                   label: 'THE SHOW',                    placeholder: '◈' },

  /* STUDIO / BASTIDORES */
  { file: 'assets/gallery/in-studio.png',              label: 'IN STUDIO',                   placeholder: '◈' },
  { file: 'assets/gallery/in-studio2.png',             label: 'IN STUDIO II',                placeholder: '◈' },
  { file: 'assets/gallery/studio.jpeg',                label: 'STUDIO SESSION',              placeholder: '◈' },

  /* BANDA */
  { file: 'assets/gallery/band.png',                   label: 'THE BAND',                    placeholder: '◈' },
  { file: 'assets/gallery/band2.png',                  label: 'THE BAND II',                 placeholder: '◈' },
  { file: 'assets/gallery/band3.png',                  label: 'THE BAND III',                placeholder: '◈' },
  { file: 'assets/gallery/full-band.jpeg',             label: 'FULL BAND',                   placeholder: '◈' },
  { file: 'assets/gallery/full-band-logo.jpg',         label: 'FULL BAND — LOGO',            placeholder: '◈' },

  /* RETRATOS — SOFÁ */
  { file: 'assets/gallery/trace-sofa.jpg',             label: 'TRACE',                       placeholder: '◈' },
  { file: 'assets/gallery/od-sofa.jpg',                label: 'OD',                          placeholder: '◆' },
  { file: 'assets/gallery/dusk-sofa.png',              label: 'DUSK',                        placeholder: '✶' },
  { file: 'assets/gallery/ember-sofa.jpg',             label: 'EMBER',                       placeholder: '★' },
  { file: 'assets/gallery/lyra-sofa.png',              label: 'LYRA',                        placeholder: '⟁' },

  /* GIFs */
  { file: 'assets/gallery/trace.gif',                  label: 'TRACE — ANIMATED',            placeholder: '◈' },
  { file: 'assets/gallery/od.gif',                     label: 'OD — ANIMATED',               placeholder: '◆' },
  { file: 'assets/gallery/dusk.gif',                   label: 'DUSK — ANIMATED',             placeholder: '✶' },
  { file: 'assets/gallery/ember.gif',                  label: 'EMBER — ANIMATED',            placeholder: '★' },
  { file: 'assets/gallery/lyra.gif',                   label: 'LYRA — ANIMATED',             placeholder: '⟁' },

  /* ARTWORK / SINGLES */
  { file: 'assets/gallery/i-feel-stuck.png',           label: 'I FEEL STUCK',                placeholder: '◈' },
  { file: 'assets/gallery/between-the-lines.png',      label: 'BETWEEN THE LINES',           placeholder: '◈' },
  { file: 'assets/gallery/vozes-em-mim.png',           label: 'VOZES EM MIM',                placeholder: '◈' },
  { file: 'assets/gallery/te-voy-a-cambiar.png',       label: 'TE VOY A CAMBIAR',            placeholder: '◈' },
  { file: 'assets/gallery/somewhere-between-us.png',   label: 'SOMEWHERE BETWEEN US',        placeholder: '◈' },
  { file: 'assets/gallery/what-if.png',                label: 'WHAT IF',                     placeholder: '◈' },
  { file: 'assets/gallery/ate-onde-vale.png',          label: 'ATÉ ONDE VALE',               placeholder: '◈' },
  { file: 'assets/gallery/eu-nao-queria-sentir-assim.png', label: 'EU NÃO QUERIA SENTIR ASSIM', placeholder: '◈' },
  { file: 'assets/gallery/depois-das-2-da-manha.png',  label: 'DEPOIS DAS 2 DA MANHÃ',       placeholder: '◈' },
  { file: 'assets/gallery/nunca-es-suficiente.png',    label: 'NUNCA ES SUFICIENTE',         placeholder: '◈' },
  { file: 'assets/gallery/after-everybody-sleeps.png', label: 'AFTER EVERYBODY SLEEPS',      placeholder: '◈' },
  { file: 'assets/gallery/echoes-of-yesterday.png',    label: 'ECHOES OF YESTERDAY',         placeholder: '◈' },
  { file: 'assets/gallery/letters-i-never-send.png',   label: 'LETTERS I NEVER SEND',        placeholder: '◈' },
  { file: 'assets/gallery/love-story.png',             label: 'LOVE STORY',                  placeholder: '◈' },
  { file: 'assets/gallery/the-boy-i-was.png',          label: 'THE BOY I WAS',               placeholder: '◈' },
  { file: 'assets/gallery/album1.png',                 label: 'ALBUM ARTWORK I',             placeholder: '◈' },
  { file: 'assets/gallery/album2.png',                 label: 'ALBUM ARTWORK II',            placeholder: '◈' },

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
    const item = GALLERY_ITEMS[currentIndex];
    el.img.src           = item.file;
    el.img.alt           = item.label;
    el.label.textContent   = item.label;
    el.counter.textContent = `${currentIndex + 1} / ${GALLERY_ITEMS.length}`;
  }

  function open(index) {
    _build();
    currentIndex = index;
    _render();
    el.overlay.classList.add('lb-open');
    document.body.classList.add('lb-active'); // trava scroll
    el.img.focus();
  }

  function close() {
    el.overlay.classList.remove('lb-open');
    document.body.classList.remove('lb-active');
  }

  function prev() {
    currentIndex = (currentIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
    _render();
  }

  function next() {
    currentIndex = (currentIndex + 1) % GALLERY_ITEMS.length;
    _render();
  }

  return { open, close, prev, next };

})();


/* ── 3. RENDER DA GRADE ───────────────────────────────────
   Chamado por app.js no init. Monta o grid e conecta
   cada item ao lightbox.
   ───────────────────────────────────────────────────────── */

function renderGallery() {
  const container = document.getElementById('galleryGrid');
  if (!container) return;
  container.innerHTML = '';

  GALLERY_ITEMS.forEach((item, index) => {

    const card = document.createElement('div');
    card.className       = 'gallery-item';
    card.tabIndex        = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Ver ${item.label}`);

    /* Placeholder enquanto carrega */
    card.innerHTML = `
      <div class="gallery-placeholder">${item.placeholder}</div>
      <span class="gallery-item-label">${item.label}</span>
    `;

    /* Troca pelo <img> real quando carregou */
    const img = new Image();
    img.onload = () => {
      card.innerHTML = `
        <img src="${item.file}" alt="${item.label}" loading="lazy" />
        <span class="gallery-item-label">${item.label}</span>
      `;
    };
    img.src = item.file;

    /* Abre lightbox */
    card.addEventListener('click',   ()  => GalleryLightbox.open(index));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') GalleryLightbox.open(index);
    });

    container.appendChild(card);
  });
}
