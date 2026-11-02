/**
 * Build-time SEO, part 7: the writing. Articles are Markdown files in content/writing/ with a small front
 * matter (title, description, date, tags); this turns them into /writing/ (the index), /writing/<slug>/,
 * a Markdown copy of each (the source, with absolute links) and the Atom feed. English only.
 *
 * The numbers an article quotes about this site ({{firstScreenKB}}, {{scripts}}, {{suites}}) are the
 * ones the build measured, so they are right on the day the article is published and on every rebuild.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import { PROFILE } from '../../src/os/content/profile';
import { WRITING_PATH, articlePath } from '../../src/os/content/paths';
import { FEED_PATH, META, OG_IMAGE, OG_SIZE, PATH, abs, currentRole, esc } from './site';
import { PERSON_ID, SITE_ID, pageHead, person } from './head';
import { renderPage } from './layout';
import { fill, type BuildInfo } from './projects';

export interface Article {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  tags: string[];
  /** the Markdown after the front matter */
  body: string;
  modified: string;
}

/** `key: value` lines between two `---` lines */
function parse(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!m) throw new Error('[seo] an article needs a front matter (---)');
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

export function loadArticles(root: string, modifiedOf: (file: string) => string): Article[] {
  const dir = join(root, 'content', 'writing');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { meta, body } = parse(readFileSync(join(dir, file), 'utf8'));
      for (const key of ['title', 'description', 'date']) if (!meta[key]) throw new Error(`[seo] ${file}: front matter lacks "${key}"`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`[seo] ${file}: date must be YYYY-MM-DD`);
      return {
        slug: file.replace(/\.md$/, ''),
        title: meta.title,
        description: meta.description,
        date: meta.date,
        tags: (meta.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
        body,
        // the last commit that touched the file (an article that is not committed yet counts from its own date)
        modified: [modifiedOf(join('content', 'writing', file)), meta.date].sort().pop() as string,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const articleMdPath = (a: Pick<Article, 'slug'>): string => `${WRITING_PATH}${a.slug}.md`;
const longDate = (iso: string): string => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const words = (md: string): number => md.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
const html = (md: string): string => marked.parse(md, { async: false, gfm: true }) as string;

export function articlePage(a: Article, info: BuildInfo): string {
  const path = articlePath(a.slug);
  const url = abs(path);
  const body = fill(a.body, info);
  const title = `${a.title} | ${PROFILE.name}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: PROFILE.name, publisher: { '@id': PERSON_ID } },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description: a.description,
        inLanguage: 'en',
        isPartOf: { '@id': SITE_ID },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#article` },
        dateModified: a.modified,
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE.en), ...OG_SIZE },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: PROFILE.name, item: abs('/') },
          { '@type': 'ListItem', position: 2, name: 'Writing', item: abs(WRITING_PATH) },
          { '@type': 'ListItem', position: 3, name: a.title, item: url },
        ],
      },
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: a.title,
        description: a.description,
        url,
        inLanguage: 'en',
        datePublished: a.date,
        dateModified: a.modified,
        keywords: a.tags.join(', '),
        wordCount: words(body),
        author: { '@id': PERSON_ID },
        publisher: { '@id': PERSON_ID },
        mainEntityOfPage: { '@id': `${url}#webpage` },
        image: abs(OG_IMAGE.en),
      },
      person('en'),
    ],
  };
  const head = pageHead({
    lang: 'en',
    title,
    description: a.description,
    alt: META.home.en.alt,
    path,
    markdown: articleMdPath(a),
    feed: true,
    ogType: 'article',
    article: { published: a.date, modified: a.modified, tags: a.tags },
    jsonLd,
  });
  const main = `      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(PROFILE.name)}</a> › <a href="${WRITING_PATH}">Writing</a> › ${esc(a.title)}</nav>
      <article>
        <h1>${esc(a.title)}</h1>
        <p class="meta">By ${esc(PROFILE.name)} · <time datetime="${a.date}">${longDate(a.date)}</time>${a.tags.length ? ` · ${esc(a.tags.join(', '))}` : ''}</p>
        <div class="prose">
${html(body)}
        </div>
      </article>
      <p class="byline">By ${esc(PROFILE.name)}, ${esc(currentRole('en'))}. <a href="${PATH.resume.en}">Resume</a> · <a href="/projects/">Projects</a> · <a href="${FEED_PATH}">Feed</a></p>`;
  return renderPage({ lang: 'en', head, main, modified: a.modified });
}

/** the article as Markdown, with a title, and absolute links so it reads anywhere */
export function articleMarkdown(a: Article, info: BuildInfo): string {
  const body = fill(a.body, info).replace(/\]\(\//g, `](${abs('/')}`);
  return `# ${a.title}\n\n> ${a.description}\n\nBy ${PROFILE.name} · ${a.date}${a.tags.length ? ` · ${a.tags.join(', ')}` : ''}\n\n${body.trimEnd()}\n\n---\n\nSource page: ${abs(articlePath(a.slug))}\n`;
}

export function writingIndexPage(articles: Article[], modified: string): string {
  const url = abs(WRITING_PATH);
  const title = `Writing | ${PROFILE.name}`;
  const description = 'Technical notes by Yamaç Bezirgan: performance budgets, code-drawn pixel art, SEO for single-page apps and lessons from building a desktop OS in the browser.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SITE_ID, url: abs('/'), name: PROFILE.name, publisher: { '@id': PERSON_ID } },
      {
        '@type': 'CollectionPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': SITE_ID },
        dateModified: modified,
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: articles.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: abs(articlePath(a.slug)) })),
        },
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE.en), ...OG_SIZE },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: PROFILE.name, item: abs('/') },
          { '@type': 'ListItem', position: 2, name: 'Writing', item: url },
        ],
      },
      person('en'),
    ],
  };
  const head = pageHead({ lang: 'en', title, description, alt: META.home.en.alt, path: WRITING_PATH, feed: true, ogType: 'website', jsonLd });
  const cards = articles
    .map(
      (a) => `<article class="card">
          <h2><a href="${articlePath(a.slug)}">${esc(a.title)}</a></h2>
          <div class="stack"><time datetime="${a.date}">${longDate(a.date)}</time>${a.tags.length ? ` · ${esc(a.tags.join(', '))}` : ''}</div>
          <p>${esc(a.description)}</p>
          <a class="more" href="${articlePath(a.slug)}">Read the article →</a>
        </article>`
    )
    .join('\n        ');
  const main = `      <nav class="crumbs" aria-label="Breadcrumb"><a href="/">${esc(PROFILE.name)}</a> › Writing</nav>
      <h1>Writing</h1>
      <p class="tagline">Notes on how this site is built, and what broke on real devices. <a href="${FEED_PATH}">Atom feed</a></p>
      <div class="cards">
        ${cards}
      </div>
      <p class="byline">By ${esc(PROFILE.name)}, ${esc(currentRole('en'))}. <a href="${PATH.resume.en}">Resume</a> · <a href="/projects/">Projects</a></p>`;
  return renderPage({ lang: 'en', head, main, modified });
}

const iso = (date: string): string => `${date}T00:00:00Z`;

export function atomFeed(articles: Article[]): string {
  const updated = articles.reduce((latest, a) => (a.modified > latest ? a.modified : latest), articles[0]?.date ?? '1970-01-01');
  const entries = articles
    .map(
      (a) => `  <entry>
    <title>${esc(a.title)}</title>
    <link rel="alternate" type="text/html" href="${abs(articlePath(a.slug))}"/>
    <link rel="alternate" type="text/markdown" href="${abs(articleMdPath(a))}"/>
    <id>${abs(articlePath(a.slug))}</id>
    <published>${iso(a.date)}</published>
    <updated>${iso(a.modified)}</updated>
    <summary>${esc(a.description)}</summary>
${a.tags.map((t) => `    <category term="${esc(t)}"/>`).join('\n')}
  </entry>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <title>${esc(PROFILE.name)}: writing</title>
  <subtitle>Notes on building a desktop OS in the browser</subtitle>
  <link rel="self" type="application/atom+xml" href="${abs(FEED_PATH)}"/>
  <link rel="alternate" type="text/html" href="${abs(WRITING_PATH)}"/>
  <id>${abs(WRITING_PATH)}</id>
  <updated>${iso(updated)}</updated>
  <author>
    <name>${esc(PROFILE.name)}</name>
    <uri>${abs('/')}</uri>
  </author>
${entries}
</feed>
`;
}
