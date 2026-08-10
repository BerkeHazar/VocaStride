/* ============================================================
   VocaStride — Depolama Katmanı (storage.js)
   Şema sürümleme · migration · yedek/geri yükleme · kota yönetimi
   ============================================================ */
window.VS = window.VS || {};
VS.storage = (function () {
  const P = 'vs:';
  const SCHEMA = 2;

  function get(k, fb) {
    try {
      const v = localStorage.getItem(P + k);
      return v === null ? fb : JSON.parse(v);
    } catch (e) { return fb; }
  }
  function set(k, v) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); return true; }
    catch (e) {
      // Kota doldu: eski yedekleri temizle ve tekrar dene
      try {
        localStorage.removeItem(P + 'activityOld');
        localStorage.setItem(P + k, JSON.stringify(v));
        return true;
      } catch (e2) { return false; }
    }
  }
  function del(k) { try { localStorage.removeItem(P + k); } catch (e) {} }
  function has(k) { try { return localStorage.getItem(P + k) !== null; } catch (e) { return false; } }

  // ---- Eski (v1) şemadan taşıma ----
  const LEGACY = {
    kelimeListesi: 'words', kelimePerformans: 'perf', toplamXP: 'xp', seviye: 'level',
    streak: 'streak', streakGunleri: 'streakDays', kazanilanRozetler: 'badges',
    enIyiKombo: 'bestCombo', gunlukTarih: 'dailyDate', gunlukTamamlanan: 'dailyCount',
    sonCalismaGunu: 'lastStudy', tema: 'theme'
  };

  function migrate() {
    if (has('words') || !has('migrated')) {
      set('schema', SCHEMA);
      return false;
    }
    let moved = false;
    Object.keys(LEGACY).forEach(oldKey => {
      const raw = localStorage.getItem(oldKey);
      if (raw === null) return;
      const newKey = LEGACY[oldKey];
      if (!has(newKey)) {
        try { localStorage.setItem(P + newKey, raw); } catch (e) {}
      }
      moved = true;
    });
    if (moved) {
      // Eski anahtarların yedeği kalıcı olarak saklanır, silinmez (güvenli)
      set('migrated', true);
    }
    set('schema', SCHEMA);
    return moved;
  }

  // ---- Yedekleme ----
  function backupPayload(state) {
    return {
      app: 'vocastride', schema: SCHEMA, exportedAt: new Date().toISOString(),
      words: state.words, perf: state.perf, xp: state.xp, level: state.level,
      streak: state.streak, streakDays: state.streakDays, badges: [...state.badges],
      bestCombo: state.bestCombo, goal: state.goal, srs: state.srs,
      sessions: state.sessions, activity: state.activity,
      theme: state.theme, accent: state.accent
    };
  }

  return { get, set, del, has, migrate, backupPayload, SCHEMA, P };
})();
