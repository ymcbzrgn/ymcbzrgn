/**
 * Build-time SEO, part 1: the host, the page table, titles and descriptions, tiny helpers.
 * Node only (imported by vite.config.ts through ./plugin).
 *
 * The canonical host is the apex, https://yamacbezirgan.com. It is the address that has DNS and the
 * one the CV prints; www has no record, so nothing may point at it (scripts/check-seo.mjs enforces it).
 */
import { PROFILE } from '../../src/os/content/profile';
import { STRINGS } from '../../src/os/i18n/strings';
import type { Lang } from '../../src/os/i18n/core';

export { PROJECTS_PATH, WRITING_PATH, articlePath, projectPath } from '../../src/os/content/paths';

export type { Lang };
export const LANGS: Lang[] = ['en', 'tr'];
export const SITE = PROFILE.site;

/** home = the desktop (an app shell), resume = the static one-page version of the same facts */
export type PageId = 'home' | 'resume';

export const PATH: Record<PageId, Record<Lang, string>> = {
  home: { en: '/', tr: '/tr/' },
  resume: { en: '/resume/', tr: '/tr/ozgecmis/' },
};

/** The Atom feed of the writing */
export const FEED_PATH = '/feed.xml';

/** The same résumé as plain Markdown (for assistants and agents that prefer it to HTML) */
export const MD_PATH: Record<Lang, string> = { en: '/resume.md', tr: '/tr/ozgecmis.md' };

export const abs = (path: string): string => SITE + path;

export const OG_IMAGE: Record<Lang, string> = { en: '/og-en.jpg', tr: '/og-tr.jpg' };
export const OG_SIZE = { width: 1200, height: 630 };
export const AVATAR = '/avatar.png';
export const LOCALE: Record<Lang, string> = { en: 'en_US', tr: 'tr_TR' };

export const roleLine = (lang: Lang): string => `${STRINGS[lang].role} · ${STRINGS[lang].tagline}`;
export const currentRole = (lang: Lang): string => STRINGS[lang].currentRole;

export interface PageMeta {
  title: string;
  description: string;
  /** alt text of the preview image */
  alt: string;
}

export const META: Record<PageId, Record<Lang, PageMeta>> = {
  home: {
    en: {
      title: 'Yamaç Bezirgan – Software Engineer · AI, Backend, Full-Stack',
      description:
        'Software Engineer at Arketic AI: LLM platforms, backend systems and full-stack products in Python and TypeScript. Interactive desktop portfolio, CV and projects.',
      alt: 'Yamaç Bezirgan, Software Engineer: AI platforms, backend, full-stack',
    },
    tr: {
      title: 'Yamaç Bezirgan – Yazılım Mühendisi · AI, Backend, Full-Stack',
      description:
        "Arketic AI'da Yazılım Mühendisi: Python ve TypeScript ile LLM platformları, backend ve full-stack ürünler. Etkileşimli masaüstü portföy, CV ve projeler.",
      alt: 'Yamaç Bezirgan, Yazılım Mühendisi: yapay zeka platformları, backend, full-stack',
    },
  },
  resume: {
    en: {
      title: 'Yamaç Bezirgan – Resume | Software Engineer, AI Platforms',
      description:
        'Resume of Yamaç Bezirgan, Software Engineer at Arketic AI: experience, projects, education, skills and contact details on one page.',
      alt: 'Yamaç Bezirgan, Software Engineer: AI platforms, backend, full-stack',
    },
    tr: {
      title: 'Yamaç Bezirgan – Özgeçmiş | Yazılım Mühendisi, AI Platformları',
      description:
        "Arketic AI'da Yazılım Mühendisi Yamaç Bezirgan'ın özgeçmişi: deneyim, projeler, eğitim, yetenekler ve iletişim bilgileri tek sayfada.",
      alt: 'Yamaç Bezirgan, Yazılım Mühendisi: yapay zeka platformları, backend, full-stack',
    },
  },
};

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A JSON-LD script tag; "<" is escaped so no value can close the tag early. */
export const jsonScript = (data: unknown): string =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
