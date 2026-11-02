/**
 * Where the static pages live (the app links to them, the build writes them). Pure data and pure
 * functions, no browser APIs: vite.config.ts imports this through scripts/seo.
 */
import type { Lang } from '../i18n/core';

export const RESUME_PATH: Record<Lang, string> = { en: '/resume/', tr: '/tr/ozgecmis/' };

/** The project index and its pages: /projects/ and /projects/<slug>/, /tr/projeler/ and /tr/projeler/<slug>/ */
export const PROJECTS_PATH: Record<Lang, string> = { en: '/projects/', tr: '/tr/projeler/' };

export function projectPath(slug: string, lang: Lang): string {
  return `${PROJECTS_PATH[lang]}${slug}/`;
}

/** The writing index and its articles (English only): /writing/ and /writing/<slug>/ */
export const WRITING_PATH = '/writing/';

export function articlePath(slug: string): string {
  return `${WRITING_PATH}${slug}/`;
}
