# Geliştirme Günlüğü

Bu dosya VocaStride 2.0'ın sıfırdan yeniden inşa sürecini, alınan kararları, karşılaşılan
  
sorunları ve sonraki hedefleri kaydeder. README ürünü anlatır; burası süreci anlatır.

- **Sürüm:** 2.2.0
- **Başlangıç:** 18 Ekim 2026
- **Kapsam:** Mevcut tek dosyalık uygulamanın özellik envanteri + tam yeniden yazım
- **Hedef platform:** GitHub Pages (statik, alt yol `/VocaStride/`)

---

## 1. Başlangıç noktası: kaynak uygulamanın incelenmesi

Referans depo (`github.com/BerkeHazar/VocaStride`) tek bir `index.html` (484 KB), bir service
  
worker, manifest ve ikonlardan oluşuyordu. Kod okunarak çıkarılan envanter:

**Veri**

- 1200 kelime: `[kelime (tür), eşanlamlı, Türkçe karşılık]`
- 1200 kayıt için IPA + İngilizce tanım sözlüğü (1189'unda IPA var)
- Tür dağılımı: 362 fiil, 349 sıfat, 349 isim, 140 zarf

**Öğrenme**

- Leitner, 5 kutu, aralıklar 1/2/4/8/16 gün; yanlışta 1. kutuya dönüş
- Kelime bazlı performans, ustalık seviyesi 0–5
- Günlük hedef, seri, XP/seviye, kombo, 23 rozet
- Günlük meydan okuma (2× XP), en iyi oturum kaydı

**Modlar**

- Çoktan seçmeli (TR→EN, EN→TR, eşanlamlı, karışık; kaynak filtreleri)
- Hafıza kartları, 5'li eşleştirme (+25 XP), maraton
- Bugünkü tekrarlar, günlük meydan okuma

**Diğer**

- Sözlük: arama, tür/durum filtresi, IPA rehberi, kişisel not
- İstatistik: haftalık özet, GitHub tarzı takvim, 7/30 gün grafiği, ustalık dağılımı
- Tema (5 vurgu × açık/koyu/oto), sakin mod, ses, titreşim
- JSON yedek/geri yükleme, PWA, klavye kısayolları

**Sonuç:** Özellik seti korunmaya değerdi; sorun mimari ve görsel dildeydi. Tek dosya, global
  
durum ve DOM'a doğrudan yazan kod sürdürülemezdi. Bu yüzden **düzenlemek yerine yeniden yazma**
  
kararı alındı.

---

## 2. Araştırma: 15 desen ve tekniğin tasarıma entegrasyonu

Araştırma üç kaynak ekseninde yapıldı: Anthropic'in resmî `frontend-design` skill'i,
  
[Impeccable](https://github.com/pbakaus/impeccable) kural seti (59 deterministik denetim) ve Emil
  
Kowalski'nin [design engineering + mobile-native](https://github.com/emilkowalski/skills) notları.
  
Ayrıca React Bits / Motion Primitives gibi animasyon kütüphaneleri ve editoryal/riso tasarım
  
referansları tarandı.

| #  | Desen / teknik                                         | Neden seçildi                                                            | Uygulamada nasıl                                                                                                                                       |
| -- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1  | **Asimetrik editoryal grid** (bento değil, hiyerarşik) | Aynı boyutlu kart ızgarası "SaaS şablonu" hissi veriyor                  | Ana ekranda geniş hero + 2×2 mod + tek geniş maraton + sağ ray; her panel farklı ritimde                                                               |
| 2  | **Değişken tipografi + optik boyut**                   | Başlığı görsel bir öğe yapmak, sadece metin taşıyıcısı olmaktan çıkarmak | Bricolage Grotesque 400–800, `clamp()` ölçek, -0.04em izleme; Instrument Sans gövde                                                                    |
| 3  | **Riso / ofset baskı hatası**                          | Gradyan ve cam efektlerinden uzak, basılı materyal hissi                 | 3–8 px **blur'suz** sert gölge, 2 px mürekkep kontur, kâğıt ızgarası, büyük daireler                                                                   |
| 4  | **Sticker / bant estetiği**                            | Genç kitleye "kendi defterin" hissi; mükemmel hizadan kaçınma            | Hafif döndürülmüş etiketler, kesikli çizgili meydan okuma kartı, onboarding'de bant izi                                                                |
| 5  | **Maskot güdümlü karakter tasarımı**                   | Uygulamaya ses ve hafıza kazandırmak                                     | 7 maskot, 5 ruh hâli, bağlama göre mutlu/üzgün; CSS ile nefes + göz kırpma                                                                             |
| 6  | **View Transitions API**                               | Ekran geçişlerini JS animasyonu yazmadan akıcı yapmak                    | `navigate()` içinde `document.startViewTransition` + `flushSync`; desteklenmezse CSS giriş animasyonu                                                  |
| 7  | **Amaçlı mikro etkileşim**                             | Her tıklamada geri bildirim, ama gürültüsüz                              | Basma `scale(.97)` 140 ms; doğru cevapta "damga", yanlışta 320 ms sarsıntı; kombo zıplaması                                                            |
| 8  | **3D kart çevirme**                                    | Ezber kartının fiziksel metaforu                                         | `preserve-3d` + `rotateY(180deg)`, 440 ms `ease-in-out`, `backface-visibility: hidden`                                                                 |
| 9  | **Koreografili kademeli giriş**                        | Tek bir düzenli an, dağınık efektlerden iyi                              | Seçeneklerde 40 ms, grafik çubuklarında 45 ms, onboarding adımlarında 380 ms                                                                           |
| 10 | **Aşamalı açığa çıkarma (bottom sheet)**               | Mobilde bağlamı kaybetmeden detay                                        | Mod ayarları, kelime kartı, IPA rehberi; gripten tutulabilir, `translateY(101%)` → 0                                                                   |
| 11 | **Bağımlılıksız parçacık motoru**                      | Konfeti için 30 KB kütüphane istemedik                                   | Tek canvas, DPR ≤ 2, 56–90 parçacık, 3.2 s sonra kendini yok eder                                                                                      |
| 12 | **İskelet + ilk boya disiplini**                       | Yavaş ağda boş ekran yerine yapı göstermek                               | HTML'e gömülü açılış ekranı, tema öncesi script, `React.lazy` için iskelet                                                                             |
| 13 | **Mobil-native his**                                   | Web uygulamasının "site" gibi hissettirmemesi                            | Tap highlight kapalı, hover yalnızca `(hover:hover) and (pointer:fine)`, `100dvh`, `env(safe-area-inset-*)`, 16 px input, `touch-action: manipulation` |
| 14 | **Oyunlaştırılmış ilerleme**                           | Motivasyonu kart kalabalığı olmadan vermek                               | SVG halka, `scaleX` tabanlı çubuklar, bilet biçiminde seri kartı, 7 günlük noktalar                                                                    |
| 15 | **Erişilebilir hareket**                               | Animasyon kimseyi dışarıda bırakmamalı                                   | `prefers-reduced-motion` + uygulama içi Sakin mod; `aria-live`, görünür odak, 44 px hedef                                                              |

### Bilinçli olarak kaçınılanlar

- Mor→mavi gradyan, cam (glassmorphism), "hero'da 3 istatistik + gradyan vurgu" şablonu
- Inter/system font ile her ekranda aynı yuvarlak kart ve aynı yumuşak gölge
- Her başlığın üstünde büyük harfli "eyebrow" etiketi, "A · B · C" meta dizileri, butonlarda "→"
- Scroll hijacking, sonsuz parallax, her bölümde fade-up girişi
- Bounce/elastic easing (demode), `transition: all`, `scale(0)` girişi, 300 ms üzeri UI animasyonu

### Tasarım planının öz denetimi

İlk plan "koyu zemin + asit yeşili tek vurgu" idi; bunun da bir AI klişesi olduğu görülüp
  
reddedildi. Yerine **kâğıt zemin + mürekkep + üç renkli riso vurgu** seçildi. Tek bir cesur öğe
  
(büyük tipografi + maskotlar) tutuldu, geri kalan her şey sakinleştirildi.

---

## 3. Teknik kararlar

| Karar                                      | Alternatif                | Neden bu?                                                                        |
| ------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------- |
| React 19 + Vite + TS                       | Vanilla TS / Svelte       | Ekran sayısı ve durum akışı React'e uygun; Vite ile chunk kontrolü ve anında HMR |
| Özel store (`useSyncExternalStore`)        | Zustand / Redux           | 1 KB bile eklememek; tek kaynak, öngörülebilir yazma                             |
| El yazımı CSS + tokenlar                   | Tailwind / UI kit         | Tasarımın kimliği özel; sınıf patlaması ve varsayılan gölgeler istenmedi         |
| CSS animasyonları                          | Framer Motion             | `transform/opacity` ile GPU'da kalan, JS yükü olmayan hareket                    |
| `words.json` ana pakette, `dict.json` lazy | İkisi de ana pakette      | Ana ekran 127 KB tanım verisini indirmesin                                       |
| Kelime anahtarı = kelime metni             | Artan sayısal id          | Liste değişiminde ilerleme korunur, özel kelimeler aynı motoru kullanır          |
| Özel service worker                        | Workbox / vite-plugin-pwa | 60 satır, tam kontrol, precache listesi derlemeden üretiliyor                    |
| Hash'siz History API + 404.html            | HashRouter                | Temiz URL; GitHub Pages 404 kabuğu ile derin bağlantı çalışıyor                  |

**SRS iyileştirmesi:** Kaynak uygulamada yanlış cevap kelimeyi 1 güne atıyordu. VocaStride 2.0'da
  
yanlış cevap 1. kutuya düşürüp **10 dakika** sonra yeniden soruyor; ayrıca oturum sonunda
  
"Yanlışları çalış" ile aynı kelimeler hemen yeni bir tura alınabiliyor.

---

## 4. İnşa adımları

1. **Veri çıkarma** — Referans `index.html` içindeki 1200 kelime ve IPA/tanım sözlüğü Python ile
     
   ayrıştırıldı; kompakt `words.json` (~74 KB) ve `dict.json` (~127 KB) üretildi.
2. **İskelet** — Vite + React + TS, GitHub Pages alt yolu, PWA manifesti, ikon üretimi (sharp),
     
   `404.html`, `.nojekyll`, Actions iş akışları.
3. **Motor** — Tarih yardımcıları, Leitner, XP/seviye, seri, rozet koşulları, günlük hedef,
     
   soru/eşleştirme üretimi, oturum planı.
4. **Tasarım sistemi** — Tokenlar, tipografi, buton/kart/çip/segment/sheet/bildirim bileşenleri,
     
   kabuk (kenar çubuğu, üst bar, dock), 7 maskot.
5. **Akışlar** — Onboarding (3 adım), ana ekran, test, kartlar, eşleştirme, maraton, özet,
     
   paylaşım kartı.
6. **İkincil ekranlar** — İstatistik (grafik + ısı haritası + ustalık), rozetler, sözlük (arama +
     
   filtre + detay + not + IPA rehberi), ayarlar (tema, hedef, listeler, yedek).
7. **PWA ve dağıtım** — Service worker üretimi, precache, çevrimdışı testi, OG görseli.
8. **QA** — Playwright ile masaüstü/mobil ekran görüntüleri, tüm modların akışı, klavye, yedekleme,
     
   paylaşım, çevrimdışı yeniden yükleme.

---

## 5. Bulunan ve düzeltilen sorunlar

| Sorun                                 | Belirti                                                            | Çözüm                                                                                |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Alt yol uyuşmazlığı                   | `vite preview` kökte, derleme `/VocaStride/` altında               | `mode` üzerinden base seçimi; önizleme üretimle aynı yolu kullanıyor                 |
| "Bugünkü tekrar" 1200 kelime          | Hiç çalışılmamış kelimeler de vadesi gelmiş sayılıyordu            | `dueKeys` yalnızca kaydı olan ve `due <= now` kelimeleri döndürüyor                  |
| Maskotlar çizgisiz                    | `--m-ink` tanımsızdı; SVG `stroke: var(--m-ink)` geçersiz → `none` | Değişken maskot inline stiline eklendi; tüm konturlar ve mutlu yüz ifadeleri göründü |
| Kart çevirme yüksekliği 0             | Flex öğesinde yüzde yükseklik çözülemiyordu                        | `.flip-inner` mutlak konumlandırıldı (`inset: 0`)                                    |
| Eşleştirmede ilerleme sıçraması       | Her yanlış çift bir "bölüm" sayılıyordu                            | `countUnit` parametresi; ilerleme yalnızca tur bitince artıyor                       |
| Çift View Transition uyarısı          | Hızlı ardışık gezinmelerde geçiş atlanıyordu                       | `transitioning` kilidi ve `finished` sonrası serbest bırakma                         |
| Yedek dosyası tarihi bir gün geri     | `toISOString()` UTC kullanıyordu                                   | Yerel `dateStr()`                                                                    |
| StrictMode'da tek kullanımlık anahtar | "Yanlışları çalış" listesi iki kez tüketilebiliyordu               | `peek`/`clear` modeline geçildi; ilk cevapta temizleniyor                            |
| Sözlük tür etiketi tutarsızlığı       | Filtre "fiil", satır "v" gösteriyordu                              | Satırlarda da Türkçe tür etiketi                                                     |
| Kontrast                              | `--ink-3` küçük metinde 3.6:1                                      | `#6D6879` ile 4.6:1'e çekildi                                                        |

---

## 6. Ölçülen performans

Üretim derlemesi (gzip):

```
index.js         51 KB   (uygulama + 1200 kelime)
react.js         67 KB   (vendor, uzun ömürlü cache)
Session.js        5 KB   (oturum başında, boşta önceden indirilir)
Settings.js       3 KB
Dictionary.js     2 KB
dict.json        52 KB   (yalnızca IPA/tanım gerekince)
CSS              13 KB
Fontlar         149 KB   (4 woff2 alt kümesi)
```

- Animasyonlar yalnızca `transform`/`opacity`; düzen tetikleyen özellik animasyonu yok.
- Konfeti yalnızca gerektiğinde oluşturulur, DPR 2 ile sınırlı, işi bitince DOM'dan kaldırılır.
- Sözlük 80'lik parçalar hâlinde render edilir; arama `useDeferredValue` ile geciktirilir.
- Kalıcılık 320 ms debounce; sekme gizlenince zorunlu yazma.



---

## 7. İkinci tur: oyun hissi ve yeni modlar

İlk sürüm işlevsel olarak tamamdı ama üç şikâyet vardı: tasarım "sade ile genç işi arasında"
sıkışmıştı, maskotlar karakter taşımıyordu ve geçişler oyun değil form hissi veriyordu. Bu turda
üçü birlikte ele alındı.

### 7.1 Tasarım dili sıfırlandı

- Kalın kontur, sert ofset gölge ve sticker dili kaldırıldı. Yerine **1 px çizgi + katmanlı yumuşak
  gölge + sıcak kâğıt zemin** geldi. Marka renkleri korundu (fosfor mavisi, pembe, nane, sarı).
- Fosforlu kalem vurgusu korundu; koyu temada okunabilirlik için sarı metne dönüşüyor.
- Logo yeniden çizildi: simetrik **V** + ivme noktası. İkon, açılış ekranı ve OG görseli aynı
  geometriden üretiliyor (`scripts/icons.mjs`, `scripts/og.mjs`).

### 7.2 Maskotlar tek aileye dönüştü

İlk denemede her karakter ayrı bir çizimdi ve ölçek tutmuyordu. İkinci denemede ortak gövde +
ayrışan silüet/aksesuar modeline geçildi:

- Gövde: kontursuz, üç duraklı gradyan, `120×120` viewBox, tek `Eyes/Mouth/Cheeks` seti.
- Silüetler: geniş damla (Sole), ince tohum (Pip), düz tabanlı geniş gövde (Hoot), armut (Zig),
  tam yuvarlak (Dash), yuvarlak kare (Sage), alev (Ember).
- Aksesuarlar: kulaklık, filiz, püskül, kedi kulağı + bıyık, alev tutamı + hız çizgileri, gözlük.
- Havada duran "ayakkabı" denemesi kaldırıldı; karakterler yumuşak bir temas gölgesiyle duruyor.

### 7.3 Üç yeni mod

| Mod | Neden | Nasıl |
| --- | --- | --- |
| **Hız turu** | Tekrarın sıkıcı olmaması için baskı gerekiyordu | 60 sn geri sayım, 24 soruluk havuz, süre bitince otomatik özet |
| **Dinleme** | Telaffuz, okuma bilgisinden ayrı bir beceri | `speechSynthesis`, otomatik oynatma + tekrar dinleme, dalga animasyonu |
| **Yazma** | Tanıma değil üretme; en zor ve en kalıcı adım | Harf harf açılan şerit, harf ipucu, `Enter` ile kontrol |

`session.ts` içinde üç yeni adım türü (`listen`, `type`) ve plan seviyesinde `timeLimit` eklendi.
Mevcut `quiz` adımı `variant` prop'u ile dinleme görünümünü de üretiyor; kod tekrarı yok.

### 7.4 Hareket: oyun hissi

- **Adım geçişi:** her soru kendi bileşeniyle yeniden doğuyor (`key={idx}`), giriş 320 ms
  `step-in`, çıkış 150 ms sola kayma.
- **Kart fırlatma:** `pointer` olaylarıyla 1:1 sürükleme, `dx * 0.04deg` eğim, 88 px eşik,
  bırakınca yay ile geri dönüş. Sürükleme sırasında React state'i güncellenmiyor; doğrudan
  `el.style.transform` yazılıyor.
- **Eşleştirme:** karolar 38 ms kademeyle giriyor, doğru çift `tile-lock` ile kilitleniyor,
  satırlar `grid-auto-rows` ile iki sütunda hizalı kalıyor.
- **Seri patlaması:** 3/5/8/12/20 doğruda kısa etiket; her doğruda değil.
- **Tema geçişi:** `document.startViewTransition` ile çapraz geçiş (desteklenmiyorsa sessizce
  doğrudan uygulanır).
- **Halka:** ilk boyada 0'dan doluyor; sabit yüzde görmek yerine ilerleme hissi.

### 7.5 Bu turda bulunan hatalar

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| Koyu temada başlık vurgusu görünmüyordu | Fosforlu şerit satır kutusunun altında kalıyor, metin koyu zeminde siyahtı | Koyu temada sarı metin + ince alt çizgi |
| Seçenekler "1. tayin etmek 2. postalatmak" gibi görünüyordu | Kelime bankası çok anlamlı karşılıklar içeriyor | `firstSense()` ile ilk anlam; sözlükte tam karşılık korunuyor |
| Eşleştirmede satırlar kayıyordu | İki sütun bağımsız grid, uzun metin satırı büyütüyordu | `grid-auto-rows: minmax(58px, 1fr)` |
| Kart destesinde ayakkabılar havada duruyordu | Gövde bitişi ile gölge arasında boşluk | Ayakkabı katmanı kaldırıldı, temas gölgesi gövdeye yaklaştırıldı |
| Mod ızgarasında boş hücre kalıyordu | 3 normal + 1 tam satır kart | 6 normal + 1 tam satır; dengeli 3×2 + alt satır |

---

## 8. Gelecek hedefleri

### Kısa vade (1–2 sürüm)

- [ ] Vitest ile motor birim testleri (SRS aralıkları, XP eşikleri, rozet koşulları, liste ayrıştırma)
- [ ] Playwright akış testlerini depoya eklemek (şu an yerel QA script'i olarak duruyor)
- [ ] `prefers-contrast` ve yüksek kontrast teması
- [ ] Sözlükte sonsuz kaydırma yerine sanal liste (1200 satırda sabit DOM)
- [ ] Kelime kartına örnek cümle alanı
- [ ] Yazma modunda küçük yazım hatası toleransı (Levenshtein ≤ 1)
- [ ] Hız turu için kişisel en iyi skor ve haftalık karşılaştırma

### Orta vade

- [ ] CSV / Anki içe aktarma ve dışa aktarma
- [ ] Telaffuz pratiği (MediaRecorder + basit karşılaştırma)
- [ ] Haftalık özet bildirimi (opt-in, yerel bildirim)
- [ ] Kelime aileleri / kök gösterimi
- [ ] Çoklu dil çifti altyapısı (TR→EN dışında)

### Uzun vade

- [ ] Uçtan uca şifreli, isteğe bağlı cihazlar arası senkronizasyon
- [ ] Öğretmen/sınıf listeleri (paylaşılabilir kelime desteleri)
- [ ] Topluluk kelime listeleri ve sürümleme
- [ ] Lighthouse CI ile performans bütçesi kapısı

### Bilinen sınırlar

- Arayüz yalnızca Türkçe; kelime haznesi EN→TR.
- Veriler cihaza bağlı; tarayıcı temizliği ilerlemeyi siler (yedek alınmalı).
- iOS'ta PWA kurulumu Safari'nin "Ana Ekrana Ekle" akışına bağlı.
- Ses efektleri WebAudio gerektirir; ilk dokunuştan önce çalmaz (tarayıcı politikası).
- Gerçek cihaz testi bu ortamda sınırlı; dokunma hissi için bir tur fiziksel cihaz önerilir.

---

## 9. Dördüncü tur (v4): defter dili, dil seçimi, gerçek telaffuz

Üçüncü turun sonunda ürün işlevsel olarak tamamdı ama üç şikâyet vardı: maskotlar
taşıyordu, tasarım "sade ile genel geçer arasında" sıkışmıştı ve telaffuz cihazın
yapay sesine bağlıydı. Bu tur üçünü birlikte çözdü.

### 9.1 Maskotlar kaldırıldı

Yedi karakter, beş ruh hâli ve tüm `mascot-*` animasyonları silindi. Yerine hiçbir
"karakter" konmadı: ürünün karakteri artık **kelimenin kendisi**. Onboarding'de maskot
yerine canlı bir kelime kartı var (okunuş, karşılık, tanım, ustalık noktaları).

### 9.2 Tasarım dili: kelime defteri

- Hero-metrik, eyebrow etiketi, yüzen çipler, halka göstergesi ve kart kiti kaldırıldı.
- Palet tek vurguya indi (mürekkep mavisi); yeşil/kırmızı yalnızca doğru/yanlış taşıyor.
- Yarıçaplar 5–22 px'e çekildi, gölge neredeyse sıfırlandı, 1 px cetvel çizgileri geldi.
- Ana ekranın tek renkli yüzeyi **bugünün sırası**: gerçek kelimeler, gerçek sıra.

### 9.3 Türkçe / İngilizce arayüz

- Metinler `src/lib/i18n.ts` içinde `[tr, en]` çiftleri hâlinde; eksik çeviri derlemede
  değil, sözlüğü yazarken yakalanıyor.
- İlk kurulumda dil soruluyor; varsayılan `navigator.languages`'tan tahmin ediliyor.
- Tarih, saat, çekim ve kelime türü etiketleri de dile bağlı. Kelime verisi (TR↔EN)
  değişmiyor; yalnızca arayüz dili değişiyor.

### 9.4 Telaffuz: Wikimedia Commons

- `speechSynthesis` yerine Commons dosyaları: önce `En-us-<kelime>.ogg` ailesi, sonra
  Lingua Libre (`LL-Q1860 (eng)-…`) kayıtları aranıyor; Fransızca/Almanca dosyalar
  dosya adından eleniyor.
- Ogg/Wav her tarayıcıda çalınmadığı için Wikimedia'nın **mp3 dönüşümü** isteniyor
  (~15 KB, iOS dahil her yerde çalar).
- Üç katmanlı önbellek: bellek → `localStorage` (çözümleme + lisans) → `CacheStorage`
  (sesin kendisi, çevrimdışı çalar). Önbellek 260 dosyada sınırlanıyor.
- İstekler tek sırada ve 240 ms aralıkla gidiyor; 429'da geri çekilip yeniden deniyor.
- Lisans ve konuşmacı adı kelime kartında görünüyor (CC BY-SA gereği).

### 9.5 Sürdürülebilir çalışma

`src/lib/sustain.ts`: haftalık ritim, bakım yükü tahmini, tur tavanı, inatçı kelime
işareti, otomatik yerel anlık görüntü. Ayrıntı: README "Sürdürülebilir çalışma".

### 9.6 Rastgelelik onarıldı

Eski `buildQueue` yeni kelimeleri alfabetik sıradan kesiyordu; her tur aynı
"abandon, abolish, abrupt…" destesiyle açılıyordu. Artık üç havuz da karıştırılıp
ağırlıklı harmanlanıyor (çoğunluk tekrar, azınlık yeni ve zayıf) ve sonuç yeniden
karıştırılıyor.

### 9.7 Hareket ve dokunma

- Basış: `translateY(1px) scale(.972)` + iç gölge, 110 ms. Anahtar topuzu basınca
  yassılıyor.
- Seçenekler 45 ms kademeyle giriyor; doğru cevap bir kez nefes alıp yeşile dönüyor,
  onay işareti yayla beliriyor; yanlış cevap sarsılıyor.
- Eşleşen karo nabız atıyor, çevresinde halka açılıyor, köşesine onay düşüyor.
- Kart sürüklenirken gölgesi yükseliyor; sayfa geçişleri View Transitions ile
  220 ms'de oturuyor.
- Kademeli girişlerde `animation-fill-mode: backwards` kullanıldı: biten animasyon
  `:active` dönüşümünü ezmiyor.

### 9.8 Bu turda bulunan hatalar

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| Oturumda üç rozet bildirimi soruyu kapatıyordu | Bildirimler alt ortada birikiyor | Oturum sırasında rozet/seviye bildirimi susturuldu; özet ekranı zaten gösteriyor |
| Seçenekler ekranın altına taşıyordu | Sabit geri bildirim çubuğu içeriği örtüyordu | Çubuk yalnızca cevaptan sonra render ediliyor |
| Kart içine ses düğmesi konunca HTML bozuldu | `<button>` içinde `<button>` | Kart `div[role=button]`'a çevrildi, `Enter` eklendi |
| Ustalık çubukları boş görünüyordu | Ölçek 1200 kelimeye göreydi | Ölçek çalışılmış kelimelere çevrildi, "çalışılmadı" satırı nota taşındı |
| "6/5 gün" gibi okunan ritim | Haftalık hedef aşılabiliyor | Pay hedefle sınırlandı |
| Yükleme "~0.3" gösteriyordu | Ondalık biçim | 1'in altı "<1" olarak yazılıyor |

---

## 10. Altıncı tur (v6): görsel sistem ve geçiş onarımı

Ürün yeniden tasarlanmadı; var olan "kâğıt + mürekkep" dili baştan sona elden
geçirildi, geçişlerdeki bozulmalar giderildi ve kullanıcıya görünen üç somut hata
kapatıldı.

### 10.1 Tokenlar ve yüzey

- Palet ısıtıldı: `#f4f1e9` kâğıt, `#17150f` mürekkep, tek vurgu `#1b3a63`.
- Gövdeye tek katman ince grain (`feTurbulence`, açıkta %3.5, koyuda %5).
- Gölge üç kademeye indirildi; kart `shadow-1`, yükselen yüzey `shadow-lift`.
- Yarıçap 4–22 px; 22 px yalnızca sheet. Sınır çizgisi her yerde 1 px.

### 10.2 Kabuk

- Kenar çubuğuna **günün özeti** geldi: hedef halkası, sayaç, 7 günlük seri noktaları.
- Etkin bağlantının solunda mürekkep çentiği; dock'ta etkin sekmenin üstünde kısa çizgi.
- Üst bar kaydırılınca ince çizgi ve gölge alıyor (`data-stuck`).

### 10.3 Ekranlar

- **Ana ekran:** hedef halkalı başlık, numaralı tekrar kuyruğu, kısayol rozetli mod
  kartları, haftalık ritim ve yük sütunu.
- **İstatistik:** dört hücreli özet şeridi, imleçle bilgi veren grafik, 26 haftalık
  takvim + yan metrikler, ustalık çubukları.
- **Rozetler:** kazanılmış rozet simgeleri ton zemininde beyaza döndü (kontrast hatası).
- **Sözlük:** yapışkan araç çubuğu, harf başlıkları, `/` ile aramaya atlama, rastgele kelime.
- **Ayarlar:** bölümler kart oldu, simgeli başlıklar; mobilde segmentler tam genişlik.
- **Oturum:** defter çizgisi zemini, üç bölgeli düzen, deste katmanı, klavye ipucu satırı.
- **Özet:** halkalı sonuç kartı, 2×2 / 4×1 istatistik ızgarası.
- **İlk kurulum:** arkada deste katmanı; dil, hedef ve tema adımları aynı dilde.


### 10.4 Yeni

- Klavye kısayolları paneli (`?` tuşu ve kenar çubuğundaki bilgi düğmesi).
- Sözlükte rastgele kelime düğmesi ve `/` kısayolu.

### 10.5 Geçiş ve animasyon onarımı

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| Sekme geçişinde metin çarpılıyordu | Tüm sayfanın anlık görüntüsü `scale(.995)` ile ölçekleniyor, üstüne `screen-enter` ikinci kez çalışıyordu | Geçiş yalnızca içerik katmanına alındı (`view-transition-name: content`), kökte animasyon yok, dönüşüm kaldırıldı; `screen-enter` View Transitions destekliyorsa kapalı |
| Geçişte iskelet parlıyordu | Ekranlar `lazy` yükleniyordu; yeni görüntü iskeletle yakalanıyordu | Ekranlar statik import edildi (ilk yük +14 KB gzip, gezinme anlık) |
| Mod menüsü animasyonsuz açılıyordu | Açılış bir CSS `transition`'ına bağlıydı; geçişin çalışması için öğenin bir kare "kapalı" hâliyle boyanması gerekiyor, mobil tarayıcı bu kareyi atlayabiliyor | Sheet ve perde `transition` yerine **CSS animasyonu** ile açılıp kapanıyor: animasyon öğe DOM'a girdiği anda başlar, zamanlama sorunu kalmaz |
| Sheet kapanırken küçülüp sıçrıyordu | Kapanışta başlık ve gövde boşalıyor, yükseklik çöküyordu | Açıkken son içerik saklanıyor, kapanış boyunca o gösteriliyor |
| Vadesi olmayan günde "Tura başla" kartı bozuk duruyordu | Kart, boş liste ve ortalanmış bağlantıyla da çiziliyordu | Kart yalnızca vade varsa görünüyor; alt satır `1fr auto` (buton + kare ayar düğmesi) |

### 10.6 Kart üstündeki şerit kaldırıldı

"Tekrar sırası" kartının üstünde 3 px kalınlığında vurgu şeridi vardı. Kartın
kendi kenarlığı ve gölgesiyle birlikte "sekme/etiket" gibi duruyor, başlığı
aşağı itiyor ve kartı olduğundan ağır gösteriyordu. Şerit kaldırıldı; hiyerarşi
artık yalnızca tipografi, 1 px kenarlık ve gölgeden geliyor.

### 10.7 Halka sayıları yerine oturdu

Kenar çubuğundaki hedef halkasında sayı halkanın **altında** kalıyordu: `Ring`
bileşeni sayıyı kendi `.ring-wrap` ızgarasına alıyor, dışarıda bırakılan `<b>`
ikinci satıra düşüyordu. Sayı artık `Ring`'in çocuğu; hem kenar çubuğunda hem
başlıktaki hapda halkanın ortasında. Hapın metni de "13 / 20" yerine hedefi
söylüyor ("20 kelime"), böylece sayı iki kez yazılmıyor.

### 10.8 Bu turda kapatılmayan

- **Günlük sayaç gece yarısı sıfırlanmıyor.** `state.daily` yalnızca ilk cevap
  kaydedilirken tarih kontrolünden geçiyor; yeni günde ana ekran dünün sayısını
  gösteriyor. `load()` içinde tarih normalizasyonu gerekiyor.
- Beşinci tur ayrı bir başlıkla yazılmadı; §10 numarası bu yüzden 4'ten 6'ya
  atlıyor. O turun çıktısı kodda duruyor (düz kâğıt dili, sheet'ler, iki dilli
  arayüzün oturması) ama günlükte kaydı yok.

---

## 11. Yedinci tur: kampanya — "bugün" ekranından yol haritasına

Bu turda ürünün omurgası değişti. Ana ekran artık mod listesi değil, ilerleyen bir
**yol**; modlar yan sekmeye (Pratik) taşındı. Kelime listesine hiç dokunulmadı —
1200 kelime olduğu gibi kaldı, zorluk ayrı bir türetilmiş indeksten geliyor.

### 11.1 Neden kampanya

Mevcut ana ekran "bugün ne çalışsam" sorusunu cevaplıyordu ama **nereye gittiğini**
göstermiyordu. 1200 kelimeyi 7 moda dağıtmak öğrenmeyi sürdürülebilir kılmıyor;
ilerleme hissi vermiyor. Kampanya, kelime haznesini sıralı bir yola çeviriyor:
her bölüm 15 kelime, her bölüm bir öncekinin üstüne biniyor.

Aynı kararla **"Günün tekrarı" menüsü kaldırıldı**. Tekrar artık bölümlerin içinde:
her bölümün 7 yuvası geçmiş kelimelere ayrılıyor. Ayrı bir menü, aynı işi ikinci kez
yapıyor ve ana ekranı ikiye bölüyordu.

### 11.2 Zorluk bantları: frekans tek başına yetmiyor

Kelime listesi değişmeyeceğine göre zorluk sırası türetilmeliydi. İki bağımsız
korpus harmanlandı: OpenSubtitles 2018 (konuşma dili) ve Google Trillion Word
Corpus ilk 10.000 (yazılı dil). Ağırlıklar 0.45 / 0.55. Tek korpus yanıltıyordu:
yalnızca altyazıyla "gap", "ally", "herd" gibi gündelik kelimeler neredeyse en zor
banda düşüyordu.

Üç düzeltme gerekti.

**Türetilmiş biçim.** Band 6'daki 200 kelimenin ~50'si `-ly` zarfıydı
(*hastily, moderately, harshly*). Kendi frekanslarıyla puanlandıkları için en zor
banda düşmüşlerdi; oysa kökü bilen için türev neredeyse bedava. Ölçüm: kök,
türevinden medyan **4.2 kat** daha sık geçiyor. Artık türetilmiş kelime, kökünün
dörtte biri kadar yaygın sayılıyor (`freq-base.txt`, `BASE_DISCOUNT = 4`).
135 kelimenin puanı değişti.

**Frekansın kör noktası.** Korpus bir kelimenin *hangi anlamının* öğretildiğini
bilmiyor. Banka, sık kelimelerin ikincil anlamlarını taşıyor: `mean` "cimri",
`sound` "akla yatkın", `minute` "ufak tefek", `found` "kurmak", `board` "(taşıta)
binmek". Frekans bu kelimeleri en kolay banda atıyordu ve ilk bölümlerde çıkıyorlardı.
`build-bands.mjs` içine elle bir katman eklendi: 80 kelime hedef banda sabitlendi
(19'u yalnızca bu "ikincil anlam" sorunu için).

**Eşit bant yanılgısı.** 6×200'lük eşit bölme, banka B2 ağırlıklı olduğu için son
bandı zorunlu olarak B2 kelimelerle dolduruyordu; "en zor bant" hissi kayboluyordu.
Bantlar ağırlıklandırıldı: **288 / 248 / 216 / 192 / 160 / 96**. Son bant artık 96
kelime ve gerçekten zor. `VS_BAND_SHARE=equal` ile eski bölmeye dönülebilir.

Özel liste kelimeleri (şablonla eklenenler) frekansta olmadığı için biçimsel
tahminle yerleştiriliyor: uzunluk, türetim eki, çok kelimeli olma, anlam sayısı.
`bandsFor(words)` temel bankada `bands.json` ile birebir aynı sonucu veriyor (fark 0).

### 11.3 Kampanya motoru

`src/lib/levels.ts` saf mantık: DOM yok, store yok, kelime verisi parametre.
Aynı kod hem uygulamada hem simülasyonda çalışıyor.

- **150 bölüm**, 6 kademe. Kademe başına bölüm sayısı kelime sayısından türüyor.
- **Boss ritmi** 40'lık bir döngü: 10 ve 30'da ara sınav, 20'de büyük sınav,
  40'ta bitirme. (İsimler başta "boss"tu; istenmedi, sınav diline çevrildi.)
- **Bölüm anatomisi:** 8 yeni + 7 tekrar (3 ısınma, 1 eski hata, 1 sürpriz).
  İlk bölüm tanışma bölümü: 15 kelimenin hepsi yeni, tekrar yuvası yok.
- **Soğuma:** yanlış yapılan kelime 1 bölüm sonra, yeni öğrenilen 2–3, oturmuş 6,
  ustalaşmış 10 bölüm sonra döner. Aynı kelime yanlış yapılmadıkça 3 bölümden kısa
  arayla iki kez gelmez. Alt sınır var, üst sınır yok — hiçbir kelime kaybolmaz.
- **Adalet:** hiç tekrar görmemiş kelime, çok gecikmiş kelimeden önce seçilir.
  Bu kural olmadan aynı birkaç kelime dönüp duruyordu (tekrar kapsamı %39'da
  kalıyordu, eklenince %73).
- **Determinizm:** seçim bölüm id'sinden tohumlanıyor; aynı bölümün ikinci denemesi
  aynı kelimeleri, farklı sırada veriyor.

Bölüm sayısı bir zevk kararı değil, aritmetik. 15 soruluk bölümde tekrar payı
`15 − yeni` kadar; 1200 kelimeyi bu bütçeye sığdırmanın ölçümü:

| yeni/bölüm | bölüm | temas/kelime | tekrar kapsamı | medyan aralık |
| --- | --- | --- | --- | --- |
| 10 | 120 | 1.51 | %45 | 33 |
| **8** | **150** | **1.89** | **%75** | **17** |
| 7 | 171 | 2.15 | %95 | 4 |

8'de karar kılındı: eğrinin diz noktası. 7'ye inmek gerçek SRS davranışı veriyor
ama kampanyayı 171 bölüme çıkarıyor.

### 11.4 Bölüm oturumu ve mod karışımı

Bölümler tek tip test değil. `/study/level` rotası, bölümün birimlerini
(`PlannedUnit[]`) oturum adımlarına çeviriyor (`buildLevelSteps`). Beş arketip
sırayla dönüyor:

| bölüm | içerik |
| --- | --- |
| #1 | kart destesi (8) + test (7) |
| #2 | test (10) + eşleştirme |
| #5 | kart + test + dinleme + yazma |
| #10 ara sınav | test (13) + yazma (2) |
| #20 büyük sınav | yazma (4) + test (8) + dinleme (3) |
| #40 bitirme | 20 kelime: yazma (4) + test (15) + dinleme (1) |

İki kural karışımı "kontrollü" tutuyor: yazma ve dinleme sorusu, kelimeyi kartla
görmeden gelmiyor; sınav bölümlerinde kart ve eşleştirme yok — sadece üretim.

Dağılım: test 1332, dinleme 396, yazma 147, kart 82, eşleştirme 27 adım.
150 bölümün tamamında kelime sayısı tam (`countUnits === def.total`), 0 sapma.

### 11.5 Harita ekranı

Duolingo tarzı dikey patika, ama defter dili korunarak: düğümler mühür, yol ince
bir cetvel çizgisi. Geçilen yerde çizgi mürekkep gibi dolu, ileride kesikli.

- Üç düğüm durumu: geçilmiş (tik + yıldız noktaları), sıradaki (vurgu rengi,
  büyük, "BAŞLA" etiketi), kilitli (kesikli, soluk).
- Sınav düğümleri taç rozetiyle ve ton rengiyle ayrılıyor; kilitliyken bile biraz
  daha büyük.
- Kademe başlıkları bölüm ayracı gibi: damga kutusunda numara, ad, `36/36 bölüm`.
- Açılışta oynanacak bölüme kayıyor.
- Masaüstünde sağ panel sticky; mobilde tek sütun.

### 11.6 Depo: sürüm 3

Kampanya ilerlemesi (`campaign: Record<listId, { level, stars, words }>`) eklendi.
`version: 2 → 3` geçişi eski SRS'i, XP'yi ve ayarları koruyor; v2 yedekleri de
hâlâ yükleniyor. Liste başına ayrı ilerleme tutuluyor, böylece özel listeler de
kendi yolunu kurabiliyor.

### 11.7 Bu turda bulunan hatalar

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| İlk bölümde "sound = akla yatkın" gibi zor anlamlar | Frekans, öğretilen anlamı bilmiyor | İkincil anlam katmanı; 19 kelime geriye alındı |
| Harita açılışta en baştan başlıyordu | `html { scroll-behavior: smooth }` yüzünden yumuşak kaydırma yarım kalıyordu | `scrollTo({ behavior: 'instant' })` |
| Kaydırma hiç çalışmıyordu | StrictMode effect'i iki kez koşuyor, ref guard ikinciyi iptal ediyordu | Guard kaldırıldı, iki deneme (120 ms / 640 ms) |
| "Sıradaki bölüm" başlığı karta yapışıyordu | Kart `sec` sınıfı da taşıyordu; `.sec:first-child` (0,2,0) kartın `padding: 16px` ve `border` değerlerini eziyordu | `sec` sınıfı kaldırıldı |
| Soru geçişi "soldan geliyor" hissi veriyordu | Çıkan içerik `translateX(-10px)` ile sola kayıyordu | Sönümleme + 4 px yukarı |
| Geçişler yavaştı (~740 ms) | 140 ms çıkış + 280 ms giriş + 45 ms kademeli seçenekler | 90 / 165 / 16 ms, bekleme 70 ms |
| Eşleştirmede sayaç zıplıyordu | Tur başına 1 birim sayılıyordu | Kelime başına 1 birim |

### 11.8 Bu turda kapatılmayan

- **3 can yok.** Bölüm şu an can tüketmiyor; hata yapınca bölüm bitmiyor.
- **Bölüm sonu hata sayfası yok.** Yanlış yapılan kelimeler özet ekranında ama
  bölüme özel "hata defteri" (ses + örnek cümle + mini tekrar) henüz yazılmadı.
- **Rozetler dock'tan çıktı**, yalnızca haritanın panelinden erişiliyor. İstatistik
  ekranına da bir giriş gerekiyor.
- **Medyan tekrar aralığı 17 bölüm**, gerçek bir SRS için uzun. Kampanya ilk geçiş;
  kalıcılık serbest modda yaşamalı. 171 bölüme çıkmadan bu böyle.
- **`words.json` içinde "crack" karşılığı bozuk** ("yark, çatlayak" → "yarık,
  çatlak"). Kelime listesine dokunulmadığı için bırakıldı.
- Bantlar arayüzde CEFR diye adlandırılmıyor; "1–6 kademe" deniyor. Bankanın C2
  kuyruğu 96 kelimeden uzun değil, CEFR iddiası karşılıksız kalırdı.


### 11.9 Yeni dosyalar ve komutlar

```
scripts/build-bands.mjs    bant üretimi (npm run bands)
scripts/audit-levels.mjs   kampanya simülasyonu (npm run audit)
scripts/freq-en.txt        altyazı frekansları (1200 kelime)
scripts/freq-web.txt       web korpusu sıraları (615 kelime)
scripts/freq-base.txt      türetilmiş biçimlerin kök frekansı (135 kelime)
src/data/bands.json        türetilmiş zorluk indeksi (6 bant)
src/data/bands.ts          bandsFor / rankOf / özel kelime tahmini
src/lib/levels.ts          bölüm planı, mod arketipleri, soğuma, seçim
src/lib/campaign.ts        yıldız kuralı, aktif bölüm
src/screens/Path.tsx       yol ekranı
src/styles/path.css        düğüm / kademe / panel
```

---

## 12. Sekizinci tur: etkileşim hissi, maraton ve sınırsız tur

Bu turun tamamı kullanıcı geri bildirimiyle açıldı. Ortak tema: **hareketin dozu**.
Animasyonlar beğenildi, ama basış/hover geri bildirimi fazla kaçtı; ayrıca birkaç
mantık hatası birikmişti.

### 12.1 Basış ve hover: tek bir kural

Eski sistemde her bileşen kendi `:active` ölçüsünü taşıyordu (`0.94`–`0.99` arası
küçülmeler) ve üstüne global bir `translate: 0 2px` biniyordu. İki sorun çıktı:

1. **Geniş yüzeylerde küçülme, içeriği kaydırıyor.** `scale(0.988)` 520 px'lik bir
   düğmede kenarları 3 px içeri çekiyor; ortalanmış yazı yerinde kaldığı için
   "düğme göçtü, yazı inmedi" hissi doğuyordu.
2. **İki özellik iki farklı hızda oynuyordu.** `translate` geçişsiz (anlık),
   `transform` 110 ms geçişli. Basınca düğme anında 2 px iniyor, sonra 110 ms
   boyunca küçülüyordu.

Yeni kural: **basış = yüzeyin tamamının 1 px inmesi.** Ölçek yok. Yazı, ikon,
kenarlık hep birlikte iner; hiçbir parça diğerinden ayrı hareket etmez.
Bileşenler yalnızca renk ve gölge ile kendi tonunu ekliyor.

| Öğe | Önce | Sonra |
| --- | --- | --- |
| `.btn` | `scale(.974)` + 2 px | 1 px + iç gölge |
| `.chip` / `.seg` | `scale(.95/.96)` | 1 px + zemin |
| `.q-opt` | `scale(.984)` | 1 px + zemin |
| `.icon-btn` / `.swatch` / `.q-speak` | `scale(.94/.9/.94)` | 1 px + zemin |
| `.switch` topuzu | basınca 20 → 26 px yassılma | yok (yalnızca 1 px) |
| `.pnode` | `scale(.96)` | 1 px |
| Hover | `translateY(-1px)` + ikon dönmesi | yalnızca renk/çizgi/gölge |

Kural `docs/DESIGN.md` §6'ya da yazıldı: küçülme %2'yi geçmez, hover hiçbir yüzeyi
imlecin altında oynatmaz.

### 12.2 Kart: hayalet katman, dönüş yönü, çevirme şartı

- Kartın arkasındaki iki `::before/::after` "hayalet kart" kaldırıldı; desteyi
  anlatmak yerine bozuk çift kenar gibi görünüyordu.
- Çevirme yönü `rotateY(180deg)` → `rotateY(-180deg)`. Artık sağ kenar izleyiciye
  geliyor; sürükleme yönüyle (sağa çekince "biliyorum") aynı his.
- **Kart çevrilmeden not verilemiyor.** Ön yüzde yalnızca kelime varken "biliyorum"
  demek hatırlamayı değil tahmini ölçüyordu. Düğmeler pasif, sürükleme ve ok tuşları
  da not vermiyor; ipucu "önce kartı çevir" diyor.

### 12.3 Dinleme: üç ayrı sessizlik sebebi

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| Düğme "çalışmıyor" | Tıklama, açılışta kurulan 12 kelimelik ön hazırlık kuyruğunun **sonuna** giriyordu | İki kuyruk: arka plan (prefetch) ve `urgent` (tıklama). Tıklama sırayı atlıyor |
| Kelime bir daha hiç okunmuyor | Ağ hatası "ses yok" diye 30 gün kaydediliyordu | `{ok:false}` ile `{ok:true, rec:null}` ayrıldı; hata hiçbir şey yazmıyor |
| Art arda basınca çift ses | Yeni okuma öncekini kesiyor, kesilen `AbortError` cihaz sesine düşüyordu | `AbortError` sessizce yutuluyor |
| Aynı kelime iki kez çözülüyor | Ön hazırlık ve tıklama paralel gidiyordu | `inflight` map ile tek işe katılım |

Ön hazırlık penceresi 12 → 6 kelimeye indi: açılışta Commons'a 20'yi aşkın istek
atılıyordu.

### 12.4 Maraton: tek blok değil, karışık tur

Eskiden "7 test → deste → eşleştirme" diye bloklanıyordu. Bloklar kaldırıldı; ama
deste hâlâ dört kartı bir arada veriyordu ve kullanıcı bunu "5 mod 4'er 4'er değil,
her biri ayrı ayrı gelsin" diye düzeltti.

Bugünkü kural: **her adım tek kelime.** Mod, test / dinleme / yazma / tek kart
arasından dönüşümlü seçiliyor; kart modu da bir kelimelik adım olarak öteki
modların arasına karışıyor (kartın etiketi `1/1`). Eşleştirme doğası gereği bir
tahta olduğu için (en az üç çift) akışın ortasına tek parça giriyor.

Yön her zaman karışık; setup'taki yön seçimi maratonda kaldırıldı (seçtirip yok
saymak yanıltıcıydı).

### 12.5 Sınırsız soru

Soru sayısı satırı `5 · 10 · 15 · 20 · ∞` oldu ve maraton dahil bütün "soru sayısı
olan" modlarda görünüyor. `length = 0` sınırsız demek:

- Plan 10'luk bir parti kurar; parti bitince `advance()` yeni parti üretip listeye ekler.
- Başlıkta `n / ∞`, ilerleme çubuğu yok (payda yok).
- Tur kendiliğinden bitmez; çıkış sheet'inden özetlenir.

Maratonda `length` tek tek soruların sayısı; deste (4) ve eşleştirme (4) üstüne biner.

> Not: bu özellik ilk denemede **süre sınırı** olarak yanlış anlaşılıp yazıldı
> (`timeLimit`, 5/10/15 dk). Kullanıcı soru sayısını kastettiğini söyleyince süre
> özelliği tamamen geri alındı; hız turunun kendi 60 saniyesine dokunulmadı.

### 12.6 Menü ikonları

Beş menü ikonundan dördü yeniden çizildi (Ayarlar'a dokunulmadı):

| Menü | Önce | Sonra |
| --- | --- | --- |
| Yol | üç eşmerkezli halka (18 px'te leke) | iki halka + göz |
| Pratik | dört kare (ayırt edilemiyordu) | dambıl |
| İstatistik | 22'ye taşan çubuklar + taban | üç çubuk + taban, 24 kutusunda |
| Sözlük | çift eğri ("W" gibi) | defter |

### 12.7 Sheet: kaydırma çubuğu yanıp sönmesi

`Sheet` her açılışta `document.body.style.overflow = 'hidden'` yapıp kapanışta geri
alıyordu. Bu, sayfanın kaydırma çubuğunu yok edip geri getiriyordu: her sheet
açılış/kapanışında sağ kenarda çubuk yanıp sönüyordu. Kilit artık overflow'a
dokunmuyor; modal açıkken `wheel` / `touchmove` yutuluyor (sheet gövdesi gerçekten
kaydırılabiliyorsa serbest). Sayfa konumu da korunuyor.

### 12.8 Küçük mantık düzeltmeleri

- Çıkış sheet'i 0 cevapta "tur özetlenir" diyordu ama `finish()` ana sayfaya atıyordu;
  metin ve düğme artık "bu tur kaydedilmez / Çık".
- Hız turundaki süre etiketi gömülü `sn` yerine sözlükten geliyor.
- `pool = words.length >= 8 ? words : words` (iki dalı aynı) ve kullanılmayan
  `stepLabel` silindi.
- Bölüm 1 her zaman aynı 15 kelimeyi öğretiyor (müfredat); ama sunum sırası sabit
  tohum yüzünden donmuştu, artık her açılışta değişiyor.
- Tipografi: `--fs-xs` 12→13, `--fs-sm` 13→14 px; sheet metni 12 → 14 px.
- Pasif düğme: %42 saydamlık koyu dolgulu düğmeyi çamurumsu bir bloğa çeviriyordu;
  artık düz kâğıt yüzey, soluk yazı, gölge yok.

### 12.9 Doğrulama

Playwright ile üretim derlemesi üzerinde ölçüldü.

**Basış geometrisi** (`CSS.forcePseudoState` ile `:active` zorlanarak; `dy` dikey,
`dw` genişlik, `dh` yükseklik değişimi):

| Öğe | dy | dw | dh |
| --- | --- | --- | --- |
| Başla (sheet, 340 px) | 1 px | 0 | 0 |
| Çip | 1 px | 0 | 0 |
| Segment | 1 px | 0 | 0 |
| İkon düğmesi | 1 px | 0 | 0 |
| Şalter | 1 px | 0 | 0 (topuz 20 → 20 px) |

Ölçek kaldırılmadan önce aynı düğmede `dw` ≈ −4 px, `dh` ≈ −0,5 px çıkıyordu; yazı
ortada durduğu için "düğme göçtü, yazı inmedi" hissi buradan geliyordu.

**Diğer ölçümler:** kart basışı 0 px kayma, tüm hover kaymaları 0 px, dinleme
tıklaması ~300 ms'de ses, maraton akışı `test → dinleme → yazma → kart (1/1) → test
→ dinleme → eşleştirme` (toplam adım = seçilen sayı + 1), sınırsız turda 13. soru
geldi, 5'lik tur özetle kapandı, tüm rotalar hatasız.

### 12.10 Anlam kısaltmada parantez hatası

Seçeneklerden biri "(suç" olarak görünüyordu. Sebep `promptSense`: ilk anlamı ilk
virgülden bölüyordu, ama bazı kayıtlarda virgül parantezin **içinde**:

```
commit   1. (suç, intihar vb.) işlemek/etmek 2. kendini adamak
```

Yeni kural üç adım:

1. Baştaki parantezli nitelik atılır — seçenek olarak anlamsız.
2. Parantez içindeki virgül/noktalı virgül bölmeye katılmaz (geçici olarak maskelenir).
3. Kalan baştaki noktalama temizlenir; `-den` gibi ek işaretleri ve `âlim` gibi
   harfler korunur (Unicode sınıfıyla, `\w` listesiyle değil).

| Kelime | Önce | Sonra |
| --- | --- | --- |
| commit | `(suç` | işlemek/etmek |
| recruit | `(işe` | almak |
| twist | `(yol` | kıvrılma |
| blush | `(utançından) kızarmak` | kızarmak |
| circulate | `(vücuttaki kan vb.) dolaş(tır)mak` | dolaş(tır)mak |
| scholar | âlim | âlim |
| precede | -den önce gelmek/olmak | -den önce gelmek/olmak |

1200 kelimenin tamamı derlenmiş fonksiyonla tarandı: başında/tek başına parantez
kalan **0** kayıt. Arayüzde 30 soru gezip 49 metin tarandı, parantez sorunu yok.

---

## 13. Dokuzuncu tur: kapsamlı hata ayıklama (20 Ekim 2026)

Bu turda yeni özellik eklenmedi; uygulama baştan sona tarandı. Yöntem üç katmanlıydı:
derleme (`tsc -b` + `vite build` + `postbuild`), tarayıcıda uçtan uca senaryolar
(Playwright, 49 kontrol) ve saf mantık simülasyonu (150 bölümün baştan sona
oynanması). Bulunan yedi hata aşağıda.

### 13.1 Bölüm sonucu yanlış oturuma yazılabiliyordu

En ciddi hata. `campaign.ts` içindeki `active` işareti "hangi bölüm oynanıyor"
bilgisini taşıyor. `Session.finish()` bu işareti **moda bakmadan** okuyordu.

Senaryo: bölümü aç, bir-iki cevap ver, tarayıcı geri tuşuyla çık (bitirme
ekranı çalışmaz, işaret silinmez), sonra Sözlük/İstatistik ekranındaki
"Doğrudan çalış" bağlantısıyla normal bir test turu yap. Tur bitince
`finish()` işareti görüyor, test turunun doğruluğunu o bölüme yazıyor:
**hiç oynanmamış bölüm 3 yıldız alıp yol haritasını atlatıyordu.**

Düzeltme iki taraflı:

- `finish()` sonucu yalnızca `mode === 'level'` ise yazar, işareti her durumda temizler.
- Bölüm dışı bir tur açılırken işaret baştan temizlenir (`Session` açılışı).

### 13.2 Çevrimdışı mod pratikte çalışmıyordu

`sw.js` üretimde `caches.match(req)` ile arıyordu. Sunucular JS/CSS yanıtlarına
`Vary: Accept-Encoding` (GitHub Pages/Fastly) veya `Vary: Origin` (vite preview)
ekliyor. Önbelleğe alınan istek ile sayfanın gönderdiği istek bu başlıkta
eşleşmediği için arama boş dönüyor, ağ da yoksa `Response.error()` üretiliyordu:
**uçak modunda uygulama boot perdesinde kalıyordu.**

Düzeltme: `caches.match(r, { ignoreVary: true })`. Varlık adları içerik karması
taşıdığı için Vary'yi yok saymak güvenli.

Ayrıca önbellek sürümü dosya **boyutundan** üretiliyordu; aynı uzunlukta kalan
bir değişiklik sürümü hiç değiştirmiyordu. Artık içerik SHA-256'sı kullanılıyor.

### 13.3 Bölümü açıp çıkmak yeni kelimeleri "görüldü" işaretliyordu

`markLevelSeen` bölüm açılırken bütün kelimeleri soğuma takvimine yazıyordu.
Hiç cevap vermeden çıkan kullanıcının yeni kelimeleri `progress`'e giriyor,
bir daha "yeni" havuzundan seçilmiyor; ileride tanımadığı hâlde tekrar sorusu
olarak çıkıyordu. İşaret artık **cevapla birlikte** (`recordAnswer` içinde)
konuyor. Yenileme davranışı değişmedi: bölümün kendi işaretleri seçimden
dışlandığı için aynı kelime kümesi geliyor.

### 13.4 İkinci bölüm 10 soru açılıyordu

1. bölümün kelimeleri henüz soğumadığı için 2. bölümde tekrar havuzu boş;
`selectLevel` boş havuzu doldurmayınca bölüm 10 soruyla açılıyordu (yol haritası
"15 soru" diyor). Tekrar yuvası tamamen boşken açık artık **yeni** havuzundan
kapatılıyor. Kelime tekrar sorusu gibi gösterilmediği için "görüldü" işaretlenme
sorunu da doğmuyor. Simülasyonda 150 bölümün tamamı 15–20 soru açılıyor.

### 13.5 Üretime tohum sayfası çıkıyordu

`public/__seed.html` (ekran görüntüsü için demo durumu yazan yardımcı) derlemeye
kopyalanıyor ve service worker tarafından önbelleğe alınıyordu. Adresi bilen bir
ziyaretçi açtığında localStorage'a demo durumu yazıp **kendi ilerlemesini
siliyordu**. Dosya yerelde kalıyor, `postbuild` onu çıktıdan ve önbellek
listesinden çıkarıyor.

### 13.6 Küçük düzeltmeler

| Yer | Sorun | Düzeltme |
| --- | --- | --- |
| Özet ekranı | Rozet adı her zaman Türkçe (`b.name`) | `badgeName(b, lang)` |
| `Ring` | `aria-label="Yüzde 45"` dilde sabit | `label` prop'u, varsayılan `45%` |
| `Sheet` | Kapat düğmesi etiketi "Kapat" sabit | `t('common.close')` |

### 13.7 Doğrulama

| Paket | Kapsam | Sonuç |
| --- | --- | --- |
| Derleme | `tsc -b`, `vite build`, `postbuild` | hatasız, sw.js 17 dosya |
| `_full_debug` | kurulum, 9 ekran × 2 dil, bölüm, 6 mod, yenileme, çıkış, klavye | 19/19 |
| `_edge_debug` | başarısız bölüm, tekrar oynama, işaretçi kırpma, kendi listesi, v2 yedeği, tavan, bölüm sızıntısı | 10/10 |
| `_fixes_debug` | bu turdaki düzeltmelerin tek tek karşılığı | 6/6 |
| `_logic_debug` | SRS vadeleri, seri, günlük sıfırlama, günün kelimesi, 320 px, bozuk yedek, sıfırlama, tema | 11/11 |
| `_offline_debug` | service worker + uçak modu + çevrimdışı gezinme | 3/3 |
| Simülasyon | 150 bölüm × 3 doğruluk profili × 3 zorluk | eksik bölüm 0, bölüm içi tekrar 0 |

### 13.8 Bu turda kapatılmayan

- **Bölüm sonu "Tekrar" düğmesi** özet ekranında bölüm modunda *sıradaki*
  bölümü açıyor (işaretçi ilerlemiş oluyor). "Devam" gibi davranıyor; yeniden
  oynamak için yol haritasından bölüme girmek gerekiyor.
- **Mükemmel tur bonusu (30 XP)** `finishSession` içinde ekleniyor ama oturum
  kaydındaki `xp` alanına yazılmıyor; özet ekranındaki "+XP" bu bonusu
  göstermiyor.
- **Zorluk "kolay" + sürekli eşiğin hemen üstünde biten turlar**: uyarlama
  bölüm başına yeni kelimeyi 6'ya indirdiğinde kampanya 191 bölümde 1200
  kelimenin ~%3'ünü hiç "yeni" olarak vermeyebilir. Ölçülen normal tempoda
  sorun yok; uç durum.

---

## 14. Onuncu tur: marka — "Adım" işareti (20 Ekim 2026)

Logo çalışması `logo-design` skill'inin süreciyle yapıldı: brif → kütüphane
araştırması → üç konsept (üç ayrı işaret tipi) → 256'lık ızgarada siyah SVG →
denetim ve önizleme → seçim → kit ve uygulama.

### 14.1 Seçilen yön

**Adım.** V'nin iki bacağı dikeyden 30° açılır (yatayla tam 60°), üç ucu da
yatay kesilir. Harf mürekkeple değil cetvelle çizilmiş gibi durur; kesik uçlar
basamak burnu gibi okunur — "kelime" (V) ve "adım" tek işarette. Elenen iki yön
`brand/archive/` içinde: **Basamak** (çizilmiş merdiven) ve **Kesik** (ortasından
cetvel çizgisi geçen V).

Neden bu: 16 px'te bozulmadan kalıyor, tek renkte hiçbir şey kaybetmiyor,
Bricolage'in harf yapısıyla aynı aileden ve üç yön içinde en "işaret" olanı.

### 14.2 Tek kaynak

`brand/` klasörü markanın tek kaynağı. `brand/build.py` (Python + fonttools)
şunları üretiyor: `symbol.svg`, `symbol-small.svg`, `tile.svg`, `favicon.svg`,
`wordmark.svg`, `tagline.svg`, `lockup-horizontal.svg`, `lockup-stacked.svg`.

**Wordmark artık metin değil.** Bricolage Grotesque'in değişken ekseni
(`wght 700, opsz 60`) örneklendirilip harf yolları çıkarıldı; harfbuzz ile
kerning'li dizildi. Böylece ne tarayıcı ne de baskı tarafında font kurulumu
gerekmiyor. Slogan da aynı yolla çıkarıldı (460 ağırlık).

Üretim tarafı bu tek kaynağı okuyor: `scripts/icons.mjs` ve `scripts/og.mjs`
`brand/symbol.svg` içindeki yolu doğrudan alıyor — ikinci bir kopya yok.

### 14.3 Sitedeki karşılığı

- **Kenar çubuğu / üst bar / kurulum:** ikon karosu (30 / 26 / 28 px) + wordmark.
  Karo, çıplak V ile "VocaStride" yan yana geldiğinde oluşan "VVocaStride"
  tekrarını önlüyor: işaret harf gibi değil, simge gibi okunuyor.
- `Logo` (çıplak işaret, `currentColor`) ve `LogoTile` (karo) bileşenleri
  `src/components/Logo.tsx` içinde; karo dolgusu `--accent`, içindeki V
  `--logo-ink` (= `--bg`). Koyu temada karo açık maviye, V koyuya döner —
  ayrı bir "gece logosu" yok.
- Favicon, 192/512 ikon, maskable, apple-touch ve `og.png` yeniden üretildi.

### 14.4 Doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `svg_audit.py symbol.svg` | 100/100, tek renk, gradyan yok, metin yok |
| `svg_audit.py tile.svg` | 99/100 (yalnız ölçek ondalığı bilgisi) |
| 16 px favicon | V ve karo okunuyor (`brand/renders/icon-sizes.png`) |
| Uygulama paketleri | 49/49 (full 19, edge 10, fixes 6, logic 11, offline 3) |
| Derleme | `tsc -b` + `vite build` + `postbuild` temiz |

### 14.5 Açık uçlar

Marka tescili taranmadı; CMYK/Pantone değerleri yaklaşık ve proof bekliyor.
Ayrıntı: `brand/README.md`.
