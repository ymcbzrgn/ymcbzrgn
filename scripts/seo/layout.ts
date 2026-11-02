/**
 * Build-time SEO, part 5: the frame shared by the static pages that are not the résumé (projects, writing):
 * the same look as the résumé (its stylesheet plus a few additions), a header with the language switch and
 * a way back to the desktop, and a footer.
 */
import { PROFILE } from '../../src/os/content/profile';
import { RESUME_CSS } from './pages';
import { PATH, esc, type Lang } from './site';

const EXTRA_CSS = `
.crumbs{margin:0 0 18px;color:var(--muted);font-size:13.5px}
.crumbs a{color:var(--muted)}
.tagline{margin:10px 0 0;color:var(--muted);font-size:18px;line-height:1.5}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:24px 0 0;padding:0}
.facts div{padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.facts dt{color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.facts dd{margin:4px 0 0;color:var(--fg)}
.prose{margin-top:28px}
.prose p{margin:12px 0}
.prose h2{margin-top:36px}
.prose h3{margin-top:26px;font-size:18px}
.prose ul,.prose ol{margin:10px 0;padding-left:22px}
.prose li{margin:8px 0}
.prose pre{overflow:auto;margin:16px 0;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--card);font:13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.prose code{font:.92em ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.prose :not(pre)>code{padding:1px 6px;border-radius:6px;background:var(--chip);color:var(--accent)}
.prose table{width:100%;border-collapse:collapse;margin:16px 0;font-size:15px}
.prose th,.prose td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.prose blockquote{margin:16px 0;padding:2px 16px;border-left:3px solid var(--accent);color:var(--muted)}
.meta{margin:8px 0 0;color:var(--muted);font-size:13.5px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:18px}
.cards .card{display:flex;flex-direction:column;margin:0}
.card h2,.card h3{margin:0;padding:0;border:0;font-size:18px}
.card h2 a,.card h3 a{color:inherit;text-decoration:none}
.card h2 a:hover,.card h3 a:hover{text-decoration:underline}
.more{margin-top:auto;padding-top:12px;font-weight:600}
.byline{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:14.5px}
`;

const TEXT: Record<Lang, { desktop: string; privacy: string; also: string; switchName: Record<Lang, string> }> = {
  en: { desktop: 'Open the interactive desktop', privacy: 'Privacy', also: 'Also written as', switchName: { en: 'English', tr: 'Türkçe' } },
  tr: { desktop: 'Etkileşimli masaüstünü aç', privacy: 'Gizlilik', also: 'Şöyle de yazılır', switchName: { en: 'English', tr: 'Türkçe' } },
};

export interface PageFrame {
  lang: Lang;
  /** the <head> block (scripts/seo/head.ts) */
  head: string;
  /** the <main> content */
  main: string;
  /** the same page in the other language, when there is one */
  other?: { lang: Lang; href: string };
  modified: string;
}

export function renderPage(f: PageFrame): string {
  const T = TEXT[f.lang];
  return `<!doctype html>
<html lang="${f.lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    ${f.head}
    <style>${RESUME_CSS}${EXTRA_CSS}</style>
  </head>
  <body>
    <header class="bar">
      <a class="brand" href="${PATH.home[f.lang]}">${esc(PROFILE.name)}</a>
      <nav>${
        f.other
          ? `
        <a class="pill" href="${f.other.href}" hreflang="${f.other.lang}" lang="${f.other.lang}" title="${esc(T.switchName[f.other.lang])}">${f.other.lang.toUpperCase()}</a>`
          : ''
      }
        <a class="btn btn--ghost" href="${PATH.home[f.lang]}">${T.desktop} →</a>
      </nav>
    </header>

    <main>
${f.main}
    </main>

    <footer>
      <p>${esc(PROFILE.name)} (${T.also}: Yamac Bezirgan) · <time datetime="${f.modified}">${f.modified}</time> · <a href="/privacy">${T.privacy}</a></p>
    </footer>
  </body>
</html>
`;
}
