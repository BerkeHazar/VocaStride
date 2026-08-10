/* ============================================================
   VocaStride — Mod: Kelime Eşleştirme (matching.js)
   5 kelime ↔ 5 anlam · son 3 tur tekrar etmeme · +25 XP bonus
   ============================================================ */
window.VS = window.VS || {};
VS.modes = VS.modes || {};
VS.modes.match = (function () {
  let set = [], selW = null, selM = null, matched = 0, misses = 0, locked = false;

  function shuffle(a) {
    const x = [...a];
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  function uniqueWords() {
    const st = VS.state;
    const map = new Map();
    VS.words.list.forEach(w => { if (!map.has(w[0])) map.set(w[0], w); });
    return [...map.values()];
  }

  function buildSet() {
    const st = VS.state;
    const hist = st.matchHistory || [];
    const recent = new Set(hist.flat());
    const pool = shuffle(uniqueWords().filter(w => !recent.has(w[0])));
    let pick = pool.slice(0, 5);
    if (pick.length < 5) {
      const names = new Set(pick.map(w => w[0]));
      const back = shuffle(uniqueWords()).filter(w => !names.has(w[0])).slice(0, 5 - pick.length);
      pick = pick.concat(back);
    }
    // geçmişi güncelle
    hist.push(pick.map(w => w[0]));
    if (hist.length > 3) hist.shift();
    st.matchHistory = hist;
    return pick;
  }

  function init() {
    set = buildSet();
    matched = 0; misses = 0; selW = null; selM = null; locked = false;
    render();
  }

  function render() {
    const root = VS.ui.$('modeRoot');
    const words = shuffle(set), means = shuffle(set);
    root.innerHTML =
      '<div class="match-grid">' +
        '<svg class="match-lines" aria-hidden="true"></svg>' +
        '<div class="match-col" id="mColW">' + words.map(w => card('w', w, true)).join('') + '</div>' +
        '<div class="match-col" id="mColM">' + means.map(w => card('m', w, false)).join('') + '</div>' +
      '</div>' +
      '<div class="match-status" id="mStatus"></div>' +
      '<button class="btn btn-block" id="mReset" style="display:none;margin-top:12px;">' +
        VS.icons.svg('refresh', 17) + ' Yeni Set</button>';

    root.querySelectorAll('.match-card').forEach(c => {
      c.onclick = () => pickCard(c);
    });
    VS.ui.$('mReset').onclick = () => { VS.sounds.tap(); init(); };
    VS.wordinfo.scan(root);
  }

  // Eşleşen iki kart arasına "kalemle çizilmiş" gibi neon ışık çizer
  function drawNeonLine(wordCard, meanCard) {
    const grid = wordCard.closest('.match-grid');
    if (!grid) return;
    let svg = grid.querySelector('.match-lines');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'match-lines');
      svg.setAttribute('aria-hidden', 'true');
      grid.insertBefore(svg, grid.firstChild);
    }
    // Kart merkezlerini grid koordinatlarına çevir
    const gr = grid.getBoundingClientRect();
    const wr = wordCard.getBoundingClientRect();
    const mr = meanCard.getBoundingClientRect();
    const x1 = wr.right - gr.left;
    const y1 = wr.top + wr.height / 2 - gr.top;
    const x2 = mr.left - gr.left;
    const y2 = mr.top + mr.height / 2 - gr.top;
    // Hafif kavisli çizgi (kalem dokunuşu hissi)
    const dx = Math.max((x2 - x1) * 0.5, 26);
    const d = 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'match-line');
    path.setAttribute('pathLength', '1');
    path.setAttribute('d', d);
    svg.appendChild(path);
    // Çizim bitince hafifçe soldur (iz kalsın ama dikkat dağıtmasın)
    setTimeout(() => path.classList.add('faded'), 600);
  }

  function card(type, w, isWord) {
    const label = isWord ? w[0] : w[2];
    // Hover bilgisi yalnızca İngilizce kelime kartlarında (Türkçe kartta anlamsız)
    const hover = isWord ? ' data-wordinfo data-word="' + VS.ui.esc(label) + '"' : '';
    return '<button class="match-card ' + type + '" data-word="' + VS.ui.esc(label) + '" data-idx="' + set.indexOf(w) + '"' + hover + '>' +
      '<span class="mc-text">' + VS.ui.esc(label) + '</span>' +
    '</button>';
  }

  function pickCard(c) {
    if (locked || c.classList.contains('matched')) return;
    const isW = c.classList.contains('w');
    const cur = isW ? selW : selM;
    if (cur === c) {
      c.classList.remove('selected');
      if (isW) selW = null; else selM = null;
      return;
    }
    // aynı tipte önceki seçimi temizle
    VS.ui.$$('.match-card.selected').forEach(x => {
      if ((isW && x.classList.contains('w')) || (!isW && x.classList.contains('m'))) x.classList.remove('selected');
    });
    c.classList.add('selected');
    if (isW) selW = c; else selM = c;
    if (selW && selM) check();
  }

  function check() {
    locked = true;
    const wc = selW, mc = selM;
    const word = set[parseInt(wc.dataset.idx)];
    const mWord = set[parseInt(mc.dataset.idx)];
    selW = selM = null;
    if (word[0] === mWord[0]) {
      wc.classList.remove('selected'); mc.classList.remove('selected');
      wc.classList.add('matched'); mc.classList.add('matched');
      matched++;
      drawNeonLine(wc, mc); // eşleşen kartlar arasına neon çizgi
      VS.session.answer(true, word);
      VS.sounds.match();
      if (matched === 5) setTimeout(() => roundDone(), 650);
    } else {
      wc.classList.add('miss'); mc.classList.add('miss');
      misses++;
      VS.session.answer(false, word);
      setTimeout(() => {
        wc.classList.remove('miss', 'selected');
        mc.classList.remove('miss', 'selected');
        locked = false;
      }, 430);
      return;
    }
    locked = false;
  }

  function roundDone() {
    const st = VS.state;
    const status = VS.ui.$('mStatus');
    if (misses === 0) {
      const bonus = VS.session.perfectMatchBonus();
      status.innerHTML = VS.icons.svg('trophy', 18) + ' MÜKEMMEL! 5/5 Hatasız — +' + bonus + ' XP Bonus!';
      VS.sounds.levelup();
      setTimeout(() => VS.ui.confetti(), 300);
    } else {
      status.innerHTML = VS.icons.svg('check-circle', 18) + ' 5/5 eşleşti! ' + misses + ' hata ile tamamladın.';
      VS.sounds.correct();
    }
    status.classList.add('show');
    VS.ui.$('mReset').style.display = 'inline-flex';
  }

  function reset() { init(); }

  return { init, render, reset };
})();
