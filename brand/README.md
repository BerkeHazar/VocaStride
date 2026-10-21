# VocaStride — marka kılavuzu

Bu klasör markanın tek kaynağı. `brand/build.py` hem SVG'leri hem de
`mark.json`'ı üretir; uygulama, ikonlar, paylaşım görseli ve açılış ekranı
**yalnızca** `mark.json`'daki sayıları okur. Elle çizilmiş ikinci bir kopya yok —
`npm run brand:check` bunu doğrular.

## 1. İşaret

- **Fikir:** V'nin iki bacağı dikeyden 30° açılır, üç ucu da yatay kesilir.
  Harf mürekkeple değil cetvelle çizilmiş gibi durur; kesik uçlar basamak
  burnu gibi okunur. "Kelime" (V) ile "adım" (basamak) tek işarette.
- **Tek çizim.** Favicon, uygulama ikonu, kenar çubuğu, paylaşım kartı ve
  16 px sekme simgesi aynı V'yi kullanır. Küçük boy için ayrı, kalınlaştırılmış
  bir çizim yok: karo V'yi %55'e ölçeklediği için 16 px'te bacak kalınlığı
  ~2,3 px kalıyor, ince düşmüyor.

## 2. Ölçü — tek oran

Bütün yüzeyler üç sayıdan türer (`mark.json`):

| Sayı | Değer | Anlamı |
| --- | --- | --- |
| `tile.markWidth` | **0,55** | V'nin genişliği / karo genişliği |
| `tile.markCenterY` | **131 / 256** | V'nin karo içindeki optik merkezi |
| `lockup.cap` | **0,55** | wordmark cap yüksekliği / karo |
| `lockup.gap` | **0,38** | karo ile wordmark arası boşluk / karo |

**Optik orta neden 131?** V'nin kütlesi üstte (alan merkezi y≈108). Geometrik
merkeze (128) oturduğunda göze yukarıda kalıyordu; 131'de üst boşluk 70, alt
boşluk 64 birim oluyor ve işaret ortalanmış görünüyor. Tersi yönde (124) yapılan
2 birimlik kaydırma sorunu büyütüyordu.

**Karo içinde V:** genişlik %55, yükseklik %47,6, yan boşluk 57,6 birim.
Eski %58 ölçek karoyu dolduruyor, V'nin uçları köşe yuvarlaklığına yaklaşıyordu.

**Uygulamadaki boylar** (`mark.json → ui`): kenar çubuğu 30 · kurulum 28 ·
üst bar 26 · açılış ekranı 44 px. Hepsi aynı lockup'ın ölçeklenmiş hâli.

**Optik ölçek (V'nin karo genişliğine oranı).** Tek çizim, üç boy:

| Yüzey | V | Neden |
| --- | --- | --- |
| Sekme ikonu (16–32 px) | %60 | 16 px'te bacaklar 2,3 px'e düşüp bulanıyordu |
| Ana ekran / PWA (180–512 px) | %50 | ikon tek başına duruyor, karo dolu ve ağır görünüyordu |
| Uygulama içi lockup | %55 | yazıyla yan yana dengeli |

Üçü de `scripts/icons.mjs` içinde `markWidth` olarak veriliyor; çizim aynı,
yalnızca ölçek değişiyor.

## 3. Dosyalar

| Dosya | Ne için |
| --- | --- |
| `mark.json` | **Tek kaynak.** Yollar + oranlar + renkler + UI boyları |
| `lockup.mjs` / `lockup.d.mts` | Geometri fonksiyonları (React, canvas, Node, vite aynı dosyayı kullanır) |
| `symbol.svg` | Çıplak işaret, tek renk (baskı, tek renk kullanım) |
| `tile.svg` | İkon karosu — uygulama ikonu, favicon, sosyal avatar |
| `wordmark.svg` | "VocaStride", harf yolları (metin değil), baseline y=200 |
| `lockup-horizontal.svg` / `lockup-stacked.svg` | Yatay / dikey lockup |
| `tagline.svg` | "Kelimeler birer adım." harf yolları (og görseli) |
| `archive/` | Elenen yönler, eski ikon seti, konsept betiği (depoda tutulur) |

Web ikon seti (`favicon.svg`, 192/512, maskable, apple-touch) `scripts/icons.mjs`
tarafından `tile.svg`'nin geometrisiyle üretilir ve `public/icons/` altında durur.
`archive/eski-ikonlar/` bu turda kaldırılan ikinci seti saklıyor.

## 4. Boş alan ve en küçük boy

- Çevrede **karo yüksekliğinin yarısı** kadar boşluk bırakılır. Boşluk logoyla
  birlikte ölçeklenir; sabit piksel değeri kullanılmaz. SVG dosyaları yalnızca
  8 birim nefes payı taşır, asıl boşluk kullanım kuralıdır.
- Yatay lockup en az **96 px** genişlik, işaret en az **16 px**, karo **16 px**.

## 5. Renk

| Ad | HEX | RGB | CMYK (yaklaşık) | Pantone |
| --- | --- | --- | --- | --- |
| Mürekkep | `#1B3A63` | 27 58 99 | 73 / 42 / 0 / 61 | 533 C |
| Kâğıt | `#F4F1E9` | 244 241 233 | 4 / 3 / 7 / 0 | Warm Gray 1 C |
| Oker | `#8A6114` | 138 97 20 | 33 / 53 / 100 / 27 | 1255 C |

**Yüzeylerde:**

| Tema | Karo | V | Wordmark |
| --- | --- | --- | --- |
| Açık | `--logo-mark` `#1B3A63` | `--logo-ink` = sayfa zemini | `--logo-word` `#1B3A63` |
| Koyu | `#A3B9E6` | sayfa zemini `#121110` | `#F3EFE4` |

Açık temada lockup tek renktir (mürekkep). Koyu temada karo açık maviye döner,
wordmark kâğıt olur — ayrı bir "gece logosu" yok. **Logo rengi vurgu ayarından
(`data-accent`) bağımsızdır:** kullanıcı arayüz vurgusunu değiştirdiğinde logo
değişmez.

**Onaylı eşleşmeler:** kâğıt üzerinde mürekkep · mürekkep üzerinde kâğıt ·
beyaz üzerinde siyah · siyah üzerinde beyaz. Fotoğraf üzerinde karo kullanılır.

## 6. Tipografi

- Wordmark: **Bricolage Grotesque 700**, `opsz 60`, izleme −%2, cap 120 birim.
  Harf yolları `wordmark.svg` / `mark.json` içinde hazır; hiçbir yüzeyde fontla
  yeniden dizilmez (açılış ekranı ve paylaşım kartı dahil).
- Arayüz: Bricolage Grotesque (başlık) + Instrument Sans (gövde).
- Lisans: SIL Open Font License 1.1.

## 7. Yapılmaz

- Germe/biçim bozma, döndürme, gölge-çizgi-gradyan ekleme.
- Palet dışına renklendirme (vurgu rengini logoya taşımak dahil).
- Lockup parçalarının yerini/boyutunu değiştirme; oranlar `mark.json`'dan gelir.
- Wordmark'ı fontla yeniden yazma.
- Karoyu saydam zeminde "beyaz V" olarak kullanma; karo dolgusu şart.
- V'yi karo içinde yeniden ortalama: optik merkez 131'dir.

## 8. Üretim

```bash
python brand/build.py     # SVG'ler + mark.json (fonttools + uharfbuzz)
node scripts/icons.mjs    # public/favicon.svg + ikon seti
node scripts/og.mjs       # public/og.png
npm run brand:check       # tutarlılık denetimi (SVG ↔ JSON ↔ açılış ekranı)
```

Açılış ekranının SVG'si `vite.config.ts` içindeki `brandBoot` eklentisiyle
`index.html`'e yazılır; kaynak yine `mark.json`.

## 9. Açık uçlar

- **Marka tescili** kontrolü yapılmadı; yayından önce marka veritabanı ve ters
  görsel araması önerilir.
- Baskı için CMYK/Pantone proof'u gerekli.
