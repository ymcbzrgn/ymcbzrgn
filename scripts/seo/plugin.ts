/**
 * Vite plugin: SEO and GEO for a single-page app.
 *
 * The desktop is client-rendered, so on its own the HTML a crawler downloads is an empty <div>. This
 * plugin makes sure the first bytes already say who this is:
 *   - index.html gets the title, description, canonical, hreflang, Open Graph and JSON-LD, plus a
 *     small "boot" block with the name, role and links (main.tsx removes it when the desktop is up);
 *   - after the bundle is written it derives /tr/ (the same shell in Turkish), the static résumé
 *     pages (/resume/, /tr/ozgecmis/), 404.html, sitemap.xml, llms.txt and llms-full.txt.
 *
 * Works with plain `vite build`, so whichever command the host runs, the pages are there.
 * Optional input: dist/data/github-repos.json (the build-time snapshot) adds "More on GitHub".
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { headBlock } from './head';
import { BOOT_STYLE, bootBlock, notFoundPage, resumePage, type Repo } from './pages';
import { MD_PATH, PATH } from './site';
import { llmsFullTxt, llmsTxt, resumeMarkdown, sitemapXml } from './text';

const HEAD = /<!--seo:head:start-->[\s\S]*?<!--seo:head:end-->/;
const BOOT = /<!--seo:boot:start-->[\s\S]*?<!--seo:boot:end-->/;

const today = () => new Date().toISOString().slice(0, 10);

/** Date of the last commit that touched any of the paths (YYYY-MM-DD), or the fallback. */
function gitDate(root: string, paths: string[], fallback: string): string {
  try {
    const out = execSync(`git log -1 --format=%cs -- ${paths.map((p) => JSON.stringify(p)).join(' ')}`, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : fallback;
  } catch {
    return fallback;
  }
}

function readRepos(dist: string): Repo[] {
  try {
    const file = join(dist, 'data', 'github-repos.json');
    if (!existsSync(file)) return [];
    const data = JSON.parse(readFileSync(file, 'utf8')) as { repos?: Repo[] };
    return Array.isArray(data.repos) ? data.repos : [];
  } catch {
    return [];
  }
}

/**
 * What the "How this site is built" window shows, measured on this very build (dist/data/build-info.json):
 * the gzip weight of everything index.html loads (the first screen), how many scripts there are in all,
 * how many browser test suites the repository has, and which commit this is.
 */
function buildInfo(root: string, dist: string, html: string): Record<string, unknown> {
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  const gz = (rel: string) => gzipSync(readFileSync(join(dist, rel)), { level: 9 }).length;
  const firstScreenBytes = [...new Set(refs)].reduce((sum, ref) => sum + gz(ref.slice(1)), 0);
  const scripts = existsSync(join(dist, 'assets')) ? readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js')).length : 0;
  const testsDir = join(root, 'tests', 'e2e');
  const suites = existsSync(testsDir) ? readdirSync(testsDir).filter((f) => f.endsWith('.test.cjs')).length : 0;
  let commit = '';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    /* no git here */
  }
  return { built: today(), commit, firstScreenKB: Math.round((firstScreenBytes / 1024) * 10) / 10, scripts, suites };
}

/**
 * The Projects window falls back to dist/data/github-repos.json when the live GitHub API refuses. When the
 * build could not take a snapshot (no network, rate limit) the file is simply missing, and the request for it
 * would show up as a red 404 in the visitor's console. An empty list answers it quietly (the app treats an
 * empty list as "no snapshot").
 */
function ensureSnapshot(dist: string): void {
  const file = join(dist, 'data', 'github-repos.json');
  if (!existsSync(file)) write(dist, 'data/github-repos.json', JSON.stringify({ generatedAt: 0, repos: [] }) + '\n');
}

function write(dist: string, rel: string, body: string): void {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

export function seoPlugin(): Plugin {
  let root = process.cwd();
  let dist = resolve(root, 'dist');
  let building = false;

  const shell = (lang: 'en' | 'tr', modified: string) => ({
    head: `<!--seo:head:start-->\n    ${headBlock('home', lang, modified)}\n    ${BOOT_STYLE}\n    <!--seo:head:end-->`,
    boot: `<!--seo:boot:start-->${bootBlock(lang)}<!--seo:boot:end-->`,
  });

  return {
    name: 'yb-seo',

    configResolved(config) {
      root = config.root;
      dist = resolve(config.root, config.build.outDir);
      building = config.command === 'build';
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('<!--seo:head-->')) return html;
        const s = shell('en', gitDate(root, ['src/os/content', 'scripts/seo', 'index.html'], today()));
        return html.replace('<!--seo:head-->', s.head).replace('<!--seo:boot-->', s.boot);
      },
    },

    closeBundle() {
      if (!building) return;
      const indexFile = join(dist, 'index.html');
      if (!existsSync(indexFile)) return;
      const html = readFileSync(indexFile, 'utf8');
      if (!HEAD.test(html) || !BOOT.test(html)) {
        throw new Error('[seo] index.html has no <!--seo:head--> / <!--seo:boot--> markers (see scripts/seo/plugin.ts)');
      }

      const content = gitDate(root, ['src/os/content', 'scripts/seo', 'index.html'], today());
      const privacy = gitDate(root, ['public/privacy.html'], today());

      // the Turkish entry: the same desktop shell, Turkish head and boot text
      const tr = shell('tr', content);
      write(
        dist,
        `${PATH.home.tr}index.html`.replace(/^\//, ''),
        html.replace('<html lang="en">', '<html lang="tr">').replace(HEAD, () => tr.head).replace(BOOT, () => tr.boot)
      );

      ensureSnapshot(dist);
      const repos = readRepos(dist);
      write(dist, `${PATH.resume.en}index.html`.replace(/^\//, ''), resumePage('en', content, repos));
      write(dist, `${PATH.resume.tr}index.html`.replace(/^\//, ''), resumePage('tr', content, repos));
      write(dist, MD_PATH.en.slice(1), resumeMarkdown('en', content));
      write(dist, MD_PATH.tr.slice(1), resumeMarkdown('tr', content));
      write(dist, '404.html', notFoundPage());
      write(dist, 'sitemap.xml', sitemapXml({ content, privacy }));
      write(dist, 'llms.txt', llmsTxt());
      write(dist, 'llms-full.txt', llmsFullTxt());
      write(dist, 'data/build-info.json', JSON.stringify(buildInfo(root, dist, html)) + '\n');
      console.log(`[seo] pages written: ${PATH.home.tr}, ${PATH.resume.en}, ${PATH.resume.tr}, ${MD_PATH.en}, ${MD_PATH.tr}, 404.html, sitemap.xml, llms.txt, llms-full.txt (${repos.length} repos in the snapshot)`);
    },
  };
}
