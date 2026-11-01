/**
 * Tiny i18n layer (English / Turkish) for the onboarding experience.
 *
 * Language = the visitor's explicit choice (settings.langOverride) or, failing that,
 * the browser's preferred language (Turkish if it starts with "tr", otherwise English).
 *
 * This module is part of the main bundle, so it only knows the core strings.
 * Lazily loaded features import everything from './full'.
 */
import { useCallback } from 'react';
import { useStore } from '../store';
import { CORE, type CoreKey, type Lang } from './core';

export type { Lang, CoreKey };

export function detectLang(): Lang {
  const first =
    (typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'en';
  return first.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

/** Current language as a React hook (re-renders when the visitor switches). */
export function useLang(): Lang {
  const override = useStore((s) => s.settings.langOverride);
  return override ?? detectLang();
}

/** Current language outside React (event handlers, imperative code). */
export function getLang(): Lang {
  return useStore.getState().settings.langOverride ?? detectLang();
}

export function setLang(lang: Lang): void {
  useStore.getState().updateSettings({ langOverride: lang });
  window.dispatchEvent(new Event('yb:lang')); // (the lazy overlay host awards an achievement for it)
}

export function toggleLang(): void {
  setLang(getLang() === 'tr' ? 'en' : 'tr');
}

/** Translation function for the core strings. */
export function useT() {
  const lang = useLang();
  return useCallback((key: CoreKey): string => CORE[lang][key], [lang]);
}
