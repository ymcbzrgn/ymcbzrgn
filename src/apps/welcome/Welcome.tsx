/**
 * Welcome – first-visit onboarding window.
 *
 * Opens automatically for new visitors (see Desktop.tsx), and any time later from the taskbar
 * logo, the desktop widget or the pixel assistant. Closing it marks the visitor as onboarded.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../../os/store';
import { toggleLang, useT } from '../../os/i18n/full';
import { useLaunch, type LaunchTarget } from '../../os/hooks/useLaunch';
import { useIsMobile } from '../../os/hooks/useDeviceType';
import { openSimpleView } from '../../os/view';
import { requestTour } from '../../ui/pet/petEvents';
import { openStory } from '../../os/events';
import { PROFILE } from '../../os/content/profile';
import { forGuest } from '../../os/personal';
import Sprite, { type SpriteAnim } from '../../ui/mascot/Sprite';
import './Welcome.css';

interface WelcomeProps {
  windowId?: string;
}

// The pixel twin waves, then idles, glances around, stretches... so the window feels alive.
const SEQUENCE: [SpriteAnim, number][] = [
  ['wave', 3400],
  ['idle', 5200],
  ['look', 2400],
  ['idle', 4200],
  ['wave', 2600],
  ['idle', 7000],
  ['stretch', 2800],
  ['idle', 6000],
];

export default function Welcome({ windowId }: WelcomeProps) {
  const t = useT();
  const isMobile = useIsMobile();
  const launch = useLaunch();
  const closeWindow = useStore((s) => s.closeWindow);
  const updateWindowTitle = useStore((s) => s.updateWindowTitle);

  const [step, setStep] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Closing the window (by any means) counts as having been welcomed.
  useEffect(
    () => () => {
      useStore.getState().updateSettings({ onboarded: true });
    },
    []
  );

  // The window title was set when it opened; follow language switches.
  useEffect(() => {
    if (windowId) updateWindowTitle(windowId, t('welcomeTitle'));
  }, [t, windowId, updateWindowTitle]);

  // Walk through the sprite sequence.
  useEffect(() => {
    const timer = window.setTimeout(() => setStep((i) => (i + 1) % SEQUENCE.length), SEQUENCE[step][1]);
    return () => window.clearTimeout(timer);
  }, [step]);
  const [anim] = SEQUENCE[step];

  const close = () => {
    if (windowId) closeWindow(windowId);
  };

  const go = (target: LaunchTarget) => {
    launch(target);
    close();
  };

  const goSimple = () => {
    close();
    openSimpleView();
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: the address is visible and selectable anyway */
    }
  };

  return (
    <div className="welcome">
      <div className="welcome__layout">
        <div className="welcome__stage">
          <div className="welcome__bubble">{forGuest(t('petHelloFor'), t('petHello'))}</div>
          <div className="welcome__sprite welcome__sprite--wide">
            <Sprite anim={anim} scale={7} />
          </div>
          <div className="welcome__sprite welcome__sprite--narrow">
            <Sprite anim={anim} scale={4} />
          </div>
          <div className="welcome__floor" />
        </div>

        <div className="welcome__body">
          <button type="button" className="welcome__lang" onClick={toggleLang} aria-label={t('langSwitchLabel')} title={t('langSwitchLabel')}>
            {t('langOther')}
          </button>

          <h1 className="welcome__title">{forGuest(t('welcomeGreetingFor'), t('welcomeGreeting'))}</h1>
          <p className="welcome__role">
            {t('role')} · {t('tagline')}
          </p>
          <p className="welcome__chip">{t('currentRole')}</p>
          <p className="welcome__intro">{t(isMobile ? 'welcomeIntroTouch' : 'welcomeIntro')}</p>

          <div className="welcome__cta">
            <button type="button" className="welcome__btn welcome__btn--primary" onClick={() => go('cv')}>
              {t('ctaCv')}
            </button>
            <button type="button" className="welcome__btn welcome__btn--secondary" onClick={() => go('projects')}>
              {t('ctaProjects')}
            </button>
            {isMobile && (
              <button
                type="button"
                className="welcome__btn welcome__btn--secondary"
                onClick={() => {
                  close();
                  window.setTimeout(openStory, 200);
                }}
              >
                ▶ {t('ctaStory')}
              </button>
            )}
            <button type="button" className="welcome__btn welcome__btn--secondary" onClick={() => go('recruiter')}>
              🧾 {t('ctaGlance')}
            </button>
            {!isMobile && (
              <button
                type="button"
                className="welcome__btn welcome__btn--secondary"
                onClick={() => {
                  close();
                  window.setTimeout(requestTour, 250); // after the window is gone
                }}
              >
                🧭 {t('ctaTour')}
              </button>
            )}
            <button
              type="button"
              className="welcome__btn welcome__btn--secondary"
              onClick={() => setContactOpen((v) => !v)}
              aria-expanded={contactOpen}
            >
              {t('ctaContact')}
            </button>
            <button type="button" className="welcome__btn welcome__btn--ghost" onClick={goSimple}>
              {t('ctaSimple')}
            </button>
            {!isMobile && (
              <button type="button" className="welcome__btn welcome__btn--ghost" onClick={close}>
                {t('ctaExplore')} →
              </button>
            )}
          </div>

          {contactOpen && (
            <div className="welcome__contact">
              <p>{t('contactIntro')}</p>
              <div className="welcome__contact-row">
                <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
                <button type="button" className="welcome__copy" onClick={copyEmail}>
                  {copied ? t('copied') : t('copy')}
                </button>
              </div>
              <div className="welcome__contact-row">
                <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
                <a href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </div>
            </div>
          )}

          {!isMobile && <p className="welcome__tip">{t('welcomeTip')}</p>}
        </div>
      </div>
    </div>
  );
}
