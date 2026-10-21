/**
 * Telaffuz — Wikimedia Commons.
 *
 * Sözlükteki her kelimenin sesi Wikimedia Commons'tan gelir. Kaynak dosyalar
 * çoğunlukla `En-us-*.ogg` (klasik US kayıtları) veya Lingua Libre'nin
 * `LL-Q1860 (eng)-<konuşan>-<kelime>.wav` dosyalarıdır. Ogg/Wav biçimleri her
 * tarayıcıda çalınmadığı için Wikimedia'nın ürettiği **mp3 dönüşümü** istenir;
 * böylece iOS dahil her cihazda tek biçim çalışır ve dosyalar ~15 KB kalır.
 *
 * Üç katmanlı önbellek:
 *   1. Bellek (Map) — aynı oturumda tekrar ağa çıkmaz.
 *   2. localStorage — çözümleme sonucu (URL + lisans) kalıcıdır.
 *   3. CacheStorage — sesin kendisi; çevrimdışıyken de çalar.
 *
 * Lisans: Commons dosyaları CC BY-SA / kamu malı olabilir. Bu yüzden her kayıt
 * konuşanın adını ve lisansı taşır; arayüz bunu kelime kartında gösterir.
 */

const API = 'https://commons.wikimedia.org/w/api.php';
const STORE = 'vs2:pron:v1';
const AUDIO_CACHE = 'vs-pron-audio-v1';
const MAX_AUDIO = 260;
const MISS_TTL = 30 * 86_400_000;
const MIN_GAP = 240;

export interface PronRecord {
  w: string;
  file: string;
  page: string;
  url: string;
  orig: string;
  mime: string;
  lic: string;
  by: string;
  at: number;
}

interface Miss {
  none: true;
  at: number;
}

type Entry = PronRecord | Miss;

/* --------------------------------------------------------------- depo */

let mem: Map<string, Entry> | null = null;

function readStore(): Map<string, Entry> {
  if (mem) return mem;
  mem = new Map();
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, Entry>;
      for (const [k, v] of Object.entries(obj)) mem.set(k, v);
    }
  } catch {
    /* bozuk kayıt: yok say */
  }
  return mem;
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

function writeStore() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const m = readStore();
    try {
      localStorage.setItem(STORE, JSON.stringify(Object.fromEntries(m)));
    } catch {
      /* kota dolu: ses yine de çalınır, yalnızca ipucu kaybolur */
    }
  }, 500);
}

/* --------------------------------------------------------------- kuyruk */

let chain: Promise<unknown> = Promise.resolve();
let urgentChain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

/**
 * Wikimedia'yı yormamak için istekler tek sırada ve aralıklı gider.
 *
 * İki sıra var. Ön hazırlık (prefetch) arka planda yürür; kullanıcının
 * "dinle"ye bastığı istek `urgent` gelir ve arka plan sırasını beklemez.
 * Tek sıra varken oturum açılışında 12 kelime hazırlanıyor, kullanıcı
 * düğmeye bastığında ses o sıranın sonuna düşüp saniyeler sonra geliyordu;
 * düğme çalışmıyor sanılıyordu.
 */
function schedule<T>(task: () => Promise<T>, urgent = false): Promise<T> {
  const base = urgent ? urgentChain : chain;
  const run = base.then(async () => {
    const gap = Date.now() - lastCall;
    if (gap < MIN_GAP) await new Promise((r) => setTimeout(r, MIN_GAP - gap));
    lastCall = Date.now();
    return task();
  });
  const settled = run.catch(() => undefined);
  if (urgent) urgentChain = settled;
  else chain = settled;
  return run;
}

async function api(params: Record<string, string>, tries = 2): Promise<unknown> {
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
  try {
    const res = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (res.status === 429 || res.status >= 500) {
      if (tries > 0) {
        await new Promise((r) => setTimeout(r, 1400));
        return api(params, tries - 1);
      }
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------- çözümleme */

interface ImageInfo {
  url?: string;
  mime?: string;
  extmetadata?: Record<string, { value?: string }>;
}

interface Page {
  title?: string;
  missing?: string;
  imageinfo?: ImageInfo[];
}

function pagesOf(json: unknown): Page[] {
  const q = (json as { query?: { pages?: Record<string, Page> } } | null)?.query;
  if (!q?.pages) return [];
  return Object.values(q.pages);
}

const EXT = /\.(ogg|oga|wav|mp3|flac|opus)$/i;

/**
 * Dosya adını kelimeyle karşılaştırır. Yalnızca İngilizce kayıtlar kabul edilir;
 * Fransızca (LL-Q150), Almanca (De-) gibi dosyalar elenir.
 */
function score(title: string, word: string): number {
  const base = title.replace(/^File:/i, '').replace(EXT, '');
  const low = base.toLowerCase();
  const w = word.toLowerCase();

  if (low === `en-us ${w}` || low === `en-us-${w}`) return 100;
  if (low === `en-uk-${w}` || low === `en-gb-${w}`) return 94;
  if (low === `en-ca-${w}` || low === `en-au-${w}` || low === `en-nz-${w}`) return 88;
  if (low === `en ${w}` || low === `en-${w}`) return 86;
  if (low.startsWith('ll-q1860 (eng)-')) {
    // Konuşan adı tire içerebilir; kelime her zaman son parçadır.
    const rest = base.slice('LL-Q1860 (eng)-'.length);
    const parts = rest.split('-');
    if (parts.length === 2 && parts[1].toLowerCase() === w) return 82;
  }
  return 0;
}

function transcode(orig: string): string {
  // https://upload.wikimedia.org/wikipedia/commons/b/bd/En-us-water.ogg
  //   → .../commons/transcoded/b/bd/En-us-water.ogg/En-us-water.ogg.mp3
  const clean = orig.split('?')[0];
  if (/\.mp3$/i.test(clean)) return clean;
  const file = clean.slice(clean.lastIndexOf('/') + 1);
  if (!file) return clean;
  return `${clean.replace('/commons/', '/commons/transcoded/')}/${file}.mp3`;
}

function plain(html?: string): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 70);
}

function toRecord(w: string, page: Page): PronRecord | null {
  const info = page.imageinfo?.[0];
  const orig = info?.url?.split('?')[0];
  if (!orig || !page.title) return null;
  const meta = info?.extmetadata ?? {};
  return {
    w,
    file: page.title,
    page: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    url: transcode(orig),
    orig,
    mime: info?.mime ?? '',
    lic: plain(meta.LicenseShortName?.value) || 'Commons',
    by: plain(meta.Artist?.value) || 'Wikimedia',
    at: Date.now(),
  };
}

function pick(word: string, pages: Page[]): PronRecord | null {
  let best: { s: number; page: Page } | null = null;
  for (const p of pages) {
    if (!p.title || p.missing || !p.imageinfo?.length) continue;
    const s = score(p.title, word);
    if (s > 0 && (!best || s > best.s)) best = { s, page: p };
  }
  return best ? toRecord(word, best.page) : null;
}

const INFO = 'url|mime|extmetadata';

/**
 * Arama sonucu iki farklı "yok" hâlini ayırır:
 *   { ok: true, rec: null }  -> baktık, kayıt yok  (kalıcı önbelleğe yazılır)
 *   { ok: false }            -> bakamadık        (yazılmaz, sonra tekrar denenir)
 *
 * Ayrım yapılmadığında tek bir ağ hatası kelimeyi 30 gün "sesi yok" diye
 * işaretliyordu; kullanıcı için telaffuz kalıcı olarak susuyordu.
 */
interface Lookup {
  ok: boolean;
  rec: PronRecord | null;
}

async function viaTitles(word: string): Promise<Lookup> {
  const langs = ['us', 'uk', 'gb', 'ca', 'au', 'nz'];
  const titles = langs.map((l) => `File:En-${l}-${word}.ogg`).concat(`File:En-${word}.ogg`);
  const json = await api({
    action: 'query',
    titles: titles.join('|'),
    prop: 'imageinfo',
    iiprop: INFO,
  });
  if (!json) return { ok: false, rec: null };
  return { ok: true, rec: pick(word, pagesOf(json)) };
}

async function viaSearch(word: string): Promise<Lookup> {
  const json = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `intitle:"${word}" filetype:audio`,
    gsrnamespace: '6',
    gsrlimit: '24',
    prop: 'imageinfo',
    iiprop: INFO,
  });
  if (!json) return { ok: false, rec: null };
  return { ok: true, rec: pick(word, pagesOf(json)) };
}

/** Aynı kelime için eşzamanlı iki çözümleme açılmasın. */
const inflight = new Map<string, Promise<PronRecord | null>>();

/** Kelimenin Commons kaydını bulur. Sonuç (ya da yokluğu) kalıcı önbelleğe yazılır. */
export async function resolve(word: string, urgent = false): Promise<PronRecord | null> {
  const key = word.trim().toLowerCase();
  if (!key) return null;

  const store = readStore();
  const hit = store.get(key);
  if (hit && !('none' in hit)) return hit;
  // "Yok" kaydı tazeyse tekrar sorulmaz; süresi geçtiyse yeniden denenir.
  if (hit && 'none' in hit && Date.now() - hit.at < MISS_TTL) return null;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  // Aynı kelime arka planda hazırlanıyorsa o işe katıl, ikinci istek açma.
  const running = inflight.get(key);
  if (running) return running;

  const job = (async () => {
    // Çok kelimeli girdiler ("dispose of") Commons'ta tek dosya olarak nadiren var.
    const single = key.includes(' ') ? key.split(' ')[0] : key;
    const first = await schedule(() => viaTitles(single), urgent);
    // Ağ hatası: "yok" diye kaydetme, bir sonraki denemede yeniden sorulsun.
    if (!first.ok) return null;

    let rec = first.rec;
    if (!rec) {
      const second = await schedule(() => viaSearch(single), urgent);
      if (!second.ok) return null;
      rec = second.rec;
    }

    store.set(key, rec ?? { none: true, at: Date.now() });
    writeStore();
    return rec;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

/* ----------------------------------------------------------------- ses */

let cacheOk = typeof caches !== 'undefined';

function audioCache(): Promise<Cache> | null {
  if (!cacheOk) return null;
  try {
    return caches.open(AUDIO_CACHE);
  } catch {
    cacheOk = false;
    return null;
  }
}

async function fetchAudio(rec: PronRecord): Promise<Blob | null> {
  const cache = await audioCache();
  const urls = [rec.url, rec.orig];

  for (const u of urls) {
    if (cache) {
      const cached = await cache.match(u);
      if (cached) return cached.blob();
    }
    try {
      const res = await fetch(u, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.size) continue;
      if (cache) {
        try {
          await trim(cache);
          await cache.put(u, new Response(blob, { headers: { 'content-type': blob.type } }));
        } catch {
          /* kota dolu: ses yine çalar */
        }
      }
      return blob;
    } catch {
      /* sıradaki adresi dene */
    }
  }
  return null;
}

/** Önbellek sınırsız büyümesin: en eski kayıtlar düşer. */
async function trim(cache: Cache) {
  const keys = await cache.keys();
  if (keys.length < MAX_AUDIO) return;
  for (const k of keys.slice(0, keys.length - MAX_AUDIO + 1)) await cache.delete(k);
}

/**
 * Tek bir <audio> öğesi yeniden kullanılır.
 *
 * Her okumada `new Audio()` kurulunca mobil tarayıcılar (özellikle iOS)
 * programatik çalmayı engelliyordu: oturumdaki ilk dinleme sorusunun
 * otomatik okuması sessiz kalıyor, sonrakiler çalıyordu. Aynı öğe ilk
 * dokunuşta bir kez "açıldığında" sonraki programatik çalmalara izin verilir.
 */
let el: HTMLAudioElement | null = null;

function audioEl(): HTMLAudioElement | null {
  if (el) return el;
  if (typeof Audio === 'undefined') return null;
  el = new Audio();
  el.preload = 'auto';
  return el;
}

/** Sessiz tek örnek — öğeyi kullanıcı hareketinin içinde açar. */
const SILENT =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

let unlocked = false;

/**
 * İlk kullanıcı hareketinde çağrılır (bkz. main.tsx).
 *
 * iOS'ta bir ses öğesi ancak bir dokunuşun içinde `play()` görürse açılır;
 * oturumun ilk dokunuşunu buraya bağlayınca dinleme sorularının otomatik
 * okuması da duyulabiliyor.
 */
export function unlockAudio() {
  if (unlocked) return;
  const a = audioEl();
  if (!a) return;
  unlocked = true;
  a.src = SILENT;
  void a
    .play()
    .then(() => {
      // Kaynağı boşaltma: `load()` öğenin kazanılmış iznini sıfırlayabiliyor.
      // Sıradaki gerçek okuma `src`yi zaten eziyor.
      a.pause();
    })
    .catch(() => {
      /* hareket sayılmadı: bir sonraki dokunuşta yeniden denenir */
      unlocked = false;
    });
  // Konuşma sentezi de iOS'ta aynı kilide tabi.
  if (typeof speechSynthesis !== 'undefined') {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch {
      /* yok say */
    }
  }
}

export type PlayResult = 'audio' | 'device' | 'none';

/** Her yeni okuma öncekini geçersiz kılar; geç kalan ses araya girmez. */
let token = 0;

/**
 * Kelimeyi çalar. Wikimedia'da dosya yoksa ve cihaz sesi açıksa
 * konuşma sentezine düşer; arayüz bunu "cihaz sesi" olarak işaretler.
 *
 * `urgent`: kullanıcı bekliyor, arka plan kuyruğunu atla.
 */
export async function play(
  word: string,
  opts: { device?: boolean; urgent?: boolean } = {},
): Promise<PlayResult> {
  const mine = ++token;
  const rec = await resolve(word, opts.urgent);
  // Bu arada başka bir okuma başladı: ağdan geç gelen ses araya girmesin.
  if (mine !== token) return 'none';
  if (rec) {
    const blob = await fetchAudio(rec);
    if (mine !== token) return 'none';
    const a = blob ? audioEl() : null;
    if (blob && a) {
      const url = URL.createObjectURL(blob);
      try {
        a.pause();
        a.src = url;
        a.onended = () => URL.revokeObjectURL(url);
        await a.play();
        return 'audio';
      } catch (err) {
        URL.revokeObjectURL(url);
        /*
         * Yeni bir okuma öncekini kesti (art arda iki "dinle"): bu bir hata
         * değil, sıra değişikliği. Cihaz sesine düşmek iki sesi üst üste
         * bindirirdi.
         */
        if ((err as DOMException)?.name === 'AbortError') return 'none';
        /* otomatik oynatma engeli: aşağıda cihaz sesi denenir */
      }
    }
  }
  if (opts.device !== false && speakDevice(word)) return 'device';
  return 'none';
}

/**
 * Oturum açılırken sıradaki kelimelerin sesini arka planda hazırlar.
 * Pencere bilerek kısa: 12 kelime, Commons'a açılışta 20'yi aşkın istek
 * attığı için hem gereksizdi hem de kullanıcının tıklamasını geciktiriyordu.
 */
export async function prefetch(words: string[], limit = 6) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const unique = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, limit);
  for (const w of unique) {
    const rec = await resolve(w);
    if (!rec) continue;
    const cache = await audioCache();
    if (cache && (await cache.match(rec.url))) continue;
    await fetchAudio(rec);
  }
}

/* --------------------------------------------------------- cihaz sesi */

let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  return (
    en.find((v) => /Google US English|Samantha|Microsoft Aria|Microsoft Jenny/i.test(v.name)) ??
    en.find((v) => v.lang === 'en-US') ??
    en[0] ??
    null
  );
}

export function speakDevice(text: string): boolean {
  if (typeof speechSynthesis === 'undefined') return false;
  try {
    speechSynthesis.cancel();
    if (!voice) voice = pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.92;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    voice = pickVoice();
  });
}

/* --------------------------------------------------------------- durum */

/**
 * Ayarlardaki kaynağa göre okur. `wikimedia` seçiliyken dosya bulunamazsa
 * cihaz sesi devreye girer; `device` seçiliyken hiç ağa çıkılmaz.
 */
export async function say(
  word: string,
  mode: 'wikimedia' | 'device' = 'wikimedia',
  urgent = true,
): Promise<PlayResult> {
  if (mode === 'device') return speakDevice(word) ? 'device' : 'none';
  return play(word, { device: true, urgent });
}

/** Arayüzün göstereceği kaynak bilgisi; ağ beklemeden okunur. */
export function peek(word: string): PronRecord | null {
  const e = readStore().get(word.trim().toLowerCase());
  return e && !('none' in e) ? e : null;
}
