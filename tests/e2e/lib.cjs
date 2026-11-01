/**
 * Shared helpers for the browser tests (Playwright, Chromium): a tiny static server for dist/ (Cloudflare
 * Pages rules: folder index, name.html, 404.html), a page factory that mocks the network and collects errors, and the pass/fail bookkeeping.
 *
 *   npm run build:new && npm run test:e2e
 *
 * DIST_DIR points at another build output (default: ../../dist).
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DIST = path.resolve(process.env.DIST_DIR || path.join(__dirname, '../../dist'));
const SHOTS = process.env.SHOT_DIR || path.join(os.tmpdir(), 'portfolio-e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
};

/**
 * Maps a URL path to a file the way Cloudflare Pages does: a folder serves its index.html, /name serves
 * name.html, and anything else gets 404.html with status 404 (a build without a 404 page falls back to
 * index.html, like a single-page app host).
 */
function resolveFile(urlPath) {
  const clean = path.normalize(urlPath);
  for (const rel of [clean, path.join(clean, 'index.html'), `${clean}.html`]) {
    const f = path.join(DIST, rel);
    if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) return { file: f, status: 200 };
  }
  const notFound = path.join(DIST, '404.html');
  if (fs.existsSync(notFound)) return { file: notFound, status: 404 };
  return { file: path.join(DIST, 'index.html'), status: 200 };
}

function serve() {
  const server = http.createServer((req, res) => {
    const { file, status } = resolveFile(decodeURIComponent(req.url.split('?')[0]));
    res.writeHead(status, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

let failures = 0;
let passes = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗ FAIL:'} ${msg}`);
  if (cond) passes += 1;
  else failures += 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = () => {
  console.log(`\n${passes} passed, ${failures} failed`);
  return failures;
};

const REPOS = [
  ['SelfFork', 'TypeScript', 12],
  ['HydraQuant', 'Python', 0],
  ['Shiffy', 'JavaScript', 3],
  ['NeuralForge', 'Python', 1],
].map(([name, language, stars], i) => ({
  id: 100 + i,
  name,
  description: 'demo ' + name,
  html_url: 'https://github.com/ymcbzrgn/' + name,
  homepage: null,
  stargazers_count: stars,
  language,
  updated_at: '2026-01-01T00:00:00Z',
  topics: [],
  fork: false,
  owner: { login: 'ymcbzrgn' },
  default_branch: 'main',
}));

/** No real network: GitHub is mocked, third-party scripts are empty. */
async function mockNetwork(page) {
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('https://raw.githubusercontent.com/**', (r) => r.abort());
  await page.route('https://api.github.com/users/ymcbzrgn/repos**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REPOS) }));
  await page.route('https://api.github.com/repos/**/languages', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
}

/** PDF.js is loaded from a CDN. PDFJS_DIR (a folder with pdf.min.js and pdf.worker.min.js) makes runs hermetic; without it the real CDN is used. */
async function pdfjsRoutes(page) {
  const dir = process.env.PDFJS_DIR;
  if (!dir) return;
  for (const name of ['pdf.min.js', 'pdf.worker.min.js']) {
    const file = path.join(dir, name);
    if (fs.existsSync(file)) await page.route(`https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/${name}`, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(file) }));
  }
}

const seedSettings = (extra) => (e) => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, ...e } }, version: 0 }));

/**
 * A fresh visitor (onboarded, so no welcome window) on a 1440x900 desktop.
 * opts: settings (merged into the stored settings), noPet (don't wait for the twin), mobile.
 */
async function boot(browser, base, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: opts.locale || 'en-US', ...(opts.context || {}) });
  await context.addInitScript(seedSettings(opts.settings || {}), opts.settings || {});
  if (opts.init) await context.addInitScript(opts.init);
  const page = await context.newPage();
  await mockNetwork(page);
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + e.message));
  // (the PDF viewer loads PDF.js from a CDN, which is stubbed out here)
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR|PDF\.js library could not be loaded|Failed to load PDF/.test(m.text()) && page.__errors.push(m.text().slice(0, 200)));
  await page.goto(base + '/' + (opts.query || ''), { waitUntil: 'load' });
  if (!opts.noPet) {
    await page.waitForSelector('.pet .sprite', { timeout: 15000 });
    await page.waitForTimeout(3300); // it runs in and waves
  }
  return { context, page };
}

module.exports = { DIST, SHOTS, serve, resolveFile, ok, sleep, summary, boot, mockNetwork, pdfjsRoutes, seedSettings, REPOS, failures: () => failures };
