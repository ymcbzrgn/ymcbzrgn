/**
 * Taskbar tray extras: command palette, achievements and the sound switch.
 * Lazy, so none of it (and none of the sound code) is part of the main bundle; the tray reserves the
 * space for it, so nothing jumps when it arrives.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../../os/store';
import { useT } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { openPalette } from '../../os/events';
import { ACHIEVEMENT_IDS, ACH_RESET_EVENT, onUnlock, unlock, unlockedAt } from '../../os/achievements';
import { setSoundOn } from '../../os/sound/ctx';
import { sfx } from '../../os/sound/sfx';
import './TrayExtras.css';

const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

function useUnlockedCount() {
  const [n, setN] = useState(() => Object.keys(unlockedAt()).length);
  useEffect(() => {
    const refresh = () => setN(Object.keys(unlockedAt()).length);
    const off = onUnlock(refresh, 0);
    window.addEventListener(ACH_RESET_EVENT, refresh);
    return () => {
      off();
      window.removeEventListener(ACH_RESET_EVENT, refresh);
    };
  }, []);
  return n;
}

export default function TrayExtras() {
  const t = useT();
  const launch = useLaunch();
  const soundOn = useStore((s) => s.settings.soundOn === true);
  const count = useUnlockedCount();

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next); // inside the click: lets the browser start the audio context
    if (next) {
      unlock('sound');
      sfx('ok');
    }
  };

  return (
    <div className="tray-x">
      <button type="button" className="tray-x__btn tray-x__kbd" onClick={openPalette} title={t('trayPalette')} aria-label={t('trayPalette')}>
        {isMac ? '⌘K' : 'Ctrl K'}
      </button>
      <button type="button" className="tray-x__btn tray-x__trophy" onClick={() => launch('achievements')} title={t('trayAch')} aria-label={`${t('trayAch')}: ${count}/${ACHIEVEMENT_IDS.length}`}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          <path d="M4.5 2h7v4a3.5 3.5 0 0 1-7 0V2z" />
          <path d="M4.5 3.5H2.5v1a2 2 0 0 0 2 2M11.5 3.5h2v1a2 2 0 0 1-2 2M8 9.5V12M5.5 14h5" />
        </svg>
        <span className="tray-x__count">{count}</span>
      </button>
      <button type="button" className="tray-x__btn" onClick={toggleSound} title={soundOn ? t('traySoundOn') : t('traySoundOff')} aria-label={soundOn ? t('traySoundOn') : t('traySoundOff')} aria-pressed={soundOn}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          <path d="M2.5 6v4h2.6L9 13V3L5.1 6H2.5z" fill="currentColor" fillOpacity="0.25" />
          {soundOn ? <path d="M11 5.5a3.6 3.6 0 0 1 0 5M12.8 3.7a6.2 6.2 0 0 1 0 8.6" /> : <path d="M11.2 6l3 4M14.2 6l-3 4" />}
        </svg>
      </button>
    </div>
  );
}
