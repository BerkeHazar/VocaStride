/* ============================================================
   VocaStride — Ayarlar (settings.js)
   Tema · vurgu rengi · hedef · ses/titreşim · TTS · veri
   ============================================================ */
window.VS = window.VS || {};
VS.settings = (function () {
  const ACCENTS = [
    { id: 'indigo', label: 'İndigo', c1: '#818cf8', c2: '#4f46e5' },
    { id: 'okyanus', label: 'Okyanus', c1: '#38bdf8', c2: '#0891b2' },
    { id: 'zümrüt', label: 'Zümrüt', c1: '#34d399', c2: '#059669' },
    { id: 'günbatımı', label: 'Gün Batımı', c1: '#fb923c', c2: '#ea580c' },
    { id: 'kiraz', label: 'Kiraz', c1: '#fb7185', c2: '#e11d48' }
  ];
  const GOALS = [10, 20, 30, 50];

  function setTheme(t) { VS.state.theme = t; VS.persist(); apply(); }
  function setAccent(a) { VS.state.accent = a; VS.persist(); apply(); }

  function apply() {
    const st = VS.state;
    const root = document.documentElement;
    if (st.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', st.theme === 'light' ? 'light' : 'dark');
    root.setAttribute('data-accent', st.accent === 'mor' ? 'indigo' : (st.accent || 'indigo'));
    root.setAttribute('data-calm', st.calm ? '1' : '0');
  }

  function toggleBool(key) { VS.state[key] = !VS.state[key]; VS.persist(); apply(); }

  function exportData() {
    const payload = VS.storage.backupPayload(VS.state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vocastride-yedek.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    VS.ui.toast('Yedek indirildi', 'ok');
  }

  function importData(file, cb) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || d.app !== 'vocastride' || !Array.isArray(d.words)) throw new Error('bad');
        const st = VS.state;
        st.words = d.words;
        st.perf = d.perf || {};
        st.xp = d.xp || 0; st.level = d.level || 1;
        st.streak = d.streak || 0; st.streakDays = d.streakDays || [];
        st.badges = new Set(d.badges || []);
        st.bestCombo = d.bestCombo || 0;
        st.goal = d.goal || 20;
        st.srs = d.srs || {};
        st.sessions = d.sessions || [];
        st.activity = d.activity || {};
        st.theme = d.theme || 'auto'; st.accent = d.accent === 'mor' ? 'indigo' : (d.accent || 'indigo');
        VS.persist(); apply();
        VS.menu.render();
        VS.ui.toast('Veriler geri yüklendi', 'ok');
        cb && cb();
      } catch (e) { VS.ui.toast('Geçersiz yedek dosyası', 'err'); }
    };
    r.readAsText(file);
  }

  function resetAll() {
    const s = VS.ui.openSheet(
      '<div class="sheet-head"><span class="sheet-title">' + VS.icons.svg('trash', 18) + ' Tüm veriler silinsin mi?</span></div>' +
      '<p style="font-size:.84rem;color:var(--text-2);margin-bottom:16px;">Kelime listesi varsayılana döner; XP, seviye, rozet, streak, istatistik ve tekrar geçmişi kalıcı olarak silinir. Bu işlem geri alınamaz.</p>' +
      '<div style="display:flex;gap:10px;"><button class="btn btn-danger" id="rsOk" style="flex:1;">Evet, sil</button><button class="btn" id="rsNo" style="flex:1;">Vazgeç</button></div>'
    );
    s.el.querySelector('#rsNo').onclick = s.close;
    s.el.querySelector('#rsOk').onclick = () => {
      s.close();
      Object.keys(localStorage).forEach(k => { if (k.startsWith('vs:')) localStorage.removeItem(k); });
      location.reload();
    };
  }

  function render() {
    const st = VS.state;
    const root = VS.ui.$('screenSettings');
    root.innerHTML =
      '<div class="panel-head"><button class="icobtn" data-back aria-label="Geri">' + VS.icons.svg('arrow-left', 18) + '</button>' +
        '<h2>' + VS.icons.svg('gear', 19) + ' Ayarlar</h2></div>' +

      '<div class="card card-pad"><div class="sec-title">' + VS.icons.svg('sparkles', 12) + ' Görünüm</div>' +
        '<div class="set-row"><div><div class="set-lbl">Tema</div><div class="set-desc">Otomatik = sistem tercihi</div></div>' +
        '<div class="seg" style="width:200px;">' +
          '<button data-th="auto" class="' + (st.theme === 'auto' ? 'sel' : '') + '">' + VS.icons.svg('half', 13) + ' Oto</button>' +
          '<button data-th="dark" class="' + (st.theme === 'dark' ? 'sel' : '') + '">' + VS.icons.svg('moon', 13) + ' Koyu</button>' +
          '<button data-th="light" class="' + (st.theme === 'light' ? 'sel' : '') + '">' + VS.icons.svg('sun', 13) + ' Açık</button>' +
        '</div></div>' +
        '<div class="set-row"><div><div class="set-lbl">Vurgu Rengi</div><div class="set-desc">İndigo · Okyanus · Zümrüt · Gün Batımı · Kiraz</div></div>' +
        '<div class="accent-dots">' + ACCENTS.map(a =>
          '<button data-ac="' + a.id + '" class="' + (st.accent === a.id ? 'sel' : '') + '" style="background:linear-gradient(135deg,' + a.c1 + ',' + a.c2 + ')" aria-label="' + a.label + '" title="' + a.label + '"></button>'
        ).join('') + '</div></div>' +
        '<div class="set-row"><div><div class="set-lbl">Sakin mod</div><div class="set-desc">Animasyonları kapat (odak)</div></div>' +
        '<label class="switch"><input type="checkbox" data-bool="calm" ' + (st.calm ? 'checked' : '') + '><span class="track"></span></label></div>' +
      '</div>' +

      '<div class="card card-pad"><div class="sec-title">' + VS.icons.svg('target', 12) + ' Günlük Hedef</div>' +
        '<div class="seg" style="margin:4px 0 6px;">' + GOALS.map(g =>
          '<button data-goal="' + g + '" class="' + (st.goal === g ? 'sel' : '') + '">' + g + '</button>'
        ).join('') + '</div>' +
        '<div class="dict-search"><input class="field" id="goalCustom" type="number" min="5" max="200" placeholder="Özel hedef…" value="' + (GOALS.includes(st.goal) ? '' : st.goal) + '">' +
        '<button class="btn btn-sm" id="goalApply">Uygula</button></div>' +
      '</div>' +

      '<div class="card card-pad"><div class="sec-title">' + VS.icons.svg('zap', 12) + ' Efektler & Titreşim</div>' +
        '<div class="set-row"><div><div class="set-lbl">Doğru/yanlış efektleri</div><div class="set-desc">Cevap anındaki sesli geri bildirim</div></div>' +
        '<label class="switch"><input type="checkbox" data-bool="sound" ' + (st.sound !== false ? 'checked' : '') + '><span class="track"></span></label></div>' +
        '<div class="set-row"><div><div class="set-lbl">Titreşim</div><div class="set-desc">Mobil cihazlarda dokunsal geri bildirim</div></div>' +
        '<label class="switch"><input type="checkbox" data-bool="haptics" ' + (st.haptics !== false ? 'checked' : '') + '><span class="track"></span></label></div>' +
        '<div class="set-row"><div><div class="set-lbl">Kelime bilgisi</div><div class="set-desc">Kelime üzerinde 5 sn bekleyince anlam + okunuş</div></div>' +
        '<span class="chip accent" title="Kelime üzerinde 5 sn bekleyince anlam + okunuş görünür">' + VS.icons.svg('eye', 15) + '</span></div>' +
      '</div>' +

      '<div class="card card-pad"><div class="sec-title">' + VS.icons.svg('book-open', 12) + ' Kelime Listesi</div>' +
        '<div style="font-size:.72rem;color:var(--text-3);margin-bottom:8px;line-height:1.5;">Format: <b style="color:var(--text-2)">"kelime (tür)", "synonym", "karşılık"</b> — en az 4 satır.</div>' +
        '<textarea class="field" id="wordsEditor" spellcheck="false" style="height:150px;font-family:ui-monospace,monospace;font-size:.72rem;line-height:1.5;resize:vertical;user-select:text;-webkit-user-select:text;"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:10px;">' +
          '<button class="btn btn-sm" id="wordsReset">' + VS.icons.svg('refresh', 14) + ' Varsayılana Dön</button>' +
          '<button class="btn btn-sm btn-primary" id="wordsSave" style="flex:1;">' + VS.icons.svg('save', 14) + ' Listeyi Kaydet</button>' +
        '</div>' +
      '</div>' +

      '<div class="card card-pad"><div class="sec-title">' + VS.icons.svg('save', 12) + ' Veri</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<button class="btn btn-sm" id="setExport">' + VS.icons.svg('download', 15) + ' Yedekle</button>' +
          '<button class="btn btn-sm" id="setImport">' + VS.icons.svg('upload', 15) + ' Geri Yükle</button>' +
        '</div>' +
        '<input type="file" id="setImportFile" accept="application/json,.json" style="display:none">' +
        '<div class="set-row" style="margin-top:6px;"><div><div class="set-lbl">Sıfırla</div><div class="set-desc">Tüm ilerleme ve listeyi siler</div></div>' +
        '<button class="btn btn-sm btn-danger" id="setReset">Sıfırla</button></div>' +
      '</div>' +

      '<div class="card card-pad" style="text-align:center;font-size:.74rem;color:var(--text-3);">' +
        VS.icons.svg('shield', 13) + ' Tüm veriler bu cihazda kalır · Çevrimdışı çalışır</div>';

    root.querySelector('[data-back]').onclick = () => { VS.ui.show('screenMenu'); };
    root.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { setTheme(b.dataset.th); render(); });
    root.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => { setAccent(b.dataset.ac); render(); });
    root.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => { st.goal = parseInt(b.dataset.goal); VS.persist(); render(); VS.menu.render(); });
    VS.ui.$('goalApply').onclick = () => {
      const v = parseInt(VS.ui.$('goalCustom').value);
      if (v >= 5 && v <= 200) { st.goal = v; VS.persist(); render(); VS.menu.render(); VS.ui.toast('Hedef: ' + v + ' cevap', 'ok'); }
      else VS.ui.toast('5-200 arası bir değer gir', 'err');
    };
    root.querySelectorAll('[data-bool]').forEach(b => b.onchange = () => toggleBool(b.dataset.bool));
    VS.ui.$('setExport').onclick = exportData;
    VS.ui.$('setImport').onclick = () => VS.ui.$('setImportFile').click();
    VS.ui.$('setImportFile').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
    VS.ui.$('setReset').onclick = resetAll;

    // ---- Kelime listesi editörü ----
    const ed = VS.ui.$('wordsEditor');
    ed.value = VS.words.list.map(w => '"' + w[0] + '", "' + w[1] + '", "' + w[2] + '"').join('\n');
    VS.ui.$('wordsSave').onclick = () => {
      const parsed = [];
      ed.value.split('\n').forEach(line => {
        const m = line.match(/"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"/);
        if (m) parsed.push([m[1].trim(), m[2].trim(), m[3].trim()]);
      });
      if (parsed.length < 4) { VS.ui.toast('En az 4 geçerli satır gerekli', 'err'); return; }
      VS.words.setList(parsed);
      st.words = parsed;
      st.srs = st.srs || {};
      VS.persist();
      VS.ui.toast('Liste güncellendi: ' + parsed.length + ' kelime', 'ok');
    };
    VS.ui.$('wordsReset').onclick = () => {
      VS.words.resetList();
      st.words = VS.words.list.slice();
      VS.persist();
      ed.value = VS.words.list.map(w => '"' + w[0] + '", "' + w[1] + '", "' + w[2] + '"').join('\n');
      VS.ui.toast('Varsayılan listeye dönüldü', 'ok');
    };
  }

  return { render, apply, ACCENTS, GOALS };
})();
