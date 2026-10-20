import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { lockupSvg } from './brand/lockup.mjs';

/**
 * Açılış ekranı (index.html) JS'ten önce boyanıyor, bu yüzden logosunu React
 * çizemiyor. Geometri yine tek kaynaktan gelsin diye SVG burada, derleme
 * sırasında `<!--brand-lockup-->` yerine yazılıyor. Renkler CSS değişkeni:
 * tema (açık/koyu) ilk boyada da doğru.
 */
const brand = JSON.parse(readFileSync(new URL('./brand/mark.json', import.meta.url), 'utf8'));

function brandBoot(): Plugin {
  return {
    name: 'vocastride-brand-boot',
    transformIndexHtml(html) {
      const svg = lockupSvg(brand, {
        size: brand.ui.boot,
        colors: {
          mark: 'var(--boot-mark)',
          word: 'var(--boot-word)',
          ink: 'var(--boot-bg)',
        },
      }).replace('<svg ', '<svg class="lockup" ');
      return html.replace('<!--brand-lockup-->', svg);
    },
  };
}

/**
 * GitHub Pages yayını için taban yol.
 * - Proje sayfası (berkehazar.github.io/VocaStride)  -> /VocaStride/
 * - Kullanıcı/örgün sayfası veya özel alan adı      -> /
 * CI'da VITE_BASE ile ezilebilir: VITE_BASE=/ npm run build
 */
export default defineConfig(({ mode }) => {
  // Geliştirme sunucusu kökte, üretim ve önizleme GitHub Pages alt yolunda çalışır.
  const base = process.env.VITE_BASE ?? (mode === 'development' ? '/' : '/VocaStride/');

  return {
    base,
    plugins: [react(), brandBoot()],
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      assetsInlineLimit: 2048,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
    },
  };
});
