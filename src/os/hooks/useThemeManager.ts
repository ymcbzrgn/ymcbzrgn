/**
 * Theme Manager Hook
 * Applies theme and wallpaper changes to CSS variables
 */

import { useEffect } from 'react';
import { useSettings } from '../store';

interface ThemeColors {
  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Accent colors
  accentPrimary: string;
  accentSecondary: string;

  // Border colors
  borderPrimary: string;
  borderSecondary: string;

  // Shadow
  shadow: string;
}

const themes: Record<string, ThemeColors> = {
  'ubuntu-light': {
    bgPrimary: '#f5f5f5',
    bgSecondary: '#ffffff',
    bgTertiary: '#e0e0e0',
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    accentPrimary: '#ff6b35',
    accentSecondary: '#874DA7',
    borderPrimary: '#dddddd',
    borderSecondary: '#cccccc',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  'ubuntu-dark': {
    bgPrimary: '#2d2d2d',
    bgSecondary: '#1a1a1a',
    bgTertiary: '#3a3a3a',
    textPrimary: '#e0e0e0',
    textSecondary: '#b0b0b0',
    textTertiary: '#808080',
    accentPrimary: '#ff6b35',
    accentSecondary: '#C85C94',
    borderPrimary: '#444444',
    borderSecondary: '#555555',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  'xp-classic': {
    bgPrimary: '#ece9d8',
    bgSecondary: '#ffffff',
    bgTertiary: '#d4d0c8',
    textPrimary: '#000000',
    textSecondary: '#555555',
    textTertiary: '#888888',
    accentPrimary: '#0078d7',
    accentSecondary: '#5cb85c',
    borderPrimary: '#999999',
    borderSecondary: '#888888',
    shadow: 'rgba(0, 0, 0, 0.15)',
  },
  'high-contrast': {
    bgPrimary: '#000000',
    bgSecondary: '#1a1a1a',
    bgTertiary: '#0a0a0a',
    textPrimary: '#ffffff',
    textSecondary: '#ffff00',
    textTertiary: '#cccccc',
    accentPrimary: '#00ff00',
    accentSecondary: '#00ffff',
    borderPrimary: '#ffffff',
    borderSecondary: '#ffff00',
    shadow: 'rgba(255, 255, 255, 0.2)',
  },
};

export function useThemeManager() {
  const settings = useSettings();
  const { theme, wallpaper, iconSize } = settings;

  useEffect(() => {
    const root = document.documentElement;
    const themeColors = themes[theme] || themes['ubuntu-dark'];

    // Apply theme CSS variables
    root.style.setProperty('--bg-primary', themeColors.bgPrimary);
    root.style.setProperty('--bg-secondary', themeColors.bgSecondary);
    root.style.setProperty('--bg-tertiary', themeColors.bgTertiary);

    root.style.setProperty('--text-primary', themeColors.textPrimary);
    root.style.setProperty('--text-secondary', themeColors.textSecondary);
    root.style.setProperty('--text-tertiary', themeColors.textTertiary);

    root.style.setProperty('--accent-primary', themeColors.accentPrimary);
    root.style.setProperty('--accent-secondary', themeColors.accentSecondary);

    root.style.setProperty('--border-primary', themeColors.borderPrimary);
    root.style.setProperty('--border-secondary', themeColors.borderSecondary);

    root.style.setProperty('--shadow', themeColors.shadow);

    console.log(`[Theme Manager] Applied theme: ${theme}`);
  }, [theme]);

  // Apply wallpaper
  useEffect(() => {
    const root = document.documentElement;

    // Wallpaper can be a gradient, solid color, or image URL. 'none' (and the path older versions stored as
    // their default, a file that was never shipped) leaves the desktop's own gradient showing; asking
    // for a file that does not exist would only produce a 404 on every visit.
    if (wallpaper === 'none' || wallpaper === '/wallpapers/ubuntu-default.jpg') {
      root.style.setProperty('--wallpaper', 'none');
    } else if (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('#')) {
      // Gradient or solid color
      root.style.setProperty('--wallpaper', wallpaper);
    } else {
      // Image URL
      root.style.setProperty('--wallpaper', `url(${wallpaper})`);
    }

    console.log(`[Theme Manager] Applied wallpaper: ${wallpaper.substring(0, 50)}...`);
  }, [wallpaper]);

  // Apply icon size
  useEffect(() => {
    const root = document.documentElement;

    const iconSizes = {
      'extra-small': '60px',
      'small': '80px',
      'medium': '100px',
      'large': '120px',
    };

    const size = iconSizes[iconSize] || iconSizes['small']; // Fallback to small
    root.style.setProperty('--icon-size', size);

    console.log(`[Theme Manager] Applied icon size: ${iconSize || 'small (default)'} (${size})`);
  }, [iconSize]);
}
