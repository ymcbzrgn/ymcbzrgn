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
  } else {
    ok((body.match(/<h2[ >]/g) || []).length >= 6, 'at least six sections (h2)');
    ok(/Altınbaş/.test(text) && /Milan|Milano/.test(text) && /Python/.test(text) && /Hackathon/i.test(text), 'education, skills and competitions are in the page');
    ok(text.length > 3000, `a full résumé, not a stub (${text.length} characters)`);
    ok(!/telephone|\+90/.test(html), 'no phone number in the page');
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
