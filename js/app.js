/* =========================================================
   ECHODOME — js/app.js
   Navigation, content rendering, PWA registration.
   Ties ThemeManager + Player + SONGS together.
   ========================================================= */

const BAND_MEMBERS = [
  {
    id:    "trace",
    name:  "TRACE",
    role:  "VOX / GUITAR",
    icon:  "◈",
    bio:   "The voice and face of Echodome — if you can call a mask a face. Trace writes the lyrics and leads the guitars, layering riffs that feel like transmissions from somewhere far away."
  },
  {
    id:    "od",
    name:  "OD",
    role:  "GUITAR",
    icon:  "◆",
    bio:   "Three fuzz pedals, one expression: controlled destruction. OD's playing sits between punk rawness and prog precision. He builds walls of sound and then tears them down mid-song."
  },
  {
    id:    "dusk",
    name:  "DUSK",
    role:  "BASS",
    icon:  "✶",
    bio:   "The low end architect. Dusk's bass is less instrument, more seismic event. When the rest of the band stops, Dusk keeps moving — the last signal still alive in the room."
  },
  {
    id:    "ember",
    name:  "EMBER",
    role:  "DRUMS",
    icon:  "★",
    bio:   "Ember hits hard and hits precise. The drum kit is wrapped in bandages and so is she — a ritual before every show. She calls it 'becoming the machine.'"
  },
  {
    id:    "lyra",
    name:  "LYRA",
    role:  "KEYS",
    icon:  "⟁",
    bio:   "Lyra plays synths and keyboards with a coldness that borders on algorithmic. Her patches are built from field recordings, FM synthesis, and sounds she refuses to name."
  }
];

const GALLERY_ITEMS = [
  { label: "TRACE — LIVE", file: "assets/gallery/trace-live.jpg",  placeholder: "◈" },
  { label: "EMBER — LIVE", file: "assets/gallery/ember-live.jpg",  placeholder: "★" },
  { label: "LYRA — LIVE",  file: "assets/gallery/lyra-live.jpg",   placeholder: "⟁" },
  { label: "OD — LIVE",    file: "assets/gallery/od-live.jpg",     placeholder: "◆" },
  { label: "DUSK — LIVE",  file: "assets/gallery/dusk-live.jpg",   placeholder: "✶" },
];

/* ---- Navigation ---- */
const app = (() => {
  function navigate(sectionId) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

    const section = document.getElementById(`section-${sectionId}`);
    if (section) section.classList.add("active");

    const btn = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);
    if (btn) btn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });

    // Animação de entrada por personagem ao trocar de seção
    if (window.CharDesign) window.CharDesign.triggerEnter();
  }

  function renderTracklist() {
    const container = document.getElementById("tracklist");
    if (!container) return;
    container.innerHTML = "";

    SONGS.forEach((song, idx) => {
      const item = document.createElement("div");
      item.className = "track-item";
      item.dataset.idx = idx;
      item.innerHTML = `
        <span class="track-num">${String(idx + 1).padStart(2, "0")}</span>
        <div class="track-info">
          <span class="track-name">${song.title}</span>
          <div class="track-tags">
            ${(song.tags || []).map(t => `<span class="track-tag">${t}</span>`).join("")}
          </div>
        </div>
        <span class="track-duration">${song.duration}</span>
        <button class="track-play-btn" aria-label="Play ${song.title}">&#9654;</button>
      `;
      item.addEventListener("click", () => Player.playIndex(idx));
      container.appendChild(item);
    });
  }

  function renderGallery() {
    const container = document.getElementById("galleryGrid");
    if (!container) return;
    container.innerHTML = "";

    GALLERY_ITEMS.forEach(item => {
      const el = document.createElement("div");
      el.className = "gallery-item";
      el.innerHTML = `
        <div class="gallery-placeholder">${item.placeholder}</div>
        <span class="gallery-item-label">${item.label}</span>
      `;
      const img = new Image();
      img.onload = () => {
        el.innerHTML = `<img src="${item.file}" alt="${item.label}" loading="lazy" />
          <span class="gallery-item-label">${item.label}</span>`;
      };
      img.src = item.file;
      container.appendChild(el);
    });
  }

  function renderBand() {
    const container = document.getElementById("bandGrid");
    if (!container) return;
    container.innerHTML = "";

    BAND_MEMBERS.forEach(member => {
      const card = document.createElement("div");
      card.className = "band-card";
      card.innerHTML = `
        <span class="band-card-icon">${member.icon}</span>
        <span class="band-card-name">${member.name}</span>
        <span class="band-card-role">${member.role}</span>
        <p class="band-card-bio">${member.bio}</p>
      `;
      container.appendChild(card);
    });
  }

  function initNav() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => navigate(btn.dataset.section));
    });
  }

  function init() {
    initNav();
    renderTracklist();
    renderGallery();
    renderBand();
    ThemeManager.init();
    Player.init(SONGS);
  }

  return { init, navigate };
})();

/* ---- PWA: Service Worker ---- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("[SW] registered:", reg.scope))
      .catch(err => console.warn("[SW] registration failed:", err));
  });
}

document.addEventListener("DOMContentLoaded", app.init);
