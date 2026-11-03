/**
 * Build-time SEO, part 6: one page per project (case studies) and their index, in both languages:
 * /projects/ and /projects/<slug>/, /tr/projeler/ and /tr/projeler/<slug>/, plus a Markdown copy of each.
 * The words are in src/os/content/caseStudies.ts; the facts about the project (name, stack, summary) come
 * from career.ts, so a project is described the same way on its page, in the résumé and in the app.
 */
import { PROFILE } from '../../src/os/content/profile';
import { PROJECTS } from '../../src/os/content/career';
import { CASE_STUDIES, type CaseStudy } from '../../src/os/content/caseStudies';
import { PROJECTS_PATH, projectPath } from '../../src/os/content/paths';
import { META, OG_IMAGE, OG_SIZE, PATH, abs, currentRole, esc, type Lang } from './site';
import { PERSON_ID, SITE_ID, pageHead, person } from './head';
import { renderPage } from './layout';
import type { BootProject } from './pages';

/** What the build measured about itself (dist/data/build-info.json); the case study of this site quotes it. */
export interface BuildInfo {
  built: string;
  commit: string;
  firstScreenKB: number;
  scripts: number;
  suites: number;
}

export const FALLBACK_INFO: BuildInfo = { built: '', commit: '', firstScreenKB: 76, scripts: 80, suites: 15 };

/** {firstScreenKB} and friends -> the measured numbers */
export function fill(text: string, info: BuildInfo): string {
  return text
    .replace(/\{\{?firstScreenKB\}?\}/g, String(info.firstScreenKB))
    .replace(/\{\{?scripts\}?\}/g, String(info.scripts))
    .replace(/\{\{?suites\}?\}/g, String(info.suites));
}

const T = {
  en: {
    crumbs: 'Breadcrumb',
    projects: 'Projects',
    source: 'Source code on GitHub',
    live: 'Live site',
    resume: 'Resume',
    other: 'Other projects',
    read: 'Read the case study',
    by: `By ${PROFILE.name}, ${'{role}'}.`,
    contact: 'Email',
    indexTitle: `Projects and case studies | ${PROFILE.name}`,
    indexDescription: 'Case studies of the projects of Yamaç Bezirgan: an AI trading engine, a local coding assistant, an AI shift scheduler, a computer-vision app and this portfolio.',
    indexIntro: 'What I have built, how each project is put together and what it is for. The code is on GitHub, and these pages explain the decisions behind it.',
    moreGitHub: 'More repositories are on GitHub',
    updated: 'Updated',
    page: 'Page',
    facts: 'Facts',
    stack: 'Stack',
    sourceShort: 'Source',
  },
  tr: {
    crumbs: 'Gezinti yolu',
    projects: 'Projeler',
    source: "GitHub'da kaynak kodu",
    live: 'Canlı site',
    resume: 'Özgeçmiş',
    other: 'Diğer projeler',
    read: 'Vaka çalışmasını oku',
    by: `${PROFILE.name}, ${'{role}'}.`,
    contact: 'E-posta',
    indexTitle: `Projeler ve vaka çalışmaları | ${PROFILE.name}`,
    indexDescription: "Yamaç Bezirgan'ın proje vaka çalışmaları: yapay zeka ticaret motoru, yerel kodlama asistanı, vardiya planlayıcı, görüntü işleme uygulaması ve bu portfolyo.",
    indexIntro: 'Neler geliştirdim, her biri nasıl kurulu ve ne işe yarıyor. Kod GitHub’da, bu sayfalarda arkasındaki kararları anlatıyorum.',
    moreGitHub: 'Daha fazla depo GitHub’da',
    updated: 'Güncelleme',
    page: 'Sayfa',
    facts: 'Bilgiler',
    stack: 'Teknoloji',
    sourceShort: 'Kaynak',
  },
} as const;

const byId = (id: string) => {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) throw new Error(`[seo] case study "${id}" has no project in career.ts`);
  return p;
};

/** the name shown as the page title: what comes before the colon of the title */
export const heading = (study: CaseStudy, lang: Lang): string => study.title[lang].split(':')[0].trim();

const bylineText = (lang: Lang) => T[lang].by.replace('{role}', currentRole(lang));
const pageTitle = (study: CaseStudy, lang: Lang) => `${study.title[lang]} | ${PROFILE.name}`;

export const studyPath = (study: CaseStudy, lang: Lang): string => projectPath(byId(study.id).slug, lang);
const studyMd = (study: CaseStudy, lang: Lang): string => `${PROJECTS_PATH[lang]}${byId(study.id).slug}.md`;
export const studyMdPath = studyMd;

/** The projects as the boot block of the home page lists them: name, address, one sentence (the tagline). */
export function bootProjects(lang: Lang): BootProject[] {
  return CASE_STUDIES.map((s) => ({ name: heading(s, lang), href: studyPath(s, lang), about: s.tagline[lang] }));
}

/** the structured data of a project page */
function studyGraph(study: CaseStudy, lang: Lang, modified: string) {
  const p = byId(study.id);
  const url = abs(studyPath(study, lang));
  const name = heading(study, lang);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: PROFILE.name, publisher: { '@id': PERSON_ID } },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: pageTitle(study, lang),
        description: study.description[lang],
        inLanguage: lang,
        isPartOf: { '@id': SITE_ID },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#software` },
        dateModified: modified,
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE[lang]), ...OG_SIZE },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: PROFILE.name, item: abs(PATH.home[lang]) },
          { '@type': 'ListItem', position: 2, name: T[lang].projects, item: abs(PROJECTS_PATH[lang]) },
          { '@type': 'ListItem', position: 3, name, item: url },
        ],
      },
      {
        '@type': 'SoftwareSourceCode',
        '@id': `${url}#software`,
        name,
        description: study.description[lang],
        url,
        codeRepository: study.repo,
        programmingLanguage: study.languages,
        keywords: study.keywords.join(', '),
        author: { '@id': PERSON_ID },
        ...(study.demo ? { sameAs: [study.demo] } : {}),
        about: p.stack,
      },
      person(lang),
    ],
  };
}

export function projectPage(study: CaseStudy, lang: Lang, modified: string, info: BuildInfo): string {
  const L = T[lang];
  const p = byId(study.id);
  const name = heading(study, lang);
  const path = studyPath(study, lang);
  const other: Lang = lang === 'en' ? 'tr' : 'en';
  const head = pageHead({
    lang,
    title: pageTitle(study, lang),
    description: study.description[lang],
    alt: META.home[lang].alt,
    path,
    alternates: { en: studyPath(study, 'en'), tr: studyPath(study, 'tr') },
    markdown: studyMd(study, lang),
    ogType: 'website',
    jsonLd: studyGraph(study, lang, modified),
  });

  const facts = study.facts.map((f) => `<div><dt>${esc(f.label[lang])}</dt><dd>${esc(fill(f.value[lang], info))}</dd></div>`).join('\n          ');
  const sections = study.sections
    .map((s) => {
      const paragraphs = (s.paragraphs ?? []).map((x) => `<p>${esc(fill(x[lang], info))}</p>`).join('\n          ');
      const bullets = s.bullets ? `<ul>\n            ${s.bullets.map((x) => `<li>${esc(fill(x[lang], info))}</li>`).join('\n            ')}\n          </ul>` : '';
      return `<section>\n          <h2>${esc(s.title[lang])}</h2>\n          ${paragraphs}${bullets}\n        </section>`;
    })
    .join('\n        ');
  const others = CASE_STUDIES.filter((s) => s.id !== study.id)
    .map((s) => `<li><a href="${studyPath(s, lang)}">${esc(heading(s, lang))}</a><br /><span class="stack">${esc(fill(s.tagline[lang], info))}</span></li>`)
    .join('\n          ');

  const main = `      <nav class="crumbs" aria-label="${L.crumbs}"><a href="${PATH.home[lang]}">${esc(PROFILE.name)}</a> › <a href="${PROJECTS_PATH[lang]}">${L.projects}</a> › ${esc(name)}</nav>
      <h1>${esc(name)}</h1>
      <p class="tagline">${esc(fill(study.tagline[lang], info))}</p>
      <p class="chip">${esc(p.stack)}</p>
      <p class="cta">
        <a class="btn btn--primary" href="${esc(study.repo)}" rel="noopener">${L.source}</a>${study.demo ? `\n        <a class="btn btn--soft" href="${esc(study.demo)}" rel="noopener">${L.live}</a>` : ''}
        <a class="btn btn--ghost" href="${PATH.resume[lang]}">${L.resume}</a>
      </p>
      <dl class="facts">
          ${facts}
      </dl>
      <div class="prose">
        ${sections}
      </div>
      <section id="other">
        <h2>${L.other}</h2>
        <ul>
          ${others}
        </ul>
      </section>
      <p class="byline">${esc(bylineText(lang))} <a href="${PATH.resume[lang]}">${L.resume}</a> · <a href="mailto:${PROFILE.email}">${L.contact}</a></p>`;

  return renderPage({ lang, head, main, other: { lang: other, href: studyPath(study, other) }, modified });
}

export function projectsIndexPage(lang: Lang, modified: string, info: BuildInfo): string {
  const L = T[lang];
  const other: Lang = lang === 'en' ? 'tr' : 'en';
  const url = abs(PROJECTS_PATH[lang]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: PROFILE.name, publisher: { '@id': PERSON_ID } },
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: L.indexTitle,
        description: L.indexDescription,
        inLanguage: lang,
        isPartOf: { '@id': SITE_ID },
        dateModified: modified,
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: CASE_STUDIES.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: heading(s, lang), url: abs(studyPath(s, lang)) })),
        },
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE[lang]), ...OG_SIZE },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: PROFILE.name, item: abs(PATH.home[lang]) },
          { '@type': 'ListItem', position: 2, name: L.projects, item: url },
        ],
      },
      person(lang),
    ],
  };
  const head = pageHead({
    lang,
    title: L.indexTitle,
    description: L.indexDescription,
    alt: META.home[lang].alt,
    path: PROJECTS_PATH[lang],
    alternates: { en: PROJECTS_PATH.en, tr: PROJECTS_PATH.tr },
    ogType: 'website',
    jsonLd,
  });
  const cards = CASE_STUDIES.map((s) => {
    const p = byId(s.id);
    const href = studyPath(s, lang);
    return `<article class="card">
          <h2><a href="${href}">${esc(heading(s, lang))}</a></h2>
          <div class="stack">${esc(p.stack)}</div>
          <p>${esc(fill(s.tagline[lang], info))}</p>
          <a class="more" href="${href}">${L.read} →</a>
        </article>`;
  }).join('\n        ');
  const main = `      <nav class="crumbs" aria-label="${L.crumbs}"><a href="${PATH.home[lang]}">${esc(PROFILE.name)}</a> › ${L.projects}</nav>
      <h1>${L.projects}</h1>
      <p class="tagline">${esc(L.indexIntro)}</p>
      <div class="cards">
        ${cards}
      </div>
      <p class="byline">${esc(bylineText(lang))} <a href="${PATH.resume[lang]}">${L.resume}</a> · <a href="${PROFILE.github}" rel="noopener">${L.moreGitHub}</a></p>`;
  return renderPage({ lang, head, main, other: { lang: other, href: PROJECTS_PATH[other] }, modified });
}

/** a project as plain Markdown (for assistants and agents that prefer it to HTML) */
export function projectMarkdown(study: CaseStudy, lang: Lang, modified: string, info: BuildInfo): string {
  const L = T[lang];
  const p = byId(study.id);
  const out: string[] = [`# ${heading(study, lang)}`, '', `> ${fill(study.tagline[lang], info)}`, ''];
  out.push(`- ${L.stack}: ${p.stack}`, `- ${L.sourceShort}: ${study.repo}`);
  if (study.demo) out.push(`- ${L.live}: ${study.demo}`);
  out.push(`- ${L.page}: ${abs(studyPath(study, lang))}`, `- ${L.updated}: ${modified}`, '', `## ${L.facts}`, '');
  for (const f of study.facts) out.push(`- ${f.label[lang]}: ${fill(f.value[lang], info)}`);
  for (const s of study.sections) {
    const parts = [...(s.paragraphs ?? []).map((x) => fill(x[lang], info)), ...(s.bullets ? [s.bullets.map((x) => `- ${fill(x[lang], info)}`).join('\n')] : [])];
    out.push('', `## ${s.title[lang]}`, '', parts.join('\n\n'));
  }
  out.push('', '---', '', `${bylineText(lang)} ${L.resume}: ${abs(PATH.resume[lang])}`, '');
  return out.join('\n');
}
