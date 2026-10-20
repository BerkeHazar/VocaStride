# Tasarım Sistemi — v4

VocaStride'ın görsel dili **kelime defteri** üzerine kurulu. Ürünün malzemesi kelime
olduğu için arayüzün malzemesi de kâğıt, mürekkep ve cetvel: süs yok, hiyerarşi
tipografiden, sayılar cetvelden gelir.

---

## 1. Yön ve gerekçe

| Soru | Cevap |
| --- | --- |
| Ürün ne? | Gençler için günlük İngilizce kelime çalışma aracı |
| Birincil iş | Her açılışta "bugün ne çalışacağım" sorusunu tek bakışta yanıtlamak |
| Metafor | Kelime defteri: satır, kenar çizgisi, kayıt, işaret |
| Malzeme | Kâğıt, mürekkep, cetvel, fosforlu kalem |
| Kaçınılan | Maskot, hero-metrik, eyebrow etiketi, kart kiti, cam efekti, gradyan, halka |

**Tek cesur öğe:** bugünün sırası. Sayfanın tek renkli yüzeyi orası; geri kalan her
şey (çizgi, boşluk, ölçek) onu taşımak için sakinleştirildi.

---

## 2. Renk

Renkler `src/styles/tokens.css` içinde. Koyu tema aynı değişkenleri yeniden atar.

### Açık tema

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--bg` | `#F2F2ED` | Sayfa zemini |
| `--surface` | `#FBFBF7` | Yükselen yüzey, düğme zemini |
| `--surface-2` | `#E9E9E2` | İkincil yüzey, çip zemini |
| `--ink` | `#15171A` | Metin, birincil düğme |
| `--ink-2` | `#4C4F53` | İkincil metin |
| `--ink-3` | `#6A6D71` | Üçüncül metin (AA) |
| `--line` | `#DCDCD2` | Ayırıcı |
| `--line-2` | `#C7C7BB` | Kontrol kenarı |
| `--accent` | `#1F3A6E` | Eylem, seçili durum, ilerleme |
| `--accent-soft` | `#E3E8F2` | Bugünün yüzeyi |
| `--mark` | `#E9D75F` | Seçim vurgusu |
| `--ok` | `#2C6B4F` | Doğru |
| `--danger` | `#A3382C` | Yanlış |

### Koyu tema

`--bg: #0F1012`, `--surface: #17181B`, `--ink: #F1F0E9`, `--accent: #9FB4E8`.
Vurgu açılır, `--accent-ink` koyulaşır; renkli zemin üzerindeki ikincil metin
her zaman zeminin tonuna çekilir (gri kullanılmaz).

### Vurgu seçenekleri

`data-accent="marker | pink | mint | sun"` → `--accent`, `--accent-soft`,
`--accent-ink`. Kimlik adları korunur, renkler yeniden yorumlanır: mürekkep
mavisi, erik, yosun, oker.

**Kural:** yeşil ve kırmızı yalnızca doğru/yanlış taşır; eylem rengi değildir.

---

## 3. Tipografi

| Rol | Font | Ağırlık | Not |
| --- | --- | --- | --- |
| Başlık / kelime | Bricolage Grotesque | 600–650 | `letter-spacing: -0.03em` |
| Arayüz | Instrument Sans | 450–620 | 15 px taban, 1.55 satır |
| IPA | Sistem serif yığını | 400 | Fonetik kapsama |

```
--fs-xs    12px    etiket, ipucu
--fs-sm    13px    yardımcı metin
--fs-base  15px    gövde
--fs-md    17px    vurgulu gövde
--fs-lg    20px    bölüm başlığı
--fs-2xl   clamp(1.7rem, 1.05rem + 2.4vw, 2.5rem)
--fs-3xl   clamp(2.15rem, 1.1rem + 4.2vw, 3.6rem)
```

**Ölçek dengesi:** en büyük başlık 2.9rem'i geçmez, en küçük etiket 11px'in altına
inmez. Aradaki fark iki uçta da bir tık kısıldı; sayfa tek bir tempoda okunuyor.

**Yapılmaması gerekenler:** tek kelimeyi renklendirmek, her başlığın üstüne etiket
koymak, 80 karakteri aşan satır, 11 px altı metin.

---

## 4. Biçim, gölge, boşluk

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--r-xs` | 5 px | küçük etiket, tuş |
| `--r-sm` | 7 px | çip, segment |
| `--r-md` | 10 px | düğme, input, seçenek |
| `--r-lg` | 13 px | mod satırı, panel |
| `--r-xl` | 17 px | kart, bugün paneli |
| `--r-2xl` | 22 px | sheet |

Gölge neredeyse yok: `--shadow-1` yalnızca kart yüzünde, `--shadow-3` sheet'te.
**Yükselti bir kez bildirilir** — kenarlık veya gölge, ikisi birden değil.

Boşluk 4'ün katları. Dokunma hedefi en az 38 px (birincil 44–52), kart iç boşluğu
14–20 px. Bitişik satırlar yerine ayrı yüzeyler tercih edilir: mod listesi 8 px
aralıklı ayrı düğmelerdir, tek bir tablo değil.

---

## 5. Düzen

### Mobil (< 1024 px)

- Üst bar 56 px + güvenli alan; alt dock 62 px + güvenli alan.
- Bugün paneli tam genişlik (negatif kenar boşluğu), üstünde 2 px vurgu çizgisi.
- Modlar tek sütun, ayrı düğmeler; odak listesi ve ritim çizgiyle ayrılır.
- Oturum ekranı tam ekran kabuktur: başlık sabit, gövde kayar, seçenekler
  başparmağın altında, geri bildirim çubuğu en altta.

### Masaüstü (≥ 1024 px)

- 236 px kenar çubuğu; içerik en fazla 1060 px.
- Ana ekran `1fr / 340px`: solda bugün + modlar + odak, sağda ritim/yük/meydan
  okuma/seviye. Sağ ray ince bir dikey çizgiyle ayrılır.
- Mod ızgarası 2 sütun; maraton tam satır.

### Oturum ekranı

- En fazla 820 px, `100dvh` yüksekliğinde sabit kabuk.
- Soru üstte ortalanır, seçenekler altta; cevaptan sonra geri bildirim çubuğu
  yapışkan olarak belirir.
- Kart modunda kart kalan yüksekliği doldurur; eşleştirmede karo ızgarası dikeyde
  ortalanır.

---

## 6. Hareket

Hareketin işi üç şey: **geri bildirim**, **yön duygusu**, **haz**.

| Bağlam | Süre | Eğri |
| --- | --- | --- |
| Düğme basma | 110 ms | `--ease-out` |
| Renk / zemin | 140–150 ms | `ease` |
| Seçenek girişi | 300 ms + 45 ms kademe | `--ease-out` |
| Doğru cevap | 380 ms | `--ease-spring` |
| Yanlış cevap | 340 ms sarsıntı | `--ease-out` |
| Eşleşme kilidi | 460 ms | `--ease-spring` |
| Kart çevirme | 500 ms | `--ease-in-out` |
| Adım geçişi | 260 ms | `--ease-out` |
| Sayfa geçişi | 220 ms | View Transition |
| İlerleme çubuğu | 480 ms | hafif yay |

**Kurallar**

- Yalnızca `transform`, `opacity`, `filter`; düzen tetikleyen özellik yok.
- Girişte `scale(0)` yok; en fazla `scale(.985)` + `opacity: 0`.
- Basış geri bildirimi `:active` ile, 110 ms; `translate: 0 1px` + `scale(.988)`.
  Küçülme %2'yi geçmez: daha büyüğü düğmeyi "bıngıldayan" bir nesne gibi gösteriyor.
- Hover yalnızca renk, çizgi ve gölge değiştirir; hiçbir yüzey imlecin altında yer
  değiştirmez (satır listelerinde komşuya geçerken ikisi birden oynuyordu).
- `role="button"` taşıyan büyük yüzeyler (çalışma kartı) basışta çökmez: kart bir
  düğme değil, bir sayfadır.
- Kademeli giriş `animation-fill-mode: backwards` ile — biten animasyon `:active`
  dönüşümünü ezmez.
- `prefers-reduced-motion` ve Sakin mod: süre **ve gecikme** sıfırlanır.
- Klavye ile tetiklenen işlemlerde animasyon yok.

**Oyun hissi veren anlar**

1. **Doğru cevap** — seçenek bir kez nefes alır (`scale 1.028`), zemini yeşile
   döner, onay işareti yayla belirir.
2. **Eşleşme kilidi** — karo nabız atar, çevresinde halka açılır, köşesine onay
   düşer. Eşleştirmenin ödülü burada.
3. **Seri** — 3/5/8/12/20'de kısa bir etiket uçar; her doğruda değil.

---

## 7. Bileşen envanteri

| Bileşen | Sınıf | Not |
| --- | --- | --- |
| Buton | `.btn`, `.btn-primary`, `.btn-accent`, `.btn-soft`, `.btn-ghost` | 44 px, 1 px çizgi, basış 0.988 + 1 px çökme |
| Mod satırı | `.mode-row` | Ayrı yüzey, tonlu ikon, 64 px |
| Bugün paneli | `.today` | Vurgulu zemin, 2 px üst çizgi |
| Çip | `.chip` | 40 px, `aria-pressed` |
| Segment | `.seg` | 3–4 seçenek, mürekkep aktif |
| Seçenek | `.q-opt` | 58 px, tuş rozeti, kademeli giriş |
| Kart | `.flip` | 3D çevirme, sürükleme, gölge yükselir |
| Eşleştirme karosu | `.match-tile` | Kilit animasyonu + onay |
| Sheet | `.sheet` | Alttan, sürükleyerek kapanır |
| Bildirim | `.toast` | 3 sn; oturum sırasında rozet bildirimi susturulur |

---

## 8. Erişilebilirlik

- [x] Tüm ikon düğmelerinin erişilebilir adı var.
- [x] `:focus-visible` 2 px vurgu halkası, 2 px ofset.
- [x] "İçeriğe geç" bağlantısı; `lang` özniteliği seçilen dile göre.
- [x] Doğru/yanlış geri bildirimi `aria-live="polite"`.
- [x] Sheet: `role="dialog"`, `aria-modal`, Escape, gövde kaydırma kilidi.
- [x] Renk tek başına anlam taşımıyor: ikon ve metin de var.
- [x] `prefers-reduced-motion` + uygulama içi Sakin mod.
- [x] Form alanları 16 px; dokunma hedefleri ≥ 38 px.
- [ ] Tam ekran okuyucu turu (NVDA/VoiceOver) — fiziksel cihazda yapılacak.

---

## 9. Yap / Yapma

| Yap | Yapma |
| --- | --- |
| Bir ekranda tek odak, tek renkli yüzey | Her bölümü ayrı renkle işaretlemek |
| 1 px çizgi, gölge yerine boşluk | Kenarlık + gölge (hayalet kart) |
| Kademeli, kısa giriş | Her bölümde ayrı efekt |
| Basışta 110 ms geri bildirim | Animasyonsuz düğme |
| Ayrı, nefes alan yüzeyler | Birbirine yapışık satır yığını |
| Sade Türkçe/İngilizce, eylem odaklı | "Harika!", "Muhteşem!" gibi şişirilmiş dil |
| Rastgele, taze kelime sırası | Her turda aynı alfabetik deste |
