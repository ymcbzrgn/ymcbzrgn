/**
 * Taskbar Component
 * Ubuntu×XP Desktop Portfolio
 *
 * Shows open windows, allows switching between them
 */

import { useState, useEffect } from 'react';
import { useWindows, useFocusedWindow, useWindowActions } from '@os/store';
import { getIconDisplay } from '../os/utils/iconMap';
import './Taskbar.css';

const MAX_VISIBLE_WINDOWS = 10;

export default function Taskbar() {
  const windows = useWindows();
  const focusedWindow = useFocusedWindow();
  const { focusWindow, restoreWindow } = useWindowActions();
  const [currentTime, setCurrentTime] = useState(new Date());

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
        <span className="taskbar__logo">ymcbzrgn</span>
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
          className="taskbar__privacy"
          onClick={() => window.open('/privacy.html', '_blank', 'noopener,noreferrer')}
          title="Privacy Policy"
          aria-label="Privacy Policy"
        >
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 0L0 3v4.5c0 4.14 2.99 8.01 7 8.5 4.01-.49 7-4.36 7-8.5V3L7 0z" fill="currentColor"/>
          </svg>
        </button>
        <div className="taskbar__time">
          {currentTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
