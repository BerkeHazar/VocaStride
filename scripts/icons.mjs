import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tileSvg } from '../brand/lockup.mjs';

/**
 * Uygulama ikonu: logo mürekkebi karo içinde kâğıt V.
 *
 * Geometri `brand/mark.json`'dan gelir (brand/build.py üretir).
 *
 * - `any` (192/512): yuvarlatılmış karo, saydam köşeler.
 * - `maskable` (192/512): tam kare zemin; Android daireye kırpar, V güvenli
 *   alanda kalır (en uzak köşe merkezden 93 birim, güvenli yarıçap 102).
 * - `apple-180`: tam kare, **saydamlık yok** — iOS kendi maskesini uygular,
 *   yuvarlatılmış PNG'de köşeler siyah görünüyordu.
 * - favicon (svg/16/32): V bir kademe iri (%60); 16 px'te bacaklar 2,3 px
 *   yerine 2,5 px oluyor, sekmede daha net duruyor.
 */
const brand = JSON.parse(await readFile(new URL('../brand/mark.json', import.meta.url), 'utf8'));

const jobs = [
  ['icon-512.png', 512, {}],
  ['icon-192.png', 192, {}],
  ['maskable-512.png', 512, { radius: false }],
  ['maskable-192.png', 192, { radius: false }],
  ['apple-180.png', 180, { radius: false }],
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
