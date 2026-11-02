/**
 * MOBILE-ONLY Component
 *
 * Mobile OS Main Component - orchestrates the phone experience. It is never rendered on a desktop
 * (>= 1024 px wide): Desktop does that.
 *
 * Views:
 * - lock       the lock screen: clock, the pixel twin and the pitch as "notifications" (once per visit)
 * - launcher   the home screen: widgets, apps, a dock with CV / email / LinkedIn / GitHub
 * - app        a fullscreen app inside MobileAppShell
 * - switcher   the recent apps (swipe up from the bottom edge)
 *
 * Apps are opened through the `mobile:openApp` event (useAppOpener / useLaunch), which keeps the apps
 * themselves free of any knowledge about the phone.
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVFSActions, useVFSNodes, useStore } from '../../os/store';
import { useLaunch } from '../../os/hooks/useLaunch';
import { guest } from '../../os/personal';
import { openStory } from '../../os/events';
import type { VFSNode } from '../../os/types';
import type { MobileOpenAppDetail } from '../../os/hooks/useAppOpener';
import MobileLock, { type LockAction } from './MobileLock';
import MobileLauncher from './MobileLauncher';
import MobileAppShell from './MobileAppShell';
import MobileAppSwitcher from './MobileAppSwitcher';
import AppLoader from '../../apps/appLoader';
import { dayPart } from './dayPart';
import './MobileOS.css';
import StoryHost from '../story/StoryHost';

type MobileView = 'lock' | 'launcher' | 'app' | 'switcher';

interface OpenApp {
  id: string;
  node: VFSNode;
  windowId: string;
  appId: string;
}

const UNLOCKED_KEY = 'yb-unlocked';

/**
 * The lock screen greets a visitor once per visit: the first time ever, and again when the link was
 * made for somebody (?for=). /?story goes straight to the story.
 */
function startsLocked(): boolean {
  if (new URLSearchParams(window.location.search).has('story')) return false;
  try {
    if (sessionStorage.getItem(UNLOCKED_KEY)) return false;
  } catch {
    /* storage blocked: lock once per page load */
  }
  return !useStore.getState().settings.onboarded || guest !== null;
}

export default function MobileOS() {
  const [currentView, setCurrentView] = useState<MobileView>(() => (startsLocked() ? 'lock' : 'launcher'));
  const [openApps, setOpenApps] = useState<OpenApp[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [part, setPart] = useState(() => dayPart());

  const { loadVFS } = useVFSActions();
  const vfsNodes = useVFSNodes();
  const launch = useLaunch();

  // Load VFS on mount (same as Desktop.tsx for feature parity)
  useEffect(() => {
    loadVFS();
  }, [loadVFS]);

  // the sky follows the clock
  useEffect(() => {
    const timer = window.setInterval(() => setPart(dayPart()), 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Get active app
  const activeApp = openApps.find((app) => app.id === activeAppId);

  const unlock = useCallback(
    (action?: LockAction) => {
      try {
        sessionStorage.setItem(UNLOCKED_KEY, '1');
      } catch {
        /* storage blocked */
      }
      useStore.getState().updateSettings({ onboarded: true });
      setCurrentView('launcher');
      if (action === 'cv') {
        launch('cv'); // right here, inside the tap: a PDF opened later may be taken for a pop-up
      } else if (action) {
        // once the lock screen has slid away
        window.setTimeout(() => {
          if (action === 'story') openStory();
          else launch(action === 'glance' ? 'recruiter' : 'career');
        }, 280);
      }
    },
    [launch]
  );

  // Open app from launcher
  const handleAppOpen = useCallback(
    (node: VFSNode) => {
      // Check if app already open
      const existingApp = openApps.find((app) => app.node.id === node.id);
      if (existingApp) {
        // Focus existing app
        setActiveAppId(existingApp.id);
        setCurrentView('app');
        return;
      }

      // External links: Open directly in new tab
      if (node.type === 'link' && node.targetUrl) {
        const url = node.targetUrl;
        if (url.startsWith('http://') || url.startsWith('https://')) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
      }

      // Create new app instance
      const windowId = `mobile-${node.id}-${Date.now()}`;

      // Determine app ID (same logic as Desktop.tsx for feature parity)
      let appId = 'placeholder';

      // IMPORTANT: Check special folders BEFORE generic folder check!
      if (node.id === 'projects') {
        // Projects folder → GitHub Projects viewer (not file-explorer!)
        appId = 'github-projects';
      } else if (node.type === 'folder') {
        // Other folders → File Explorer
        appId = 'file-explorer';
      } else if (node.type === 'file' && node.mimeType === 'application/pdf') {
        appId = 'pdf-viewer';
      } else if (node.type === 'file' && node.mimeType === 'application/x-browser-pdf') {
        appId = 'browser';
      } else if (node.type === 'file' && node.mimeType === 'text/plain') {
        appId = 'text-viewer';
      } else if (node.type === 'file' && node.mimeType === 'text/markdown') {
        appId = 'markdown-viewer';
      } else if (node.type === 'link') {
        // Internal links (same-origin) → Browser app
        appId = 'browser';
      } else if (node.type === 'app') {
        appId = node.appId || 'placeholder';
      } else if (node.mimeType === 'application/x-legacy-site') {
        // Legacy site easter egg
        appId = 'browser';
      }

      setOpenApps((apps) => [...apps, { id: windowId, node, windowId, appId }]);
      setActiveAppId(windowId);
      setCurrentView('app');
    },
    [openApps]
  );

  // Close app
  const handleAppClose = (appId: string) => {
    setOpenApps(openApps.filter((a) => a.id !== appId));

    // If closing active app, return to launcher
    if (appId === activeAppId) {
      setActiveAppId(null);
      setCurrentView('launcher');
    }
  };

  // Focus app (from switcher)
  const handleAppFocus = (appId: string) => {
    setActiveAppId(appId);
    setCurrentView('app');
  };

  // Close all apps
  const handleCloseAll = () => {
    setOpenApps([]);
    setActiveAppId(null);
    setCurrentView('launcher');
  };

  // Show app switcher (swipe up from bottom)
  const handleShowSwitcher = () => {
    setCurrentView('switcher');
  };

  // Dismiss app switcher
  const handleDismissSwitcher = () => {
    setCurrentView(activeAppId ? 'app' : 'launcher');
  };

  // Handle app shell close (back to launcher)
  const handleAppShellClose = () => {
    setCurrentView('launcher');
  };

  // Listen for mobile:openApp events (from FileExplorer, the launcher, the lock screen...)
  useEffect(() => {
    const handleMobileOpenApp = (event: Event) => {
      const { nodeId, appId: requestedAppId, title, icon, meta } = (event as CustomEvent<MobileOpenAppDetail>).detail;

      // Get node from VFS. Apps without a file/folder behind them (welcome, terminal, ...) are
      // launched by appId: wrap them in a virtual app node so the rest of the flow stays the same.
      let node: VFSNode | null = nodeId ? vfsNodes[nodeId] ?? null : null;
      if (!node && requestedAppId) {
        const now = Date.now();
        node = {
          id: `virtual-${requestedAppId}`,
          type: 'app',
          name: title,
          parentId: null,
          icon,
          appId: requestedAppId,
          createdAt: now,
          modifiedAt: now,
          ...(typeof meta?.fileUrl === 'string' ? { targetUrl: meta.fileUrl } : {}),
        };
      }
      if (!node) return;

      handleAppOpen(node);
    };

    window.addEventListener('mobile:openApp', handleMobileOpenApp);
    return () => window.removeEventListener('mobile:openApp', handleMobileOpenApp);
  }, [vfsNodes, handleAppOpen]);

  return (
    <div className="mobile-os" data-daypart={part} data-view={currentView}>
      <StoryHost />
      <AnimatePresence>
        {/* Lock screen */}
        {currentView === 'lock' && <MobileLock key="lock" onUnlock={unlock} />}

        {/* Home screen */}
        {currentView === 'launcher' && (
          <motion.div
            key="launcher"
            className="mobile-os__layer"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22 }}
          >
            <MobileLauncher onAppOpen={handleAppOpen} />
          </motion.div>
        )}

        {/* Active App */}
        {currentView === 'app' && activeApp && (
          <MobileAppShell key={`app-${activeApp.id}`} onClose={handleAppShellClose} appTitle={activeApp.node.name}>
            <AppLoader
              appId={activeApp.appId}
              windowId={activeApp.windowId}
              nodeId={activeApp.node.id}
              {...(activeApp.appId === 'pdf-viewer' ? { fileUrl: activeApp.node.targetUrl || '' } : {})}
              {...(activeApp.appId === 'browser' ? { url: activeApp.node.targetUrl || '' } : {})}
            />
          </MobileAppShell>
        )}

        {/* App Switcher */}
        {currentView === 'switcher' && (
          <MobileAppSwitcher
            key="switcher"
            openApps={openApps}
            onAppFocus={handleAppFocus}
            onAppClose={handleAppClose}
            onCloseAll={handleCloseAll}
            onDismiss={handleDismissSwitcher}
          />
        )}
      </AnimatePresence>

      {/* Swipe-up gesture trigger (invisible) */}
      {currentView !== 'switcher' && currentView !== 'lock' && (
        <div
          className="mobile-os__switcher-trigger"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch.clientY > window.innerHeight - 20) {
              // Swipe started from bottom edge
              handleShowSwitcher();
            }
          }}
        />
      )}
    </div>
  );
}
