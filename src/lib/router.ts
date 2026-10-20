import { useSyncExternalStore } from 'react';

export type RouteName =
  | 'path'
  | 'practice'
  | 'study'
  | 'summary'
  | 'stats'
  | 'badges'
  | 'dictionary'
  | 'settings'
  | 'onboarding';

export interface Route {
  name: RouteName;
  mode?: string;
  path: string;
}

const BASE = import.meta.env.BASE_URL || '/';

function readPath(): string {
  let p = window.location.pathname;
  if (BASE !== '/' && p.startsWith(BASE)) p = p.slice(BASE.length - 1);
  if (!p.startsWith('/')) p = '/' + p;
  return p.replace(/\/+$/, '') || '/';
}

function parse(path: string): Route {
  const clean = path.split('?')[0];
  if (clean.startsWith('/study/')) {
    return { name: 'study', mode: clean.slice(7), path: clean };
  }
  switch (clean) {
    case '/practice':
      return { name: 'practice', path: clean };
    case '/stats':
      return { name: 'stats', path: clean };
    case '/badges':
      return { name: 'badges', path: clean };
    case '/dictionary':
      return { name: 'dictionary', path: clean };
    case '/settings':
      return { name: 'settings', path: clean };
    case '/summary':
      return { name: 'summary', path: clean };
    case '/onboarding':
      return { name: 'onboarding', path: clean };
    default:
      return { name: 'path', path: '/' };
  }
}

let route: Route = parse(readPath());
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getRoute(): Route {
  return route;
}

export function subscribeRoute(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribeRoute, getRoute, getRoute);
}

/**
 * Gezinme.
 *
 * View Transitions API'si kaldırıldı. Üç sorun birden çıkarıyordu:
 * sayfa geçişi 270 ms sürüyordu, sabit konumlu öğeler (dock) anlık
 * görüntü içinde kayıp geri geliyordu ve geçiş "yandan kayma" gibi
 * okunuyordu. Ekran geçişi artık anlık; yumuşaklık ekranın kendi
 * kısa sönümlemesinden (`.screen-enter`) geliyor.
 */
export function navigate(to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) {
  const target = to.startsWith('/') ? to : `/${to}`;
  if (target === route.path) return;

  if (opts.replace) window.history.replaceState({}, '', BASE + target.slice(1));
  else window.history.pushState({}, '', BASE + target.slice(1));

  /*
   * Kaydırma, yeni ekran çizilmeden ÖNCE yapılır.
   *
   * Önce çizip sonra kaydırınca, yeni (kısa) sayfa bir kare boyunca eski
   * sayfanın kaydırma konumunda kalıyordu: sağ kenarda kaydırma çubuğu
   * belirip kayboluyor, içerik bir an boş görünüyordu. İkisi de aynı
   * karede, boyamadan önce olmalı.
   */
  if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

  route = parse(target);
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    route = parse(readPath());
    emit();
  });

  // Manifest kısayolları: ./?start=quiz
  const params = new URLSearchParams(window.location.search);
  const start = params.get('start');
  if (start) {
    const map: Record<string, string> = {
      quiz: '/study/quiz',
      review: '/study/review',
      cards: '/study/cards',
      match: '/study/match',
    };
    if (map[start]) {
      window.history.replaceState({}, '', BASE + map[start].slice(1));
      route = parse(map[start]);
    }
  }
}

export function linkTo(path: string) {
  return `${BASE}${path.replace(/^\//, '')}`;
}
