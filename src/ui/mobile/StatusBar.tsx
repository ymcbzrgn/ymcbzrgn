/**
 * Status Bar Component (Mobile)
 * Time, network and battery, always at the top of the phone screen. Everything but the time is
 * decoration. `clear` lets the wallpaper show through (lock screen, home screen).
 */

import { useState, useEffect } from 'react';
import { useLang } from '../../os/i18n';
import './StatusBar.css';

interface Props {
  clear?: boolean;
}

export default function StatusBar({ clear = false }: Props) {
  const lang = useLang();
  const [now, setNow] = useState(() => new Date());

  // the minute hand is all that matters here
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  // 12-hour clock in English, 24-hour in Turkish
  const time = new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: lang !== 'tr',
  }).format(now);

  return (
    <div className={`status-bar${clear ? ' status-bar--clear' : ''}`}>
      <div className="status-bar__left">
        <span className="status-bar__time">{time}</span>
      </div>

      <div className="status-bar__right">
        {/* Network signal (fake - always full) */}
        <span className="status-bar__icon" role="img" aria-label="Network">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="8" width="3" height="6" rx="1" fill="white" />
            <rect x="5" y="5" width="3" height="9" rx="1" fill="white" />
            <rect x="10" y="2" width="3" height="12" rx="1" fill="white" />
            <rect x="15" y="0" width="3" height="14" rx="1" fill="white" />
          </svg>
        </span>

        {/* Battery (fake - always full) */}
        <span className="status-bar__icon" role="img" aria-label="Battery">
          <svg width="27" height="14" viewBox="0 0 27 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="21" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
            <rect x="24" y="4.5" width="3" height="5" rx="1" fill="white" />
            <rect x="3" y="3" width="15" height="8" rx="1" fill="white" />
          </svg>
        </span>
      </div>
    </div>
  );
}
