/**
 * DesktopWidget – the always-there intro card in the top-right corner of the desktop.
 *
 * Clock + greeting, the pixel twin's portrait, name/role and one-click shortcuts. Hidden on small
 * screens (CSS) and when the visitor dismisses it; Settings brings it back.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../../os/store';
import { useLang, useT, type StringKey } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { PROFILE } from '../../os/content/profile';
import bustUrl from '../../assets/sprites/mascot-bust.png';
import './DesktopWidget.css';

/** Re-render once a minute, right after the minute changes. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

function greetingKey(hour: number): StringKey {
  if (hour >= 5 && hour < 12) return 'greetMorning';
  if (hour >= 12 && hour < 18) return 'greetAfternoon';
  if (hour >= 18 && hour < 22) return 'greetEvening';
  return 'greetNight';
}

export default function DesktopWidget() {
  const t = useT();
  const lang = useLang();
  const launch = useLaunch();
  const hidden = useStore((s) => s.settings.widgetHidden);
  const now = useMinuteClock();

  if (hidden) return null;

  const locale = lang === 'tr' ? 'tr-TR' : 'en-GB';
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <aside className="desktop-widget" aria-label={PROFILE.name}>
      <button
        type="button"
        className="desktop-widget__close"
        onClick={() => useStore.getState().updateSettings({ widgetHidden: true })}
        title={t('widgetHide')}
        aria-label={t('widgetHide')}
      >
        ×
      </button>

      <div className="desktop-widget__clock">
        <span className="desktop-widget__time">{time}</span>
        <span className="desktop-widget__date">
          {t(greetingKey(now.getHours()))} · {date}
        </span>
      </div>

      <div className="desktop-widget__who">
        <img className="desktop-widget__avatar" src={bustUrl} width={72} height={72} alt="" />
        <div className="desktop-widget__text">
          <strong className="desktop-widget__name">{PROFILE.name}</strong>
          <span className="desktop-widget__role">{t('role')}</span>
          <span className="desktop-widget__company">{PROFILE.company}</span>
        </div>
      </div>

      <div className="desktop-widget__links">
        <button type="button" className="desktop-widget__link" onClick={() => launch('cv')}>
          <span aria-hidden="true">📄</span> CV
        </button>
        <button type="button" className="desktop-widget__link" onClick={() => launch('projects')}>
          <span aria-hidden="true">💻</span> {t('ctaProjects')}
        </button>
        <a className="desktop-widget__link" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">🐙</span> GitHub
        </a>
        <a className="desktop-widget__link" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
          <span aria-hidden="true">💼</span> LinkedIn
        </a>
      </div>
    </aside>
  );
}
