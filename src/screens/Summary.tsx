import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icons';
import { Ring, Sheet } from '../components/UI';
import { BADGE_MAP, badgeName, modeLabel } from '../lib/engine';
import { fmtDate, fmtTime } from '../lib/format';
import { navigate } from '../lib/router';
import { useApp } from '../lib/store';
import { setRetryKeys } from '../lib/retry';
import { previewCard, shareSession } from '../lib/share';
import { fireConfetti } from '../lib/confetti';
import { sfx } from '../lib/audio';
import { toast } from '../lib/toast';
import { useCountUp } from '../lib/anim';
import { useLang, useT } from '../lib/useT';

export default function Summary() {
  const state = useApp();
  const t = useT();
  const lang = useLang();
  const log = state.lastSession;
  const [shareOpen, setShareOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!log) navigate('/', { replace: true });
  }, [log]);

  useEffect(() => {
    if (!log) return;
    // Yüksek doğruluk da kutlanır: sadece kusursuz turlar değil.
    if (log.accuracy >= 0.8) {
      const id = window.setTimeout(() => fireConfetti({ count: log.perfect ? 120 : 84 }), 220);
      return () => window.clearTimeout(id);
    }
  }, [log]);

  const won = useMemo(
    () => (state.recentBadges ?? []).map((id) => BADGE_MAP.get(id)).filter(Boolean),
    [state.recentBadges],
  );

  const acc = Math.round((log?.accuracy ?? 0) * 100);
  const accShown = useCountUp(acc, 900);
  const okShown = useCountUp(log?.correct ?? 0, 700);
  const noShown = useCountUp(log?.wrong ?? 0, 700);
  const comboShown = useCountUp(log?.combo ?? 0, 700);
  const xpShown = useCountUp(log?.xp ?? 0, 800);

  if (!log) return null;

  const title =
    acc === 100
      ? t('sum.perfect')
      : acc >= 90
        ? t('sum.almost')
        : acc >= 70
          ? t('sum.good')
          : acc >= 45
            ? t('sum.ok')
            : t('sum.again');
  const isBest = state.stats.bestSession?.id === log.id;

  return (
    <div className="summary screen-enter">
      <header className="sum-head">
        <span className="tag">{modeLabel(log.mode, lang)}</span>
        <h1 className="display">{title}</h1>
        <p className="sum-lede num">
          {t('sum.rightWrong', { c: log.correct, w: log.wrong, t: fmtTime(log.timeSec) })}
        </p>
        {isBest && state.stats.sessions.length > 1 && (
          <span className="sum-best">
            <Icon name="trophy" size={13} /> {t('sum.newBest')}
          </span>
        )}
      </header>

      <div className="sum-card">
        <div className="sum-top">
          <span className="sum-ring">
            <Ring value={acc / 100} size={92} strokeWidth={7}>
              <b className="num">
                {accShown}
                <em>%</em>
              </b>
            </Ring>
          </span>
          <div className="sum-ring-lbl">
            <b>{t('sum.accuracy')}</b>
            <span className="num">
              {log.correct} / {log.correct + log.wrong}
            </span>
          </div>
        </div>

        <dl className="sum-stats">
          <div>
            <dt>{t('sum.right')}</dt>
            <dd className="num" style={{ color: 'var(--ok)' }}>
              {okShown}
            </dd>
          </div>
          <div>
            <dt>{t('sum.wrong')}</dt>
            <dd className="num" style={{ color: log.wrong ? 'var(--danger)' : undefined }}>
              {noShown}
            </dd>
          </div>
          <div>
            <dt>{t('sum.bestCombo')}</dt>
            <dd className="num">{comboShown}</dd>
          </div>
          <div>
            <dt>{t('sum.time')}</dt>
            <dd className="num">{fmtTime(log.timeSec)}</dd>
          </div>
        </dl>
      </div>

      <div className="xp-gain">
        <Icon name="bolt" size={16} />
        <span className="num">+{xpShown} XP</span>
        {log.perfect && <span className="tag tag-soft">{t('sum.perfectBonus')}</span>}
      </div>

      {won.length > 0 && (
        <ul className="sum-badges">
          {won.map((b, i) => (
            <li
              key={b!.id}
              className="sum-badge"
              style={{ '--tone': `var(--tone-${b!.tone})`, '--i': i } as React.CSSProperties}
            >
              <span className="badge-ico">
                <Icon name={b!.icon as never} size={16} />
              </span>
              <span className="grow">
                <b>{badgeName(b!, lang)}</b>
                <span className="tiny dim">{t('sum.newBadge')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="sum-actions">
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={() => navigate(`/study/${log.mode}`, { keepScroll: true })}
        >
          <Icon name="refresh" size={17} /> {t('sum.retry')}
        </button>
        {log.wrongKeys && log.wrongKeys.length > 0 && (
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              setRetryKeys(log.wrongKeys!);
              navigate('/study/quiz', { keepScroll: true });
            }}
          >
            <Icon name="target" size={17} /> {t('sum.wrongs', { n: log.wrongKeys.length })}
          </button>
        )}
        <button
          type="button"
          className="btn btn-block"
          onClick={async () => {
            setShareOpen(true);
            try {
              setPreview(await previewCard(log));
            } catch {
              toast(t('sum.shareFail'), 'bad');
            }
          }}
        >
          <Icon name="share" size={16} /> {t('sum.share')}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate('/')}>
          {t('session.backToday')}
        </button>
      </div>

      <p className="sum-foot num">
        {t('sum.foot', { d: fmtDate(log.date), l: state.level, s: state.streak })}
      </p>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title={t('sum.shareTitle')}>
        <div className="stack">
          <div className="share-preview">
            {preview ? (
              <img src={preview} alt={t('sum.shareAlt')} />
            ) : (
              <div className="skeleton" style={{ width: 260, height: 325 }} />
            )}
          </div>
          <button
            type="button"
            className="btn btn-accent btn-block"
            onClick={async () => {
              const res = await shareSession(log);
              if (res === 'downloaded') toast(t('sum.downloaded'), 'ok');
              else if (res === 'shared') toast(t('sum.shared'), 'ok');
              sfx('tap');
            }}
          >
            <Icon name="download" size={17} />{' '}
            {preview ? t('sum.shareAction') : t('sum.preparing')}
          </button>
          <p className="tiny dim" style={{ textAlign: 'center' }}>
            1080 × 1350 PNG
          </p>
        </div>
      </Sheet>
    </div>
  );
}
