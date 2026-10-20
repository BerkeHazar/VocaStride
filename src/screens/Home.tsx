import { useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { Bar, Chip, Ring, Sheet } from '../components/UI';
import { Footer } from '../components/Shell';
import { WORDS, posLabel } from '../data/words';
import { activeWords, promptSense, todayStr, weakKeys } from '../lib/engine';
import { leechKeys, loadAdvice, loadForecast, rhythm } from '../lib/sustain';
import { navigate } from '../lib/router';
import { recordAnswer, setStudy, useApp, markChallengeDone } from '../lib/store';
import { makeQuestion } from '../lib/session';
import { sfx, buzz } from '../lib/audio';
import { clearRetryKeys } from '../lib/retry';
import { setActiveLevel } from '../lib/campaign';
import { play } from '../lib/pronounce';
import { pluralWord, type MsgKey } from '../lib/i18n';
import { useT } from '../lib/useT';
import type { Direction, Mode, Source } from '../types';

interface ModeDef {
  id: Mode;
  nameKey: MsgKey;
  descKey: MsgKey;
  tone: 'marker' | 'pink' | 'mint' | 'sun' | 'violet';
  icon: IconName;
}

const MODES: ModeDef[] = [
  { id: 'quiz', nameKey: 'mode.quiz', descKey: 'mode.quizDesc', tone: 'marker', icon: 'target' },
  { id: 'cards', nameKey: 'mode.cards', descKey: 'mode.cardsDesc', tone: 'violet', icon: 'cards' },
  { id: 'match', nameKey: 'mode.match', descKey: 'mode.matchDesc', tone: 'pink', icon: 'swap' },
  { id: 'speed', nameKey: 'mode.speed', descKey: 'mode.speedDesc', tone: 'sun', icon: 'bolt' },
  { id: 'listen', nameKey: 'mode.listen', descKey: 'mode.listenDesc', tone: 'mint', icon: 'volume' },
  { id: 'type', nameKey: 'mode.type', descKey: 'mode.typeDesc', tone: 'marker', icon: 'edit' },
  { id: 'marathon', nameKey: 'mode.marathon', descKey: 'mode.marathonDesc', tone: 'violet', icon: 'crown' },
];

const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: 'mixed', label: 'dir.mixed' },
  { id: 'en-tr', label: 'EN → TR' },
  { id: 'tr-en', label: 'TR → EN' },
  { id: 'syn', label: 'dir.syn' },
];

const SOURCES: { id: Source; labelKey: MsgKey }[] = [
  { id: 'smart', labelKey: 'src.smart' },
  { id: 'due', labelKey: 'src.due' },
  { id: 'weak', labelKey: 'src.weak' },
  { id: 'all', labelKey: 'src.all' },
];

// 0 = sınırsız: tur bitmez, sorular parti parti uzar.
const LENGTHS = [5, 10, 15, 20, 0];


export default function Home() {
  const state = useApp();
  const t = useT();
  const lang = state.settings.lang;
  const words = useMemo(() => activeWords(state), [state]);
  const weak = useMemo(() => weakKeys(state, words), [state, words]);
  const leeches = useMemo(() => leechKeys(state, words), [state, words]);
  const load = useMemo(() => loadForecast(state, words), [state, words]);
  const rh = useMemo(() => rhythm(state, state.settings.weekly, lang), [state, lang]);

  const [setup, setSetup] = useState<ModeDef | null>(null);
  const [installEvt, setInstallEvt] = useState<Event | null>(null);
  const [installHidden, setInstallHidden] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const byKey = useMemo(() => new Map(words.map((w) => [w.key, w])), [words]);

  const goalPct = Math.min(1, state.daily.count / Math.max(1, state.settings.goal));
  const advice = loadAdvice(load, state.settings.goal, lang);
  const focusKeys = useMemo(() => [...new Set([...leeches, ...weak])].slice(0, 4), [leeches, weak]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const start = (mode: Mode) => {
    sfx('tap');
    clearRetryKeys();
    setActiveLevel(null);
    navigate(`/study/${mode}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        start('quiz');
        return;
      }
      const i = Number(e.key) - 1;
      if (i >= 0 && i < MODES.length) {
        e.preventDefault();
        start(MODES[i].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const challengeDone = state.challenge.date === todayStr() && state.challenge.done;
  const dateLabel = new Date().toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  return (
    <div className="home screen-enter">
      {installEvt && !installHidden && (
        <div className="install-bar">
          <Icon name="download" size={16} />
          <span className="grow">
            <b>{t('home.installTitle')}</b> — {t('home.installSub')}
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={async () => {
              const evt = installEvt as Event & { prompt?: () => Promise<void> };
              await evt.prompt?.();
              setInstallHidden(true);
            }}
          >
            {t('home.install')}
          </button>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 32, height: 32 }}
            aria-label={t('common.close')}
            onClick={() => setInstallHidden(true)}
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <header className="day-head">
        <div className="dh-main">
          <h1 className="day-title">{t('nav.practice')}</h1>
          <p className="day-sub">{dateLabel}</p>
        </div>
        <div className="day-goal" title={t('home.goal')}>
          <Ring value={goalPct} size={44} strokeWidth={3.5}>
            <b className="num">{state.daily.count}</b>
          </Ring>
          <span className="dg-text">
            <b>{t('home.goal')}</b>
            <span>
              {t('common.words', {
                n: state.settings.goal,
                word: pluralWord(state.settings.goal, lang),
              })}
            </span>
          </span>
        </div>
      </header>

      <div className="home-cols">
        <div className="home-main">
          <section className="sec" aria-labelledby="modes-h">
            <div className="sec-head">
              <h2 id="modes-h">{t('home.modes')}</h2>
            </div>
            <div className="mode-list">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  className="mode-row"
                  data-tone={m.tone}
                  data-featured={m.id === 'marathon' ? 'true' : undefined}
                  style={{ '--i': i } as React.CSSProperties}
                  onClick={() => setSetup(m)}
                >
                  <span className="mr-ico">
                    <Icon name={m.icon} size={18} />
                  </span>
                  <span className="mr-text">
                    <b>{t(m.nameKey)}</b>
                    <span>{t(m.descKey)}</span>
                  </span>
                  <kbd className="mr-key num" aria-hidden="true">
                    {i + 1}
                  </kbd>
                </button>
              ))}
            </div>
          </section>

          {focusKeys.length > 0 && (
          <section className="sec" aria-labelledby="focus-h">
            <div className="sec-head">
              <h2 id="focus-h">{t('home.focus')}</h2>
              {focusKeys.length > 0 && (
                <button
                  type="button"
                  className="sec-action"
                  onClick={() => {
                    setStudy({ source: 'weak' });
                    start('quiz');
                  }}
                >
                  {t('common.study')}
                  <Icon name="arrow-right" size={14} />
                </button>
              )}
            </div>
            {focusKeys.length === 0 ? (
              <p className="sec-empty">{t('home.focusEmpty')}</p>
            ) : (
              <ul className="focus-list">
                {focusKeys.map((key) => {
                  const w = byKey.get(key);
                  const rec = state.srs[key];
                  if (!w) return null;
                  return (
                    <li key={key} className="focus-row">
                      <span className="fr-main">
                        <b>{w.w}</b>
                        <span className="dim"> · {promptSense(w.tr)}</span>
                      </span>
                      <span className="fr-meta num">
                        {rec && rec.bad >= 4
                          ? t('home.stubborn')
                          : (rec?.bad ?? 0) > 0
                            ? t('home.misses', {
                                n: rec?.bad ?? 0,
                                es: (rec?.bad ?? 0) === 1 ? '' : 'es',
                              })
                            : t('home.box', { n: rec?.box ?? 0 })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          )}
        </div>

        <aside className="home-rail">
          <section className="sec" aria-labelledby="rhythm-h">
            <div className="sec-head">
              <h2 id="rhythm-h">{t('home.rhythm')}</h2>
              <span className="sec-note num">
                {t('home.rhythmDays', { n: Math.min(rh.done, rh.target), m: rh.target })}
              </span>
            </div>
            <div className="week" aria-label={t('home.rhythm')}>
              {rh.days.map((d, i) => (
                <span
                  key={d.iso}
                  className="wd"
                  data-on={d.on}
                  data-today={d.today}
                  data-future={d.future}
                  style={{ '--i': i } as React.CSSProperties}
                  title={d.iso}
                >
                  <i />
                  <em>{d.label}</em>
                </span>
              ))}
            </div>
            <p className="sec-note-block">
              {rh.need === 0
                ? t('home.rhythmDone')
                : t('home.rhythmLeft', { n: rh.need, m: rh.left })}
            </p>
          </section>

          {load.studied > 0 && (
          <section className="sec" aria-labelledby="load-h">
            <div className="sec-head">
              <h2 id="load-h">{t('home.load')}</h2>
              <span className="sec-note num">
                {t('home.loadPerDay', { n: load.perDay < 1 ? '<1' : Math.round(load.perDay) })}
              </span>
            </div>
            <p className="sec-note-block">
              {advice ??
                t('home.loadFallback', {
                  n: load.studied,
                  p: Math.round(load.accuracy * 100),
                  word: pluralWord(load.studied, lang),
                })}
            </p>
          </section>
          )}

          <section className="sec">
            <button
              type="button"
              className="challenge"
              disabled={challengeDone}
              onClick={() => setChallengeOpen(true)}
            >
              <Icon name={challengeDone ? 'check' : 'spark'} size={16} />
              <span className="grow">
                <b>{t('home.challenge')}</b>
                <span>{challengeDone ? t('home.challengeDone') : t('home.challengeSub')}</span>
              </span>
              <Icon name="chevron-right" size={15} />
            </button>
          </section>

          <section className="sec level" aria-labelledby="level-h">
            <div className="sec-head">
              <h2 id="level-h">{t('level.short', { n: state.level })}</h2>
              <span className="sec-note num">
                {Math.min(state.xp, 50 + state.level * 50)}/{50 + state.level * 50} XP
              </span>
            </div>
            <Bar
              value={Math.min(1, state.xp / Math.max(1, 50 + state.level * 50))}
              thin
              label={t('level.xp')}
            />
            <p className="sec-note-block num">
              {t('home.statsLine', { n: state.stats.totalOk, m: state.badges.length })}
            </p>
          </section>
        </aside>
      </div>

      <Footer />

      <SetupSheet mode={setup} onClose={() => setSetup(null)} onStart={start} />
      <ChallengeSheet
        open={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        wordKey={state.challenge.wordKey}
      />
    </div>
  );
}

function SetupSheet({
  mode,
  onClose,
  onStart,
}: {
  mode: ModeDef | null;
  onClose: () => void;
  onStart: (m: Mode) => void;
}) {
  const state = useApp();
  const t = useT();
  const s = state.settings.study;
  // Maraton her zaman karışık yönle oynanır; yön seçimi orada anlamsız olurdu.
  const showDirection = mode?.id === 'quiz' || mode?.id === 'review';
  const showLength =
    mode?.id === 'quiz' ||
    mode?.id === 'cards' ||
    mode?.id === 'listen' ||
    mode?.id === 'type' ||
    mode?.id === 'marathon';

  return (
    <Sheet
      open={!!mode}
      onClose={onClose}
      title={mode ? t(mode.nameKey) : t('home.modes')}
      footer={
        mode ? (
          <button
            type="button"
            className="btn btn-accent btn-lg btn-block"
            onClick={() => {
              onClose();
              onStart(mode.id);
            }}
          >
            {t('common.start')}
            <Icon name="arrow-right" size={17} />
          </button>
        ) : null
      }
    >
      {mode && (
        <div className="stack" style={{ gap: 22 }}>
          <p className="sheet-lede">{t(`setup.${mode.id}` as MsgKey)}</p>

          {showDirection && (
            <div className="opt-group">
              <span className="opt-label">{t('setup.direction')}</span>
              <div className="opt-row">
                {DIRECTIONS.map((d) => (
                  <Chip key={d.id} on={s.direction === d.id} onClick={() => setStudy({ direction: d.id })}>
                    {d.label.startsWith('dir.') ? t(d.label as MsgKey) : d.label}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="opt-group">
            <span className="opt-label">{t('setup.source')}</span>
            <div className="opt-row">
              {SOURCES.map((src) => (
                <Chip key={src.id} on={s.source === src.id} onClick={() => setStudy({ source: src.id })}>
                  {t(src.labelKey)}
                </Chip>
              ))}
            </div>
          </div>

          {showLength && (
            <div className="opt-group">
              <span className="opt-label">{t('setup.length')}</span>
              <div className="opt-row grid-5">
                {LENGTHS.map((n) => (
                  <Chip
                    key={n}
                    on={(s.length ?? 10) === n}
                    onClick={() => setStudy({ length: n })}
                    aria-label={n === 0 ? t('setup.noLimit') : String(n)}
                  >
                    {n === 0 ? '∞' : n}
                  </Chip>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </Sheet>
  );
}

function ChallengeSheet({
  open,
  onClose,
  wordKey,
}: {
  open: boolean;
  onClose: () => void;
  wordKey: string;
}) {
  const state = useApp();
  const t = useT();
  const word = WORDS.find((w) => w.key === wordKey) ?? WORDS[0];
  const [q, setQ] = useState(() => makeQuestion(word, WORDS, 'en-tr'));
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<{ xp: number } | null>(null);

  useEffect(() => {
    if (open) {
      setQ(makeQuestion(word, WORDS, 'en-tr'));
      setPicked(null);
      setResult(null);
    }
  }, [open, word]);

  const done = state.challenge.date === todayStr() && state.challenge.done;

  const choose = (key: string) => {
    if (picked) return;
    setPicked(key);
    const correct = key === q.answerKey;
    const out = recordAnswer(q.wordKey, correct, 'quiz', 0, 'en-tr');
    setResult({ xp: out.xp });
    if (!correct) markChallengeDone();
    if (correct) {
      sfx('win');
      buzz(30);
    } else {
      sfx('bad');
      buzz(60);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('home.challenge')}>
      <div className="stack" style={{ gap: 18 }}>
        <div className="row-between">
          <span className="tag tag-accent">2× XP</span>
        </div>

        {done && !picked ? (
          <div className="empty" style={{ padding: '18px 8px' }}>
            <h3>{t('home.challengeDone')}</h3>
            <p>{t('home.challengeSub')}</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="ch-word">
              <button
                type="button"
                className="ch-speak"
                aria-label={t('dict.listenWord')}
                onClick={() =>
                  void play(word.w, { device: state.settings.pron === 'wikimedia', urgent: true })
                }
              >
                <span className="q-word small">{q.prompt}</span>
                <Icon name="volume" size={16} />
              </button>
              <div className="tiny dim" style={{ marginTop: 6 }}>
                {posLabel(word.pos, state.settings.lang)}
              </div>
            </div>

            <div className="q-options">
              {q.options.map((o, i) => {
                let st: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle';
                if (picked) {
                  if (o.key === q.answerKey) st = 'correct';
                  else if (o.key === picked) st = 'wrong';
                  else st = 'dim';
                }
                return (
                  <button
                    key={o.key}
                    type="button"
                    className="q-opt"
                    data-state={st}
                    style={{ '--i': i } as React.CSSProperties}
                    disabled={!!picked}
                    onClick={() => choose(o.key)}
                  >
                    <span className="q-key num">{i + 1}</span>
                    <span className="q-text">{o.label}</span>
                    <span className="q-mark">
                      {st === 'correct' ? <Icon name="check" size={18} /> : null}
                      {st === 'wrong' ? <Icon name="x" size={18} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {result && (
              <div className="q-foot">
                <span className="q-feedback" data-ok={picked === q.answerKey}>
                  <Icon name={picked === q.answerKey ? 'check' : 'x'} size={16} />
                  {picked === q.answerKey
                    ? `${t('session.right')} · +${result.xp} XP`
                    : t('sum.wrong')}
                </span>
                <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
                  {t('common.close')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
