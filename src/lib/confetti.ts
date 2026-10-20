/**
 * Bağımlılıksız konfeti: tek canvas, DPR sınırlı, transform tabanlı çizim.
 * İki yandan içe doğru fırlatılır; parçacıklar ekrandan çıkınca döngü durur
 * ve canvas DOM'dan kaldırılır.
 */
export function fireConfetti(opts: { count?: number; originY?: number } = {}) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  const palette = [
    pick('--accent', '#3D5AFE'),
    pick('--tone-pink', '#FF6FA5'),
    pick('--tone-mint', '#14B184'),
    pick('--tone-sun', '#FFC83D'),
    pick('--tone-violet', '#7C5CFF'),
  ];

  const total = opts.count ?? (w < 520 ? 64 : 110);
  const originY = opts.originY ?? h * 0.72;

  const cannons = [
    { x: -12, y: originY, angle: -Math.PI / 2.75 },
    { x: w + 12, y: originY, angle: -Math.PI + Math.PI / 2.75 },
  ];

  const parts = Array.from({ length: total }, (_, i) => {
    const c = cannons[i % 2];
    const angle = c.angle + (Math.random() - 0.5) * 0.5;
    const speed = 11 + Math.random() * 11;
    return {
      x: c.x,
      y: c.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: Math.random() > 0.5 ? 1 : 0,
      life: 0,
      delay: Math.random() * 90,
    };
  });

  let raf = 0;
  const start = performance.now();

  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, w, h);
    let alive = false;

    for (const p of parts) {
      if (t < p.delay) {
        alive = true;
        continue;
      }
      p.vy += 0.3;
      p.vx *= 0.993;
      p.vy *= 0.993;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life += 1;

      if (p.y < h + 40 && p.life < 260) alive = true;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1500) / 1000);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    if (alive && t < 3400) raf = requestAnimationFrame(frame);
    else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };

  raf = requestAnimationFrame(frame);
}
