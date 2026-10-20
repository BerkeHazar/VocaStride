import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { tileMarkTransform } from '../brand/lockup.mjs';

/**
 * Marka tutarlılık denetimi.
 *
 * Logonun tek kaynağı `brand/mark.json`. Bu betik üç şeyi doğrular:
 *   1. `brand/*.svg` dosyaları JSON'daki geometriyi kullanıyor (kopya yok).
 *   2. `src/` ve `scripts/` içinde işaret yolunun elle yazılmış kopyası yok.
 *   3. Uygulama, açılış ekranı, ikonlar ve paylaşım görseli aynı oranları okuyor.
 *
 * `npm run brand:check` — kırılırsa çıkış kodu 1.
 */
const root = fileURLToPath(new URL('..', import.meta.url));
const brand = JSON.parse(await readFile(join(root, 'brand/mark.json'), 'utf8'));

let bad = 0;
const ok = (msg) => console.log('  ✓', msg);
const fail = (msg) => {
  bad++;
  console.error('  ✗', msg);
};

/* 1) SVG dosyaları JSON ile aynı dönüşümü kullanıyor mu? */
const tf = tileMarkTransform(brand);
for (const file of ['tile.svg', 'lockup-horizontal.svg', 'lockup-stacked.svg']) {
  const svg = await readFile(join(root, 'brand', file), 'utf8');
  svg.includes(tf) ? ok(`${file}: karo dönüşümü mark.json ile aynı`) : fail(`${file}: dönüşüm farklı`);
}

/* 2) İşaret yolu başka yerde tekrar ediyor mu? */
const needle = brand.mark.d.slice(0, 18);
const walk = async (dir) => {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.git', 'archive'].includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(tsx?|mjs|js|html|py|css)$/.test(e.name)) out.push(full);
  }
  return out;
};
const sources = [
  ...(await walk(join(root, 'src'))),
  ...(await walk(join(root, 'scripts'))),
  join(root, 'index.html'),
];
for (const f of sources) {
  const text = await readFile(f, 'utf8');
  if (text.includes(needle)) fail(`${relative(root, f)}: işaret yolu elle yazılmış`);
}
if (!bad) ok('src/, scripts/, index.html: işaret yolu yalnızca brand/ içinde');

/* 3) Oranlar */
const pct = (n) => `${Math.round(n * 100)}%`;
const expect = { markWidth: 0.55, cap: 0.55, gap: 0.38 };
brand.tile.markWidth === expect.markWidth
  ? ok(`karo içi V genişliği ${pct(brand.tile.markWidth)}`)
  : fail(`V genişliği ${pct(brand.tile.markWidth)} (beklenen ${pct(expect.markWidth)})`);
brand.lockup.cap === expect.cap
  ? ok(`wordmark cap ${pct(brand.lockup.cap)}`)
  : fail(`wordmark cap ${pct(brand.lockup.cap)} (beklenen ${pct(expect.cap)})`);
brand.lockup.gap === expect.gap
  ? ok(`lockup boşluğu ${pct(brand.lockup.gap)}`)
  : fail(`lockup boşluğu ${pct(brand.lockup.gap)} (beklenen ${pct(expect.gap)})`);

/* 4) Derlenmiş çıktıdaki açılış ekranı aynı SVG'yi taşıyor mu? */
try {
  const html = await readFile(join(root, 'dist/index.html'), 'utf8');
  const m = html.match(/<svg class="lockup"[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) fail('dist/index.html: açılış ekranı lockup\'ı yok');
  else {
    const size = brand.ui.boot;
    const cap = size * brand.lockup.cap;
    const width = size + size * brand.lockup.gap + (cap / brand.wordmark.cap) * brand.wordmark.width;
    Math.abs(Number(m[1]) - width) < 0.6 && Math.abs(Number(m[2]) - size) < 0.6
      ? ok(`açılış ekranı lockup'ı ${m[1]}×${m[2]} (uygulama oranıyla aynı)`)
      : fail(`açılış ekranı ${m[1]}×${m[2]}, beklenen ${width.toFixed(1)}×${size}`);
  }
} catch {
  console.log('  – dist/ yok, derleme sonrası tekrar çalıştırın');
}

if (bad) {
  console.error(`\n${bad} sorun bulundu.`);
  process.exit(1);
}
console.log('\nMarka tutarlı.');
