import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { lockupBody } from '../brand/lockup.mjs';

/**
 * Paylaşım görseli (1200×630).
 *
 * Logo burada yeniden kurulmuyor: `lockupBody` uygulamanın kenar çubuğunda
 * çizilen lockup'ın aynısını üretir (karo %55 V, wordmark cap %55, boşluk %38).
 * Slogan da harf yollarından geliyor, fonta bağlı değil.
 */

const W = 1200;
const H = 630;

const INK = '#1B3A63';
const PAPER = '#F4F1E9';
const MUTED = '#4D4A41';
const OCHRE = '#8A6114';

const brand = JSON.parse(await readFile(new URL('../brand/mark.json', import.meta.url), 'utf8'));

/** Bir SVG dosyasından çizim gövdesini ve viewBox'ını al. */
async function part(file) {
  const raw = await readFile(new URL(`../brand/${file}`, import.meta.url), 'utf8');
  const vb = raw.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const body = raw
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/, '')
    .replace(/\s*id="[^"]*"/g, '')
    .trim();
  return { body, w: vb[2], h: vb[3] };
}

const tagline = await part('tagline.svg');

/** Slogan: tagline.svg içinde baseline y=200, cap 64. */
const tagCap = 34;
const tagK = tagCap / 64;
const tagW = tagline.w * tagK;

const tile = 128;
const tileY = 88;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="${INK}" fill-opacity="0.10"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>

  <!-- marka: uygulamadaki lockup'ın aynısı -->
  <g transform="translate(96 ${tileY})">${lockupBody(brand, {
    size: tile,
    colors: { mark: INK, word: INK, ink: PAPER },
  })}</g>

  <!-- slogan -->
  <g transform="translate(96 356) scale(${tagK})">
    <g fill="${INK}" transform="translate(0 -200)">${tagline.body}</g>
  </g>

  <!-- açıklama -->
  <g font-family="Segoe UI, Inter, system-ui, sans-serif" font-size="26" fill="${MUTED}">
    <text x="96" y="452">Aralıklı tekrar ile İngilizce kelime öğren.</text>
    <text x="96" y="492">1200 kelime · 150 bölüm · çevrimdışı · hesap yok.</text>
  </g>

  <!-- etiketler -->
  <g font-family="Segoe UI, Inter, system-ui, sans-serif" font-size="19" font-weight="600"
     fill="${INK}" letter-spacing="0.4">
    <rect x="96" y="524" width="176" height="44" rx="22" fill="none" stroke="${INK}" stroke-opacity="0.28"/>
    <text x="184" y="552" text-anchor="middle">Leitner SRS</text>
    <rect x="288" y="524" width="150" height="44" rx="22" fill="none" stroke="${INK}" stroke-opacity="0.28"/>
    <text x="363" y="552" text-anchor="middle">6 mod</text>
    <rect x="454" y="524" width="176" height="44" rx="22" fill="none" stroke="${INK}" stroke-opacity="0.28"/>
    <text x="542" y="552" text-anchor="middle">23 rozet</text>
  </g>

  <!-- sağ alt: ölçü çizgisi -->
  <g stroke="${OCHRE}" stroke-opacity="0.55" stroke-width="2">
    <path d="M1004 470h100"/>
  </g>
  <text x="1004" y="452" font-family="Segoe UI, Inter, system-ui, sans-serif" font-size="17"
        fill="${OCHRE}" letter-spacing="2.4">ADIM ADIM</text>
  <text x="${W - 96}" y="${H - 40}" text-anchor="end"
        font-family="Segoe UI, Inter, system-ui, sans-serif" font-size="19" fill="${MUTED}">
    berkehazar.github.io/VocaStride
  </text>
</svg>`;

await sharp(Buffer.from(svg), { density: 200 }).png({ compressionLevel: 9 }).toFile('public/og.png');
console.log(`✓ public/og.png (${W}×${H}) — lockup ${tile}px karo, slogan ${Math.round(tagW)}px`);
