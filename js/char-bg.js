/* =========================================================
   ECHODOME — js/char-bg.js
   Troca o SVG de personagem no fundo do hero conforme o tema.
   Escuta o atributo data-theme no <body> via MutationObserver.
   Não depende de nenhum outro módulo.
   ========================================================= */

const CharBg = (() => {
  const CHARS = ["trace", "od", "dusk", "ember", "lyra"];
  const SVG_PATH = "assets/characters/";

  let container = null;
  let imgs = {};       // { trace: <img>, od: <img>, ... }
  let current = null;

  /* Pré-carrega todos os SVGs e insere no container (ocultos) */
  function preload() {
    CHARS.forEach(char => {
      const img = document.createElement("img");
      img.src = `${SVG_PATH}${char}.svg`;
      img.alt = "";
      img.className = "char-bg__img";
      img.setAttribute("aria-hidden", "true");
      img.setAttribute("draggable", "false");
      container.appendChild(img);
      imgs[char] = img;
    });
  }

  /* Ativa o personagem correspondente ao tema */
  function switchTo(theme) {
    if (!CHARS.includes(theme) || theme === current) return;

    // Remove active do anterior
    if (current && imgs[current]) {
      imgs[current].classList.remove("active");
    }

    // Ativa o novo
    if (imgs[theme]) {
      imgs[theme].classList.add("active");
    }

    current = theme;
  }

  /* Observa mudanças em data-theme no <body> */
  function observe() {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.attributeName === "data-theme") {
          switchTo(document.body.getAttribute("data-theme") || "trace");
        }
      }
    });
    observer.observe(document.body, { attributes: true });
  }

  function init() {
    container = document.getElementById("charBg");
    if (!container) return;

    preload();
    observe();

    // Estado inicial
    switchTo(document.body.getAttribute("data-theme") || "trace");
  }

  return { init };
})();
