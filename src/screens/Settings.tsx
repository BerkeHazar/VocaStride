import { useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Wordmark } from '../components/Logo';
import { Chip, PageHead, Sheet, Switch } from '../components/UI';
import {
  createList,
  deleteList,
  exportBackup,
  importBackup,
  parseList,
  resetAll,
  restoreSnapshot,
  serializeState,
  setActiveList,
  setListDifficulty,
  setSettings,
  setStudy,
  useApp,
} from '../lib/store';
import { activeWords, dateStr } from '../lib/engine';
import { plannedLevelCount } from '../data/bands';
import { DIFFICULTY } from '../lib/levels';
import { snapshotAge, snapshots, takeSnapshot } from '../lib/sustain';
import { toast } from '../lib/toast';
import { say } from '../lib/pronounce';
import { useLang, useT } from '../lib/useT';
import { pluralWord } from '../lib/i18n';
import type { Accent, Direction, ListDifficulty, Source, ThemePref } from '../types';

const THEMES: { id: ThemePref; key: 'set.light' | 'set.dark' | 'set.auto' }[] = [
  { id: 'light', key: 'set.light' },
  { id: 'dark', key: 'set.dark' },
  { id: 'auto', key: 'set.auto' },
];

const ACCENTS: { id: Accent; label: string }[] = [
  { id: 'marker', label: 'Mürekkep' },
  { id: 'pink', label: 'Erik' },
  { id: 'mint', label: 'Yosun' },
  { id: 'sun', label: 'Oker' },
];

const ACCENT_EN: Record<Accent, string> = {
  marker: 'Ink',
  pink: 'Plum',
  mint: 'Moss',
  sun: 'Ochre',
};

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'mixed', label: 'Karışık' },
  { id: 'en-tr', label: 'EN → TR' },
  { id: 'tr-en', label: 'TR → EN' },
  { id: 'syn', label: 'Eşanlamlı' },
];

const SOURCES: { id: Source; labelKey: 'src.smart' | 'src.due' | 'src.weak' | 'src.all' }[] = [
  { id: 'smart', labelKey: 'src.smart' },
  { id: 'due', labelKey: 'src.due' },
  { id: 'weak', labelKey: 'src.weak' },
  { id: 'all', labelKey: 'src.all' },
];

const CAPS = [12, 24, 40];
const WEEKS = [3, 4, 5, 6, 7];

const DIFFICULTIES: ListDifficulty[] = ['easy', 'normal', 'hard'];

export default function Settings() {
  const state = useApp();
  const t = useT();
  const lang = useLang();
  const s = state.settings;
  const words = activeWords(state);
  const [newList, setNewList] = useState(false);
  const [listName, setListName] = useState('');
  const [listText, setListText] = useState('');
  const [listDiff, setListDiff] = useState<ListDifficulty>('normal');
  const parsedCount = useMemo(() => parseList(listText).length, [listText]);
  // Tahmin, listenin zorluğuna göre hesaplanır: kolayda daha çok, zorda daha az
  // bölüm çıkar. Sayı `campaignPlan` ile birebir aynı formülden geliyor.
  const estLevels = parsedCount ? plannedLevelCount(parsedCount, DIFFICULTY[listDiff].fresh) : 0;
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [goalCustom, setGoalCustom] = useState('');
  const [snaps, setSnaps] = useState(() => snapshots());
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Listeye dokununca zorluk sırayla döner: kolay → orta → zor → kolay.
   * Değişiklik anında bildirilir; yol haritası yeni planı bir sonraki açılışta
   * kurar ve gerekirse bölüm işaretçisini kırpar.
   */
  const cycleDifficulty = (id: string, cur: ListDifficulty) => {
    const next = DIFFICULTIES[(DIFFICULTIES.indexOf(cur) + 1) % DIFFICULTIES.length];
    setListDifficulty(id, next);
    toast(t('set.diffChanged', { d: t(`set.diff.${next}` as 'set.diff.easy') }), 'info', 1800);
  };

  const doBackup = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocastride-yedek-${dateStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(t('set.backupDone'), 'ok');
  };

  const doRestore = async (file: File) => {
    const text = await file.text();
    const res = importBackup(text);
    toast(res.message, res.ok ? 'ok' : 'bad');
  };

  return (
    <div className="page screen-enter">
      <PageHead title={t('set.title')} sub={t('set.sub')} />

      <section className="set-section">
        <div className="set-title">
          <Icon name="eye" size={13} /> {t('set.appearance')}
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.language')}</div>
            <div className="set-desc">{t('set.languageDesc')}</div>
          </div>
          <div className="seg" role="group" aria-label={t('set.language')}>
            <button
              type="button"
              aria-pressed={s.lang === 'tr'}
              onClick={() => setSettings({ lang: 'tr' })}
            >
              Türkçe
            </button>
            <button
              type="button"
              aria-pressed={s.lang === 'en'}
              onClick={() => setSettings({ lang: 'en' })}
            >
              English
            </button>
          </div>
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.theme')}</div>
            <div className="set-desc">{t('set.themeDesc')}</div>
          </div>
          <div className="seg" role="group" aria-label={t('set.theme')}>
            {THEMES.map((th) => (
              <button
                key={th.id}
                type="button"
                aria-pressed={s.theme === th.id}
                onClick={() => setSettings({ theme: th.id })}
              >
                {t(th.key)}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.accent')}</div>
            <div className="set-desc">{t('set.accentDesc')}</div>
          </div>
          <div className="row swatches" style={{ gap: 9 }}>
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className="swatch"
                style={{ '--sw': `var(--tone-${a.id})` } as React.CSSProperties}
                aria-pressed={s.accent === a.id}
                aria-label={lang === 'en' ? ACCENT_EN[a.id] : a.label}
                onClick={() => setSettings({ accent: a.id })}
              />
            ))}
          </div>
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.calm')}</div>
            <div className="set-desc">{t('set.calmDesc')}</div>
          </div>
          <Switch checked={s.calm} onChange={(v) => setSettings({ calm: v })} label={t('set.calm')} />
        </div>
      </section>

      <section className="set-section">
        <div className="set-title">
          <Icon name="target" size={13} /> {t('set.study')}
        </div>

        <div className="set-row stack">
          <div>
            <div className="set-lbl">{t('set.goal')}</div>
            <div className="set-desc">{t('set.goalDesc')}</div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {[10, 20, 30, 50].map((n) => (
              <Chip key={n} on={s.goal === n} onClick={() => setSettings({ goal: n })}>
                {t('set.answers', { n })}
              </Chip>
            ))}
            <div className="goal-custom">
              <input
                className="input"
                inputMode="numeric"
                placeholder={t('set.custom')}
                value={goalCustom}
                aria-label={t('set.goal')}
                onChange={(e) => setGoalCustom(e.target.value.replace(/\D/g, '').slice(0, 3))}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const v = Number(goalCustom);
                  if (v >= 5 && v <= 200) {
                    setSettings({ goal: v });
                    setGoalCustom('');
                    toast(t('set.goalSet', { n: v }), 'ok', 1600);
                  } else {
                    toast(t('set.goalRange'), 'bad');
                  }
                }}
              >
                {t('set.apply')}
              </button>
            </div>
          </div>
        </div>

        <div className="set-row stack">
          <div>
            <div className="set-lbl">{t('set.weekly')}</div>
            <div className="set-desc">{t('set.weeklyDesc')}</div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {WEEKS.map((n) => (
              <Chip key={n} on={s.weekly === n} onClick={() => setSettings({ weekly: n })}>
                {t('set.days', { n })}
              </Chip>
            ))}
          </div>
        </div>

        <div className="set-row stack">
          <div>
            <div className="set-lbl">{t('set.cap')}</div>
            <div className="set-desc">{t('set.capDesc')}</div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {CAPS.map((n) => (
              <Chip key={n} on={s.cap === n} onClick={() => setSettings({ cap: n })}>
                {t('set.reviews', { n })}
              </Chip>
            ))}
          </div>
        </div>

        <div className="set-row stack">
          <div>
            <div className="set-lbl">{t('set.direction')}</div>
            <div className="set-desc">{t('set.directionDesc')}</div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {DIRECTIONS.map((d) => (
              <Chip
                key={d.id}
                on={s.study.direction === d.id}
                onClick={() => setStudy({ direction: d.id })}
              >
                {d.label.startsWith('dir.') ? t(d.label as 'dir.mixed') : d.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="set-row stack">
          <div>
            <div className="set-lbl">{t('set.source')}</div>
            <div className="set-desc">{t('set.sourceDesc')}</div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {SOURCES.map((src) => (
              <Chip
                key={src.id}
                on={s.study.source === src.id}
                onClick={() => setStudy({ source: src.id })}
              >
                {t(src.labelKey)}
              </Chip>
            ))}
          </div>
        </div>

        <div className="set-row stack">
          <div>
            <div className="set-lbl">{t('set.length')}</div>
            <div className="set-desc">{t('set.lengthDesc')}</div>
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {[5, 10, 15, 20].map((n) => (
              <Chip key={n} on={s.study.length === n} onClick={() => setStudy({ length: n })}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="set-section">
        <div className="set-title">
          <Icon name="volume" size={13} /> {t('set.pron')}
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.pronSource')}</div>
            <div className="set-desc">{t('set.pronDesc')}</div>
          </div>
          <div className="seg" role="group" aria-label={t('set.pronSource')}>
            <button
              type="button"
              aria-pressed={s.pron === 'wikimedia'}
              onClick={() => setSettings({ pron: 'wikimedia' })}
            >
              {t('set.pronWikimedia')}
            </button>
            <button
              type="button"
              aria-pressed={s.pron === 'device'}
              onClick={() => setSettings({ pron: 'device' })}
            >
              {t('set.pronDevice')}
            </button>
          </div>
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.pronTry')}</div>
            <div className="set-desc">
              {s.pron === 'wikimedia' ? t('set.pronTryDesc') : t('set.pronTryDescDevice')}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void say('vocabulary', s.pron)}
            aria-label={t('set.pronTryLabel')}
          >
            <Icon name="volume" size={15} /> vocabulary
          </button>
        </div>
      </section>

      <section className="set-section">
        <div className="set-title">
          <Icon name="spark" size={13} /> {t('set.experience')}
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.sfx')}</div>
            <div className="set-desc">{t('set.sfxDesc')}</div>
          </div>
          <Switch checked={s.sound} onChange={(v) => setSettings({ sound: v })} label={t('set.sfx')} />
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.haptics')}</div>
            <div className="set-desc">{t('set.hapticsDesc')}</div>
          </div>
          <Switch checked={s.haptics} onChange={(v) => setSettings({ haptics: v })} label={t('set.haptics')} />
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.dict')}</div>
            <div className="set-desc">{t('set.dictDesc')}</div>
          </div>
          <Switch checked={s.dict} onChange={(v) => setSettings({ dict: v })} label={t('set.dict')} />
        </div>
      </section>

      <section className="set-section">
        <div className="set-title">
          <Icon name="grid" size={13} /> {t('set.lists')}
        </div>
        <div className="list-row">
          <span className="badge-ico" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Icon name="grid" size={16} />
          </span>
          <div className="grow">
            <div className="list-name">{t('set.core')}</div>
            <div className="list-meta num">{t('set.coreMeta')}</div>
          </div>
          {state.activeList === 'default' ? (
            <span className="tag tag-soft">{t('set.active')}</span>
          ) : (
            <button type="button" className="btn btn-sm" onClick={() => setActiveList('default')}>
              {t('set.select')}
            </button>
          )}
        </div>

        {state.lists.map((l) => {
          const count = state.customWords.filter((w) => w.listId === l.id).length;
          return (
            <div key={l.id} className="list-row">
              <span className="badge-ico" style={{ background: 'var(--tone-mint-soft)', color: 'var(--tone-mint)' }}>
                <Icon name="book" size={16} />
              </span>
              <div className="grow">
                <div className="list-name">
                  {l.name}
                  <button
                    type="button"
                    className="tag tag-soft list-diff"
                    data-diff={l.difficulty}
                    onClick={() => cycleDifficulty(l.id, l.difficulty)}
                    aria-label={`${t('set.listDifficulty')}: ${t(
                      `set.diff.${l.difficulty}` as 'set.diff.easy',
                    )} — ${t('set.diffEdit')}`}
                    title={t('set.diffEdit')}
                  >
                    {t(`set.diff.${l.difficulty}` as 'set.diff.easy')}
                  </button>
                </div>
                <div className="list-meta num">
                  {t('common.words', { n: count, word: pluralWord(count, lang) })} ·{' '}
                  {t('set.listLevels', {
                    n: plannedLevelCount(count, DIFFICULTY[l.difficulty].fresh),
                  })}
                </div>
              </div>
              {state.activeList === l.id ? (
                <span className="tag tag-soft">{t('set.active')}</span>
              ) : (
                <button type="button" className="btn btn-sm" onClick={() => setActiveList(l.id)}>
                  {t('set.select')}
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                style={{ width: 34, height: 34, color: 'var(--ink-3)' }}
                aria-label={`${l.name} listesini sil`}
                onClick={() => setRemoveId(l.id)}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          );
        })}

        <button type="button" className="btn btn-sm" style={{ justifySelf: 'start', marginTop: 10 }} onClick={() => setNewList(true)}>
          <Icon name="plus" size={15} /> {t('set.newList')}
        </button>
        <p className="set-note num">
          {t('set.activeList', {
            n:
              state.activeList === 'default'
                ? t('set.core')
                : (state.lists.find((l) => l.id === state.activeList)?.name ?? ''),
            c: words.length,
            word: pluralWord(words.length, lang),
          })}
        </p>
      </section>

      <section className="set-section">
        <div className="set-title">
          <Icon name="shield" size={13} /> {t('set.data')}
        </div>

        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.backup')}</div>
            <div className="set-desc">{t('set.backupDesc')}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={doBackup}>
            <Icon name="download" size={15} /> {t('set.download')}
          </button>
        </div>

        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.restore')}</div>
            <div className="set-desc">{t('set.restoreDesc')}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={15} /> {t('set.choose')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doRestore(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="set-row">
          <div>
            <div className="set-lbl">{t('set.autoSnap')}</div>
            <div className="set-desc">{t('set.autoSnapDesc')}</div>
          </div>
          <Switch
            checked={s.snaps}
            onChange={(v) => setSettings({ snaps: v })}
            label={t('set.autoSnap')}
          />
        </div>

        {snaps.length > 0 && (
          <div className="snap-list">
            {snaps.map((sn) => (
              <div key={sn.id} className="snap-row">
                <span className="grow">
                  <b className="num">
                    {t('common.words', { n: sn.words, word: pluralWord(sn.words, lang) })}
                  </b>
                  <span className="dim"> · {snapshotAge(sn.at)}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    const res = restoreSnapshot(sn.data);
                    toast(res.message, res.ok ? 'ok' : 'bad');
                    if (res.ok) setSnaps(snapshots());
                  }}
                >
                  {t('set.snapRestore')}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const sn = takeSnapshot(serializeState);
              setSnaps(snapshots());
              toast(sn ? t('set.snapDone') : t('set.snapFail'), sn ? 'ok' : 'bad');
            }}
          >
            <Icon name="shield" size={15} /> {t('set.snapNow')}
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setResetOpen(true)}>
            <Icon name="trash" size={15} /> {t('set.reset')}
          </button>
        </div>

        <p className="set-note">{t('set.dataNote')}</p>
      </section>

      <section className="about">
        <div className="about-word">
          <Wordmark size={19} />
        </div>
        <p>{t('set.about')}</p>
        <div className="row wrap" style={{ gap: 8 }}>
          <a
            className="btn btn-sm"
            href="https://github.com/BerkeHazar/VocaStride"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={15} /> {t('set.sourceCode')}
          </a>
          <a
            className="btn btn-sm"
            href="https://commons.wikimedia.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikimedia Commons
          </a>
          <span className="tag">{navigator.onLine ? t('set.online') : t('set.offline')}</span>
        </div>
        <p className="tiny dim">{t('set.license')}</p>
      </section>

      <Sheet open={newList} onClose={() => setNewList(false)} title={t('set.newList')}>
        <div className="stack">
          <label className="field">
            <span>{t('set.listName')}</span>
            <input
              className="input"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder={t('set.listNamePlaceholder')}
              maxLength={40}
            />
          </label>
          <label className="field">
            <span>{t('set.listWords')}</span>
            <textarea
              className="textarea"
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              placeholder={'Her satıra bir kelime:\nabandon | v | leave | terk etmek\nresilient - dayanıklı'}
            />
          </label>
          <p className="tiny dim">{t('set.listHint')}</p>

          {/*
            * Zorluk: kullanıcı listesinin seviyesini kendisi söylüyor. Seçim
            * bölüm başına yeni kelimeyi, mod rampasının başlangıcını ve geçme
            * eşiğini belirliyor; açıklama satırı ne olduğunu tek cümlede diyor.
            */}
          <div className="opt-group">
            <span className="opt-label">{t('set.listDifficulty')}</span>
            <div className="seg" role="group" aria-label={t('set.listDifficulty')}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={listDiff === d}
                  onClick={() => setListDiff(d)}
                >
                  {t(`set.diff.${d}` as 'set.diff.easy')}
                </button>
              ))}
            </div>
            <p className="set-desc">{t(`set.diffHint.${listDiff}` as 'set.diffHint.easy')}</p>
          </div>

          <div className="list-guide">
            <b>{t('set.listGuide')}</b>
            <pre>{'abandon | v | leave | terk etmek\nresilient - dayanıklı'}</pre>
            <p>{t('set.listGuideFormat')}</p>
            <p>{t('set.listGuideLevel')}</p>
            <p className="num list-guide-count">
              {t('set.listGuideLevels', { n: parsedCount, m: estLevels, f: DIFFICULTY[listDiff].fresh })}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              if (!listText.trim()) {
                toast(t('set.listNeedOne'), 'bad');
                return;
              }
              const res = createList(listName, listText, listDiff);
              if (res.count === 0) {
                toast(t('set.listBadFormat'), 'bad');
                return;
              }
              setActiveList(res.id);
              setNewList(false);
              setListName('');
              setListText('');
              setListDiff('normal');
              toast(t('set.listAdded', { n: res.count }), 'ok');
            }}
          >
            {t('set.listCreate')}
          </button>
        </div>
      </Sheet>

      <Sheet open={!!removeId} onClose={() => setRemoveId(null)} title={t('set.listDeleteTitle')}>
        <div className="stack">
          <p className="tiny dim">{t('set.listDeleteText')}</p>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              if (removeId) deleteList(removeId);
              setRemoveId(null);
              toast(t('set.listDeleted'), 'info');
            }}
          >
            {t('common.delete')}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setRemoveId(null)}>
            {t('common.cancel')}
          </button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title={t('set.resetTitle')}>
        <div className="stack">
          <p className="tiny dim">
            {t('set.resetText', { n: state.stats.totalOk, m: state.badges.length })}
          </p>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={() => {
              resetAll();
              setResetOpen(false);
              toast(t('set.resetDone'), 'info');
            }}
          >
            {t('set.resetConfirm')}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setResetOpen(false)}>
            {t('common.cancel')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
