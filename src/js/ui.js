/* ============================================================
   VocaStride — Arayüz Yardımcıları (ui.js)
   Router · toast · sheet · efektler · konfeti · haptik
   ============================================================ */
window.VS = window.VS || {};
VS.ui = (function () {
  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtTime(sec) {
    const d = Math.floor(sec / 60), s = sec % 60;
    return d + ':' + String(s).padStart(2, '0');
  }

  // ---- Ekran router ----
  function show(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $(id);
    if (el) { el.classList.add('active'); window.scrollTo(0, 0); }
    updateNav(id);
  }

  // Alt navigasyon: oturum/özet/onboarding'de gizlenir, aktif panel vurgulanır.
  // Görünürlük CSS'te yönetilir (yalnızca mobilde) — inline style kullanılmaz.
  function updateNav(activeId) {
    const nav = $('bottomNav');
    if (!nav) return;
    const hide = activeId === 'screenSession' || activeId === 'screenSummary' || activeId === 'screenOnb' || !activeId;
    nav.classList.toggle('hidden', hide);
    $$('#bottomNav button').forEach(b => {
      b.classList.toggle('on', b.dataset.panel === activeId);
    });
  }

  // ---- Toast ----
  function toast(msg, type) {
    let wrap = $('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    const ico = type === 'err' ? 'x-circle' : type === 'ok' ? 'check-circle' : 'info';
    t.innerHTML = '<span class="t-ico">' + VS.icons.svg(ico, 18) + '</span><span>' + esc(msg) + '</span>';
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2600);
  }

  // ---- Haptik ----
  function haptic(p) {
    try {
      if (navigator.vibrate && VS.state && VS.state.haptics !== false) navigator.vibrate(p || 12);
    } catch (e) {}
  }

  // ---- Sheet (alt panel) ----
  function openSheet(html, opts) {
    const ov = document.createElement('div');
    ov.className = 'sheet-overlay';
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 260); };
    ov.addEventListener('click', e => { if (e.target === ov && (!opts || !opts.sticky)) close(); });
    return { el: ov, close };
  }

  // ---- Havada süzülen geri bildirim ----
  function fxFloat(icon, text, color, epic) {
    if (VS.state && VS.state.calm) return;
    const d = document.createElement('div');
    d.className = epic ? 'fx-epic' : 'fx-float';
    d.innerHTML = (icon ? '<span class="fx-ico">' + VS.icons.svg(icon, epic ? 46 : 30) + '</span>' : '') +
                  (text ? '<span class="fx-txt">' + esc(text) + '</span>' : '');
    if (!epic && color) d.style.color = color;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), epic ? 2100 : 1700);
  }

  function fxBadge(b) {
    if (VS.state && VS.state.calm) return;
    const d = document.createElement('div');
    d.className = 'fx-pop';
    d.innerHTML = '<span class="p-ico">' + VS.icons.svg(b.icon, 34) + '</span><span class="p-tag">Rozet Kazanıldı</span><span class="p-name">' + esc(b.ad) + '</span>';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  function fxLevel(num) {
    if (VS.state && VS.state.calm) return;
    const d = document.createElement('div');
    d.className = 'fx-level';
    d.innerHTML = '<span class="l-tag">Seviye Atladın!</span><div class="l-num">' + num + '</div>';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  // ---- Konfeti ----
  function confetti() {
    if (VS.state && VS.state.calm) return;
    let cv = $('confettiCanvas');
    if (!cv) {
      cv = document.createElement('canvas');
      cv.id = 'confettiCanvas';
      document.body.appendChild(cv);
    }
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = ['#a370f7', '#7c3aed', '#ffb454', '#2dd48b', '#5cc8ff', '#fb7185'];
    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: innerWidth / 2, y: innerHeight * 0.35,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
        g: 0.35 + Math.random() * 0.2,
        s: 5 + Math.random() * 6, c: colors[i % colors.length],
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3
      });
    }
    let frames = 0;
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      });
      if (++frames < 110) requestAnimationFrame(tick);
      else { ctx.clearRect(0, 0, cv.width, cv.height); }
    };
    tick();
  }

  return { $, $$, esc, fmtTime, show, updateNav, toast, haptic, openSheet, fxFloat, fxBadge, fxLevel, confetti };
})();
