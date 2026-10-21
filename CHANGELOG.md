# Değişiklik günlüğü

Biçim: [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) · Sürümleme: [SemVer](https://semver.org/lang/tr/).

## [2.3.2] — 2026-10-21

### Düzeltildi

- **Bölümün ilk dinleme sorusunda ses çalmıyordu.** İlk soru sessiz kalıyor,
  sonrakiler çalıyordu. Üç neden üst üste geliyordu: her okumada yeni bir ses
  öğesi kuruluyordu (mobil tarayıcılar, özellikle iOS, bunu engelliyor), oturum
  açılışındaki ön hazırlık ilk altı adımı kapsadığı için dinleme kelimelerini
  hiç hazırlamıyordu ve otomatik okuma arka plan kuyruğunda bekliyordu. Ses
  öğesi artık tek ve ilk dokunuşta açılıyor; ön hazırlık dinleme kelimeleriyle
  başlıyor; otomatik okuma acil sırada gidiyor. Ağdan geç gelen ses de yeni bir
  okumayı kesmiyor.
- **Ayarlar → Hakkında** güncel sürümü göstermiyordu (derlemeye 2.3.0
  gömülüydü).

## [2.3.1] — 2026-10-21

### Değişti

- **Logo vurgu rengini izler.** Karo ve wordmark artık `--accent` kullanıyor;
  ayarlarda vurgu değişince logo da değişiyor. Açılış ekranı aynı rengi izler.

## [2.3.0] — 2026-10-21

### Eklendi

- **Bölümlerde "dinleyemiyorum"**: dinleme sorularında sesin altındaki bağlantı
  soruyu değerlendirmeden geçer. Ne doğru ne yanlış sayılır, XP verilmez, kelime
  tekrar kuyruğuna işlenmez; ileride yeniden karşına çıkar.
- **Her bölümde beş mod**: kart (3) → eşleştirme (3) → test → dinleme → yazma.
  Bölümler artık tek tip değil; boss'lar sınav karakterini koruyor.
- **Ayarlar → Hakkında**'da sürüm numarası (`package.json`'dan derlemede gömülür).

### Değişti

- **Kart çevirme animasyonu**: 3B `rotateY` yerine 2B kart kırılması — kart
  kenarına kadar yassılıyor (170 ms), sonra diğer yüz açılıyor (180 ms).
  Perspektif ve 3B katman yok; mobilde raster yükü kalmadı.
- **Ana ekran ikonu**: V karonun %50'sine indirildi (uygulama içi %55, sekme
  ikonu %60). İkon tek başına durduğunda karo fazla doluydu.
- **Alt gezinme**: sekmeye dokununca düğme basılmış gibi 1 px göçmüyor.

### Düzeltildi

- Sonraki karta geçerken yeni kelimenin **arka yüzü görünüyordu**.
- `var(--ease-in)` tanımlı değildi; çevirme animasyonu hiç oynamıyordu.
- Kart çevrilirken ortada **dikey çubuk** kalıyordu (uç nokta `scaleX(0)`).
- Kısa ekranlarda cevap açıklaması gövdeyi taşırıp **kaydırma çubuğu**
  çıkarıyordu; 375×667'de taşma 29 px → 0, cevap şeridi yapışkan.
- Bölüm sonucu: dinleme atlayan biri %100 doğrulukla bile bölümü geçemiyordu.

### Performans

- Mobilde `backdrop-filter` (üst çubuk, dock, oturum başlığı, sheet perdesi)
  kapatıldı; çubuklar opak.
- Görünmeyen tam ekran kâğıt dokusu katmanı kaldırıldı.
- Kart sürükleme artık React state'i güncellemiyor (doğrudan DOM), dönüşüm
  3B sahnenin dışındaki kabuğa uygulanıyor.
- Hız turu sayacı aynı saniyeyi tekrar yazmıyor; kampanya planı önbelleğe alındı.

## [2.2.0] — 2026-10-20

- Marka tek kaynağa taşındı (`brand/mark.json`): kenar çubuğu, üst bar, kurulum,
  açılış ekranı, paylaşım kartı, og görseli ve ikonlar aynı geometriyi kullanıyor.
- Logo karoda ortalandı (optik merkez 131/256, V %55), wordmark harf yoluna çevrildi.
- PWA ikon seti yenilendi: tam kare apple-touch, maskable, 16/32 px favicon.
- README ve ekran görüntüleri yenilendi.
