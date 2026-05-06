/* =========================================================
   ECHODOME — js/themes.js
   Theme switching logic. Reads data-theme on <body>.
   ========================================================= */

const THEMES = {
  trace: { label: "TRACE", icon: "◈", color: "#e8e8ff" },
  od:    { label: "OD",    icon: "◆", color: "#39ff14" },
  dusk:  { label: "DUSK",  icon: "✶", color: "#ff6a00" },
  ember: { label: "EMBER", icon: "★", color: "#ffe600" },
  lyra:  { label: "LYRA",  icon: "⟁", color: "#00c8ff" },
};

const ThemeManager = (() => {
  const STORAGE_KEY = "echodome-theme";
  let currentTheme = localStorage.getItem(STORAGE_KEY) || "trace";

  function apply(themeKey) {
    if (!THEMES[themeKey]) return;
    currentTheme = themeKey;
    document.body.setAttribute("data-theme", themeKey);
    localStorage.setItem(STORAGE_KEY, themeKey);

    // ── Design system por personagem ──────────────────────
    if (window.CharDesign) window.CharDesign.apply(themeKey);
    // ─────────────────────────────────────────────────────

    // Update header button
    const dot   = document.querySelector(".theme-dot");
    const label = document.querySelector(".theme-label");
    if (dot)   dot.style.background = THEMES[themeKey].color;
    if (label) label.textContent = THEMES[themeKey].label;

    // Update active state on cards
    document.querySelectorAll(".member-card").forEach(card => {
      card.classList.toggle("active", card.dataset.theme === themeKey);
    });

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEMES[themeKey].color);
  }

  function init() {
    apply(currentTheme);

    // Toggle panel
    const toggleBtn = document.getElementById("themeToggleBtn");
    const panel     = document.getElementById("themePanel");
    const overlay   = document.getElementById("themePanelOverlay");

    const openPanel  = () => { panel.classList.add("open"); overlay.classList.add("visible"); };
    const closePanel = () => { panel.classList.remove("open"); overlay.classList.remove("visible"); };

    toggleBtn?.addEventListener("click", () => {
      panel.classList.contains("open") ? closePanel() : openPanel();
    });
    overlay?.addEventListener("click", closePanel);

    // Member card clicks
    document.querySelectorAll(".member-card").forEach(card => {
      card.addEventListener("click", () => {
        apply(card.dataset.theme);
        closePanel();
      });
    });
  }

  return { init, apply, current: () => currentTheme, themes: THEMES };
})();
