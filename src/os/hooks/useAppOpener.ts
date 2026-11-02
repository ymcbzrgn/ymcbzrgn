/**
 * useAppOpener - Platform-aware app opening hook
 *
 * Abstracts Desktop vs Mobile app opening logic to provide a unified API
 * for all applications, regardless of the target platform.
 *
 * ## Architecture Decision: Why Custom Events for Mobile?
 *
 * **Desktop Path:**
 * - Apps → useAppOpener() → Zustand windowsSlice.openWindow()
 * - Window manager maintains windows array in global state
 * - Each window is a draggable/resizable container
 *
 * **Mobile Path:**
 * - Apps → useAppOpener() → Custom Event (mobile:openApp)
 * - MobileOS component listens to event
 * - Maintains local openApps state (fullscreen app stack)
 *
 * **Why NOT use Zustand for mobile?**
 * 1. **Different State Model:** Desktop has multiple windows, mobile has single fullscreen app
 * 2. **Decoupling:** Apps don't need to know about platform-specific state management
 * 3. **No Circular Dependencies:** Apps → Hook → Event Bus (clean) vs Apps → Store → Apps (circular)
 * 4. **Intentional Design:** Mobile and Desktop states never coexist (runtime switch via isMobile)
 *
 * **Trade-offs:**
 * - ✅ Clean abstraction: Apps are platform-agnostic
 * - ✅ No circular dependencies
 * - ✅ Type-safe with MobileOpenAppDetail interface
 * - ⚠️ Custom events bypass Zustand devtools (acceptable for mobile-only)
 * - ⚠️ State duplication (desktop: Zustand, mobile: local) - intentional, they never coexist
 *
 * @see MobileOS.tsx for event listener implementation
 * @see Desktop.tsx for window manager implementation
 */

import { useIsMobile } from './useDeviceType';
import { useWindowActions } from '../store';
import type { WindowState } from '../types';

export interface AppOpenParams {
  id: string;
  appId: string;
  nodeId?: string;
  title: string;
  icon?: string;
  bounds: WindowState['bounds'];
  state: WindowState['state'];
  meta?: Record<string, unknown>;
}

/**
 * Custom event for mobile app opening
 */
export interface MobileOpenAppDetail {
  id: string;
  appId: string;
  nodeId?: string;
  title: string;
  icon?: string;
  meta?: Record<string, unknown>;
}

/**
 * Hook that returns platform-aware app opener
 */
export function useAppOpener() {
  const isMobile = useIsMobile();
  const { openWindow } = useWindowActions();

  return (params: AppOpenParams) => {
    if (isMobile) {
      // Mobile: Dispatch custom event for MobileOS to handle
      const detail: MobileOpenAppDetail = {
        id: params.id,
        appId: params.appId,
        nodeId: params.nodeId,
        title: params.title,
        icon: params.icon,
        meta: params.meta,
      };

      window.dispatchEvent(new CustomEvent('mobile:openApp', { detail }));
    } else {
      // Desktop: Use normal window manager
      openWindow({
        id: params.id,
        appId: params.appId,
        nodeId: params.nodeId,
        title: params.title,
        icon: params.icon,
        bounds: params.bounds,
        state: params.state,
        createdAt: Date.now(),
        meta: params.meta,
      });
    }
  };
}
