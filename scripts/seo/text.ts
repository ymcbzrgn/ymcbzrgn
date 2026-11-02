/**
 * Build-time SEO, part 4: the plain-text files. llms.txt (a short map for AI assistants),
 * llms-full.txt (the whole career as Markdown) and sitemap.xml (with hreflang pairs and lastmod).
 */
import { PROFILE } from '../../src/os/content/profile';
import { FOCUS, MEDALS, PROGRAMS, PROJECTS, ROLES, SKILLS, SPOKEN, STUDIES, spanLabel } from '../../src/os/content/career';
import { CASE_STUDIES } from '../../src/os/content/caseStudies';
import { PROFILE_TEXT } from '../../src/os/content/profileText';
import { FEED_PATH, LANGS, MD_PATH, PATH, PROJECTS_PATH, WRITING_PATH, abs, articlePath, currentRole, projectPath, roleLine, type Lang } from './site';
import { heading, projectMarkdown, studyMdPath, studyPath, type BuildInfo } from './projects';
import type { Article } from './writing';

export function llmsTxt(articles: Article[]): string {
  return `# ${PROFILE.name}

> ${currentRole('en')}: ${FOCUS.en}. Also written as Yamac Bezirgan; GitHub and X handle: ymcbzrgn. The site is an interactive desktop-OS portfolio, and the pages below hold the same facts as plain text.

## Pages

- [Resume (English)](${abs(PATH.resume.en)}): experience, projects, education, skills, languages and contact on one page
- [Özgeçmiş (Türkçe)](${abs(PATH.resume.tr)}): the same résumé in Turkish
- [Resume (English, Markdown)](${abs(MD_PATH.en)}): the same résumé as plain Markdown
- [Özgeçmiş (Türkçe, Markdown)](${abs(MD_PATH.tr)}): the same résumé in Turkish, as plain Markdown
- [CV (PDF)](${abs(PROFILE.cvUrl)}): the one-page CV
- [Interactive desktop](${abs(PATH.home.en)}): the playful version of the portfolio (needs JavaScript)

## Projects

- [All projects](${abs(PROJECTS_PATH.en)}): case studies, also in Turkish at ${abs(PROJECTS_PATH.tr)}
${CASE_STUDIES.map((s) => `- [${heading(s, 'en')}](${abs(studyPath(s, 'en'))}): ${s.tagline.en} (Markdown: ${abs(studyMdPath(s, 'en'))})`).join('\n')}
${articles.length ? `\n## Writing\n\n${articles.map((a) => `- [${a.title}](${abs(articlePath(a.slug))}): ${a.description} (Markdown: ${abs(`${WRITING_PATH}${a.slug}.md`)})`).join('\n')}\n- [Atom feed](${abs(FEED_PATH)})\n` : ''}
## Profiles

- [GitHub](${PROFILE.github}): source code and projects
- [LinkedIn](${PROFILE.linkedin}): professional profile

## Contact

- Email: ${PROFILE.email}

## Optional

- [Full text](${abs('/llms-full.txt')}): the whole résumé as Markdown, English and Turkish
`;
}

function fullSection(lang: Lang): string {
  const text = PROFILE_TEXT[lang];
  const t = lang === 'en';
  const out: string[] = [];
  out.push(`# ${PROFILE.name}${t ? '' : ' (Türkçe)'}`, '', `${roleLine(lang)}. ${currentRole(lang)}.`, '', text.summary, '');
  out.push(`## ${t ? 'Experience' : 'Deneyim'}`, '');
  for (const r of ROLES) {
    out.push(`### ${r.title[lang]}, ${r.org} (${spanLabel(r, lang)})`, '');
    for (const p of r.points) out.push(`- ${p[lang]}`);
    out.push('');
  }
  out.push(`## ${t ? 'Projects' : 'Projeler'}`, '');
  for (const p of PROJECTS) out.push(`- **${p.name}** (${p.stack}): ${p.summary[lang]} ${t ? 'Case study' : 'Vaka çalışması'}: ${abs(projectPath(p.slug, lang))}`);
  out.push('', `## ${t ? 'Education' : 'Eğitim'}`, '');
  for (const s of STUDIES) {
    out.push(`- **${s.degree[lang]}**, ${s.school[lang]} (${s.start}–${s.end}). ${s.focus ? `${s.focus[lang]}. ` : ''}${s.courses[lang]}.`);
  }
  out.push('', `## ${t ? 'Skills' : 'Yetenekler'}`, '');
  for (const g of SKILLS) out.push(`- ${g.group[lang]}: ${g.items.join(', ')}`);
  out.push('', `## ${t ? 'Languages' : 'Diller'}`, '');
  for (const s of SPOKEN) out.push(`- ${s.name[lang]}: ${s.level[lang]}`);
  out.push('', `## ${t ? 'Hackathons and competitions' : 'Hackathon ve yarışmalar'}`, '');
  for (const m of MEDALS) out.push(`- ${m.name}: ${m.result[lang]}`);
  out.push('', `## ${t ? 'Certificates and programs' : 'Sertifika ve programlar'}`, '');
  for (const p of PROGRAMS) out.push(`- ${p.name} (${p.by})`);
  out.push('', `## ${t ? 'Contact' : 'İletişim'}`, '');
  out.push(`- Email: ${PROFILE.email}`, `- LinkedIn: ${PROFILE.linkedin}`, `- GitHub: ${PROFILE.github}`, `- ${t ? 'Website' : 'Web sitesi'}: ${PROFILE.site}`, '');
  return out.join('\n');
}

/** One language of the résumé as Markdown, with where it came from and when it was updated. */
export function resumeMarkdown(lang: Lang, modified: string): string {
  return `${fullSection(lang)}\n---\n\n${lang === 'tr' ? 'Kaynak sayfa' : 'Source page'}: ${abs(PATH.resume[lang])} · ${lang === 'tr' ? 'Güncelleme' : 'Updated'} ${modified}\n`;
}

export function llmsFullTxt(info: BuildInfo, modified: string): string {
  const studies = CASE_STUDIES.map((c) => projectMarkdown(c, 'en', modified, info).replace(/^# /m, '### ').replace(/^## /gm, '#### ')).join('\n');
  return `${fullSection('en')}\n## Case studies\n\n${studies}\n---\n\n${fullSection('tr')}`;
}

/** lastmod per page id ('home' | 'resume' | 'privacy'), as YYYY-MM-DD; articles carry their own */
export function sitemapXml(mods: { content: string; privacy: string; articles: Article[] }): string {
  const alt = (page: 'home' | 'resume') =>
    [...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(PATH[page][l])}" />`), `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(PATH[page].en)}" />`].join('\n');
  const entry = (loc: string, lastmod: string, alternates = '') =>
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>${alternates ? `\n${alternates}` : ''}\n  </url>`;
  const rows: string[] = [];
  for (const page of ['home', 'resume'] as const) {
    for (const l of LANGS) rows.push(entry(abs(PATH[page][l]), mods.content, alt(page)));
  }
  // the projects: the index and one page per project, each in both languages
  const pair = (en: string, tr: string) =>
    [`    <xhtml:link rel="alternate" hreflang="en" href="${abs(en)}" />`, `    <xhtml:link rel="alternate" hreflang="tr" href="${abs(tr)}" />`, `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(en)}" />`].join('\n');
  for (const l of LANGS) rows.push(entry(abs(PROJECTS_PATH[l]), mods.content, pair(PROJECTS_PATH.en, PROJECTS_PATH.tr)));
  for (const c of CASE_STUDIES) for (const l of LANGS) rows.push(entry(abs(studyPath(c, l)), mods.content, pair(studyPath(c, 'en'), studyPath(c, 'tr'))));
  // the writing (English only)
  if (mods.articles.length) {
    rows.push(entry(abs(WRITING_PATH), mods.articles[0].modified));
    for (const a of mods.articles) rows.push(entry(abs(articlePath(a.slug)), a.modified));
  }
  rows.push(entry(abs('/privacy'), mods.privacy));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${rows.join('\n')}
</urlset>
`;
}
