import { Sheet } from './UI';
import { useT } from '../lib/useT';
import type { MsgKey } from '../lib/i18n';

const MODE_KEYS: MsgKey[] = [
  'mode.quiz',
  'mode.cards',
  'mode.match',
  'mode.speed',
  'mode.listen',
  'mode.type',
  'mode.marathon',
];

const PAGE_KEYS: { key: string; labelKey: MsgKey }[] = [
  { key: '?', labelKey: 'keys.open' },
  { key: '/', labelKey: 'dict.searchLabel' },
  { key: 'Enter', labelKey: 'keys.start' },
  { key: 'Space', labelKey: 'keys.flip' },
  { key: '←', labelKey: 'keys.again' },
  { key: '→', labelKey: 'keys.know' },
  { key: 'Esc', labelKey: 'session.exit' },
];

export function ShortcutsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();

  return (
    <Sheet open={open} onClose={onClose} title={t('keys.title')}>
      <p className="sheet-lede">{t('keys.sub')}</p>
      <div className="keys-grid" style={{ marginTop: 16 }}>
        <div className="keys-group">
          <h3>{t('keys.modes')}</h3>
          {MODE_KEYS.map((k, i) => (
            <div key={k} className="keys-row">
              <span>{t(k)}</span>
              <kbd className="num">{i + 1}</kbd>
            </div>
          ))}
        </div>
        <div className="keys-group">
          <h3>{t('keys.pages')}</h3>
          {PAGE_KEYS.map((row) => (
            <div key={row.key} className="keys-row">
              <span>{t(row.labelKey)}</span>
              <kbd>{row.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
