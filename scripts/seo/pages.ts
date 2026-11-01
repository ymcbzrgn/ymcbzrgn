/**
 * Build-time SEO, part 3: the HTML that is not the React app.
 *   - bootBlock: what is in the page the moment it arrives (name, role, one sentence, links). Crawlers
 *     and visitors without JavaScript read it; once the desktop is up, main.tsx removes it.
 *   - resumePage: the whole career as one static, fast, printable page (/resume/, /tr/ozgecmis/).
 *   - notFoundPage: the 404.
 * All the facts come from src/os/content/career.ts, so the page, the CV card, JSON-LD and llms.txt agree.
 */
import { PROFILE } from '../../src/os/content/profile';
import { FOCUS, MEDALS, PROGRAMS, PROJECTS, ROLES, SKILLS, SPOKEN, STUDIES, monthLabel } from '../../src/os/content/career';
import { PROFILE_TEXT } from '../../src/os/content/profileText';
import { PATH, currentRole, esc, roleLine, type Lang } from './site';
import { headBlock } from './head';

export interface Repo {
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
  updated_at: string;
}

/* ------------------------------------------------------------------ boot */

export const BOOT_STYLE = `<style id="boot-css">
#boot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;overflow:auto;background:radial-gradient(900px 480px at 15% 0,rgba(99,102,241,.28),transparent),linear-gradient(160deg,#0f172a,#1e1b4b);color:#e2e8f0;font:16px/1.55 'Ubuntu',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:opacity .35s ease}
#boot.boot--done{opacity:0;pointer-events:none}
.boot__card{max-width:34rem;text-align:center}
.boot__card h1{margin:0 0 .25rem;color:#fff;font-size:clamp(1.9rem,6vw,2.6rem);line-height:1.1;letter-spacing:-.02em}
.boot__role{margin:0;color:#a5b4fc;font-weight:600}
.boot__sum{margin:1rem 0 0;color:#cbd5e1}
.boot__links{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;justify-content:center;margin:1.2rem 0 0}
.boot__links a{color:#c7d2fe}
.boot__hint{margin:1.5rem 0 0;color:#94a3b8;font-size:.8rem;animation:boot-pulse 1.4s ease-in-out infinite}
@keyframes boot-pulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){#boot{transition:none}.boot__hint{animation:none}}
</style>
<noscript><style>.boot__hint{display:none}</style></noscript>`;

const BOOT_TEXT: Record<Lang, { loading: string; noscript: string; resume: string; cv: string; mail: string }> = {
  en: {
    loading: 'Loading the interactive desktop…',
    noscript: 'The interactive desktop needs JavaScript. The resume page works without it.',
    resume: 'Resume',
    cv: 'CV (PDF)',
    mail: 'Email',
  },
  tr: {
    loading: 'Etkileşimli masaüstü yükleniyor…',
    noscript: 'Etkileşimli masaüstü JavaScript gerektirir. Özgeçmiş sayfası JavaScript olmadan da çalışır.',
    resume: 'Özgeçmiş',
    cv: 'CV (PDF)',
    mail: 'E-posta',
  },
};

export function bootBlock(lang: Lang): string {
  const b = BOOT_TEXT[lang];
  return `<div id="boot">
      <main class="boot__card">
        <h1>${esc(PROFILE.name)}</h1>
        <p class="boot__role">${esc(roleLine(lang))}</p>
        <p class="boot__sum">${esc(currentRole(lang))}: ${esc(FOCUS[lang])}.</p>
        <p class="boot__links">
          <a href="${PATH.resume[lang]}">${b.resume}</a>
          <a href="${PROFILE.cvUrl}">${b.cv}</a>
          <a href="${PROFILE.github}">GitHub</a>
          <a href="${PROFILE.linkedin}">LinkedIn</a>
          <a href="mailto:${PROFILE.email}">${b.mail}</a>
        </p>
        <p class="boot__hint">${b.loading}</p>
        <noscript><p>${b.noscript}</p></noscript>
      </main>
    </div>`;
}

/* ---------------------------------------------------------------- resume */

const LABELS: Record<
  Lang,
  {
    exp: string;
    proj: string;
    edu: string;
    skills: string;
    spoken: string;
    awards: string;
    programs: string;
    contact: string;
    cv: string;
    desktop: string;
    email: string;
    courses: string;
    focus: string;
    more: string;
    updated: string;
    also: string;
    privacy: string;
    switchTo: string;
    switchName: string;
    intro: string;
  }
> = {
  en: {
    exp: 'Experience',
    proj: 'Projects',
    edu: 'Education',
    skills: 'Skills',
    spoken: 'Languages',
    awards: 'Hackathons & competitions',
    programs: 'Certificates & programs',
    contact: 'Contact',
    cv: 'Download CV (PDF)',
    desktop: 'Open the interactive desktop',
    email: 'Email me',
    courses: 'Coursework',
    focus: 'Focus',
    more: 'More on GitHub',
    updated: 'Updated',
    also: 'Also written as',
    privacy: 'Privacy',
    switchTo: 'TR',
    switchName: 'Türkçe',
    intro: 'This is the plain, fast version of the portfolio. The desktop is the playful one.',
  },
  tr: {
    exp: 'Deneyim',
    proj: 'Projeler',
    edu: 'Eğitim',
    skills: 'Yetenekler',
    spoken: 'Diller',
    awards: 'Hackathon ve yarışmalar',
    programs: 'Sertifika ve programlar',
    contact: 'İletişim',
    cv: "CV'yi indir (PDF)",
    desktop: 'Etkileşimli masaüstünü aç',
    email: 'E-posta gönder',
    courses: 'Dersler',
    focus: 'Odak',
    more: "GitHub'da daha fazlası",
    updated: 'Güncelleme',
    also: 'Şöyle de yazılır',
    privacy: 'Gizlilik',
    switchTo: 'EN',
    switchName: 'English',
    intro: 'Bu, portföyün sade ve hızlı sürümü. Eğlenceli olan masaüstü.',
  },
};

const RESUME_CSS = `:root{color-scheme:light dark;--bg:#f8fafc;--fg:#1e293b;--muted:#475569;--card:#fff;--line:#e2e8f0;--accent:#3730a3;--chip:#eef2ff}
@media (prefers-color-scheme:dark){:root{--bg:#0f172a;--fg:#e2e8f0;--muted:#94a3b8;--card:#1e293b;--line:#334155;--accent:#a5b4fc;--chip:#1e1b4b}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 'Ubuntu',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
a{color:var(--accent)}
.bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px max(16px,calc((100% - 920px)/2));border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 88%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.brand{color:inherit;font-weight:700;text-decoration:none}
.bar nav{display:flex;align-items:center;gap:10px}
.pill{padding:4px 10px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.04em;text-decoration:none}
.btn{display:inline-block;padding:10px 16px;border:1px solid transparent;border-radius:8px;font-size:14px;font-weight:600;line-height:1.1;text-decoration:none}
.btn:hover{filter:brightness(1.06)}
.btn--primary{background:linear-gradient(135deg,#f59e0b,#f97316);color:#231300}
.btn--soft{background:var(--chip);color:var(--accent)}
.btn--ghost{border-color:var(--line);color:var(--muted)}
main{max-width:920px;margin:0 auto;padding:36px 16px 24px}
.hero{display:flex;align-items:center;gap:20px}
.avatar{flex:none;border-radius:50%;background:linear-gradient(160deg,#4db6ac,#546e7a);image-rendering:pixelated}
h1{margin:0;font-size:clamp(28px,6vw,40px);line-height:1.1;letter-spacing:-.02em}
.role{margin:6px 0 0;color:var(--muted)}
.chip{display:inline-block;margin:10px 0 0;padding:4px 10px;border-radius:999px;background:var(--chip);color:var(--accent);font-size:12.5px;font-weight:600}
.summary{margin:24px 0 0;font-size:17px;line-height:1.65}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.hint{margin:14px 0 0;color:var(--muted);font-size:13.5px}
section{margin-top:40px}
h2{margin:0 0 14px;padding-bottom:6px;border-bottom:1px solid var(--line);font-size:20px;letter-spacing:-.01em}
h3{margin:0;font-size:16.5px}
.job,.card{margin-top:14px;padding:16px 18px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.job header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 16px}
.when{color:var(--muted);font-size:13.5px}
.org{margin:2px 0 0;color:var(--muted)}
.card p{margin:6px 0 0}
.stack{color:var(--muted);font-size:13.5px}
ul{margin:10px 0 0;padding-left:20px}
li{margin:4px 0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0;padding:0;list-style:none}
.tags li{margin:0;padding:3px 10px;border-radius:999px;background:var(--chip);color:var(--accent);font-size:13px;font-weight:600}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
dl{margin:0}
dt{font-weight:600}
dd{margin:0 0 8px;color:var(--muted)}
.skillgroup{margin-top:12px}
.skillgroup h3{font-size:14px;color:var(--muted);font-weight:600}
footer{max-width:920px;margin:0 auto;padding:28px 16px 48px;border-top:1px solid var(--line);color:var(--muted);font-size:13.5px}
@media print{.bar,.cta,.hint,.noprint{display:none!important}body{background:#fff;color:#000}.job,.card{break-inside:avoid;border-color:#ccc}a{color:#000}}`;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function time(m: string, lang: Lang): string {
  return `<time datetime="${m}">${monthLabel(m, lang)}</time>`;
}

export function resumePage(lang: Lang, modified: string, repos: Repo[]): string {
  const L = LABELS[lang];
  const other: Lang = lang === 'en' ? 'tr' : 'en';
  const text = PROFILE_TEXT[lang];
  const known = new Set(PROJECTS.map((p) => norm(p.name)));

  const byName = new Map(repos.map((r) => [norm(r.name), r]));
  const projects = PROJECTS.map((p) => {
    const link = p.repo ?? byName.get(norm(p.name))?.html_url;
    const name = link ? `<a href="${esc(link)}" rel="noopener">${esc(p.name)}</a>` : esc(p.name);
    return `<article class="card"><h3>${name}</h3><div class="stack">${esc(p.stack)}</div><p>${esc(p.summary[lang])}</p></article>`;
  }).join('\n          ');

  const more = repos
    .filter((r) => !r.fork && !known.has(norm(r.name)) && norm(r.name) !== 'ymcbzrgn')
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6)
    .map((r) => {
      const meta = [r.language, r.stargazers_count ? `★ ${r.stargazers_count}` : ''].filter(Boolean).join(' · ');
      return `<li><a href="${esc(r.html_url)}" rel="noopener">${esc(r.name)}</a>${r.description ? ` – ${esc(r.description)}` : ''}${meta ? ` <span class="stack">(${esc(meta)})</span>` : ''}</li>`;
    })
    .join('\n            ');

  const jobs = ROLES.map(
    (r) => `<article class="job">
            <header>
              <div>
                <h3>${esc(r.title[lang])}</h3>
                <p class="org">${esc(r.org)}</p>
              </div>
              <span class="when">${time(r.start, lang)} – ${r.end ? time(r.end, lang) : lang === 'tr' ? 'Günümüz' : 'Present'}</span>
            </header>
            <ul>
              ${r.points.map((p) => `<li>${esc(p[lang])}</li>`).join('\n              ')}
            </ul>
          </article>`
  ).join('\n          ');

  const studies = STUDIES.map(
    (s) => `<article class="job">
            <header>
              <div>
                <h3>${esc(s.degree[lang])}</h3>
                <p class="org">${esc(s.school[lang])}</p>
              </div>
              <span class="when">${s.start} – ${s.end}</span>
            </header>
            ${s.focus ? `<p>${L.focus}: ${esc(s.focus[lang])}</p>` : ''}
            <p>${L.courses}: ${esc(s.courses[lang])}</p>
          </article>`
  ).join('\n          ');

  const skills = SKILLS.map(
    (g) => `<div class="skillgroup"><h3>${esc(g.group[lang])}</h3><ul class="tags">${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`
  ).join('\n          ');

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    ${headBlock('resume', lang, modified)}
    <style>${RESUME_CSS}</style>
  </head>
  <body>
    <header class="bar">
      <a class="brand" href="${PATH.home[lang]}">${esc(PROFILE.name)}</a>
      <nav>
        <a class="pill" href="${PATH.resume[other]}" hreflang="${other}" lang="${other}" title="${esc(LABELS[other].switchName)}">${L.switchTo}</a>
        <a class="btn btn--ghost" href="${PATH.home[lang]}">${L.desktop} →</a>
      </nav>
    </header>

    <main>
      <section class="hero" style="margin-top:0">
        <img class="avatar" src="/bust.png" width="104" height="104" alt="" />
        <div>
          <h1>${esc(PROFILE.name)}</h1>
          <p class="role">${esc(roleLine(lang))}</p>
          <p class="chip">${esc(currentRole(lang))}</p>
        </div>
      </section>

      <p class="summary">${esc(text.summary)}</p>
      <p class="cta">
        <a class="btn btn--primary" href="${PROFILE.cvUrl}" download>${L.cv}</a>
        <a class="btn btn--soft" href="mailto:${PROFILE.email}">${L.email}</a>
        <a class="btn btn--ghost" href="${PROFILE.github}" rel="noopener">GitHub</a>
        <a class="btn btn--ghost" href="${PROFILE.linkedin}" rel="noopener">LinkedIn</a>
      </p>
      <p class="hint">${L.intro}</p>

      <section id="experience" aria-labelledby="h-exp">
        <h2 id="h-exp">${L.exp}</h2>
          ${jobs}
      </section>

      <section id="projects" aria-labelledby="h-proj">
        <h2 id="h-proj">${L.proj}</h2>
          ${projects}${
            more
              ? `
        <h3 style="margin-top:22px">${L.more}</h3>
          <ul>
            ${more}
          </ul>`
              : ''
          }
      </section>

      <section id="education" aria-labelledby="h-edu">
        <h2 id="h-edu">${L.edu}</h2>
          ${studies}
      </section>

      <section id="skills" aria-labelledby="h-skills">
        <h2 id="h-skills">${L.skills}</h2>
          ${skills}
      </section>

      <div class="cols">
        <section id="languages" aria-labelledby="h-lang">
          <h2 id="h-lang">${L.spoken}</h2>
          <dl>
            ${SPOKEN.map((s) => `<dt lang="${s.code}">${esc(s.name[lang])}</dt><dd>${esc(s.level[lang])}</dd>`).join('\n            ')}
          </dl>
        </section>
        <section id="competitions" aria-labelledby="h-awards">
          <h2 id="h-awards">${L.awards}</h2>
          <dl>
            ${MEDALS.map((m) => `<dt>${esc(m.name)}</dt><dd>${esc(m.result[lang])}</dd>`).join('\n            ')}
          </dl>
        </section>
        <section id="programs" aria-labelledby="h-prog">
          <h2 id="h-prog">${L.programs}</h2>
          <dl>
            ${PROGRAMS.map((p) => `<dt>${esc(p.name)}</dt><dd>${esc(p.by)}</dd>`).join('\n            ')}
          </dl>
        </section>
      </div>

      <section id="contact" aria-labelledby="h-contact">
        <h2 id="h-contact">${L.contact}</h2>
        <ul>
          <li><a href="mailto:${PROFILE.email}">${PROFILE.email}</a></li>
          <li><a href="${PROFILE.linkedin}" rel="noopener">linkedin.com/in/yamacbezirgan</a></li>
          <li><a href="${PROFILE.github}" rel="noopener">github.com/ymcbzrgn</a></li>
        </ul>
      </section>
    </main>

    <footer>
      <p>${esc(PROFILE.name)} (${L.also}: Yamac Bezirgan) · ${L.updated} <time datetime="${modified}">${modified}</time> · <a href="/privacy">${L.privacy}</a></p>
    </footer>
  </body>
</html>
`;
}

/* ------------------------------------------------------------------ 404 */

export function notFoundPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>404 – ${esc(PROFILE.name)}</title>
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(160deg,#0f172a,#1e1b4b);color:#e2e8f0;font:16px/1.6 'Ubuntu',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
      main{max-width:32rem}
      h1{margin:0;font:700 clamp(3rem,14vw,5.5rem)/1 ui-monospace,'Ubuntu Mono',monospace;color:#a5b4fc}
      code{padding:2px 6px;border-radius:6px;background:rgba(255,255,255,.08)}
      a{color:#c7d2fe}
    </style>
  </head>
  <body>
    <main>
      <h1>404</h1>
      <p>This file is not in the virtual file system. <code>cd ~</code> is a safe bet.</p>
      <p><a href="/">Open the desktop</a> · <a href="${PATH.resume.en}">Resume</a> · <a href="${PATH.resume.tr}">Özgeçmiş</a></p>
    </main>
  </body>
</html>
`;
}

