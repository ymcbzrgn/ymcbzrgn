/**
 * "Simple view": the one-page, no-frills version of the portfolio. It is a static page generated at
 * build time (scripts/seo), so it loads instantly, works without JavaScript and can be indexed and
 * shared: /resume/ in English, /tr/ozgecmis/ in Turkish. Old /#simple links are redirected by a
 * small script in index.html.
 */
import { getLang, type Lang } from './i18n';

export const RESUME_PATH: Record<Lang, string> = { en: '/resume/', tr: '/tr/ozgecmis/' };

export function openSimpleView(): void {
  window.location.assign(RESUME_PATH[getLang()]);
}
