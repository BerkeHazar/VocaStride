/**
 * Marka işareti — "Adım".
 *
 * V'nin iki bacağı dikeyden 30° açılır, üç ucu da yatay kesilir: harf
 * mürekkeple değil, cetvelle çizilmiş gibi durur. Kesik uçlar "basamak burnu"
 * gibi okunur; marka adı zaten kelime + adım.
 *
 * Geometri `brand/mark.json`'dan gelir: bu dosyada tek bir sayı yok. Karo,
 * wordmark ve aralarındaki boşluk aynı orandan türediği için kenar çubuğu,
 * üst bar, kurulum ekranı, açılış ekranı ve paylaşım kartı **aynı** logoyu
 * gösterir.
 *
 * Renkler CSS değişkenidir: açık temada karo ve wordmark marka mürekkebi
 * (#1B3A63), koyu temada karo açık maviye, wordmark kâğıt rengine döner.
 * V her zaman sayfanın zemin rengidir (`--logo-ink`).
 */
import { BRAND, MARK, TILE, TILE_MARK_TRANSFORM, WORDMARK, lockupGeom } from '../brand';

type SvgProps = { size?: number; className?: string };

/**
 * Tam lockup: karo + wordmark, tek SVG.
 *
 * Tek parça olması bilinçli: ayrı `<span>`'lerle kurulduğunda flex boşluğu ve
 * satır yüksekliği logoyu yerinden kaydırıyordu. Burada hizalama geometrinin
 * içinde.
 */
export function Lockup({ size = 30, className = '' }: SvgProps) {
  const g = lockupGeom(size, BRAND);
  return (
    <svg
      className={`lockup ${className}`}
      viewBox={`0 0 ${g.width} ${g.height}`}
      width={g.width}
      height={g.height}
      role="img"
      aria-label="VocaStride"
    >
      <g transform={`scale(${(size / TILE.size).toFixed(5)})`}>
        <rect width={TILE.size} height={TILE.size} rx={TILE.radius} fill="var(--logo-mark)" />
        <g fill="var(--logo-ink)" transform={TILE_MARK_TRANSFORM}>
          <path d={MARK.d} />
        </g>
      </g>
      <g
        fill="var(--logo-word)"
        transform={`translate(${size + g.gap} ${g.baseline}) scale(${g.wordScale.toFixed(5)})`}
      >
        <path d={WORDMARK.d} />
      </g>
    </svg>
  );
}

/** Yalnızca ikon karosu (uygulama ikonunun ekran içindeki hâli). */
export function LogoTile({ size = 28, className = '' }: SvgProps) {
  return (
    <svg
      className={`logo-tile ${className}`}
      viewBox={`0 0 ${TILE.size} ${TILE.size}`}
      width={size}
      height={size}
      role="img"
      aria-label="VocaStride"
    >
      <rect width={TILE.size} height={TILE.size} rx={TILE.radius} fill="var(--logo-mark)" />
      <g fill="var(--logo-ink)" transform={TILE_MARK_TRANSFORM}>
        <path d={MARK.d} />
      </g>
    </svg>
  );
}

/** Yalnızca çıplak işaret (karo yok, tek renk). */
export function Logo({ size = 26, className = '' }: SvgProps) {
  return (
    <svg
      className={`logo-mark ${className}`}
      viewBox="0 0 256 256"
      width={size}
      height={size}
      role="img"
      aria-label="VocaStride"
    >
      <g transform={TILE_MARK_TRANSFORM}>
        <path d={MARK.d} fill="currentColor" />
      </g>
    </svg>
  );
}

/** Yalnızca wordmark — cap yüksekliği `size` (px). */
export function Wordmark({ size = 16.5, className = '' }: { size?: number; className?: string }) {
  const k = size / WORDMARK.cap;
  return (
    <svg
      className={`wordmark ${className}`}
      viewBox={`0 ${-size} ${WORDMARK.width * k} ${size}`}
      width={WORDMARK.width * k}
      height={size}
      role="img"
      aria-label="VocaStride"
    >
      <g transform={`scale(${k.toFixed(5)})`} fill="var(--logo-word)">
        <path d={WORDMARK.d} />
      </g>
    </svg>
  );
}
