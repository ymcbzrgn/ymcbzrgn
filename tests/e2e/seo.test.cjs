// SEO and GEO: what a crawler (or a visitor without JavaScript) gets, the Turkish entry, the static
// resume pages, the old /#simple links, and the hand-over from the boot block to the desktop.
const { chromium, devices } = require('playwright');
const { serve, ok, summary, mockNetwork, seedSettings } = require('./lib.cjs');

const NAME = 'Yamaç Bezirgan';

async function text(base, path, init) {
  const res = await fetch(base + path, init);
  return { status: res.status, type: res.headers.get('content-type') || '', body: await res.text() };
}

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch();

  console.log('\n[1] What the server sends (no JavaScript at all)');
  for (const [path, lang, h1] of [
    ['/', 'en', NAME],
    ['/tr/', 'tr', NAME],
    ['/resume/', 'en', NAME],
    ['/tr/ozgecmis/', 'tr', NAME],
  ]) {
    const r = await text(base, path);
    ok(r.status === 200 && r.type.startsWith('text/html'), `${path} is 200 html`);
    ok(r.body.includes(`<html lang="${lang}"`), `${path} declares lang=${lang}`);
    ok(r.body.includes(`<link rel="canonical" href="https://yamacbezirgan.com${path}"`), `${path} has its canonical on the apex host`);
    ok(new RegExp(`<h1[^>]*>${h1}</h1>`).test(r.body), `${path} has the name as its <h1> in the HTML itself`);
    ok(r.body.includes('Arketic AI'), `${path} names the employer without running any script`);
  }
  const resume = await text(base, '/resume/');
  ok(/Altınbaş/.test(resume.body) && /Python/.test(resume.body) && /Ideathon/.test(resume.body), '/resume/ carries education, skills and competitions as text');
  ok(
    resume.body.includes('<a href="https://swipflix.yamacbezirgan.com" rel="noopener">Swipflix</a>') &&
      resume.body.includes('Software Engineer Intern') &&
      resume.body.includes('<time datetime="2026-01">Jan 2026</time>') &&
      resume.body.includes('<time datetime="2020-09">Sep 2020</time>'),
    '/resume/ lists the products, both Arketic roles and the dates with their months'
  );
  const resumeTr = await text(base, '/tr/ozgecmis/');
  ok(resumeTr.body.includes('Ürünler') && resumeTr.body.includes('Yazılım Mühendisi Stajyeri') && resumeTr.body.includes('Oca 2026') && resumeTr.body.includes('Mesleki çalışma yeterliliği'), '/tr/ozgecmis/ has the same facts in Turkish');
  const sitemap = await text(base, '/sitemap.xml');
  ok(sitemap.status === 200 && /xml/.test(sitemap.type) && sitemap.body.includes('<loc>https://yamacbezirgan.com/resume/</loc>'), 'sitemap.xml is served');
  const llms = await text(base, '/llms.txt');
  ok(llms.status === 200 && llms.type.startsWith('text/plain') && llms.body.includes('# Yamaç Bezirgan'), 'llms.txt is plain text');
  const md = await text(base, '/resume.md');
  ok(md.status === 200 && md.type.startsWith('text/markdown') && md.body.startsWith('# Yamaç Bezirgan') && md.body.includes('Arketic AI'), '/resume.md is the résumé as Markdown');
  const mdTr = await text(base, '/tr/ozgecmis.md');
  ok(mdTr.status === 200 && mdTr.body.includes('Yazılım Mühendisi') && mdTr.body.includes('Deneyim'), '/tr/ozgecmis.md is the Turkish one');
  ok(resume.body.includes('<link rel="alternate" type="text/markdown" href="https://yamacbezirgan.com/resume.md"'), '/resume/ advertises its Markdown twin');
  const robots = await text(base, '/robots.txt');
  ok(robots.body.includes('Sitemap: https://yamacbezirgan.com/sitemap.xml'), 'robots.txt points at the sitemap');
  ok(/User-agent: OAI-SearchBot[\s\S]*User-agent: Claude-SearchBot[\s\S]*User-agent: PerplexityBot[\s\S]*Allow: \//.test(robots.body), 'robots.txt welcomes the AI search bots by name');
  const missing = await text(base, '/no-such-page');
  ok(missing.status === 404 && missing.body.includes('noindex'), 'an unknown address is a real 404 (noindex), not the homepage');
  const privacy = await text(base, '/privacy');
  ok(privacy.status === 200 && privacy.body.includes('Privacy Policy'), '/privacy still works');

  console.log('\n[2] Visitors without JavaScript');
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    ok(await page.locator('#boot h1').isVisible(), 'the boot block is on screen');
    ok(await page.locator('#boot a[href="/resume/"]').isVisible(), '... with a link to the resume');
    ok(!(await page.locator('.boot__hint').isVisible()), '... and no "loading" hint that would never finish');
    ok((await page.locator('#boot noscript').count()) === 1, '... and a note that the desktop needs JavaScript');
    const bootWords = await page.locator('#boot').evaluate((el) => el.textContent.split(/\s+/).filter(Boolean).length);
    ok(bootWords >= 120, `... with enough text for a crawler that runs no script (${bootWords} words)`);
    ok(await page.locator('#boot details summary').isVisible(), '... and the projects folded into a summary');
    ok(!(await page.locator('#boot a[href="/projects/hydraquant/"]').isVisible()), '... closed, so the card stays small while the page loads');
    await page.locator('#boot details summary').click();
    ok(await page.locator('#boot a[href="/projects/hydraquant/"]').isVisible(), '... and one click opens the case studies');
    ok(await page.locator('#boot a[href="https://swipflix.yamacbezirgan.com"]').isVisible(), '... and the products');
    await page.goto(base + '/tr/', { waitUntil: 'load' });
    ok(
      (await page.locator('#boot a[href="/tr/projeler/hydraquant/"]').count()) === 1 && (await page.locator('#boot a[href="/"][hreflang="en"]').count()) === 1,
      'the Turkish entry lists the Turkish case studies and links back to English'
    );
    await page.goto(base + '/resume/', { waitUntil: 'load' });
    ok(await page.locator('#experience').isVisible(), 'the resume works without JavaScript');
    await ctx.close();
  }

  console.log('\n[3] Boot block hands over to the desktop');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    await ctx.addInitScript(seedSettings({}), {});
    const page = await ctx.newPage();
    await mockNetwork(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const wwwRequests = [];
    page.on('request', (r) => /www\.yamacbezirgan/.test(r.url()) && wwwRequests.push(r.url()));
    await page.goto(base + '/', { waitUntil: 'commit' });
    await page.waitForSelector('#boot', { state: 'attached' });
    await page.waitForSelector('.desktop-container', { timeout: 15000 });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 5000 });
    ok(true, 'the boot block is gone once the desktop is up');
    ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    ok(wwwRequests.length === 0, 'nothing asks for the dead www host');
    ok((await page.evaluate(() => document.documentElement.lang)) === 'en', '<html lang> follows the visitor (en)');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    await ctx.addInitScript(seedSettings({}), {});
    const page = await ctx.newPage();
    await mockNetwork(page);
    await page.goto(base + '/', { waitUntil: 'commit' });
    await page.waitForSelector('.mobile-os', { timeout: 15000 });
    await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 5000 });
    ok(true, 'on a phone the boot block hands over to the phone UI too');
    await ctx.close();
  }

  console.log('\n[4] The Turkish entry (/tr/)');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    const page = await ctx.newPage();
    await mockNetwork(page);
    await page.goto(base + '/tr/', { waitUntil: 'load' });
    await page.waitForSelector('.welcome', { timeout: 15000 });
    ok((await page.locator('.welcome__title').innerText()).startsWith('Merhaba'), 'an English browser opening /tr/ gets the Turkish desktop');
    ok((await page.evaluate(() => document.documentElement.lang)) === 'tr', '<html lang> is tr');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu-xp-storage') || '{}').state?.settings?.langOverride);
    ok(saved === 'tr', 'the choice is remembered');
    await ctx.close();
  }

  console.log('\n[5] Old /#simple links');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    const page = await ctx.newPage();
    await page.goto(base + '/#simple', { waitUntil: 'load' });
    await page.waitForURL('**/resume/', { timeout: 5000 });
    ok(new URL(page.url()).pathname === '/resume/', '/#simple lands on /resume/');
    ok((await page.locator('.desktop-container').count()) === 0, '... without loading the desktop');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
    await ctx.addInitScript(seedSettings({ langOverride: 'tr' }), { langOverride: 'tr' });
    const page = await ctx.newPage();
    await page.goto(base + '/#simple', { waitUntil: 'load' });
    await page.waitForURL('**/tr/ozgecmis/', { timeout: 5000 });
    ok(true, 'a visitor who chose Turkish lands on /tr/ozgecmis/');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'tr-TR' });
    const page = await ctx.newPage();
    await page.goto(base + '/#simple', { waitUntil: 'load' });
    await page.waitForURL('**/tr/ozgecmis/', { timeout: 5000 });
    ok(true, 'a Turkish browser lands on /tr/ozgecmis/ too');
    await ctx.close();
  }

  console.log('\n[6] The resume page itself');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base + '/resume/', { waitUntil: 'load' });
    ok((await page.locator('#experience article.job').count()) === 3, 'three jobs: the engineer and the intern at Arketic AI, and Exagate');
    ok((await page.locator('#products article.card').count()) === 5, 'five products');
    ok((await page.locator('#projects article.card').count()) >= 5, 'the projects');
    ok((await page.locator('a[href="/YAMAC_BEZIRGAN_CURRENT_CV.pdf"][download]').count()) === 1, 'the CV download link');
    ok((await page.locator('a.pill[hreflang="tr"]').getAttribute('href')) === '/tr/ozgecmis/', 'a link to the Turkish page');
    ok((await page.locator('header.bar a.btn--ghost').getAttribute('href')) === '/', 'a link to the desktop');
    await page.emulateMedia({ media: 'print' });
    ok(!(await page.locator('.cta').isVisible()), 'print: the buttons are left out');
    await page.emulateMedia({ media: 'screen', colorScheme: 'dark' });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok(bg === 'rgb(15, 23, 42)', 'dark mode follows the system (' + bg + ')');
    ok(errors.length === 0, 'no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    ok(!overflow, 'no horizontal scroll');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'tr-TR' });
    const page = await ctx.newPage();
    await page.goto(base + '/tr/ozgecmis/', { waitUntil: 'load' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    ok(!overflow, 'no horizontal scroll on a phone');
    ok((await page.locator('#education').innerText()).includes('Bilgisayar Mühendisliği'), 'Turkish content');
    await ctx.close();
  }

  console.log('\n[7] Project pages and the writing');
  for (const [path, lang, h1] of [
    ['/projects/', 'en', 'Projects'],
    ['/tr/projeler/', 'tr', 'Projeler'],
    ['/projects/hydraquant/', 'en', 'HydraQuant'],
    ['/projects/desktop-os-portfolio/', 'en', 'A desktop OS in the browser'],
    ['/tr/projeler/shiffy/', 'tr', 'Shiffy'],
    ['/writing/', 'en', 'Writing'],
    ['/writing/desktop-os-80kb/', 'en', 'A desktop OS in the browser, in under 80 KB'],
  ]) {
    const r = await text(base, path);
    ok(r.status === 200 && r.type.startsWith('text/html'), `${path} is 200 html`);
    ok(r.body.includes(`<html lang="${lang}"`) && r.body.includes(`<link rel="canonical" href="https://yamacbezirgan.com${path}"`), `${path}: lang and canonical`);
    ok(new RegExp(`<h1[^>]*>${h1}</h1>`).test(r.body), `${path}: the <h1> is in the HTML itself`);
  }
  for (const path of ['/projects/hydraquant.md', '/tr/projeler/quirkllm.md', '/writing/desktop-os-80kb.md', '/feed.xml']) {
    ok((await text(base, path)).status === 200, `${path} is served`);
  }
  ok((await text(base, '/projects/nope/')).status === 404, 'an unknown project is a real 404');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(base + '/projects/hydraquant/', { waitUntil: 'load' });
    ok((await page.locator('.crumbs a').nth(1).getAttribute('href')) === '/projects/', 'the breadcrumb leads to the project index');
    ok((await page.locator('.cta a.btn--primary').getAttribute('href')) === 'https://github.com/ymcbzrgn/HydraQuant', 'the source link goes to the repository');
    ok((await page.locator('header.bar a.btn--ghost').getAttribute('href')) === '/', 'a link to the desktop');
    ok((await page.locator('a.pill[hreflang="tr"]').getAttribute('href')) === '/tr/projeler/hydraquant/', 'a link to the Turkish page');
    await page.locator('a.pill[hreflang="tr"]').click();
    await page.waitForURL('**/tr/projeler/hydraquant/');
    ok((await page.locator('html').getAttribute('lang')) === 'tr' && (await page.locator('h2').first().innerText()) === 'Nedir', 'the Turkish page is Turkish');
    await page.goto(base + '/writing/desktop-os-80kb/', { waitUntil: 'load' });
    ok((await page.locator('.prose pre').count()) >= 3 && (await page.locator('.prose table').count()) === 1, 'the article has code blocks and a table');
    const info = JSON.parse((await text(base, '/data/build-info.json')).body);
    ok((await page.locator('.prose').innerText()).includes(`${info.firstScreenKB} KB gzip`), 'the article quotes the first-screen weight measured by this build');
    await page.emulateMedia({ colorScheme: 'dark' });
    ok((await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(15, 23, 42)', 'dark mode follows the system');
    ok(errors.length === 0, 'no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['iPhone SE'], locale: 'en-US' });
    const page = await ctx.newPage();
    for (const path of ['/projects/', '/projects/shiffy/', '/tr/projeler/hydraquant/', '/writing/desktop-os-80kb/']) {
      await page.goto(base + path, { waitUntil: 'load' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      ok(!overflow, `${path}: no horizontal scroll on a small phone`);
    }
    await ctx.close();
  }

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
