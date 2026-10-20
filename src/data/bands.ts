import raw from './bands.json';
import type { Word } from '../types';
import { levelsInBand } from '../lib/levels';

/**
 * Zorluk bantları.
 *
 * Temel banka (1200 kelime) `bands.json` içinde hazır: iki korpusun frekansıyla
 * sıralanmış, 6 eşit banda bölünmüş hâlde. Kelime listesinin kendisi
 * değiştirilmedi; bu dosya yalnızca bir sıralama indeksi.
 *
 * Kullanıcının kendi listesi (şablonla eklenen kelimeler) frekansta olmadığı
 * için biçimsel bir tahminle yerleştirilir: uzunluk, türetim eki, çok kelimeli
 * olma, anlam sayısı. Amaç kesin CEFR etiketi değil, "hangi kelime daha zor
 * hissedilir" sırasını korumak.
 */

const data = raw as unknown as { bands: string[][] };

/** Bant 1 en kolay, bant 6 en zor. */
export const BASE_BANDS: string[][] = data.bands;

const POSITION = new Map<string, { band: number; index: number }>();
BASE_BANDS.forEach((list, band) => {
  list.forEach((key, index) => POSITION.set(key, { band, index }));
});

/** Temel bankadaki bir kelimenin 0–1 arası zorluk sırası; yoksa null. */
export function baseRank(key: string): number | null {
  const pos = POSITION.get(key.toLowerCase());
  if (!pos) return null;
  const size = BASE_BANDS[pos.band].length;
  return (pos.band + pos.index / size) / BASE_BANDS.length;
}

const HARD_SUFFIX =
  /(tion|sion|ity|ous|ive|able|ible|ment|ness|ism|esque|aceous|ify|ate|ance|ence|itude|ary)$/;
const LATINATE = /^(ab|ad|con|de|dis|ex|in|inter|pre|pro|re|sub|trans)/;

/** Temel bankada olmayan kelimeler için biçimsel tahmin (0–1). */
export function heuristicRank(word: Word): number {
  const w = word.w.toLowerCase();
  let s = Math.min(1, Math.max(0, (w.length - 4) / 9));
  if (/\s/.test(w)) s += 0.15;
  if (HARD_SUFFIX.test(w)) s += 0.12;
  if (LATINATE.test(w) && w.length >= 9) s += 0.06;
  if (word.pos === 'adv') s += 0.08;
  // Çok anlamlı kelimeler genelde daha yaygındır.
  const senses = word.tr.split(/[,;]/).filter(Boolean).length;
  if (senses >= 3) s -= 0.1;
  return Math.min(1, Math.max(0, s));
}

export function rankOf(word: Word): number {
  return baseRank(word.key) ?? heuristicRank(word);
}

/**
 * Bir kelime listesini zorluk sırasına dizip bantlara böler.
 *
 * Bant oranları `bands.json`'dan türetilir (281/250/220/190/164/95 gibi):
 * banka B2 ağırlıklı olduğu için eşit bölme son bandı B2 kelimelerle
 * dolduruyordu. Temel bankada `bandsFor(WORDS)` birebir aynı sonucu verir;
 * özel listede de aynı eğri uygulanır.
 */
export function bandsFor(words: Word[], bandCount = BASE_BANDS.length): string[][] {
  const total = BASE_BANDS.reduce((a, b) => a + b.length, 0);
  const shares = BASE_BANDS.map((b) => b.length / total).slice(0, bandCount);
  const sum = shares.reduce((a, b) => a + b, 0);

  const ordered = words
    .map((w) => ({ key: w.key, rank: rankOf(w) }))
    .sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key))
    .map((x) => x.key);

  const bounds = [0];
  for (const share of shares) {
    bounds.push(bounds[bounds.length - 1] + Math.round((ordered.length * share) / sum));
  }
  bounds[bounds.length - 1] = ordered.length;

  return Array.from({ length: bandCount }, (_, i) => ordered.slice(bounds[i], bounds[i + 1])).filter(
    (b) => b.length > 0,
  );
}

/**
 * Bir kelime sayısı için kampanyanın kaç bölüm süreceğini söyler.
 *
 * `bandsFor` ile aynı bant sınırlarını kullanır ama sıralama yapmaz: ayarlar
 * ekranında her liste için tam plan kurmak (kelimeleri yeniden sıralamak)
 * gereksiz maliyet olurdu. Sayı, `campaignPlan(bandsFor(words), opts).length`
 * ile birebir aynıdır.
 */
export function plannedLevelCount(count: number, freshPerLevel: number): number {
  if (count <= 0) return 0;
  const total = BASE_BANDS.reduce((a, b) => a + b.length, 0);
  const shares = BASE_BANDS.map((b) => b.length / total);
  const bounds = [0];
  for (const share of shares) {
    bounds.push(bounds[bounds.length - 1] + Math.round(count * share));
  }
  bounds[bounds.length - 1] = count;

  let levels = 0;
  for (let i = 0; i < shares.length; i++) {
    const size = bounds[i + 1] - bounds[i];
    if (size > 0) levels += levelsInBand(size, freshPerLevel);
  }
  return levels;
}
