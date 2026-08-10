/* ============================================================
   VocaStride — Paneller: Rozetler & Sözlük (panels.js)
   ============================================================ */
window.VS = window.VS || {};
VS.panels = (function () {
  const ICON_MAP = {
    seedling: 'sparkles', dumbbell: 'bolt', crosshair: 'target', target: 'target',
    crown: 'crown', cap: 'cap', flame: 'flame', bolt: 'bolt', sparkles: 'sparkles',
    calendar: 'calendar', shield: 'shield', star: 'star', 'check-circle': 'check-circle',
    heart: 'heart', layers: 'layers', puzzle: 'puzzle', swap: 'swap', repeat: 'repeat', trophy: 'trophy'
  };

  function iconFor(id) { return ICON_MAP[id] || 'star'; }

  function renderBadges() {
    const st = VS.state;
    const root = VS.ui.$('screenBadges');
    const earned = st.badges.size;
    const stats = VS.game.buildStats(st);
    root.innerHTML =
      '<div class="panel-head"><button class="icobtn" data-back aria-label="Geri">' + VS.icons.svg('arrow-left', 18) + '</button>' +
        '<h2>' + VS.icons.svg('trophy', 19) + ' Rozetler <span class="chip warning">' + earned + ' / ' + VS.game.BADGES.length + '</span></h2></div>' +
      '<div class="badge-grid">' + VS.game.BADGES.map(b => {
        const has = st.badges.has(b.id);
        const pct = Math.min(100, Math.round((b.prog ? b.prog(stats) : 0) * 100));
        return '<div class="badge-item ' + (has ? 'earned' : 'locked') + '">' +
          '<span class="b-ico">' + VS.icons.svg(iconFor(b.id), 26) + '</span>' +
          '<div class="b-name">' + VS.ui.esc(b.ad) + '</div>' +
          '<div class="b-desc">' + VS.ui.esc(b.desc) + '</div>' +
          '<span class="b-pct">%' + pct + '</span>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="card card-pad" style="font-size:.74rem;color:var(--text-3);text-align:center;">' + VS.icons.svg('info', 13) + ' Rozetler cihazında saklanır.</div>';
    root.querySelector('[data-back]').onclick = () => { VS.ui.show('screenMenu'); };
  }

  // ---- Sözlük ----
  let dictQ = '', dictType = '';

  function renderDict() {
    const root = VS.ui.$('screenDict');
    const types = VS.words.stats().types;
    const idx = VS.words.search(dictQ, dictType || null);
    const st = VS.state;

    const chips = '<button class="' + (dictType === '' ? 'sel' : '') + '" data-t="">Tümü</button>' +
      Object.keys(types).filter(t => t !== '').sort().map(t =>
        '<button class="' + (dictType === t ? 'sel' : '') + '" data-t="' + VS.ui.esc(t) + '">' + VS.ui.esc(t) + ' (' + types[t] + ')</button>'
      ).join('');

    const items = idx.slice(0, 80).map(i => {
      const w = VS.words.list[i];
      const p = VS.srs.progressFor(st.srs, w[0]);
      const stars = [1, 2, 3, 4, 5].map(n => '<i class="' + (p.box >= n ? 'on' : '') + '"></i>').join('');
      return '<div class="word-item"><div class="w-main"><div class="w-word" data-wordinfo data-word="' + VS.ui.esc(w[0]) + '">' + VS.ui.esc(w[0]) +
          ' <span class="chip" style="margin-left:4px;">' + VS.ui.esc(VS.words.typeOf(w[0])) + '</span></div>' +
          '<div class="w-tr">' + VS.ui.esc(w[2]) + ' · ' + VS.ui.esc(w[1]) + '</div></div>' +
          '<div class="w-master" title="Ustalık kutusu: ' + p.box + '">' + stars + '</div></div>';
    }).join('') || '<div class="empty">Eşleşen kelime yok.</div>';

    root.innerHTML =
      '<div class="panel-head"><button class="icobtn" data-back aria-label="Geri">' + VS.icons.svg('arrow-left', 18) + '</button>' +
        '<h2>' + VS.icons.svg('book-open', 19) + ' Sözlük</h2>' +
        '<span class="chip">' + VS.words.list.length + ' kelime</span></div>' +
      '<div class="card card-pad"><div class="dict-search">' +
        '<input class="field" id="dictQ" placeholder="Kelime veya anlam ara…" value="' + VS.ui.esc(dictQ) + '" aria-label="Ara">' +
        '<button class="icobtn" data-clear aria-label="Temizle">' + VS.icons.svg('x', 16) + '</button></div>' +
        '<div class="filter-chips" style="margin-top:12px;">' + chips + '</div></div>' +
      '<div class="card card-pad" style="display:flex;flex-direction:column;gap:8px;">' + items + '</div>' +
      (idx.length > 80 ? '<div class="empty">İlk 80 sonuç gösteriliyor — aramayı daraltın.</div>' : '');

    root.querySelector('[data-back]').onclick = () => { VS.ui.show('screenMenu'); };
    const q = VS.ui.$('dictQ');
    q.addEventListener('input', () => { dictQ = q.value; renderDict(); });
    root.querySelector('[data-clear]').onclick = () => { dictQ = ''; renderDict(); };
    root.querySelectorAll('.filter-chips button').forEach(b => {
      b.onclick = () => { dictType = b.dataset.t; renderDict(); };
    });
    VS.wordinfo.scan(root);
  }

  return { renderBadges, renderDict };
})();
