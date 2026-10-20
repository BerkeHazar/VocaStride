import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Sheet } from '../components/UI';
import { activeWords } from '../lib/engine';
import { bandsFor, BASE_BANDS } from '../data/bands';
import { campaignOptionsFor, campaignPlan, type LevelDef } from '../lib/levels';
import { freshTarget, setActiveLevel } from '../lib/campaign';
import { setCampaignLevel, useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { sfx } from '../lib/audio';
import { useT } from '../lib/useT';
import type { CampaignProgress } from '../types';

/** Bir bölüm satırının yüksekliği; yol çizgisi bu ölçüye göre hesaplanır. */
const ROW = 96;
/** Kademe başlığının yüksekliği. */
const HEAD = 96;
/** Yolun yatay salınımı (yüzde). */
const SWING = 23;

const EMPTY: CampaignProgress = { level: 1, stars: {}, words: {} };

interface Row {
  kind: 'head' | 'level';
  band: number;
  y: number;
  def?: LevelDef;
  x: number;
}

export default function Path() {
  const state = useApp();
  const t = useT();
  const [open, setOpen] = useState<LevelDef | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const words = useMemo(() => activeWords(state), [state]);
  const bands = useMemo(
    () => (state.activeList === 'default' ? BASE_BANDS : bandsFor(words)),
    [state.activeList, words],
  );
  /*
   * Kampanya ayarları listenin zorluğundan geliyor: bölüm başına yeni kelime,
   * mod rampasının başlangıcı ve geçme eşiği. Varsayılan banka "orta" ile
   * aynı sonucu verir, yani ölçülmüş denge değişmez.
   */
  const difficulty = state.lists.find((l) => l.id === state.activeList)?.difficulty;
  const opts = useMemo(() => campaignOptionsFor(difficulty), [difficulty]);
  const levels = useMemo(() => campaignPlan(bands, opts), [bands, opts]);
  const prog = state.campaign[state.activeList] ?? EMPTY;

  /*
   * Zorluk değişince bölüm sayısı değişebilir (zor liste daha hızlı biter).
   * İşaretçi yeni planın dışında kalırsa hiçbir düğüm "şu an" olmuyor ve yol
   * kilitleniyordu. Kırparken son bölüme atmak yerine, yeni planda henüz
   * yıldızı olmayan ilk bölüme dönülüyor; yoksa son bölüm açılır.
   */
  useEffect(() => {
    if (levels.length === 0 || prog.level <= levels.length) return;
    const firstOpen = levels.find((l) => !prog.stars[l.id])?.id ?? levels.length;
    setCampaignLevel(state.activeList, Math.min(firstOpen, levels.length));
  }, [levels, prog.level, prog.stars, state.activeList]);

  const totalWords = useMemo(() => bands.reduce((a, b) => a + b.length, 0), [bands]);

  /** Bölümleri ve kademe başlıklarını tek bir dikey akışa dizer. */
  const rows = useMemo(() => {
    const out: Row[] = [];
    let y = 0;
    let band = 0;
    let i = 0;
    for (const def of levels) {
      if (def.band !== band) {
        band = def.band;
        out.push({ kind: 'head', band, y, x: 50 });
        y += HEAD;
      }
      out.push({
        kind: 'level',
        band,
        y,
        def,
        x: 50 + SWING * Math.sin(i * 0.72),
      });
      y += ROW;
      i += 1;
    }
    return out;
  }, [levels]);

  const height = rows.length ? rows[rows.length - 1].y + ROW : 0;

  /** Yolun kendisi: düğüm merkezlerinden geçen dikey teğetli kübikler. */
  const { dAll, dDone } = useMemo(() => {
    const pts = rows
      .filter((r): r is Row & { def: LevelDef } => r.kind === 'level' && !!r.def)
      .map((r) => ({ x: r.x, y: r.y + ROW / 2, id: r.def.id }));
    if (pts.length < 2) return { dAll: '', dDone: '' };

    const build = (list: typeof pts) => {
      let d = `M ${list[0].x.toFixed(2)} ${list[0].y}`;
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1];
        const b = list[i];
        const mid = (a.y + b.y) / 2;
        d += ` C ${a.x.toFixed(2)} ${mid.toFixed(1)}, ${b.x.toFixed(2)} ${mid.toFixed(1)}, ${b.x.toFixed(2)} ${b.y}`;
      }
      return d;
    };

    const done = pts.filter((p) => p.id < prog.level);
    return { dAll: build(pts), dDone: done.length > 1 ? build(done) : '' };
  }, [rows, prog.level]);

  const start = (def: LevelDef) => {
    // Kelime seçimi oturumda yapılır: plan orada kuruluyor, burada yalnızca
    // hangi bölümün oynandığı işaretleniyor.
    setActiveLevel(def.id, def.passPct, def.total);
    sfx('tap');
    navigate('/study/level');
  };

  // Oynanacak bölüme kaydır: 150 düğümlü yolda kullanıcı kaybolmasın.
  useEffect(() => {
    if (!prog.level) return;
    // 'instant' şart: html'de scroll-behavior:smooth açık, yumuşak kaydırma
    // açılışta yarım kalıyor ve kullanıcı yolun başında kalıyor.
    // 'instant' şart: html'de scroll-behavior:smooth açık; yumuşak kaydırma
    // açılışta yarım kalıyor ve kullanıcı yolun başında kalıyordu.
    const go = () => {
      const el = document.getElementById(`pnode-${prog.level}`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      window.scrollTo({
        top: Math.max(0, r.top + window.scrollY - window.innerHeight / 2),
        behavior: 'instant' as ScrollBehavior,
      });
    };
    // Açılış perdesi kalkmadan sayfa yüksekliği oturmuyor; iki kez dene.
    const a = window.setTimeout(go, 120);
    const b = window.setTimeout(go, 640);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [prog.level]);

  if (totalWords < 24) {
    return (
      <div className="path screen-enter">
        <div className="empty" style={{ minHeight: '50dvh' }}>
          <h3>{t('path.empty')}</h3>
          <p>{t('path.emptyHint')}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/practice')}>
            {t('path.toPractice')}
          </button>
        </div>
      </div>
    );
  }

  const cleared = Math.max(0, prog.level - 1);

  return (
    <div className="path screen-enter">
      <header className="path-head">
        <div className="ph-main">
          <h1 className="display">{t('path.title')}</h1>
          <p className="ph-sub">{t('path.sub', { n: levels.length, m: totalWords })}</p>
        </div>
      </header>

      <div className="path-cols">
        <div className="path-track" ref={trackRef} style={{ height }}>
          <svg
            className="path-line"
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            width="100%"
            height={height}
            aria-hidden="true"
          >
            <path d={dAll} fill="none" vectorEffect="non-scaling-stroke" className="pl-base" />
            {dDone && (
              <path d={dDone} fill="none" vectorEffect="non-scaling-stroke" className="pl-done" />
            )}
          </svg>

          {rows.map((row, i) => {
            if (row.kind === 'head') {
              const bandLevelsOf = levels.filter((l) => l.band === row.band);
              const done = bandLevelsOf.filter((l) => l.id < prog.level).length;
              return (
                <div key={`h-${row.band}`} className="pband" style={{ top: row.y }}>
                  <span className="pband-stamp num">{String(row.band).padStart(2, '0')}</span>
                  <span className="pband-main">
                    <b>{t('path.tier', { n: row.band })}</b>
                    <span className="num">
                      {t('path.cleared', { n: done, m: bandLevelsOf.length })}
                    </span>
                  </span>
                  <span className="pband-rule" aria-hidden="true" />
                </div>
              );
            }

            const def = row.def!;
            const passed = def.id < prog.level;
            const current = def.id === prog.level;
            const stars = prog.stars[def.id] ?? 0;
            const kind = def.kind;

            return (
              <button
                key={def.id}
                id={`pnode-${def.id}`}
                type="button"
                className="pnode"
                data-state={passed ? 'done' : current ? 'current' : 'locked'}
                data-kind={kind}
                style={{ top: row.y + ROW / 2, left: `${row.x}%`, '--i': i } as React.CSSProperties}
                disabled={!passed && !current}
                onClick={() => {
                  sfx('tap');
                  setOpen(def);
                }}
                aria-label={`${t('path.kind.normal')} ${def.id}`}
              >
                <span className="pnode-disc">
                  {passed ? (
                    <Icon name="check" size={20} strokeWidth={2.2} />
                  ) : (
                    <span className="num">{def.id}</span>
                  )}
                  {kind !== 'normal' && (
                    <span className="pnode-crown">
                      <Icon name="crown" size={12} strokeWidth={2.2} />
                    </span>
                  )}
                </span>

                {passed && stars > 0 && (
                  <span className="pnode-stars" aria-label={t('path.stars', { n: stars })}>
                    {[1, 2, 3].map((s) => (
                      <i key={s} data-on={s <= stars} />
                    ))}
                  </span>
                )}
                {current && <span className="pnode-now">{t('path.start')}</span>}
                {kind !== 'normal' && !current && (
                  <span className="pnode-tag">
                    {kind === 'mini'
                      ? t('path.kind.mini')
                      : kind === 'hard'
                        ? t('path.kind.hard')
                        : t('path.kind.final')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <aside className="path-rail">
          <section className="path-next">
            <div className="sec-head">
              <h2>{t('path.next')}</h2>
              <span className="sec-note num">{t('path.cleared', { n: cleared, m: levels.length })}</span>
            </div>
            {(() => {
              const def = levels.find((l) => l.id === prog.level) ?? levels[levels.length - 1];
              if (!def) return null;
              const target = freshTarget(def, prog.comfort ?? 0.8);
              const review = Math.max(0, def.total - target);
              return (
                <>
                  <div className="path-next-top">
                    <span className="path-next-id num">{def.id}</span>
                    <span className="path-next-meta">
                      <b>
                        {def.kind === 'mini'
                          ? t('path.kind.mini')
                          : def.kind === 'hard'
                            ? t('path.kind.hard')
                            : def.kind === 'final'
                              ? t('path.kind.final')
                              : t('path.kind.normal')}
                      </b>
                      <span>
                        {t('path.newWords', { n: target })}
                        {review > 0 ? ` · ${t('path.review', { n: review })}` : ''}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-accent btn-lg btn-block"
                    onClick={() => start(def)}
                  >
                    {t('path.continue')}
                    <Icon name="arrow-right" size={17} />
                  </button>
                </>
              );
            })()}
          </section>

          <div className="path-links">
            <button type="button" className="side-link" onClick={() => navigate('/practice')}>
              <Icon name="grid" size={14} /> {t('path.toPractice')}
            </button>
            <button type="button" className="side-link" onClick={() => navigate('/badges')}>
              <Icon name="trophy" size={14} /> {t('path.badges')}
            </button>
          </div>
        </aside>
      </div>

      <LevelSheet
        def={open}
        prog={prog}
        onClose={() => setOpen(null)}
        onStart={(def) => {
          setOpen(null);
          start(def);
        }}
      />
    </div>
  );
}

function LevelSheet({
  def,
  prog,
  onClose,
  onStart,
}: {
  def: LevelDef | null;
  prog: CampaignProgress;
  onClose: () => void;
  onStart: (def: LevelDef) => void;
}) {
  const t = useT();
  // Uyarlama bölüm sayfasında da görünür: hedef, son bölümlerin doğruluğuna göre
  // 6 ile 9 arasında kayar. Plan hedefi (def.fresh) yalnızca başlangıç noktası.
  const target = def ? freshTarget(def, prog.comfort ?? 0.8) : 0;
  const review = def ? Math.max(0, def.total - target) : 0;
  const modes = def ? [...new Set(def.units.map((u) => u.mode))] : [];
  const stars = def ? (prog.stars[def.id] ?? 0) : 0;

  const modeLabel: Record<string, string> = {
    quiz: t('mode.quiz'),
    listen: t('mode.listen'),
    type: t('mode.type'),
    cards: t('mode.cards'),
    match: t('mode.match'),
  };

  return (
    <Sheet
      open={!!def}
      onClose={onClose}
      title={def ? `${t('path.kind.normal')} ${def.id}` : ''}
      footer={
        def ? (
          <button
            type="button"
            className="btn btn-accent btn-lg btn-block"
            onClick={() => onStart(def)}
          >
            {t('path.start')}
            <Icon name="arrow-right" size={17} />
          </button>
        ) : null
      }
    >
      {def && (
        <div className="stack" style={{ gap: 18 }}>
          <div className="row-between">
            <span className="tag">{t('path.tier', { n: def.band })}</span>
            {stars > 0 && (
              <span className="pnode-stars inline" aria-label={t('path.stars', { n: stars })}>
                {[1, 2, 3].map((s) => (
                  <i key={s} data-on={s <= stars} />
                ))}
              </span>
            )}
          </div>

          <div className="path-sheet-stats">
            <div>
              <b className="num">{def.total}</b>
              <span>{t('path.lbl.questions')}</span>
            </div>
            <div>
              <b className="num">{target}</b>
              <span>{t('path.lbl.new')}</span>
            </div>
            <div>
              <b className="num">{review}</b>
              <span>{t('path.lbl.review')}</span>
            </div>
          </div>

          {target !== def.fresh && (
            <p className="tiny dim path-adapted">
              {target > def.fresh ? '+' : '−'}
              {Math.abs(target - def.fresh)} · {t('path.adapted')}
            </p>
          )}

          <div className="opt-group">
            <span className="opt-label">{t('path.modes')}</span>
            <div className="path-mode-chips">
              {modes.map((m) => (
                <span key={m} className="tag tag-soft">
                  {modeLabel[m] ?? m}
                </span>
              ))}
            </div>
          </div>

          <p className="tiny dim">{t('path.pass', { n: Math.round(def.passPct * 100) })}</p>
        </div>
      )}
    </Sheet>
  );
}
