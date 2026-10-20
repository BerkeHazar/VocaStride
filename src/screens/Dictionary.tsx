import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Chip, Empty, PageHead, Sheet } from '../components/UI';
import { POS_LIST, loadDict, posLabel } from '../data/words';
import { activeWords } from '../lib/engine';
import { navigate } from '../lib/router';
import { setNote, useApp } from '../lib/store';
import { setRetryKeys } from '../lib/retry';
import { peek, resolve, say, type PronRecord } from '../lib/pronounce';
import { sfx } from '../lib/audio';
import { useLang, useT } from '../lib/useT';
import { pluralWord, type MsgKey } from '../lib/i18n';
import { toast } from '../lib/toast';
import type { DictEntry } from '../types';

type Status = 'all' | 'new' | 'learning' | 'mastered' | 'weak';

// "Hepsi" yalnızca tür satırında var; durum satırında seçimi kaldırmak yeterli.
const STATUS: { id: Exclude<Status, 'all'>; labelKey: MsgKey }[] = [
  { id: 'new', labelKey: 'dict.sNew' },
  { id: 'learning', labelKey: 'dict.sLearning' },
  { id: 'mastered', labelKey: 'dict.sMastered' },
  { id: 'weak', labelKey: 'dict.sWeak' },
];

const PAGE = 80;

const IPA_GUIDE: [string, string, string][] = [
  ['/iː/', 'see', 'uzun i'],
  ['/ɪ/', 'sit', 'kısa i'],
  ['/e/', 'bed', 'e'],
  ['/æ/', 'cat', 'geniş a'],
  ['/ʌ/', 'cup', 'kısa a'],
  ['/ɑː/', 'car', 'uzun a'],
  ['/ɒ/', 'hot', 'yuvarlak o'],
  ['/ɔː/', 'law', 'uzun o'],
  ['/ʊ/', 'book', 'kısa u'],
  ['/uː/', 'food', 'uzun u'],
  ['/ə/', 'about', 'şva (vurgusuz)'],
  ['/ɜː/', 'bird', 'uzun ö'],
  ['/eɪ/', 'day', 'ey'],
  ['/aɪ/', 'my', 'ay'],
  ['/ɔɪ/', 'boy', 'oy'],
  ['/aʊ/', 'now', 'av'],
  ['/əʊ/', 'go', 'ou'],
  ['/ɪə/', 'near', 'ia'],
  ['/eə/', 'hair', 'ea'],
  ['/θ/', 'think', 'peltek t'],
  ['/ð/', 'this', 'peltek d'],
  ['/ʃ/', 'she', 'ş'],
  ['/ʒ/', 'vision', 'j'],
  ['/tʃ/', 'chair', 'ç'],
  ['/dʒ/', 'job', 'c'],
  ['/ŋ/', 'sing', 'ng'],
];

export default function Dictionary() {
  const state = useApp();
  const t = useT();
  const lang = useLang();
  const words = useMemo(() => activeWords(state), [state]);
  const [raw, setRaw] = useState('');
  const q = useDeferredValue(raw);
  const [pos, setPos] = useState('all');
  const [status, setStatus] = useState<Status>('all');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<string | null>(null);
  const [dict, setDict] = useState<Record<string, DictEntry> | null>(null);
  const [guide, setGuide] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    setLimit(PAGE);
  }, [q, pos, status]);

  useEffect(() => {
    if (!state.settings.dict && !selected) return;
    loadDict().then(setDict).catch(() => undefined);
  }, [state.settings.dict, selected]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    return words.filter((w) => {
      if (pos !== 'all' && w.pos !== pos) return false;
      const rec = state.srs[w.key];
      if (status === 'new' && rec) return false;
      if (status === 'learning' && (!rec || rec.box >= 5)) return false;
      if (status === 'mastered' && (!rec || rec.box < 5)) return false;
      if (status === 'weak' && (!rec || rec.bad <= rec.ok)) return false;
      if (!needle) return true;
      return (
        w.w.toLowerCase().includes(needle) ||
        w.tr.toLocaleLowerCase('tr').includes(needle) ||
        (w.syn ?? '').toLowerCase().includes(needle)
      );
    });
  }, [words, q, pos, status, state.srs]);

  const word = selected ? words.find((w) => w.key === selected) : null;
  const rec = word ? state.srs[word.key] : undefined;
  const entry = word && dict ? dict[word.key] : undefined;

  const [stuck, setStuck] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "/" aramaya götürür: sözlükte gezinmenin en hızlı yolu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Görünen liste harf başlıklarına bölünür: 1200 satırda yön bulmayı kolaylaştırır. */
  const groups = useMemo(() => {
    const out: { letter: string; items: typeof filtered }[] = [];
    for (const w of filtered.slice(0, limit)) {
      const letter = w.w.charAt(0).toLocaleUpperCase('tr');
      const last = out[out.length - 1];
      if (last && last.letter === letter) last.items.push(w);
      else out.push({ letter, items: [w] });
    }
    return out;
  }, [filtered, limit]);

  // Ses kaynağı: kart açılınca önbellekten okunur, yoksa arka planda çözülür.
  const [pron, setPron] = useState<PronRecord | null>(null);
  useEffect(() => {
    if (!word) {
      setPron(null);
      return;
    }
    setPron(peek(word.w));
    let alive = true;
    void resolve(word.w).then((r) => {
      if (alive) setPron(r);
    });
    return () => {
      alive = false;
    };
  }, [word]);

  useEffect(() => {
    if (word) setNoteDraft(state.notes[word.key] ?? '');
  }, [word, state.notes]);

  const open = (key: string) => {
    setSelected(key);
    if (state.settings.dict) loadDict().catch(() => undefined);
  };

  return (
    <div className="page screen-enter">
      <PageHead
        title={t('dict.title')}
        sub={t('dict.sub', { n: words.length, word: pluralWord(words.length, lang) })}
        actions={
          <>
            <button
              type="button"
              className="btn btn-sm"
              title={t('dict.randomHint')}
              aria-label={t('dict.random')}
              onClick={() => {
                if (!filtered.length) return;
                const pick = filtered[Math.floor(Math.random() * filtered.length)];
                open(pick.key);
                sfx('tap');
              }}
            >
              <Icon name="spark" size={15} />
              <span className="hide-mobile">{t('dict.random')}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              aria-label={t('dict.ipaGuide')}
              onClick={() => setGuide(true)}
            >
              <Icon name="info" size={15} />
              <span className="hide-mobile">{t('dict.ipaGuide')}</span>
            </button>
          </>
        }
      />

      <div className="dict-tools" data-stuck={stuck}>
        <div className="search">
          <Icon name="search" size={18} />
          <input
            ref={searchRef}
            className="input"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t('dict.search')}
            type="search"
            enterKeyHint="search"
            aria-label={t('dict.searchLabel')}
          />
          {raw && (
            <button type="button" className="clear" aria-label={t('dict.clear')} onClick={() => setRaw('')}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        <div className="filter-row" role="group" aria-label={t('dict.type')}>
          <Chip on={pos === 'all'} onClick={() => setPos('all')}>
            {t('dict.all')}
          </Chip>
          {POS_LIST.map((p) => (
            <Chip key={p} on={pos === p} onClick={() => setPos(p)}>
              {posLabel(p, lang)}
            </Chip>
          ))}
        </div>

        <div className="filter-row soft" role="group" aria-label={t('dict.status')}>
          {STATUS.map((s) => (
            <Chip
              key={s.id}
              on={status === s.id}
              onClick={() => setStatus(status === s.id ? 'all' : s.id)}
            >
              {t(s.labelKey)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="dict-count">
        {t('dict.count', { n: filtered.length, word: pluralWord(filtered.length, lang) })}
        {q ? ` · “${q}”` : ''}
      </div>

      {filtered.length === 0 ? (
        <div className="panel">
          <Empty
            title={t('dict.none')}
            text={t('dict.noneText')}
            action={
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setRaw('');
                  setPos('all');
                  setStatus('all');
                }}
              >
                {t('dict.clearFilters')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="dict-list">
          {groups.map((group) => (
            <div key={group.letter}>
              <div className="dict-letter" aria-hidden="true">
                {group.letter}
              </div>
              {group.items.map((w, idx) => {
                const r = state.srs[w.key];
                return (
                  <button
                    key={w.key}
                    type="button"
                    className="dict-row"
                    style={{ '--i': Math.min(idx, 12) } as React.CSSProperties}
                    onClick={() => open(w.key)}
                  >
                    <span className="dict-main">
                      <span className="dict-word">
                        <b>{w.w}</b>
                        <em>{posLabel(w.pos, lang)}</em>
                      </span>
                      <span className="dict-tr">{w.tr}</span>
                    </span>
                    <span className="dict-side">
                      <span className="mastery-dots" aria-label={`${r?.box ?? 0} / 5`}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <i key={i} data-on={(r?.box ?? 0) >= i} />
                        ))}
                      </span>
                      {state.notes[w.key] && <span className="dict-note-dot" />}
                    </span>
                    <Icon name="chevron-right" size={16} />
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length > limit && (
            <div className="dict-more">
              <button type="button" className="btn btn-sm" onClick={() => setLimit((l) => l + PAGE)}>
                {t('dict.more', { n: filtered.length - limit })}
              </button>
            </div>
          )}
        </div>
      )}

      <Sheet
        open={!!word}
        onClose={() => setSelected(null)}
        title={word ? t('dict.card') : ''}
        footer={
          word ? (
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary grow"
                onClick={() => {
                  setRetryKeys([word.key]);
                  setSelected(null);
                  navigate('/study/quiz');
                }}
              >
                <Icon name="play" size={16} /> {t('dict.studyWord')}
              </button>
              <button
                type="button"
                className="btn"
                aria-label={t('dict.listenWord')}
                onClick={() => void say(word.w, state.settings.pron)}
              >
                <Icon name="volume" size={18} />
              </button>
            </div>
          ) : null
        }
      >
        {word && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="detail-head">
              <div>
                <div className="detail-word">{word.w}</div>
                <div className="detail-ipa">
                  {entry?.ipa
                    ? `/${entry.ipa}/`
                    : word.custom
                      ? t('dict.custom')
                      : state.settings.dict
                        ? t('dict.loading')
                        : t('dict.ipaOff')}
                </div>
              </div>
              <div className="detail-tags">
                <span className="tag tag-soft">{posLabel(word.pos, lang)}</span>
                {rec && rec.bad >= 4 && <span className="tag">{t('dict.stubborn')}</span>}
              </div>
            </div>

            <div className="pron-row">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void say(word.w, state.settings.pron)}
              >
                <Icon name="volume" size={15} /> {t('dict.listen')}
              </button>
              <span className="pron-src">
                {pron ? (
                  <>
                    <a href={pron.page} target="_blank" rel="noopener noreferrer">
                      {pron.by}
                    </a>
                    <span className="dim"> · {pron.lic} · Wikimedia Commons</span>
                  </>
                ) : (
                  <span className="dim">
                    {state.settings.pron === 'device' ? t('dict.pronDevice') : t('dict.pronSearching')}
                  </span>
                )}
              </span>
            </div>

            <div className="detail-block">
              <span className="db-lbl">{t('dict.turkish')}</span>
              <span className="db-val">{word.tr}</span>
            </div>

            {word.syn && (
              <div className="detail-block">
                <span className="db-lbl">{t('dict.synonym')}</span>
                <span className="db-val">{word.syn}</span>
              </div>
            )}

            {state.settings.dict && entry?.def && (
              <div className="detail-block">
                <span className="db-lbl">{t('dict.definition')}</span>
                <span className="db-val" style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)' }}>
                  {entry.def}
                </span>
              </div>
            )}

            <div className="detail-block">
              <span className="db-lbl">{t('dict.mastery')}</span>
              <div className="row" style={{ gap: 8 }}>
                <span className="mastery-dots" style={{ gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <i key={i} data-on={(rec?.box ?? 0) >= i} style={{ width: 8, height: 8 }} />
                  ))}
                </span>
                <span className="tiny dim">
                  {rec ? t('dict.okBad', { o: rec.ok, b: rec.bad }) : t('dict.notStudied')}
                </span>
              </div>
            </div>

            <div className="detail-note">
              <label className="db-lbl" htmlFor="note">
                {t('dict.note')}
              </label>
              <textarea
                id="note"
                className="textarea"
                style={{ minHeight: 76 }}
                placeholder={t('dict.notePlaceholder')}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setNote(word.key, noteDraft);
                    toast(t('dict.noteSaved'), 'ok', 1600);
                  }}
                >
                  {t('dict.saveNote')}
                </button>
                {state.notes[word.key] && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      setNoteDraft('');
                      setNote(word.key, '');
                    }}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={guide} onClose={() => setGuide(false)} title={t('dict.ipaGuide')}>
        <p className="tiny dim" style={{ marginBottom: 8 }}>
          {t('dict.ipaIntro')}
        </p>
        <table className="ipa-table">
          <thead>
            <tr>
              <th>{t('dict.ipaSymbol')}</th>
              <th>{t('dict.ipaExample')}</th>
              {lang === 'tr' && <th>{t('dict.ipaTurkish')}</th>}
            </tr>
          </thead>
          <tbody>
            {IPA_GUIDE.map(([sym, ex, tr]) => (
              <tr key={sym}>
                <td className="ipa">{sym}</td>
                <td>{ex}</td>
                {lang === 'tr' && <td className="dim">{tr}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ipa-note">{t('dict.ipaNote')}</p>
      </Sheet>
    </div>
  );
}
