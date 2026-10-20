import { useMemo, useState } from 'react';
import { Empty, PageHead } from '../components/UI';
import {
  activeWords,
  addDays,
  answersOn,
  dateStr,
  lastNDays,
  modeLabel,
  todayStr,
  weekdayShort,
} from '../lib/engine';
import { fmtDate, fmtDuration, fmtTime } from '../lib/format';
import { navigate } from '../lib/router';
import { useApp } from '../lib/store';
import { useCountUp } from '../lib/anim';
import { useLang, useT } from '../lib/useT';
import { pluralWord } from '../lib/i18n';

export default function Stats() {
  const state = useApp();
  const t = useT();
  const lang = useLang();
  const [range, setRange] = useState<7 | 30>(7);
  const days = useMemo(() => lastNDays(range), [range]);
  const perDay = useMemo(() => days.map((d) => answersOn(state, d)), [days, state]);
  const max = Math.max(1, ...perDay);
  const total = perDay.reduce((a, b) => a + b, 0);

  const inRange = useMemo(() => {
    const from = days[0];
    return state.stats.sessions.filter((s) => dateStr(new Date(s.date)) >= from);
  }, [days, state.stats.sessions]);

  const correct = inRange.reduce((a, s) => a + s.correct, 0);
  const time = inRange.reduce((a, s) => a + s.timeSec, 0);
  const acc = total ? correct / Math.max(1, correct + inRange.reduce((a, s) => a + s.wrong, 0)) : 0;

  const boxes = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const rec of Object.values(state.srs)) {
      counts[Math.min(5, Math.max(0, rec.box))] += 1;
    }
    return counts;
  }, [state.srs]);

  const totalWords = Object.keys(state.srs).length;
  const maxBox = Math.max(1, ...boxes.slice(1));
  const bankSize = useMemo(() => activeWords(state).length, [state]);
  const mastered = boxes[5];
  const learned = totalWords - boxes[1];

  const heat = useMemo(() => {
    const today = todayStr();
    const [y, m, d] = today.split('-').map(Number);
    const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
    const start = addDays(today, -(25 * 7 + weekday));
    return Array.from({ length: 26 * 7 }, (_, i) => {
      const iso = addDays(start, i);
      const n = answersOn(state, iso);
      const level = n === 0 ? 0 : n < 5 ? 1 : n < 15 ? 2 : n < 30 ? 3 : 4;
      return { iso, n, level, future: iso > today };
    });
  }, [state]);

  const heatTotal = useMemo(() => heat.reduce((a, c) => a + (c.future ? 0 : c.n), 0), [heat]);
  const activeDays = useMemo(() => heat.filter((c) => !c.future && c.n > 0).length, [heat]);
  const bestDay = useMemo(
    () => heat.reduce((a, c) => (c.future ? a : Math.max(a, c.n)), 0),
    [heat],
  );

  const focus = useMemo(
    () =>
      Object.entries(state.srs)
        .filter(([, r]) => r.bad > 0)
        .sort((a, b) => b[1].bad - a[1].bad || a[1].box - b[1].box)
        .slice(0, 5),
    [state.srs],
  );

  const totalShown = useCountUp(total, 700);
  const accShown = useCountUp(Math.round(acc * 100), 700);
  const sessionsShown = useCountUp(inRange.length, 700);
  const hasData = state.stats.sessions.length > 0;

  return (
    <div className="page screen-enter">
      <PageHead
        title={t('stats.title')}
        sub={t('stats.sub')}
        actions={
          <div className="seg" role="group" aria-label={t('stats.range')}>
            <button type="button" aria-pressed={range === 7} onClick={() => setRange(7)}>
              {t('stats.range7')}
            </button>
            <button type="button" aria-pressed={range === 30} onClick={() => setRange(30)}>
              {t('stats.range30')}
            </button>
          </div>
        }
      />

      {!hasData ? (
        <div className="panel">
          <Empty
            title={t('common.noData')}
            text={t('stats.emptyText')}
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('/study/quiz')}>
                {t('stats.firstRound')}
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="stat-strip">
            <div className="stat-cell">
              <span className="stat-val">{totalShown}</span>
              <span className="stat-lbl">{t('stats.answers', { n: range })}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-val">
                {accShown}
                <em>%</em>
              </span>
              <span className="stat-lbl">{t('stats.accuracy')}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-val">{sessionsShown}</span>
              <span className="stat-lbl">{t('stats.sessions')}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-val">{fmtDuration(time, lang)}</span>
              <span className="stat-lbl">{t('stats.studied')}</span>
            </div>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>{t('stats.daily')}</h2>
              <span className="ph-note">{t('stats.max', { n: max })}</span>
            </div>
            <div className="chart" role="img" aria-label={t('stats.dailyAlt', { n: range })}>
              {days.map((d, i) => {
                const v = perDay[i];
                return (
                  <div
                    key={d}
                    className="cb"
                    data-today={d === todayStr()}
                    data-on={v > 0}
                    style={
                      {
                        '--i': i,
                        '--h': v > 0 ? `${Math.max(3, (v / max) * 100)}%` : '0%',
                      } as React.CSSProperties
                    }
                  >
                    <span className="cb-tip num">{t('stats.hover', { n: v })}</span>
                    <span className="cb-val num">{v > 0 ? v : ''}</span>
                    <div className="cb-bar">
                      <i />
                    </div>
                    <span className="cb-lbl">
                      {range === 7 ? weekdayShort(d, lang) : i % 5 === 0 ? d.slice(8) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>{t('stats.heat')}</h2>
              <span className="ph-note num">
                {heatTotal} · {t('stats.heatNote')}
              </span>
            </div>
            <div className="heat-row">
              <div className="heat-wrap">
                <div className="heat">
                  {heat.map((c, i) => (
                    <i
                      key={c.iso}
                      data-l={c.future ? 0 : c.level}
                      title={`${fmtDate(new Date(c.iso).getTime(), lang)}: ${c.n}`}
                      style={
                        { ...(c.future ? { opacity: 0.22 } : null), '--i': i } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
              </div>
              <div className="heat-foot">
                <div className="heat-legend">
                  {t('stats.less')}
                  {[0, 1, 2, 3, 4].map((l) => (
                    <i
                      key={l}
                      data-l={l}
                      style={{ background: l === 0 ? 'var(--surface-2)' : undefined }}
                    />
                  ))}
                  {t('stats.more')}
                </div>
                <div className="heat-side">
                  <div>
                    <b className="num">{heatTotal}</b>
                    <span>{t('stats.answersTitle')}</span>
                  </div>
                  <div>
                    <b className="num">{activeDays}</b>
                    <span>{t('stats.activeDays')}</span>
                  </div>
                  <div>
                    <b className="num">{bestDay}</b>
                    <span>{t('stats.bestDay')}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="stats-split">
            <section className="panel">
              <div className="panel-head">
                <h2>{t('stats.mastery')}</h2>
                <span className="ph-note">{t('stats.masteredNote', { n: mastered })}</span>
              </div>
              <div className="mastery-list">
                {[
                  { label: t('stats.box1'), n: boxes[1], tone: 'var(--tone-pink)' },
                  { label: t('stats.box2'), n: boxes[2], tone: 'var(--tone-sun)' },
                  { label: t('stats.box3'), n: boxes[3], tone: 'var(--tone-mint)' },
                  { label: t('stats.box4'), n: boxes[4], tone: 'var(--tone-marker)' },
                  { label: t('stats.mastered'), n: boxes[5], tone: 'var(--accent)' },
                ].map((row, i) => (
                  <div key={row.label} className="mastery-row">
                    <span className="dim">{row.label}</span>
                    <span className="mr-bar">
                      <i
                        style={
                          {
                            '--w': `${Math.max(row.n > 0 ? 3 : 0, Math.min(100, (row.n / maxBox) * 100))}%`,
                            '--tone': row.tone,
                            '--i': i,
                          } as React.CSSProperties
                        }
                      />
                    </span>
                    <span className="mr-num">{row.n}</span>
                  </div>
                ))}
              </div>
              <p className="set-note">
                {t('stats.unstudied', {
                  n: Math.max(0, bankSize - totalWords),
                  word: pluralWord(Math.max(0, bankSize - totalWords), lang),
                })}{' '}
                {learned > 0 ? t('stats.masteryNote', { n: learned, word: pluralWord(learned, lang) }) : ''}
              </p>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>{t('stats.focus')}</h2>
                <span className="ph-note">{t('stats.focusNote')}</span>
              </div>
              {focus.length === 0 ? (
                <p className="sec-empty">{t('stats.focusEmpty')}</p>
              ) : (
                <div className="focus-list">
                  {focus.map(([key, rec]) => (
                    <div key={key} className="focus-row">
                      <span className="fr-main">
                        <b>{key}</b>
                        <span className="dim">
                          {' '}
                          ·{' '}
                          {t('stats.focusMeta', {
                            n: rec.bad,
                            b: rec.box,
                            es: rec.bad === 1 ? '' : 'es',
                          })}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => navigate('/study/quiz')}
                      >
                        {t('common.study')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="stats-split">
            <section className="panel">
              <div className="panel-head">
                <h2>{t('stats.bestSession')}</h2>
              </div>
              {state.stats.bestSession ? (
                <div className="best">
                  <span className="best-num num">{Math.round(state.stats.bestSession.accuracy * 100)}%</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{modeLabel(state.stats.bestSession.mode, lang)}</div>
                    <div className="tiny dim num">
                      {state.stats.bestSession.correct} · {fmtTime(state.stats.bestSession.timeSec)} ·{' '}
                      {fmtDate(state.stats.bestSession.date, lang)} · +{state.stats.bestSession.xp} XP
                    </div>
                  </div>
                </div>
              ) : (
                <p className="tiny dim">{t('stats.noSessions')}</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>{t('stats.recent')}</h2>
                <span className="ph-note">{t('stats.records', { n: state.stats.sessions.length })}</span>
              </div>
              <div className="history">
                {state.stats.sessions.slice(0, 6).map((s) => (
                  <div key={s.id} className="hist-row">
                    <span className="hist-mode">{modeLabel(s.mode, lang)}</span>
                    <span className="hist-meta">
                      {s.correct}/{s.total} · {fmtDate(s.date, lang)}
                    </span>
                    <span
                      className="hist-acc"
                      style={{
                        color:
                          s.accuracy >= 0.7
                            ? 'var(--ok)'
                            : s.accuracy >= 0.4
                              ? 'var(--ink)'
                              : 'var(--danger)',
                      }}
                    >
                      {Math.round(s.accuracy * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <p className="tiny dim" style={{ textAlign: 'center' }}>
        {t('stats.foot', { n: state.stats.totalOk, t: fmtDuration(state.stats.totalTimeSec, lang) })}
      </p>
    </div>
  );
}
