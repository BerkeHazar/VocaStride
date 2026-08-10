/* ============================================================
   VocaStride — Oyunlaştırma (gamification.js)
   XP · seviye · streak · günlük hedef · rozetler
   ============================================================ */
window.VS = window.VS || {};
VS.game = (function () {
  const DAY = 864e5;

  function todayStr(d) {
    const x = d || new Date();
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function dayDiff(a, b) {
    return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / DAY);
  }

  function needFor(level) { return 50 + level * 50; }

  function addXp(state, n) {
    state.xp += n;
    const gained = [];
    let g = needFor(state.level);
    while (state.xp >= g) {
      state.xp -= g;
      state.level += 1;
      gained.push(state.level);
      g = needFor(state.level);
    }
    return gained; // yeni seviyeler (boşsa seviye atlanmadı)
  }

  // Günlük sayaç: tarih değiştiyse sıfırla
  function dailyTick(state) {
    const t = todayStr();
    if (state.dailyDate !== t) {
      state.dailyDate = t;
      state.dailyCount = 0;
    }
  }
  function dailyAdd(state, n) {
    dailyTick(state);
    state.dailyCount += n;
    return state.dailyCount >= state.goal;
  }

  function streakTouch(state) {
    const t = todayStr();
    if (!state.lastStudy) { state.streak = 1; }
    else {
      const d = dayDiff(state.lastStudy, t);
      if (d === 1) state.streak += 1;
      else if (d > 1) state.streak = 1;
    }
    state.lastStudy = t;
    // son 30 gün kaydı
    const arr = state.streakDays || [];
    if (arr[arr.length - 1] !== t) {
      arr.push(t);
      if (arr.length > 30) arr.shift();
      state.streakDays = arr;
    }
  }

  const BADGES = [
    { id: 'ilk_adim', ad: 'İlk Adım', desc: 'İlk doğru cevap', icon: 'seedling', c: s => s.totalCorrect >= 1, prog: s => s.totalCorrect / 1 },
    { id: 'isinma', ad: 'Isınma Turu', desc: '10 doğru', icon: 'dumbbell', c: s => s.totalCorrect >= 10, prog: s => s.totalCorrect / 10 },
    { id: 'kelime_avcisi', ad: 'Kelime Avcısı', desc: '50 doğru', icon: 'crosshair', c: s => s.totalCorrect >= 50, prog: s => s.totalCorrect / 50 },
    { id: 'yuzuncu', ad: 'Yüzüncü Vuruş', desc: '100 doğru', icon: 'target', c: s => s.totalCorrect >= 100, prog: s => s.totalCorrect / 100 },
    { id: 'sozluk_lord', ad: 'Sözlük Lordu', desc: '500 doğru', icon: 'crown', c: s => s.totalCorrect >= 500, prog: s => s.totalCorrect / 500 },
    { id: 'bin_bilge', ad: 'Bin Bilge', desc: '1000 doğru', icon: 'cap', c: s => s.totalCorrect >= 1000, prog: s => s.totalCorrect / 1000 },
    { id: 'seri_5', ad: 'Seri Başladı', desc: '5 kombo', icon: 'flame', c: s => s.bestCombo >= 5, prog: s => s.bestCombo / 5 },
    { id: 'ates_10', ad: 'Ateş Topu', desc: '10 kombo', icon: 'flame', c: s => s.bestCombo >= 10, prog: s => s.bestCombo / 10 },
    { id: 'durdurulamaz_25', ad: 'Durdurulamaz', desc: '25 kombo', icon: 'bolt', c: s => s.bestCombo >= 25, prog: s => s.bestCombo / 25 },
    { id: 'efsane_50', ad: 'Efsane', desc: '50 kombo', icon: 'sparkles', c: s => s.bestCombo >= 50, prog: s => s.bestCombo / 50 },
    { id: 'tutarli_3', ad: 'Tutarlı', desc: '3 gün streak', icon: 'calendar', c: s => s.streak >= 3, prog: s => s.streak / 3 },
    { id: 'haftalik_7', ad: 'Haftalık', desc: '7 gün streak', icon: 'calendar', c: s => s.streak >= 7, prog: s => s.streak / 7 },
    { id: 'kararli_30', ad: 'Kararlı', desc: '30 gün streak', icon: 'shield', c: s => s.streak >= 30, prog: s => s.streak / 30 },
    { id: 'cirak_5', ad: 'Çırak', desc: 'Seviye 5', icon: 'cap', c: s => s.level >= 5, prog: s => s.level / 5 },
    { id: 'usta_10', ad: 'Usta', desc: 'Seviye 10', icon: 'star', c: s => s.level >= 10, prog: s => s.level / 10 },
    { id: 'gunluk_tamam', ad: 'Günlük Tamam', desc: 'Hedefi tamamla', icon: 'check-circle', c: s => s.dailyDone >= s.goal, prog: s => s.dailyDone / s.goal },
    { id: 'mukemmel_gun', ad: 'Mükemmel Gün', desc: 'Tek oturumda %100', icon: 'heart', c: s => s.perfectSessions >= 1, prog: s => s.perfectSessions / 1 },
    { id: 'quiz_ustasi', ad: 'Quiz Ustası', desc: 'Testte 30 doğru', icon: 'target', c: s => (s.mc.quiz || 0) >= 30, prog: s => (s.mc.quiz || 0) / 30 },
    { id: 'kart_ustasi', ad: 'Kart Ustası', desc: 'Kartta 30 doğru', icon: 'layers', c: s => (s.mc.card || 0) >= 30, prog: s => (s.mc.card || 0) / 30 },
    { id: 'eslestirici', ad: 'Eşleştirici', desc: '10 hatasız tur', icon: 'puzzle', c: s => s.perfectMatches >= 10, prog: s => s.perfectMatches / 10 },
    { id: 'ters_ustasi', ad: 'Ters Usta', desc: 'Ters modda 20 doğru', icon: 'swap', c: s => (s.mc.ters || 0) >= 20, prog: s => (s.mc.ters || 0) / 20 },
    { id: 'tekrarci', ad: 'Tekrarcı', desc: '50 tekrar cevabı', icon: 'repeat', c: s => (s.mc.review || 0) >= 50, prog: s => (s.mc.review || 0) / 50 },
    { id: 'ustalik_10', ad: 'Ustalık', desc: '10 kelime 5. kutuda', icon: 'trophy', c: s => s.mastered >= 10, prog: s => s.mastered / 10 }
  ];

  // Rozet koşulları için ortak istatistik nesnesi
  function buildStats(state) {
    const pd = Object.values(state.perf).reduce((a, p) => a + p.dogru, 0);
    return {
      totalCorrect: pd,
      bestCombo: state.bestCombo,
      streak: state.streak,
      level: state.level,
      dailyDone: state.dailyCount,
      goal: state.goal,
      mastered: VS.srs.mastered(state.srs),
      mc: state.modeCounts || {},
      perfectMatches: state.perfectMatches || 0,
      perfectSessions: state.perfectSessions || 0
    };
  }

  // Bir cevap sonrası rozet kontrolü -> yeni kazanılan id listesi
  function checkBadges(state) {
    const st = buildStats(state);
    const won = [];
    BADGES.forEach(b => {
      if (!state.badges.has(b.id) && b.c(st)) {
        state.badges.add(b.id);
        won.push(b);
      }
    });
    return won;
  }

  function progress(state) {
    const g = needFor(state.level);
    return { level: state.level, xp: state.xp, need: g, pct: Math.min(state.xp / g * 100, 100) };
  }

  return { todayStr, dayDiff, needFor, addXp, dailyTick, dailyAdd, streakTouch, BADGES, checkBadges, buildStats, progress };
})();
