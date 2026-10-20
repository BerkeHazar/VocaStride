import type { LevelProgress, ListDifficulty, SrsRec } from '../types';

/**
 * Kampanya (bölüm haritası) motoru.
 *
 * Saf mantık: DOM yok, store yok, kelime verisi parametre olarak geliyor.
 * Böylece hem uygulamada hem `scripts/audit-levels.mjs` simülasyonunda
 * aynı kod çalışıyor.
 *
 * Temel kurallar:
 *  - Bölümler zorluk bantlarından (bands.json) sırayla beslenir; bant içinde
 *    kolaydan zora ilerlenir, hiçbir kelime "yeni" olarak iki kez verilmez.
 *  - Her bölüm 15 birimdir: 10 yeni + 5 tekrar (3 ısınma, 1 eski hata, 1 sürpriz).
 *  - Soğuma: geçilen kelime hemen geri gelmez, ama asla da kaybolmaz.
 */

export type LevelKind = 'normal' | 'mini' | 'hard' | 'final';
export type UnitMode = 'quiz' | 'listen' | 'type' | 'cards' | 'match';
export type Pool = 'fresh' | 'warm' | 'callback' | 'surprise';

export interface LevelUnit {
  mode: UnitMode;
  pool: Pool;
  count: number;
}

export interface LevelDef {
  id: number;
  /** 1..6, kolaydan zora. */
  band: number;
  kind: LevelKind;
  indexInBand: number;
  /** bands[band-1] içinde bu bölümün yeni kelimelerinin başladığı indeks. */
  freshStart: number;
  fresh: number;
  units: LevelUnit[];
  total: number;
  /** Geçme eşiği (0–1). */
  passPct: number;
  /** Soğuma çarpanı: boss'larda 0.5, yani kelimeler daha çabuk geri gelir. */
  relax: number;
  /**
   * Mod rampasında kullanılan kademe (1..6).
   *
   * Listeye verilen zorluk rampayı kaydırdığı için `band`'dan ayrı tutuluyor:
   * "zor" bir listede 1. bant bile 3. kademenin mod karışımını kullanır.
   */
  rampBand: number;
}

export const QUESTIONS_PER_LEVEL = 15;
export const FINAL_QUESTIONS = 20;
export const LIVES = 3;
export const BOSS_EVERY = 10;

/**
 * Kampanya ayarları.
 *
 * `freshPerLevel` bütün dengeyi belirleyen tek sayı: bölümdeki tekrar payı
 * 15 - freshPerLevel kadar kalır. 1200 kelimeyi 15 soruluk bölümlere
 * sığdırmanın matematiği `scripts/audit-levels.mjs` ile ölçüldü.
 *
 * `rampShift` ve `passDelta` kullanıcının listeye verdiği zorluk için:
 * "zor" bir liste kademe rampasına 2 kademe ileriden başlar (yazma/dinleme
 * daha erken gelir) ve geçme eşiği 10 puan yükselir. Varsayılan banka
 * ikisini de kullanmaz, yani ölçülmüş denge aynen korunur.
 */
export interface CampaignOptions {
  questions: number;
  freshPerLevel: number;
  /** Rampada kaç kademe ileri başlanır (0 = bankanın kendi seyri). */
  rampShift?: number;
  /** Geçme eşiğine eklenen puan (0.1 = +10 puan). */
  passDelta?: number;
}

export const DEFAULT_CAMPAIGN: CampaignOptions = { questions: 15, freshPerLevel: 8 };

export interface DifficultyPreset {
  /** Bölüm başına yeni kelime. Az = çok tekrar, çok = hızlı ilerleme. */
  fresh: number;
  /** Mod rampasında kaç kademe ileri başlanır (yazma/dinleme daha erken). */
  shift: number;
  /** Geçme eşiğine eklenen puan. */
  pass: number;
}

/**
 * Kullanıcının listeye verdiği zorluk → kampanya ayarları.
 *
 * Üçü de tek yerden yönetiliyor: ayarlar ekranındaki "≈ N bölüm" tahmini,
 * yol haritası ve oturum aynı sayıları görsün diye. `levels.ts` içinde
 * duruyor çünkü `campaignPlan` ile aynı varsayılanları paylaşıyor; ayrı bir
 * dosyaya taşımak, tarayıcı dışında (audit betiği) çalışırken uzantısız
 * import sorunu çıkarıyordu.
 */
export const DIFFICULTY: Record<ListDifficulty, DifficultyPreset> = {
  // Kolay: az yeni kelime, bol tekrar, tanıma ağırlıklı, alçak eşik.
  easy: { fresh: 6, shift: 0, pass: -0.1 },
  // Orta: bankanın ölçülmüş dengesi (8 yeni / 15 soru).
  normal: { fresh: 8, shift: 0, pass: 0 },
  // Zor: çok yeni kelime, rampa 2 kademeden başlar, yüksek eşik.
  hard: { fresh: 10, shift: 2, pass: 0.1 },
};

export function campaignOptionsFor(difficulty: ListDifficulty | undefined): CampaignOptions {
  const preset = DIFFICULTY[difficulty ?? 'normal'] ?? DIFFICULTY.normal;
  return {
    ...DEFAULT_CAMPAIGN,
    freshPerLevel: preset.fresh,
    rampShift: preset.shift,
    passDelta: preset.pass,
  };
}

/** Bölüm türü: 40'lık döngü — 10/30 mini, 20 zor, 40 final. */
export function levelKind(id: number): LevelKind {
  if (id % 40 === 0) return 'final';
  if (id % 20 === 0) return 'hard';
  if (id % 10 === 0) return 'mini';
  return 'normal';
}

/**
 * Bant başına kaç bölüm: 200 kelime / 8 yeni ≈ 25 bölüm.
 *
 * Alt sınır 1: kullanıcının kendi listesi 40 kelimeyse bant başına 1 bölüm
 * düşer ve kampanya 6 bölüm olur. Eskiden alt sınır 4'tü, küçük listelerde
 * bölümler 1-2 kelimeyle açılıyordu.
 */
export function levelsInBand(bandSize: number, freshPerLevel = DEFAULT_CAMPAIGN.freshPerLevel): number {
  return Math.min(40, Math.max(1, Math.round(bandSize / freshPerLevel)));
}

const KIND_WEIGHT: Record<LevelKind, number> = {
  normal: 1,
  mini: 0.6,
  hard: 0.45,
  final: 0.3,
};

/** 1. bölüm tanışma bölümüdür: tekrar yuvası yok, 15 kelimenin hepsi yeni. */
const TUTORIAL_WEIGHT = 1.95;

const PASS: Record<LevelKind, number> = {
  normal: 0.7,
  mini: 0.8,
  hard: 0.9,
  final: 0.9,
};

/** Ağırlıklı paylaştırma: toplam tam olarak `total` olur, artık en büyük kesirlere gider. */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    out[i] += 1;
    rest -= 1;
  }
  return out;
}

/**
 * Normal bölümlerde mod dağılımı: her bölüm aynı değil, sırayla dönen arketipler.
 * 0–2 tanıma (kart, test, eşleştirme, dinleme), 3–4 üretim (yazma, dinleme).
 */
const ARCHETYPES: { mode: UnitMode; share: number }[][] = [
  [
    { mode: 'cards', share: 0.5 },
    { mode: 'quiz', share: 0.5 },
  ],
  [
    { mode: 'quiz', share: 0.4 },
    { mode: 'match', share: 0.5 },
    { mode: 'quiz', share: 0.1 },
  ],
  [
    { mode: 'listen', share: 0.6 },
    { mode: 'quiz', share: 0.4 },
  ],
  [
    { mode: 'cards', share: 0.4 },
    { mode: 'type', share: 0.4 },
    { mode: 'quiz', share: 0.2 },
  ],
  [
    { mode: 'type', share: 0.5 },
    { mode: 'listen', share: 0.3 },
    { mode: 'cards', share: 0.2 },
  ],
];

interface BandRamp {
  /** Bölüm içinde sırayla dönen arketipler. */
  fresh: number[];
  /** Isınma tekrarının modu: bölüm indeksine göre döner. */
  warm: UnitMode[];
  /** Eski hata ve sürpriz tekrarının modu. */
  callback: UnitMode;
  surprise: UnitMode;
  /** Boss bölümlerde yeni kelimelerin ne kadarı yazdırılır (0–1). */
  prod: number;
}

/**
 * Mod rampası: kademe yükseldikçe soru tipi de zorlaşır.
 *
 * 1–2 yalnızca tanıma (kart/test/eşleştirme, 2'de bir bölüm dinleme), 3–4
 * dinleme düzenli hâle gelir ve yazma başlar, 5–6 üretim ağırlıklıdır. Ramp
 * yalnızca yeni kelimelere değil tekrar yuvalarına ve boss bölümlere de uygulanır:
 * aksi hâlde 6. kademede bile tekrarlar test olarak kalıp üretim payını eziyordu.
 */
const RAMP: BandRamp[] = [
  // kademe 1 — tanışma: kart + test
  { fresh: [0, 1, 0, 1], warm: ['quiz'], callback: 'quiz', surprise: 'quiz', prod: 0 },
  // kademe 2 — dinleme ilk kez, beş bölümde bir
  { fresh: [0, 1, 0, 1, 2], warm: ['quiz'], callback: 'quiz', surprise: 'quiz', prod: 0.1 },
  // kademe 3 — dinleme düzenli, yazma henüz yok
  { fresh: [0, 2, 1, 2, 0], warm: ['quiz', 'quiz', 'listen'], callback: 'quiz', surprise: 'quiz', prod: 0.25 },
  // kademe 4 — yazma girer, tekrarlarda da denenir
  { fresh: [2, 3, 1, 2, 3], warm: ['quiz', 'quiz', 'listen'], callback: 'type', surprise: 'quiz', prod: 0.45 },
  // kademe 5 — üretim ağırlıklı
  { fresh: [3, 4, 2, 3, 4], warm: ['listen', 'quiz'], callback: 'type', surprise: 'listen', prod: 0.7 },
  // kademe 6 — üretim baskın
  { fresh: [4, 4, 3, 4, 2], warm: ['type', 'listen', 'quiz'], callback: 'type', surprise: 'type', prod: 0.8 },
];

function rampFor(band: number): BandRamp {
  return RAMP[Math.min(RAMP.length, Math.max(1, band)) - 1];
}

function reviewSplit(review: number): { warm: number; callback: number; surprise: number } {
  const surprise = review >= 4 ? 1 : 0;
  const callback = review >= 3 ? 1 : 0;
  return { warm: Math.max(0, review - surprise - callback), callback, surprise };
}

function buildUnits(
  kind: LevelKind,
  fresh: number,
  indexInBand: number,
  questions: number,
  rampBand = 1,
): LevelUnit[] {
  const units: LevelUnit[] = [];

  if (kind === 'normal') {
    // İlk bölümde tekrar edilecek kelime yok: tanışma bölümü, hepsi yeni.
    if (fresh >= questions) {
      const cards = Math.min(fresh, Math.round(fresh * 0.5));
      return [
        { mode: 'cards', pool: 'fresh', count: cards },
        { mode: 'quiz', pool: 'fresh', count: fresh - cards },
      ];
    }
    const review = Math.max(2, questions - fresh);
    const ramp = rampFor(rampBand);
    const arch = ARCHETYPES[ramp.fresh[indexInBand % ramp.fresh.length]];
    const parts = allocate(fresh, arch.map((a) => a.share));

    arch.forEach((a, i) => {
      let mode = a.mode;
      // Eşleştirme 3 kartın altında oynanamaz; o zaman teste dönüşür.
      if (mode === 'match' && parts[i] < 3) mode = 'quiz';
      if (parts[i] > 0) units.push({ mode, pool: 'fresh', count: parts[i] });
    });

    const split = reviewSplit(review);
    const warmMode = ramp.warm[indexInBand % ramp.warm.length];
    if (split.warm) units.push({ mode: warmMode, pool: 'warm', count: split.warm });
    if (split.callback) units.push({ mode: ramp.callback, pool: 'callback', count: split.callback });
    if (split.surprise) units.push({ mode: ramp.surprise, pool: 'surprise', count: split.surprise });
    return units;
  }

  // Boss'lar sınavdır: kart/eşleştirme yok, üretim (yazma/dinleme) ağırlıklı.
  const total = kind === 'final' ? FINAL_QUESTIONS : questions;
  const review = total - fresh;
  const split = reviewSplit(review);

  if (kind === 'final') {
    units.push({ mode: 'type', pool: 'fresh', count: fresh });
    if (split.warm) units.push({ mode: 'quiz', pool: 'warm', count: split.warm });
    if (split.callback) units.push({ mode: 'listen', pool: 'callback', count: split.callback });
    if (split.surprise) units.push({ mode: 'type', pool: 'surprise', count: split.surprise });
    return units;
  }

  // Yazma payı da rampadan gelir: 1. kademedeki bir boss, tanımadığı kelimeyi
  // yazdırmaz; 6. kademedeki boss yeni kelimelerin çoğunu yazdırır.
  const typed = Math.min(fresh, Math.max(0, Math.round(fresh * rampFor(rampBand).prod)));
  const quizzed = fresh - typed;
  if (quizzed > 0) units.push({ mode: 'quiz', pool: 'fresh', count: quizzed });
  if (typed > 0) units.push({ mode: 'type', pool: 'fresh', count: typed });

  const listen = kind === 'hard' ? Math.max(1, Math.round(review * 0.25)) : 0;
  if (split.warm) units.push({ mode: 'quiz', pool: 'warm', count: Math.max(0, split.warm - listen) });
  if (listen) units.push({ mode: 'listen', pool: 'warm', count: listen });
  if (split.callback) units.push({ mode: 'quiz', pool: 'callback', count: split.callback });
  if (split.surprise) units.push({ mode: 'quiz', pool: 'surprise', count: split.surprise });
  return units;
}

/** Bantlardan bölüm listesi. Kelime sayısı azsa kampanya kendiliğinden kısalır. */
export function campaignPlan(
  bands: string[][],
  opts: CampaignOptions = DEFAULT_CAMPAIGN,
): LevelDef[] {
  const levels: LevelDef[] = [];
  const shift = opts.rampShift ?? 0;
  const delta = opts.passDelta ?? 0;
  let id = 0;

  bands.forEach((bandWords, b) => {
    const n = levelsInBand(bandWords.length, opts.freshPerLevel);
    const kinds: LevelKind[] = Array.from({ length: n }, (_, i) => levelKind(id + i + 1));
    const freshCounts = allocate(
      bandWords.length,
      kinds.map((k, i) => (id + i + 1 === 1 ? TUTORIAL_WEIGHT : KIND_WEIGHT[k])),
    );

    // 1. bölüm tam olarak bir bölümlük kelime alır; artanı 2. bölüme kayar.
    if (b === 0 && freshCounts[0] > opts.questions) {
      const overflow = freshCounts[0] - opts.questions;
      freshCounts[0] = opts.questions;
      freshCounts[1] += overflow;
    }

    const rampBand = Math.min(RAMP.length, Math.max(1, b + 1 + shift));

    let start = 0;
    kinds.forEach((kind, i) => {
      id += 1;
      const fresh = freshCounts[i];
      levels.push({
        id,
        band: b + 1,
        kind,
        indexInBand: i,
        freshStart: start,
        fresh,
        units: buildUnits(kind, fresh, i, opts.questions, rampBand),
        total: kind === 'final' ? FINAL_QUESTIONS : opts.questions,
        passPct: Math.min(0.9, Math.max(0.4, PASS[kind] + delta)),
        relax: kind === 'normal' ? 1 : 0.5,
        rampBand,
      });
      start += fresh;
    });
  });

  return levels;
}

export function levelById(plan: LevelDef[], id: number): LevelDef | undefined {
  return plan.find((l) => l.id === id);
}

/* ------------------------------------------------------------- soğuma */

export type { LevelProgress };

/**
 * Bir kelimenin kaç bölüm arayla geri gelebileceği.
 *
 * "Ne zırt pırt gelsin ne de komple silinsin" kuralının sayıya dökülmüş hâli:
 * yanlış yapılan kelime hemen, yeni öğrenilen 2–3 bölüm sonra, oturmuş kelime
 * 6 bölüm sonra, ustalaşmış kelime ancak 10 bölüm sonra sürpriz olarak döner.
 * Hiçbir kelime kalıcı olarak dışlanmaz; üst sınır yok, sadece taban var.
 */
export function gapNeeded(box: number, bad: number): number {
  if (bad > 0 && box <= 1) return 1;
  if (box <= 1) return 2;
  if (box === 2) return 3;
  if (box === 3) return 4;
  if (box === 4) return 6;
  return 10;
}

/** Aynı kelime, yanlış yapılmadıysa 3 bölümden kısa arayla iki kez gelmez. */
export const MIN_PREV_GAP = 3;

export function eligible(
  level: number,
  stat: LevelProgress | undefined,
  rec: SrsRec | undefined,
  relax = 1,
): boolean {
  if (!stat) return false;
  const gap = level - stat.last;
  if (gap < 1) return false;
  const need = Math.max(1, Math.round(gapNeeded(rec?.box ?? 0, rec?.bad ?? 0) * relax));
  if (gap < need) return false;
  if (need > 1 && stat.last - stat.prev < MIN_PREV_GAP) return false;
  return true;
}

/* --------------------------------------------------------------- rastgelelik */

/** mulberry32 — aynı bölüm + aynı deneme her zaman aynı soruları üretir. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface LevelSelection {
  fresh: string[];
  warm: string[];
  callback: string[];
  surprise: string[];
}

export interface SelectContext {
  bands: string[][];
  progress: Record<string, LevelProgress>;
  srs: Record<string, SrsRec>;
  /** Aynı bölümün ikinci denemesi farklı sırada gelsin diye. */
  attempt?: number;
  /** Uyarlama: bu bölümde kaç yeni kelime verilecek. Verilmezse plan hedefi. */
  freshCount?: number;
}

interface Candidate {
  key: string;
  gap: number;
  box: number;
  bad: number;
  rev: number;
}

/**
 * Bir bölümün kelimelerini seçer.
 *
 * Öncelik sırası: eski hata → sürpriz → ısınma. Havuz boşsa sıradaki havuzdan
 * doldurulur; hiç yoksa (yerleştirme testiyle ileri bir bölümden başlayan
 * kullanıcı) geriye dönük bantlardan, o da yoksa yeni kelimelerden tamamlanır.
 * Böylece bölüm asla eksik açılmaz.
 */
export function selectLevel(def: LevelDef, ctx: SelectContext): LevelSelection {
  const rnd = seeded(def.id * 7919 + (ctx.attempt ?? 1) * 104729);
  /*
   * Yeni kelimeler bandın "görülmemiş" kuyruğundan alınır, sabit bir dilimden
   * değil. Böylece uyarlama (bir bölümde 6, başkasında 9 kelime) hiçbir kelimeyi
   * atlamaz: kuyruk kendini toparlar.
   */
  const freshWanted = Math.max(0, ctx.freshCount ?? def.fresh);
  const freshPicked = (ctx.bands[def.band - 1] ?? [])
    .filter((k) => !ctx.progress[k])
    .slice(0, freshWanted);
  /*
   * Kelime kümesi müfredat gereği sabit (bandın sıradaki görülmemişleri),
   * ama sunum sırası her açılışta değişir. Sabit tohumla sıra da sabit
   * kalıyordu: aynı bölüm tekrar oynandığında ekran birebir aynı oluyordu.
   */
  const fresh = shuffle(freshPicked, Math.random);

  const reviewUnits = buildUnits(def.kind, fresh.length, def.indexInBand, def.total, def.rampBand);
  const want: Record<Pool, number> = { fresh: 0, warm: 0, callback: 0, surprise: 0 };
  for (const u of reviewUnits) want[u.pool] += u.count;

  const cands: Candidate[] = [];
  for (const key of Object.keys(ctx.progress)) {
    const stat = ctx.progress[key];
    if (!eligible(def.id, stat, ctx.srs[key], def.relax)) continue;
    cands.push({
      key,
      gap: def.id - stat.last,
      box: ctx.srs[key]?.box ?? 0,
      bad: ctx.srs[key]?.bad ?? 0,
      rev: stat.rev ?? 0,
    });
  }

  const used = new Set(fresh);
  const take = (list: Candidate[], n: number): string[] => {
    const out: string[] = [];
    for (const c of list) {
      if (out.length >= n) break;
      if (used.has(c.key)) continue;
      used.add(c.key);
      out.push(c.key);
    }
    return out;
  };

  // Eşit öncelikler arasında sıra her denemede değişsin, ama seçim adil kalsın.
  const shuffled = shuffle(cands, rnd);
  // Hiç tekrar görmemiş kelime, "çok gecikmiş" kelimeden önce gelir; yoksa
  // aynı birkaç kelime dönüp durur ve bankanın yarısı hiç tekrar görmez.
  const byOverdue = shuffled.slice().sort((a, b) => {
    if ((a.rev === 0) !== (b.rev === 0)) return a.rev === 0 ? -1 : 1;
    return (
      b.gap / Math.max(1, gapNeeded(a.box, a.bad)) - a.gap / Math.max(1, gapNeeded(b.box, b.bad))
    );
  });
  const byBad = shuffled.slice().sort((a, b) => b.bad - a.bad || b.gap - a.gap);
  const byGap = shuffled.slice().sort((a, b) => b.gap - a.gap);

  const callback = take(byBad.filter((c) => c.bad > 0), want.callback);
  const surprise = take(byGap.filter((c) => c.box >= 4), want.surprise);
  const warm = take(byOverdue.filter((c) => c.box <= 3), want.warm);

  /*
   * Hiç tekrar adayı yoksa (2. bölüm: 1. bölümün kelimeleri henüz soğumadı)
   * bölüm eksik açılıyordu — yol haritası "15 soru" diyor, oturum 10 soru
   * gösteriyordu. Tekrar yuvası boşken açık, kelimeyi *yeni* havuzuna
   * eklemektir: kelime böylece tanıtım (kart/test) olarak gelir, tekrar
   * sorusu gibi "görüldü" işaretlenip kuyruktan düşmez.
   */
  if (!warm.length && !callback.length && !surprise.length && fresh.length < def.total) {
    const extra = (ctx.bands[def.band - 1] ?? [])
      .filter((k) => !ctx.progress[k] && !used.has(k))
      .slice(0, def.total - fresh.length);
    fresh.push(...extra);
  }

  // Yedek: sırasıyla diğer havuzlar, geriye dönük bantlar, en son kendi bandı.
  const fill = (have: string[], n: number): string[] => {
    const out = have.slice();
    if (out.length >= n) return out;
    out.push(...take(byOverdue, n - out.length));
    if (out.length >= n) return out;

    // Yerleştirme testiyle ileri bir bölümden başlayan kullanıcı: geriye dönük
    // bantlardan hiç görülmemiş kelimelerle doldur. Görülmüşleri karıştırma,
    // yoksa soğuma kuralı delinebilir.
    const older = ctx.bands.slice(0, def.band - 1).flat().filter((k) => !ctx.progress[k]);
    out.push(...take(shuffle(older, rnd).map((key) => ({ key, gap: 99, box: 0, bad: 0, rev: 0 })), n - out.length));
    /*
     * Kendi bandından "görülmemiş" kelimeyi buraya koymak yanlıştı: kelime
     * tekrar sorusu olarak gösterilip "görüldü" işaretleniyor, sonra yeni
     * kelime kuyruğundan düşüyordu. Havuz boşsa bölüm kısa açılır.
     */
    return out;
  };

  return {
    fresh,
    warm: fill(warm, want.warm),
    callback: fill(callback, want.callback),
    surprise: fill(surprise, want.surprise),
  };
}

export interface PlannedUnit {
  mode: UnitMode;
  pool: Pool;
  keys: string[];
}

/** Seçimi bölümün birim sırasına yayar: ekranın doğrudan tüketebileceği biçim. */
export function expandUnits(def: LevelDef, sel: LevelSelection): PlannedUnit[] {
  const pools: Record<Pool, string[]> = {
    fresh: sel.fresh.slice(),
    warm: sel.warm.slice(),
    callback: sel.callback.slice(),
    surprise: sel.surprise.slice(),
  };
  const out: PlannedUnit[] = [];
  // Birimler seçimin gerçek sayılarından kurulur: yeni kelime sayısı uyarlamayla
  // değişebilir, plan ise yalnızca hedefi tutar.
  for (const unit of buildUnits(def.kind, sel.fresh.length, def.indexInBand, def.total, def.rampBand)) {
    const keys = pools[unit.pool].splice(0, unit.count);
    if (keys.length) out.push({ mode: unit.mode, pool: unit.pool, keys });
  }
  return out;
}

/** Can yalnızca yeni kelimede gider: tekrar sorusunda hata can yakmaz. */
export function costsLife(pool: Pool): boolean {
  return pool === 'fresh';
}
