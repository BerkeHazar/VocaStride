/**
 * Kampanya ile ekranlar arasındaki ince katman.
 *
 * Bölüm planı kelime listesine bağlı olduğu için burada tutulmuyor; ekran
 * `campaignPlan(bands)` ile kendi planını üretiyor. Burada yalnızca oturum
 * boyunca yaşayan "hangi bölüm oynanıyor" bilgisi ve yıldız kuralı var.
 */

/**
 * Uyarlama: bölümde kaç yeni kelime verilecek.
 *
 * %60'ın altında biten bölümden sonra 2 kelime geri çekilir (kalanı tekrara
 * kayar), %95 üstünde 1 kelime eklenir. Kelimeler "görülmemiş" kuyruğundan
 * seçildiği için bu kayma hiçbir kelimeyi atlamaz, sadece hızı değiştirir.
 */
export function freshTarget(def: { fresh: number; total: number }, comfort = 0.8): number {
  if (def.fresh >= def.total) return def.fresh; // tanışma bölümü
  if (comfort < 0.6) return Math.max(4, def.fresh - 2);
  if (comfort > 0.95) return Math.min(def.fresh + 1, Math.max(4, def.total - 4));
  return def.fresh;
}

/** Doğruluk → yıldız. 3 yıldız neredeyse hatasız bir bölüm demek. */
export function starsFor(accuracy: number, passPct: number): number {
  if (accuracy >= 0.95) return 3;
  if (accuracy >= 0.8) return 2;
  if (accuracy >= passPct) return 1;
  return 0;
}

interface ActiveLevel {
  id: number;
  passPct: number;
  /** Bölümün soru sayısı; yarıda bırakılan oturum geçilmiş sayılmasın. */
  total: number;
}

let active: ActiveLevel | null = null;

export function setActiveLevel(id: number | null, passPct = 0.7, total = 15) {
  active = id === null ? null : { id, passPct, total };
}

export function getActiveLevel(): ActiveLevel | null {
  return active;
}

/** Bölüm türüne göre ikon ve ton. */
export function levelTone(kind: string): 'marker' | 'sun' | 'pink' | 'danger' {
  if (kind === 'final') return 'danger';
  if (kind === 'hard') return 'pink';
  if (kind === 'mini') return 'sun';
  return 'marker';
}
