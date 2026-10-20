import type { Accent, ThemePref } from '../types';

const MEDIA = '(prefers-color-scheme: dark)';

export function resolvedTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light';
}

const THEME_COLORS = {
  light: '#F6F4EF',
  dark: '#0C0C10',
};

let lastApplied: string | null = null;

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

export function applyTheme(pref: ThemePref, accent: Accent) {
  const theme = resolvedTheme(pref);
  const root = document.documentElement;
  const key = `${theme}:${accent}`;

  const commit = () => {
    root.dataset.theme = theme;
    root.dataset.accent = accent;
    root.style.colorScheme = theme;
  };

  // Tema değişimi bir geçişle yapılır: renkler sertçe yer değiştirmez,
  // ekran yumuşakça çapraz geçiş yapar. İlk boyada animasyon yok.
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as ViewTransitionDoc;
  const canAnimate = lastApplied !== null && lastApplied !== key && !reduce;

  if (canAnimate && doc.startViewTransition) {
    try {
      doc.startViewTransition(commit);
    } catch {
      commit();
    }
  } else {
    commit();
  }
  lastApplied = key;

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', THEME_COLORS[theme]));
}

export function watchSystemTheme(cb: () => void): () => void {
  const mq = window.matchMedia(MEDIA);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
