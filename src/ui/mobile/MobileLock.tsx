/**
 * The phone's lock screen: the first thing a visitor on a phone sees. A real clock, the pixel twin and
 * a few "notifications" that are the whole pitch in ten seconds: the current job, the 30-second story,
 * the CV, the podium finishes. Tapping one opens it straight away; swiping up (or the Open button)
 * goes to the home screen.
 *
 * It is shown once per visit (and again for a personal ?for= link); after that the phone starts at the
 * home screen.
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { toggleLang, useLang, useT } from '../../os/i18n/full';
import { HIGHLIGHTS, MEDALS, PITCH, ROLES } from '../../os/content/career';
import { forGuest } from '../../os/personal';
import { RESUME_PATH } from '../../os/view';
import Sprite, { type SpriteAnim } from '../mascot/Sprite';
import PixelIcon, { type IconName } from './PixelIcon';
import StatusBar from './StatusBar';
import './MobileLock.css';

/** What a tap on a notification should open once the phone is unlocked. */
export type LockAction = 'glance' | 'story' | 'cv' | 'career';

interface Props {
  onUnlock(action?: LockAction): void;
}

// the twin waves, idles and glances around while the visitor reads
const SEQUENCE: [SpriteAnim, number][] = [
  ['wave', 3200],
  ['idle', 5000],
  ['look', 2400],
  ['idle', 4200],
  ['stretch', 2600],
  ['idle', 6000],
];

const pad2 = (n: number) => String(n).padStart(2, '0');

export default function MobileLock({ onUnlock }: Props) {
  const t = useT();
  const lang = useLang();
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setStep((i) => (i + 1) % SEQUENCE.length), SEQUENCE[step][1]);
    return () => window.clearTimeout(timer);
  }, [step]);
  const [anim] = SEQUENCE[step];

  const handlers = useSwipeable({
    onSwipedUp: () => onUnlock(),
    delta: 50,
    trackMouse: true,
  });

  // big digits without AM/PM (the status bar has the full time)
  const hours = lang === 'tr' ? pad2(now.getHours()) : String(now.getHours() % 12 || 12);
  const clock = `${hours}:${pad2(now.getMinutes())}`;
  const date = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now);

  const job = ROLES[0];
  const cards: { id: LockAction; icon: IconName; head: string; title: string; body: string }[] = [
    { id: 'glance', icon: 'career', head: job.org, title: job.title[lang], body: PITCH[lang] },
    { id: 'story', icon: 'story', head: t('lockStoryHead'), title: t('ctaStory'), body: t('lockStoryBody') },
    { id: 'cv', icon: 'cv', head: t('lockCvHead'), title: t('lockCvTitle'), body: t('lockCvBody') },
    { id: 'career', icon: 'achievements', head: t('lockWinHead'), title: `${MEDALS[0].result[lang]} · ${MEDALS[0].name}`, body: HIGHLIGHTS[2].text[lang] },
  ];

  return (
    <motion.section
      className="lock"
      aria-label={t('lockLabel')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { y: '-100%', opacity: 0.4 }}
      transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
      {...handlers}
    >
      <StatusBar clear />

      <div className="lock__top">
        <button type="button" className="lock__lang" onClick={toggleLang} aria-label={t('langSwitchLabel')} title={t('langSwitchLabel')}>
          {t('langOther')}
        </button>
      </div>

      <div className="lock__time">
        <div className="lock__date">{date}</div>
        <div className="lock__clock" aria-label={clock}>
          {clock}
        </div>
      </div>

      <div className="lock__stage">
        <div className="lock__twin lock__twin--l">
          <Sprite anim={anim} scale={3} />
        </div>
        <div className="lock__twin lock__twin--s">
          <Sprite anim={anim} scale={2} />
        </div>
        <div className="lock__bubble">{forGuest(t('petHelloFor'), t('petHello'))}</div>
      </div>

      <ul className="lock__cards">
        {cards.map((c, i) => (
          <motion.li
            key={c.id}
            className="lock__item"
            initial={reduced ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 0.25 + i * 0.08, duration: 0.35 }}
          >
            <button type="button" className="lock-card" data-action={c.id} onClick={() => onUnlock(c.id)}>
              <PixelIcon name={c.icon} scale={1} className="lock-card__icon" />
              <span className="lock-card__text">
                <span className="lock-card__head">
                  <span>{c.head}</span>
                  <span>{t('lockNow')}</span>
                </span>
                <span className="lock-card__title">{c.title}</span>
                <span className="lock-card__body">{c.body}</span>
              </span>
            </button>
          </motion.li>
        ))}
      </ul>

      <div className="lock__bottom">
        <button type="button" className="lock__open" onClick={() => onUnlock()}>
          <span className="lock__chevron" aria-hidden="true" />
          {t('lockSlide')}
        </button>
        <a className="lock__plain" href={RESUME_PATH[lang]}>
          {t('appPlain')}
        </a>
      </div>
    </motion.section>
  );
}
