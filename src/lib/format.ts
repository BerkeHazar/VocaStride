export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDuration(sec: number, lang: 'tr' | 'en' = 'tr'): string {
  const u = lang === 'en' ? { s: 's', m: 'min', h: 'h' } : { s: 'sn', m: 'dk', h: 'sa' };
  if (sec < 60) return `${Math.round(sec)} ${u.s}`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} ${u.m}`;
  return `${Math.floor(m / 60)} ${u.h} ${m % 60} ${u.m}`;
}

const LOCALE = { tr: 'tr-TR', en: 'en-GB' } as const;

export function fmtDate(ts: number, lang: 'tr' | 'en' = 'tr'): string {
  return new Date(ts).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' });
}

export function fmtDateLong(ts: number, lang: 'tr' | 'en' = 'tr'): string {
  return new Date(ts).toLocaleDateString(LOCALE[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
