/* ============================================================
   VocaStride — Mod: Hafıza Kartları (flashcards.js)
   ============================================================ */
window.VS = window.VS || {};
VS.modes = VS.modes || {};
VS.modes.card = (function () {
  let w = null, flipped = false, locked = false;

  function render() {
    const root = VS.ui.$('modeRoot');
    w = VS.session.currentWord();
    locked = false;
    flipped = false;
    if (!w) return;
    root.innerHTML =
      '<div class="fc-scene"><div class="fc-card" id="fcCard">' +
        '<div class="fc-face fc-front"><div class="fw" data-wordinfo data-word="' + VS.ui.esc(w[0]) + '">' + VS.ui.esc(w[0]) + '</div>' +
          '<div class="ftip">' + VS.icons.svg('refresh', 13) + ' Çevirmek için dokun</div></div>' +
        '<div class="fc-face fc-back"><span class="bk">Anlamı</span><div class="bm">' + VS.ui.esc(w[2]) + '</div>' +
          '<div class="bs">' + VS.ui.esc(w[1]) + '</div></div>' +
      '</div></div>' +
      '<div class="fc-actions">' +
        '<button class="btn btn-skip" id="fcNo">' + VS.icons.svg('refresh', 17) + ' Tekrar</button>' +
        '<button class="btn btn-know" id="fcYes">' + VS.icons.svg('check', 17) + ' Bildim</button>' +
      '</div>';

    const card = VS.ui.$('fcCard');
    card.addEventListener('click', () => VS.modes.card.flip());
    VS.ui.$('fcNo').onclick = () => VS.modes.card.judge(false);
    VS.ui.$('fcYes').onclick = () => VS.modes.card.judge(true);
    VS.wordinfo.scan(root);
  }

  function flip() {
    if (locked || !w) return;
    flipped = !flipped;
    VS.ui.$('fcCard').classList.toggle('flip', flipped);
  }

  function judge(ok) {
    if (locked || !w) return;
    locked = true;
    VS.session.answer(ok, w);
    setTimeout(() => VS.session.next(), 350);
  }

  return { render, flip, judge };
})();
