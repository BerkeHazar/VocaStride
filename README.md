# VocaStride

VocaStride, kelime öğrenmeyi alışkanlık haline getirmek için tasarlanmış, tarayıcı tabanlı bir çalışma aracı. Sunucu gerektirmez, tüm veriler cihazınızda kalır.


# Özellikler

### Çalışma Modları
- **Çoktan Seçmeli** — 4 şık; TR karşılık / Synonym / Ters (TR→EN) / Karışık yön; kaynak: tümü / zayıf / tekrar / yeni
- **Hafıza Kartları** — çevir, hatırla, "Tekrar / Bildim" ile ilerle
- **Kelime Eşleştirme** — 5 kelime ↔ 5 anlam; hatasız tur = **+25 XP bonus**
- **Maraton** — üç modu tek oturumda karışık sırayla
- **Bugünkü Tekrarlar** — vadesi gelen kelimeler için ana menüden tek tık
- **Günlük Meydan Okuma** — günde bir kelime, doğru yaparsan 2x XP

### Öğrenme Motoru
- **Leitner aralıklı tekrar**: 5 kutu, aralıklar 1-2-4-8-16 gün
- Yanlış cevap kelimeyi 1. kutuya döndürür; doğrular yukarı taşır
- Kelime bazlı performans, ustalık seviyesi (0-5) sözlükte ve ısı haritasında görünür

### Motivasyon
- XP & seviye, kombo sistemi, streak (son 7 gün noktaları)
- **23 rozet** — ilerleme yüzdeleriyle
- Günlük hedef (10/20/30/50 + özel), konfeti, haptik titreşim, sakin mod
- **Kendi rekorunla yarış** — en iyi oturum takibi, yeni rekor kutlaması
- **Başarı ekranları** — oturum sonunda skora göre konfeti / teşvik kartı
- **Skor kartı paylaşımı** — oturum sonucunu PNG olarak paylaş/indir

### Kelime Bilgisi (isteğe bağlı)
- İlk açılışta ve ayarlardan aç/kapa
- Kelimeye **dokununca** IPA okunuşu + İngilizce tanım
- Varsayılan 1200 kelime için bilgiler sitede gömülü — internet gerekmez
- Kendi listenizi kaydederken anlamları indirmeyi seçebilirsiniz
- Kendi hatırlatıcı notunu ekleyebilirsin (sözlükten)

### Teknik
- **Tam çevrimdışı**: tüm CSS/JS/ikonlar/fontlar gömülü — CDN yok
- **Service worker** (`sw.js`): app-shell önbelleği, cache-first
- **PNG ikonlar** (192/512 + maskable) — iOS ana ekran uyumu
- 5 vurgu rengi × koyu/açık/otomatik tema
- Onboarding (ilk açılış: hedef + renk + kelime bilgisi)
- Listeler: varsayılan kilitli; kendi listenle geçiş (Ayarlar)
- Otomatik tema sistem açık/koyu tercihine uyar
- İstatistik: **haftalık özet**, **çalışma takvimi** (GitHub tarzı), 7/30 gün grafikleri, oturum geçmişi, ustalık ısı haritası, odak kelimeler, en iyi oturum
- Sözlük: arama, tür filtresi (v/adj/n/adv), **durum filtresi** (öğrenilen/zayıf), ustalık göstergesi, kişisel not, **IPA rehberi**, kelime bilgisi (hover)
- Klavye kısayolları, erişilebilirlik (yakınlaştırma, focus, reduced-motion)
- JSON yedekleme / geri yükleme

## Kullanım

1. `index.html` dosyasını indir ve tarayıcıda aç (veya HTTPS üzerinden yayınla)
2. Çalışmaya başla — tüm veriler cihazında kalır

## PWA Yükleme

HTTPS üzerinden açıp tarayıcının "Uygulamayı yükle" akışını kullan (Android/PC: adres çubuğu yükle ikonu; iPhone: Paylaş → Ana Ekrana Ekle). İnternetsiz de çalışır.

## Klavye Kısayolları

| Tuş | İşlev |
|---|---|
| `1-4` | Şık seç (test) |
| `Enter` | Sonraki soru |
| `Boşluk` | Kartı çevir |
| `←` / `→` | Kartta Tekrar / Bildim |
| `R` | Eşleştirmede yeni set |

## Veri

- Tüm veri `localStorage`'da `vs:*` anahtarları altında.
- Yedek: Ayarlar → Yedekle (JSON); Geri Yükle ile geri alınır.

---

*AI desteğiyle geliştirilmiştir — tasarım, mimari ve kod üretim sürecinde yapay zekâ araçlarından yararlanılmıştır.*
