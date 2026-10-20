import { createHash } from 'node:crypto';
import { copyFile, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';

/**
 * Geliştirme sırasında ekran görüntüsü almak için kullanılan tohum sayfası
 * `public/` içinde duruyor ve Vite onu olduğu gibi çıktıya kopyalıyordu.
 * Üretimde erişilebilir olduğu sürece, adresi bilen bir ziyaretçi onu açtığında
 * localStorage'a demo durumu yazılıyor — yani kendi ilerlemesini siliyordu.
 * Dosya yerelde kalır, yalnızca çıktıdan ve önbellek listesinden çıkarılır.
 */
const SEED = '__seed.html';

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(DIST);
const rel = files.map((f) => relative(DIST, f).split(sep).join('/'));

// Önbellek listesi: sw.js ve 404.html hariç tüm çıktı.
const precache = rel.filter(
  (f) => f !== 'sw.js' && f !== '404.html' && f !== 'og.png' && f !== SEED,
);

let stamp = '';
for (const f of files.sort()) {
  /*
   * Sürüm damgası dosya boyutundan değil içerikten üretilir. Yalnızca boyuta
   * bakıldığında, aynı uzunlukta kalan bir değişiklik (örneğin index.html
   * içindeki farklı bir varlık karması) sürümü hiç değiştirmiyor, tarayıcı da
   * eski dosyayı önbellekten servis etmeye devam ediyordu.
   */
  const body = await readFile(f);
  stamp += `${relative(DIST, f)}:${createHash('sha256').update(body).digest('hex')};`;
}
const version = createHash('sha256').update(stamp).digest('hex').slice(0, 12);

const sw = `/* VocaStride service worker — otomatik üretildi */
const VERSION = 'vs-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /*
   * Önbellek araması Vary başlığını yok sayar.
   *
   * Sunucular (GitHub Pages/Fastly dahil) JS/CSS yanıtlarına "Vary:
   * Accept-Encoding" ya da "Vary: Origin" ekliyor. Önbelleğe alınan istek ile
   * sayfanın gönderdiği istek bu başlıklarda birebir eşleşmediği için
   * caches.match boş dönüyor, ardından ağ da yoksa Response.error() üretiliyor
   * ve çevrimdışıyken uygulama hiç açılmıyordu. Dosya adresleri içerik
   * karması taşıdığı için Vary'yi yok saymak güvenli.
   */
  const hit = (r) => caches.match(r, { ignoreVary: true, ignoreSearch: false });

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cached = await hit(req);
          return cached || (await hit('./index.html')) || (await hit('index.html')) || Response.error();
        })
    );
    return;
  }

  event.respondWith(
    hit(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res.ok && res.type === 'basic') {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(async () => (await hit(req)) || Response.error())
    )
  );
});
`;

await writeFile(join(DIST, 'sw.js'), sw, 'utf8');
await writeFile(join(DIST, '.nojekyll'), '', 'utf8');

// Tohum sayfası üretime çıkmaz (bkz. SEED tanımı).
await rm(join(DIST, SEED), { force: true });

// SPA derin bağlantıları için GitHub Pages 404 kabuğu.
await copyFile(join(DIST, 'index.html'), join(DIST, '404.html'));

const total = files.reduce((a, f) => a + (f.endsWith('.png') || f.endsWith('.woff2') ? 0 : 1), 0);
console.log(`✓ sw.js (${precache.length} dosya önbellekte, sürüm ${version})`);
console.log('✓ 404.html ve .nojekyll hazır');
console.log(`✓ ${total} metin dosyası işaretlendi`);
