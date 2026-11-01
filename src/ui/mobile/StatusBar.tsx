/**
 * Status Bar Component (Mobile)
 * Displays time, network, and battery indicators
 * Always visible at top of mobile screen
 */

import { useState, useEffect } from 'react';
import './StatusBar.css';

export default function StatusBar() {
  const [time, setTime] = useState('');

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      setTime(`${displayHours}:${displayMinutes} ${ampm}`);
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="status-bar">
      {/* Left side: Time */}
      <div className="status-bar__left">
        <span className="status-bar__time">{time}</span>
      </div>

      {/* Right side: Indicators */}
      <div className="status-bar__right">
        {/* Network signal (fake - always full) */}
        <span className="status-bar__icon" role="img" aria-label="Network">
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="8" width="3" height="6" rx="1" fill="white"/>
            <rect x="5" y="5" width="3" height="9" rx="1" fill="white"/>
            <rect x="10" y="2" width="3" height="12" rx="1" fill="white"/>
            <rect x="15" y="0" width="3" height="14" rx="1" fill="white"/>
          </svg>
        </span>

        {/* Battery (fake - always full) */}
        <span className="status-bar__icon" role="img" aria-label="Battery">
          <svg width="27" height="14" viewBox="0 0 27 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="21" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
            <rect x="24" y="4.5" width="3" height="5" rx="1" fill="white"/>
            <rect x="3" y="3" width="15" height="8" rx="1" fill="white"/>
          </svg>
        </span>
      </div>
    </div>
  );
}
