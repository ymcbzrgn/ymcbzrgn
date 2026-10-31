/**
 * Core i18n: the language type and the few strings the always-loaded UI needs
 * (desktop icon hint, taskbar logo). Everything else lives in ./strings and is only
 * imported by lazily loaded features through ./full, so it stays out of the main bundle.
 */
export type Lang = 'en' | 'tr';

const en = {
  hintDoubleClick: 'Double-click to open',
  welcomeTitle: 'Welcome',
  ctaSimple: 'Simple view',
};

export type CoreKey = keyof typeof en;

const tr: Record<CoreKey, string> = {
  hintDoubleClick: 'Açmak için çift tıkla',
  welcomeTitle: 'Hoş geldin',
  ctaSimple: 'Sade görünüm',
};

export const CORE: Record<Lang, Record<CoreKey, string>> = { en, tr };
