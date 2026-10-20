import { useEffect, useMemo, useState } from 'react';
import { useApp, setSettings, getState } from '../lib/store';
import { navigate, useRoute, type RouteName } from '../lib/router';
import { applyTheme, resolvedTheme } from '../lib/theme';
import { Icon, type IconName } from './Icons';
import { Lockup } from './Logo';
import { TILE_SIZE } from '../brand';
import { Bar, Ring, Toasts } from './UI';
import { toast } from '../lib/toast';
import { makeT, pluralWord, type MsgKey } from '../lib/i18n';
import { useLang, useT } from '../lib/useT';
import { addDays, todayStr } from '../lib/engine';

interface NavItem {
  name: RouteName;
  path: string;
  labelKey: MsgKey;
  icon: IconName;
}

export const NAV: NavItem[] = [
  { name: 'path', path: '/', labelKey: 'nav.path', icon: 'target' },
  { name: 'practice', path: '/practice', labelKey: 'nav.practice', icon: 'grid' },
  { name: 'stats', path: '/stats', labelKey: 'nav.stats', icon: 'chart' },
  { name: 'dictionary', path: '/dictionary', labelKey: 'nav.dictionary', icon: 'book' },
  { name: 'settings', path: '/settings', labelKey: 'nav.settings', icon: 'gear' },
];

export function useThemeSync() {
  const { settings } = useApp();

  useEffect(() => {
    applyTheme(settings.theme, settings.accent);
    document.documentElement.dataset.calm = String(settings.calm);
    document.documentElement.lang = settings.lang;
  }, [settings.theme, settings.accent, settings.calm, settings.lang]);

  useEffect(() => {
    if (settings.theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('auto', settings.accent);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme, settings.accent]);
}

function cycleTheme() {
  const st = getState();
  const current = resolvedTheme(st.settings.theme);
  const next = current === 'dark' ? 'light' : 'dark';
  setSettings({ theme: next });
  const t = makeT(st.settings.lang);
  toast(next === 'dark' ? t('theme.darkOn') : t('theme.lightOn'), 'info', 1600);
}

/** Kenar çubuğundaki günün özeti: hedef halkası + haftalık seri noktaları. */
function SideToday() {
  const state = useApp();
  const t = useT();
  const lang = useLang();
  const pct = Math.min(1, state.daily.count / Math.max(1, state.settings.goal));

  const week = useMemo(() => {
    const today = todayStr();
    const set = new Set(state.streakDays ?? []);
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDays(today, i - 6);
      return { iso, on: set.has(iso), today: iso === today };
    });
  }, [state.streakDays]);

  return (
    <div className="side-today">
      <div className="st-top">
        <span className="st-ring">
          <Ring value={pct} size={46} strokeWidth={3.5}>
            <b className="num">{state.daily.count}</b>
          </Ring>
        </span>
        <span className="st-text">
          <b>{t('home.goal')}</b>
          <span>
            {t('common.words', {
              n: state.settings.goal,
              word: pluralWord(state.settings.goal, lang),
            })}
          </span>
        </span>
      </div>
      <div className="st-streak">
        <Icon name="flame" size={13} />
        <span>{t('side.streak', { n: state.streak })}</span>
        <span className="st-days" aria-hidden="true">
          {week.map((d) => (
            <i key={d.iso} data-on={d.on} data-today={d.today} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const state = useApp();
  const route = useRoute();
  const t = useT();
  const dark = resolvedTheme(state.settings.theme) === 'dark';
  const need = 50 + state.level * 50;

  return (
    <aside className="sidebar">
      <a
        className="brand"
        href={import.meta.env.BASE_URL}
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
      >
        <Lockup size={TILE_SIZE.sidebar} />
      </a>

      <nav className="side-nav" aria-label={t('nav.label')}>
        {NAV.map((item) => (
          <a
            key={item.name}
            className="navlink"
            href={`${import.meta.env.BASE_URL}${item.path.slice(1)}`}
            data-active={route.name === item.name}
            aria-current={route.name === item.name ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.path);
            }}
          >
            <Icon name={item.icon} size={18} />
            {t(item.labelKey)}
          </a>
        ))}
      </nav>

      <SideToday />

      <div className="side-foot">
        <div className="side-level">
          <div className="sl-top">
            <b>{t('level.short', { n: state.level })}</b>
            <span className="num">
              {Math.min(state.xp, need)}/{need}
            </span>
          </div>
          <Bar value={Math.min(1, state.xp / need)} thin label={t('level.xp')} />
        </div>

        <div className="row-between" style={{ padding: '0 2px' }}>
          <a
            className="side-link"
            href="https://github.com/BerkeHazar/VocaStride"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={14} /> {t('app.source')}
          </a>
          <span className="row" style={{ gap: 0 }}>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 34, height: 34 }}
              onClick={() => window.dispatchEvent(new Event('vs:keys'))}
              aria-label={t('keys.open')}
              title={t('keys.open')}
            >
              <Icon name="info" size={16} />
            </button>
            <button
              type="button"
              className="icon-btn"
              style={{ width: 34, height: 34 }}
              onClick={cycleTheme}
              aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
              title={dark ? t('set.light') : t('set.dark')}
            >
              <Icon name={dark ? 'sun' : 'moon'} size={16} />
            </button>
          </span>
        </div>
      </div>
    </aside>
  );
}

export function TopBar() {
  const state = useApp();
  const t = useT();
  const dark = resolvedTheme(state.settings.theme) === 'dark';
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="topbar" data-stuck={stuck}>
      <a
        className="brand"
        href={import.meta.env.BASE_URL}
        onClick={(e) => {
          e.preventDefault();
          navigate('/');
        }}
      >
        <Lockup size={TILE_SIZE.topbar} />
      </a>
      <div className="row" style={{ gap: 2 }}>
        <span className="streak-chip num" title={`${state.streak}`}>
          <Icon name="flame" size={13} />
          {state.streak}
        </span>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 38, height: 38 }}
          onClick={cycleTheme}
          aria-label={dark ? t('theme.toLight') : t('theme.toDark')}
        >
          <Icon name={dark ? 'sun' : 'moon'} size={17} />
        </button>
        <button
          type="button"
          className="icon-btn"
          style={{ width: 38, height: 38 }}
          onClick={() => navigate('/settings')}
          aria-label={t('nav.settings')}
        >
          <Icon name="gear" size={17} />
        </button>
      </div>
    </header>
  );
}

export function Dock() {
  const route = useRoute();
  const t = useT();

  return (
    <nav className="dock" aria-label={t('nav.dock')}>
      {NAV.map((item) => (
        <button
          key={item.name}
          type="button"
          data-active={route.name === item.name}
          aria-current={route.name === item.name ? 'page' : undefined}
          onClick={() => navigate(item.path)}
        >
          <span className="dock-ico">
            <Icon name={item.icon} size={19} strokeWidth={item.name === route.name ? 2.1 : 1.8} />
          </span>
          <span className="dock-lbl">{t(item.labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="foot">
      <span>{t('app.offlineNote')}</span>
      <span className="row" style={{ gap: 14 }}>
        <a href="https://berkehazar.github.io" target="_blank" rel="noopener noreferrer">
          Berke Hazar
        </a>
        <a href="https://github.com/BerkeHazar/VocaStride" target="_blank" rel="noopener noreferrer">
          <Icon name="github" size={12} /> GitHub
        </a>
      </span>
    </footer>
  );
}

export function ToastLayer() {
  return <Toasts />;
}
