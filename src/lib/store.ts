import { useSyncExternalStore } from 'react';
import type {
  AppState,
  CampaignProgress,
  CustomWord,
  ListDifficulty,
  Mode,
  Settings,
  SessionLog,
  WordList,
} from '../types';
import { WORDS } from '../data/words';
import {
  applyXp,
  badgeStats,
  dailyChallengeKey,
  newlyEarned,
  registerBaseWords,
  reviewRec,
  todayStr,
  xpGainFor,
} from './engine';
import { toast } from './toast';
import { detectLang, makeT } from './i18n';
import { getRoute } from './router';
import { getActiveLevel } from './campaign';

registerBaseWords(WORDS);

const KEY = 'vs2:state';

export const DEFAULT_SETTINGS: Settings = {
  lang: detectLang(),
  theme: 'auto',
  accent: 'marker',
  sound: true,
  haptics: true,
  calm: false,
  goal: 20,
  dict: true,
  weekly: 5,
  cap: 24,
  pron: 'wikimedia',
  snaps: true,
  study: { direction: 'mixed', source: 'smart', length: 10 },
};

function emptyCampaign(): CampaignProgress {
  return { level: 1, stars: {}, words: {} };
}

export function defaultState(): AppState {
  const iso = todayStr();
  return {
    version: 3,
    onboarded: false,
    settings: { ...DEFAULT_SETTINGS, study: { ...DEFAULT_SETTINGS.study } },
    xp: 0,
    level: 1,
    streak: 0,
    lastStudy: null,
    streakDays: [],
    daily: { date: iso, count: 0, xp: 0 },
    srs: {},
    badges: [],
    stats: {
      bestCombo: 0,
      totalOk: 0,
      totalBad: 0,
      perfectMatches: 0,
      perfectSessions: 0,
      modeCounts: {},
      sessions: [],
      bestSession: null,
      totalTimeSec: 0,
    },
    notes: {},
    lists: [],
    activeList: 'default',
    customWords: [],
    campaign: { default: emptyCampaign() },
    challenge: { date: iso, wordKey: dailyChallengeKey(iso), done: false, won: false },
    lastSession: null,
    recentBadges: [],
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------- yükleme */

/** Eski kayıtlarda (v3 öncesi) zorluk yok: "orta" varsayılır. */
function normalizeDifficulty(raw: unknown): ListDifficulty {
  return raw === 'easy' || raw === 'hard' || raw === 'normal' ? raw : 'normal';
}

function normalizeList(l: WordList): WordList {
  return {
    id: l.id,
    name: l.name || 'Listem',
    createdAt: typeof l.createdAt === 'number' ? l.createdAt : Date.now(),
    difficulty: normalizeDifficulty(l.difficulty),
  };
}

function revive(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  // v2 → v3: kampanya eklendi. Eski ilerleme (SRS, XP, ayarlar) korunur.
  const version = (raw as { version?: number }).version;
  if (version !== 2 && version !== 3) return base;

  return {
    ...base,
    ...r,
    settings: {
      ...base.settings,
      ...(r.settings ?? {}),
      study: { ...base.settings.study, ...(r.settings?.study ?? {}) },
    },
    daily: { ...base.daily, ...(r.daily ?? {}) },
    stats: {
      ...base.stats,
      ...(r.stats ?? {}),
      modeCounts: { ...(r.stats?.modeCounts ?? {}) },
      sessions: Array.isArray(r.stats?.sessions) ? r.stats!.sessions.slice(0, 40) : [],
    },
    srs: r.srs ?? {},
    notes: r.notes ?? {},
    badges: Array.isArray(r.badges) ? r.badges : [],
    lists: Array.isArray(r.lists) ? r.lists.filter(Boolean).map(normalizeList) : [],
    customWords: Array.isArray(r.customWords) ? r.customWords : [],
    streakDays: Array.isArray(r.streakDays) ? r.streakDays : [],
    recentBadges: [],
    campaign: reviveCampaign(r.campaign),
    challenge: r.challenge ?? base.challenge,
  };
}

function reviveCampaign(raw: AppState['campaign'] | undefined): AppState['campaign'] {
  if (!raw || typeof raw !== 'object' || !raw.default) return { default: emptyCampaign() };
  const out: AppState['campaign'] = {};
  for (const [id, p] of Object.entries(raw)) {
    /*
     * `comfort` burada taşınmak zorunda: uyarlama (bir bölümde 6, başkasında 9
     * yeni kelime) bu sayının üstünde duruyor. Önce yalnızca level/stars/words
     * kopyalanıyordu, yani her sayfa yenilenmesinde uyarlama 0.8'e sıfırlanıyor
     * ve kullanıcı bir daha geri dönüş göremiyordu.
     */
    const comfort =
      typeof p?.comfort === 'number' && Number.isFinite(p.comfort)
        ? Math.min(1, Math.max(0, p.comfort))
        : undefined;
    out[id] = {
      level: Math.max(1, Math.floor(p?.level ?? 1)),
      stars: p?.stars && typeof p.stars === 'object' ? p.stars : {},
      words: p?.words && typeof p.words === 'object' ? p.words : {},
      ...(comfort === undefined ? {} : { comfort }),
    };
  }
  if (!out.default) out.default = emptyCampaign();
  return out;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return revive(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

// Açılışta rozetleri yeniden değerlendir: istatistikler ilerlemiş ama rozet
// yazılmamış olabilir (eski sürüm, elle düzenlenmiş yedek, içe aktarma).
let state: AppState = newlyEarned(load()).state;
const listeners = new Set<() => void>();

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function writeNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* kota dolu / gizli mod: uygulama çalışmaya devam eder */
  }
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(writeNow, 320);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', writeNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') writeNow();
  });
}

function emit() {
  for (const l of listeners) l();
}

function commit(next: AppState) {
  state = { ...next, updatedAt: Date.now() };
  scheduleSave();
  emit();
}

export function getState(): AppState {
  return state;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Bütün durumu dinler. Uygulama küçük olduğu için tek abonelik yeterli ve öngörülebilir. */
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useSettings(): Settings {
  return useApp().settings;
}

/* ------------------------------------------------------------- eylemler */

export function setSettings(patch: Partial<Settings>) {
  commit({ ...state, settings: { ...state.settings, ...patch } });
}

export function setStudy(patch: Partial<Settings['study']>) {
  commit({
    ...state,
    settings: { ...state.settings, study: { ...state.settings.study, ...patch } },
  });
}

export function finishOnboarding(opts: {
  goal: number;
  accent: Settings['accent'];
  theme: Settings['theme'];
  lang: Settings['lang'];
}) {
  commit({
    ...state,
    onboarded: true,
    settings: {
      ...state.settings,
      goal: opts.goal,
      accent: opts.accent,
      theme: opts.theme,
      lang: opts.lang,
    },
  });
}

function touchDay(s: AppState): AppState {
  const iso = todayStr();
  if (s.lastStudy === iso) return s;
  const yesterday = s.lastStudy === null ? false : s.lastStudy === addDaysSafe(iso, -1);
  const streak = yesterday ? s.streak + 1 : 1;
  const days = [...s.streakDays.filter((d) => d !== iso), iso].slice(-40);
  return { ...s, streak, lastStudy: iso, streakDays: days };
}

function addDaysSafe(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate(),
  ).padStart(2, '0')}`;
}

export interface AnswerOutcome {
  xp: number;
  leveled: boolean;
  level: number;
  challengeWon: boolean;
  newBadges: string[];
}

/**
 * Tek bir cevabı işler: SRS, günlük hedef, seri, XP, kombo rekoru.
 * Kombo oturum içinde tutulur, buraya parametre olarak gelir.
 */
/**
 * Oturum sırasında rozet/seviye bildirimi gösterme: bildirim kutuları soruyu
 * ve seçenekleri kapatıyor. Bu kazanımlar özet ekranında zaten listeleniyor.
 */
function quiet(): boolean {
  return getRoute().name === 'study';
}

export function recordAnswer(
  wordKey: string,
  correct: boolean,
  mode: Mode,
  combo: number,
  direction?: 'tr-en' | 'en-tr' | 'syn' | 'mixed',
): AnswerOutcome {
  const iso = todayStr();
  let s = touchDay(state);

  const srs = { ...s.srs, [wordKey]: reviewRec(s.srs[wordKey], correct) };
  s = { ...s, srs };

  const dailyReset = s.daily.date !== iso;
  const daily = {
    date: iso,
    count: (dailyReset ? 0 : s.daily.count) + 1,
    xp: dailyReset ? 0 : s.daily.xp,
  };
  s = { ...s, daily };

  const stats = {
    ...s.stats,
    totalOk: s.stats.totalOk + (correct ? 1 : 0),
    totalBad: s.stats.totalBad + (correct ? 0 : 1),
    bestCombo: correct ? Math.max(s.stats.bestCombo, combo) : s.stats.bestCombo,
    modeCounts: {
      ...s.stats.modeCounts,
      [mode]: (s.stats.modeCounts[mode] ?? 0) + (correct ? 1 : 0),
      ...(mode === 'quiz' && direction === 'tr-en'
        ? { 'tr-en': (s.stats.modeCounts['tr-en'] ?? 0) + (correct ? 1 : 0) }
        : {}),
    },
  };
  s = { ...s, stats };

  let gain = xpGainFor(combo, correct);
  let challengeWon = false;
  if (
    correct &&
    !s.challenge.done &&
    s.challenge.wordKey === wordKey &&
    s.challenge.date === iso
  ) {
    gain += 20;
    challengeWon = true;
    s = { ...s, challenge: { ...s.challenge, done: true, won: true } };
  }

  const lvl = applyXp(s.xp, s.level, gain);
  s = { ...s, xp: lvl.xp, level: lvl.level, daily: { ...daily, xp: daily.xp + gain } };

  const earned = newlyEarned(s);
  s = {
    ...earned.state,
    recentBadges: [
      ...new Set([...earned.state.recentBadges, ...earned.won.map((b) => b.id)]),
    ],
  };

  /*
   * Bölüm oturumundaysa kelimenin soğuma işareti cevapla birlikte yazılır.
   * İşaret bölüm açılışında konduğunda, hiç cevap vermeden çıkılan bölümün
   * yeni kelimeleri "görüldü" sayılıyor ve bir daha yeni olarak gelmiyordu.
   */
  const active = getActiveLevel();
  if (active) s = markWordSeen(s, s.activeList, active.id, wordKey);

  commit(s);
  const tr = makeT(s.settings.lang);
  if (!quiet() && lvl.leveled) {
    toast(`${tr('toast.level', { n: lvl.level })} ${tr('toast.levelSub')}`, 'level');
  }
  if (!quiet()) for (const b of earned.won) toast(tr('toast.badge', { n: b.name }), 'badge');

  return {
    xp: gain,
    leveled: lvl.leveled,
    level: lvl.level,
    challengeWon,
    newBadges: earned.won.map((b) => b.id),
  };
}

export function awardXp(amount: number) {
  const lvl = applyXp(state.xp, state.level, amount);
  commit({ ...state, xp: lvl.xp, level: lvl.level });
  if (!quiet() && lvl.leveled) {
    toast(makeT(state.settings.lang)('toast.level', { n: lvl.level }), 'level');
  }
  return lvl;
}

export function finishSession(log: Omit<SessionLog, 'id' | 'date'>) {
  let s = state;
  const iso = todayStr();
  const prev = s.stats.bestSession;
  const full: SessionLog = {
    ...log,
    id: `s${Date.now().toString(36)}`,
    date: Date.now(),
  };

  const isBest =
    !prev ||
    full.accuracy > prev.accuracy ||
    (full.accuracy === prev.accuracy && full.correct > prev.correct);

  const stats = {
    ...s.stats,
    sessions: [full, ...s.stats.sessions].slice(0, 40),
    bestSession: isBest ? full : prev,
    perfectSessions: s.stats.perfectSessions + (full.perfect ? 1 : 0),
    totalTimeSec: s.stats.totalTimeSec + full.timeSec,
  };
  s = { ...s, stats, lastSession: full, challenge: { ...s.challenge } };

  if (s.challenge.date !== iso) {
    s = { ...s, challenge: { date: iso, wordKey: dailyChallengeKey(iso), done: false, won: false } };
  }

  // Oturum sonu bonusu: uzun ve hatasız turlar için.
  if (full.perfect && full.total >= 8) {
    const lvl = applyXp(s.xp, s.level, 30);
    s = { ...s, xp: lvl.xp, level: lvl.level };
  }

  const earned = newlyEarned(s);
  s = {
    ...earned.state,
    recentBadges: [
      ...new Set([...earned.state.recentBadges, ...earned.won.map((b) => b.id)]),
    ],
  };
  commit(s);
  if (!quiet()) for (const b of earned.won) toast(makeT(s.settings.lang)('toast.badge', { n: b.name }), 'badge');
}

export function startSession() {
  if (state.recentBadges.length) commit({ ...state, recentBadges: [] });
}

export function setNote(key: string, text: string) {
  const notes = { ...state.notes };
  if (text.trim()) notes[key] = text.trim();
  else delete notes[key];
  commit({ ...state, notes });
}

export function createList(
  name: string,
  text: string,
  difficulty: ListDifficulty = 'normal',
): { id: string; count: number } {
  const id = `l${Date.now().toString(36)}`;
  const list: WordList = {
    id,
    name: name.trim() || 'Listem',
    createdAt: Date.now(),
    difficulty: normalizeDifficulty(difficulty),
  };
  const parsed = parseList(text).map<CustomWord>((p) => ({
    ...p,
    key: p.w.toLowerCase(),
    listId: id,
    custom: true,
  }));
  const seen = new Set<string>();
  const unique = parsed.filter((p) => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
  commit({
    ...state,
    lists: [...state.lists, list],
    customWords: [...state.customWords, ...unique],
  });
  return { id, count: unique.length };
}

export function parseList(text: string): { w: string; pos: string; syn: string; tr: string }[] {
  const out: { w: string; pos: string; syn: string; tr: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith('#')) continue;

    let parts = raw.split(/\s*[|;\t]\s*/).filter(Boolean);
    if (parts.length === 1) {
      const m = raw.match(/^(.+?)\s*(?:=|—|–|-|:)\s*(.+)$/);
      if (m) parts = [m[1].trim(), m[2].trim()];
    }
    if (parts.length < 2) continue;

    let w = parts[0].trim();
    let pos = '';
    const pm = w.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (pm) {
      w = pm[1].trim();
      pos = pm[2].trim();
    }

    let syn = '';
    let tr = '';
    if (parts.length >= 4) {
      pos = pos || parts[1].trim();
      syn = parts[2].trim();
      tr = parts[3].trim();
    } else if (parts.length === 3) {
      pos = pos || (/^(n|v|adj|adv)$/i.test(parts[1].trim()) ? parts[1].trim() : '');
      if (pos && pos !== parts[1].trim()) {
        syn = parts[1].trim();
        tr = parts[2].trim();
      } else if (pos) {
        tr = parts[2].trim();
      } else {
        syn = parts[1].trim();
        tr = parts[2].trim();
      }
    } else {
      tr = parts[1].trim();
    }

    if (!w || !tr) continue;
    out.push({ w, pos: pos || 'n', syn, tr });
  }
  return out;
}

export function deleteList(id: string) {
  commit({
    ...state,
    lists: state.lists.filter((l) => l.id !== id),
    customWords: state.customWords.filter((w) => w.listId !== id),
    activeList: state.activeList === id ? 'default' : state.activeList,
  });
}

export function setActiveList(id: string) {
  commit({ ...state, activeList: id });
}

/**
 * Listenin zorluğunu değiştirir.
 *
 * Zorluk kampanyanın planını değiştirdiği için bölüm sayısı da değişebilir;
 * mevcut ilerleme (yıldızlar, kelime geçmişi) korunur, yalnızca işaretçi
 * yeni planın sınırına çekilir. Sınırı bilen taraf (yol ekranı) kırpmayı
 * `setCampaignLevel` ile yapar.
 */
export function setListDifficulty(id: string, difficulty: ListDifficulty) {
  commit({
    ...state,
    lists: state.lists.map((l) =>
      l.id === id ? { ...l, difficulty: normalizeDifficulty(difficulty) } : l,
    ),
  });
}

/** Kampanya işaretçisini verilen bölüme çeker (plan kısaldığında). */
export function setCampaignLevel(listId: string, level: number) {
  const cur = campaignFor(listId);
  const next = Math.max(1, Math.floor(level));
  if (cur.level === next) return;
  commit({ ...state, campaign: { ...state.campaign, [listId]: { ...cur, level: next } } });
}

/* ------------------------------------------------------------- kampanya */

export function campaignFor(listId: string): CampaignProgress {
  return state.campaign[listId] ?? { level: 1, stars: {}, words: {} };
}

/**
 * Bir kelimenin soğuma işaretini bölüm ilerlemesine yazar.
 *
 * İşaret bölüm *açılırken* değil, kelime *cevaplanırken* konur. Açılışta
 * işaretlemek, bölümü açıp hiç cevap vermeden çıkan kullanıcının yeni
 * kelimelerini "görülmüş" sayıyordu: o kelimeler bir daha hiç "yeni" olarak
 * gelmiyor, ileride tanımadığı hâlde tekrar sorusu olarak çıkıyordu.
 */
function markWordSeen(s: AppState, listId: string, levelId: number, key: string): AppState {
  const cur = s.campaign[listId] ?? { level: 1, stars: {}, words: {} };
  const prev = cur.words[key];
  if (prev && prev.last === levelId) return s;
  return {
    ...s,
    campaign: {
      ...s.campaign,
      [listId]: {
        ...cur,
        words: { ...cur.words, [key]: { last: levelId, prev: prev ? prev.last : -99, rev: prev?.rev ?? 0 } },
      },
    },
  };
}

/** Bölüm bitince yıldız ve sıradaki bölüm yazılır. */
export function recordLevelResult(
  listId: string,
  levelId: number,
  stars: number,
  pass: boolean,
  accuracy = 0.8,
) {
  if (!pass) return;
  const cur = campaignFor(listId);
  const comfort = Math.min(1, Math.max(0, (cur.comfort ?? 0.8) * 0.65 + accuracy * 0.35));
  commit({
    ...state,
    campaign: {
      ...state.campaign,
      [listId]: {
        ...cur,
        level: Math.max(cur.level, levelId + 1),
        stars: { ...cur.stars, [levelId]: Math.max(cur.stars[levelId] ?? 0, stars) },
        comfort,
      },
    },
  });
}

export function markChallengeDone() {
  commit({ ...state, challenge: { ...state.challenge, done: true } });
}

export function exportBackup(): string {
  return JSON.stringify(
    {
      app: 'VocaStride',
      version: 3,
      exportedAt: new Date().toISOString(),
      state,
    },
    null,
    2,
  );
}

export function importBackup(text: string): { ok: boolean; message: string } {
  try {
    const parsed = JSON.parse(text) as { state?: { version?: number }; version?: number };
    const version = parsed.state?.version ?? parsed.version;
    const tr = makeT(state.settings.lang);
    if (version !== 2 && version !== 3) {
      return { ok: false, message: tr('toast.backupBad') };
    }
    const incoming = revive(parsed.state ?? parsed);
    if (!incoming || typeof incoming !== 'object') throw new Error('bad');
    commit({ ...incoming, onboarded: true, updatedAt: Date.now() });
    return { ok: true, message: makeT(incoming.settings.lang)('toast.backupOk') };
  } catch {
    return { ok: false, message: makeT(state.settings.lang)('toast.backupFail') };
  }
}

export function resetAll() {
  commit(defaultState());
}

export function getBadgeStats() {
  return badgeStats(state);
}

/* --------------------------------------------------- anlık görüntüler */

/** Yerel yedekler için ham durum. `autoSnapshot` bunu kullanır. */
export function serializeState(): string {
  return JSON.stringify(state);
}

export function restoreSnapshot(data: string): { ok: boolean; message: string } {
  const tr = makeT(state.settings.lang);
  try {
    const parsed = JSON.parse(data) as { version?: number };
    if (parsed.version !== 2 && parsed.version !== 3)
      return { ok: false, message: tr('toast.snapVersion') };
    const incoming = revive(parsed);
    commit({ ...incoming, onboarded: true, updatedAt: Date.now() });
    return { ok: true, message: tr('toast.snapOk') };
  } catch {
    return { ok: false, message: tr('toast.snapBad') };
  }
}
