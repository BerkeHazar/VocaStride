import raw from './words.json';
import type { DictEntry, Word } from '../types';
import { makeT, type Lang } from '../lib/i18n';

/** [kelime, tür, eşanlamlı, Türkçe karşılık] */
type Row = [string, string, string, string];

const rows = raw as unknown as Row[];

export const WORDS: Word[] = rows.map(([w, pos, syn, tr]) => ({
  key: w.toLowerCase(),
  w,
  pos,
  syn,
  tr,
}));

export const WORD_MAP: Map<string, Word> = new Map(WORDS.map((w) => [w.key, w]));

export const POS_LABEL: Record<string, string> = {
  n: 'isim',
  v: 'fiil',
  adj: 'sıfat',
  adv: 'zarf',
};

/** Tür etiketi: arayüz diline göre. */
export function posLabel(pos: string, lang: Lang): string {
  const key = `pos.${pos}`;
  if (pos === 'n' || pos === 'v' || pos === 'adj' || pos === 'adv') {
    return makeT(lang)(key as 'pos.n');
  }
  return pos;
}

export const POS_LIST = ['n', 'v', 'adj', 'adv'] as const;

let dictPromise: Promise<Record<string, DictEntry>> | null = null;

/**
 * IPA + İngilizce tanım verisi ayrı bir chunk'tır (~127 KB).
 * Yalnızca gerçekten ihtiyaç duyulduğunda indirilir; ana paket şişmez.
 */
export function loadDict(): Promise<Record<string, DictEntry>> {
  if (!dictPromise) {
    dictPromise = import('./dict.json').then(
      (m) => m.default as unknown as Record<string, DictEntry>,
    );
  }
  return dictPromise;
}

export function wordByKey(key: string): Word | undefined {
  return WORD_MAP.get(key);
}
