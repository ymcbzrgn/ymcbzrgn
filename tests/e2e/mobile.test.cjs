// The phone UI: lock screen, home screen, dock, apps, layouts on small / large / landscape screens, Turkish, personal links.
const { chromium, devices } = require('playwright');
const { serve, ok, summary, mockNetwork } = require('./lib.cjs');

const SHOTS = process.env.SHOT_DIR || '/tmp';

async function visitor(browser, base, device, { query = '', locale = 'en-US', settings } = {}) {
  const ctx = await browser.newContext({ ...device, locale });
  if (settings) await ctx.addInitScript((s) => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: s }, version: 0 })), settings);
  const page = await ctx.newPage();
  await mockNetwork(page);
  page.__errors = [];
  page.__pdf = [];
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && page.__errors.push(m.text().slice(0, 200)));
  ctx.on('request', (r) => /\.pdf$|jsdelivr/.test(r.url()) && page.__pdf.push(r.url()));
  await page.goto(base + '/' + query, { waitUntil: 'load' });
  return { ctx, page };
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** every element matching the selector that is displayed lies inside the visible screen */
const allInside = (page, sel) =>
  page.evaluate((s) => {
    const els = [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none');
    return els.length > 0 && els.every((e) => { const r = e.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1; });
  }, sel);
const visibleCount = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none').length, sel);
const unlock = async (page) => {
  await page.locator('.lock__open').click();
  await page.waitForSelector('.mobile-launcher', { timeout: 8000 });
  await page.waitForSelector('.lock', { state: 'detached', timeout: 8000 });
  await page.waitForTimeout(300);
};
const closeApp = async (page) => {
  await page.locator('.mobile-app-shell__close-btn').first().click();
  await page.waitForSelector('.mobile-app-shell', { state: 'detached', timeout: 8000 });
  await page.waitForSelector('.mobile-launcher');
};

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch();

  console.log('\n[1] The lock screen (iPhone 13, first visit)');
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13']);
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(1000); // the cards slide in
    ok((await page.locator('.mobile-launcher').count()) === 0, 'the phone starts locked');
    ok(/^\d{1,2}:\d{2}$/.test(await page.locator('.lock__clock').innerText()), 'a clock in big digits');
    ok((await page.locator('.lock__date').innerText()).length > 6, 'and the date');
    ok((await page.locator('.lock__bubble').innerText()) === "Hi! I'm Yamaç's pixel twin.", 'the twin says hello');
    const actions = await page.$$eval('.lock-card', (els) => els.filter((e) => e.getClientRects().length && getComputedStyle(e.parentElement).display !== 'none').map((e) => e.dataset.action));
    ok(actions.join() === 'glance,story,cv', 'three notifications on a 664 px tall phone: ' + actions.join());
    ok(await allInside(page, '.lock-card'), 'every notification is fully on screen');
    ok((await allInside(page, '.lock__open')) && (await allInside(page, '.lock__plain')), 'the way in ("Swipe up to open") and the plain résumé link are on screen');
    ok(await noOverflow(page), 'no horizontal scroll');
    ok((await page.locator('.lock__plain').getAttribute('href')) === '/resume/', 'the plain résumé link goes to /resume/');
    await page.screenshot({ path: `${SHOTS}/phone-lock.png` });

    await page.locator('.lock__lang').click();
    ok((await page.locator('.lock__open').innerText()).includes('Açmak için yukarı kaydır'), 'the language chip switches the lock screen to Turkish');
    await page.locator('.lock__lang').click();
    ok((await page.locator('.lock__open').innerText()).includes('Swipe up to open'), '... and back');

    await unlock(page);
    ok((await page.evaluate(() => sessionStorage.getItem('yb-unlocked'))) === '1', 'unlocking is remembered for this visit');
    ok((await page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu-xp-storage')).state.settings.onboarded)) === true, 'and the visitor counts as welcomed');
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.mobile-launcher', { timeout: 15000 });
    ok((await page.locator('.lock').count()) === 0, 'a reload in the same visit goes straight to the home screen');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13'], { settings: { onboarded: true } });
    await page.waitForSelector('.mobile-launcher', { timeout: 15000 });
    ok((await page.locator('.lock').count()) === 0, 'a returning visitor starts at the home screen');
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, devices['Pixel 7']);
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(1000);
    ok((await visibleCount(page, '.lock-card')) === 4 && (await allInside(page, '.lock-card')), 'a taller phone (Pixel 7) shows all four notifications');
    await ctx.close();
  }

  console.log('\n[2] Swiping up, and what the notifications open');
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13']);
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.mouse.move(195, 560);
    await page.mouse.down();
    await page.mouse.move(195, 460, { steps: 4 });
    await page.mouse.move(195, 240, { steps: 8 });
    await page.mouse.up();
    await page.waitForSelector('.mobile-launcher', { timeout: 8000 });
    ok(true, 'a swipe up opens the home screen');
    await ctx.close();
  }
  for (const [action, check, what] of [
    ['story', '.story', 'the 30-second story'],
    ['glance', '.mobile-app-shell .glance', '"At a glance"'],
    ['career', '.mobile-app-shell .career', 'the career timeline'],
  ]) {
    const { ctx, page } = await visitor(browser, base, devices['Pixel 7']);
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.locator(`.lock-card[data-action="${action}"]`).click();
    await page.waitForSelector(check, { timeout: 8000 });
    ok(true, `the "${action}" notification opens ${what}`);
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13']);
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(800);
    await page.locator('.lock-card[data-action="cv"]').click();
    await page.waitForSelector('.mobile-launcher', { timeout: 8000 });
    await page.waitForTimeout(800);
    ok(page.__pdf.some((u) => u.endsWith('/YAMAC_BEZIRGAN_CURRENT_CV.pdf')), 'the CV notification opens the PDF itself (the device\'s own viewer)');
    ok(!page.__pdf.some((u) => /jsdelivr/.test(u)) && (await page.locator('.pdf-viewer, .pdf-loading').count()) === 0, '... no script-driven viewer, no CDN');
    await ctx.close();
  }

  console.log('\n[3] Personal links and /?story');
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13'], { query: '?for=Acme%20Corp' });
    await page.waitForSelector('.lock', { timeout: 15000 });
    ok((await page.locator('.lock__bubble').innerText()) === "Hi Acme Corp! I'm Yamaç's pixel twin.", 'the lock screen greets the company by name');
    await unlock(page);
    ok(/, Acme Corp$/.test(await page.locator('.home__greet').innerText()), 'so does the home screen');
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13'], { query: '?for=Acme', settings: { onboarded: true } });
    await page.waitForSelector('.lock', { timeout: 15000 });
    ok(true, 'a personal link shows the lock screen again, even to a returning visitor');
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13'], { query: '?story' });
    await page.waitForSelector('.story', { timeout: 15000 });
    ok((await page.locator('.lock').count()) === 0, '/?story goes straight to the story');
    await ctx.close();
  }

  console.log('\n[4] The home screen');
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13'], { settings: { onboarded: true } });
    await page.waitForSelector('.mobile-launcher', { timeout: 15000 });
    await page.waitForTimeout(500);
    ok(/^(Good morning|Good afternoon|Good evening)$/.test(await page.locator('.home__greet').innerText()), 'a greeting for the time of day');
    ok((await page.locator('.profile__name').innerText()) === 'Yamaç Bezirgan', 'the profile widget: name');
    ok((await page.locator('.profile__role').innerText()) === 'Software Engineer at Arketic AI', '... and role');
    const cv = page.locator('.widget--profile a[data-home="cv"]');
    ok((await cv.getAttribute('href')) === '/YAMAC_BEZIRGAN_CURRENT_CV.pdf' && (await cv.getAttribute('target')) === '_blank' && /noopener/.test(await cv.getAttribute('rel')), 'the CV button is a real link that opens the PDF in a new tab');
    ok(!(await page.evaluate(() => { const w = document.querySelector('.widget--profile').getBoundingClientRect(); const n = document.querySelector('.widget-row').getBoundingClientRect(); return w.bottom > n.top + 1; })), 'the widgets do not overlap');

    // the dock
    const dock = await page.$$eval('.dock__item', (els) => els.map((e) => [e.dataset.dock, e.getAttribute('href'), e.textContent.trim()]));
    ok(JSON.stringify(dock.map((d) => d[0])) === '["cv","mail","linkedin","github"]', 'the dock: CV, email, LinkedIn, GitHub');
    ok(dock[1][1] === 'mailto:contact@yamacbezirgan.com' && /linkedin\.com\/in\/yamacbezirgan/.test(dock[2][1]) && dock[3][1] === 'https://github.com/ymcbzrgn', 'with the right addresses');
    ok(dock.every((d) => d[2].length > 1), 'and every icon has a label');
    ok(await allInside(page, '.dock'), 'the dock is fully on screen (not under the browser bar)');
    const os = await page.evaluate(() => { const r = document.querySelector('.mobile-os').getBoundingClientRect(); return { w: Math.round(r.width) === innerWidth, h: Math.round(r.height) === innerHeight, pos: getComputedStyle(document.querySelector('.mobile-os')).position }; });
    ok(os.w && os.h && os.pos === 'fixed', 'the phone is fixed to the visible screen, not sized in vh');

    // the projects widget links to their pages
    const slugs = await page.$$eval('.project', (els) => els.map((e) => e.getAttribute('href')));
    ok(JSON.stringify(slugs) === JSON.stringify(['/projects/hydraquant/', '/projects/desktop-os-portfolio/', '/projects/quirkllm/', '/projects/shiffy/', '/projects/canny-edge-detection/']), 'five projects, each linking to its page: ' + slugs.join(' '));

    // apps
    const tiles = await page.$$eval('.apps .app', (els) => els.map((e) => e.dataset.app));
    ok(tiles.length === 12, 'twelve apps: ' + tiles.join(', '));
    ok(await noOverflow(page), 'no horizontal scroll');
    await page.screenshot({ path: `${SHOTS}/phone-home.png` });
    for (const id of tiles.filter((t) => t !== 'plain')) {
      await page.locator(`.app[data-app="${id}"]`).click();
      await page.waitForSelector('.mobile-app-shell', { timeout: 10000 });
      await page.waitForTimeout(500);
      const title = await page.locator('.mobile-app-shell__title').first().innerText();
      ok(title.length > 0, `${id}: opens in the app shell ("${title}")`);
      await closeApp(page);
    }
    // the widgets open apps too
    await page.locator('.widget--small[data-home="now"]').click();
    await page.waitForSelector('.mobile-app-shell .career');
    ok(true, 'the "Now" widget opens the career timeline');
    await closeApp(page);
    await page.locator('.widget--small[data-home="story"]').click();
    await page.waitForSelector('.story');
    ok(true, 'the story widget opens the story');
    await page.locator('.story__close').click();
    await page.waitForSelector('.story', { state: 'detached', timeout: 5000 });
    await page.locator('.widget--profile button[data-home="glance"]').click();
    await page.waitForSelector('.mobile-app-shell .glance');
    ok(true, '"At a glance" opens the recruiter card');
    await closeApp(page);

    // the twin
    await page.locator('.profile__twin').click();
    await page.waitForSelector('.profile__bubble', { timeout: 3000 });
    ok((await page.locator('.profile__bubble').innerText()).length > 10, 'tapping the twin makes it say something');

    // a project card opens its case study
    await page.evaluate(() => document.querySelector('.project[data-project="hydraquant"]').scrollIntoView({ block: 'center' }));
    await Promise.all([page.waitForURL('**/projects/hydraquant/', { timeout: 8000 }), page.locator('.project[data-project="hydraquant"]').click()]);
    ok((await page.locator('h1').innerText()) === 'HydraQuant', 'a project card opens its case study');
    await page.goBack();
    await page.waitForSelector('.mobile-launcher', { timeout: 15000 });

    // the plain résumé
    await Promise.all([page.waitForURL('**/resume/', { timeout: 8000 }), page.locator('.app[data-app="plain"]').click()]);
    ok(true, '"Plain résumé" goes to the static page');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }

  console.log('\n[5] Turkish');
  {
    const { ctx, page } = await visitor(browser, base, devices['iPhone 13'], { locale: 'tr-TR' });
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(800);
    ok((await page.locator('.lock__open').innerText()).includes('Açmak için yukarı kaydır'), 'the lock screen follows the browser language');
    ok((await page.locator('.lock-card[data-action="story"]').innerText()).includes('30 saniyede Yamaç'), '... the story notification too');
    ok(!/AM|PM/.test(await page.locator('.status-bar__time').innerText()), 'and the clock is a 24-hour one');
    await unlock(page);
    ok(/^(Günaydın|İyi günler|İyi akşamlar)$/.test(await page.locator('.home__greet').innerText()), 'the home screen greets in Turkish');
    const labels = await page.$$eval('.dock__item span, .app__name', (els) => els.map((e) => e.textContent.trim()));
    ok(labels.includes('E-posta') && labels.includes('Dosyalar') && labels.includes('Başarımlar'), 'dock and app labels are Turkish');
    const slugs = await page.$$eval('.project', (els) => els.map((e) => e.getAttribute('href')));
    ok(slugs[0] === '/tr/projeler/hydraquant/', 'project pages link to the Turkish ones: ' + slugs[0]);
    ok(await noOverflow(page), 'no horizontal scroll');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }

  console.log('\n[6] Every size');
  for (const name of ['iPhone SE', 'Galaxy S8', 'Pixel 7', 'iPhone 13 landscape', 'iPad Mini']) {
    const { ctx, page } = await visitor(browser, base, devices[name]);
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.waitForTimeout(1000);
    const vp = page.viewportSize();
    const tag = `${name} ${vp.width}x${vp.height}`;
    ok((await noOverflow(page)) && (await allInside(page, '.lock__open')) && (await allInside(page, '.lock__plain')), `${tag}: the lock screen fits (no scroll, the way in is visible)`);
    ok((await visibleCount(page, '.lock-card')) >= 2 && (await allInside(page, '.lock-card')), `${tag}: at least two notifications, all fully visible`);
    await page.screenshot({ path: `${SHOTS}/phone-lock-${name.replace(/\W+/g, '-')}.png` });
    await unlock(page);
    ok((await noOverflow(page)) && (await allInside(page, '.dock')), `${tag}: the home screen fits and the dock is on screen`);
    ok(await allInside(page, '.profile__name, .home__greet'), `${tag}: the greeting and the name are on screen`);
    ok(await page.evaluate(() => [...document.querySelectorAll('.app__name')].every((e) => e.getBoundingClientRect().right <= innerWidth)), `${tag}: no app label sticks out`);
    await page.screenshot({ path: `${SHOTS}/phone-home-${name.replace(/\W+/g, '-')}.png` });
    ok(page.__errors.length === 0, `${tag}: no errors` + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
