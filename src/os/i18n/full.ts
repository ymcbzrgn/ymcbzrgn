/**
 * Full i18n entry for lazily loaded features (welcome, widget, simple view, assistant, terminal,
 * settings). Importing this pulls the whole dictionary into the feature's chunk instead of the
 * main bundle.
 */
import { useCallback } from 'react';
import { getLang, useLang } from './index';
import { STRINGS, type StringKey } from './strings';

export { detectLang, getLang, setLang, toggleLang, useLang } from './index';
export type { Lang } from './core';
export type { StringKey };

/** Translation function bound to the current language (all strings). */
export function useT() {
  const lang = useLang();
  return useCallback((key: StringKey): string => STRINGS[lang][key], [lang]);
}

export function t(key: StringKey): string {
  return STRINGS[getLang()][key];
}
