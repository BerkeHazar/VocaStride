/* ============================================================
   VocaStride — Kelime Yardımcıları (words-helpers.js)
   Kelime haznesi içeriğine DOKUNMAZ; yalnızca okuma/analiz.
   ============================================================ */
window.VS = window.VS || {};
VS.words = (function () {
  let list = (window.VOCA_WORDS || []).slice();

  // Kullanıcı kendi listesini kaydettiğinde güncellenir (hazne birebir korunur,
  // kullanıcı isterse kendi kelimelerini ekleyebilir)
  function setList(newList) {
    if (Array.isArray(newList) && newList.length >= 4) list = newList;
  }
  function resetList() { list = (window.VOCA_WORDS || []).slice(); }

  // "abandon (v)" -> "abandon", "v"
  function clean(raw) { return (raw || '').replace(/\s*\([^)]*\)\s*$/g, '').trim(); }
  function typeOf(raw) {
    const m = /\(([^)]*)\)\s*$/.exec(raw || '');
    return m ? m[1].trim().toLowerCase() : '';
  }

  function normalize(s) { return (s || '').toLocaleLowerCase('tr').trim(); }

  function search(q, typeFilter) {
    const qq = normalize(q);
    return list.map((w, i) => ({ w, i })).filter(({ w }) => {
      if (typeFilter === '?') { if (typeOf(w[0]) !== '') return false; }
      else if (typeFilter && typeOf(w[0]) !== typeFilter) return false;
      if (!qq) return true;
      return normalize(w[0]).includes(qq) ||
             normalize(w[2]).includes(qq) ||
             normalize(w[1]).includes(qq);
    }).map(({ w, i }) => i);
  }

  function stats() {
    const types = {};
    list.forEach(w => {
      const t = typeOf(w[0]) || '?';
      types[t] = (types[t] || 0) + 1;
    });
    return { total: list.length, types };
  }

  return {
    get list() { return list; },
    setList, resetList,
    clean, typeOf, normalize, search, stats
  };
})();
