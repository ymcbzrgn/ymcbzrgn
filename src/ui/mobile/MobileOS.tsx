/**
 * MOBILE-ONLY Component
 *
 * Mobile OS Main Component - orchestrates mobile UI experience.
 * This component is never rendered on desktop (>=768px) - see Desktop instead.
 *
 * Features:
 * - App Launcher (iOS-style home screen with grid layout)
 * - Fullscreen Apps (with MobileAppShell container)
 * - App Switcher (multitasking/recent apps view)
 * - Custom event bus for app opening (mobile:openApp)
 * - State management for mobile navigation (launcher/app/switcher)
 */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useVFSActions, useVFSNodes } from '../../os/store';
import type { VFSNode } from '../../os/types';
import type { MobileOpenAppDetail } from '../../os/hooks/useAppOpener';
import MobileLauncher from './MobileLauncher';
import MobileAppShell from './MobileAppShell';
import MobileAppSwitcher from './MobileAppSwitcher';
import AppLoader from '../../apps/appLoader';
import './MobileOS.css';

type MobileView = 'launcher' | 'app' | 'switcher';

interface OpenApp {
  id: string;
  node: VFSNode;
  windowId: string;
  appId: string;
}

export default function MobileOS() {
  const [currentView, setCurrentView] = useState<MobileView>('launcher');
  const [openApps, setOpenApps] = useState<OpenApp[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const { loadVFS } = useVFSActions();
  const vfsNodes = useVFSNodes();

  // DEBUG: Log MobileOS mount
  useEffect(() => {
    console.log('[MobileOS] 🚀 MOUNTED', {
      initialView: currentView,
      timestamp: new Date().toISOString(),
    });
    return () => {
      console.log('[MobileOS] 💀 UNMOUNTED', {
        timestamp: new Date().toISOString(),
      });
    };
  }, []);

  // DEBUG: Log currentView changes
  useEffect(() => {
    console.log('[MobileOS] 👁️ currentView CHANGED', {
      currentView,
      activeAppId,
      openAppsCount: openApps.length,
      timestamp: new Date().toISOString(),
    });
  }, [currentView, activeAppId, openApps.length]);

  // Load VFS on mount (same as Desktop.tsx for feature parity)
  useEffect(() => {
    loadVFS();
  }, [loadVFS]);

  // Get active app
  const activeApp = openApps.find((app) => app.id === activeAppId);

  // DEBUG: Log active app
  useEffect(() => {
    if (activeApp) {
      console.log('[MobileOS] 🎯 activeApp SET', {
        appId: activeApp.appId,
        windowId: activeApp.windowId,
        nodeName: activeApp.node.name,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('[MobileOS] ❌ activeApp is NULL', {
        timestamp: new Date().toISOString(),
      });
    }
  }, [activeApp]);

  // Open app from launcher
  const handleAppOpen = useCallback(
    (node: VFSNode) => {
      console.log('[MobileOS] 📱 handleAppOpen CALLED', {
        nodeName: node.name,
        nodeId: node.id,
        nodeType: node.type,
        timestamp: new Date().toISOString(),
      });

      // Check if app already open
      const existingApp = openApps.find((app) => app.node.id === node.id);
      if (existingApp) {
        // Focus existing app
        console.log('[MobileOS] 🔄 App already open, focusing', {
          appId: existingApp.id,
        });
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
      let meta: Record<string, any> = {};

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
        meta.url = node.targetUrl || '';
      } else if (node.type === 'file' && node.mimeType === 'text/plain') {
        appId = 'text-viewer';
      } else if (node.type === 'file' && node.mimeType === 'text/markdown') {
        appId = 'markdown-viewer';
      } else if (node.type === 'link') {
        // Internal links (same-origin) → Browser app
        appId = 'browser';
        meta.url = node.targetUrl;
      } else if (node.type === 'app') {
        appId = node.appId || 'placeholder';
      } else if (node.mimeType === 'application/x-legacy-site') {
        // Legacy site easter egg
        appId = 'browser';
        meta.url = node.targetUrl || '/legacy/index.html';
      }

      // Add to open apps
      const newApp: OpenApp = {
        id: windowId,
        node,
        windowId,
        appId, // Store calculated appId
      };

      console.log('[MobileOS] ✅ Creating new app instance', {
        windowId,
        appId,
        nodeName: node.name,
        newOpenAppsLength: openApps.length + 1,
        timestamp: new Date().toISOString(),
      });

      setOpenApps([...openApps, newApp]);
      setActiveAppId(windowId);
      setCurrentView('app');

      console.log('[MobileOS] 🎬 State updates dispatched', {
        willSetActiveAppId: windowId,
        willSetCurrentView: 'app',
        timestamp: new Date().toISOString(),
      });
    },
    [openApps, setOpenApps, setActiveAppId, setCurrentView]
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

  // Listen for mobile:openApp events (from FileExplorer, etc.)
  useEffect(() => {
    const handleMobileOpenApp = (event: Event) => {
      console.log('[MobileOS] 📥 Received mobile:openApp event', {
        event,
        timestamp: new Date().toISOString(),
      });

      const customEvent = event as CustomEvent<MobileOpenAppDetail>;
      const { nodeId } = customEvent.detail;

      console.log('[MobileOS] 🔍 Event detail', {
        detail: customEvent.detail,
        nodeId,
        vfsNodesKeys: Object.keys(vfsNodes),
      });

      // Get node from VFS
      const node = nodeId ? vfsNodes[nodeId] : null;
      if (!node) {
        console.error('[MobileOS] ❌ Cannot open app: node not found', {
          nodeId,
          availableNodes: Object.keys(vfsNodes),
        });
        return;
      }

      console.log('[MobileOS] ✅ Node found, calling handleAppOpen', {
        node,
      });

      // Use existing handleAppOpen logic
      handleAppOpen(node);
    };

    console.log('[MobileOS] 👂 Adding mobile:openApp event listener');
    window.addEventListener('mobile:openApp', handleMobileOpenApp);

    return () => {
      console.log('[MobileOS] 🗑️ Removing mobile:openApp event listener');
      window.removeEventListener('mobile:openApp', handleMobileOpenApp);
    };
  }, [vfsNodes, handleAppOpen]);

  // DEBUG: Log before render
  console.log('[MobileOS] 🎨 RENDERING', {
    currentView,
    activeAppId,
    openAppsCount: openApps.length,
    activeAppExists: !!activeApp,
    activeAppDetails: activeApp
      ? {
          appId: activeApp.appId,
          windowId: activeApp.windowId,
          nodeName: activeApp.node.name,
        }
      : null,
    timestamp: new Date().toISOString(),
  });

  return (
    <div className="mobile-os">
      <AnimatePresence>
        {/* Launcher */}
        {currentView === 'launcher' &&
          (() => {
            console.log('[MobileOS] 🚀 Rendering MobileLauncher');
            return <MobileLauncher key="launcher" onAppOpen={handleAppOpen} />;
          })()}

        {/* Active App */}
        {currentView === 'app' &&
          activeApp &&
          (() => {
            console.log('[MobileOS] 📱 Rendering MobileAppShell + AppLoader', {
              appId: activeApp.appId,
              windowId: activeApp.windowId,
              nodeName: activeApp.node.name,
              nodeId: activeApp.node.id,
            });
            return (
              <MobileAppShell
                key={`app-${activeApp.id}`}
                onClose={handleAppShellClose}
                appTitle={activeApp.node.name}
              >
                <AppLoader
                  appId={activeApp.appId}
                  windowId={activeApp.windowId}
                  nodeId={activeApp.node.id}
                  {...(activeApp.appId === 'pdf-viewer'
                    ? { fileUrl: activeApp.node.targetUrl || '' }
                    : {})}
                  {...(activeApp.appId === 'browser'
                    ? { url: activeApp.node.targetUrl || '' }
                    : {})}
                />
              </MobileAppShell>
            );
          })()}

        {/* Active App - NULL CHECK */}
        {currentView === 'app' &&
          !activeApp &&
          (() => {
            console.error('[MobileOS] ❌❌❌ currentView is "app" but activeApp is NULL!', {
              currentView,
              activeAppId,
              openApps,
              timestamp: new Date().toISOString(),
            });
            return null;
          })()}

        {/* App Switcher */}
        {currentView === 'switcher' &&
          (() => {
            console.log('[MobileOS] 🔄 Rendering MobileAppSwitcher');
            return (
              <MobileAppSwitcher
                key="switcher"
                openApps={openApps}
                onAppFocus={handleAppFocus}
                onAppClose={handleAppClose}
                onCloseAll={handleCloseAll}
                onDismiss={handleDismissSwitcher}
              />
            );
          })()}
      </AnimatePresence>

      {/* Swipe-up gesture trigger (invisible) */}
      {currentView !== 'switcher' && (
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
