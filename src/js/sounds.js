/* ============================================================
   VocaStride — Ses Efektleri (sounds.js) — Web Audio API
   ============================================================ */
window.VS = window.VS || {};
VS.sounds = (function () {
  let ctx = null;
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function tone(freqs, dur, type, vol) {
    const c = ac();
    if (!c || !VS.state || VS.state.sound === false) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.connect(g); g.connect(c.destination);
      g.gain.value = vol || 0.07;
      freqs.forEach((f, i) => o.frequency.setValueAtTime(f, c.currentTime + i * 0.09));
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.start(); o.stop(c.currentTime + dur + 0.05);
    } catch (e) {}
  }

  const sfx = {
    correct() { tone([523.25, 659.25, 783.99], 0.42, 'sine', 0.08); },
    wrong() { tone([200, 150], 0.32, 'sawtooth', 0.05); },
    combo() { tone([587.33, 783.99, 987.77, 1174.66], 0.5, 'sine', 0.08); },
    levelup() { tone([523.25, 659.25, 783.99, 1046.5], 0.72, 'sine', 0.09); },
    badge() { tone([659.25, 783.99, 987.77, 1174.66, 1318.51], 0.85, 'triangle', 0.08); },
    tap() { tone([880], 0.08, 'sine', 0.03); },
    match() { tone([659.25, 987.77], 0.3, 'sine', 0.07); }
  };
  return sfx;
})();
