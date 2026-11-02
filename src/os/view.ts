/**
 * "Simple view": the one-page, no-frills version of the portfolio. It is a static page generated at
 * build time (scripts/seo), so it loads instantly, works without JavaScript and can be indexed and
 * shared: /resume/ in English, /tr/ozgecmis/ in Turkish. Old /#simple links are redirected by a
 * small script in index.html.
 */
import { getLang } from './i18n';
import { PROFILE } from './content/profile';
import { RESUME_PATH } from './content/paths';

export { RESUME_PATH };

export function openSimpleView(): void {
  window.location.assign(RESUME_PATH[getLang()]);
}

/**
 * On a phone the CV opens in the device's own PDF viewer (pinch to zoom, search, share and save come
 * with it) instead of a script-driven viewer inside the page. It is a real link click, so it works in
 * in-app browsers (LinkedIn, WhatsApp) too.
 */
export function openCvNative(): void {
  const link = document.createElement('a');
  link.href = PROFILE.cvUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
