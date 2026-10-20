/**
 * Kampanya motorunu kuru çalıştırır: kelime tüketimi, tekrar aralıkları,
 * mod dağılımı. Hiçbir şeyi değiştirmez, sadece ölçer.
 *
 * Önce bölüm uzunluğu / yeni kelime sayısı ızgarasını karşılaştırır
 * (1200 kelimeyi 15 soruya sığdırmanın matematiği), sonra seçilen ayarı
 * ayrıntılı raporlar.
 *
 * Kullanım: node scripts/audit-levels.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { campaignPlan, expandUnits, selectLevel, gapNeeded } from '../src/lib/levels.ts';
import { freshTarget } from '../src/lib/campaign.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { bands } = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/bands.json'), 'utf8'));
const TOTAL_WORDS = bands.flat().length;

/* ---------------------------------------------------------- simülasyon */

function simulate(opts) {
  const plan = campaignPlan(bands, opts);
  const progress = {};
  const srs = {};
  const freshSeen = new Set();
  let comfort = 0.8;
  const perBand = {};
  const reviewed = new Set();
  const gaps = [];
  const violations = [];
  const dups = [];
  const modes = {};
  const pools = {};
  const snapshots = {};
  let answered = 0;
  let rndState = 20261019;
  const rnd = () => {
    rndState = (rndState * 1103515245 + 12345) & 0x7fffffff;
    return rndState / 0x7fffffff;
  };

  for (const def of plan) {
    if ([1, 7, 10, 20, 40].includes(def.id)) {
      snapshots[def.id] = { def, sel: selectLevel(def, { bands, progress, srs }) };
    }
    const freshCount = freshTarget(def, comfort);
    const sel = selectLevel(def, { bands, progress, srs, freshCount });
    const units = expandUnits(def, sel);
    for (const u of units) {
      if (!perBand[def.band]) perBand[def.band] = {};
      perBand[def.band][u.mode] = (perBand[def.band][u.mode] ?? 0) + u.keys.length;
    }
    const here = new Set();
    for (const u of units) {
      modes[u.mode] = (modes[u.mode] ?? 0) + u.keys.length;
      pools[u.pool] = (pools[u.pool] ?? 0) + u.keys.length;
      for (const k of u.keys) {
        if (here.has(k)) dups.push(`${def.id}:${k}`);
        here.add(k);
      }
    }
    for (const k of sel.fresh) {
      if (freshSeen.has(k)) dups.push(`fresh:${def.id}:${k}`);
      freshSeen.add(k);
    }

    const acc = def.kind === 'normal' ? 0.86 : 0.78;
    comfort = Math.min(1, Math.max(0, comfort * 0.65 + acc * 0.35));
    for (const u of units) {
      for (const key of u.keys) {
        const before = srs[key] ?? { box: 0, bad: 0 };
        const st = progress[key];

        // Soğuma, cevaptan ÖNCEKİ duruma göre ölçülür: seçim o an yapıldı.
        if (u.pool !== 'fresh' && st) {
          reviewed.add(key);
          const need = Math.max(1, Math.round(gapNeeded(before.box, before.bad) * def.relax));
          gaps.push(def.id - st.last);
          if (def.id - st.last < need) violations.push(`${key}@${def.id}`);
        }

        const right = rnd() < acc;
        answered += 1;
        srs[key] = right
          ? { box: Math.min(5, before.box + 1), bad: before.bad }
          : { box: 1, bad: before.bad + 1 };

        progress[key] = {
          last: def.id,
          prev: st ? st.last : -99,
          rev: (st?.rev ?? 0) + (u.pool === 'fresh' ? 0 : 1),
        };
      }
    }
  }

  const sorted = gaps.slice().sort((a, b) => a - b);
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))] ?? 0;
  return {
    plan,
    answered,
    freshSeen,
    reviewed,
    gaps,
    violations,
    dups,
    modes,
    pools,
    perBand,
    snapshots,
    levels: plan.length,
    reviewSlots: gaps.length,
    avgGap: gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length),
    medGap: q(0.5),
    p90: q(0.9),
    maxGap: sorted[sorted.length - 1] ?? 0,
  };
}

const pct = (n, d) => `${((100 * n) / Math.max(1, d)).toFixed(0)}%`;

/* ------------------------------------------------------- ayar ızgarası */

console.log('1200 kelime · 15 soruluk bölüm — bölüm sayısı / tekrar payı dengesi\n');
console.log('yeni/bölüm  bölüm  toplam soru  tekrar yuvası  temas/kelime  tekrar kapsamı  medyan aralık');
for (const freshPerLevel of [12, 10, 8, 7, 6]) {
  const r = simulate({ questions: 15, freshPerLevel });
  console.log(
    `   ${String(freshPerLevel).padStart(2)}       ${String(r.levels).padStart(3)}    ${String(r.answered).padStart(5)}        ${String(r.reviewSlots).padStart(4)}           ${(r.answered / TOTAL_WORDS).toFixed(2)}          ${pct(r.reviewed.size, TOTAL_WORDS).padStart(4)}            ${String(r.medGap).padStart(2)}`,
  );
}

/* ------------------------------------------------------ ayrıntılı rapor */

const PICK = { questions: 15, freshPerLevel: 8 };
const r = simulate(PICK);

console.log(`\n\nSEÇİLEN AYAR: ${PICK.questions} soru · ${PICK.freshPerLevel} yeni kelime\n`);
console.log('KAMPANYA');
console.log(`  bölüm            : ${r.levels}`);
console.log(`  toplam soru      : ${r.answered}`);
console.log(`  yeni kelime      : ${r.freshSeen.size} / ${TOTAL_WORDS} (${pct(r.freshSeen.size, TOTAL_WORDS)})`);
console.log(`  tekrar yuvası    : ${r.reviewSlots} (${pct(r.reviewSlots, r.answered)})`);
console.log(`  tekrar gören kelime: ${r.reviewed.size} / ${TOTAL_WORDS} (${pct(r.reviewed.size, TOTAL_WORDS)})`);

const kinds = r.plan.reduce((m, d) => ({ ...m, [d.kind]: (m[d.kind] ?? 0) + 1 }), {});
console.log(`  boss dağılımı    : ${Object.entries(kinds).map(([k, v]) => `${k}=${v}`).join('  ')}`);
console.log(`  bant boyutları   : ${bands.map((b) => b.length).join(' / ')}`);

console.log('\nTEKRAR ARALIĞI');
console.log(`  ortalama         : ${r.avgGap.toFixed(1)} bölüm`);
console.log(`  medyan           : ${r.medGap} · %90: ${r.p90} · en uzun: ${r.maxGap}`);
console.log(`  soğuma ihlali    : ${r.violations.length}`);

console.log('\nMOD DAĞILIMI (kademe bazında, % olarak)');
for (const [band, mix] of Object.entries(r.perBand)) {
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const parts = Object.entries(mix)
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${m} ${Math.round((100 * n) / total)}%`);
  console.log(`  kademe ${band}: ${parts.join(' · ')}`);
}

// Üretim payı: tanıma (kart/test/eşleştirme) yerine yazma/dinleme ne kadar
// giriyor. Normal bölümlerde artık rampa yok (her mod her bölümde), boss'larda
// kademe yükseldikçe üretim artıyor.
console.log('\nÜRETİM PAYI (yazma + dinleme, kademe bazında)');
const prod = Object.entries(r.perBand).map(([band, mix]) => {
  const total = Object.values(mix).reduce((a, b) => a + b, 0);
  const made = (mix.type ?? 0) + (mix.listen ?? 0);
  return { band, share: (100 * made) / Math.max(1, total), made, total };
});
for (const p of prod) {
  const bar = '█'.repeat(Math.round(p.share / 4));
  console.log(`  kademe ${p.band}: ${p.share.toFixed(0).padStart(3)}%  ${bar}`);
}
/*
 * Bölüm tarifi denetimi: her normal bölümde beş modun da birer tadı olmalı ve
 * kart sayısı 3'te sabit kalmalı. Bu iki satır kırmızıya dönerse "her bölümde
 * her şeyden olsun" kuralı bozulmuş demektir.
 */
const ALL_MODES = ['cards', 'match', 'quiz', 'listen', 'type'];
const normalDefs = r.plan.filter((d) => d.kind === 'normal');
const missing = normalDefs.filter((d) => {
  const have = new Set(d.units.map((u) => u.mode));
  return ALL_MODES.some((m) => !have.has(m));
});
const cardsOff = normalDefs.filter(
  (d) => (d.units.find((u) => u.mode === 'cards')?.count ?? 0) !== 3,
);
console.log('\nBÖLÜM TARİFİ (normal bölümler)');
console.log(`  beş mod birden  : ${missing.length ? `HAYIR (${missing.length} bölüm)` : `evet (${normalDefs.length} bölüm)`}`);
console.log(`  kart sayısı     : ${cardsOff.length ? `HAYIR (${cardsOff.length} bölüm)` : 'her bölümde 3'}`);
console.log('\nMOD DAĞILIMI (toplam)');
for (const [m, n] of Object.entries(r.modes).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(7)} ${String(n).padStart(4)}  ${pct(n, r.answered)}`);
}
console.log('\nHAVUZ DAĞILIMI');
for (const [p, n] of Object.entries(r.pools).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p.padEnd(9)} ${String(n).padStart(4)}  ${pct(n, r.answered)}`);
}

console.log('\nBÖLÜM ÖRNEKLERİ (gerçek durumdan)');
for (const [id, snap] of Object.entries(r.snapshots)) {
  const units = expandUnits(snap.def, snap.sel);
  const sum = units.reduce((a, u) => a + u.keys.length, 0);
  console.log(
    `  #${id} ${snap.def.kind.padEnd(6)} bant ${snap.def.band} · ${sum} soru → ${units.map((u) => `${u.mode}:${u.keys.length}`).join(' + ')}`,
  );
  console.log(`      yeni: ${snap.sel.fresh.slice(0, 5).join(', ')}${snap.sel.fresh.length > 5 ? '…' : ''}`);
  const rev = [...snap.sel.warm, ...snap.sel.callback, ...snap.sel.surprise];
  if (rev.length) console.log(`      tekrar: ${rev.slice(0, 6).join(', ')}${rev.length > 6 ? '…' : ''}`);
}

console.log('\nDOĞRULAMA');
console.log(`  aynı bölümde tekrar eden kelime : ${r.dups.length}`);
console.log(`  hiç görülmeyen kelime           : ${TOTAL_WORDS - r.freshSeen.size}`);
