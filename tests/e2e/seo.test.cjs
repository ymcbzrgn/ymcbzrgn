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
  const sitemap = await text(base, '/sitemap.xml');
  ok(sitemap.status === 200 && /xml/.test(sitemap.type) && sitemap.body.includes('<loc>https://yamacbezirgan.com/resume/</loc>'), 'sitemap.xml is served');
  const llms = await text(base, '/llms.txt');
  ok(llms.status === 200 && llms.type.startsWith('text/plain') && llms.body.includes('# Yamaç Bezirgan'), 'llms.txt is plain text');
  const robots = await text(base, '/robots.txt');
  ok(robots.body.includes('Sitemap: https://yamacbezirgan.com/sitemap.xml'), 'robots.txt points at the sitemap');
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
    ok((await page.locator('#experience article.job').count()) === 2, 'two jobs');
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

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
