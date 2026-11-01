/**
 * Settings Slice - User Preferences
 * Tema, dil, görünüm, davranış ayarları
 */

import { StateCreator } from 'zustand';
import type { Settings } from '../types';

/**
 * Settings state interface
 */
export interface SettingsSlice {
  // State
  settings: Settings;

  // Actions
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
  toggleTheme: () => void;
  toggleMode: () => void;
}

/**
 * Default settings
 */
const DEFAULT_SETTINGS: Settings = {
  // Theme
  theme: 'ubuntu-dark',

  // Mode
  mode: 'auto',

  // Wallpaper
  wallpaper: 'none', // the desktop's own gradient (see useThemeManager)
  wallpaperFit: 'cover',

  // Icon Pack
  iconPack: 'ubuntu',
  iconSize: 'small', // Desktop icon size (extra-small: 60px, small: 80px, medium: 100px, large: 120px)

  // Language
  language: 'tr',

  // Accessibility
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',

  // Privacy
  analytics: false,
  crashReports: true,

  // Advanced
  showHiddenFiles: false,
  enableExperimentalFeatures: false,
};

/**
 * Settings slice creator
 */
export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [],
  [],
  SettingsSlice
> = (set) => ({
  // Initial state - loaded from localStorage in root store
  settings: DEFAULT_SETTINGS,

  // Actions
  updateSettings: (updates) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...updates,
      },
    })),

  resetSettings: () =>
    set({
      settings: DEFAULT_SETTINGS,
    }),

  toggleTheme: () =>
    set((state) => {
      const themes = [
        'ubuntu-light',
        'ubuntu-dark',
        'xp-classic',
        'high-contrast',
      ] as const;
      const currentIndex = themes.indexOf(state.settings.theme);
      const nextIndex = (currentIndex + 1) % themes.length;

      return {
        settings: {
          ...state.settings,
          theme: themes[nextIndex],
        },
      };
    }),

  toggleMode: () =>
    set((state) => {
      const modes = ['desktop', 'mobile', 'auto'] as const;
      const currentIndex = modes.indexOf(state.settings.mode);
      const nextIndex = (currentIndex + 1) % modes.length;

      return {
        settings: {
          ...state.settings,
          mode: modes[nextIndex],
        },
      };
    }),
});

// Export default settings for testing/reset
export { DEFAULT_SETTINGS };
