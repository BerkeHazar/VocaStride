/**
 * Arayüz dili.
 *
 * Metinler tek bir yerde, `[türkçe, ingilizce]` çifti olarak durur. Böylece
 * bir anahtarın iki dilde birden var olması garanti; eksik çeviri derleme
 * anında değil, sözlüğü yazarken yakalanır.
 *
 * Dil, cihazın `navigator.language` değerinden tahmin edilir ve ilk kurulumda
 * kullanıcıya sorulur. Kelime verisi TR↔EN olduğu için içerik değişmez;
 * yalnızca arayüz dili değişir.
 */

export type Lang = 'tr' | 'en';

type Pair = readonly [string, string];

const S = {
  /* ------------------------------------------------------------- ortak */
  'app.name': ['VocaStride', 'VocaStride'],
  'app.skip': ['İçeriğe geç', 'Skip to content'],
  'app.offlineNote': [
    'Veriler cihazında kalır. Çevrimdışı çalışır.',
    'Data stays on your device. Works offline.',
  ],
  'app.source': ['Kaynak', 'Source'],
  'nav.label': ['Ana gezinme', 'Main navigation'],
  'nav.dock': ['Alt gezinme', 'Bottom navigation'],
  'nav.today': ['Bugün', 'Today'],
  'nav.path': ['Yol', 'Path'],
  'nav.practice': ['Pratik', 'Practice'],
  'path.title': ['Yol', 'Path'],
  'path.sub': ['{n} bölüm · {m} kelime', '{n} levels · {m} words'],
  'path.tier': ['Kademe {n}', 'Tier {n}'],
  'path.cleared': ['{n}/{m} bölüm', '{n}/{m} levels'],
  'path.next': ['Sıradaki bölüm', 'Next level'],
  'path.start': ['Başla', 'Start'],
  'path.continue': ['Devam et', 'Continue'],
  'path.locked': ['Kilitli', 'Locked'],
  'path.lockedHint': ['Önce {n}. bölümü bitir', 'Finish level {n} first'],
  'path.newWords': ['{n} yeni kelime', '{n} new words'],
  'path.review': ['{n} tekrar', '{n} reviews'],
  'path.questions': ['{n} soru', '{n} questions'],
  'path.pass': ['Geçme eşiği %{n}', 'Pass mark {n}%'],
  'path.adapted': [
    'doğruluğuna göre ayarlandı',
    'adjusted to your accuracy',
  ],
  'path.kind.mini': ['Ara sınav', 'Checkpoint'],
  'path.kind.hard': ['Büyük sınav', 'Major test'],
  'path.kind.final': ['Bitirme', 'Final test'],
  'path.kind.normal': ['Bölüm', 'Level'],
  'path.stars': ['{n}/3 yıldız', '{n}/3 stars'],
  'path.empty': ['Kampanya için en az 40 kelime gerekiyor', 'The path needs at least 40 words'],
  'path.emptyHint': [
    'Kendi listelerinle pratik modunda çalışabilirsin.',
    'Use practice mode with your own lists.',
  ],
  'path.overall': ['Genel ilerleme', 'Overall progress'],
  'path.tierProgress': ['Kademe ilerlemesi', 'Tier progress'],
  'path.badges': ['Rozetler', 'Badges'],
  'path.toPractice': ['Serbest çalış', 'Free practice'],
  'path.words': ['{n} kelime', '{n} words'],
  'path.modes': ['Modlar', 'Modes'],
  'mode.level': ['Bölüm', 'Level'],
  'set.listGuide': ['Kelimeler nasıl yerleşir?', 'How words are placed'],
  'set.listLevels': ['{n} bölüm', '{n} levels'],
  'set.listGuideFormat': [
    'Her satıra bir kelime. Zorunlu olan ikisi: kelime ve Türkçe karşılık. Tür ve eşanlamlı isteğe bağlı.',
    'One word per line. Word and Turkish meaning are required; type and synonym are optional.',
  ],
  'set.listGuideLevel': [
    'Kelime sırasını sen ayarlamıyorsun: uzunluğa, türetim ekine ve anlam sayısına göre kendiliğinden sıralanır. Zorluk seçimi bu sırayı değil, temponu belirler.',
    'You do not set the word order: words are ranked by length, suffix and number of senses. The difficulty you pick sets the pace, not the order.',
  ],
  'set.listGuideLevels': [
    '{n} kelime ≈ {m} bölüm. Her bölüm {f} yeni kelime alır ve 6 kademeye yayılır; her 10. bölüm ara sınav.',
    '{n} words ≈ {m} levels. Each level adds {f} new words across 6 tiers; every 10th level is a checkpoint.',
  ],
  'path.lbl.questions': ['soru', 'questions'],
  'path.lbl.new': ['yeni', 'new'],
  'path.lbl.review': ['tekrar', 'review'],
  'nav.stats': ['İstatistik', 'Stats'],
  'nav.badges': ['Rozetler', 'Badges'],
  'nav.dictionary': ['Sözlük', 'Dictionary'],
  'nav.settings': ['Ayarlar', 'Settings'],
  'theme.toDark': ['Gece moduna geç', 'Switch to dark mode'],
  'theme.toLight': ['Gündüz moduna geç', 'Switch to light mode'],
  'theme.darkOn': ['Gece modu açık', 'Dark mode on'],
  'theme.lightOn': ['Gündüz modu açık', 'Light mode on'],
  'level.short': ['Seviye {n}', 'Level {n}'],
  'level.xp': ['Seviye ilerlemesi', 'Level progress'],
  'common.close': ['Kapat', 'Close'],
  'common.back': ['Geri', 'Back'],
  'common.next': ['Sonraki', 'Next'],
  'common.finish': ['Bitir', 'Finish'],
  'common.start': ['Başla', 'Start'],
  'common.study': ['Çalış', 'Study'],
  'common.cancel': ['Vazgeç', 'Cancel'],
  'common.delete': ['Sil', 'Delete'],
  'common.save': ['Kaydet', 'Save'],
  'common.today': ['bugün', 'today'],
  'common.words': ['{n} kelime', '{n} {word}'],
  'common.min': ['dk', 'min'],
  'common.noData': ['Henüz veri yok', 'No data yet'],
  'common.error': ['Bir şeyler ters gitti', 'Something went wrong'],
  'common.reload': ['Yenile', 'Reload'],
  'common.errorText': [
    'Sayfayı yenilemeyi dene. İlerlemen cihazında güvende.',
    'Try reloading the page. Your progress is safe on this device.',
  ],

  /* ------------------------------------------------------------ ana ekran */
  'home.today': ['Bugün', 'Today'],
  'home.queue': ['Tekrar sırası', 'Review queue'],
  'home.queueMeta': ['{n} kelime · ~{m} dk', '{n} {word} · ~{m} min'],
  'home.more': ['{n} kelime daha', '{n} more'],
  'home.empty': [
    'Bugünlük tekrar yok. Taze bir tur atabilirsin.',
    'Nothing due today. You can still take a fresh round.',
  ],
  'home.startReview': ['Tekrara başla', 'Start review'],
  'home.startRound': ['Tura başla', 'Start a round'],
  'home.choose': ['Ayarları seç', 'Choose options'],
  'home.modes': ['Modlar', 'Modes'],
  'home.keys': ['Klavyeden 1–7', 'Keys 1–7'],
  'home.focus': ['Zorlandıkların', 'Trouble spots'],
  'home.focusEmpty': [
    'Henüz tekrarlayan bir hata yok. Dört kez yanlış giden kelimeler burada birikir.',
    'No repeated mistakes yet. Words you miss four times collect here.',
  ],
  'home.stubborn': ['inatçı', 'stubborn'],
  'home.box': ['kutu {n}', 'box {n}'],
  'home.misses': ['{n} hata', '{n} miss{es}'],
  'home.rhythm': ['Ritim', 'Rhythm'],
  'home.rhythmDays': ['{n}/{m} gün', '{n}/{m} days'],
  'home.rhythmDone': [
    'Bu haftanın hedefi tamam. Kalan günler bonus.',
    'This week’s target is met. The rest is bonus.',
  ],
  'home.rhythmLeft': [
    'Hedefe {n} gün kaldı. {m} gün içinde rahatça tutar.',
    '{n} more days to hit the target, with {m} days left.',
  ],
  'home.load': ['Yük', 'Load'],
  'load.over': [
    'Günde ~{n} tekrar birikecek. Yeni kelime hızını biraz düşürmek yükü dengeler.',
    'About {n} reviews a day will pile up. Slowing the intake of new words evens the load.',
  ],
  'load.near': [
    'Günde ~{n} tekrar. Hedefin {m}; ritmi buna göre ayarlayabilirsin.',
    'About {n} reviews a day. Your goal is {m}; tune the rhythm to match.',
  ],
  'home.loadPerDay': ['günde ~{n}', '~{n}/day'],
  'home.loadFallback': [
    '{n} kelime takipte. %{p} doğrulukla ilerliyorsun.',
    'Tracking {n} {word} at {p}% accuracy.',
  ],
  'home.goal': ['Günlük hedef', 'Daily goal'],
  'home.challenge': ['Günün kelimesi', 'Word of the day'],
  'home.challengeSub': ['Doğru bil, iki kat XP', 'Answer right, double XP'],
  'home.challengeDone': ['Bugün tamamlandı', 'Done for today'],
  'home.statsLine': ['{n} doğru cevap · {m} rozet', '{n} correct · {m} badges'],
  'home.installTitle': ['Ana ekrana ekle', 'Add to home screen'],
  'home.installSub': [
    'Çevrimdışı ve tam ekran çalışır.',
    'Works offline and full screen.',
  ],
  'home.install': ['Ekle', 'Add'],

  /* ---------------------------------------------------------------- modlar */
  'mode.quiz': ['Çoktan seçmeli', 'Multiple choice'],
  'mode.quizDesc': ['Dört seçenek, hızlı tur', 'Four options, quick round'],
  'mode.cards': ['Hafıza kartları', 'Flashcards'],
  'mode.cardsDesc': ['Çevir, hatırla, geç', 'Flip, recall, move on'],
  'mode.match': ['Eşleştirme', 'Matching'],
  'mode.matchDesc': ['Beş çifti eşle', 'Pair five couples'],
  'mode.speed': ['Hız turu', 'Speed round'],
  'mode.speedDesc': ['60 saniyede kaç kelime', 'How many in 60 seconds'],
  'mode.listen': ['Dinleme', 'Listening'],
  'mode.listenDesc': ['Duy, anla, seç', 'Hear it, know it, pick it'],
  'mode.type': ['Yazma', 'Typing'],
  'mode.typeDesc': ['Türkçesinden İngilizcesini yaz', 'Write the English from Turkish'],
  'mode.marathon': ['Maraton', 'Marathon'],
  'mode.marathonDesc': ['Beş mod, karışık tek tur', 'Five modes, one mixed run'],
  'mode.review': ['Tekrar', 'Review'],
  'mode.reviewDesc': ['Vadesi gelen kelimeler', 'Words that are due'],

  'setup.quiz': [
    'Dört seçenekten doğrusunu seç. Doğru cevap XP kazandırır, üst üste doğrular daha çok.',
    'Pick the right option. Correct answers earn XP; streaks earn more.',
  ],
  'setup.cards': [
    'Kartı çevir, kendini yargıla. Bilemediklerin öne çekilir.',
    'Flip the card and judge yourself. Missed words come back sooner.',
  ],
  'setup.match': [
    'Kelime ile anlamı eşleştir. Hatasız biten tur +25 XP verir.',
    'Match words with meanings. A flawless round is worth +25 XP.',
  ],
  'setup.speed': [
    '60 saniye, geniş havuz. Süre bitince tur kendiliğinden kapanır.',
    '60 seconds, wide pool. The round closes itself when time is up.',
  ],
  'setup.listen': [
    'Kelimeyi duy, anlamını seç. Ses Wikimedia Commons’tan gelir.',
    'Hear the word, pick the meaning. Audio comes from Wikimedia Commons.',
  ],
  'setup.type': [
    'Türkçesinden İngilizcesini yaz. Harf harf geri bildirim alırsın.',
    'Write the English for the Turkish. You get letter-by-letter feedback.',
  ],
  'setup.marathon': [
    'Test, dinleme, yazma, kart ve eşleştirme karışık gelir; yön de karışıktır.',
    'Test, listening, writing, cards and matching in mixed order, with mixed directions.',
  ],
  'setup.review': [
    'Vadesi gelen kelimeler. Kaçırdıkların on dakika sonra yeniden sorulur.',
    'Words that are due. Missed ones come back in ten minutes.',
  ],
  'setup.direction': ['Yön', 'Direction'],
  'setup.source': ['Kaynak', 'Source'],
  'setup.length': ['Soru sayısı', 'Questions'],
  'setup.noLimit': ['sınırsız', 'no limit'],
  'setup.smart': ['akıllı seçim', 'smart pick'],
  'setup.picked': ['seçili kaynak', 'chosen source'],
  'dir.mixed': ['Karışık', 'Mixed'],
  'dir.syn': ['Eşanlamlı', 'Synonym'],
  'src.smart': ['Akıllı', 'Smart'],
  'src.due': ['Tekrar', 'Due'],
  'src.weak': ['Zayıf', 'Weak'],
  'src.all': ['Tümü', 'All'],

  /* --------------------------------------------------------------- oturum */
  'session.exit': ['Oturumu bitir', 'End session'],
  'session.deck': ['deste {i} / {n}', 'deck {i} / {n}'],
  'session.round': ['tur {i} / {n}', 'round {i} / {n}'],
  'session.progress': ['Oturum ilerlemesi', 'Session progress'],
  'session.correct': ['{n} doğru · {m} yanlış', '{n} right · {m} wrong'],
  'session.combo': ['{n} seri', '{n} streak'],
  'session.comboLabel': ['seri', 'streak'],
  'session.keyHint': [
    '1–4 ile seç · Enter ile ilerle',
    'Press 1–4 to pick · Enter to continue',
  ],
  'session.hint': ['Klavyeden 1–4 ile seç', 'Press 1–4 to choose'],
  'session.right': ['Doğru', 'Correct'],
  'session.wrong': ['Doğrusu', 'Answer'],
  'session.replay': ['Kelimeyi yeniden dinle', 'Play the word again'],
  'session.listenTag': ['DİNLE', 'LISTEN'],
  // Dinleyemiyorum: soru değerlendirilmeden geçilir (Duolingo'daki gibi).
  'session.cantListen': ['Dinleyemiyorum', "I can't listen"],
  'session.credit': ['ses · Wikimedia Commons', 'audio · Wikimedia Commons'],
  'session.noWords': ['Bu kaynakta kelime kalmadı', 'No words left in this source'],
  'session.noWordsText': [
    'Seçtiğin kaynakta uygun kelime yok. Kaynağı değiştirip yeniden dene.',
    'This source has no suitable words. Change the source and try again.',
  ],
  'session.noDue': ['Bugün tekrar yok', 'Nothing due today'],
  'session.noDueText': [
    'Bugünün tekrarları tamam. Taze bir tur atabilirsin.',
    'Today’s reviews are done. You can take a fresh round.',
  ],
  'session.backToday': ['Bugüne dön', 'Back to today'],
  'session.deferred': [
    '{n} tekrar yarına bırakıldı. Turu kısa tutmak, borcu büyütmekten iyidir.',
    '{n} reviews moved to tomorrow. A short round beats a growing debt.',
  ],
  'session.quitTitle': ['Oturumu bitir?', 'End the session?'],
  'session.quitText': [
    '{n} doğru cevabın var. Bitirirsen tur özetlenir ve ilerlemen kaydedilir.',
    'You have {n} correct answers. Ending now still saves your progress.',
  ],
  /* Hiç cevap yokken özet de olmaz: metin ve düğme bunu dürüstçe söyler. */
  'session.quitEmpty': [
    'Henüz cevap vermedin. Çıkarsan bu tur kaydedilmez.',
    'You have not answered anything yet. Leaving discards this round.',
  ],
  'session.quitLeave': ['Çık', 'Leave'],
  'session.sec': ['{n} sn', '{n}s'],
  'session.quitConfirm': ['Bitir ve özetle', 'End and summarise'],
  'session.quitKeep': ['Devam et', 'Keep going'],
  'session.typeSub': [
    'İngilizcesini yaz. Büyük/küçük harf fark etmez.',
    'Write the English. Case does not matter.',
  ],
  'session.typePlaceholder': ['kelimeyi yaz', 'type the word'],
  'session.typeLabel': ['İngilizce karşılık', 'English answer'],
  'session.check': ['Kontrol et', 'Check'],
  'session.hintBtn': ['harf ipucu', 'letter hint'],
  'session.hintLabel': ['İpucu:', 'Hint:'],
  'session.listenAnswer': ['Doğru cevabı dinle', 'Listen to the answer'],
  'session.flip': ['çevirmek için dokun', 'tap to flip'],
  'session.cardFront': ['Kart. Çevirmek için dokun.', 'Card. Tap to flip.'],
  'session.cardBack': ['Kartın arkası. Çevirmek için dokun.', 'Back of the card. Tap to flip.'],
  'session.again': ['Tekrar', 'Again'],
  'session.know': ['Biliyorum', 'I know it'],
  'session.cardsNote': [
    'Boşluk çevirir · ← tekrar · → biliyorum · kartı sürükle',
    'Space flips · ← again · → know it · drag the card',
  ],
  'session.cardsFlipFirst': [
    'Önce kartı çevir: dokun ya da boşluğa bas',
    'Flip the card first: tap it or press space',
  ],
  'session.matchPerfect': [
    'Henüz hata yok. Hatasız bitir, +25 XP kazan.',
    'No mistakes yet. Finish clean for +25 XP.',
  ],
  'session.matchMisses': [
    '{n} hatalı deneme. Doğru çiftler kilitlenir.',
    '{n} wrong attempts. Correct pairs lock in.',
  ],
  'session.reviewFallback': ['yarına bırakıldı', 'moved to tomorrow'],

  /* ---------------------------------------------------------------- özet */
  'sum.perfect': ['Kusursuz tur.', 'Flawless round.'],
  'sum.almost': ['Neredeyse kusursuz.', 'Almost flawless.'],
  'sum.good': ['İyi iş.', 'Good work.'],
  'sum.ok': ['Fena değil.', 'Not bad.'],
  'sum.again': ['Bir daha bakalım.', 'Let’s look again.'],
  'sum.accuracy': ['Doğruluk', 'Accuracy'],
  'sum.right': ['Doğru', 'Right'],
  'sum.wrong': ['Yanlış', 'Wrong'],
  'sum.bestCombo': ['En uzun seri', 'Best streak'],
  'sum.time': ['Süre', 'Time'],
  'sum.newBest': ['Yeni rekor', 'New best'],
  'sum.perfectBonus': ['tam isabet +30', 'perfect +30'],
  'sum.newBadge': ['yeni rozet', 'new badge'],
  'sum.retry': ['Tekrar çalış', 'Study again'],
  'sum.wrongs': ['Yanlışları çalış ({n})', 'Study the misses ({n})'],
  'sum.share': ['Skor kartı', 'Score card'],
  'sum.shareTitle': ['Skor kartı', 'Score card'],
  'sum.shareAction': ['İndir / paylaş', 'Download / share'],
  'sum.preparing': ['Hazırlanıyor…', 'Preparing…'],
  'sum.shareAlt': ['VocaStride skor kartı önizlemesi', 'VocaStride score card preview'],
  'sum.downloaded': ['Kart indirildi', 'Card downloaded'],
  'sum.shared': ['Paylaşıldı', 'Shared'],
  'sum.shareFail': ['Kart oluşturulamadı', 'Could not build the card'],
  'sum.foot': [
    '{d} · Seviye {l} · {s} günlük seri',
    '{d} · Level {l} · {s} day streak',
  ],
  'sum.rightWrong': ['{c} doğru, {w} yanlış · {t}', '{c} right, {w} wrong · {t}'],

  /* ----------------------------------------------------------- istatistik */
  'stats.title': ['İstatistik', 'Stats'],
  'stats.sub': ['Ritmini gör, zayıf noktalarını yakala.', 'See your rhythm, catch your weak spots.'],
  'stats.range7': ['7 gün', '7 days'],
  'stats.range30': ['30 gün', '30 days'],
  'stats.range': ['Zaman aralığı', 'Time range'],
  'stats.emptyText': [
    'İlk turunu tamamladığında burada ritmin, ustalık dağılımın ve odak kelimelerin görünecek.',
    'After your first round this page shows your rhythm, mastery spread and focus words.',
  ],
  'stats.firstRound': ['İlk turu başlat', 'Start the first round'],
  'stats.answers': ['cevap · {n} gün', 'answers · {n} days'],
  'stats.accuracy': ['doğruluk', 'accuracy'],
  'stats.sessions': ['oturum', 'sessions'],
  'stats.studied': ['çalışma', 'studied'],
  'stats.daily': ['Günlük cevaplar', 'Answers per day'],
  'stats.max': ['en yüksek {n}', 'max {n}'],
  'stats.dailyAlt': ['Son {n} günün cevap grafiği', 'Answer chart for the last {n} days'],
  'stats.heat': ['Çalışma takvimi', 'Study calendar'],
  'stats.heatNote': ['son 6 ay', 'last 6 months'],
  'stats.less': ['az', 'less'],
  'stats.more': ['çok', 'more'],
  'stats.mastery': ['Ustalık dağılımı', 'Mastery spread'],
  'stats.masteredNote': ['{n} usta kelime', '{n} mastered'],
  'stats.box1': ['1. kutu', 'Box 1'],
  'stats.box2': ['2. kutu', 'Box 2'],
  'stats.box3': ['3. kutu', 'Box 3'],
  'stats.box4': ['4. kutu', 'Box 4'],
  'stats.mastered': ['Ustalaştı', 'Mastered'],
  'stats.newWords': ['Çalışılmadı', 'Untouched'],
  'stats.masteryNote': [
    '{n} kelime öğrenme sürecinde. Aralıklar doğru cevapla 1 → 16 güne kadar açılır.',
    '{n} {word} in progress. Intervals stretch from 1 to 16 days with correct answers.',
  ],
  'stats.masteryEmpty': [
    'İlk doğru cevabınla kelimeler kutulara yerleşmeye başlar.',
    'Your first correct answer starts sorting words into boxes.',
  ],
  'stats.focus': ['Odak kelimeler', 'Focus words'],
  'stats.focusNote': ['en çok zorlandıkların', 'your hardest words'],
  'stats.focusMeta': ['{n} hata · kutu {b}', '{n} miss{es} · box {b}'],
  'stats.unstudied': ['{n} kelime henüz çalışılmadı.', '{n} {word} not studied yet.'],
  'stats.focusEmpty': [
    'Henüz yanlışın yok. Bu bölüm zayıf kelimelerini burada toplar.',
    'No mistakes yet. This section collects your weak words.',
  ],
  'stats.bestSession': ['En iyi oturum', 'Best session'],
  'stats.noSessions': ['Henüz kayıtlı oturum yok.', 'No sessions recorded yet.'],
  'stats.recent': ['Son oturumlar', 'Recent sessions'],
  'stats.records': ['{n} kayıt', '{n} records'],
  'stats.foot': [
    'Toplam {n} doğru · {t} çalışma',
    '{n} correct in total · {t} studied',
  ],
  'stats.answersTitle': ['cevap', 'answers'],

  /* -------------------------------------------------------------- rozetler */
  'badges.title': ['Rozetler', 'Badges'],
  'badges.sub': [
    'Küçük kilometre taşları, kalıcı alışkanlıklar.',
    'Small milestones, lasting habits.',
  ],
  'badges.count': ['rozet', 'badges'],
  'badges.next': ['Sıradaki: {n} · %{p}', 'Next: {n} · {p}%'],
  'badges.all': ['Hepsini topladın.', 'You collected them all.'],
  'badges.earned': ['Kazanıldı', 'Earned'],
  'badges.progress': ['{n} / {m}', '{n} / {m}'],
  'badges.note': [
    'Rozetler yalnızca bu cihazda saklanır. Yedek almayı unutma.',
    'Badges live on this device only. Remember to back up.',
  ],
  'badges.progressLabel': ['{n} ilerlemesi', '{n} progress'],

  /* --------------------------------------------------------------- sözlük */
  'dict.title': ['Sözlük', 'Dictionary'],
  'dict.sub': [
    '{n} kelime · dokun, anlamını ve okunuşunu gör.',
    '{n} {word} · tap for meaning and pronunciation.',
  ],
  'dict.ipaGuide': ['IPA rehberi', 'IPA guide'],
  'dict.search': ['Kelime, anlam veya eşanlamlı ara', 'Search a word, meaning or synonym'],
  'dict.searchLabel': ['Sözlükte ara', 'Search the dictionary'],
  'dict.clear': ['Aramayı temizle', 'Clear search'],
  'dict.all': ['Hepsi', 'All'],
  'dict.type': ['Kelime türü', 'Part of speech'],
  'dict.status': ['Öğrenme durumu', 'Learning status'],
  'dict.sNew': ['Yeni', 'Untouched'],
  'dict.sLearning': ['Öğreniyorum', 'Learning'],
  'dict.sMastered': ['Ustalaştı', 'Mastered'],
  'dict.sWeak': ['Zayıf', 'Weak'],
  'dict.count': ['{n} kelime', '{n} {word}'],
  'dict.none': ['Eşleşen kelime yok', 'No matching words'],
  'dict.noneText': [
    'Farklı bir arama dene ya da filtreleri temizle. Bazen aradığın kelime başka bir kutuda saklanır.',
    'Try another search or clear the filters. Sometimes the word is hiding in another box.',
  ],
  'dict.clearFilters': ['Filtreleri temizle', 'Clear filters'],
  'dict.more': ['Daha fazla göster ({n})', 'Show more ({n})'],
  'dict.card': ['Kelime kartı', 'Word card'],
  'dict.studyWord': ['Bu kelimeyi çalış', 'Study this word'],
  'dict.listen': ['Dinle', 'Listen'],
  'dict.listenWord': ['Kelimeyi dinle', 'Listen to the word'],
  'dict.turkish': ['Türkçe', 'Turkish'],
  'dict.synonym': ['Eşanlamlı', 'Synonym'],
  'dict.definition': ['İngilizce tanım', 'English definition'],
  'dict.mastery': ['Ustalık', 'Mastery'],
  'dict.notStudied': ['Henüz çalışılmadı', 'Not studied yet'],
  'dict.okBad': ['{o} doğru · {b} yanlış', '{o} right · {b} wrong'],
  'dict.custom': ['özel kelime', 'custom word'],
  'dict.loading': ['yükleniyor…', 'loading…'],
  'dict.ipaOff': ['IPA kapalı', 'IPA off'],
  'dict.note': ['Kendi notun', 'Your note'],
  'dict.notePlaceholder': [
    'Hatırlatıcı bir cümle, benzetme ya da örnek…',
    'A reminder sentence, a comparison, an example…',
  ],
  'dict.saveNote': ['Notu kaydet', 'Save note'],
  'dict.noteSaved': ['Not kaydedildi', 'Note saved'],
  'dict.stubborn': ['inatçı', 'stubborn'],
  'dict.pronSearching': [
    'Wikimedia Commons’ta kayıt aranıyor',
    'Looking for a recording on Wikimedia Commons',
  ],
  'dict.pronDevice': ['Cihaz sesi kullanılıyor', 'Using the device voice'],
  'dict.ipaNote': [
    'İki nokta üst üste (ː) sesin uzadığını, vurgu işareti (ˈ) bir sonraki hecenin güçlü okunduğunu söyler.',
    'A length mark (ː) stretches the sound; the stress mark (ˈ) marks the strong syllable.',
  ],
  'dict.ipaSymbol': ['Sembol', 'Symbol'],
  'dict.ipaExample': ['Örnek', 'Example'],
  'dict.ipaTurkish': ['Türkçe yaklaşık', 'Turkish approximation'],
  'dict.ipaIntro': [
    'IPA, kelimenin nasıl okunduğunu gösterir. Aşağıdaki semboller İngilizcede en sık karşılaşacakların.',
    'IPA shows how a word is pronounced. These are the symbols you will meet most often.',
  ],

  /* --------------------------------------------------------------- ayarlar */
  'set.title': ['Ayarlar', 'Settings'],
  'set.sub': ['Her şey bu cihazda kalır.', 'Everything stays on this device.'],
  'set.appearance': ['Görünüm', 'Appearance'],
  'set.theme': ['Tema', 'Theme'],
  'set.themeDesc': ['Sistem seçeneği cihaz tercihine uyar.', 'System follows your device setting.'],
  'set.light': ['Gündüz', 'Light'],
  'set.dark': ['Gece', 'Dark'],
  'set.auto': ['Sistem', 'System'],
  'set.accent': ['Vurgu rengi', 'Accent colour'],
  'set.accentDesc': ['Butonlar, ilerleme ve seçili durumlar.', 'Buttons, progress and selected states.'],
  'set.calm': ['Sakin mod', 'Calm mode'],
  'set.calmDesc': ['Animasyonları ve konfeti kapatır.', 'Turns off animation and confetti.'],
  'set.study': ['Çalışma', 'Study'],
  'set.goal': ['Günlük hedef', 'Daily goal'],
  'set.goalDesc': ['Kaç cevap sonrası gün tamam sayılır?', 'How many answers complete a day?'],
  'set.answers': ['{n} cevap', '{n} answers'],
  'set.custom': ['özel', 'custom'],
  'set.apply': ['Uygula', 'Apply'],
  'set.goalRange': ['5 ile 200 arasında bir sayı gir', 'Enter a number between 5 and 200'],
  'set.goalSet': ['Hedef {n} cevap', 'Goal set to {n}'],
  'set.weekly': ['Haftalık ritim', 'Weekly rhythm'],
  'set.weeklyDesc': [
    'Seri değil, süreklilik. Haftada kaç gün çalışmak istiyorsun?',
    'Consistency, not streaks. How many days a week?',
  ],
  'set.days': ['{n} gün', '{n} days'],
  'set.cap': ['Tur başına tekrar tavanı', 'Reviews per round cap'],
  'set.capDesc': [
    'Biriken tekrarı tek turda bitirmeye çalışmak bıraktırır. Fazlası yarına kalır.',
    'Trying to clear a backlog in one round is how people quit. The rest waits for tomorrow.',
  ],
  'set.reviews': ['{n} tekrar', '{n} reviews'],
  'set.direction': ['Varsayılan yön', 'Default direction'],
  'set.directionDesc': ['Oturum başlarken kullanılır.', 'Used when a session starts.'],
  'set.source': ['Kelime kaynağı', 'Word source'],
  'set.sourceDesc': [
    'Akıllı seçim, tekrar zamanı gelenleri öne alır.',
    'Smart pick puts due words first.',
  ],
  'set.length': ['Tur uzunluğu', 'Round length'],
  'set.lengthDesc': ['Test ve kart modlarında kelime sayısı.', 'Words per round in test and cards.'],
  'set.pron': ['Telaffuz', 'Pronunciation'],
  'set.pronSource': ['Ses kaynağı', 'Audio source'],
  'set.pronDesc': [
    'Wikimedia Commons kayıtları gerçek konuşmacılardan gelir. Cihaz sesi çevrimdışı çalışır ama daha yapaydır.',
    'Wikimedia Commons recordings are real speakers. The device voice works offline but sounds synthetic.',
  ],
  'set.pronWikimedia': ['Wikimedia', 'Wikimedia'],
  'set.pronDevice': ['Cihaz', 'Device'],
  'set.pronTry': ['Dene', 'Try'],
  'set.pronTryDesc': [
    'Kayıt yoksa cihaz sesine düşer.',
    'Falls back to the device voice when no recording exists.',
  ],
  'set.pronTryDescDevice': [
    'Tarayıcının konuşma sentezi kullanılır.',
    'Uses the browser speech synthesiser.',
  ],
  'set.pronTryLabel': ['Örnek telaffuzu dinle', 'Play a sample pronunciation'],
  'set.experience': ['Deneyim', 'Experience'],
  'set.sfx': ['Ses efektleri', 'Sound effects'],
  'set.sfxDesc': ['Doğru/yanlış geri bildirimi için kısa tonlar.', 'Short tones for right/wrong feedback.'],
  'set.haptics': ['Titreşim', 'Haptics'],
  'set.hapticsDesc': ['Destekleyen cihazlarda dokunsal geri bildirim.', 'Touch feedback where supported.'],
  'set.dict': ['Kelime bilgisi', 'Word data'],
  'set.dictDesc': ['IPA okunuşu ve İngilizce tanım paketi.', 'IPA and English definitions pack.'],
  'set.lists': ['Listeler', 'Lists'],
  'set.core': ['VocaStride çekirdek', 'VocaStride core'],
  'set.coreMeta': ['1200 kelime · kilitli', '1200 words · locked'],
  'set.active': ['Aktif', 'Active'],
  'set.select': ['Seç', 'Select'],
  'set.newList': ['Yeni liste', 'New list'],
  'set.activeList': [
    'Aktif liste: {n} · {c} kelime',
    'Active list: {n} · {c} {word}',
  ],
  'set.listName': ['Liste adı', 'List name'],
  'set.listNamePlaceholder': ['Örn. YDS 2026', 'e.g. YDS 2026'],
  'set.listWords': ['Kelimeler', 'Words'],
  'set.listHint': [
    'Ayraç olarak | ; = veya - kullanabilirsin. Dört parça verirsen sırasıyla kelime, tür, eşanlamlı ve Türkçe karşılık okunur.',
    'Use | ; = or - as a separator. With four parts it reads word, type, synonym and Turkish meaning.',
  ],
  'set.listCreate': ['Listeyi oluştur', 'Create list'],
  'set.listDifficulty': ['Bu liste ne kadar zor?', 'How hard is this list?'],
  'set.diff.easy': ['Kolay', 'Easy'],
  'set.diff.normal': ['Orta', 'Standard'],
  'set.diff.hard': ['Zor', 'Hard'],
  'set.diffHint.easy': [
    'Bölüm başına 6 yeni kelime, bol tekrar. Kart ve test ağırlıklı, geçme eşiği 10 puan düşük.',
    '6 new words per level with plenty of review. Card and quiz heavy, pass mark 10 points lower.',
  ],
  'set.diffHint.normal': [
    'Bölüm başına 8 yeni kelime. Uygulamanın ölçülmüş dengesi: tanımadan üretime altı kademede geçiş.',
    '8 new words per level. The measured balance: recognition to production across six tiers.',
  ],
  'set.diffHint.hard': [
    'Bölüm başına 10 yeni kelime, yazma ve dinleme iki kademe erken başlar, geçme eşiği 10 puan yüksek.',
    '10 new words per level, writing and listening start two tiers earlier, pass mark 10 points higher.',
  ],
  'set.diffEdit': ['Zorluğu değiştir', 'Change difficulty'],
  'set.diffChanged': ['Zorluk: {d}', 'Difficulty: {d}'],
  'set.listNeedOne': ['En az bir kelime ekle', 'Add at least one word'],
  'set.listBadFormat': ['Kelimeler okunamadı, biçimi kontrol et', 'Could not read the words, check the format'],
  'set.listAdded': ['{n} kelime eklendi', '{n} words added'],
  'set.listDeleteTitle': ['Listeyi sil?', 'Delete the list?'],
  'set.listDeleteText': [
    'Liste ve içindeki kelimeler silinir. Bu kelimelerin tekrar geçmişi de kalkar.',
    'The list and its words are removed, including their review history.',
  ],
  'set.listDeleted': ['Liste silindi', 'List deleted'],
  'set.data': ['Veri', 'Data'],
  'set.backup': ['Yedek indir', 'Download backup'],
  'set.backupDesc': ['Tüm ilerleme tek JSON dosyasında.', 'All progress in one JSON file.'],
  'set.download': ['İndir', 'Download'],
  'set.backupDone': ['Yedek indirildi', 'Backup downloaded'],
  'set.restore': ['Yedekten geri yükle', 'Restore from backup'],
  'set.restoreDesc': ['Mevcut veri dosyadakiyle değişir.', 'Current data is replaced by the file.'],
  'set.choose': ['Seç', 'Choose'],
  'set.autoSnap': ['Otomatik yerel kopya', 'Automatic local copy'],
  'set.autoSnapDesc': [
    'Altı günde bir, bu cihazda iki kopya tutulur. Tarayıcı verisi silinse bile son haftaya dönebilirsin.',
    'Every six days two copies are kept on this device, so clearing browser data still leaves you a week to recover.',
  ],
  'set.snapRestore': ['Geri yükle', 'Restore'],
  'set.snapNow': ['Şimdi kopyala', 'Copy now'],
  'set.snapDone': ['Kopya alındı', 'Copy taken'],
  'set.snapFail': ['Kopya alınamadı', 'Copy failed'],
  'set.snapWords': ['{n} kelime', '{n} words'],
  'set.reset': ['Sıfırla', 'Reset'],
  'set.resetTitle': ['Her şeyi sıfırla?', 'Reset everything?'],
  'set.resetText': [
    '{n} doğru cevap, {m} rozet ve tüm notların silinecek. Bu işlem geri alınamaz.',
    '{n} correct answers, {m} badges and all notes will be deleted. This cannot be undone.',
  ],
  'set.resetConfirm': ['Evet, sıfırla', 'Yes, reset'],
  'set.resetDone': ['Sıfırlandı', 'Reset'],
  'set.dataNote': [
    'Veriler tarayıcının yerel deposunda tutulur. Düzenli yedek almak, hesap açmaktan daha güvenli bir alışkanlık.',
    'Data lives in this browser’s local storage. Backing up regularly is a safer habit than creating an account.',
  ],
  'set.about': [
    'Aralıklı tekrar ile kelime öğrenme. Sunucu yok, hesap yok; yalnızca sen ve kelimeler.',
    'Vocabulary learning with spaced repetition. No server, no account — just you and the words.',
  ],
  'set.sourceCode': ['Kaynak kod', 'Source code'],
  'set.license': ['MIT lisansı · Berke Hazar · Telaffuz kayıtları CC BY-SA', 'MIT licence · Berke Hazar · Audio recordings CC BY-SA'],
  'set.online': ['çevrimiçi', 'online'],
  'set.offline': ['çevrimdışı', 'offline'],
  'set.language': ['Dil', 'Language'],
  'set.languageDesc': ['Arayüz dili. Kelime listesi değişmez.', 'Interface language. The word list stays the same.'],

  /* --------------------------------------------------------- ilk kurulum */
  'onb.langTitle': ['Hangi dilde devam edelim?', 'Which language should we use?'],
  'onb.langSub': [
    'Arayüz dili. Kelimeler her iki dilde de aynı.',
    'Interface language. The words are the same either way.',
  ],
  'onb.langTr': ['Türkçe', 'Turkish'],
  'onb.langEn': ['İngilizce', 'English'],
  'onb.step': ['{i} / {n}', '{i} / {n}'],
  'onb.title': ['Kelimeler birer adım.', 'Words come one step at a time.'],
  'onb.sub': [
    'VocaStride aralıklı tekrar kullanır: bir kelimeyi tam unutmaya başladığın anda tekrar sorar. Günde birkaç dakika yeter, gerisini ritim halleder.',
    'VocaStride uses spaced repetition: it asks again exactly when you are about to forget. A few minutes a day is enough; rhythm does the rest.',
  ],
  'onb.f1': ['Doğru zamanda tekrar', 'Reviews at the right time'],
  'onb.f1t': [
    'Leitner kutuları, kelimeyi tam unutmaya başladığın anda önüne getirir.',
    'Leitner boxes bring a word back right as it starts to fade.',
  ],
  'onb.f2': ['Gerçek telaffuz', 'Real pronunciation'],
  'onb.f2t': [
    'Sesler Wikimedia Commons’tan gelir; cihazın sesi değil, gerçek kayıtlar.',
    'Audio comes from Wikimedia Commons — real recordings, not a device voice.',
  ],
  'onb.f3': ['Hesapsız, çevrimdışı', 'No account, offline'],
  'onb.f3t': [
    'Sunucu yok. İlerleme bu cihazda kalır, istediğin an yedeklenir.',
    'No server. Progress stays on this device and can be backed up any time.',
  ],
  'onb.goalTitle': ['Günde kaç kelime?', 'How many words a day?'],
  'onb.goalSub': [
    'Hedefi küçük tut. Yükü taşıyabildiğin sürece devam edersin; büyük hedef bir hafta sonra bırakılan bir hedeftir.',
    'Keep the target small. You continue as long as the load is bearable; a big target is one you drop in a week.',
  ],
  'onb.g1': ['Isınma', 'Warm-up'],
  'onb.g1d': ['günde 2 dakika', '2 minutes a day'],
  'onb.g2': ['Dengeli', 'Balanced'],
  'onb.g2d': ['günde 5 dakika', '5 minutes a day'],
  'onb.g3': ['Hırslı', 'Ambitious'],
  'onb.g3d': ['günde 8 dakika', '8 minutes a day'],
  'onb.g4': ['Maratoncu', 'Marathoner'],
  'onb.g4d': ['günde 12 dakika', '12 minutes a day'],
  'onb.accentTitle': ['Defterin rengi.', 'The colour of your notebook.'],
  'onb.accentSub': [
    'Tek bir vurgu rengi seç. Yeşil ve kırmızı yalnızca doğru/yanlış için kullanılır.',
    'Pick one accent colour. Green and red are reserved for right and wrong.',
  ],
  'onb.accent': ['Vurgu', 'Accent'],
  'onb.look': ['Görünüm', 'Appearance'],
  'onb.continue': ['Devam', 'Continue'],
  'onb.later': ['Sonra ayarlarım', 'I’ll set it up later'],
  'onb.begin': ['Başla', 'Begin'],
  'onb.cap0': [
    'Her kelime bir kart: okunuşu, karşılığı ve ne kadar oturduğu.',
    'Every word is a card: sound, meaning, and how well it stuck.',
  ],
  'onb.cap1': [
    'Küçük hedef, uzun ömür. Sayıyı sonra da değiştirebilirsin.',
    'Small target, long life. You can change the number later.',
  ],
  'onb.cap2': [
    'Defterin kapağını boya. Tema ve vurgu her ekranda seninle.',
    'Paint the cover. Theme and accent follow you everywhere.',
  ],

  /* --------------------------------------------------------------- kelime */
  'q.subTrEn': [
    'Türkçesi verilen kelimenin İngilizcesi hangisi?',
    'Which English word matches this Turkish meaning?',
  ],
  'q.subEnTr': ['Bu kelimenin Türkçe karşılığı hangisi?', 'What is the Turkish meaning of this word?'],
  'q.subSyn': ['Bu kelimenin eşanlamlısı hangisi?', 'Which of these is a synonym?'],
  'q.subListen': [
    'Duyduğun kelimenin Türkçe karşılığı hangisi?',
    'What is the Turkish meaning of the word you heard?',
  ],
  'pos.n': ['isim', 'noun'],
  'pos.v': ['fiil', 'verb'],
  'pos.adj': ['sıfat', 'adjective'],
  'pos.adv': ['zarf', 'adverb'],
  'word.one': ['kelime', 'word'],
  'word.many': ['kelime', 'words'],

  /* -------------------------------------------------------------- kabuk */
  'side.streak': ['{n} günlük seri', '{n} day streak'],
  'side.streakZero': ['Seri bugün başlar', 'Streak starts today'],

  /* ------------------------------------------------------- klavye kısayolu */
  'keys.title': ['Klavye kısayolları', 'Keyboard shortcuts'],
  'keys.sub': [
    'Her şey bir tuş uzağında. Mobilde bu panel yok.',
    'Everything is a key away. This panel is desktop only.',
  ],
  'keys.modes': ['Modlar', 'Modes'],
  'keys.pages': ['Genel', 'General'],
  'keys.start': ['Sıradaki tura başla', 'Start the next round'],
  'keys.flip': ['Kartı çevir', 'Flip the card'],
  'keys.know': ['Biliyorum', 'I know it'],
  'keys.again': ['Tekrar göster', 'Show again'],
  'keys.open': ['Kısayolları aç', 'Open shortcuts'],

  /* ------------------------------------------------------------- sözlük */
  'dict.random': ['Şanslı kelime', 'Random word'],
  'dict.randomHint': [
    'Listeden rastgele bir kelime aç.',
    'Open a random word from the list.',
  ],

  /* ---------------------------------------------------------- istatistik */
  'stats.hover': ['{n} cevap', '{n} answers'],
  'stats.activeDays': ['aktif gün', 'active days'],
  'stats.bestDay': ['en iyi gün', 'best day'],

  /* -------------------------------------------------------------- bildirim */
  'toast.level': ['Seviye {n}!', 'Level {n}!'],
  'toast.levelSub': [
    'Yeni bir eşik açıldı.',
    'A new threshold opened.',
  ],
  'toast.badge': ['Rozet kazandın: {n}', 'Badge earned: {n}'],
  'toast.backupBad': [
    'Bu yedek farklı bir sürüme ait.',
    'This backup belongs to a different version.',
  ],
  'toast.backupOk': ['Yedek geri yüklendi.', 'Backup restored.'],
  'toast.backupFail': [
    'Dosya okunamadı. Geçerli bir VocaStride yedeği seç.',
    'Could not read the file. Choose a valid VocaStride backup.',
  ],
  'toast.snapOk': ['Anlık görüntü geri yüklendi.', 'Snapshot restored.'],
  'toast.snapBad': ['Kayıt okunamadı.', 'Could not read the record.'],
  'toast.snapVersion': ['Bu kayıt farklı bir sürüme ait.', 'This record is from a different version.'],
  'toast.audioMissing': ['Bu kelime için kayıt yok', 'No recording for this word'],
} as const satisfies Record<string, Pair>;

export type MsgKey = keyof typeof S;

const cache = new Map<Lang, (k: MsgKey, v?: Record<string, string | number>) => string>();

function fill(tpl: string, vars?: Record<string, string | number>): string {
  if (!vars) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function makeT(lang: Lang) {
  const hit = cache.get(lang);
  if (hit) return hit;
  const fn = (key: MsgKey, vars?: Record<string, string | number>) => {
    const pair = S[key];
    if (!pair) return String(key);
    return fill(pair[lang === 'en' ? 1 : 0], vars);
  };
  cache.set(lang, fn);
  return fn;
}

/** Cihazın dilinden başlangıç tahmini: Türkçe değilse İngilizce. */
export function detectLang(): Lang {
  const list = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const raw of list) {
    const code = (raw || '').toLowerCase();
    if (code.startsWith('tr')) return 'tr';
    if (code.startsWith('en')) return 'en';
  }
  return list.length ? 'en' : 'tr';
}

export function pluralWord(n: number, lang: Lang): string {
  return lang === 'en' ? (n === 1 ? 'word' : 'words') : 'kelime';
}
