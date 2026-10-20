import type { Direction, Mode, Word } from '../types';
import type { PlannedUnit } from './levels';
import { promptSense, shuffle } from './engine';
import { makeT, type Lang } from './i18n';

export type QuizDirection = 'tr-en' | 'en-tr' | 'syn';

export interface QuizOption {
  key: string;
  label: string;
}

export interface QuizQuestion {
  wordKey: string;
  direction: QuizDirection;
  prompt: string;
  sub: string;
  options: QuizOption[];
  answerKey: string;
  answerLabel: string;
}

export interface TypeQuestion {
  wordKey: string;
  prompt: string;
  answer: string;
  hint: string;
}

export type Step =
  | { kind: 'quiz'; q: QuizQuestion }
  | { kind: 'listen'; q: QuizQuestion }
  | { kind: 'type'; q: TypeQuestion }
  | { kind: 'cards'; keys: string[] }
  | { kind: 'match'; keys: string[] };

export interface SessionPlan {
  mode: Mode;
  steps: Step[];
  units: number;
  /** Hız turunda oturumun toplam süresi (saniye). */
  timeLimit?: number;
}

export const SPEED_SECONDS = 60;
export const SPEED_QUESTIONS = 24;

/**
 * Eşanlamlı yönü yalnızca gerçekten tek kelimelik eşanlamlısı olan kelimelerde
 * kullanılır. Veri setindeki `syn` alanının bir kısmı tanım cümlesi
 * ("formally put an end"); bunları seçenek olarak göstermek soruyu bozuyordu.
 */
const SINGLE_WORD = /^[A-Za-z][A-Za-z'-]*$/;

export function singleSyn(word: Word): string {
  const raw = (word.syn ?? '').trim();
  return SINGLE_WORD.test(raw) ? raw : '';
}

function pickDirection(pref: Direction, word: Word, rnd: () => number): QuizDirection {
  if (pref === 'syn') return singleSyn(word) ? 'syn' : 'en-tr';
  if (pref !== 'mixed') return pref;
  const bag: QuizDirection[] = ['tr-en', 'en-tr'];
  if (singleSyn(word)) bag.push('syn');
  return bag[Math.floor(rnd() * bag.length)];
}

function samePosPool(pool: Word[], word: Word): Word[] {
  const same = pool.filter((w) => w.key !== word.key && w.pos === word.pos);
  return same.length >= 4 ? same : pool.filter((w) => w.key !== word.key);
}

export function makeQuestion(
  word: Word,
  pool: Word[],
  pref: Direction,
  rnd: () => number = Math.random,
  lang: Lang = 'tr',
): QuizQuestion {
  const t = makeT(lang);
  const direction = pickDirection(pref, word, rnd);
  const candidates = samePosPool(pool, word);
  const answerLabel =
    direction === 'tr-en'
      ? word.w
      : direction === 'en-tr'
        ? promptSense(word.tr)
        : singleSyn(word);

  const options: QuizOption[] = [{ key: word.key, label: answerLabel }];
  const usedLabels = new Set([answerLabel.toLowerCase()]);
  const bag = shuffle(candidates, rnd);

  for (const cand of bag) {
    if (options.length >= 4) break;
    const label =
      direction === 'tr-en'
        ? cand.w
        : direction === 'en-tr'
          ? promptSense(cand.tr)
          : singleSyn(cand);
    if (!label) continue;
    if (usedLabels.has(label.toLowerCase())) continue;
    usedLabels.add(label.toLowerCase());
    options.push({ key: cand.key, label });
  }

  // Aynı türden yeterli kelime yoksa tüm havuzdan tamamla.
  if (options.length < 4) {
    for (const cand of shuffle(pool, rnd)) {
      if (options.length >= 4) break;
      if (cand.key === word.key) continue;
      const label =
        direction === 'tr-en'
          ? cand.w
          : direction === 'en-tr'
            ? promptSense(cand.tr)
            : singleSyn(cand);
      if (!label || usedLabels.has(label.toLowerCase())) continue;
      usedLabels.add(label.toLowerCase());
      options.push({ key: cand.key, label });
    }
  }

  return {
    wordKey: word.key,
    direction,
    prompt: direction === 'tr-en' ? promptSense(word.tr) : word.w,
    sub:
      direction === 'tr-en' ? t('q.subTrEn') : direction === 'en-tr' ? t('q.subEnTr') : t('q.subSyn'),
    options: shuffle(options, rnd),
    answerKey: word.key,
    answerLabel,
  };
}

export function makeListenQuestion(
  word: Word,
  pool: Word[],
  rnd: () => number = Math.random,
  lang: Lang = 'tr',
): QuizQuestion {
  const q = makeQuestion(word, pool, 'en-tr', rnd, lang);
  return {
    ...q,
    direction: 'en-tr',
    prompt: word.w,
    sub: makeT(lang)('q.subListen'),
  };
}

export function makeTypeQuestion(word: Word): TypeQuestion {
  return {
    wordKey: word.key,
    prompt: promptSense(word.tr),
    answer: word.w,
    // İlk harf + uzunluk: tümüyle boş bırakmak yerine yönlendirir.
    hint: `${word.w.charAt(0).toUpperCase()}${'·'.repeat(Math.max(0, word.w.length - 1))}`,
  };
}

export interface PlanOptions {
  direction: Direction;
  length: number;
  rnd?: () => number;
  lang?: Lang;
}

export function buildPlan(
  mode: Mode,
  keys: string[],
  words: Word[],
  opts: PlanOptions,
): SessionPlan {
  const byKey = new Map(words.map((w) => [w.key, w]));
  const rnd = opts.rnd ?? Math.random;
  const lang = opts.lang ?? 'tr';
  // Çeldiriciler tüm aktif kelime havuzundan gelir.
  const pool = words;
  const usable = keys.filter((k) => byKey.has(k));

  /*
   * `length === 0` sınırsız tur demek: oturum bitmez, parti parti uzar.
   * Parti boyu burada sabitlenir (10 kart/soru).
   */
  const want = opts.length || 10;

  if (mode === 'cards') {
    const picked = usable.slice(0, Math.max(4, want));
    return {
      mode,
      steps: picked.length ? [{ kind: 'cards', keys: picked }] : [],
      units: picked.length,
    };
  }

  if (mode === 'match') {
    const rounds: Step[] = [];
    for (let i = 0; i < usable.length; i += 5) {
      const chunk = usable.slice(i, i + 5);
      if (chunk.length >= 3) rounds.push({ kind: 'match', keys: chunk });
    }
    return { mode, steps: rounds, units: rounds.length };
  }

  if (mode === 'listen') {
    const picked = usable.slice(0, Math.max(4, want));
    const steps: Step[] = [];
    for (const k of picked) {
      const w = byKey.get(k);
      if (w) steps.push({ kind: 'listen', q: makeListenQuestion(w, pool, rnd, lang) });
    }
    return { mode, steps, units: steps.length };
  }

  if (mode === 'type') {
    const picked = usable.slice(0, Math.max(4, want));
    const steps: Step[] = [];
    for (const k of picked) {
      const w = byKey.get(k);
      if (w) steps.push({ kind: 'type', q: makeTypeQuestion(w) });
    }
    return { mode, steps, units: steps.length };
  }

  if (mode === 'speed') {
    const steps: Step[] = [];
    for (const k of usable.slice(0, SPEED_QUESTIONS)) {
      const w = byKey.get(k);
      if (w) steps.push({ kind: 'quiz', q: makeQuestion(w, pool, opts.direction, rnd, lang) });
    }
    return { mode, steps, units: steps.length, timeLimit: SPEED_SECONDS };
  }

  if (mode === 'marathon') {
    /*
     * Maraton tek bir mod değil, karışık bir tur. Eskiden sırayla
     * "7 test → deste → eşleştirme" diye bloklanıyordu; sonra bloklar
     * kalktı ama deste hâlâ dört kartı bir arada veriyordu. Kullanıcı
     * bunu "5 mod 4'er 4'er değil, her biri ayrı ayrı gelsin" diye
     * düzeltti.
     *
     * Şimdi: her adım TEK kelime. Mod, test / dinleme / yazma / tek kart
     * arasından dönüşümlü seçilir; böylece kart da bir kelimelik adım
     * olarak öteki modların arasına karışır. Eşleştirme doğası gereği
     * bir tahta (en az üç çift), o yüzden akışın ortasına tek parça
     * olarak girer. Yön her zaman karışıktır.
     *
     * `length` tek kelimelik adımların sayısı; eşleştirme tahtası (4)
     * bunun üstüne biner. `0` (sınırsız) turda her parti 10 adım.
     */
    const picked = shuffle(usable, rnd).slice(0, Math.max(4, want) + 4);
    const matchKeys = picked.slice(0, 4);
    const singles = picked.slice(4);
    const kinds = shuffle(['quiz', 'listen', 'type', 'cards'] as const, rnd);

    const steps: Step[] = [];
    singles.forEach((k, i) => {
      const w = byKey.get(k);
      if (!w) return;
      const kind = kinds[i % kinds.length];
      if (kind === 'listen') {
        steps.push({ kind: 'listen', q: makeListenQuestion(w, pool, rnd, lang) });
      } else if (kind === 'type') {
        steps.push({ kind: 'type', q: makeTypeQuestion(w) });
      } else if (kind === 'cards') {
        // Tek kartlık deste: kart modu da öteki sorular gibi tek tek gelir.
        steps.push({ kind: 'cards', keys: [k] });
      } else {
        steps.push({ kind: 'quiz', q: makeQuestion(w, pool, 'mixed', rnd, lang) });
      }
    });

    // Eşleştirme tahtası akışın ortasına, rastgele bir noktaya girer.
    if (matchKeys.length >= 3) {
      steps.splice(Math.floor(rnd() * (steps.length + 1)), 0, {
        kind: 'match',
        keys: matchKeys,
      });
    }

    return { mode, steps, units: countUnits(steps) };
  }

  const steps: Step[] = [];
  for (const k of usable) {
    const w = byKey.get(k);
    if (!w) continue;
    steps.push({ kind: 'quiz', q: makeQuestion(w, pool, opts.direction, rnd, lang) });
  }
  return { mode, steps, units: steps.length };
}

export function cardProgressLabel(i: number, n: number): string {
  return `${i + 1} / ${n}`;
}

export interface LevelPlanOptions {
  direction: Direction;
  rnd?: () => number;
  lang?: Lang;
}

/**
 * Bölümün birimlerini oturum adımlarına çevirir.
 *
 * Bölüm tek bir mod değil: kart destesi, test, dinleme, yazma ve eşleştirme
 * aynı bölümün içinde sırayla geliyor. Kart ve eşleştirme tek adımda birkaç
 * kelime işler, diğerleri kelime başına bir adım.
 */
export function buildLevelSteps(
  units: PlannedUnit[],
  words: Word[],
  opts: LevelPlanOptions,
): Step[] {
  const byKey = new Map(words.map((w) => [w.key, w]));
  const rnd = opts.rnd ?? Math.random;
  const lang = opts.lang ?? 'tr';
  const steps: Step[] = [];

  for (const unit of units) {
    if (unit.mode === 'cards' || unit.mode === 'match') {
      const keys = unit.keys.filter((k) => byKey.has(k));
      if (keys.length >= (unit.mode === 'match' ? 3 : 1)) steps.push({ kind: unit.mode, keys });
      continue;
    }
    for (const key of unit.keys) {
      const w = byKey.get(key);
      if (!w) continue;
      if (unit.mode === 'quiz') {
        steps.push({ kind: 'quiz', q: makeQuestion(w, words, opts.direction, rnd, lang) });
      } else if (unit.mode === 'listen') {
        steps.push({ kind: 'listen', q: makeListenQuestion(w, words, rnd, lang) });
      } else {
        steps.push({ kind: 'type', q: makeTypeQuestion(w) });
      }
    }
  }
  return steps;
}

/** Bir adımda kaç kelime işleniyor: ilerleme çubuğu ve sayaç bunu kullanır. */
export function countUnits(steps: Step[]): number {
  return steps.reduce(
    (a, s) =>
      a + (s.kind === 'quiz' || s.kind === 'listen' || s.kind === 'type' ? 1 : s.keys.length),
    0,
  );
}
