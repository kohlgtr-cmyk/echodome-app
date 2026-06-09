/* =========================================================
   ECHODOME — js/playlists.js
   Sistema de playlists customizadas com persistência via localStorage.
   ========================================================= */

const Playlists = (() => {

  const STORAGE_KEY = 'echodome_playlists';
  let _data         = [];   /* Array de { id, name, songIds[] } */
  let _panelOpen    = false;
  let _editingId    = null; /* id da playlist em edição, null = nova */

  /* ── Persistência ── */
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _data = raw ? JSON.parse(raw) : [];
    } catch (e) {
      _data = [];
    }
  }

  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_data)); } catch (e) {}
  }

  /* ── CRUD ── */
  function create(name) {
    const pl = { id: Date.now(), name: name.trim() || 'Nova Playlist', songIds: [] };
    _data.push(pl);
    _save();
    _renderPanel();
    return pl;
  }

  function rename(id, newName) {
    const pl = _data.find(p => p.id === id);
    if (pl) { pl.name = newName.trim() || pl.name; _save(); _renderPanel(); }
  }

  function remove(id) {
    _data = _data.filter(p => p.id !== id);
    _save();
    _renderPanel();
  }

  function addSong(playlistId, songId) {
    const pl = _data.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.songIds.includes(songId)) {
      _showToast('Música já está na playlist');
      return;
    }
    pl.songIds.push(songId);
    _save();
    _showToast('Adicionada à playlist');
    _renderPanel();
  }

  function removeSong(playlistId, songId) {
    const pl = _data.find(p => p.id === playlistId);
    if (!pl) return;
    pl.songIds = pl.songIds.filter(id => id !== songId);
    _save();
    _renderPanel();
  }

  function getAll()      { return [..._data]; }
  function getById(id)   { return _data.find(p => p.id === id) || null; }

  /* Resolve os song objects de uma playlist */
  function getSongs(playlistId) {
    const pl = _data.find(p => p.id === playlistId);
    if (!pl) return [];
    return pl.songIds
      .map(id => (typeof SONGS !== 'undefined' ? SONGS.find(s => s.id === id) : null))
      .filter(Boolean);
  }

  /* ── Toast ── */
  function _showToast(msg) {
    let toast = document.getElementById('plToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id        = 'plToast';
      toast.className = 'push-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  /* ── Painel principal de playlists ── */
  function _panel() { return document.getElementById('playlistPanel'); }

  function togglePanel() {
    _panelOpen = !_panelOpen;
    const panel = _panel();
    if (panel) panel.classList.toggle('open', _panelOpen);
    const btn = document.getElementById('playlistBtn');
    if (btn) btn.classList.toggle('active', _panelOpen);
    if (_panelOpen) _renderPanel();
  }

  function closePanel() {
    _panelOpen = false;
    const panel = _panel();
    if (panel) panel.classList.remove('open');
    const btn = document.getElementById('playlistBtn');
    if (btn) btn.classList.remove('active');
  }

  /* ── Render do painel ── */
  function _renderPanel() {
    const body = document.getElementById('playlistPanelBody');
    if (!body) return;
    body.innerHTML = '';

    if (_data.length === 0) {
      body.innerHTML = '<p class="queue-empty">// NENHUMA PLAYLIST — crie uma abaixo</p>';
    } else {
      _data.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'pl-item';
        div.innerHTML = `
          <div class="pl-item-info">
            <span class="pl-item-name">${_esc(pl.name)}</span>
            <span class="pl-item-count">${pl.songIds.length} música${pl.songIds.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="pl-item-actions">
            <button class="pl-btn pl-btn-play"  title="Tocar playlist" data-id="${pl.id}">▶</button>
            <button class="pl-btn pl-btn-edit"  title="Editar"         data-id="${pl.id}">✎</button>
            <button class="pl-btn pl-btn-del"   title="Deletar"        data-id="${pl.id}">✕</button>
          </div>
        `;

        div.querySelector('.pl-btn-play').addEventListener('click', () => _playPlaylist(pl.id));
        div.querySelector('.pl-btn-edit').addEventListener('click', () => _openEditor(pl.id));
        div.querySelector('.pl-btn-del').addEventListener('click', () => {
          if (confirm(`Deletar "${pl.name}"?`)) remove(pl.id);
        });

        body.appendChild(div);
      });
    }

    /* Botão de criar nova */
    const createBtn = document.createElement('button');
    createBtn.className = 'pl-create-btn';
    createBtn.textContent = '+ NOVA PLAYLIST';
    createBtn.addEventListener('click', () => _openEditor(null));
    body.appendChild(createBtn);
  }

  /* ── Toca uma playlist ── */
  function _playPlaylist(id) {
    const songs = getSongs(id);
    if (!songs.length) { _showToast('Playlist vazia!'); return; }
    Player.setPlaylist(songs, 0);
    closePanel();
    _showToast('Tocando playlist');
  }

  /* ── Editor de playlist ── */
  function _openEditor(id) {
    _editingId = id;
    const pl   = id ? getById(id) : null;

    let modal = document.getElementById('plEditorModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id        = 'plEditorModal';
      modal.className = 'pl-editor-modal';
      document.body.appendChild(modal);
    }

    const currentSongIds = pl ? [...pl.songIds] : [];

    modal.innerHTML = `
      <div class="pl-editor">
        <div class="pl-editor-header">
          <h3 class="pl-editor-title">${pl ? 'EDITAR' : 'NOVA'} PLAYLIST</h3>
          <button class="pl-editor-close" id="plEditorClose">✕</button>
        </div>
        <div class="pl-editor-name-wrap">
          <input class="pl-editor-name-input" id="plEditorName"
            placeholder="Nome da playlist"
            value="${pl ? _esc(pl.name) : ''}" maxlength="40" />
        </div>
        <p class="pl-editor-label">MÚSICAS NA PLAYLIST</p>
        <div class="pl-editor-selected" id="plEditorSelected"></div>
        <p class="pl-editor-label">TODAS AS MÚSICAS</p>
        <input class="pl-editor-search" id="plEditorSearch" placeholder="Buscar música..." />
        <div class="pl-editor-all" id="plEditorAll"></div>
        <div class="pl-editor-footer">
          <button class="pl-editor-save" id="plEditorSave">SALVAR</button>
        </div>
      </div>
    `;
    modal.classList.add('open');

    /* Estado local de songIds enquanto edita */
    let localIds = [...currentSongIds];

    function renderSelected() {
      const sel = document.getElementById('plEditorSelected');
      if (!sel) return;
      if (!localIds.length) {
        sel.innerHTML = '<p class="queue-empty">// Nenhuma música adicionada</p>';
        return;
      }
      sel.innerHTML = '';
      localIds.forEach((sid, i) => {
        const song = typeof SONGS !== 'undefined' ? SONGS.find(s => s.id === sid) : null;
        if (!song) return;
        const row = document.createElement('div');
        row.className = 'pl-sel-row';
        row.innerHTML = `
          <span class="pl-sel-num">${i + 1}</span>
          <span class="pl-sel-title">${_esc(song.title)}</span>
          <span class="pl-sel-dur">${song.duration}</span>
          <button class="pl-sel-remove" data-sid="${sid}" title="Remover">✕</button>
        `;
        row.querySelector('.pl-sel-remove').addEventListener('click', () => {
          localIds = localIds.filter(id => id !== sid);
          renderSelected();
          renderAll(document.getElementById('plEditorSearch')?.value || '');
        });
        sel.appendChild(row);
      });
    }

    function renderAll(query) {
      const allDiv = document.getElementById('plEditorAll');
      if (!allDiv || typeof SONGS === 'undefined') return;
      allDiv.innerHTML = '';
      const q = (query || '').toLowerCase();
      const filtered = SONGS.filter(s => !q || s.title.toLowerCase().includes(q));
      filtered.forEach(song => {
        const inList = localIds.includes(song.id);
        const row = document.createElement('div');
        row.className = 'pl-all-row' + (inList ? ' pl-all-row--added' : '');
        row.innerHTML = `
          <span class="pl-all-title">${_esc(song.title)}</span>
          <span class="pl-all-dur">${song.duration}</span>
          <button class="pl-all-toggle" data-sid="${song.id}" title="${inList ? 'Remover' : 'Adicionar'}">
            ${inList ? '✓' : '+'}
          </button>
        `;
        row.querySelector('.pl-all-toggle').addEventListener('click', () => {
          if (localIds.includes(song.id)) {
            localIds = localIds.filter(id => id !== song.id);
          } else {
            localIds.push(song.id);
          }
          renderSelected();
          renderAll(document.getElementById('plEditorSearch')?.value || '');
        });
        allDiv.appendChild(row);
      });
    }

    renderSelected();
    renderAll('');

    document.getElementById('plEditorSearch').addEventListener('input', e => {
      renderAll(e.target.value);
    });

    document.getElementById('plEditorClose').addEventListener('click', () => {
      modal.classList.remove('open');
    });

    document.getElementById('plEditorSave').addEventListener('click', () => {
      const name = document.getElementById('plEditorName').value.trim() || 'Playlist';
      if (id) {
        /* Atualiza existente */
        const plObj = _data.find(p => p.id === id);
        if (plObj) { plObj.name = name; plObj.songIds = localIds; }
      } else {
        /* Cria nova */
        _data.push({ id: Date.now(), name, songIds: localIds });
      }
      _save();
      _renderPanel();
      modal.classList.remove('open');
      _showToast(id ? 'Playlist atualizada' : 'Playlist criada!');
    });

    /* Fecha clicando fora */
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }

  /* ── Abre seletor de playlist (ao clicar em "Adicionar à playlist") ── */
  function openAddToPlaylistPicker(song) {
    let picker = document.getElementById('plPicker');
    if (!picker) {
      picker = document.createElement('div');
      picker.id        = 'plPicker';
      picker.className = 'pl-picker';
      document.body.appendChild(picker);
    }

    picker.innerHTML = '';

    const title = document.createElement('p');
    title.className   = 'pl-picker-title';
    title.textContent = 'ADICIONAR À PLAYLIST';
    picker.appendChild(title);

    if (_data.length === 0) {
      const empty = document.createElement('p');
      empty.className   = 'queue-empty';
      empty.textContent = '// Nenhuma playlist — crie uma primeiro';
      picker.appendChild(empty);
    } else {
      _data.forEach(pl => {
        const btn = document.createElement('button');
        btn.className   = 'pl-picker-item';
        btn.textContent = pl.name + ' (' + pl.songIds.length + ')';
        btn.addEventListener('click', () => {
          addSong(pl.id, song.id);
          picker.classList.remove('open');
        });
        picker.appendChild(btn);
      });
    }

    /* Botão de nova playlist */
    const newBtn = document.createElement('button');
    newBtn.className   = 'pl-picker-item pl-picker-new';
    newBtn.textContent = '+ Nova playlist';
    newBtn.addEventListener('click', () => {
      picker.classList.remove('open');
      _openEditor(null);
      /* Após criar, usuário pode editar e adicionar a música */
      _showToast('Crie a playlist e adicione a música nela');
    });
    picker.appendChild(newBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className   = 'pl-picker-close';
    closeBtn.textContent = 'Cancelar';
    closeBtn.addEventListener('click', () => picker.classList.remove('open'));
    picker.appendChild(closeBtn);

    picker.classList.add('open');

    /* Fecha ao clicar fora */
    setTimeout(() => {
      document.addEventListener('click', function closePicker(e) {
        if (!picker.contains(e.target)) {
          picker.classList.remove('open');
          document.removeEventListener('click', closePicker);
        }
      });
    }, 0);
  }

  /* ── Helper: escape HTML ── */
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Init ── */
  function init() {
    _load();

    /* Cria painel no DOM */
    if (!document.getElementById('playlistPanel')) {
      const panel = document.createElement('div');
      panel.id        = 'playlistPanel';
      panel.className = 'playlist-panel';
      panel.innerHTML = `
        <div class="queue-header">
          <span class="queue-title">PLAYLISTS</span>
          <button class="queue-close-btn" id="plPanelClose">✕</button>
        </div>
        <div class="pl-panel-body" id="playlistPanelBody"></div>
      `;
      document.body.appendChild(panel);
      document.getElementById('plPanelClose').addEventListener('click', closePanel);
    }

    /* Botão na barra do mini player */
    const plBtn = document.getElementById('playlistBtn');
    if (plBtn) plBtn.addEventListener('click', togglePanel);

    _renderPanel();
  }

  return {
    init,
    create,
    rename,
    remove,
    addSong,
    removeSong,
    getAll,
    getById,
    getSongs,
    togglePanel,
    closePanel,
    openAddToPlaylistPicker,
  };
})();
