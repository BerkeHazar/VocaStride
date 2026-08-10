/* ============================================================
   VocaStride — Mod: Çoktan Seçmeli (quiz.js)
   Yönler: TR karşılık · synonym · ters (TR→EN) · karışık
   ============================================================ */
window.VS = window.VS || {};
VS.modes = VS.modes || {};
VS.modes.quiz = (function () {
  let qType = 'tr', w = null, locked = false;

  // soru tipine göre cevap alanı: syn=1, tr=2, ters=0 (temiz)
  function valueOf(t, word) {
    if (t === 'syn') return word[1];
    if (t === 'ters') return VS.words.clean(word[0]);
    return word[2];
  }

  function buildOptions() {
    const words = VS.words.list;
    const correct = valueOf(qType, w);
    const distractors = [];
    const seen = new Set([correct]);
    for (let i = 0; i < words.length && distractors.length < 3; i++) {
      const v = valueOf(qType, words[i]);
      if (words[i] === w || seen.has(v)) continue;
      seen.add(v); distractors.push(v);
    }
    while (distractors.length < 3) distractors.push('—');
    const opts = [correct, ...distractors];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }

  function render() {
    const st = VS.session.state();
    w = VS.session.currentWord();
    locked = false;
    if (!w) return;
    const dirs = (st.cfg && st.cfg.direction) || 'mix';
    qType = dirs === 'mix' ? ['tr', 'syn', 'ters'][Math.floor(Math.random() * 3)] : dirs;

    const hint = qType === 'tr' ? 'Türkçe karşılığını seç'
               : qType === 'syn' ? 'Eş anlamlısını seç'
               : 'İngilizce karşılığını seç';
    const question = qType === 'ters' ? w[2] : w[0];
    const opts = buildOptions();

    const root = VS.ui.$('modeRoot');
    root.innerHTML =
      '<div class="quiz-hint">' + VS.ui.esc(hint) + '</div>' +
      '<div class="quiz-word" data-wordinfo data-word="' + VS.ui.esc(question) + '">' + VS.ui.esc(question) + '</div>' +
      '<div class="options">' + opts.map((o, i) =>
        '<button class="opt-btn" data-i="' + i + '"><span class="key">' + (i + 1) + '</span><span class="opt-text">' + VS.ui.esc(o) + '</span></button>'
      ).join('') + '</div>' +
      '<button class="btn btn-primary btn-block" id="qNext" style="display:none;margin-top:14px;">Sonraki ' +
        VS.icons.svg('arrow-right', 17) + '</button>';

    root.querySelectorAll('.opt-btn').forEach(b => {
      b.onclick = () => pick(parseInt(b.dataset.i));
    });
    VS.ui.$('qNext').onclick = () => { VS.session.next(); };
    VS.wordinfo.scan(root);
  }

  function pick(i) {
    if (locked || !w) return;
    locked = true;
    const opts = [...VS.ui.$$('.opt-btn')];
    const correct = valueOf(qType, w);
    const btn = opts[i];
    if (!btn) return;
    const isRight = btn.querySelector('.opt-text').textContent.trim() === String(correct).trim();
    opts.forEach(b => b.disabled = true);
    if (qType === 'ters') {
      VS.state.modeCounts.ters = (VS.state.modeCounts.ters || 0) + 1;
    }
    if (isRight) {
      btn.classList.add('correct');
      VS.session.answer(true, w);
    } else {
      btn.classList.add('wrong');
      VS.session.answer(false, w);
      opts.forEach(b => {
        if (b.querySelector('.opt-text').textContent.trim() === String(correct).trim()) b.classList.add('correct');
      });
    }
    // Tüm soru alanına tepki: doğruysa hafif zıplama, yanlışsa sarsılma
    const root = VS.ui.$('modeRoot');
    root.classList.remove('q-correct', 'q-wrong');
    void root.offsetWidth;
    root.classList.add(isRight ? 'q-correct' : 'q-wrong');
    VS.ui.$('qNext').style.display = 'inline-flex';
  }

  return { render, pick };
})();
