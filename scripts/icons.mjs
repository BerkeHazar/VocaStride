import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tileSvg } from '../brand/lockup.mjs';

/**
 * Uygulama ikonu: logo mürekkebi karo içinde kâğıt V.
 *
 * Geometri `brand/mark.json`'dan gelir (brand/build.py üretir).
 *
 * - `any` (192/512) ve `apple-180`: tam kare ya da yuvarlatılmış karo,
 *   saydamlık yok — iOS kendi maskesini uygular.
 * - `maskable` (192/512): tam kare zemin; Android daireye kırpar, V güvenli
 *   alanda kalır (en uzak köşe merkezden 85 birim, güvenli yarıçap 102).
 *
 * V boyu yüzeye göre üç kademe (optik ölçek):
 *   16–32 px sekme  %60 · ana ekran/PWA %50 · uygulama içi lockup %55
 * Ana ekranda ikon kendi başına durduğu ve işletim sistemi köşeleri kırptığı
 * için V bir kademe küçültülüyor; %55'te karo dolu ve ağır görünüyordu.
 */
const brand = JSON.parse(await readFile(new URL('../brand/mark.json', import.meta.url), 'utf8'));

const jobs = [
  ['icon-512.png', 512, { markWidth: 0.5 }],
  ['icon-192.png', 192, { markWidth: 0.5 }],
  ['maskable-512.png', 512, { radius: false, markWidth: 0.5 }],
  ['maskable-192.png', 192, { radius: false, markWidth: 0.5 }],
  ['apple-180.png', 180, { radius: false, markWidth: 0.5 }],
  ['favicon-32.png', 32, { markWidth: 0.6 }],
  ['favicon-16.png', 16, { markWidth: 0.6 }],
];

await mkdir('public/icons', { recursive: true });

for (const [name, size, opts] of jobs) {
  await sharp(Buffer.from(tileSvg(brand, opts)), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(`public/icons/${name}`);
  console.log('✓', name);
}

await writeFile('public/favicon.svg', tileSvg(brand, { markWidth: 0.6 }) + '\n', 'utf8');
console.log('✓ favicon.svg');
