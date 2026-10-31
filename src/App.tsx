/**
 * Root Application Component
 * Ubuntu×XP Desktop Portfolio with Adaptive Mobile OS
 * Detects device type and renders appropriate UI:
 * - Mobile (< 768px): MobileOS (launcher, fullscreen apps, gestures)
 * - Desktop (>= 768px): Desktop (windows, taskbar, wallpaper)
 */

import { lazy, Suspense, useEffect } from 'react';
import './App.css';
import Desktop from './ui/Desktop';
import { useIsMobile } from './os/hooks/useDeviceType';
import { useThemeManager } from './os/hooks/useThemeManager';
import { useLang } from './os/i18n';
import { useSimpleView } from './os/view';

// Mobile UI (and framer-motion with it) is only needed on small screens,
// so keep it out of the bundle every desktop visitor downloads.
const MobileOS = lazy(() => import('./ui/mobile/MobileOS'));
// The one-page alternative to the desktop (/#simple)
const SimpleView = lazy(() => import('./ui/simple/SimpleView'));

function App() {
  const isMobile = useIsMobile();
  const simpleView = useSimpleView();

  // Apply theme CSS variables
  useThemeManager();

  // Keep <html lang> in sync with the UI language (accessibility, hyphenation, screen readers)
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Prevent browser's default right-click context menu globally
  // This allows the OS simulation to handle right-clicks internally (e.g., Minesweeper flags)
  // Works across all browsers: Chrome, Firefox, Safari, Edge, Opera, IE9+
  useEffect(() => {
    if (simpleView) return; // the plain one-page view keeps the browser's own context menu

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false; // Extra safety for legacy browsers
    };

    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [simpleView]);

  return (
    <div className="app">
      {/* Adaptive UI: simple one-page view, Mobile OS or Desktop OS */}
      {simpleView ? (
        <Suspense fallback={null}>
          <SimpleView />
        </Suspense>
      ) : isMobile ? (
        <Suspense fallback={null}>
          <MobileOS />
        </Suspense>
      ) : (
        <Desktop />
      )}
    </div>
  );
}

export default App;
