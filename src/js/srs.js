/* ============================================================
   VocaStride — Aralıklı Tekrar Motoru (srs.js)
   Leitner kutuları (1-5) + vade hesabı + "Bugünkü Tekrarlar"
   ============================================================ */
window.VS = window.VS || {};
VS.srs = (function () {
  // Kutu -> gün cinsinden aralık
  const INTERVALS = [0, 1, 2, 4, 8, 16]; // indeks = kutu
  const DAY = 864e5;

  function dueAt(box, from) {
    const base = from || Date.now();
    const days = INTERVALS[box] || 1;
    return base + days * DAY;
  }
  function isDue(rec, now) { return !rec || !rec.due || rec.due <= (now || Date.now()); }
  function boxOf(rec) { return rec ? Math.min(Math.max(rec.box || 0, 0), 5) : 0; }

  // Doğru: kutu +1 (maks 5). Yanlış: kutu 1'e dön ve vadeyi sıfırla (tekrar hemen).
  function review(rec, correct) {
    const cur = boxOf(rec);
    const next = correct ? Math.min(cur + 1, 5) : Math.max(cur - 2, 1);
    const now = Date.now();
    return {
      box: next,
      due: correct ? dueAt(next, now) : now,
      seen: (rec && rec.seen || 0) + 1,
      last: now
    };
  }

  // Yeni kelime ilk kez öğrenildi: 1. kutu, vade 1 gün sonra
  function learned() {
    const now = Date.now();
    return { box: 1, due: now + DAY, seen: 1, last: now };
  }

  // Bugün vadesi gelenler
  function dueList(srs) {
    const now = Date.now();
    return Object.entries(srs)
      .filter(([, rec]) => isDue(rec, now))
      .sort((a, b) => (a[1].due || 0) - (b[1].due || 0));
  }

  // Yeni (henüz SRS'ye girmemiş) kelimeler
  function newList(srs, words) {
    return words.map((w, i) => i).filter(i => !srs[words[i][0]]);
  }

  function mastered(srs) { return Object.values(srs).filter(r => r.box >= 5).length; }

  function progressFor(srs, wordKey) {
    const rec = srs[wordKey];
    return { box: boxOf(rec), due: rec ? rec.due : null, seen: rec ? rec.seen : 0 };
  }

  return { dueAt, isDue, boxOf, review, learned, dueList, newList, mastered, progressFor, INTERVALS };
})();
