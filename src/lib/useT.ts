import { useMemo } from 'react';
import { makeT } from './i18n';
import { useApp } from './store';

/**
 * Arayüz çevirisi. Dil ayarlardan gelir; dil değişince bileşen yeniden çizilir.
 * (i18n.ts saf kalır, store'u import etmez — döngüsel bağımlılık olmaz.)
 */
export function useT() {
  const { settings } = useApp();
  return useMemo(() => makeT(settings.lang), [settings.lang]);
}

/** Geçerli arayüz dili; tarih/sayı biçimlendirmesi için gerekir. */
export function useLang() {
  return useApp().settings.lang;
}
