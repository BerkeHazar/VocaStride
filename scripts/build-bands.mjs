/**
 * Kelime zorluk bantlarını üretir.
 *
 * Girdi: `src/data/words.json` (değiştirilmez) + iki frekans tablosu.
 * Çıktı: `src/data/bands.json` — 1200 kelimenin zorluk sırasına göre 6 banda
 * bölünmüş hâli. Kelime listesine hiçbir şey eklenmez, hiçbir kelime değişmez;
 * bantlar ayrı bir türetilmiş indekstir.
 *
 * İki bağımsız korpus harmanlanır, çünkü tek korpus yanıltıyor:
 *   - `freq-en.txt`  : OpenSubtitles 2018 (konuşma dili, çekimli biçimler toplanmış)
 *   - `freq-web.txt` : Google Trillion Word Corpus ilk 10.000 (yazılı dil sırası)
 * Yalnızca altyazı frekansı kullanılsaydı "gap", "ally", "herd" gibi yaygın
 * kelimeler gereksiz yere zor banda düşüyordu.
 *
 * Kullanım: node scripts/build-bands.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Harman ağırlıkları. Yazılı dil biraz daha ağır: sözlük zaten yazılı İngilizce. */
const W_SUB = 0.45;
const W_WEB = 0.55;
const BAND_COUNT = 6;

/**
 * Bant boyutları. Eşit bölmek kolay ama yanıltıcı: banka B2 ağırlıklı olduğu
 * için 6×200'lük eşit bölmede son bant B2 kelimelerle doluyor ve "en zor"
 * hissi kayboluyor. Ağırlıklı bölmede son bant kısalır ama gerçekten zor
 * kelimelerden oluşur.
 */
const BAND_SHARE = (process.env.VS_BAND_SHARE === 'equal')
  ? [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]
  : [0.24, 0.2067, 0.18, 0.16, 0.1333, 0.08];

/**
 * Elle inceleme katmanı.
 *
 * Frekans iyi bir cetvel ama kör noktaları var: korpusta seyrek geçen ama
 * B2 seviyesinde olan kelimeler en zor banda düşüyor. 1200 kelimenin
 * tamamı tek tek gözden geçirildi; aşağıdakiler komşularına göre açıkça
 * yanlış yerde olanlar. Değer = hedef bant.
 *
 * Kural: yalnızca iki banttan fazla sapan kelimeler yazılır. Tek bantlık
 * kaymalar frekans sıralamasının doğal gürültüsü, düzeltilmeye değmez.
 */
const OVERRIDES = {
  // En zor bantta duran ama B2 olan kelimeler → 4
  humorous: 4,
  durable: 4,
  spacious: 4,
  courteous: 4,
  noticeable: 4,
  moderately: 4,
  outdated: 4,
  revival: 4,
  slender: 4,
  inclusive: 4,
  hectic: 4,
  conserve: 4,
  dependable: 4,
  finite: 4,
  misbehave: 4,
  stationary: 4,
  misleading: 4,
  uneven: 4,
  absorbing: 4,
  harshly: 4,
  humid: 4,
  dissatisfied: 4,
  digestion: 4,
  illogical: 4,
  hospitable: 4,
  adolescence: 4,
  fruitful: 4,
  onset: 4,
  periodically: 4,
  overlap: 4,
  drawback: 4,
  unify: 4,
  plentiful: 4,
  commonplace: 4,
  resentful: 4,
  disruptive: 4,
  bearable: 4,
  repetitive: 4,
  factual: 4,
  congestion: 4,
  omit: 4,
  fluently: 4,
  bilingual: 4,
  notably: 4,
  stamina: 4,
  ample: 4,
  vibrant: 4,
  consequently: 3,
  hastily: 4,
  /*
   * İkincil anlam katmanı.
   *
   * Banka, sık kelimelerin nadir anlamlarını da öğretiyor: "mean" burada
   * "cimri", "sound" "akla yatkın", "minute" "ufak tefek". Kelime kolay
   * olduğu için frekans onu en kolay banda atıyor, ama öğretilen anlam zor.
   * Bu kelimeler ilk bölümlerde çıkınca kullanıcı haklı olarak "bu ne"
   * diyor. Anlamı nadir olanları geriye alıyoruz.
   */
  // anlamı belirgin biçimde nadir → 4
  mean: 4,
  minute: 4,
  sound: 4,
  found: 4,
  board: 4,
  address: 4,
  resort: 4,
  recipe: 4,
  medium: 4,
  // anlamı ikincil ama tanıdık → 3
  crack: 3,
  post: 3,
  cast: 3,
  mount: 3,
  object: 3,
  // kelime çok sık, anlamı ikincil → 2
  will: 2,
  state: 2,
  spot: 2,
  measure: 2,
  // 5'te duran ama en zor bantta olması gerekenler → 6
  loathe: 6,
  meticulous: 6,
  eradicate: 6,
  futile: 6,
  obsessive: 6,
  aggravate: 6,
  consecutively: 6,
  pesticide: 6,
  unforgivable: 6,
  irresistible: 6,
  oppress: 6,
  overthrow: 6,
  hostility: 6,
};

const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/words.json'), 'utf8'));

function readTable(file) {
  const map = new Map();
  for (const line of fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8').trim().split('\n')) {
    const [w, v] = line.split('\t');
    if (w && v) map.set(w, Number(v));
  }
  return map;
}

const sub = readTable('freq-en.txt');
const web = readTable('freq-web.txt');
const base = readTable('freq-base.txt');

/**
 * Türetilmiş biçim, kökünden yaklaşık 4 kat seyrek geçiyor (medyan).
 * "hasty" bilen biri için "hastily" neredeyse bedava; ama frekans onu
 * daha zor gösteriyor. Bu yüzden türetilmiş kelime, kökünün dörtte biri
 * kadar yaygın sayılır — hangisi büyükse o kullanılır.
 */
const BASE_DISCOUNT = 4;

const keys = rows.map((r) => r[0].toLowerCase());
const effective = keys.map((k) => Math.max(sub.get(k) ?? 0, (base.get(k) ?? 0) / BASE_DISCOUNT));
const logCounts = effective.map((c) => Math.log10(c + 1));
const lo = Math.min(...logCounts);
const hi = Math.max(...logCounts);

const scored = keys.map((key, i) => {
  const speech = (logCounts[i] - lo) / (hi - lo);
  const rank = web.get(key);
  // Web korpusunda hiç görünmeyen kelime en zor kabul edilir.
  const written = rank ? 1 - Math.log(rank) / Math.log(10000) : 0;
  return { key, score: W_SUB * speech + W_WEB * written };
});

// Kolaydan zora. Eşit skorlarda alfabetik: çıktı deterministik kalsın.
scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

const sizes = BAND_SHARE.map((s) => Math.round(scored.length * s));
const bounds = sizes.reduce((acc, n) => [...acc, acc[acc.length - 1] + n], [0]);

// Bant sınırları (azalan skor). Elle düzeltmeler bu sınırların ortasına yazılır,
// böylece kelime hedef bandın ortasına düşer ve kimse bandından taşmaz.
const cut = [scored[0].score + 1];
for (let b = 1; b < BAND_COUNT; b++) cut.push(scored[bounds[b] - 1].score);
cut.push(scored[scored.length - 1].score - 1);

const byKey = new Map(scored.map((s) => [s.key, s]));
let applied = 0;
const unknown = [];
for (const [word, band] of Object.entries(OVERRIDES)) {
  const item = byKey.get(word);
  if (!item) {
    unknown.push(word);
    continue;
  }
  item.score = (cut[band - 1] + cut[band]) / 2;
  applied += 1;
}
if (unknown.length) console.log(`uyarı: bankada bulunmayan düzeltme — ${unknown.join(', ')}`);

scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

const bands = Array.from({ length: BAND_COUNT }, (_, i) =>
  scored.slice(bounds[i], bounds[i + 1]).map((s) => s.key),
);

const out = {
  v: 1,
  note: 'scripts/build-bands.mjs tarafından üretildi. Kelime listesi değişmez; bu dosya yalnızca zorluk sırasıdır.',
  source: 'OpenSubtitles 2018 (CC BY-SA) + Google Trillion Word Corpus top 10k',
  bands,
};

fs.writeFileSync(path.join(ROOT, 'src/data/bands.json'), `${JSON.stringify(out)}\n`);

console.log(`bands.json yazıldı — ${scored.length} kelime, bant boyutları: ${bands.map((b) => b.length).join(' / ')}`);
console.log(`elle düzeltme: ${applied} kelime`);
for (let i = 0; i < BAND_COUNT; i++) {
  const b = bands[i];
  console.log(`  bant ${i + 1}: ${b.slice(0, 4).join(', ')} … ${b.slice(-3).join(', ')}`);
}
