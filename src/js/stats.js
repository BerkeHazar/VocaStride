/* ============================================================
   VocaStride — İstatistik (stats.js)
   Özet kartlar · 7/30 gün grafiği · oturum geçmişi · ısı haritası
   · odak (zayıf) kelimeler → tek tıkla çalışma
   ============================================================ */
window.VS = window.VS || {};
VS.stats = (function () {
  const MODE_NAMES = { quiz: 'Çoktan Seçmeli', card: 'Hafıza Kartları', match: 'Eşleştirme', learn: 'Öğrenme', review: 'Tekrar' };

  function chartSVG(days) {
    const st = VS.state;
    const act = st.activity || {};
    const now = new Date();
    const data = [];
    let max = 1;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = VS.game.todayStr(d);
      const v = act[key] ? act[key].ans : 0;
      max = Math.max(max, v);
      data.push({ key, v, d });
    }
    const W = 420, H = 110, pad = 4;
    const bw = (W - pad * 2) / days;
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    let bars = '';
    data.forEach((p, i) => {
      const h = Math.max(2, (p.v / max) * (H - 26));
      const x = pad + i * bw;
      const y = H - 8 - h;
      const color = p.v > 0 ? 'var(--accent)' : 'var(--surface-3)';
      const label = i % Math.ceil(days / 8) === 0 || i === days - 1 ? dayNames[p.d.getDay()] : '';
      bars += '<rect x="' + (x + bw * 0.18).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.64).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + color + '" opacity="' + (p.v > 0 ? 0.9 : 0.5) + '">' +
        '<title>' + VS.ui.esc(p.d.toLocaleDateString('tr-TR')) + ': ' + p.v + ' cevap</title></rect>';
      if (label) bars += '<text x="' + (x + bw / 2) + '" y="' + (H - 2) + '" font-size="8.5" fill="var(--text-3)" text-anchor="middle" font-weight="700">' + label + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Son ' + days + ' gün aktivitesi">' + bars + '</svg>';
  }

  function heatmap() {
    const st = VS.state;
    const cells = VS.words.list.map(w => {
      const p = VS.srs.progressFor(st.srs, w[0]);
      return p.box;
    });
    let out = '';
    cells.forEach(b => {
      let c = 'var(--surface-3)';
      if (b >= 1) c = 'var(--accent)';
      if (b >= 3) c = 'var(--success)';
      if (b >= 5) c = 'var(--success)';
      out += '<span class="cell" style="background:' + (b >= 1 ? c : 'var(--surface-3)') + ';opacity:' + (b >= 1 ? 0.35 + b * 0.12 : 1) + '" title="Kutu ' + b + '"></span>';
    });
    return out;
  }

  function render() {
    const st = VS.state;
    const root = VS.ui.$('screenStats');
    const pd = Object.values(st.perf);
    const td = pd.reduce((a, p) => a + p.dogru, 0);
    const ty = pd.reduce((a, p) => a + p.yanlis, 0);
    const tt = td + ty;
    const acc = tt > 0 ? Math.round((td / tt) * 100) : 0;
    const minutes = Math.floor((st.totalTime || 0) / 60);
    const mastered = VS.srs.mastered(st.srs);
    const due = VS.srs.dueList(st.srs).length;
    const newN = VS.srs.newList(st.srs, VS.words.list).length;

    // Odak kelimeleri
    const weak = Object.entries(st.perf)
      .filter(([, p]) => (p.dogru + p.yanlis) >= 3)
      .map(([k, p]) => {
        const risk = (p.yanlis + 1) / (p.dogru + p.yanlis + 4);
        return { k, risk, n: p.dogru + p.yanlis };
      })
      .sort((a, b) => (b.risk * Math.log1p(b.n)) - (a.risk * Math.log1p(a.n)))
      .slice(0, 8);

    // Oturum geçmişi
    const sessions = (st.sessions || []).slice(0, 10).map(s => {
      const d = new Date(s.t);
      const date = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      const t = s.correct + s.wrong;
      const acc2 = t ? Math.round((s.correct / t) * 100) : 0;
      const color = acc2 >= 70 ? 'var(--success)' : acc2 >= 40 ? 'var(--warning)' : 'var(--danger)';
      return '<div class="session-item"><span class="si-date">' + date + '</span><span class="si-mode">' + (MODE_NAMES[s.mode] || s.mode) + '</span><span class="si-acc" style="color:' + color + '">%' + acc2 + '</span><span class="si-xp">+' + s.xp + ' XP</span></div>';
    }).join('') || '<div class="empty">Henüz oturum yok.</div>';

    root.innerHTML =
      '<div class="panel-head"><button class="icobtn" data-back aria-label="Geri">' + VS.icons.svg('arrow-left', 18) + '</button>' +
        '<h2>' + VS.icons.svg('chart', 19) + ' İstatistikler</h2></div>' +
      '<div class="stats-top">' +
        '<div class="st-card"><div class="st-num">' + tt + '</div><div class="st-lbl">Toplam Cevap</div><div class="st-sub">' + td + ' doğru · ' + ty + ' yanlış</div></div>' +
        '<div class="st-card"><div class="st-num" style="color:var(--success)">%' + acc + '</div><div class="st-lbl">Doğruluk</div><div class="st-sub">kariyer ortalaması</div></div>' +
        '<div class="st-card"><div class="st-num" style="color:var(--warning)">' + st.bestCombo + '</div><div class="st-lbl">En İyi Kombo</div><div class="st-sub">peş peşe doğru</div></div>' +
        '<div class="st-card"><div class="st-num">' + minutes + 'dk</div><div class="st-lbl">Toplam Süre</div><div class="st-sub">' + mastered + ' kelime usta</div></div>' +
      '</div>' +
      '<div class="card card-pad chart-card"><div class="cc-title">' + VS.icons.svg('calendar', 15) + ' SON 7 GÜN</div>' + chartSVG(7) + '</div>' +
      '<div class="card card-pad chart-card"><div class="cc-title">' + VS.icons.svg('calendar', 15) + ' SON 30 GÜN</div>' + chartSVG(30) + '</div>' +
      '<div class="card card-pad"><div class="cc-title">' + VS.icons.svg('layers', 15) + ' KELİME USTALIK HARİTASI <span class="chip accent" style="margin-left:auto">' + mastered + ' / ' + VS.words.list.length + '</span></div>' +
        '<div class="heatmap" style="max-height:150px;overflow-y:auto;">' + heatmap() + '</div>' +
        '<div style="display:flex;gap:14px;margin-top:10px;font-size:.66rem;color:var(--text-3);font-weight:700;">' +
          '<span style="display:inline-flex;align-items:center;gap:5px;"><span class="cell" style="background:var(--surface-3);width:9px;height:9px;border-radius:2px"></span>Yeni</span>' +
          '<span style="display:inline-flex;align-items:center;gap:5px;"><span class="cell" style="background:var(--accent);width:9px;height:9px;border-radius:2px"></span>Öğreniliyor</span>' +
          '<span style="display:inline-flex;align-items:center;gap:5px;"><span class="cell" style="background:var(--success);width:9px;height:9px;border-radius:2px"></span>Usta (5. kutu)</span>' +
        '</div></div>' +
      '<div class="card card-pad"><div class="cc-title">' + VS.icons.svg('flame', 15) + ' ODAK KELİMELERİ <span class="chip danger" style="margin-left:auto">zor 8</span></div>' +
        (weak.length ? '<div style="display:flex;flex-direction:column;gap:8px;">' + weak.map(w2 =>
          '<div class="row" style="padding:10px 12px;"><div class="row-main"><div class="row-title" style="font-size:.86rem">' + VS.ui.esc(w2.k) + '</div><div class="row-desc">%' + Math.round(w2.risk * 100) + ' odak riski · ' + w2.n + ' cevap</div></div></div>'
        ).join('') + '</div>' +
        '<button class="btn btn-primary btn-block" id="weakGo" style="margin-top:12px;">' + VS.icons.svg('bolt', 17) + ' Zayıf Kelimelerle Çalış</button>'
        : '<div class="empty">Henüz yeterli veri yok.</div>') +
      '</div>' +
      '<div class="card card-pad"><div class="cc-title">' + VS.icons.svg('clock', 15) + ' SON OTURUMLAR</div><div style="display:flex;flex-direction:column;gap:8px;">' + sessions + '</div></div>' +
      '<div class="card card-pad" style="text-align:center;font-size:.76rem;color:var(--text-3);">' +
        VS.icons.svg('info', 14) + ' Bugün tekrar: <b>' + due + '</b> · yeni kelime: <b>' + newN + '</b></div>';

    root.querySelector('[data-back]').onclick = () => { VS.ui.show('screenMenu'); };
    const weakBtn = VS.ui.$('weakGo');
    if (weakBtn) weakBtn.onclick = () => {
      VS.ui.show('screenMenu');
      VS.session.start({ mode: 'quiz', direction: 'mix', source: 'weak', goal: 10 });
    };
  }

  return { render, chartSVG };
})();
