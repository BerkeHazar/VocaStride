/**
 * Marka geometrisi — tek uygulama.
 *
 * Sayı **yok**: her şey `brand/mark.json`'dan gelir (onu `brand/build.py` üretir).
 * Aynı fonksiyonlar tarayıcıda (React, canvas), derleme sırasında (açılış ekranı)
 * ve Node betiklerinde (ikonlar, og görseli) çalışır; böylece logonun bir yerde
 * farklı çıkması mümkün değil.
 *
 * Koordinat kuralı: karo 256 birim. V, karonun `markWidth` katı genişliğinde ve
 * bbox merkezi `markCenterY`'de durur (optik orta). Wordmark yolunun taban
 * çizgisi y=0, cap tepesi y=-cap, sol kenarı x=0.
 */

const r2 = (n) => Math.round(n * 100) / 100;

/** V'nin karo içindeki ölçeği (genişlik karonun `markWidth` katı). */
export function markScale(brand) {
  const { mark, tile } = brand;
  return (tile.markWidth * tile.size) / mark.w;
}

/**
 * V'nin karo içindeki dönüşümü (karo biriminde, 256 tuvali).
 * `brand/tile.svg` ile birebir aynı dizeyi üretir.
 */
export function tileMarkTransform(brand, cx = brand.tile.size / 2, cy = brand.tile.markCenterY) {
  const { mark } = brand;
  return (
    `translate(${r2(cx)} ${r2(cy)}) scale(${markScale(brand).toFixed(4)}) ` +
    `translate(${r2(-mark.cx)} ${r2(-mark.cy)})`
  );
}

/**
 * Yatay lockup ölçüleri.
 *
 * @param size karo kenarı (px)
 * @returns karo, cap, boşluk ve toplam kutu; wordmark taban çizgisi `baseline`.
 */
export function lockupGeom(size, brand) {
  const { lockup, wordmark } = brand;
  const cap = size * lockup.cap;
  const gap = size * lockup.gap;
  const wordScale = cap / wordmark.cap;
  const wordW = wordmark.width * wordScale;
  return {
    tile: size,
    cap,
    gap,
    wordScale,
    wordW,
    width: size + gap + wordW,
    height: size,
    baseline: size / 2 + cap / 2,
    radius: (brand.tile.radius / brand.tile.size) * size,
  };
}

/**
 * Lockup'ın gövdesi (karo + V + wordmark), karo biriminde.
 * SVG'ye ya da mevcut bir <svg> içine gömülür (og görseli, açılış ekranı).
 */
export function lockupBody(brand, { size = 30, colors = {} } = {}) {
  const g = lockupGeom(size, brand);
  const { mark, tile, wordmark } = brand;
  const markColor = colors.mark ?? brand.colors.ink;
  const wordColor = colors.word ?? brand.colors.ink;
  const inkColor = colors.ink ?? brand.colors.paper;
  return (
    `<g transform="scale(${(size / tile.size).toFixed(5)})">\n` +
    `  <rect width="${tile.size}" height="${tile.size}" rx="${tile.radius}" fill="${markColor}"/>\n` +
    `  <g fill="${inkColor}" transform="${tileMarkTransform(brand)}"><path d="${mark.d}"/></g>\n` +
    `</g>\n` +
    `<g fill="${wordColor}" transform="translate(${r2(size + g.gap)} ${r2(g.baseline)}) ` +
    `scale(${g.wordScale.toFixed(5)})"><path d="${wordmark.d}"/></g>`
  );
}

/** Lockup'ı SVG metnine çevirir (açılış ekranı, og görseli). */
export function lockupSvg(brand, { size = 30, colors = {}, attrs = '' } = {}) {
  const g = lockupGeom(size, brand);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(g.width)} ${r2(g.height)}" ` +
    `width="${r2(g.width)}" height="${r2(g.height)}" role="img" aria-label="VocaStride"${attrs}>\n` +
    lockupBody(brand, { size, colors }) +
    `\n</svg>`
  );
}

/** Yalnızca karo (uygulama ikonu, favicon). */
export function tileSvg(brand, { radius = true, markWidth, centerY, fill, ink } = {}) {
  const { mark, tile } = brand;
  const b = markWidth
    ? { ...brand, tile: { ...tile, markWidth, markCenterY: centerY ?? tile.markCenterY } }
    : brand;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${tile.size} ${tile.size}">\n` +
    `  <rect width="${tile.size}" height="${tile.size}" rx="${radius ? tile.radius : 0}" fill="${fill ?? brand.colors.ink}"/>\n` +
    `  <g fill="${ink ?? brand.colors.paper}" transform="${tileMarkTransform(b)}"><path d="${mark.d}"/></g>\n` +
    `</svg>`
  );
}
