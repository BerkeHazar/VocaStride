import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import './styles/study.css';
import './styles/pages.css';
import './styles/path.css';
import './styles/fx.css';
import App from './App';
import { applyTheme } from './lib/theme';
import { getState } from './lib/store';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root bulunamadı');

const { settings } = getState();
applyTheme(settings.theme, settings.accent);
document.documentElement.dataset.calm = String(settings.calm);

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Açılış ekranını yumuşakça kaldır.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.setAttribute('data-done', '1');
  window.setTimeout(() => boot.remove(), 420);
});

// Service worker yalnızca üretimde devreye girer.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => undefined);
  });
}
