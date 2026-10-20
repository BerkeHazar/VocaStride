import { useMemo } from 'react';
import { Icon, type IconName } from '../components/Icons';
import { Bar, PageHead } from '../components/UI';
import { BADGES, badgeDesc, badgeName, badgeProgress, badgeStats } from '../lib/engine';
import { useApp } from '../lib/store';
import { useLang, useT } from '../lib/useT';

export default function Badges() {
  const state = useApp();
  const t = useT();
  const lang = useLang();
  const stats = useMemo(() => badgeStats(state), [state]);
  const unlocked = new Set(state.badges);
  const count = BADGES.filter((b) => unlocked.has(b.id)).length;
  const ratio = count / BADGES.length;

  const next = BADGES.filter((b) => !unlocked.has(b.id)).sort(
    (a, b) => badgeProgress(b, stats) - badgeProgress(a, stats),
  )[0];

  return (
    <div className="page screen-enter">
      <PageHead title={t('badges.title')} sub={t('badges.sub')} />

      <section className="badge-hero">
        <div className="bh-main">
          <div className="bh-num num">
            {count}
            <span>/ {BADGES.length}</span>
          </div>
          <div className="bh-lbl">{t('badges.count')}</div>
        </div>
        <div className="grow">
          <Bar value={ratio} label={t('badges.title')} />
          <p className="bh-note">
            {next
              ? t('badges.next', {
                  n: badgeName(next, lang),
                  p: Math.round(badgeProgress(next, stats) * 100),
                })
              : t('badges.all')}
          </p>
        </div>
      </section>

      <div className="badge-grid">
        {BADGES.map((b, i) => {
          const on = unlocked.has(b.id);
          const p = badgeProgress(b, stats);
          const goal = Math.max(1, b.goal(stats));
          const value = Math.min(b.value(stats), goal);
          return (
            <article
              key={b.id}
              className="badge-card"
              data-locked={!on}
              data-on={on}
              style={{ '--tone': `var(--tone-${b.tone})`, '--i': Math.min(i, 14) } as React.CSSProperties}
            >
              <span className="badge-ico">
                <Icon name={b.icon as IconName} size={18} />
              </span>
              <span className="badge-name">{badgeName(b, lang)}</span>
              <span className="badge-desc">{badgeDesc(b, lang)}</span>
              <span className="badge-prog">
                {on ? (
                  <span className="badge-done">
                    <Icon name="check" size={12} /> {t('badges.earned')}
                  </span>
                ) : (
                  <>
                    <Bar value={p} thin label={t('badges.progressLabel', { n: badgeName(b, lang) })} />
                    <span>{t('badges.progress', { n: value, m: goal })}</span>
                  </>
                )}
              </span>
            </article>
          );
        })}
      </div>

      <p className="tiny dim" style={{ textAlign: 'center', padding: '4px 0 10px' }}>
        {t('badges.note')}
      </p>
    </div>
  );
}
