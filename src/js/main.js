/* ============================================================
   VocaStride — Ana Uygulama (main.js)
   Durum yönetimi · menü · onboarding · PWA · başlatma
   ============================================================ */
window.VS = window.VS || {};
VS.main = (function () {
  function defaults() {
    return {
      words: window.VOCA_WORDS.slice(), perf: {},
      xp: 0, level: 1, streak: 0, streakDays: [],
      badges: [], bestCombo: 0, goal: 20,
      srs: {}, sessions: [], activity: {},
      theme: 'auto', accent: 'indigo',
      sound: true, haptics: true, calm: false,
      lastStudy: null, dailyDate: null, dailyCount: 0,
      totalTime: 0, matchHistory: [], modeCounts: {},
      lastSeen: [],
      perfectMatches: 0, perfectSessions: 0
    };
  }

  function load() {
    const S = defaults();
    const st = VS.storage;
    const words = st.get('words');
    S.words = (words && Array.isArray(words) && words.length >= 4) ? words : S.words;
    S.perf = st.get('perf', {});
    S.xp = st.get('xp', 0); S.level = st.get('level', 1);
    S.streak = st.get('streak', 0); S.streakDays = st.get('streakDays', []);
    const b = st.get('badges', []); S.badges = new Set(Array.isArray(b) ? b : []);
    S.bestCombo = st.get('bestCombo', 0);
    S.goal = st.get('goal', 20);
    S.srs = st.get('srs', {});
    S.sessions = st.get('sessions', []);
    S.activity = st.get('activity', {});
    S.theme = st.get('theme', 'auto'); S.accent = st.get('accent', 'indigo') === 'mor' ? 'indigo' : st.get('accent', 'indigo');
    S.sound = st.get('sound', true); S.haptics = st.get('haptics', true);
    S.calm = st.get('calm', false);
    S.lastStudy = st.get('lastStudy', null);
    S.dailyDate = st.get('dailyDate', null); S.dailyCount = st.get('dailyCount', 0);
    S.totalTime = st.get('totalTime', 0);
    S.matchHistory = st.get('matchHistory', []);
    S.modeCounts = st.get('modeCounts', {});
    S.lastSeen = st.get('lastSeen', []);
    S.perfectMatches = st.get('perfectMatches', 0);
    S.perfectSessions = st.get('perfectSessions', 0);
    return S;
  }

  function persist() {
    const st = VS.storage, S = VS.state;
    st.set('words', S.words); st.set('perf', S.perf);
    st.set('xp', S.xp); st.set('level', S.level);
    st.set('streak', S.streak); st.set('streakDays', S.streakDays);
    st.set('badges', [...S.badges]); st.set('bestCombo', S.bestCombo);
    st.set('goal', S.goal); st.set('srs', S.srs);
    st.set('sessions', S.sessions); st.set('activity', S.activity);
    st.set('theme', S.theme); st.set('accent', S.accent);
    st.set('sound', S.sound); st.set('haptics', S.haptics); st.set('calm', S.calm);
    st.set('lastStudy', S.lastStudy);
    st.set('dailyDate', S.dailyDate); st.set('dailyCount', S.dailyCount);
    st.set('totalTime', S.totalTime); st.set('matchHistory', S.matchHistory);
    st.set('modeCounts', S.modeCounts); st.set('lastSeen', S.lastSeen);
    st.set('perfectMatches', S.perfectMatches);
    st.set('perfectSessions', S.perfectSessions);
  }

  // ---- Menü ----
  function renderMenu() {
    const st = VS.state;
    VS.game.dailyTick(st);

    const due = VS.srs.dueList(st.srs);
    const dueN = due.length;
    const dueTile = VS.ui.$('dueTile');
    if (dueTile) dueTile.style.display = dueN > 0 ? 'flex' : 'none';
    if (dueN > 0) {
      VS.ui.$('dueNum').textContent = dueN;
      const ring = VS.ui.$('dueRing');
      const total = dueN;
      const r = 18, c = 2 * Math.PI * r;
      ring.innerHTML = '<svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="4"/><circle cx="23" cy="23" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - 1)) + '"/></svg>';
    }

    const p = VS.game.progress(st);
    VS.ui.$('lvl').textContent = p.level;
    VS.ui.$('xpCur').textContent = p.xp;
    VS.ui.$('xpNeed').textContent = p.need;
    VS.ui.$('xpBar').style.width = p.pct + '%';
    VS.ui.$('streakNum').textContent = st.streak;
    VS.ui.$('dailyText').textContent = st.dailyCount + '/' + st.goal;
    VS.ui.$('dailyBar').style.width = Math.min(st.dailyCount / st.goal * 100, 100) + '%';
    VS.ui.$('dailyBox').classList.toggle('done', st.dailyCount >= st.goal);
    streakDots(st);

    // Günlük sayaç tarihi değiştiyse UI güncellensin
    if (st.dailyDate !== VS.game.todayStr()) { persist(); }
  }

  function streakDots(st) {
    const c = VS.ui.$('streakDots');
    c.innerHTML = '';
    const today = VS.game.todayStr();
    const arr = st.streakDays || [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = VS.game.todayStr(d);
      const dot = document.createElement('span');
      dot.className = 'streak-dot';
      if (arr.includes(key)) dot.classList.add(key === today ? 'today' : 'on');
      c.appendChild(dot);
    }
  }

  // ---- Oturum kurulum sayfası ----
  function openSetup(mode) {
    let body = '<div class="sheet-head"><span class="sheet-title">' + mode.title + '</span><button class="icobtn" data-close aria-label="Kapat">' + VS.icons.svg('x', 16) + '</button></div>';
    const cfg = { mode: mode.id, source: 'all', direction: 'mix', goal: 0 };

    if (mode.id === 'quiz') {
      body += '<div class="opt-group"><div class="opt-label">Soru yönü</div><div class="seg">' +
        [['mix', 'Karışık'], ['tr', 'TR karşılık'], ['syn', 'Synonym'], ['ters', 'TR → EN']].map(([v, l]) =>
          '<button data-dir="' + v + '" class="' + (v === 'mix' ? 'sel' : '') + '">' + l + '</button>').join('') + '</div></div>';
    } else if (mode.id === 'review') {
      body += '<div class="opt-group"><div class="opt-label">Kaynak</div><div class="seg">' +
        '<button data-src="review" class="sel">Vadesi gelenler</button>' +
        '<button data-src="weak">Zayıf kelimeler</button>' +
        '<button data-src="new">Yeni kelimeler</button></div></div>';
    } else if (mode.id === 'learn') {
      body += '<p style="font-size:.84rem;color:var(--text-2);margin-bottom:14px;">Kelimeleri önce incele, sonra "Öğrendim" de.</p>';
    } else if (mode.id === 'card') {
      body += '<div class="opt-group"><div class="opt-label">Kaynak</div><div class="seg">' +
        '<button data-src="all" class="sel">Tümü (karışık)</button>' +
        '<button data-src="weak">Zayıf kelimeler</button>' +
        '<button data-src="review">Vadesi gelenler</button></div></div>';
    } else if (mode.id === 'match') {
      body += '<p style="font-size:.84rem;color:var(--text-2);margin-bottom:14px;">5 kelimeyi 5 anlamla eşleştir. Hatasız tur = +25 XP bonus.</p>';
    }

    body += '<div class="opt-group"><div class="opt-label">Oturum uzunluğu</div><div class="seg">' +
      [['0', 'Serbest'], ['5', '5'], ['10', '10'], ['20', '20']].map(([v, l]) =>
        '<button data-goal="' + v + '" class="' + (v === '0' ? 'sel' : '') + '">' + l + '</button>').join('') + '</div></div>';
    body += '<button class="btn btn-primary btn-block" id="setupGo">' + VS.icons.svg('play', 17) + ' Başla</button>';

    const s = VS.ui.openSheet(body);
    s.el.querySelector('[data-close]').onclick = s.close;
    s.el.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { cfg.direction = b.dataset.dir; mark(b); });
    s.el.querySelectorAll('[data-src]').forEach(b => b.onclick = () => { cfg.source = b.dataset.src; mark(b); });
    s.el.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => { cfg.goal = parseInt(b.dataset.goal); mark(b); });
    function mark(btn) {
      btn.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
    }
    s.el.querySelector('#setupGo').onclick = () => {
      s.close();
      if (mode.id === 'learn') {
        const newN = VS.srs.newList(VS.state.srs, VS.words.list).length;
        if (newN > 0) cfg.source = 'new';
        VS.ui.toast(newN > 0 ? newN + ' yeni kelime bulundu' : 'Yeni kelime yok — tümüyle göz at', 'ok');
      }
      VS.session.start(cfg);
    };
  }

  // ---- Onboarding ----
  function onboarding() {
    const root = VS.ui.$('screenOnb');
    root.innerHTML =
      '<div class="onb"><div class="onb-logo">' + VS.icons.mark(72) + '</div>' +
      '<h2>VocaStride\'a hoş geldin</h2>' +
      '<p>Günlük hedefini seç — sonra değiştirebilirsin.</p>' +
      '<div class="goal-pick">' + [10, 20, 30, 50].map(g =>
        '<button data-g="' + g + '"><span class="g-num">' + g + '</span><span class="g-lbl">' + (g === 20 ? 'önerilen' : 'cevap') + '</span></button>'
      ).join('') + '</div>' +
      '<p style="font-size:.8rem;color:var(--text-3);">Vurgu rengini seç:</p>' +
      '<div class="accent-dots" style="justify-content:center;margin:10px 0 18px;">' +
        VS.settings.ACCENTS.map(a => '<button data-ac="' + a.id + '" style="background:linear-gradient(135deg,' + a.c1 + ',' + a.c2 + ')" aria-label="' + a.label + '"></button>').join('') + '</div>' +
      '<button class="btn btn-primary btn-block" id="onbGo">' + VS.icons.svg('bolt', 17) + ' Başla</button></div>';
    let goal = 20, acc = 'indigo';
    root.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { goal = parseInt(b.dataset.g); root.querySelectorAll('[data-g]').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); });
    // Renk seçiminde CANLI önizleme: tema anında uygulanır (geçici, kaydedilmez)
    root.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => {
      acc = b.dataset.ac;
      VS.state.accent = acc;
      VS.settings.apply();
      VS.ui.haptic(8);
      root.querySelectorAll('[data-ac]').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
    root.querySelectorAll('[data-g]')[1].classList.add('sel');
    root.querySelector('[data-ac]').classList.add('sel');
    VS.ui.$('onbGo').onclick = () => {
      VS.state.goal = goal; VS.state.accent = acc;
      persist(); VS.settings.apply();
      VS.storage.set('onboarded', true);
      VS.ui.show('screenMenu'); renderMenu();
      VS.ui.toast('Hazırsın! Bugün hedef: ' + goal + ' cevap', 'ok');
    };
  }

  // ---- PWA ----
  let deferredPrompt = null;
  function pwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      if (!VS.storage.get('pwaDismissed')) {
        setTimeout(() => VS.ui.$('installBanner').classList.add('show'), 2500);
      }
    });
    window.addEventListener('appinstalled', () => {
      VS.ui.$('installBanner').classList.remove('show');
      deferredPrompt = null;
    });
  }

  function wire() {
    // Statik HTML'deki ikon yer tutucularını doldur
    VS.ui.$$('[data-icon]').forEach(el => {
      el.innerHTML = VS.icons.svg(el.dataset.icon, parseInt(el.dataset.size || '18', 10));
    });
    VS.ui.$('ibLogo').innerHTML = VS.icons.mark(40);
    VS.ui.$('menuLogo').innerHTML = VS.icons.mark(56);

    // Oturumu bitir
    VS.ui.$('btnFinish').onclick = () => VS.session.finish(true);
    // Özet butonları
    VS.ui.$('sumHome').onclick = () => { VS.ui.show('screenMenu'); renderMenu(); };
    VS.ui.$('sumAgain').onclick = () => { VS.ui.show('screenMenu'); renderMenu(); };

    // Mod kutucukları
    const tiles = {
      tQuiz: { id: 'quiz', title: 'Çoktan Seçmeli' },
      tCard: { id: 'card', title: 'Hafıza Kartları' },
      tMatch: { id: 'match', title: 'Kelime Eşleştirme' },
      tLearn: { id: 'learn', title: 'Öğrenme / Göz At' }
    };
    Object.keys(tiles).forEach(id => {
      VS.ui.$(id).onclick = () => openSetup(tiles[id]);
    });
    VS.ui.$('dueTile').onclick = () => {
      const dueN = VS.srs.dueList(VS.state.srs).length;
      if (dueN === 0) { VS.ui.toast('Bugün için tekrar yok — tebrikler!', 'ok'); return; }
      VS.session.start({ mode: 'quiz', direction: 'mix', source: 'review', goal: dueN });
    };

    // Alt aksiyonlar
    VS.ui.$('aStats').onclick = () => openPanel('screenStats');
    VS.ui.$('aBadges').onclick = () => openPanel('screenBadges');
    VS.ui.$('aDict').onclick = () => openPanel('screenDict');
    VS.ui.$('aSettings').onclick = () => openPanel('screenSettings');

    // Mobil alt navigasyon
    const nav = VS.ui.$('bottomNav');
    if (nav) {
      VS.ui.$$('#bottomNav button').forEach(b => {
        const label = b.textContent.trim();
        b.innerHTML = '<span class="bn-ico">' + VS.icons.svg(b.dataset.ico, 20) + '</span><span>' + VS.ui.esc(label) + '</span>';
        b.onclick = () => openPanel(b.dataset.panel);
      });
    }

    // PWA banner
    const ib = VS.ui.$('installBanner');
    VS.ui.$('ibInstall').onclick = () => {
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
      ib.classList.remove('show');
    };
    VS.ui.$('ibClose').onclick = () => {
      ib.classList.remove('show');
      VS.storage.set('pwaDismissed', Date.now());
    };

    // Çevrimdışı notu
    const off = VS.ui.$('offlineNote');
    const upd = () => off.classList.toggle('show', !navigator.onLine);
    window.addEventListener('online', upd); window.addEventListener('offline', upd); upd();

    // Sayfa kapanırken veriyi güvenceye al
    window.addEventListener('pagehide', () => { VS.session.stopTimer(); persist(); });
  }

  function openPanel(id) {
    if (id === 'screenStats') VS.stats.render();
    else if (id === 'screenBadges') VS.panels.renderBadges();
    else if (id === 'screenDict') VS.panels.renderDict();
    else if (id === 'screenSettings') VS.settings.render();
    VS.ui.show(id);
  }

  function boot() {
    VS.storage.migrate();
    VS.state = load();
    VS.settings.apply();
    pwa();
    wire();

    if (!VS.storage.get('onboarded')) {
      onboarding();
      VS.ui.show('screenOnb');
    } else {
      VS.ui.show('screenMenu');
      renderMenu();
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('load', () => {
    if (VS.state) { renderMenu(); }
  });

  // Diğer modüllerin erişimi için dışa aç
  VS.persist = persist;
  VS.menu = { render: renderMenu };

  return { renderMenu, persist, boot };
})();
