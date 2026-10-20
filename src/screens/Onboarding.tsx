import { useState } from 'react';
import { Icon } from '../components/Icons';
import { Lockup } from '../components/Logo';
import { TILE_SIZE } from '../brand';
import { finishOnboarding } from '../lib/store';
import { navigate } from '../lib/router';
import { sfx } from '../lib/audio';
import { applyTheme } from '../lib/theme';
import { detectLang, makeT, type Lang, type MsgKey } from '../lib/i18n';
import type { Accent, ThemePref } from '../types';

const ACCENTS: { id: Accent; tr: string; en: string }[] = [
  { id: 'marker', tr: 'Mürekkep', en: 'Ink' },
  { id: 'pink', tr: 'Erik', en: 'Plum' },
  { id: 'mint', tr: 'Yosun', en: 'Moss' },
  { id: 'sun', tr: 'Oker', en: 'Ochre' },
];

const THEMES: { id: ThemePref; key: MsgKey; icon: 'sun' | 'moon' | 'monitor' }[] = [
  { id: 'light', key: 'set.light', icon: 'sun' },
  { id: 'dark', key: 'set.dark', icon: 'moon' },
  { id: 'auto', key: 'set.auto', icon: 'monitor' },
];

const STEPS = 4;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<Lang>(() => detectLang());
  const [goal, setGoal] = useState(20);
  const [accent, setAccent] = useState<Accent>('marker');
  const [theme, setTheme] = useState<ThemePref>('auto');

  const t = makeT(lang);

  const pickLang = (l: Lang) => {
    setLang(l);
    document.documentElement.lang = l;
    sfx('tap');
  };

  const finish = () => {
    finishOnboarding({ goal, accent, theme, lang });
    sfx('level');
    navigate('/', { replace: true });
  };

  const next = () => {
    setStep(step + 1);
    sfx('tap');
  };

  const goals = [
    { n: 10, label: t('onb.g1'), desc: t('onb.g1d') },
    { n: 20, label: t('onb.g2'), desc: t('onb.g2d') },
    { n: 30, label: t('onb.g3'), desc: t('onb.g3d') },
    { n: 50, label: t('onb.g4'), desc: t('onb.g4d') },
  ];

  const captions = [t('onb.cap0'), t('onb.cap1'), t('onb.cap2')];

  return (
    <div className="onb">
      <aside className="onb-side">
        <div className="onb-brand">
          <Lockup size={TILE_SIZE.onboarding} />
        </div>

        <div className="onb-art">
          <div className="onb-deck">
          <article className="word-card" aria-hidden="true">
            <div className="wc-top">
              <span className="wc-pos">{lang === 'tr' ? 'sıfat' : 'adjective'}</span>
              <span className="mastery-dots">
                {[1, 2, 3, 4, 5].map((i) => (
                  <i key={i} data-on={i <= 3} />
                ))}
              </span>
            </div>
            <div className="wc-word">resilient</div>
            <div className="wc-ipa ipa">/rɪˈzɪliənt/</div>
            <div className="wc-tr">dayanıklı, esnek</div>
            <div className="wc-foot">
              <span className="wc-def">able to recover quickly from difficulty</span>
            </div>
          </article>
          </div>
          <p className="onb-caption">{captions[Math.max(0, step - 1)]}</p>
        </div>

      </aside>

      <main className="onb-main">
        {/* Adım sayacı ilerleme çizgisinin yanında: eylemin hemen üstünde,
            ekranın dibinde değil. */}
        <div className="onb-top">
          <div className="onb-steps" aria-hidden="true">
            {Array.from({ length: STEPS }, (_, i) => (
              <i key={i} data-on={i <= step} />
            ))}
          </div>
          <span className="onb-count num" aria-label={`${step + 1} / ${STEPS}`}>
            {step + 1} / {STEPS}
          </span>
        </div>

        <div className="onb-content" key={`${step}-${lang}`}>
          {step === 0 && (
            <>
              <h1>{t('onb.langTitle')}</h1>
              <p className="onb-sub">{t('onb.langSub')}</p>
              <div className="lang-grid" role="group" aria-label={t('set.language')}>
                <button
                  type="button"
                  className="lang-opt"
                  aria-pressed={lang === 'tr'}
                  onClick={() => pickLang('tr')}
                >
                  <span className="lang-name">Türkçe</span>
                  <span className="lang-sample">Kelimeler birer adım.</span>
                  <span className="lang-code">TR</span>
                </button>
                <button
                  type="button"
                  className="lang-opt"
                  aria-pressed={lang === 'en'}
                  onClick={() => pickLang('en')}
                >
                  <span className="lang-name">English</span>
                  <span className="lang-sample">Words, one step at a time.</span>
                  <span className="lang-code">EN</span>
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1>{t('onb.title')}</h1>
              <p className="onb-sub">{t('onb.sub')}</p>
              <div className="onb-features">
                <Feature icon="target" title={t('onb.f1')} text={t('onb.f1t')} />
                <Feature icon="volume" title={t('onb.f2')} text={t('onb.f2t')} />
                <Feature icon="shield" title={t('onb.f3')} text={t('onb.f3t')} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1>{t('onb.goalTitle')}</h1>
              <p className="onb-sub">{t('onb.goalSub')}</p>
              <div className="goal-grid" role="group" aria-label={t('set.goal')}>
                {goals.map((g) => (
                  <button
                    key={g.n}
                    type="button"
                    className="goal-opt"
                    aria-pressed={goal === g.n}
                    onClick={() => {
                      setGoal(g.n);
                      sfx('tap');
                    }}
                  >
                    <b className="num">{g.n}</b>
                    <span className="go-lbl">{g.label}</span>
                    <span className="go-desc">{g.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1>{t('onb.accentTitle')}</h1>
              <p className="onb-sub">{t('onb.accentSub')}</p>
              <div className="onb-card">
                <div className="opt-group">
                  <span className="opt-label">{t('onb.accent')}</span>
                  <div className="accent-row">
                    {ACCENTS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="accent-opt"
                        aria-pressed={accent === a.id}
                        onClick={() => {
                          setAccent(a.id);
                          document.documentElement.dataset.accent = a.id;
                          sfx('tap');
                        }}
                      >
                        <span
                          className="swatch"
                          style={{ '--sw': `var(--tone-${a.id})` } as React.CSSProperties}
                        />
                        {lang === 'tr' ? a.tr : a.en}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="opt-group">
                  <span className="opt-label">{t('onb.look')}</span>
                  <div className="theme-grid">
                    {THEMES.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        className="theme-opt"
                        aria-pressed={theme === th.id}
                        onClick={() => {
                          setTheme(th.id);
                          applyTheme(th.id, accent);
                          sfx('tap');
                        }}
                      >
                        <span
                          className="tp"
                          style={
                            {
                              '--tp':
                                th.id === 'dark'
                                  ? '#151412'
                                  : th.id === 'light'
                                    ? '#f4f1e9'
                                    : 'linear-gradient(110deg,#f4f1e9 50%,#151412 50%)',
                            } as React.CSSProperties
                          }
                        />
                        <span className="row" style={{ gap: 5 }}>
                          <Icon name={th.icon} size={13} /> {t(th.key)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="onb-cta">
          {step < STEPS - 1 ? (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={next}>
                {t('onb.continue')}
                <Icon name="arrow-right" size={17} />
              </button>
              {step === 0 ? (
                <button type="button" className="onb-skip" onClick={finish}>
                  {t('onb.later')}
                </button>
              ) : (
                <button type="button" className="onb-skip" onClick={() => setStep(step - 1)}>
                  {t('common.back')}
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-accent btn-lg" onClick={finish}>
                {t('onb.begin')}
                <Icon name="arrow-right" size={17} />
              </button>
              <button type="button" className="onb-skip" onClick={() => setStep(step - 1)}>
                {t('common.back')}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: 'target' | 'volume' | 'shield';
  title: string;
  text: string;
}) {
  return (
    <div className="onb-feature">
      <span className="of-ico">
        <Icon name={icon} size={16} />
      </span>
      <span>
        <b>{title}</b>
        <span>{text}</span>
      </span>
    </div>
  );
}
