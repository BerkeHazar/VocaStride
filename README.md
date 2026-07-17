# VocaStride

Kelime öğrenmeyi alışkanlık haline getirmek için tasarlanmış, tarayıcı tabanlı bir çalışma aracı. Tek bir HTML dosyasıyla çalışır, sunucu gerektirmez, tüm veriler cihazınızda kalır.

**AI desteğiyle geliştirilmiştir** — tasarım, mimari ve kod üretim sürecinde yapay zekâ araçlarından yararlanılmıştır.


## Özellikler

### Çalışma Modları
- **Çoktan Seçmeli** — 4 şık arasından doğru cevabı seç
- **Hafıza Kartları** — Kartı çevirerek hatırla, biliyorsan ilerle
- **Yazarak Öğren** — Cevabı klavyeden yaz, aktif hatırlamayı güçlendir

### Öğrenme Sistemi
- Spaced Repetition (aralıklı tekrar) algoritması
- Yanlış bilinen kelimeler daha sık karşına çıkar
- Kelime bazlı performans takibi
- Takip listesi ile hatalı cevapların anlık kaydı

### Motivasyon
- XP ve seviye sistemi
- Günlük hedef (20 kelime/gün)
- Streak takibi (ardışık gün sayacı)
- Kombo sistemi ve animasyonlu geri bildirimler
- 15 farklı rozet / başarım

### Teknik
- Tek HTML dosyası, bağımlılık yok
- Tüm veriler `localStorage`'da saklanır
- PWA desteği — ana ekrana eklenebilir, çevrimdışı çalışır
- Otomatik koyu/açık tema (manuel seçim de var)
- Mobil uyumlu (responsive), dokunmatik optimize
- Klavye kısayolları (masaüstünde)
- JSON ile veri yedekleme ve geri yükleme (export/import)
- Ses efektleri (Web Audio API)

---

## Kullanım

### Doğrudan Tarayıcıda
1. `index.html` dosyasını indirin
2. Tarayıcıda açın
3. Çalışmaya başlayın

### PWA Olarak Yükleme
Dosyayı bir web sunucusuna yükleyin (GitHub Pages, Netlify vb.) ve:

- **iPhone:** Safari → Paylaş → Ana Ekrana Ekle
- **Android:** Chrome → Menü → Ana Ekrana Ekle
- **PC:** Chrome → Adres çubuğundaki yükle ikonu

### GitHub Pages ile Yayınlama
1. Bu repoyu fork edin veya dosyayı kendi reponuza ekleyin
2. Settings → Pages → Branch: `main`, Folder: `/`
3. Birkaç dakika içinde `https://kullaniciadi.github.io/repo-adi/` adresinde yayında

---

## Kelime Listesini Düzenleme

Uygulama içindeki ⚙️ ayar panelinden kelimelerinizi düzenleyebilirsiniz.

Her satır şu formatta olmalı:

```
"kelime (tür)", "synonym", "Türkçe karşılık"
```

Örnek:
```
"abandon (v)", "leave", "terk etmek"  
"bold (adj)", "brave", "cesur"
```

Minimum 4 kelime gereklidir.

---

## Klavye Kısayolları

| Kısayol | İşlev |
|---------|-------|
| `1` `2` `3` `4` | Şık seçme (test modu) |
| `Enter` | Sonraki soru / Cevabı kontrol et |
| `Space` | Kartı çevir (flashcard modu) |
| `←` `→` | Bilmiyorum / Bildim (flashcard) |

> Kısayollar yalnızca masaüstünde aktiftir, mobilde görünmez.

---

## Veri Yedekleme

- **Export:** Ayar panelinden JSON olarak indirin
- **Import:** Daha önce aldığınız yedeği geri yükleyin

Yedek dosyası kelime listesini, performans verilerini, XP/seviye bilgisini, streak ve rozetleri içerir.

---

## Teknolojiler

- Vanilla HTML, CSS, JavaScript
- [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)
- [Font Awesome 6](https://fontawesome.com/) (ikonlar)
- Web Audio API (ses efektleri)
- PWA (manifest + service worker)

---

## Lisans

MIT

---

<p align="center">
  <em>AI desteğiyle geliştirilmiştir.</em>
</p>