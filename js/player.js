/* =========================================================
   ECHODOME — js/player.js
   Audio engine + mini player + fullscreen player.
   Does NOT touch navigation or themes.
   ========================================================= */

const Player = (() => {
  /* ---- State ---- */
  let audio       = null;
  let playlist    = [];
  let currentIdx  = -1;
  let isPlaying   = false;

  /* ---- DOM refs (populated on init) ---- */
  let elMiniPlayer, elMiniTitle, elMiniPlay,
      elMiniPrev, elMiniNext, elMiniFill,
      elExpandPlayer, elMiniCoverImg, elMiniCoverFallback,
      elFS, elFSClose, elFSPlay, elFSPrev, elFSNext,
      elFSTitle, elFSCurrent, elFSDuration,
      elFSFill, elFSBar, elMiniFillBar,
      elFSVolume, elFSLyrics, elFSStory,
      elFSIcon, elFSTabs;

  /* ---- Helpers ---- */
  function fmt(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function setPlayIcon(playing) {
    const icon = playing ? "&#9646;&#9646;" : "&#9654;";
    if (elMiniPlay) elMiniPlay.innerHTML = icon;
    if (elFSPlay)   elFSPlay.innerHTML   = icon;
  }

  function updateProgress() {
    if (!audio || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    if (elMiniFill) elMiniFill.style.width = pct + "%";
    if (elFSFill)   elFSFill.style.width   = pct + "%";
    if (elFSCurrent) elFSCurrent.textContent = fmt(audio.currentTime);
  }

  function loadSong(idx, playAfterLoad = false) {
    if (idx < 0 || idx >= playlist.length) return;
    currentIdx = idx;
    const song = playlist[idx];

    // Remove any previous one-shot canplay listener
    audio.src = "";
    audio.src = song.file;
    audio.load();

    if (playAfterLoad) {
      const onCanPlay = () => {
        audio.removeEventListener("canplay", onCanPlay);
        play();
      };
      audio.addEventListener("canplay", onCanPlay);
    }

    // Mini player
    if (elMiniTitle) elMiniTitle.textContent = song.title;
    if (elMiniPlayer) elMiniPlayer.classList.remove("hidden");

    // Cover do álbum no mini player
    const album = typeof ALBUMS !== "undefined" ? ALBUMS.find(a => a.id === song.albumId) : null;
    if (elMiniCoverImg && elMiniCoverFallback) {
      if (album?.cover) {
        elMiniCoverImg.src = album.cover;
        elMiniCoverImg.alt = album.name || "";
        elMiniCoverImg.style.display = "block";
        elMiniCoverFallback.style.display = "none";
      } else {
        elMiniCoverImg.src = "";
        elMiniCoverImg.style.display = "none";
        elMiniCoverFallback.style.display = "flex";
        elMiniCoverFallback.textContent = album?.coverEmoji || "🎵";
      }
    }

    // Fullscreen
    if (elFSTitle)    elFSTitle.textContent    = song.title;
    if (elFSDuration) elFSDuration.textContent = song.duration;
    if (elFSCurrent)  elFSCurrent.textContent  = "0:00";
    if (elFSFill)     elFSFill.style.width     = "0%";
    if (elMiniFill)   elMiniFill.style.width   = "0%";

    // Icon from current theme
    const theme = document.body.getAttribute("data-theme") || "trace";
    const icons = { trace: "◈", od: "◆", dusk: "✶", ember: "★", lyra: "⟁" };
    if (elFSIcon) elFSIcon.textContent = icons[theme] || "◈";

    // Lyrics & story
    if (elFSLyrics) elFSLyrics.innerHTML =
      `<p>${(song.lyrics || "// no lyrics").replace(/\[([^\]]+)\]/g,
        '<strong>[$1]</strong>').replace(/\n/g, '<br>')}</p>`;
    if (elFSStory) elFSStory.innerHTML =
      `<p>${(song.story || "// no story yet").replace(/\n\n/g, '</p><p>')}</p>`;

    // Highlight in tracklist
    document.querySelectorAll(".track-item").forEach((el, i) => {
      el.classList.toggle("playing", i === idx);
      const btn = el.querySelector(".track-play-btn");
      if (btn) btn.innerHTML = i === idx && isPlaying ? "&#9646;&#9646;" : "&#9654;";
    });
  }

  function play() {
    const promise = audio.play();
    if (promise !== undefined) {
      promise.then(() => {
        isPlaying = true;
        setPlayIcon(true);
        updateTracklistBtns();
      }).catch(err => {
        console.warn("[Player] play() blocked:", err);
        isPlaying = false;
        setPlayIcon(false);
      });
    }
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    setPlayIcon(false);
    updateTracklistBtns();
  }

  function togglePlay() {
    isPlaying ? pause() : play();
  }

  function next() {
    const idx = (currentIdx + 1) % playlist.length;
    loadSong(idx, isPlaying);
  }

  function prev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const idx = (currentIdx - 1 + playlist.length) % playlist.length;
    loadSong(idx, isPlaying);
  }

  function playIndex(idx) {
    if (idx === currentIdx) { togglePlay(); return; }
    loadSong(idx, true);
  }

  function updateTracklistBtns() {
    document.querySelectorAll(".track-item").forEach((el, i) => {
      const btn = el.querySelector(".track-play-btn");
      if (btn) btn.innerHTML = (i === currentIdx && isPlaying) ? "&#9646;&#9646;" : "&#9654;";
    });
  }

  /* ---- Progress bar seeking ---- */
  function seekOnClick(bar, e) {
    if (!audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  }

  /* ---- Fullscreen ---- */
  function openFS() {
    if (elFS) { elFS.classList.add("open"); elFS.removeAttribute("aria-hidden"); }
  }
  function closeFS() {
    if (elFS) { elFS.classList.remove("open"); elFS.setAttribute("aria-hidden", "true"); }
  }

  /* ---- Tabs in fullscreen ---- */
  function initTabs() {
    document.querySelectorAll(".fs-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".fs-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".fs-tab-pane").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const pane = document.getElementById(`tab-${tab.dataset.tab}`);
        if (pane) pane.classList.add("active");
      });
    });
  }

  /* ---- Init ---- */
  function init(songs) {
    playlist = songs;
    audio = document.getElementById("audioEngine");
    if (!audio) return;

    elMiniPlayer   = document.getElementById("miniPlayer");
    elMiniTitle    = document.getElementById("miniTitle");
    elMiniPlay     = document.getElementById("miniPlay");
    elMiniPrev     = document.getElementById("miniPrev");
    elMiniNext     = document.getElementById("miniNext");
    elMiniFill     = document.getElementById("miniProgressFill");
    elMiniFillBar  = document.getElementById("miniProgressBar");
    elExpandPlayer      = document.getElementById("expandPlayer");
    elMiniCoverImg      = document.getElementById("miniCoverImg");
    elMiniCoverFallback = document.getElementById("miniCoverFallback");

    elFS         = document.getElementById("fullscreenPlayer");
    elFSClose    = document.getElementById("fsCloseBtn");
    elFSPlay     = document.getElementById("fsPlay");
    elFSPrev     = document.getElementById("fsPrev");
    elFSNext     = document.getElementById("fsNext");
    elFSTitle    = document.getElementById("fsTitle");
    elFSCurrent  = document.getElementById("fsCurrent");
    elFSDuration = document.getElementById("fsDuration");
    elFSFill     = document.getElementById("fsProgressFill");
    elFSBar      = document.getElementById("fsProgressBar");
    elFSVolume   = document.getElementById("fsVolume");
    elFSLyrics   = document.getElementById("fsLyrics");
    elFSStory    = document.getElementById("fsStory");
    elFSIcon     = document.getElementById("fsArtworkIcon");

    // Audio events
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", next);
    audio.addEventListener("loadedmetadata", () => {
      if (elFSDuration) elFSDuration.textContent = fmt(audio.duration);
    });

    // Mini player controls
    elMiniPlay?.addEventListener("click",    togglePlay);
    elMiniPrev?.addEventListener("click",    prev);
    elMiniNext?.addEventListener("click",    next);
    elExpandPlayer?.addEventListener("click", openFS);
    elMiniFillBar?.addEventListener("click", e => seekOnClick(elMiniFillBar, e));

    // Fullscreen controls
    elFSPlay?.addEventListener("click",  togglePlay);
    elFSPrev?.addEventListener("click",  prev);
    elFSNext?.addEventListener("click",  next);
    elFSClose?.addEventListener("click", closeFS);
    elFSBar?.addEventListener("click",   e => seekOnClick(elFSBar, e));

    // Volume
    elFSVolume?.addEventListener("input", () => {
      audio.volume = parseFloat(elFSVolume.value);
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (e.target.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft")  prev();
      if (e.code === "Escape")     closeFS();
    });

    initTabs();
  }

  return { init, playIndex, togglePlay, next, prev, isPlaying: () => isPlaying };
})();
