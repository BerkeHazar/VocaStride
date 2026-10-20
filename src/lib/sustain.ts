/**
 * Sürdürülebilir çalışma modeli.
 *
 * Aralıklı tekrar uygulamalarının çoğu ilk iki haftada terk edilir; sebep
 * motivasyon değil, **biriken tekrar borcu**. Bu dosya o borcu görünür kılar
 * ve üç yerde fren yapar:
 *
 *   1. Haftalık ritim — sonsuz "seri" baskısı yerine haftada kaç gün.
 *   2. Bakım yükü — mevcut koleksiyonun günde kaç tekrar üreteceği tahmini.
 *   3. Oturum tavanı — bir turda en fazla N tekrar; kalanı ertesi güne.
 *
 * Ayrıca veri kaybına karşı yerel anlık görüntüler alır (sunucu yok).
 */

import type { AppState, SrsRec, Word } from '../types';
import { INTERVALS, addDays, todayStr, weekdayShort } from './engine';
import { makeT, type Lang } from './i18n';

/* ------------------------------------------------------------- ritim */

export interface RhythmDay {
  iso: string;
  label: string;
  on: boolean;
  today: boolean;
  future: boolean;
}

export interface Rhythm {
  days: RhythmDay[];
  done: number;
  target: number;
  ratio: number;
  /** Hedefe kalan gün sayısı; hedef tuttuysa 0. */
  left: number;
  /** Haftanın kalanında hedefi tutturmak için gereken gün. */
  need: number;
}

/** Pazartesi başlangıçlı hafta. */
export function weekOf(iso = todayStr()): string[] {
  const [y, m, d] = iso.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => addDays(iso, i - weekday));
}

export function rhythm(state: AppState, target: number, lang: Lang = 'tr'): Rhythm {
  const today = todayStr();
  const week = weekOf(today);
  const studied = new Set(state.streakDays);
  const days: RhythmDay[] = week.map((iso) => ({
    iso,
    label: weekdayShort(iso, lang),
    on: studied.has(iso),
    today: iso === today,
    future: iso > today,
  }));
  const done = days.filter((d) => d.on).length;
  const left = days.filter((d) => !d.on && !d.future).length;
  return {
    days,
    done,
    target,
    ratio: Math.min(1, done / Math.max(1, target)),
    left,
    need: Math.max(0, target - done),
  };
}

/* -------------------------------------------------------- bakım yükü */

export interface Load {
  /** Dengede günde kaç tekrar birikir. */
  perDay: number;
  /** Şu an vadesi gelmiş kelime sayısı. */
  due: number;
  boxes: number[];
  studied: number;
  /** Toplam doğru cevap oranı (0–1). */
  accuracy: number;
  /** 4. ve 5. kutudaki kelimelerin payı (0–1) — kalıcılık göstergesi. */
  stable: number;
}

export function loadForecast(state: AppState, words: Word[]): Load {
  const boxes = [0, 0, 0, 0, 0, 0];
  let ok = 0;
  let seen = 0;
  let due = 0;
  const now = Date.now();

  for (const w of words) {
    const r = state.srs[w.key];
    if (!r) continue;
    const b = Math.min(5, Math.max(0, r.box));
    boxes[b] += 1;
    ok += r.ok;
    seen += r.seen;
    if (r.due <= now) due += 1;
  }

  let perDay = 0;
  for (let b = 1; b <= 5; b++) {
    const gap = INTERVALS[b] || 1;
    perDay += boxes[b] / gap;
  }

  const studied = boxes.reduce((a, b) => a + b, 0);
  return {
    perDay: Math.round(perDay * 10) / 10,
    due,
    boxes,
    studied,
    accuracy: seen ? ok / seen : 0,
    stable: studied ? (boxes[4] + boxes[5]) / studied : 0,
  };
}

/** Bakım yükü hedefin çok üstündeyse yeni kelimeyi yavaşlatmayı öner. */
export function loadAdvice(load: Load, goal: number, lang: Lang = 'tr'): string | null {
  if (load.studied < 30) return null;
  const t = makeT(lang);
  if (load.perDay > goal * 1.6) return t('load.over', { n: load.perDay });
  if (load.perDay > goal) return t('load.near', { n: load.perDay, m: goal });
  return null;
}

/* -------------------------------------------------------- inatçı kelime */

export const LEECH_BAD = 4;

/** Dört kez yanlış giden kelime farklı bir yaklaşım ister, daha çok tekrar değil. */
export function isLeech(rec?: SrsRec): boolean {
  return !!rec && rec.bad >= LEECH_BAD;
}

export function leechKeys(state: AppState, words: Word[]): string[] {
  return words
    .filter((w) => isLeech(state.srs[w.key]))
    .sort((a, b) => (state.srs[b.key]?.bad ?? 0) - (state.srs[a.key]?.bad ?? 0))
    .map((w) => w.key);
}

/* ------------------------------------------------------------- tavan */

export const REVIEW_CAP = 24;

/**
 * Vadesi gelmiş kelimeleri bir turda sınırlar. Kalanı "yarına" bırakmak,
 * 80 kelimelik bir borç duvarıyla karşılaşmaktan iyidir.
 */
export function capped(keys: string[], cap = REVIEW_CAP): { queue: string[]; deferred: number } {
  if (keys.length <= cap) return { queue: keys, deferred: 0 };
  return { queue: keys.slice(0, cap), deferred: keys.length - cap };
}

/* ---------------------------------------------------- yerel anlık görüntü */

const SNAP_KEY = 'vs2:snaps';
const SNAP_EVERY = 6 * 86_400_000;
const SNAP_MAX = 2;
const SNAP_LIMIT = 380_000;

export interface Snapshot {
  id: string;
  at: number;
  words: number;
  data: string;
}

export function snapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    const list = raw ? (JSON.parse(raw) as Snapshot[]) : [];
    return Array.isArray(list) ? list.filter((s) => s && s.data) : [];
  } catch {
    return [];
  }
}

function writeSnapshots(list: Snapshot[]) {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify(list.slice(0, SNAP_MAX)));
  } catch {
    /* kota dolu: sessizce vazgeç */
  }
}

/**
 * Uygulama açılışında çağrılır. Altı günde bir, en fazla iki kopya tutar.
 * Böylece "tarayıcı verisini temizledim" kazası en azından bir haftalık
 * ilerlemeyi kurtarır.
 */
export function autoSnapshot(serialize: () => string): Snapshot | null {
  const list = snapshots();
  const last = list[0];
  if (last && Date.now() - last.at < SNAP_EVERY) return null;
  const data = serialize();
  if (data.length > SNAP_LIMIT) return null;
  const snap: Snapshot = {
    id: `s${Date.now().toString(36)}`,
    at: Date.now(),
    words: Object.keys((JSON.parse(data) as AppState).srs ?? {}).length,
    data,
  };
  writeSnapshots([snap, ...list]);
  return snap;
}

export function takeSnapshot(serialize: () => string): Snapshot | null {
  const data = serialize();
  if (data.length > SNAP_LIMIT) return null;
  const snap: Snapshot = {
    id: `s${Date.now().toString(36)}`,
    at: Date.now(),
    words: Object.keys((JSON.parse(data) as AppState).srs ?? {}).length,
    data,
  };
  writeSnapshots([snap, ...snapshots()]);
  return snap;
}

export function snapshotAge(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'geçen hafta' : `${weeks} hafta önce`;
}
