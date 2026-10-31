/**
 * Taskbar Component
 * Ubuntu×XP Desktop Portfolio
 *
 * Shows open windows, allows switching between them
 */

import { useState, useEffect } from 'react';
import { useWindows, useFocusedWindow, useWindowActions } from '@os/store';
import { getIconDisplay } from '../os/utils/iconMap';
import { useLang, useT } from '../os/i18n';
import { useLaunch } from '../os/hooks/useLaunch';
import { openSimpleView } from '../os/view';
import './Taskbar.css';

const MAX_VISIBLE_WINDOWS = 10;

export default function Taskbar() {
  const windows = useWindows();
  const focusedWindow = useFocusedWindow();
  const { focusWindow, restoreWindow } = useWindowActions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const lang = useLang();
  const t = useT();
  const launch = useLaunch();

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle taskbar item click
  const handleTaskbarItemClick = (windowId: string, windowState: string) => {
    // If minimized, restore it first
    if (windowState === 'minimized') {
      restoreWindow(windowId);
    }

    // Then focus it
    focusWindow(windowId);
  };

  // Filter and limit windows for display
  const visibleWindows = windows.slice(0, MAX_VISIBLE_WINDOWS);
  const hasOverflow = windows.length > MAX_VISIBLE_WINDOWS;

  return (
    <div className="taskbar">
      {/* Start Button / Branding */}
      <div className="taskbar__start">
        <button
          type="button"
          className="taskbar__logo taskbar__logo--button"
          onClick={() => launch('welcome')}
          title={t('welcomeTitle')}
          aria-label={t('welcomeTitle')}
        >
          ymcbzrgn
        </button>
      </div>

      {/* Window Switcher */}
      <div className="taskbar__windows">
        {visibleWindows.map((window) => {
          const isActive = focusedWindow?.id === window.id && window.state !== 'minimized';
          const isMinimized = window.state === 'minimized';

          return (
            <div
              key={window.id}
              className={`taskbar__item ${isActive ? 'taskbar__item--active' : ''} ${isMinimized ? 'taskbar__item--minimized' : ''}`}
              onClick={() => handleTaskbarItemClick(window.id, window.state)}
              title={window.title}
            >
              {window.icon && <span className="taskbar__item-icon">{getIconDisplay(window.icon)}</span>}
              <span className="taskbar__item-title">{window.title}</span>
            </div>
          );
        })}

        {/* Overflow indicator */}
        {hasOverflow && (
          <div className="taskbar__overflow" title={`+${windows.length - MAX_VISIBLE_WINDOWS} more windows`}>
            ...
          </div>
        )}
      </div>

      {/* System Tray / Clock */}
      <div className="taskbar__tray">
        <button
          type="button"
          className="taskbar__privacy"
          onClick={openSimpleView}
          title={t('ctaSimple')}
          aria-label={t('ctaSimple')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
            <rect x="2.25" y="1.75" width="11.5" height="12.5" rx="1.5" />
            <path d="M5 5.5h6M5 8h6M5 10.5h3.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="taskbar__privacy"
          onClick={() => window.open('/privacy.html', '_blank')}
          title="Privacy Policy"
          aria-label="Privacy Policy"
        >
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 0L0 3v4.5c0 4.14 2.99 8.01 7 8.5 4.01-.49 7-4.36 7-8.5V3L7 0z" fill="currentColor"/>
          </svg>
        </button>
        <div className="taskbar__time">
          {currentTime.toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
