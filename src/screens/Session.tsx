import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Bar, Empty, Sheet } from '../components/UI';
import { loadDict, posLabel } from '../data/words';
import { activeWords, buildQueue, dueKeys, modeLabel, promptSense, shuffle } from '../lib/engine';
import { capped } from '../lib/sustain';
import { fmtTime } from '../lib/format';
import { navigate, useRoute } from '../lib/router';
import {
  SPEED_QUESTIONS,
  buildLevelSteps,
  buildPlan,
  countUnits,
  type QuizQuestion,
  type SessionPlan,
  type Step,
  type TypeQuestion,
} from '../lib/session';
import { campaignOptionsFor, campaignPlan, expandUnits, selectLevel } from '../lib/levels';
import { BASE_BANDS, bandsFor } from '../data/bands';
import {
  finishSession,
  getState,
  recordAnswer,
  awardXp,
  startSession,
  recordLevelResult,
} from '../lib/store';
import { freshTarget, getActiveLevel, setActiveLevel, starsFor } from '../lib/campaign';
import { clearRetryKeys, peekRetryKeys } from '../lib/retry';
import { fireConfetti } from '../lib/confetti';
import { shake } from '../lib/fx';
import { buzz, sfx } from '../lib/audio';
import { peek, prefetch, say } from '../lib/pronounce';
import { useLang, useT } from '../lib/useT';
import type { DictEntry, Mode, Word } from '../types';

const VALID: Mode[] = [
  'quiz',
  'cards',
  'match',
  'speed',
  'listen',
  'type',
  'marathon',
  'review',
  'level',
];

interface Tally {
  correct: number;
  wrong: number;
  xp: number;
  combo: number;
  best: number;
  units: number;
  /** Atlanan sorular: doğru/yanlış sayılmaz, yalnızca "soru görüldü" sayılır. */
  skipped: number;
  wrongKeys: string[];
}

const ZERO: Tally = {
  correct: 0,
  wrong: 0,
  xp: 0,
  combo: 0,
  best: 0,
  units: 0,
  skipped: 0,
  wrongKeys: [],
};

/**
 * Seri kutlamasının eşikleri.
 *
 * Önceden 3'te de kutlanıyordu ve yanlış cevaptan sonra seri sıfırlanınca
 * aynı eşik yeniden tetikleniyordu — "sürekli seri bildirimi" hissi bundandı.
 * Artık yalnızca kademe atlandığında ve oturumda bir kez kutlanıyor.
 */
function comboTier(n: number): number {
  if (n >= 20) return 4;
  if (n >= 12) return 3;
  if (n >= 8) return 2;
  if (n >= 5) return 1;
  return 0;
}

export default function Session() {
  const route = useRoute();
  const t = useT();
  const lang = useLang();
  const mode = (VALID.includes(route.mode as Mode) ? route.mode : 'quiz') as Mode;
  const [quit, setQuit] = useState(false);
  const [deferred, setDeferred] = useState(0);

  const plan = useMemo(() => {
    const st = getState();

    /*
     * Bölüm oturumu: kelimeler hazır bir listeden değil, bölüm planından gelir.
     * Kart / test / dinleme / yazma / eşleştirme aynı bölümün içinde sırayla.
     */
    if (mode === 'level') {
      const empty: SessionPlan = { mode, steps: [], units: 0 };
      const lvl = getActiveLevel();
      const list = activeWords(st);
      const bands = st.activeList === 'default' ? BASE_BANDS : bandsFor(list);
      // Doğrudan bağlantıyla gelindiyse sıradaki bölüm oynanır.
      const levelId = lvl?.id ?? st.campaign[st.activeList]?.level ?? 1;
      const difficulty = st.lists.find((l) => l.id === st.activeList)?.difficulty;
      const planLevels = campaignPlan(bands, campaignOptionsFor(difficulty));
      /*
       * Zorluk değişince plan kısalmış olabilir; işaretçi planın dışındaysa
       * son bölüme düşülür. Aksi hâlde tanımsız bölüm yüzünden boş ekran
       * açılıyordu.
       */
      const def = planLevels.find((l) => l.id === levelId) ?? planLevels[planLevels.length - 1];
      if (!def) return empty;
      if (!lvl) setActiveLevel(def.id, def.passPct, def.total);

      // Bu bölümün kendi işaretlerini yok say: sayfa yenilenirse aynı kelimeler gelsin.
      const prog = st.campaign[st.activeList] ?? { level: 1, stars: {}, words: {} };
      const progress = Object.fromEntries(
        Object.entries(prog.words).filter(([, v]) => v.last < def.id),
      );
      // Uyarlama: son bölümlerin doğruluğu yeni kelime sayısını kaydırır.
      const freshCount = freshTarget(def, prog.comfort ?? 0.8);
      const sel = selectLevel(def, { bands, progress, srs: st.srs, freshCount });
      const steps = buildLevelSteps(expandUnits(def, sel), list, {
        direction: 'mixed',
        lang: st.settings.lang,
      });
      return { mode, steps, units: countUnits(steps) };
    }

    const words = activeWords(st);
    const retry = peekRetryKeys();
    const cfg = st.settings.study;
    const due = dueKeys(st, words);
    // Maratonda `length` tek kelimelik adımlar; eşleştirme tahtası (4) üstüne biner.
    const count =
      mode === 'match'
        ? 10
        : mode === 'marathon'
          ? (cfg.length || 10) + 4
          : mode === 'speed'
            ? SPEED_QUESTIONS
            : mode === 'review'
              ? Math.max(1, due.length)
              : cfg.length || 10;
    // Hız turu her zaman geniş havuzdan beslenir; kısa sürede çok kelime görülür.
    const source = mode === 'review' ? 'due' : mode === 'speed' ? 'all' : cfg.source;

    let queue = retry ?? buildQueue(st, words, source, count);
    // Tekrar borcu 80 kelimeye çıkarsa tur başlamadan biter. Tavan, kalanı yarına atar.
    if (!retry && (mode === 'review' || source === 'due')) {
      const cut = capped(queue, st.settings.cap);
      queue = cut.queue;
      window.setTimeout(() => setDeferred(cut.deferred), 0);
    }

    return buildPlan(mode, queue, words, {
      direction: cfg.direction,
      length: count,
      lang: st.settings.lang,
    });
    // Plan oturum başında bir kez kurulur; cevaplar planı değiştirmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const words = useMemo(() => activeWords(getState()), []);
  const byKey = useMemo(() => new Map(words.map((w) => [w.key, w])), [words]);
  const pronMode = getState().settings.pron;

  /*
   * Sınırsız tur: soru sayısı 0 seçildiyse oturum kendiliğinden bitmez.
   * Plan ilk partiyi kurar; parti bitince `advance` yenisini ekler.
   */
  const endless =
    getState().settings.study.length === 0 &&
    mode !== 'level' &&
    mode !== 'speed' &&
    mode !== 'review';
  const [extraSteps, setExtraSteps] = useState<Step[]>([]);
  const steps = extraSteps.length ? plan.steps.concat(extraSteps) : plan.steps;

  const [idx, setIdx] = useState(0);
  const [tally, setTally] = useState<Tally>(ZERO);
  const tallyRef = useRef<Tally>(ZERO);
  const [elapsed, setElapsed] = useState(0);
  const [bump, setBump] = useState(false);
  const [dict, setDict] = useState<Record<string, DictEntry> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [xpFloat, setXpFloat] = useState<number | null>(null);
  // Seri kutlaması: yalnızca ekran okuyucu duyurusu için tutuluyor.
  const [comboMsg, setComboMsg] = useState<number | null>(null);
  /** Oturumda kutlanmış en yüksek kademe; aynı eşik iki kez kutlanmaz. */
  const announcedTier = useRef(0);
  /** Seri kapsülünün kısa kutlama hâli (etiket görünür, kapsül büyür). */
  const [celebrate, setCelebrate] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const started = useRef(Date.now());
  const finished = useRef(false);
  const advancing = useRef(false);
  const limit = plan.timeLimit ?? 0;
  const [left, setLeft] = useState(limit);

  const sayWord = useCallback(
    // `urgent`: arka plan kuyruğunu atla. Dinleme sorusunun otomatik okuması
    // da acildir — ses sorunun kendisi, gecikirse soru sessiz kalıyor.
    (text: string, urgent = true) => {
      void say(text, pronMode, urgent);
    },
    [pronMode],
  );

  useEffect(() => {
    /*
     * Bölüm dışı bir tur başlarken "oynanan bölüm" işareti temizlenir.
     *
     * İşaret yalnızca bölüm ekranından siliniyordu; tarayıcı geri tuşuyla
     * bölümden çıkıp (bitirmeden) başka bir tura giren kullanıcı, o turun
     * sonucunu o sırada "açık" görünen bölüme yazdırıyordu: hiç oynanmamış
     * bir bölüm yıldız alıp yol haritasını atlatıyordu.
     */
    if (mode !== 'level') setActiveLevel(null);
    startSession();
  }, [mode]);

  /*
   * Dinleme ve kart modlarında ses gecikmesi olmasın: sıradaki kelimeler
   * önden hazırlanır.
   *
   * Sıra `plan.steps` sırasıyla alındığında bölümlerde ilk altı adım kart ve
   * test oluyordu; dinleme kelimeleri pencerenin dışında kalıyor, mobil ağda
   * ilk dinleme sorusunun sesi soru geçildikten sonra geliyordu. Artık
   * dinleme kelimeleri önce hazırlanır.
   */
  useEffect(() => {
    const keys = plan.steps.flatMap((s) =>
      s.kind === 'quiz' || s.kind === 'listen' ? [s.q.wordKey] : s.kind === 'cards' ? s.keys : [],
    );
    const listen = plan.steps.flatMap((s) => (s.kind === 'listen' ? [s.q.wordKey] : []));
    const list = [...new Set([...listen, ...keys])]
      .map((k) => byKey.get(k)?.w)
      .filter(Boolean) as string[];
    if (list.length) void prefetch(list, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!getState().settings.dict) return;
    let alive = true;
    loadDict()
      .then((d) => {
        if (alive) setDict(d);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((fn: (t: Tally) => Tally) => {
    const next = fn(tallyRef.current);
    tallyRef.current = next;
    setTally(next);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onAnswer = useCallback(
    (
      key: string,
      ok: boolean,
      recMode: Mode,
      direction?: QuizQuestion['direction'],
      countUnit = true,
    ) => {
      clearRetryKeys();
      const cur = tallyRef.current;
      const nextCombo = ok ? cur.combo + 1 : 0;
      const out = recordAnswer(key, ok, recMode, nextCombo, direction);
      update((x) => ({
        correct: x.correct + (ok ? 1 : 0),
        wrong: x.wrong + (ok ? 0 : 1),
        xp: x.xp + out.xp,
        combo: nextCombo,
        best: Math.max(x.best, nextCombo),
        units: x.units + (countUnit ? 1 : 0),
        skipped: x.skipped,
        wrongKeys: ok ? x.wrongKeys : [...new Set([...x.wrongKeys, key])],
      }));
      if (ok) {
        sfx('ok');
        buzz(12);
        setBump(true);
        setXpFloat(out.xp);
        window.setTimeout(() => setBump(false), 320);
        window.setTimeout(() => setXpFloat(null), 760);

        /*
         * Doğru cevap sade: ses, kısa titreşim ve seçeneğin kendi renk
         * geçişi. Uçuşan kıvılcım, ışık süpürmesi ve kenar parlaması
         * kaldırıldı — her doğruda gösteri yapmak soruyu gölgeliyordu.
         * Seri kademesi atlandığında yalnızca başlıktaki kapsül büyür.
         */
        const tier = comboTier(nextCombo);
        if (tier > announcedTier.current) {
          announcedTier.current = tier;
          setComboMsg(nextCombo);
          setCelebrate(true);
          window.setTimeout(() => setCelebrate(false), 1100);
          window.setTimeout(() => setComboMsg(null), 1600);
        }
      } else {
        sfx('bad');
        buzz([16, 36, 16]);
        shake(bodyRef.current);
      }
    },
    [update, t],
  );

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const fin = tallyRef.current;
    /*
     * Atlanan sorular (dinleyemiyorum) ne doğru ne yanlış: doğruluk yalnızca
     * cevaplananlar üzerinden hesaplanıyor. Bölümün "tamamlandı" sayılması için
     * ise atlananlar da sayılıyor; aksi hâlde 3 dinleme sorusu atlayan biri
     * %100 doğrulukla bölümü geçemiyordu.
     */
    const answered = fin.correct + fin.wrong;
    const total = answered + fin.skipped;
    /*
     * Bölüm sonucu yalnızca bölüm oturumunda yazılır. Eskiden işaret ne
     * olursa olsun okunuyordu; yarım kalmış bir bölümden sonra açılan normal
     * tur, kendi doğruluğunu o bölüme yazıp yıldız kazandırabiliyordu.
     */
    const lvl = mode === 'level' ? getActiveLevel() : null;
    setActiveLevel(null);
    // Hiç cevap yoksa (hepsi atlandıysa) özet ekranı anlamsız: doğrudan çık.
    if (answered === 0) {
      navigate('/', { replace: true });
      return;
    }
    const perfect = fin.wrong === 0 && answered > 0;
    const timeSec = Math.max(1, Math.round((Date.now() - started.current) / 1000));

    // Bölüm oturumuysa yıldızı yaz. Yarıda bırakılan oturum geçilmiş sayılmaz.
    if (lvl) {
      const acc = answered ? fin.correct / answered : 0;
      if (total >= Math.min(lvl.total, plan.units) && acc >= lvl.passPct) {
        recordLevelResult(
          getState().activeList,
          lvl.id,
          starsFor(acc, lvl.passPct),
          true,
          acc,
        );
      }
    }

    finishSession({
      mode,
      correct: fin.correct,
      wrong: fin.wrong,
      total,
      timeSec,
      xp: fin.xp,
      combo: fin.best,
      perfect,
      accuracy: answered ? fin.correct / answered : 0,
      wrongKeys: fin.wrongKeys,
    });
    if (perfect) {
      fireConfetti({ count: 70 });
      sfx('win');
    }
    navigate('/summary', { replace: true });
  }, [mode]);

  /** Sınırsız turda sıradaki parti: aynı modun yeni soruları. */
  const nextBatch = useCallback((): Step[] => {
    const st = getState();
    const ws = activeWords(st);
    const cfg = st.settings.study;
    const size = 10;
    const need = mode === 'marathon' ? size + 4 : size;
    const queue = buildQueue(st, ws, cfg.source, need);
    return buildPlan(mode, queue, ws, {
      direction: cfg.direction,
      length: size,
      lang: st.settings.lang,
    }).steps;
  }, [mode]);

  const advance = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    setLeaving(true);
    window.setTimeout(() => {
      setLeaving(false);
      advancing.current = false;
      if (idx + 1 < steps.length) {
        setIdx((i) => i + 1);
        return;
      }
      if (endless) {
        const more = nextBatch();
        if (more.length) {
          setExtraSteps((e) => [...e, ...more]);
          setIdx((i) => i + 1);
          return;
        }
      }
      finish();
    }, 70);
  }, [idx, steps.length, endless, nextBatch, finish]);

  /**
   * Dinleyemiyorum: soru değerlendirilmeden geçilir.
   *
   * Doğru/yanlış sayacına dokunmaz, XP vermez, kelimeyi SRS'e işlemez; yalnızca
   * ilerlemeyi bir adım artırıp sıradaki soruya geçer. Böylece sessiz ortamda
   * bölüm tıkanmıyor, ama atlayarak yıldız toplamak da mümkün değil (doğruluk
   * yalnızca cevaplanan sorular üzerinden hesaplanıyor).
   */
  const skipQuestion = useCallback(() => {
    update((x) => ({ ...x, skipped: x.skipped + 1, units: x.units + 1, combo: 0 }));
    advance();
  }, [update, advance]);


  // Hız turu: süre bitince oturum kendiliğinden kapanır.
  useEffect(() => {
    if (!limit) return;
    const end = Date.now() + limit * 1000;
    const id = window.setInterval(() => {
      const rest = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      // Sayaç saniyede bir değişiyor: aynı değeri tekrar yazıp ekranı
      // saniyede dört kez yeniden çizdirmiyoruz.
      setLeft((prev) => (prev === rest ? prev : rest));
      if (rest <= 0) {
        window.clearInterval(id);
        finish();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [limit, finish]);

  const progress = plan.units ? Math.min(1, tally.units / plan.units) : 0;
  const step = steps[idx];
  const answeredAny = tally.correct + tally.wrong > 0;

  if (!steps.length || !step) {
    return (
      <div className="session">
        <div className="session-empty">
          <Empty
            title={mode === 'review' ? t('session.noDue') : t('session.noWords')}
            text={mode === 'review' ? t('session.noDueText') : t('session.noWordsText')}
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
                {t('session.backToday')}
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="session">
      <header className="sess-head">
        <button
          type="button"
          className="icon-btn sess-exit"
          onClick={() => setQuit(true)}
          aria-label={t('session.exit')}
        >
          <Icon name="arrow-left" size={19} />
        </button>
        <div className="sess-title grow">
          <b>{modeLabel(mode, lang)}</b>
          <span className="num">
            {mode === 'level'
              ? `${Math.min(tally.units + 1, plan.units)} / ${plan.units}`
              : endless
                ? `${idx + 1} / ∞`
                : step.kind === 'cards'
                  ? t('session.deck', { i: idx + 1, n: steps.length })
                  : step.kind === 'match'
                    ? t('session.round', { i: idx + 1, n: steps.length })
                    : `${idx + 1} / ${steps.length}`}
          </span>
        </div>
        {tally.combo > 0 && (
          <span
            ref={pillRef}
            className="sess-combo num"
            data-hot={tally.combo >= 3}
            data-tier={tally.combo >= 12 ? 4 : tally.combo >= 8 ? 3 : tally.combo >= 5 ? 2 : 1}
            data-bump={bump}
            data-celebrate={celebrate}
          >
            <Icon name="flame" size={13} /> {tally.combo}
            <span className="sc-lbl">{t('session.comboLabel')}</span>
            {xpFloat !== null && (
              <span className="xp-float num" key={`xp-${xpFloat}-${idx}`}>
                +{xpFloat}
              </span>
            )}
          </span>
        )}
      </header>

      <div className="sess-progress">
        {limit ? (
          <div className="speed-bar" data-low={left <= 10} aria-hidden="true">
            <i style={{ '--v': Math.max(0, left / limit) } as React.CSSProperties} />
          </div>
        ) : endless ? null : (
          <Bar value={progress} label={t('session.progress')} />
        )}
        <div className="sp-meta num">
          <span>{t('session.correct', { n: tally.correct, m: tally.wrong })}</span>
          <span className="row" style={{ gap: 4 }} data-low={limit > 0 && left <= 10}>
            <Icon name="clock" size={12} /> {limit ? t('session.sec', { n: left }) : fmtTime(elapsed)}
          </span>
        </div>
      </div>

      <div className={`sess-body${leaving ? ' is-leaving' : ''}`} ref={bodyRef}>
        {/* Seri damgası görsel; ekran okuyucu için aynı bilgi burada. */}
        <span className="sr-only" role="status" aria-live="polite">
          {comboMsg ? `${comboMsg} ${t('session.comboLabel')}` : ''}
        </span>
        {(step.kind === 'quiz' || step.kind === 'listen') && (
          <QuizStep
            key={idx}
            q={step.q}
            variant={step.kind === 'listen' ? 'listen' : 'text'}
            allowListenSkip={mode === 'level'}
            onSkip={skipQuestion}
            byKey={byKey}
            dict={dict}
            onSay={sayWord}
            onAnswer={(key, ok, dir) =>
              onAnswer(
                key,
                ok,
                mode === 'marathon' || mode === 'level'
                  ? step.kind === 'listen'
                    ? 'listen'
                    : 'quiz'
                  : mode,
                dir,
              )
            }
            onNext={advance}
            last={!endless && idx + 1 >= steps.length}
          />
        )}
        {step.kind === 'type' && (
          <TypeStep
            key={idx}
            q={step.q}
            onSay={sayWord}
            onAnswer={(key, ok) => onAnswer(key, ok, mode === 'level' ? 'type' : mode)}
            onNext={advance}
            last={!endless && idx + 1 >= steps.length}
          />
        )}
        {step.kind === 'cards' && (
          <CardsStep
            key={idx}
            keys={step.keys}
            byKey={byKey}
            dict={dict}
            onSay={sayWord}
            onAnswer={(key, ok) =>
              onAnswer(key, ok, mode === 'marathon' || mode === 'level' ? 'cards' : mode)
            }
            onDone={advance}
          />
        )}
        {step.kind === 'match' && (
          <MatchStep
            key={idx}
            keys={step.keys}
            byKey={byKey}
            onPair={(key, ok) => onAnswer(key, ok, 'match', undefined, ok)}
            onDone={(perfect) => {
              if (perfect) {
                awardXp(25);
                update((x) => ({ ...x, xp: x.xp + 25 }));
                sfx('match');
                fireConfetti({ count: 36 });
              }
              advance();
            }}
          />
        )}
      </div>

      {deferred > 0 && (
        <p className="sess-note">{t('session.deferred', { n: deferred })}</p>
      )}

      <Sheet open={quit} onClose={() => setQuit(false)} title={t('session.quitTitle')}>
        <div className="stack">
          <p className="sheet-lede">
            {answeredAny
              ? t('session.quitText', { n: tally.correct })
              : t('session.quitEmpty')}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              setQuit(false);
              finish();
            }}
          >
            {answeredAny ? t('session.quitConfirm') : t('session.quitLeave')}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setQuit(false)}>
            {t('session.quitKeep')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

/* --------------------------------- test -------------------------------- */

function QuizStep({
  q,
  variant = 'text',
  byKey,
  dict,
  onSay,
  onAnswer,
  onNext,
  last,
  allowListenSkip = false,
  onSkip,
}: {
  q: QuizQuestion;
  variant?: 'text' | 'listen';
  byKey: Map<string, Word>;
  dict: Record<string, DictEntry> | null;
  onSay: (text: string, urgent?: boolean) => void;
  onAnswer: (key: string, ok: boolean, dir: QuizQuestion['direction']) => void;
  onNext: () => void;
  last: boolean;
  /** Bölümlerde: "dinleyemiyorum" ile soruyu değerlendirmeden geçme. */
  allowListenSkip?: boolean;
  onSkip?: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const ok = picked === q.answerKey;
  const word = byKey.get(q.wordKey);
  const info = dict?.[q.wordKey];
  const credit = variant === 'listen' ? peek(q.prompt) : null;

  const choose = useCallback(
    (key: string) => {
      if (picked) return;
      setPicked(key);
      onAnswer(q.wordKey, key === q.answerKey, q.direction);
    },
    [picked, q, onAnswer],
  );

  // Dinleme modunda kelime bir kez otomatik okunur. Acil sırada gider:
  // ses bu sorunun kendisi, arka plan hazırlığının arkasında beklememeli.
  useEffect(() => {
    if (variant !== 'listen') return;
    const id = window.setTimeout(() => onSay(q.prompt, true), 240);
    return () => window.clearTimeout(id);
  }, [variant, q.prompt, onSay]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (tag === 'BUTTON' && (e.key === 'Enter' || e.code === 'Space')) return;
      if (!answered && /^[1-4]$/.test(e.key)) {
        const opt = q.options[Number(e.key) - 1];
        if (opt) {
          e.preventDefault();
          choose(opt.key);
        }
      } else if (answered && e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, choose, onNext, q.options]);

  return (
    <div className="quiz">
      <div className="q-prompt" data-variant={variant}>
        <div className="q-dir">
          <span className="tag">
            {variant === 'listen'
              ? t('session.listenTag')
              : q.direction === 'tr-en'
                ? 'TR → EN'
                : q.direction === 'en-tr'
                  ? 'EN → TR'
                  : t('dir.syn')}
          </span>
        </div>
        {variant === 'listen' ? (
          <button
            type="button"
            className="q-speak"
            onClick={() => {
              onSay(q.prompt);
              sfx('tap');
            }}
            aria-label={t('session.replay')}
          >
            <Icon name="volume" size={26} />
          </button>
        ) : (
          <div
            className={`q-word${q.prompt.length > 70 ? ' xsmall' : q.prompt.length > 34 ? ' small' : ''}`}
          >
            {q.prompt}
          </div>
        )}
        {/*
          * Dinleyemiyorum: soru değerlendirilmeden geçilir. Ne doğru ne yanlış
          * sayılır, kelime SRS'e işlenmez; ileride yine karşısına çıkar.
          */}
        {variant === 'listen' && !answered && allowListenSkip && onSkip ? (
          <button type="button" className="q-skip" onClick={onSkip}>
            {t('session.cantListen')}
          </button>
        ) : null}
        {variant === 'listen' && answered ? <div className="q-word small">{q.prompt}</div> : null}
        {info?.ipa && answered ? <div className="q-ipa ipa">/{info.ipa}/</div> : null}
        <p className="q-sub">{q.sub}</p>
        {answered && info?.def ? (
          <p className="q-def">
            {info.def}
            {word ? ` · ${posLabel(word.pos, lang)}` : ''}
          </p>
        ) : null}
        {credit ? (
          <a
            className="q-credit"
            href={credit.page}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {t('session.credit')}
          </a>
        ) : null}
      </div>

      <div className="q-options" role="group" aria-label="Seçenekler">
        {q.options.map((o, i) => {
          let state: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle';
          if (answered) {
            if (o.key === q.answerKey) state = 'correct';
            else if (o.key === picked) state = 'wrong';
            else state = 'dim';
          }
          return (
            <button
              key={o.key}
              type="button"
              className="q-opt"
              data-state={state}
              style={{ '--i': i } as React.CSSProperties}
              disabled={answered}
              aria-pressed={picked === o.key}
              onClick={() => choose(o.key)}
            >
              <span className="q-key num">{i + 1}</span>
              <span className="q-text">{o.label}</span>
              <span className="q-mark">
                {state === 'correct' ? (
                  <Icon name="check" size={20} />
                ) : state === 'wrong' ? (
                  <Icon name="x" size={20} />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* Yer her zaman ayrılır: cevap gelince seçenekler zıplamaz. */}
      <div className="q-foot" data-empty={!answered}>
        {answered ? (
          <>
            <span className="q-feedback" data-ok={ok} aria-live="polite">
              <Icon name={ok ? 'check' : 'x'} size={17} />
              {ok ? t('session.right') : t('session.wrong')}
              {!ok && <span className="qfb-answer"> {q.answerLabel}</span>}
            </span>
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {last ? t('common.finish') : t('common.next')} <Icon name="arrow-right" size={16} />
            </button>
          </>
        ) : (
          <span className="q-hint kbd-note">{t('session.keyHint')}</span>
        )}
      </div>

    </div>
  );
}

/* --------------------------------- yazma ------------------------------- */

function TypeStep({
  q,
  onSay,
  onAnswer,
  onNext,
  last,
}: {
  q: TypeQuestion;
  onSay: (text: string, urgent?: boolean) => void;
  onAnswer: (key: string, ok: boolean) => void;
  onNext: () => void;
  last: boolean;
}) {
  const t = useT();
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'ok' | 'bad'>('idle');
  const [hinted, setHinted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const answered = state !== 'idle';

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(id);
  }, []);

  const submit = useCallback(() => {
    if (answered) return;
    const clean = value.trim().toLowerCase();
    if (!clean) return;
    const ok = clean === q.answer.toLowerCase();
    setState(ok ? 'ok' : 'bad');
    // Ses ve titreşim tek yerde (üst bileşen) çalınır; burada tekrarlanmaz.
    onAnswer(q.wordKey, ok);
  }, [answered, value, q, onAnswer]);

  // Doğru yazılan ön ek yeşile döner: harf harf geri bildirim.
  const typed = value.toLowerCase();
  const good = q.answer.toLowerCase().startsWith(typed) ? typed.length : 0;

  return (
    <div className="typing">
      <div className="q-prompt">
        <div className="q-dir">
          <span className="tag">TR → EN</span>
        </div>
        <div className={`q-word${q.prompt.length > 34 ? ' small' : ''}`}>{q.prompt}</div>
        <p className="q-sub">{t('session.typeSub')}</p>
      </div>

      <div className="type-entry">
        <div className="type-box" data-state={state}>
          <input
          ref={inputRef}
          className="type-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (answered) onNext();
              else submit();
            }
          }}
          disabled={answered}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="done"
          placeholder={t('session.typePlaceholder')}
          aria-label={t('session.typeLabel')}
        />
          <span className="type-mark" aria-hidden="true">
            {state === 'ok' ? <Icon name="check" size={20} /> : null}
            {state === 'bad' ? <Icon name="x" size={20} /> : null}
          </span>
        </div>

        <div className="type-mask" aria-hidden="true">
          {q.answer.split('').map((ch, i) => (
            <span key={`${ch}-${i}`} data-on={i < good} data-cur={i === good && !answered}>
              {i < good || answered ? ch : '·'}
            </span>
          ))}
        </div>
      </div>

      {!answered ? (
        <div className="q-foot">
          <span className="q-feedback">
            {hinted ? (
              <span className="type-hint">
                {t('session.hintLabel')} <b>{q.hint}</b>
              </span>
            ) : (
              <button type="button" className="type-hint-btn" onClick={() => setHinted(true)}>
                <Icon name="info" size={14} /> {t('session.hintBtn')}
              </button>
            )}
          </span>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!value.trim()}>
            {t('session.check')} <Icon name="arrow-right" size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="q-foot">
            <span className="q-feedback" data-ok={state === 'ok'} aria-live="polite">
              <Icon name={state === 'ok' ? 'check' : 'x'} size={17} />
              {state === 'ok' ? (
                t('session.right')
              ) : (
                <>
                  {t('session.wrong')} <span className="qfb-answer">{q.answer}</span>
                </>
              )}
            </span>
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {last ? t('common.finish') : t('common.next')} <Icon name="arrow-right" size={16} />
            </button>
          </div>
          <button
            type="button"
            className="type-listen"
            onClick={() => onSay(q.answer)}
            aria-label={t('session.listenAnswer')}
          >
            <Icon name="volume" size={15} /> {q.answer}
          </button>
        </>
      )}
    </div>
  );
}

/* -------------------------------- kartlar ------------------------------ */

function CardsStep({
  keys,
  byKey,
  dict,
  onSay,
  onAnswer,
  onDone,
}: {
  keys: string[];
  byKey: Map<string, Word>;
  dict: Record<string, DictEntry> | null;
  onSay: (text: string, urgent?: boolean) => void;
  onAnswer: (key: string, ok: boolean) => void;
  onDone: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const hintL = useRef<HTMLSpanElement>(null);
  const hintR = useRef<HTMLSpanElement>(null);
  const drag = useRef({ x: 0, y: 0, dx: 0, active: false, moved: false });
  const word = byKey.get(keys[i]);
  const info = word ? dict?.[word.key] : undefined;

  /*
   * Not vermek için kartın arkasını görmek şart.
   *
   * Ön yüzünde kelimenin sadece kendisi varken "biliyorum" demek,
   * hatırlamayı değil tahmin etmeyi ölçüyordu. Kart çevrilmeden ne
   * düğmeler ne kaydırma ne de ok tuşları not verir.
   */
  const grade = useCallback(
    (ok: boolean) => {
      if (!word || !flipped) return;
      onAnswer(word.key, ok);
      if (i + 1 >= keys.length) {
        onDone();
      } else {
        setFlipped(false);
        setI(i + 1);
      }
    },
    [word, flipped, i, keys.length, onAnswer, onDone],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (tag === 'BUTTON' && (e.key === 'Enter' || e.code === 'Space')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        grade(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        grade(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [grade]);

  // Kaydırma: karta tutup sürüklemek, mobildeki deste hissini verir.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    /*
     * Kartın içindeki düğmeler (ses) sürükleme başlatmamalı. Aksi hâlde
     * setPointerCapture tıklamanın hedefini karta çeviriyor ve ses düğmesine
     * basınca kart çevriliyordu.
     */
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    drag.current = { x: e.clientX, y: e.clientY, dx: 0, active: true, moved: false };
    flipRef.current?.setPointerCapture(e.pointerId);
  };

  /*
   * Sürükleme React state'ine yazmıyor.
   *
   * Önce her `pointermove` için setState çağrılıyordu: mobilde saniyede 60–120
   * kez kartın tamamı (iki yüz, ipuçları, düğmeler) yeniden çiziliyordu.
   * Artık transform ve ipuçları doğrudan DOM'a yazılıyor; React hiç uyanmıyor.
   * Dönüşüm de `.flip` yerine dış kabuğa (.card-shell) uygulanıyor: perspektif
   * sahnesi sabit kalıyor, sadece derlenmiş katman kayıyor.
   */
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) d.moved = true;
    d.dx = dx;

    const el = cardRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px) rotate(${dx * 0.035}deg)`;
      const lifted = String(Math.abs(dx) > 6);
      if (el.dataset.drag !== lifted) el.dataset.drag = lifted;
    }
    const left = String(dx < -46);
    const right = String(dx > 46);
    if (hintL.current && hintL.current.dataset.on !== left) hintL.current.dataset.on = left;
    if (hintR.current && hintR.current.dataset.on !== right) hintR.current.dataset.on = right;
  };

  const endDrag = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const el = cardRef.current;
    if (el) {
      // Yay (spring) kartı geri bırakırken bir kez sıyırıp dönüyordu;
      // sönümlemeli geçiş aynı hissi zıplamadan veriyor.
      el.style.transition = 'transform 220ms var(--ease-out)';
      el.style.transform = '';
      window.setTimeout(() => {
        if (el) el.style.transition = '';
      }, 240);
    }
    if (el) el.dataset.drag = 'false';
    if (hintL.current) hintL.current.dataset.on = 'false';
    if (hintR.current) hintR.current.dataset.on = 'false';
    if (Math.abs(d.dx) > 88) grade(d.dx > 0);
  };

  if (!word) return null;

  return (
    <div className="cards">
      <div className="swipe-hints" aria-hidden="true">
        <span className="swipe-hint left" ref={hintL} data-on="false">
          tekrar
        </span>
        <span className="swipe-hint right" ref={hintR} data-on="false">
          biliyorum
        </span>
      </div>
      <div className="deck">
        <div className="card-shell" ref={cardRef} data-drag="false">
        <div
          ref={flipRef}
          role="button"
          tabIndex={0}
          className="flip"
          data-flipped={flipped}
          onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={() => {
          if (drag.current.moved) {
            drag.current.moved = false;
            return;
          }
          setFlipped((f) => !f);
          sfx('flip');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setFlipped((f) => !f);
            sfx('flip');
          }
        }}
        aria-label={flipped ? t('session.cardBack') : t('session.cardFront')}
      >
        {/*
          * `key={i}`: sonraki karta geçerken iç kart sıfırdan kurulur.
          * Aksi hâlde `setFlipped(false)` geri dönüş animasyonunu başlatıyor,
          * o 420 ms boyunca *yeni* kelimenin arka yüzü görünüyordu.
          */}
        <div className="flip-inner" key={i}>
          <div className="flip-face front">
            <span className="tag">
              {posLabel(word.pos, lang)} · <span className="num">{i + 1}/{keys.length}</span>
            </span>
            <div className="flip-word">{word.w}</div>
            {info?.ipa ? <div className="ipa dim">/{info.ipa}/</div> : null}
            <span className="flip-hint">
              <Icon name="refresh" size={13} /> {t('session.flip')}
            </span>
          </div>
          <div className="flip-face back">
            <span className="tag tag-soft">{posLabel(word.pos, lang)}</span>
            <div className="flip-word-small">{word.w}</div>
            <div className="flip-tr">{word.tr}</div>
            {word.syn ? <div className="flip-syn">≈ {word.syn}</div> : null}
            {info?.def ? (
              <div className="flip-def">
                {info.def.length > 170 ? `${info.def.slice(0, 167).trim()}…` : info.def}
              </div>
            ) : null}
            <button
              type="button"
              className="flip-say"
              onClick={(e) => {
                e.stopPropagation();
                onSay(word.w);
              }}
              aria-label={t('dict.listenWord')}
            >
              <Icon name="volume" size={15} /> {t('dict.listen')}
            </button>
          </div>
        </div>
        </div>
        </div>
      </div>

      <div className="card-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => grade(false)}
          disabled={!flipped}
        >
          <Icon name="refresh" size={17} /> {t('session.again')}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => grade(true)}
          disabled={!flipped}
        >
          <Icon name="check" size={17} /> {t('session.know')}
        </button>
      </div>
      <p className="match-note kbd-note">
        {flipped ? t('session.cardsNote') : t('session.cardsFlipFirst')}
      </p>
    </div>
  );
}

/* ------------------------------ eşleştirme ----------------------------- */

function MatchStep({
  keys,
  byKey,
  onPair,
  onDone,
}: {
  keys: string[];
  byKey: Map<string, Word>;
  onPair: (key: string, ok: boolean) => void;
  onDone: (perfect: boolean) => void;
}) {
  const left = useMemo(() => {
    const seen = new Set<string>();
    return shuffle(keys.map((k) => byKey.get(k)).filter(Boolean) as Word[]).filter((w) => {
      const label = promptSense(w.tr).toLocaleLowerCase('tr');
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  }, [keys, byKey]);
  const right = useMemo(
    () => shuffle(left.map((w) => ({ key: w.key, label: promptSense(w.tr) }))),
    [left],
  );

  const t = useT();
  const [sel, setSel] = useState<{ side: 'l' | 'r'; key: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [bad, setBad] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const doneRef = useRef(false);
  /*
   * Hatalı eşleşmeden sonra 420 ms'lik bir toparlanma var. Bu sayaç,
   * o bekleme sırasında kullanıcı yeni bir karoya dokunursa eski
   * zamanlayıcının seçimi silmesini engeller: aksi hâlde hızlı oynayan
   * oyuncunun seçimi kayboluyor ve tahta "takılmış" gibi görünüyordu.
   */
  const tapSeq = useRef(0);

  const tap = (side: 'l' | 'r', key: string) => {
    if (matched.has(key)) return;
    tapSeq.current += 1;
    sfx('tap');
    if (!sel) {
      setSel({ side, key });
      return;
    }
    if (sel.side === side) {
      setSel({ side, key });
      return;
    }
    if (sel.key === key) {
      const next = new Set(matched).add(key);
      setMatched(next);
      setSel(null);
      onPair(key, true);
      sfx('match');
      buzz(10);
      if (next.size >= left.length && !doneRef.current) {
        doneRef.current = true;
        window.setTimeout(() => onDone(mistakes === 0), 380);
      }
    } else {
      setBad(key);
      setMistakes((m) => m + 1);
      // Ses/titreşim üst bileşende: burada tekrar çalınmıyor.
      onPair(sel.key, false);
      const token = tapSeq.current;
      window.setTimeout(() => {
        setBad(null);
        // Kullanıcı bu arada yeni bir karo seçtiyse onu silme.
        if (tapSeq.current === token) setSel(null);
      }, 420);
    }
  };

  return (
    <div className="match">
      <div className="match-cols">
        <div className="match-col">
          {left.map((w, i) => (
            <button
              key={`l-${w.key}`}
              type="button"
              className="match-tile"
              style={{ '--i': i } as React.CSSProperties}
              data-sel={sel?.side === 'l' && sel.key === w.key}
              data-state={matched.has(w.key) ? 'done' : bad === w.key ? 'wrong' : undefined}
              onClick={() => tap('l', w.key)}
            >
              {w.w}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((o, i) => (
            <button
              key={`r-${o.key}`}
              type="button"
              className="match-tile"
              style={{ '--i': i + 0.5 } as React.CSSProperties}
              data-sel={sel?.side === 'r' && sel.key === o.key}
              data-state={matched.has(o.key) ? 'done' : bad === o.key ? 'wrong' : undefined}
              onClick={() => tap('r', o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <p className="match-note">
        {mistakes === 0 ? t('session.matchPerfect') : t('session.matchMisses', { n: mistakes })}
      </p>
    </div>
  );
}

