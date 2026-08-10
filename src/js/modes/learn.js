/* ============================================================
   VocaStride — Mod: Öğrenme / Göz At (learn.js)
   Yeni kelimeleri önce gör, sonra "Öğrendim" ile SRS'ye al
   ============================================================ */
window.VS = window.VS || {};
VS.modes = VS.modes || {};
VS.modes.learn = (function () {
  let w = null;

  function render() {
    const root = VS.ui.$('modeRoot');
    w = VS.session.currentWord();
    if (!w) return;
    const S = VS.session.state();
    const total = S.queue.length;
    const pos = S.pos + 1;

    root.innerHTML =
      '<div class="learn-nav" style="margin-bottom:12px;">' +
        '<button class="btn btn-sm" id="lPrev">' + VS.icons.svg('chevron-left', 16) + ' Önceki</button>' +
        '<div class="learn-count" style="align-self:center;">' + pos + ' / ' + total + '</div>' +
        '<button class="btn btn-sm" id="lNext">Sonraki ' + VS.icons.svg('chevron-right', 16) + '</button>' +
      '</div>' +
      '<div class="learn-card">' +
        '<div class="learn-word" data-wordinfo data-word="' + VS.ui.esc(w[0]) + '">' + VS.ui.esc(w[0]) + '</div>' +
        '<div class="learn-meaning">' + VS.ui.esc(w[2]) + '</div>' +
        '<div class="learn-syn">Eş anlamlı: ' + VS.ui.esc(w[1]) + '</div>' +
      '</div>' +
      '<button class="btn btn-success btn-block" id="lLearned" style="margin-top:12px;">' +
        VS.icons.svg('check', 18) + ' Öğrendim</button>';

    VS.ui.$('lPrev').onclick = () => VS.session.prev();
    VS.ui.$('lNext').onclick = () => VS.session.next();
    VS.ui.$('lLearned').onclick = () => {
      VS.session.answer(true, w);
      VS.session.next();
    };
    VS.wordinfo.scan(root);
  }

  return { render };
})();
