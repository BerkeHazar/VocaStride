import type { Lang } from './lib/i18n';

export type ThemePref = 'auto' | 'light' | 'dark';
export type Accent = 'marker' | 'pink' | 'mint' | 'sun';
export type Mode =
  | 'quiz'
  | 'cards'
  | 'match'
  | 'speed'
  | 'listen'
  | 'type'
  | 'marathon'
  | 'review'
  | 'level';
export type Direction = 'tr-en' | 'en-tr' | 'syn' | 'mixed';
export type Source = 'smart' | 'due' | 'new' | 'weak' | 'all';

export interface Word {
  key: string;
  w: string;
  pos: string;
  syn: string;
  tr: string;
  custom?: boolean;
}

export interface DictEntry {
  ipa?: string;
  def?: string;
}

export interface SrsRec {
  box: number;
  due: number;
  seen: number;
  ok: number;
  bad: number;
  last: number;
}

export interface SessionLog {
  id: string;
  date: number;
  mode: Mode;
  correct: number;
  wrong: number;
  total: number;
  timeSec: number;
  xp: number;
  combo: number;
  perfect: boolean;
  accuracy: number;
  wrongKeys?: string[];
}

export interface CustomWord extends Word {
  listId: string;
  custom: true;
}

/** Bir kelimenin kampanyadaki görünüm geçmişi (soğuma hesabı için). */
export interface LevelProgress {
  /** En son göründüğü bölüm. */
  last: number;
  /** Ondan önceki görünüm; kümelemeyi engellemek için. */
  prev: number;
  /** Kaç kez tekrar sorusu olarak döndü. */
  rev?: number;
}

/** Liste başına kampanya ilerlemesi. */
export interface CampaignProgress {
  /** Sıradaki oynanabilir bölüm (1'den başlar). */
  level: number;
  /** Bölüm → kazanılan yıldız (1–3). */
  stars: Record<number, number>;
  /** Kelime → görünüm geçmişi. */
  words: Record<string, LevelProgress>;
  /**
   * Son bölümlerin doğruluğunun ortalaması (0–1). Bölüm başına yeni kelime
   * sayısı buna göre 2 aşağı veya 1 yukarı kayar.
   */
  comfort?: number;
}

/**
 * Kullanıcının listeye verdiği zorluk.
 *
 * Uygulama kelimeleri biçimsel olarak sıralayabiliyor ama "bu liste benim için
 * kolay/zor" bilgisini bilemez. Bu üç değer kampanyanın hızını (bölüm başına
 * yeni kelime), mod rampasının başlangıcını ve geçme eşiğini belirler.
 */
export type ListDifficulty = 'easy' | 'normal' | 'hard';

export interface WordList {
  id: string;
  name: string;
  createdAt: number;
  /** Liste oluşturulurken seçilir; sonradan değiştirilebilir. */
  difficulty: ListDifficulty;
}

export interface Settings {
  /** Arayüz dili; ilk kurulumda sorulur, cihaz dilinden tahmin edilir. */
  lang: Lang;
  theme: ThemePref;
  accent: Accent;
  sound: boolean;
  haptics: boolean;
  calm: boolean;
  goal: number;
  dict: boolean;
  /** Haftada kaç gün çalışmak istediği (3–7). Seri baskısı yerine ritim. */
  weekly: number;
  /** Bir turda en fazla kaç tekrar sorulur. */
  cap: number;
  /** Telaffuz kaynağı. Wikimedia varsayılan; cihaz sesi yedek. */
  pron: 'wikimedia' | 'device';
  /** Altı günde bir yerel anlık görüntü alınsın mı? */
  snaps: boolean;
  study: {
    direction: Direction;
    source: Source;
    /** Oturumdaki soru sayısı. `0` = sınırsız. */
    length: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tone: 'marker' | 'pink' | 'mint' | 'sun';
  goal: (s: BadgeStats) => number;
  value: (s: BadgeStats) => number;
}

export interface BadgeStats {
  totalOk: number;
  bestCombo: number;
  streak: number;
  level: number;
  dailyDone: number;
  dailyGoal: number;
  mastered: number;
  modeCounts: Record<string, number>;
  perfectMatches: number;
  perfectSessions: number;
}

export interface AppState {
  version: 3;
  onboarded: boolean;
  settings: Settings;
  xp: number;
  level: number;
  streak: number;
  lastStudy: string | null;
  streakDays: string[];
  daily: { date: string; count: number; xp: number };
  srs: Record<string, SrsRec>;
  badges: string[];
  stats: {
    bestCombo: number;
    totalOk: number;
    totalBad: number;
    perfectMatches: number;
    perfectSessions: number;
    modeCounts: Record<string, number>;
    sessions: SessionLog[];
    bestSession: SessionLog | null;
    totalTimeSec: number;
  };
  notes: Record<string, string>;
  lists: WordList[];
  activeList: string;
  customWords: CustomWord[];
  /** Liste id → kampanya ilerlemesi. Varsayılan banka 'default' anahtarındadır. */
  campaign: Record<string, CampaignProgress>;
  challenge: { date: string; wordKey: string; done: boolean; won: boolean };
  lastSession: SessionLog | null;
  recentBadges: string[];
  updatedAt: number;
}
