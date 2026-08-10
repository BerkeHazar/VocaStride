/* ============================================================
   VocaStride — Oturum Yöneticisi (session.js)
   Ortak sayaçlar · XP · günlük · SRS · özet · kısayollar
   ============================================================ */
window.VS = window.VS || {};
VS.session = (function () {
  let S = null; // oturum durumu
  let timer = null;

  const MIN_SUMMARY = 1;

  function buildQueue(cfg) {
    const st = VS.state;
    const words = VS.words.list;
    if (cfg.mode === 'match') return null; // eşleştirme kendi setini kurar
    let idx;
    if (cfg.source === 'review') {
      idx = VS.srs.dueList(st.srs).map(([k]) => words.findIndex(w => w[0] === k)).filter(i => i >= 0);
    } else if (cfg.source === 'new') {
      idx = VS.srs.newList(st.srs, words);
    } else if (cfg.source === 'weak') {
      const e = Object.entries(st.perf).filter(([, p]) => (p.dogru + p.yanlis) >= 3);
      e.sort((a, b) => (a[1].yanlis / (a[1].dogru + a[1].yanlis)) - (b[1].yanlis / (b[1].dogru + b[1].yanlis)));
      idx = e.map(([k]) => words.findIndex(w => w[0] === k)).filter(i => i >= 0);
    } else {
      idx = words.map((_, i) => i);
    }
    // Fisher-Yates karıştırma
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    // Son oturumlarda görünen kelimeleri kuyruğun SONUNA al:
    // aynı kelimenin art arda (ya da ilk bakışta) tekrar etmesini engeller
    const lastSeen = st.lastSeen || [];
    if (lastSeen.length && cfg.source === 'all') {
      const front = idx.filter(i => !lastSeen.includes(words[i][0]));
      const back = idx.filter(i => lastSeen.includes(words[i][0]));
      idx = front.concat(back);
    }
    if (cfg.goal && cfg.goal > 0) idx = idx.slice(0, cfg.goal);
    return idx;
  }

  function start(cfg) {
    const st = VS.state;
    S = {
      cfg, queue: buildQueue(cfg), pos: 0,
      correct: 0, wrong: 0, combo: 0, best: 0,
      sec: 0, xpEarned: 0, answered: 0, first: true
    };
    // günlük sıfırlama / streak
    VS.game.dailyTick(st);
    st.modeCounts = st.modeCounts || {};
    if (S.first) { VS.game.streakTouch(st); S.first = false; }

    VS.ui.show('screenSession');
    renderHeader();
    startTimer();
    attachKeys();
    swapIn(); // ilk soru da fade ile gelsin
    next();
  }

  function state() { return S; }

  function currentWord() {
    if (!S || S.queue == null) return null;
    const i = S.queue[S.pos];
    return i == null ? null : VS.words.list[i];
  }

  function prev() {
    if (!S || S.pos <= 0) return;
    S.pos--;
    renderHeader();
    VS.modes[S.cfg.mode].render();
  }

  function next() {
    if (!S) return;
    if (S.cfg.mode === 'match') { VS.modes.match.init(); return; }
    S.pos++; // ← sıradaki kelimeye geç (kritik: bu olmadan hep aynı kelime)
    if (S.pos >= S.queue.length) { finish(); return; }
    // Soru geçişinde yumuşak fade (içerik değişince animasyon yeniden tetiklensin)
    const root = VS.ui.$('modeRoot');
    root.classList.remove('q-swap');
    void root.offsetWidth; // reflow → animasyonu sıfırdan oynat
    root.classList.add('q-swap');
    renderHeader();
    VS.modes[S.cfg.mode].render();
  }

  // Oturumun ilk sorusu da fade ile gelsin (start → ilk render)
  function swapIn() {
    const root = VS.ui.$('modeRoot');
    root.classList.remove('q-swap');
    void root.offsetWidth;
    root.classList.add('q-swap');
  }

  function renderHeader() {
    const els = {
      ok: VS.ui.$('chipOk'), no: VS.ui.$('chipNo'), combo: VS.ui.$('chipCombo'),
      time: VS.ui.$('chipTime'), bar: VS.ui.$('sessBar'),
      mode: VS.ui.$('sessMode')
    };
    els.ok.textContent = S.correct;
    els.no.textContent = S.wrong;
    // Kombo: yalnızca sayıyı güncelle — 🔥 emojisi HTML'de kalır (textContent ataması emojiyi silerdi)
    const comboNum = els.combo.querySelector('b');
    if (comboNum) comboNum.textContent = S.combo;
    els.combo.classList.toggle('show', S.combo >= 1);
    els.time.textContent = VS.ui.fmtTime(S.sec);
    const total = S.cfg.goal && S.cfg.goal > 0 ? S.cfg.goal : (S.queue ? S.queue.length : 5);
    els.bar.style.width = Math.min((S.answered / total) * 100, 100) + '%';
    const names = { quiz: 'Çoktan Seçmeli', card: 'Hafıza Kartları', match: 'Eşleştirme', learn: 'Öğrenme', review: 'Tekrar' };
    els.mode.textContent = names[S.cfg.mode] || S.cfg.mode;
  }

  // Doğru/yanlış akışı (modlardan çağrılır; wordOverride eşleştirme/öğrenme gibi
  // kuyruk dışı modlar için kelimeyi belirtir)
  function answer(correct, wordOverride) {
    if (!S) return;
    const st = VS.state;
    const w = wordOverride || currentWord();
    S.answered++;
    if (correct) {
      S.correct++; S.combo++;
      if (S.combo > S.best) S.best = S.combo;
      if (S.combo > st.bestCombo) st.bestCombo = S.combo;
      let xp = 10; if (S.combo >= 5) xp += 5; if (S.combo >= 10) xp += 10;
      addXp(xp);
      VS.sounds.correct(); VS.ui.haptic(14);
      const epic = S.combo > 0 && S.combo % 10 === 0;
      VS.ui.fxFloat('check', comboMsg(true, S.combo, epic), 'var(--success)', epic);
      if (epic) VS.ui.haptic([20, 40, 30]);
    } else {
      S.wrong++; S.combo = 0;
      addXp(2);
      VS.sounds.wrong(); VS.ui.haptic(30);
      VS.ui.fxFloat('x', comboMsg(false), 'var(--danger)', false);
    }
    st.modeCounts[S.cfg.mode] = (st.modeCounts[S.cfg.mode] || 0) + 1;
    if (S.cfg.source === 'review') st.modeCounts.review = (st.modeCounts.review || 0) + 1;

    // Son görülen kelimeleri izle (rastgelelik için)
    if (w) {
      const ls = st.lastSeen || (st.lastSeen = []);
      ls.unshift(w[0]);
      if (ls.length > 15) ls.length = 15;
    }

    // performans
    if (w) {
      const k = w[0];
      if (!st.perf[k]) st.perf[k] = { dogru: 0, yanlis: 0, seviye: 0, sonGorulen: Date.now() };
      const p = st.perf[k];
      p.sonGorulen = Date.now();
      if (correct) { p.dogru++; p.seviye = Math.min(p.seviye + 1, 5); }
      else { p.yanlis++; p.seviye = Math.max(p.seviye - 2, 0); }
      // SRS
      st.srs[k] = VS.srs.review(st.srs[k], correct);
    }

    // günlük + streak + rozet
    VS.game.dailyAdd(st, 1);
    VS.game.streakTouch(st);
    const won = VS.game.checkBadges(st);
    won.forEach(b => { setTimeout(() => { VS.sounds.badge(); VS.ui.fxBadge(b); }, 700); });

    VS.persist();
    renderHeader();
  }

  function addXp(n) {
    const st = VS.state;
    S.xpEarned += n;
    const lvls = VS.game.addXp(st, n);
    lvls.forEach(l => {
      setTimeout(() => { VS.sounds.levelup(); VS.ui.fxLevel(l); }, 500);
    });
  }

  // Eşleştirme: hatasız tur bonusu (+25 XP — düzeltildi)
  function perfectMatchBonus() {
    const st = VS.state;
    st.perfectMatches = (st.perfectMatches || 0) + 1;
    addXp(25);
    st.perfectSessions = (st.perfectSessions || 0) + 1;
    VS.persist();
    return 25;
  }

  function finish(manual) {
    if (!S) return;
    stopTimer();
    detachKeys();
    const st = VS.state;
    const cfg = S.cfg; // kısa oturumda yeniden başlatmak için sakla
    const t = S.correct + S.wrong;
    const rec = {
      t: Date.now(), mode: S.cfg.mode, correct: S.correct, wrong: S.wrong,
      sec: S.sec, xp: S.xpEarned, best: S.best
    };
    st.sessions.unshift(rec);
    if (st.sessions.length > 60) st.sessions.pop();
    st.totalTime = (st.totalTime || 0) + S.sec;
    if (S.correct > 0 && S.wrong === 0) st.perfectSessions = (st.perfectSessions || 0) + 1;
    VS.game.checkBadges(st);
    VS.persist();
    VS.ui.$('screenSession').classList.remove('active');

    if (t >= MIN_SUMMARY) { showSummary(rec); }
    else { shortSheet(rec, cfg); }
    S = null;
  }

  // Çok kısa oturumlar için: süreyi gösterip devam etmeyi öneren panel
  function shortSheet(rec, cfg) {
    const s = VS.ui.openSheet(
      '<div class="sheet-head"><span class="sheet-title">' + VS.icons.svg('info', 18) + ' Kısa oturum</span>' +
        '<button class="icobtn" data-close aria-label="Kapat">' + VS.icons.svg('x', 16) + '</button></div>' +
      '<p style="font-size:.86rem;color:var(--text-2);line-height:1.65;">Sadece <b style="color:var(--text-1)">' + VS.ui.fmtTime(rec.sec) + '</b> çalıştın. Biraz daha dener misin?</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px;">' +
        '<button class="btn" id="ssBack">' + VS.icons.svg('arrow-left', 16) + ' Ana Menü</button>' +
        '<button class="btn btn-primary" id="ssAgain">' + VS.icons.svg('refresh', 16) + ' Yeniden Başla</button>' +
      '</div>'
    );
    const close = () => { s.close(); VS.ui.show('screenMenu'); VS.menu.render(); };
    s.el.querySelector('[data-close]').onclick = close;
    s.el.querySelector('#ssBack').onclick = close;
    s.el.querySelector('#ssAgain').onclick = () => { s.close(); VS.session.start(cfg); };
  }

  function showSummary(rec) {
    const st = VS.state;
    const t = rec.correct + rec.wrong;
    const acc = Math.round((rec.correct / t) * 100);
    VS.ui.$('sumAcc').textContent = acc + '%';
    VS.ui.$('sumAcc').style.color = acc >= 70 ? 'var(--success)' : acc >= 40 ? 'var(--warning)' : 'var(--danger)';
    VS.ui.$('sumOk').textContent = rec.correct;
    VS.ui.$('sumNo').textContent = rec.wrong;
    VS.ui.$('sumCombo').textContent = rec.best;
    VS.ui.$('sumTime').textContent = VS.ui.fmtTime(rec.sec);
    VS.ui.$('sumXp').textContent = '+' + rec.xp + ' XP';
    VS.ui.$('sumModeName').textContent = ({ quiz: 'Çoktan Seçmeli', card: 'Hafıza Kartları', match: 'Eşleştirme', learn: 'Öğrenme', review: 'Tekrar' })[rec.mode] || rec.mode;
    if (acc === 100 && t >= 3) { setTimeout(() => VS.ui.confetti(), 250); }
    VS.ui.show('screenSummary');
  }

  // ---- Zamanlayıcı ----
  function startTimer() {
    stopTimer();
    timer = setInterval(() => { if (S) { S.sec++; VS.ui.$('chipTime').textContent = VS.ui.fmtTime(S.sec); } }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  // ---- Klavye ----
  function onKey(e) {
    if (!S) return;
    const m = S.cfg.mode;
    if (m === 'quiz') {
      if (!S.locked) {
        if (e.key >= '1' && e.key <= '4') { VS.modes.quiz.pick(parseInt(e.key) - 1); }
      } else if (e.key === 'Enter') { S.locked = false; next(); }
    } else if (m === 'card') {
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); VS.modes.card.flip(); }
      else if (e.key === 'ArrowLeft') VS.modes.card.judge(false);
      else if (e.key === 'ArrowRight') VS.modes.card.judge(true);
    } else if (m === 'match') {
      if (e.key === 'r' || e.key === 'R') VS.modes.match.reset();
    }
  }
  function attachKeys() { document.addEventListener('keydown', onKey); }
  function detachKeys() { document.removeEventListener('keydown', onKey); }

  const comboMsgs = [
    { t: 'Harika!', i: 'check-circle' }, { t: 'Ateşlendin!', i: 'flame' }, { t: 'Süper!', i: 'sparkles' },
    { t: 'Doğru!', i: 'target' }, { t: 'Çok iyi!', i: 'star' }, { t: 'Devam!', i: 'bolt' }
  ];
  const wrongMsgs = [
    { t: 'Yakındın…', i: 'x-circle' }, { t: 'Tekrar dene!', i: 'refresh' }, { t: 'Ufak kaza!', i: 'bolt' },
    { t: 'Gözden kaçtı!', i: 'search' }, { t: 'Hata = Öğrenme!', i: 'info' }
  ];
  let lastOK = [], lastNO = [];
  function pick(arr, list) {
    let pool = arr.filter(m => !list.includes(m.t));
    if (!pool.length) pool = arr;
    const s = pool[Math.floor(Math.random() * pool.length)];
    list.push(s.t); if (list.length > 3) list.shift();
    return s;
  }
  function comboMsg(ok, combo, epic) {
    if (epic) {
      const sabit = { 10: 'YOK ARTIK!', 20: 'SERİ!', 30: 'KRAL!', 40: 'UZAY!' };
      return sabit[combo] || (combo + ' KOMBO!');
    }
    return ok ? pick(comboMsgs, lastOK).t : pick(wrongMsgs, lastNO).t;
  }

  return { start, answer, next, prev, finish, currentWord, state, perfectMatchBonus, onKey, stopTimer };
})();
