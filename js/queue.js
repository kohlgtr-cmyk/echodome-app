/* =========================================================
   ECHODOME — js/queue.js
   #19 — Fila customizável de reprodução.
   Integra com Player via Player.setQueue() / Player.playFromQueue().
   ========================================================= */

const Queue = (() => {

  let _items     = [];  /* Array de song objects na fila */
  let _queueIdx  = -1;  /* Posição atual na fila (-1 = fila não ativa) */
  let _panelOpen = false;

  /* ── DOM ── */
  function _panel()  { return document.getElementById('queuePanel'); }
  function _list()   { return document.getElementById('queueList'); }
  function _badge()  { return document.getElementById('queueBadge'); }
  function _btnOpen(){ return document.getElementById('queueBtn'); }

  /* ── API pública ── */
  function add(song) {
    /* Evita duplicatas consecutivas */
    if (_items.length && _items[_items.length - 1].id === song.id) return;
    _items.push(song);
    _render();
    _flashBadge();
    _showToast(`+ ${song.title} adicionado à fila`);
  }

  function remove(idx) {
    _items.splice(idx, 1);
    if (_queueIdx >= idx && _queueIdx > 0) _queueIdx--;
    _render();
  }

  function clear() {
    _items   = [];
    _queueIdx = -1;
    _render();
  }

  function hasNext() { return _queueIdx + 1 < _items.length; }

  /* Retorna a próxima música da fila (e avança o ponteiro) */
  function shiftNext() {
    if (!hasNext()) return null;
    _queueIdx++;
    _render();
    return _items[_queueIdx];
  }

  function isEmpty() { return _items.length === 0; }
  function size()    { return _items.length; }

  /* ── Render ── */
  function _render() {
    const list  = _list();
    const badge = _badge();
    if (!list) return;

    list.innerHTML = '';

    if (_items.length === 0) {
      list.innerHTML = '<p class="queue-empty">// FILA VAZIA — clique em + em qualquer faixa</p>';
      if (badge) badge.textContent = '';
      return;
    }

    _items.forEach((song, i) => {
      const li = document.createElement('div');
      li.className = 'queue-item' + (i === _queueIdx ? ' queue-item--current' : '');
      li.draggable  = true;
      li.dataset.idx = i;

      li.innerHTML = `
        <span class="queue-item-num">${i + 1}</span>
        <span class="queue-item-title">${song.title}</span>
        <span class="queue-item-dur">${song.duration}</span>
        <button class="queue-item-remove" aria-label="Remover da fila" data-idx="${i}">✕</button>
      `;

      /* Clique para tocar esse item */
      li.addEventListener('click', e => {
        if (e.target.closest('.queue-item-remove')) return;
        _queueIdx = i;
        _render();
        Player.playQueueItem(_items[i]);
      });

      li.querySelector('.queue-item-remove').addEventListener('click', e => {
        e.stopPropagation();
        remove(i);
      });

      /* Drag-to-reorder */
      li.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', i);
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('drag-over'); });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', e => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        const to   = i;
        if (from === to) return;
        const moved = _items.splice(from, 1)[0];
        _items.splice(to, 0, moved);
        /* Ajusta queueIdx após reordenação */
        if (_queueIdx === from) _queueIdx = to;
        else if (from < _queueIdx && to >= _queueIdx) _queueIdx--;
        else if (from > _queueIdx && to <= _queueIdx) _queueIdx++;
        _render();
      });

      list.appendChild(li);
    });

    /* Badge com número de itens */
    if (badge) badge.textContent = _items.length > 0 ? _items.length : '';
  }

  function _flashBadge() {
    const badge = _badge();
    if (!badge) return;
    badge.classList.remove('badge-pop');
    void badge.offsetWidth;
    badge.classList.add('badge-pop');
    badge.addEventListener('animationend', () => badge.classList.remove('badge-pop'), { once: true });
  }

  function _showToast(msg) {
    let toast = document.getElementById('queueToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id        = 'queueToast';
      toast.className = 'push-toast'; /* reutiliza o estilo */
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 2000);
  }

  /* ── Painel ── */
  function togglePanel() {
    _panelOpen = !_panelOpen;
    const panel = _panel();
    if (panel) panel.classList.toggle('open', _panelOpen);
    const btn = _btnOpen();
    if (btn) btn.classList.toggle('active', _panelOpen);
  }

  function closePanel() {
    _panelOpen = false;
    const panel = _panel();
    if (panel) panel.classList.remove('open');
    const btn = _btnOpen();
    if (btn) btn.classList.remove('active');
  }

  /* ── Adiciona botão "+" nas track-items ── */
  function _addQueueBtns() {
    document.querySelectorAll('.track-item').forEach(item => {
      if (item.querySelector('.track-queue-btn')) return;
      const idx    = parseInt(item.dataset.idx);
      const song   = SONGS[idx];
      const btn    = document.createElement('button');
      btn.className  = 'track-queue-btn';
      btn.title      = 'Adicionar à fila';
      btn.setAttribute('aria-label', 'Adicionar à fila');
      btn.textContent = '+';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        add(song);
      });
      /* Insere antes do botão de download */
      const dlBtn = item.querySelector('.track-dl-btn');
      if (dlBtn) item.insertBefore(btn, dlBtn);
      else item.appendChild(btn);
    });
  }

  /* ── Init ── */
  function init() {
    /* Monta painel de fila no DOM */
    if (!document.getElementById('queuePanel')) {
      const panel = document.createElement('div');
      panel.id        = 'queuePanel';
      panel.className = 'queue-panel';
      panel.innerHTML = `
        <div class="queue-header">
          <span class="queue-title">QUEUE</span>
          <button class="queue-clear-btn" id="queueClearBtn">LIMPAR</button>
          <button class="queue-close-btn" id="queueCloseBtn">✕</button>
        </div>
        <div class="queue-list" id="queueList"></div>
      `;
      document.body.appendChild(panel);
      document.getElementById('queueClearBtn').addEventListener('click', clear);
      document.getElementById('queueCloseBtn').addEventListener('click', closePanel);
    }

    /* Botão na barra do mini player */
    const qBtn = document.getElementById('queueBtn');
    if (qBtn) qBtn.addEventListener('click', togglePanel);

    _render();

    /* Adiciona botões "+" depois que a tracklist estiver no DOM */
    /* Usa MutationObserver para detectar quando track-items aparecem */
    const observer = new MutationObserver(() => {
      if (document.querySelectorAll('.track-item').length > 0) {
        _addQueueBtns();
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById('tracklist') || document.body, { childList: true, subtree: true });
    /* Tenta de imediato também */
    _addQueueBtns();
  }

  return { init, add, remove, clear, hasNext, shiftNext, isEmpty, size, togglePanel, closePanel };
})();
