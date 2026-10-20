import { Component, useEffect, useState, type ReactNode } from 'react';
import { Dock, Sidebar, TopBar, ToastLayer, useThemeSync } from './components/Shell';
import { ShortcutsSheet } from './components/Shortcuts';
import Path from './screens/Path';
import Home from './screens/Home';
import Onboarding from './screens/Onboarding';
import Session from './screens/Session';
import Summary from './screens/Summary';
import Stats from './screens/Stats';
import Badges from './screens/Badges';
import Dictionary from './screens/Dictionary';
import Settings from './screens/Settings';
import { navigate, useRoute } from './lib/router';
import { getState, serializeState, useApp } from './lib/store';
import { makeT } from './lib/i18n';
import { setHapticsEnabled, setSoundEnabled } from './lib/audio';
import { autoSnapshot } from './lib/sustain';

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const t = makeT(getState().settings.lang);
      return (
        <div className="empty" style={{ minHeight: '60dvh' }}>
          <h3>{t('common.error')}</h3>
          <p>{t('common.errorText')}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            {t('common.reload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useThemeSync();
  const state = useApp();
  const route = useRoute();
  const [keysOpen, setKeysOpen] = useState(false);

  useEffect(() => {
    if (!state.onboarded) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '?') {
        e.preventDefault();
        setKeysOpen((v) => !v);
      }
    };
    const open = () => setKeysOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('vs:keys', open);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('vs:keys', open);
    };
  }, [state.onboarded]);

  useEffect(() => {
    setSoundEnabled(state.settings.sound);
    setHapticsEnabled(state.settings.haptics);
  }, [state.settings.sound, state.settings.haptics]);

  // Veri kaybına karşı sessiz güvence: altı günde bir yerel kopya.
  useEffect(() => {
    if (!state.onboarded || !state.settings.snaps) return;
    const id = window.setTimeout(() => autoSnapshot(serializeState), 4000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!state.onboarded && route.name !== 'onboarding') {
      navigate('/onboarding', { replace: true });
    }
    if (state.onboarded && route.name === 'onboarding') {
      navigate('/', { replace: true });
    }
  }, [state.onboarded, route.name]);

  if (!state.onboarded) {
    return (
      <Boundary>
        <Onboarding />
        <ToastLayer />
      </Boundary>
    );
  }

  const immersive = route.name === 'study' || route.name === 'summary';
  const showNav = !immersive;

  return (
    <Boundary>
      <div className="app">
        <a className="skip-link" href="#main">
          {makeT(state.settings.lang)('app.skip')}
        </a>
        {showNav && <Sidebar />}
        <div className="main" style={showNav ? undefined : { marginLeft: 0, paddingBottom: 0 }}>
          {showNav && <TopBar />}
          <main
            id="main"
            tabIndex={-1}
            className={showNav ? 'screen-wrap' : 'screen-wrap immersive'}
            key={route.path}
          >
            {route.name === 'study' && <Session />}
            {route.name === 'summary' && <Summary />}
            {route.name === 'stats' && <Stats />}
            {route.name === 'badges' && <Badges />}
            {route.name === 'dictionary' && <Dictionary />}
            {route.name === 'settings' && <Settings />}
            {route.name === 'path' && <Path />}
            {route.name === 'practice' && <Home />}
          </main>
        </div>
        {showNav && <Dock />}
        <ShortcutsSheet open={keysOpen} onClose={() => setKeysOpen(false)} />
        <ToastLayer />
      </div>
    </Boundary>
  );
}
