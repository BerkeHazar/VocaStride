/**
 * Marka verisi — tek kaynak `brand/mark.json` (brand/build.py üretir).
 *
 * Bileşenler bu dosyayı, paylaşım kartı canvas'ı da aynı sayıları kullanır.
 * Oranlar (V'nin karo içindeki ölçeği/konumu, wordmark cap'i, boşluk) burada
 * veya bileşenlerde tekrar edilmez.
 */
import mark from '../brand/mark.json';
import {
  lockupGeom,
  markScale,
  tileMarkTransform,
  type BrandData,
  type LockupGeometry,
} from '../brand/lockup.mjs';

export const BRAND = mark as BrandData;

export const MARK = BRAND.mark;
export const TILE = BRAND.tile;
export const WORDMARK = BRAND.wordmark;
export const LOCKUP = BRAND.lockup;

/** V'nin karo içindeki dönüşümü (256 birimlik karo tuvali). */
export const TILE_MARK_TRANSFORM = tileMarkTransform(BRAND);

/** V'nin karo içindeki ölçeği. */
export const TILE_MARK_SCALE = markScale(BRAND);

export { lockupGeom };
export type { LockupGeometry };

/** Uygulamadaki karo boyları — `brand/mark.json` içindeki `ui` bölümü. */
export const TILE_SIZE = BRAND.ui;
