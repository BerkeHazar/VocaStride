import type { SessionLog } from '../types';
import { BRAND, MARK, TILE_MARK_SCALE, WORDMARK, lockupGeom } from '../brand';
import { modeLabel } from './engine';
import { fmtDateLong, fmtTime } from './format';

const W = 1080;
const H = 1350;

/**
 * Marka işareti — `brand/mark.json` ile aynı yol ve aynı oranlar.
 *
 * Paylaşım kartı da uygulamanın lockup'ını çizer: karo, V ve wordmark
 * arasındaki boşluk `lockupGeom`'dan gelir. Böylece kart, kenar çubuğundaki
 * logonun aynısı olur (önce burada fontla dizilmiş ayrı bir wordmark vardı).
 */
const markPath = () => new Path2D(MARK.d);
const wordPath = () => new Path2D(WORDMARK.d);

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function css(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export async function renderShareCard(log: SessionLog): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas yok');

  const paper = css('--paper', '#f4f1e9');
  const ink = css('--ink', '#17150f');
  const muted = css('--ink-3', '#6f6b5f');
  const gold = css('--gold', '#8a6114');
  const display = '"Bricolage Grotesque", "Segoe UI", sans-serif';
  const ui = '"Instrument Sans", "Segoe UI", sans-serif';
  const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);

  // nokta ızgarası — arayüzün kâğıt dokusu
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.085;
  for (let x = 28; x < W; x += 28) {
    for (let y = 28; y < H; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // çerçeve
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, W - 80, H - 80, 34);
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* ------------------------------------------------ marka: karo + wordmark */
  const tile = 132;
  const tx = 96;
  const ty = 96;
  const lock = lockupGeom(tile, BRAND);

  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(tile / BRAND.tile.size, tile / BRAND.tile.size);
  roundRect(ctx, 0, 0, BRAND.tile.size, BRAND.tile.size, BRAND.tile.radius);
  ctx.fillStyle = css('--logo-mark', '#1b3a63');
  ctx.fill();

  ctx.translate(BRAND.tile.size / 2, BRAND.tile.markCenterY);
  ctx.scale(TILE_MARK_SCALE, TILE_MARK_SCALE);
  ctx.translate(-MARK.cx, -MARK.cy);
  ctx.fillStyle = css('--logo-ink', paper);
  ctx.fill(markPath());
  ctx.restore();

  ctx.save();
  ctx.translate(tx + tile + lock.gap, ty + lock.baseline);
  ctx.scale(lock.wordScale, lock.wordScale);
  ctx.fillStyle = css('--logo-word', '#1b3a63');
  ctx.fill(wordPath());
  ctx.restore();

  ctx.font = `600 27px ${ui}`;
  ctx.fillStyle = muted;
  ctx.fillText(lang === 'en' ? 'practice card' : 'kelime çalışma kartı', tx + 2, ty + tile + 58);

  // oker ayrıntı: karonun altında kısa çizgi
  ctx.strokeStyle = gold;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tx, ty + tile + 26);
  ctx.lineTo(tx + 64, ty + tile + 26);
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* ------------------------------------------------------------- skor */
  const acc = Math.round(log.accuracy * 100);
  ctx.fillStyle = ink;
  ctx.font = `800 300px ${display}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${acc}%`, W / 2, 660);
  ctx.textAlign = 'left';

  ctx.textAlign = 'center';
  ctx.font = `700 40px ${display}`;
  ctx.fillText(lang === 'en' ? 'accuracy' : 'doğruluk', W / 2, 726);
  ctx.font = `600 32px ${ui}`;
  ctx.fillStyle = muted;
  ctx.fillText(modeLabel(log.mode, lang), W / 2, 778);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 1;

  // ince mürekkep çizgisi
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, 830);
  ctx.lineTo(W - 160, 830);
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* --------------------------------------------------------- istatistik */
  const cells: [string, string][] = [
    [`${log.correct}`, lang === 'en' ? 'right' : 'doğru'],
    [`${log.wrong}`, lang === 'en' ? 'wrong' : 'yanlış'],
    [`${log.combo}`, lang === 'en' ? 'streak' : 'kombo'],
    [fmtTime(log.timeSec), lang === 'en' ? 'time' : 'süre'],
  ];
  const cw = (W - 200) / 4;
  cells.forEach(([val, label], i) => {
    const cx = 100 + cw * i + cw / 2;
    ctx.fillStyle = ink;
    ctx.font = `800 64px ${display}`;
    ctx.textAlign = 'center';
    ctx.fillText(val, cx, 946);
    ctx.font = `600 26px ${ui}`;
    ctx.fillStyle = muted;
    ctx.fillText(label, cx, 988);
  });

  /* ------------------------------------------------------------ alt bilgi */
  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  ctx.font = `700 34px ${display}`;
  ctx.fillText(`+${log.xp} XP`, W / 2, 1112);
  ctx.font = `600 26px ${ui}`;
  ctx.fillStyle = muted;
  ctx.fillText(fmtDateLong(log.date), W / 2, 1158);

  ctx.font = `600 24px ${ui}`;
  ctx.globalAlpha = 0.55;
  ctx.fillText('berkehazar.github.io/VocaStride', W / 2, 1268);
  ctx.globalAlpha = 1;

  return canvas;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function shareSession(
  log: SessionLog,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const canvas = await renderShareCard(log);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png'),
  );
  if (!blob) return 'downloaded';

  const file = new File([blob], 'vocastride-skor.png', { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: 'VocaStride skorum',
        text: `VocaStride'da %${Math.round(log.accuracy * 100)} doğruluk.`,
      });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  download(blob, 'vocastride-skor.png');
  return 'downloaded';
}

export async function previewCard(log: SessionLog): Promise<string> {
  const canvas = await renderShareCard(log);
  return canvas.toDataURL('image/png');
}
