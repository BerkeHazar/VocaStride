/* ============================================================
   VocaStride — Kelime Bilgisi (wordinfo.js)
   Ses/TTS YOK. Kelimenin üzerine 5 saniye hover edilince:
   İngilizce anlamı + IPA okunuşu (örn. ˈjɪn ən ˈjæŋ) gösterir.
   Kaynak: api.dictionaryapi.dev (yalnızca METİN — ses alınmaz).
   Sonuçlar localStorage'da önbelleklenir (tekrar istek yok).
   ============================================================ */
window.VS = window.VS || {};
VS.wordinfo = (function () {
  const HOLD_MS = 5000; // 5 saniye hover
  let cache = VS.storage.get('wordInfoCache', {});
  let timers = new Map();   // element -> timeout
  let tipEl = null;         // aktif tooltip
  let tipTarget = null;

  function esc(s) { return VS.ui.esc(s); }

  // dictionaryapi.dev'den yalnızca METİN verisi (definition + IPA)
  async function fetchInfo(word) {
    const key = VS.words.clean(word).toLowerCase();
    const hit = cache[key];
    if (hit && (hit.definition || hit.ipa)) return hit;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(key), { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) return null;
      let ipa = '', definition = '';
      const entry = data[0];
      if (entry.phonetic) ipa = entry.phonetic;
      if (Array.isArray(entry.phonetics)) {
        if (!ipa) { const p = entry.phonetics.find(x => x.text); if (p) ipa = p.text; }
      }
      const mean = entry.meanings && entry.meanings[0];
      if (mean && mean.definitions && mean.definitions[0]) definition = mean.definitions[0].definition;
      const out = { ipa, definition };
      if (ipa || definition) {
        try {
          cache[key] = out;
          const keys = Object.keys(cache);
          if (keys.length > 600) delete cache[keys[0]];
          VS.storage.set('wordInfoCache', cache);
        } catch (e) {}
      }
      return out;
    } catch (e) { return null; }
  }

  // Tooltip göster (kelime elemanının yanında)
  function showTip(el, word) {
    hideTip();
    tipTarget = el;
    tipEl = document.createElement('div');
    tipEl.className = 'word-tip';
    tipEl.innerHTML =
      '<div class="wt-top"><span class="wt-word">' + esc(word) +
      (cache[VS.words.clean(word).toLowerCase()] ? '' : '<span class="wt-spin"></span>') +
      '</span></div>' +
      '<div class="wt-body">Yükleniyor…</div>';
    document.body.appendChild(tipEl);
    positionTip(el);
    tipEl.classList.add('in');

    fetchInfo(word).then(info => {
      if (!tipEl || tipTarget !== el) return;
      if (!info) {
        tipEl.querySelector('.wt-body').innerHTML = 'Bilgi bulunamadı';
        return;
      }
      const parts = [];
      if (info.ipa) parts.push('<span class="wt-ipa">/' + esc(info.ipa.replace(/^\/|\/$/g, '')) + '/</span>');
      if (info.definition) parts.push('<span class="wt-def">' + esc(info.definition) + '</span>');
      tipEl.querySelector('.wt-body').innerHTML = parts.join('') || 'Bilgi bulunamadı';
    });
  }

  function positionTip(el) {
    if (!tipEl) return;
    const r = el.getBoundingClientRect();
    const tipW = 260;
    let left = r.left + r.width / 2 - tipW / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - tipW - 10));
    const above = r.top - 12;
    tipEl.style.left = left + 'px';
    tipEl.style.top = (above - tipEl.offsetHeight - 8 < 0 ? r.bottom + 12 : above - tipEl.offsetHeight - 8) + 'px';
  }

  function hideTip() {
    if (timers) { timers.forEach(t => clearTimeout(t)); timers.clear(); }
    if (tipEl) { tipEl.remove(); tipEl = null; }
    tipTarget = null;
  }

  // Kelime elemanına hover dinleyicisi bağla
  function attach(el) {
    if (!el || el.dataset.wi) return;
    el.dataset.wi = '1';
    el.addEventListener('pointerenter', () => {
      // Çevrimdışıysa sessizce çalışmayı kes — hiçbir uyarı/istek yok
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const t = setTimeout(() => {
        const word = (el.getAttribute('data-word') || el.textContent || '').trim();
        if (word) showTip(el, word);
      }, HOLD_MS);
      timers.set(el, t);
    });
    el.addEventListener('pointerleave', () => {
      const t = timers.get(el);
      if (t) { clearTimeout(t); timers.delete(el); }
      if (tipTarget === el) hideTip();
    });
    el.addEventListener('scroll', () => { if (tipTarget === el) positionTip(el); }, { passive: true });
  }

  // Sayfa içindeki tüm hover kelimelerini bağla (render sonrası çağrılır)
  function scan(root) {
    (root || document).querySelectorAll('[data-wordinfo]').forEach(attach);
  }

  return { scan };
})();
