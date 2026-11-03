#!/usr/bin/env node
/**
 * SEO / GEO checks on a finished build. The pages are generated (scripts/seo), so this guards the
 * things that silently rot: a link to the dead www host, a page without a canonical, a sitemap entry
 * that is no file, a title that Google will cut, a CV that went back to Canva's defaults.
 *
 *   npm run build:new && npm run check:seo          (DIST_DIR=other/dist to check another build)
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve(process.env.DIST_DIR || 'dist');
const SITE = 'https://yamacbezirgan.com';
const STUDY_SLUGS = ['hydraquant', 'desktop-os-portfolio', 'quirkllm', 'shiffy', 'canny-edge-detection'];
const RESUME = { en: '/resume/', tr: '/tr/ozgecmis/' };
const PAGES = [
  { url: '/', file: 'index.html', lang: 'en', shell: true },
  { url: '/tr/', file: 'tr/index.html', lang: 'tr', shell: true },
  { url: '/resume/', file: 'resume/index.html', lang: 'en' },
  { url: '/tr/ozgecmis/', file: 'tr/ozgecmis/index.html', lang: 'tr' },
];

let failures = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗ FAIL:'} ${msg}`);
  if (!cond) failures += 1;
};
const read = (rel) => readFileSync(join(DIST, rel), 'utf8');
const has = (rel) => existsSync(join(DIST, rel)) && statSync(join(DIST, rel)).isFile();
const all = (re, s) => [...s.matchAll(re)].map((m) => m[1]);
const attr = (s, tag) => all(tag, s);

/** a URL on the site -> the file Cloudflare Pages would serve */
function fileOf(url) {
  const path = url.replace(SITE, '').split('#')[0].split('?')[0] || '/';
  if (path.endsWith('/')) return `${path.slice(1)}index.html`;
  if (has(path.slice(1))) return path.slice(1);
  return `${path.slice(1)}.html`;
}

/** width x height of a JPEG */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

if (!has('index.html')) {
  console.error(`No build found in ${DIST}. Run "npm run build:new" first.`);
  process.exit(2);
}

for (const page of PAGES) {
  console.log(`\n${page.url}`);
  ok(has(page.file), `${page.file} exists`);
  if (!has(page.file)) continue;
  const html = read(page.file);
  const titles = attr(html, /<title>([^<]*)<\/title>/g);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/g);
  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/g);

  ok(new RegExp(`<html lang="${page.lang}"`).test(html), `html lang is ${page.lang}`);
  ok(titles.length === 1 && titles[0].length > 20 && titles[0].length <= 65, `one title, 20-65 characters (${titles[0]?.length}: ${titles[0]})`);
  ok(desc.length === 1 && desc[0].length >= 70 && desc[0].length <= 165, `one description, 70-165 characters (${desc[0]?.length})`);
  ok(canonical.length === 1 && canonical[0] === SITE + page.url, `canonical is ${SITE + page.url}`);
  ok(!/www\.yamacbezirgan/i.test(html), 'no link to the dead www host');
  ok(/name="robots" content="index, follow/.test(html), 'robots meta allows indexing');

  const alternates = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  ok(alternates.en && alternates.tr && alternates['x-default'], 'hreflang en, tr and x-default');
  ok(Object.values(alternates).every((u) => u.startsWith(SITE) && has(fileOf(u))), 'every hreflang target is a page of this build');

  const og = (p) => attr(html, new RegExp(`<meta property="${p}" content="([^"]*)"`, 'g'))[0];
  ok(og('og:url') === SITE + page.url, 'og:url is the canonical url');
  ok(og('og:title') && og('og:description') && og('og:image:alt'), 'og title, description and image alt');
  const image = og('og:image');
  ok(image?.startsWith(SITE + '/') && has(image.replace(SITE + '/', '')), `og:image is a file of this build (${image})`);
  if (image && has(image.replace(SITE + '/', ''))) {
    const size = jpegSize(readFileSync(join(DIST, image.replace(SITE + '/', ''))));
    ok(size && size.w === 1200 && size.h === 630, `og:image is 1200x630 (${size?.w}x${size?.h})`);
  }

  // JSON-LD
  const ld = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  ok(ld.length === 1, 'one JSON-LD block');
  try {
    const graph = JSON.parse(ld[0])['@graph'];
    const ids = new Set(graph.map((n) => n['@id']));
    const person = graph.find((n) => n['@type'] === 'Person');
    ok(['WebSite', 'ProfilePage', 'Person'].every((t) => graph.some((n) => n['@type'] === t)), 'JSON-LD: WebSite, ProfilePage and Person');
    ok(person && person.name === 'Yamaç Bezirgan' && person.alternateName.includes('Yamac Bezirgan'), 'Person: name and the spelling without diacritics');
    ok(person && person.sameAs.length >= 2 && person.worksFor?.name && person.jobTitle && person.image?.startsWith(SITE), 'Person: sameAs, employer, job title, image');
    ok(!('telephone' in person), 'Person: no phone number');
    ok(graph.every((n) => !n.mainEntity || ids.has(n.mainEntity['@id'])), 'JSON-LD: @id references resolve');
  } catch (e) {
    ok(false, `JSON-LD parses (${e.message})`);
  }

  // what a visitor without JavaScript reads
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const h1 = attr(body, /<h1[^>]*>([\s\S]*?)<\/h1>/g);
  ok(h1.length === 1 && /Yamaç Bezirgan/.test(h1[0]), 'exactly one <h1>, with the name');
  ok(/Arketic AI/.test(text), 'the employer is in the plain HTML');
  if (page.shell) {
    ok(/id="boot"/.test(html) && /id="root"/.test(html), 'boot block and #root are both there');
    ok(text.length > 250, `plain HTML says something (${text.length} characters)`);

    // The desktop is client-rendered. A crawler that runs no script (most AI crawlers) reads this block and
    // nothing else of the home page, so it has to say enough and lead to every other page.
    const boot = (html.match(/<!--seo:boot:start-->([\s\S]*?)<!--seo:boot:end-->/) || [])[1] || '';
    const words = boot.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    ok(words >= 120, `boot block: enough words for a crawler that runs no script (${words}, at least 120)`);
    const base = page.lang === 'en' ? '/projects/' : '/tr/projeler/';
    const wanted = [RESUME[page.lang], base, ...STUDY_SLUGS.map((s) => `${base}${s}/`), '/writing/', page.lang === 'en' ? '/tr/' : '/', '/llms.txt'];
    const hrefs = all(/href="(\/[^"]*)"/g, boot);
    const absent = wanted.filter((w) => !hrefs.includes(w));
    ok(absent.length === 0, `boot block: links the resume, the project index, every case study, the writing, the other language and llms.txt${absent.length ? ', missing: ' + absent.join(', ') : ''}`);
    ok(hrefs.every((h) => has(fileOf(SITE + h))), 'boot block: every link on this site is a file of this build');
    ok((boot.match(/<noscript>/g) || []).length === 1 && /<details class="boot__more">/.test(boot), 'boot block: one <noscript> note, and the projects sit in a <details> (the card stays small while the page loads)');
  } else {
    ok((body.match(/<h2[ >]/g) || []).length >= 6, 'at least six sections (h2)');
    ok(/Altınbaş/.test(text) && /Milan|Milano/.test(text) && /Python/.test(text) && /Hackathon/i.test(text), 'education, skills and competitions are in the page');
    ok(text.length > 3000, `a full résumé, not a stub (${text.length} characters)`);
    ok(!/telephone|\+90/.test(html), 'no phone number in the page');
    const projectsBase = page.lang === 'en' ? '/projects/' : '/tr/projeler/';
    ok(STUDY_SLUGS.every((s) => html.includes(`href="${projectsBase}${s}/"`)) && html.includes(`href="${projectsBase}"`), 'every project card links to its case study, and the index is linked');
    // internal links must resolve
    const links = [...new Set(all(/href="(\/[^"#?]*)/g, html))].filter((l) => !l.startsWith('//'));
    const broken = links.filter((l) => !(has(fileOf(SITE + l)) || has(l.slice(1))));
    ok(broken.length === 0, `internal links resolve (${links.length} checked${broken.length ? ', broken: ' + broken.join(', ') : ''})`);
  }
}

console.log('\nsitemap.xml, robots.txt, llms.txt, 404');
const sitemap = has('sitemap.xml') ? read('sitemap.xml') : '';
const locs = all(/<loc>([^<]+)<\/loc>/g, sitemap);
ok(locs.length >= 5, `sitemap lists ${locs.length} pages`);
ok(PAGES.every((p) => locs.includes(SITE + p.url)) && locs.includes(SITE + '/privacy'), 'every page of the site is in the sitemap');
ok(locs.every((l) => l.startsWith(SITE + '/') && has(fileOf(l))), 'every sitemap entry is a file of this build');
ok(!/www\.yamacbezirgan/.test(sitemap) && all(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g, sitemap).length === locs.length, 'sitemap: no www, every entry has a lastmod');
const robots = has('robots.txt') ? read('robots.txt') : '';
ok(robots.includes(`Sitemap: ${SITE}/sitemap.xml`) && !/www\.yamacbezirgan/.test(robots) && !/Crawl-delay/i.test(robots), 'robots.txt points at the sitemap, no www, no crawl-delay');
ok(/Disallow: \/legacy\//.test(robots) && !/^User-agent: (Googlebot|Bingbot)/m.test(robots), 'robots.txt: legacy stays out, no per-bot group that would bypass it');
for (const bot of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']) {
  const group = robots.split(/\n\s*\n/).find((g) => new RegExp(`^User-agent: ${bot}$`, 'm').test(g)) || '';
  ok(/^Allow: \/$/m.test(group) && /^Disallow: \/legacy\/$/m.test(group), `robots.txt: ${bot} is welcome (and still kept out of /legacy/)`);
}
ok(has('llms.txt') && read('llms.txt').startsWith('# Yamaç Bezirgan') && read('llms.txt').includes(SITE + '/resume/'), 'llms.txt names the person and links the resume');
ok(has('llms-full.txt') && read('llms-full.txt').includes('Arketic AI') && read('llms-full.txt').includes('(Türkçe)'), 'llms-full.txt has both languages');
// every address of this site that llms.txt and llms-full.txt hand to an assistant has to be a file of this build
for (const file of ['llms.txt', 'llms-full.txt']) {
  const urls = [...new Set([...read(file).matchAll(/https:\/\/yamacbezirgan\.com[^\s)\]>"',]*/g)].map((m) => m[0].replace(/[.:;*]+$/, '')))];
  const dead = urls.filter((u) => !has(fileOf(u)));
  ok(urls.length >= 10 && dead.length === 0, `${file}: all ${urls.length} addresses of this site are files of this build${dead.length ? ', missing: ' + dead.join(', ') : ''}`);
}

// _headers: the file the host reads. A rule is only worth having if it can match an address that is served.
const headerRules = [];
for (const line of (has('_headers') ? read('_headers') : '').split('\n')) {
  if (/^\s*(#|$)/.test(line)) continue;
  if (/^\S/.test(line)) headerRules.push({ path: line.trim(), headers: new Map() });
  else {
    const m = line.trim().match(/^([A-Za-z0-9-]+):\s*(.+)$/);
    if (m && headerRules.length) headerRules.at(-1).headers.set(m[1].toLowerCase(), m[2]);
  }
}
const rule = (path) => headerRules.find((r) => r.path === path);
ok(headerRules.length > 0, `_headers has ${headerRules.length} rules`);
ok(!headerRules.some((r) => /\/index\.html$/.test(r.path)), '_headers: no rule for an /index.html address (Pages redirects it to the folder address, so the rule would never apply)');
ok(rule('/*')?.headers.has('strict-transport-security') && rule('/*')?.headers.has('permissions-policy'), '_headers: HSTS and Permissions-Policy on every response');
ok(rule('/')?.headers.get('x-frame-options') === 'SAMEORIGIN' && rule('/*/')?.headers.get('x-frame-options') === 'SAMEORIGIN', '_headers: X-Frame-Options SAMEORIGIN on the home page and on every page address');
const repeated = [...(rule('/*')?.headers.keys() ?? [])].filter((h) => headerRules.some((r) => r.path !== '/*' && r.headers.has(h)));
ok(repeated.length === 0, `_headers: no other rule repeats a header of /* (Pages would join the two values)${repeated.length ? ': ' + repeated.join(', ') : ''}`);
ok(has('404.html') && /name="robots" content="noindex"/.test(read('404.html')), '404.html exists and is noindex');
for (const [file, url, lang] of [['resume.md', '/resume/', 'en'], ['tr/ozgecmis.md', '/tr/ozgecmis/', 'tr']]) {
  const md = has(file) ? read(file) : '';
  ok(md.startsWith('# Yamaç Bezirgan') && md.includes('Arketic AI') && md.includes(`${SITE}${url}`) && !/<\/?[a-z][^>]*>/i.test(md), `${file}: the résumé as plain Markdown, pointing back at its page`);
  const html = read(`${url.slice(1)}index.html`);
  ok(html.includes(`<link rel="alternate" type="text/markdown" href="${SITE}/${file}"`), `${url} advertises ${file}`);
  ok(read('llms.txt').includes(`${SITE}/${file}`), `llms.txt links ${file}`);
}
ok(has('privacy.html') && read('privacy.html').includes(`<link rel="canonical" href="${SITE}/privacy"`), 'privacy page has its canonical');
ok(!has('og-image.jpg'), 'the old og-image.jpg (with typos) is gone');

console.log('\nprojects and writing');
const STUDIES = ['hydraquant', 'desktop-os-portfolio', 'quirkllm', 'shiffy', 'canny-edge-detection'];
const ARTICLES = ['desktop-os-80kb'];
const newPages = [];
for (const [lang, base] of [['en', '/projects/'], ['tr', '/tr/projeler/']]) {
  newPages.push({ url: base, lang, kind: 'projects', both: true });
  for (const slug of STUDIES) newPages.push({ url: `${base}${slug}/`, lang, kind: 'project', both: true, md: `${base}${slug}.md` });
}
newPages.push({ url: '/writing/', lang: 'en', kind: 'writing' });
for (const slug of ARTICLES) newPages.push({ url: `/writing/${slug}/`, lang: 'en', kind: 'article', md: `/writing/${slug}.md` });

const tokens = /\{\{?(firstScreenKB|scripts|suites)\}?\}/;
for (const page of newPages) {
  const file = fileOf(SITE + page.url);
  if (!has(file)) {
    ok(false, `${page.url} exists`);
    continue;
  }
  const html = read(file);
  const titles = attr(html, /<title>([^<]*)<\/title>/g);
  const desc = attr(html, /<meta name="description" content="([^"]*)"/g);
  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/g);
  const alternates = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const label = page.url;

  ok(new RegExp(`<html lang="${page.lang}"`).test(html), `${label}: html lang is ${page.lang}`);
  ok(titles.length === 1 && titles[0].length >= 20 && titles[0].length <= 65, `${label}: one title, 20-65 characters (${titles[0]?.length})`);
  ok(desc.length === 1 && desc[0].length >= 70 && desc[0].length <= 165, `${label}: one description, 70-165 characters (${desc[0]?.length})`);
  ok(canonical.length === 1 && canonical[0] === SITE + page.url, `${label}: canonical is itself`);
  ok(!/www\.yamacbezirgan/i.test(html) && /name="robots" content="index, follow/.test(html), `${label}: no dead www link, indexable`);
  ok(alternates[page.lang] === SITE + page.url && alternates['x-default'] && Object.values(alternates).every((u) => u.startsWith(SITE) && has(fileOf(u))), `${label}: hreflang points at pages of this build`);
  if (page.both) ok(alternates.en && alternates.tr && alternates.en !== alternates.tr, `${label}: it has its Turkish and English twin`);
  ok(attr(body, /<h1[^>]*>([\s\S]*?)<\/h1>/g).length === 1, `${label}: exactly one <h1>`);
  ok(!tokens.test(html) && !/telephone|\+90/.test(html), `${label}: no unfilled {tokens}, no phone number`);
  const links = [...new Set(all(/href="(\/[^"#?]*)/g, html))].filter((l) => !l.startsWith('//'));
  const broken = links.filter((l) => !(has(fileOf(SITE + l)) || has(l.slice(1))));
  ok(broken.length === 0, `${label}: internal links resolve (${links.length} checked${broken.length ? ', broken: ' + broken.join(', ') : ''})`);
  ok(attr(html, /<meta property="og:image" content="([^"]*)"/g)[0]?.startsWith(SITE + '/'), `${label}: social preview image`);

  // structured data
  const ld = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  ok(ld.length === 1, `${label}: one JSON-LD block`);
  try {
    const graph = JSON.parse(ld[0])['@graph'];
    const types = graph.map((n) => n['@type']);
    const ids = new Set(graph.map((n) => n['@id']));
    ok(types.includes('Person') && types.includes('BreadcrumbList') && types.includes('WebPage') || types.includes('CollectionPage'), `${label}: JSON-LD has the person, a breadcrumb and the page`);
    ok(graph.every((n) => !n.breadcrumb || ids.has(n.breadcrumb['@id'])) && graph.every((n) => !n.mainEntity?.['@id'] || ids.has(n.mainEntity['@id'])), `${label}: JSON-LD @id references resolve`);
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
    ok(crumbs && crumbs.itemListElement.length >= 2 && crumbs.itemListElement.at(-1).item === SITE + page.url, `${label}: breadcrumb ends at this page`);
    if (page.kind === 'project') {
      const code = graph.find((n) => n['@type'] === 'SoftwareSourceCode');
      ok(code && code.codeRepository?.startsWith('https://github.com/ymcbzrgn/') && code.author?.['@id'] && code.programmingLanguage?.length > 0, `${label}: SoftwareSourceCode with repository, language and author`);
      ok(text.length > 1800, `${label}: a real case study, not a stub (${text.length} characters)`);
    }
    if (page.kind === 'projects') {
      const list = graph.find((n) => n['@type'] === 'CollectionPage')?.mainEntity?.itemListElement ?? [];
      ok(list.length === STUDIES.length && list.every((i) => has(fileOf(i.url))), `${label}: the item list names all ${STUDIES.length} projects`);
    }
    if (page.kind === 'article') {
      const art = graph.find((n) => n['@type'] === 'TechArticle');
      ok(art && /^\d{4}-\d{2}-\d{2}$/.test(art.datePublished) && art.wordCount > 600 && art.author?.['@id'], `${label}: TechArticle with date, word count and author`);
      ok(attr(html, /<meta property="og:type" content="([^"]*)"/g)[0] === 'article' && /<meta property="article:published_time"/.test(html), `${label}: Open Graph article`);
      ok(text.length > 5000 && (html.match(/<pre>/g) || []).length >= 3, `${label}: the whole article, with code blocks (${text.length} characters)`);
    }
  } catch (e) {
    ok(false, `${label}: JSON-LD parses (${e.message})`);
  }

  // the Markdown copy
  if (page.md) {
    const md = has(page.md.slice(1)) ? read(page.md.slice(1)) : '';
    const prose = md.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, ''); // (code may show tags)
    ok(md.startsWith('# ') && md.includes(SITE + page.url) && !/<\/?[a-z][^>]*>/i.test(prose) && !tokens.test(md), `${page.md}: plain Markdown that points back at its page`);
    ok(html.includes(`<link rel="alternate" type="text/markdown" href="${SITE}${page.md}"`), `${label}: advertises ${page.md}`);
    if (page.lang === 'en') ok(read('llms.txt').includes(SITE + page.md), `llms.txt links ${page.md}`);
  }
}
// llms.txt names every English page, the sitemap every page
for (const page of newPages) {
  ok(locs.includes(SITE + page.url), `sitemap lists ${page.url}`);
  if (page.lang === 'en' && page.kind !== 'writing') ok(read('llms.txt').includes(SITE + page.url), `llms.txt links ${page.url}`);
}
ok(read('llms-full.txt').includes('## Case studies') && STUDIES.every((s) => read('llms-full.txt').includes(`${SITE}/projects/${s}/`)), 'llms-full.txt carries the case studies');

// the feed
const feed = has('feed.xml') ? read('feed.xml') : '';
ok(feed.startsWith('<?xml') && feed.includes('<feed xmlns="http://www.w3.org/2005/Atom"') && feed.trimEnd().endsWith('</feed>'), 'feed.xml is an Atom feed');
ok((feed.match(/<entry>/g) || []).length === ARTICLES.length && (feed.match(/<\/entry>/g) || []).length === ARTICLES.length, `the feed has ${ARTICLES.length} entry`);
ok(!/&(?!amp;|lt;|gt;|quot;|#39;)/.test(feed) && all(/<id>([^<]+)<\/id>/g, feed).every((u) => u.startsWith(SITE + '/')), 'the feed escapes its text and uses absolute ids');
ok(all(/<link rel="alternate" type="text\/html" href="([^"]+)"/g, feed).every((u) => has(fileOf(u))), 'every link of the feed is a page of this build');
ok(/<link rel="self" type="application\/atom\+xml" href="https:\/\/yamacbezirgan\.com\/feed\.xml"/.test(feed), 'the feed names itself');
ok(read('index.html').includes('type="application/atom+xml"') && read('writing/index.html').includes('type="application/atom+xml"'), 'the desktop and the writing index advertise the feed');
ok(read('llms.txt').includes(SITE + '/feed.xml'), 'llms.txt links the feed');

// numbers the case study of this site quotes come from this build
const info = has('data/build-info.json') ? JSON.parse(read('data/build-info.json')) : {};
const self = read('projects/desktop-os-portfolio/index.html');
ok(info.firstScreenKB > 40 && self.includes(`${info.firstScreenKB} KB gzip`) && self.includes(`${info.suites} Playwright suites`), `the case study of this site quotes the measured numbers (${info.firstScreenKB} KB, ${info.suites} suites)`);
ok(read('writing/desktop-os-80kb/index.html').includes(`${info.firstScreenKB} KB gzip`), 'and so does the article');

console.log('\nthe CV');
/** the text strings of a PDF ("(...)" literals, octal escapes and UTF-16BE decoded) */
function pdfStrings(latin1) {
  const out = [];
  for (const m of latin1.matchAll(/\(((?:[^()\\]|\\[\s\S])*)\)/g)) {
    let t = m[1]
      .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/\\([\\()nrtbf])/g, (_, c) => ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[c] ?? c);
    if (t.startsWith('\u00fe\u00ff')) {
      let u = '';
      for (let i = 2; i + 1 < t.length; i += 2) u += String.fromCharCode((t.charCodeAt(i) << 8) | t.charCodeAt(i + 1));
      t = u;
    }
    out.push(t);
  }
  return out;
}
const cv = has('YAMAC_BEZIRGAN_CURRENT_CV.pdf') ? pdfStrings(readFileSync(join(DIST, 'YAMAC_BEZIRGAN_CURRENT_CV.pdf')).toString('latin1')) : [];
ok(cv.length > 0, 'CV pdf exists');
ok(!cv.some((t) => /www\.yamacbezirgan/i.test(t)), 'CV: no link to the dead www host (python3 scripts/seo/fix-cv-pdf.py fixes a fresh Canva export)');
ok(cv.includes('https://yamacbezirgan.com/'), 'CV: the website link goes to https://yamacbezirgan.com/');
ok(cv.some((t) => /CV \(Software Engineer\)/.test(t)) && !cv.some((t) => /^YAMA.?_BEZ.*\.pdf$/i.test(t)), 'CV: the document title is a real title, not the file name');

console.log(failures ? `\n${failures} SEO check(s) failed` : '\nSEO checks passed');
process.exit(failures ? 1 : 0);
