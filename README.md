# VocaStride

Aralıklı tekrar (Leitner) tabanlı, tamamen çevrimdışı çalışan kelime öğrenme uygulaması. Tek sayfalık statik uygulama; sunucu yok, veriler yalnızca cihazda kalır.


## Özellikler

### Çalışma Modları
- **Çoktan Seçmeli** — 4 şık; TR karşılık / Synonym / Ters (TR→EN) / Karışık yön
- **Hafıza Kartları** — çevir, hatırla, "Tekrar / Bildim" ile ilerle
- **Kelime Eşleştirme** — 5 kelime ↔ 5 anlam; hatasız tur = **+25 XP bonus**
- **Öğrenme / Göz At** — yeni kelimeleri sınav öncesi incele, "Öğrendim" ile SRS'ye al
- **Bugünkü Tekrarlar** — vadesi gelen kelimeler için ana menüden tek tık

### Öğrenme Motoru
- **Leitner aralıklı tekrar**: 5 kutu, aralıklar 1-2-4-8-16 gün
- Yanlış cevap kelimeyi 1. kutuya döndürür; doğrular yukarı taşır
- Kelime bazlı performans, ustalık seviyesi (0-5) sözlükte ve ısı haritasında görünür

### Motivasyon
- XP & seviye, kombo sistemi, streak (son 7 gün noktaları)
- **23 rozet** — ilerleme yüzdeleriyle
- Günlük hedef (10/20/30/50 + özel), konfeti, haptik titreşim, sakin mod

### Kelime Bilgisi (hover)
- Kelimenin üzerinde **5 saniye bekleyince** İngilizce anlamı + IPA okunuşu gösterir
- Bilgiler cihazda önbelleklenir (tekrar istek yok)
- Çevrimdışıyken sessizce çalışmayı durdurur

### Teknik
- **Tam çevrimdışı**: tüm CSS/JS/ikonlar/fontlar gömülü — CDN yok
- **Service worker** (`sw.js`): app-shell önbelleği, cache-first
- **PNG ikonlar** (192/512 + maskable) — iOS ana ekran uyumu
- 5 vurgu rengi × koyu/açık/otomatik tema
- Onboarding (ilk açılış: hedef + renk seçimi)
- İstatistik: 7/30 gün grafikleri, oturum geçmişi, ustalık ısı haritası, odak kelimeler → tek tıkla çalışma
- Sözlük: arama, tür filtresi (v/adj/n/adv), ustalık göstergesi, kelime bilgisi (hover)
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
