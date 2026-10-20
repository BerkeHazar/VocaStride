/** Tip tanımları — `brand/lockup.mjs` (tek uygulama, sıfır bağımlılık). */

export interface BrandData {
  mark: { d: string; w: number; h: number; cx: number; cy: number };
  tile: { size: number; radius: number; markWidth: number; markCenterY: number };
  wordmark: { d: string; width: number; cap: number };
  lockup: { cap: number; gap: number };
  colors: { ink: string; paper: string };
  /** Uygulamadaki karo boyları (px). */
  ui: Record<string, number>;
}

export interface LockupGeometry {
  tile: number;
  cap: number;
  gap: number;
  wordScale: number;
  wordW: number;
  width: number;
  height: number;
  baseline: number;
  radius: number;
}

export function markScale(brand: BrandData): number;
export function tileMarkTransform(brand: BrandData, cx?: number, cy?: number): string;
export function lockupGeom(size: number, brand: BrandData): LockupGeometry;
export function lockupBody(
  brand: BrandData,
  opts?: { size?: number; colors?: { mark?: string; word?: string; ink?: string } },
): string;
export function lockupSvg(
  brand: BrandData,
  opts?: { size?: number; colors?: { mark?: string; word?: string; ink?: string }; attrs?: string },
): string;
export function tileSvg(
  brand: BrandData,
  opts?: {
    radius?: boolean;
    markWidth?: number;
    centerY?: number;
    fill?: string;
    ink?: string;
  },
): string;
