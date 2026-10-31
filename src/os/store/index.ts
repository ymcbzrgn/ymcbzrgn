/**
 * Root Zustand Store
 * Tüm slice'ları birleştiren ana store + middleware
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { createDesktopSlice, type DesktopSlice } from './desktopSlice';
import { createWindowsSlice, type WindowsSlice } from './windowsSlice';
import { createVFSSlice, type VFSSlice } from './vfsSlice';
import { createSettingsSlice, type SettingsSlice } from './settingsSlice';

/**
 * Combined store type
 */
export type AppStore = DesktopSlice & WindowsSlice & VFSSlice & SettingsSlice;

/**
 * Main app store
 * Middleware order: devtools -> persist -> immer -> slices
 */
export const useStore = create<AppStore>()(
  devtools(
    persist(
      immer((...args) => ({
        ...createDesktopSlice(...args),
        ...createWindowsSlice(...args),
        ...createVFSSlice(...args),
        ...createSettingsSlice(...args),
      })),
      {
        name: 'ubuntu-xp-storage', // localStorage key
        partialize: (state) => ({
          // Only persist these parts to localStorage
          // VFS data is in IndexedDB, windows state is session-based
          layout: state.layout, // Desktop icon positions
          gridSize: state.gridSize,
          settings: state.settings,
        }),
        // Persist's default merge is shallow: a visitor's stored `settings` object would
        // replace the defaults wholesale and drop keys added after their first visit.
        // Merge settings one level deeper so new fields keep their defaults.
        merge: (persisted, current) => {
          const saved = (persisted ?? {}) as Partial<AppStore>;
          return {
            ...current,
            ...saved,
            settings: { ...current.settings, ...(saved.settings ?? {}) },
          };
        },
      }
    ),
    {
      name: 'Ubuntu×XP Store', // DevTools name
      enabled: import.meta.env.DEV,
    }
  )
);

/**
 * Selector hooks for performance optimization
 * Usage: const settings = useSettings();
 */

// Desktop selectors
export const useIconLayout = () => useStore((state) => state.layout);
export const useSelectedIcons = () => useStore((state) => state.selectedIconIds);
export const useGridSize = () => useStore((state) => state.gridSize);
export const useContextMenu = () => useStore((state) => state.contextMenu);

// Windows selectors
export const useWindows = () => useStore((state) => state.windows);
export const useFocusedWindow = () =>
  useStore((state) => {
    const id = state.focusedWindowId;
    return id ? state.windows.find((w) => w.id === id) : null;
  });
export const useWindowById = (windowId: string) =>
  useStore((state) => state.windows.find((w) => w.id === windowId));

// VFS selectors
export const useVFSNodes = () => useStore((state) => state.nodes);
export const useVFSRoot = () =>
  useStore((state) => (state.rootId ? state.nodes[state.rootId] : null));
export const useVFSNodesByParent = (parentId: string | null) =>
  useStore((state) => state.getNodesByParent(parentId));
export const useVFSNodePath = (nodeId: string) =>
  useStore((state) => state.getNodePath(nodeId));

// Settings selectors
export const useSettings = () => useStore((state) => state.settings);
export const useTheme = () => useStore((state) => state.settings.theme);
export const useMode = () => useStore((state) => state.settings.mode);

/**
 * Action hooks (for direct access to actions)
 */
export const useDesktopActions = () =>
  useStore((state) => ({
    initializeIconPosition: state.initializeIconPosition,
    updateTempDragPosition: state.updateTempDragPosition,
    snapToGrid: state.snapToGrid,
    removeIconPosition: state.removeIconPosition,
    selectIcon: state.selectIcon,
    clearSelection: state.clearSelection,
    autoArrangeIcons: state.autoArrangeIcons,
    updateGridSize: state.updateGridSize,
    showContextMenu: state.showContextMenu,
    hideContextMenu: state.hideContextMenu,
  }));

export const useWindowActions = () =>
  useStore((state) => ({
    openWindow: state.openWindow,
    closeWindow: state.closeWindow,
    focusWindow: state.focusWindow,
    minimizeWindow: state.minimizeWindow,
    maximizeWindow: state.maximizeWindow,
    restoreWindow: state.restoreWindow,
    updateWindowBounds: state.updateWindowBounds,
    updateWindowTitle: state.updateWindowTitle,
  }));

export const useVFSActions = () =>
  useStore((state) => ({
    loadVFS: state.loadVFS,
    createNode: state.createNode,
    updateNode: state.updateNode,
    deleteNode: state.deleteNode,
    moveNode: state.moveNode,
  }));

export const useSettingsActions = () =>
  useStore((state) => ({
    updateSettings: state.updateSettings,
    resetSettings: state.resetSettings,
    toggleTheme: state.toggleTheme,
    toggleMode: state.toggleMode,
  }));
