# VocaStride

Aralıklı tekrar (Leitner) tabanlı, tamamen çevrimdışı çalışan kelime öğrenme uygulaması.
Tek sayfalık statik uygulama; sunucu yok, veriler yalnızca cihazda kalır.

**AI desteğiyle geliştirilmiştir** — tasarım, mimari ve kod üretim sürecinde yapay zekâ araçlarından yararlanılmıştır.

> **Kelime haznesi (400 kelime) kullanıcı kararıyla DEĞİŞTİRİLMEDİ.** Kaynak uygulamadan birebir aktarılmıştır (`src/js/words.js`).

## Özellikler

### Çalışma Modları
- **Çoktan Seçmeli** — 4 şık; TR karşılık / Synonym / Ters (TR→EN) / Karışık yön
- **Hafıza Kartları** — çevir, hatırla, "Tekrar / Bildim" ile ilerle
- **Kelime Eşleştirme** — 5 kelime ↔ 5 anlam; hatasız tur = **+25 XP bonus** (düzeltildi)
- **Öğrenme / Göz At** — yeni kelimeleri sınav öncesi incele, "Öğrendim" ile SRS'ye al
- **Bugünkü Tekrarlar** — vadesi gelen kelimeler için ana menüden tek tık

### Öğrenme Motoru (yeni)
- **Leitner aralıklı tekrar**: 5 kutu, aralıklar 1-2-4-8-16 gün
- Yanlış cevap kelimeyi 1. kutuya döndürür; doğrular yukarı taşır
- Kelime bazlı performans, ustalık seviyesi (0-5) sözlükte ve ısı haritasında görünür

### Motivasyon
- XP & seviye, kombo sistemi, streak (son 7 gün noktaları)
- **23 rozet** (mod bazlı, mükemmel gün, ustalık vb.) — ilerleme yüzdeleriyle
- Günlük hedef (10/20/30/50 + özel), konfeti, haptik titreşim, sakin mod

### Telaffuz (düzeltildi)
- Çok kaynaklı: Dictionary API → yerel sentez (speechSynthesis) yedeği
- Sesli/URL önbelleği: tekrar dinlemeler anında, çevrimdışında da çalışır
- Hız ayarı (Yavaş/Normal/Hızlı)

### Teknik
- **Tam çevrimdışı**: tüm CSS/JS/ikonlar/fontlar (Inter alt küme) gömülü — CDN yok
- **Gerçek service worker** (`sw.js`): app-shell önbelleği, cache-first
- **PNG ikonlar** (192/512 + maskable) — iOS ana ekran uyumu
- **Şema sürümleme + otomatik migration** (eski localStorage'dan taşır)
- 5 vurgu rengi × koyu/açık/otomatik tema
- Onboarding (ilk açılış: hedef + renk seçimi)
- İstatistik: 7/30 gün grafikleri, oturum geçmişi, ustalık ısı haritası, odak kelimeler → tek tıkla çalışma
- Sözlük: arama, tür filtresi (v/adj/n/adv), ustalık göstergesi, telaffuz
- Klavye kısayolları, erişilebilirlik (yakınlaştırma, focus, reduced-motion)
- JSON yedekleme / geri yükleme

## Yapı

```
vocastride/
├── build.py          # derleme: modüler kaynak → release/index.html
├── manifest.json     # PWA manifest
├── sw.js             # service worker
├── src/
│   ├── index.html    # iskelet (statik ekranlar)
│   ├── css/          # fonts, tokens, base, components, screens
│   └── js/           # modüler JS (icons, storage, words, srs, game, tts, ui, stats, panels, settings, session, main)
│       └── modes/    # quiz, flashcards, matching, learn
└── release/          # derleme çıktısı (yayınlamaya hazır tek dosya + varlıklar)
```

## Derleme

```bash
python3 build.py
```

Çıktı: `release/index.html` (her şey gömülü, ~300 KB), `release/manifest.json`, `release/sw.js`, `release/icons/*.png`.

## Yayınlama

Statik olduğu için herhangi bir yerde barındırılabilir (GitHub Pages, Netlify, klasör):

```bash
cd release
python3 -m http.server 8000
```

PWA yükleme: HTTPS üzerinden açılıp tarayıcının "Uygulamayı yükle" akışı ile.

## Veri

- Tüm veri `localStorage`'da `vs:*` anahtarları altında (şema v2).
- Eski sürüm anahtarları (`kelimeListesi` vb.) ilk açılışta otomatik taşınır; silinmez.
- Yedek: Ayarlar → Yedekle (JSON); Geri Yükle ile geri alınır.

## Kısayollar

| Tuş | İşlev |
|---|---|
| `1-4` | Şık seç (test) |
| `Enter` | Sonraki soru |
| `Boşluk` | Kartı çevir |
| `←` / `→` | Kartta Tekrar / Bildim |
| `R` | Eşleştirmede yeni set |
