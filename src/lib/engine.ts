import type { AppState, Badge, BadgeStats, Mode, Source, SrsRec, Word } from '../types';
import { makeT, type Lang } from './i18n';

export const DAY = 86_400_000;
export const MIN = 60_000;

/** Leitner kutuları: 0 = yeni, 5 = ustalaştı. Aralıklar gün cinsinden. */
export const INTERVALS = [0, 1, 2, 4, 8, 16];
export const LAPSE_MINUTES = 10;

/* ---------------------------------------------------------------- tarih */

export function dateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return dateStr();
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}

export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / DAY);
}

export function weekdayShort(iso: string, lang: Lang = 'tr'): string {
  const [y, m, d] = iso.split('-').map(Number);
  const idx = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const tr = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
  const en = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  return (lang === 'en' ? en : tr)[idx];
}

export function lastNDays(n: number, end = todayStr()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
}

/* ------------------------------------------------------------------ SRS */

export function boxOf(rec?: SrsRec): number {
  return rec ? Math.min(Math.max(rec.box, 0), 5) : 0;
}

export function isDue(rec: SrsRec | undefined, now = Date.now()): boolean {
  return !rec || !rec.due || rec.due <= now;
}

export function dueAt(box: number, from = Date.now()): number {
  const days = INTERVALS[Math.min(Math.max(box, 0), 5)] || 1;
  return from + days * DAY;
}

export function reviewRec(rec: SrsRec | undefined, correct: boolean, now = Date.now()): SrsRec {
  const cur = boxOf(rec);
  const seen = (rec?.seen ?? 0) + 1;
  const ok = (rec?.ok ?? 0) + (correct ? 1 : 0);
  const bad = (rec?.bad ?? 0) + (correct ? 0 : 1);

  if (!correct) {
    // Yanlış cevap kelimeyi 1. kutuya düşürür ve 10 dakika sonra yeniden sorar.
    return { box: 1, due: now + LAPSE_MINUTES * MIN, seen, ok, bad, last: now };
  }

  const next = Math.min(cur + 1, 5);
  return { box: next, due: dueAt(next, now), seen, ok, bad, last: now };
}

/* --------------------------------------------------------------- kelime */

export function activeWords(state: AppState): Word[] {
  if (state.activeList === 'default') return BASE_WORDS;
  return state.customWords.filter((w) => w.listId === state.activeList);
}

// Döngüsel import olmaması için temel liste burada enjekte edilir.
let BASE_WORDS: Word[] = [];
export function registerBaseWords(words: Word[]): void {
  BASE_WORDS = words;
}

export function dueKeys(state: AppState, words: Word[], now = Date.now()): string[] {
  return words
    .filter((w) => {
      const rec = state.srs[w.key];
      return !!rec && rec.due <= now;
    })
    .map((w) => w.key);
}

export function newKeys(state: AppState, words: Word[]): string[] {
  return words.filter((w) => !state.srs[w.key]).map((w) => w.key);
}

export function weakKeys(state: AppState, words: Word[]): string[] {
  return words
    .filter((w) => {
      const r = state.srs[w.key];
      return r && r.seen > 0 && (r.bad > r.ok || r.box <= 1);
    })
    .sort((a, b) => {
      const ra = state.srs[a.key];
      const rb = state.srs[b.key];
      return rb.bad - ra.bad || ra.box - rb.box;
    })
    .map((w) => w.key);
}

export function shuffle<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Kaynağa göre oturum kuyruğu üretir.
 *
 * Rastgelelik iki yerde kırılıyordu: yeni kelimeler alfabetik sıradan
 * kesiliyordu (her tur "abandon, abolish, abrupt…") ve vadesi gelenler de
 * dosya sırasını koruyordu. Burada her iki liste de karıştırıldıktan sonra
 * kesiliyor; akıllı seçim ise tek bir kaynaktan beslenmek yerine üç kaynağı
 * ağırlıklı olarak harmanlıyor.
 */
export function buildQueue(
  state: AppState,
  words: Word[],
  source: Source,
  count: number,
  rnd: () => number = Math.random,
): string[] {
  const now = Date.now();
  const all = words.map((w) => w.key);
  const due = shuffle(dueKeys(state, words, now), rnd);
  const fresh = shuffle(newKeys(state, words), rnd);
  const weak = shuffle(weakKeys(state, words), rnd);

  if (source === 'due') return due.slice(0, count);
  if (source === 'new') return fresh.slice(0, count);
  if (source === 'weak') return weak.slice(0, count);
  if (source === 'all') return shuffle(all, rnd).slice(0, count);

  // Akıllı seçim: çoğunluk tekrar, azınlık yeni ve zayıf. Oranlar her turda
  // hafifçe oynar; aynı deste iki kez üst üste gelmez.
  const mix: string[] = [];
  const take = (list: string[], n: number) => {
    for (const key of list) {
      if (mix.length >= count || n <= 0) break;
      if (mix.includes(key)) continue;
      mix.push(key);
      n -= 1;
    }
  };

  const newShare = Math.max(1, Math.round(count * (0.22 + rnd() * 0.16)));
  const weakShare = weak.length ? Math.max(1, Math.round(count * 0.16)) : 0;
  take(due, count - newShare - weakShare);
  take(weak, weakShare);
  take(fresh, count - mix.length);

  // Kaynak tükendiyse kalan boşlukları diğer havuzlardan doldur.
  if (mix.length < count) {
    take(due, count - mix.length);
    take(fresh, count - mix.length);
    take(shuffle(all, rnd), count - mix.length);
  }

  return shuffle(mix, rnd).slice(0, count);
}

/* ------------------------------------------------------------ XP / level */

export function needFor(level: number): number {
  return 50 + level * 50;
}

export function applyXp(xp: number, level: number, amount: number) {
  let nx = xp + amount;
  let nl = level;
  while (nx >= needFor(nl)) {
    nx -= needFor(nl);
    nl += 1;
  }
  return { xp: nx, level: nl, leveled: nl > level };
}

export function xpGainFor(combo: number, correct: boolean): number {
  if (!correct) return 0;
  return 10 + Math.min(combo, 10);
}

/* --------------------------------------------------------------- rozetler */

export const BADGES: Badge[] = [
  { id: 'ilk-adim', name: 'İlk adım', desc: 'İlk doğru cevabın', icon: 'seed', tone: 'mint', goal: () => 1, value: (s) => s.totalOk },
  { id: 'isinma', name: 'Isınma turu', desc: '10 doğru cevap', icon: 'flame', tone: 'sun', goal: () => 10, value: (s) => s.totalOk },
  { id: 'kelime-avcisi', name: 'Kelime avcısı', desc: '50 doğru cevap', icon: 'target', tone: 'marker', goal: () => 50, value: (s) => s.totalOk },
  { id: 'yuzuncu', name: 'Yüzüncü vuruş', desc: '100 doğru cevap', icon: 'bolt', tone: 'pink', goal: () => 100, value: (s) => s.totalOk },
  { id: 'sozluk-lordu', name: 'Sözlük lordu', desc: '500 doğru cevap', icon: 'crown', tone: 'sun', goal: () => 500, value: (s) => s.totalOk },
  { id: 'bin-bilge', name: 'Bin bilge', desc: '1000 doğru cevap', icon: 'book', tone: 'marker', goal: () => 1000, value: (s) => s.totalOk },
  { id: 'seri-5', name: 'Seri başladı', desc: '5 kombo', icon: 'flame', tone: 'sun', goal: () => 5, value: (s) => s.bestCombo },
  { id: 'ates-10', name: 'Ateş topu', desc: '10 kombo', icon: 'flame', tone: 'pink', goal: () => 10, value: (s) => s.bestCombo },
  { id: 'durdurulamaz', name: 'Durdurulamaz', desc: '25 kombo', icon: 'bolt', tone: 'marker', goal: () => 25, value: (s) => s.bestCombo },
  { id: 'efsane', name: 'Efsane', desc: '50 kombo', icon: 'spark', tone: 'sun', goal: () => 50, value: (s) => s.bestCombo },
  { id: 'tutarli', name: 'Tutarlı', desc: '3 günlük seri', icon: 'calendar', tone: 'mint', goal: () => 3, value: (s) => s.streak },
  { id: 'haftalik', name: 'Haftalık', desc: '7 günlük seri', icon: 'calendar', tone: 'marker', goal: () => 7, value: (s) => s.streak },
  { id: 'kararli', name: 'Kararlı', desc: '30 günlük seri', icon: 'shield', tone: 'pink', goal: () => 30, value: (s) => s.streak },
  { id: 'cirak', name: 'Çırak', desc: '5. seviye', icon: 'star', tone: 'mint', goal: () => 5, value: (s) => s.level },
  { id: 'usta', name: 'Usta', desc: '10. seviye', icon: 'star', tone: 'sun', goal: () => 10, value: (s) => s.level },
  { id: 'gunluk-tamam', name: 'Günlük tamam', desc: 'Günlük hedefi bitir', icon: 'check', tone: 'mint', goal: (s) => s.dailyGoal, value: (s) => s.dailyDone },
  { id: 'mukemmel-gun', name: 'Mükemmel gün', desc: 'Bir oturumu %100 bitir', icon: 'heart', tone: 'pink', goal: () => 1, value: (s) => s.perfectSessions },
  { id: 'quiz-ustasi', name: 'Test ustası', desc: 'Testte 30 doğru', icon: 'target', tone: 'marker', goal: () => 30, value: (s) => s.modeCounts.quiz ?? 0 },
  { id: 'kart-ustasi', name: 'Kart ustası', desc: 'Kartlarda 30 doğru', icon: 'cards', tone: 'pink', goal: () => 30, value: (s) => s.modeCounts.cards ?? 0 },
  { id: 'eslestirici', name: 'Eşleştirici', desc: '10 hatasız tur', icon: 'puzzle', tone: 'mint', goal: () => 10, value: (s) => s.perfectMatches },
  { id: 'ters-usta', name: 'Ters usta', desc: 'TR→EN modunda 20 doğru', icon: 'swap', tone: 'marker', goal: () => 20, value: (s) => s.modeCounts['tr-en'] ?? 0 },
  { id: 'tekrarci', name: 'Tekrarcı', desc: 'Tekrarlarda 50 doğru', icon: 'repeat', tone: 'sun', goal: () => 50, value: (s) => s.modeCounts.review ?? 0 },
  { id: 'ustalik', name: 'Ustalık', desc: '10 kelimeyi 5. kutuya taşı', icon: 'trophy', tone: 'sun', goal: () => 10, value: (s) => s.mastered },
];

export const BADGE_MAP = new Map(BADGES.map((b) => [b.id, b]));

export function badgeStats(state: AppState): BadgeStats {
  let mastered = 0;
  for (const rec of Object.values(state.srs)) if (rec.box >= 5) mastered += 1;
  return {
    totalOk: state.stats.totalOk,
    bestCombo: state.stats.bestCombo,
    streak: state.streak,
    level: state.level,
    dailyDone: state.daily.count,
    dailyGoal: state.settings.goal,
    mastered,
    modeCounts: state.stats.modeCounts,
    perfectMatches: state.stats.perfectMatches,
    perfectSessions: state.stats.perfectSessions,
  };
}

export function badgeProgress(badge: Badge, s: BadgeStats): number {
  const goal = Math.max(1, badge.goal(s));
  return Math.min(1, Math.max(0, badge.value(s) / goal));
}

export function newlyEarned(state: AppState): { state: AppState; won: Badge[] } {
  const s = badgeStats(state);
  const won: Badge[] = [];
  const badges = new Set(state.badges);
  for (const b of BADGES) {
    if (!badges.has(b.id) && b.value(s) >= b.goal(s)) {
      badges.add(b.id);
      won.push(b);
    }
  }
  if (!won.length) return { state, won };
  return { state: { ...state, badges: [...badges] }, won };
}

/* ------------------------------------------------------------- istatistik */

/**
 * Kelime bankasındaki karşılıklar "1. tayin etmek 2. postalatmak" gibi
 * numaralı anlamlar içerebiliyor. Seçeneklerde ilk anlam yeterli:
 * uzun etiketler hem okumayı zorlaştırıyor hem de kartları taşırıyor.
 */
/**
 * Soru ve seçeneklerde kullanılacak kısa anlam.
 * Veri "emmek, içine çekmek, soğurmak" gibi çok anlamlı olabiliyor; soru
 * metninde hepsini göstermek hem taşırıyor hem de cevabı ele veriyor.
 */
export function promptSense(tr: string): string {
  /*
   * İlk anlamı kısaltırken iki tuzak vardı:
   *
   *   "1. (suç, intihar vb.) işlemek/etmek 2. kendini adamak"
   *
   * Buradaki virgül parantezin İÇİNDE. Kör bir `split(',')` seçeneği
   * "(suç" diye bırakıyordu. Ayrıca baştaki nitelik parantezi
   * ("(utançından) kızarmak") seçenek olarak gösterildiğinde anlamsız.
   *
   *   1) baştaki parantez grubu atılır,
   *   2) parantez içindeki virgül/noktalı virgül bölmeye katılmaz,
   *   3) kalan baştaki noktalama temizlenir ("-den" gibi ek işaretleri korunur).
   */
  const clean = firstSense(tr).replace(/^\([^)]*\)\s*/, '').trim();
  const masked = clean.replace(/\([^)]*\)/g, (m) => m.replace(/[,;]/g, '\u0000'));
  const first = masked
    .split(/\s*[,;]\s*/)[0]
    .replace(/\u0000/g, ',')
    .replace(/^[^\p{L}\p{N}_-]+/u, '')
    .trim();
  return first.length >= 3 ? first : clean;
}

export function firstSense(tr: string): string {
  const clean = tr.replace(/\s+/g, ' ').trim();
  const m = clean.match(/^1[.)]\s*(.+?)(?=\s+2[.)]\s|$)/);
  return (m ? m[1] : clean).trim();
}

export function modeLabel(mode: Mode, lang: Lang = 'tr'): string {
  return makeT(lang)(`mode.${mode}` as Parameters<ReturnType<typeof makeT>>[0]);
}

/** Rozet adları ve açıklamaları iki dilde; veri tarafında tek yerde durur. */
const BADGE_EN: Record<string, [string, string]> = {
  'ilk-adim': ['First step', 'Your first correct answer'],
  isinma: ['Warm-up', '10 correct answers'],
  'kelime-avcisi': ['Word hunter', '50 correct answers'],
  yuzuncu: ['Hundredth hit', '100 correct answers'],
  'sozluk-lordu': ['Dictionary lord', '500 correct answers'],
  'bin-bilge': ['Thousand sage', '1000 correct answers'],
  'seri-5': ['Streak started', 'A 5 answer streak'],
  'ates-10': ['Fireball', 'A 10 answer streak'],
  durdurulamaz: ['Unstoppable', 'A 25 answer streak'],
  efsane: ['Legend', 'A 50 answer streak'],
  tutarli: ['Consistent', '3 day streak'],
  haftalik: ['Weekly', '7 day streak'],
  kararli: ['Steady', '30 day streak'],
  cirak: ['Apprentice', 'Level 5'],
  usta: ['Master', 'Level 10'],
  'gunluk-tamam': ['Day complete', 'Finish the daily goal'],
  'mukemmel-gun': ['Perfect day', 'Finish a session at 100%'],
  'quiz-ustasi': ['Test master', '30 correct in tests'],
  'kart-ustasi': ['Card master', '30 correct in cards'],
  eslestirici: ['Matcher', '10 flawless rounds'],
  'ters-usta': ['Reverse master', '20 correct in TR→EN'],
  tekrarci: ['Reviewer', '50 correct in reviews'],
  ustalik: ['Mastery', 'Move 10 words into box 5'],
};

export function badgeName(b: Badge, lang: Lang): string {
  return lang === 'en' ? (BADGE_EN[b.id]?.[0] ?? b.name) : b.name;
}

export function badgeDesc(b: Badge, lang: Lang): string {
  return lang === 'en' ? (BADGE_EN[b.id]?.[1] ?? b.desc) : b.desc;
}

export function sessionsOn(state: AppState, iso: string): number {
  return state.stats.sessions.filter((s) => dateStr(new Date(s.date)) === iso).length;
}

export function answersOn(state: AppState, iso: string): number {
  return state.stats.sessions
    .filter((s) => dateStr(new Date(s.date)) === iso)
    .reduce((a, s) => a + s.total, 0);
}

export function dailyChallengeKey(iso: string): string {
  // Tarihe göre deterministik, herkeste aynı gün aynı kelime.
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % BASE_WORDS.length;
  return BASE_WORDS[idx]?.key ?? BASE_WORDS[0].key;
}
