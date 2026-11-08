// The career timeline (a room for the pixel twin) and "How this site is built".
const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');
const { serve, ok, summary, mockNetwork, boot, DIST } = require('./lib.cjs');

const SHOTS = process.env.SHOT_DIR || '/tmp';
const ready = (page) => page.waitForSelector('.tray-x__kbd', { timeout: 15000 });
const hasWindow = (page, appId) => page.locator(`.window[data-app-id="${appId}"]`).count().then((n) => n > 0);

async function palette(page, query) {
  await ready(page);
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.palette__input');
  await page.locator('.palette__input').fill(query);
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
}

const CI_RUN = (conclusion, status = 'completed') => ({
  workflow_runs: [
    {
      status,
      conclusion,
      html_url: 'https://github.com/ymcbzrgn/ymcbzrgn/actions/runs/1',
      head_sha: '24cc3ab1234567',
      updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      head_commit: { message: "chore: refresh the terminal's git log snapshot\n\nbody text" },
    },
  ],
});
const CI_ROUTE = 'https://api.github.com/repos/ymcbzrgn/ymcbzrgn/actions/runs**';

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch();

  console.log('\n[1] The career timeline');
  {
    const { context: ctx, page } = await boot(browser, base);
    await palette(page, 'career');
    await page.waitForSelector('.career');
    ok(await hasWindow(page, 'career-app'), 'the palette opens the career window');
    ok((await page.locator('.window[data-app-id="career-app"] .window__title').innerText()) === 'Career', 'window title: Career');
    await page.waitForSelector('.career .room', { timeout: 8000 });
    ok((await page.locator('.career .room').getAttribute('data-room-theme')) === 'documents', 'the twin is invited into a room');
    ok((await page.locator('.career .room__prop[data-prop-id^="ms-"]').count()) === 7, 'seven stations, one per milestone');
    ok((await page.locator('.career__card h2').innerText()) === 'Arketic AI', 'the card starts on the present: Arketic AI');
    ok((await page.locator('.career__list li').count()) === 7, 'the same milestones as a list');
    await page.screenshot({ path: `${SHOTS}/career-room.png` });

    // the list works without the twin
    await page.locator('.career__list button', { hasText: 'Erasmus+ in Milan' }).click();
    ok((await page.locator('.career__card h2').innerText()) === 'Erasmus+ in Milan' && (await page.locator('.career__card small').innerText()) === '2022', 'the list selects a milestone');
    ok((await page.locator('.career__list button.is-selected').count()) === 1, 'exactly one is selected');

    // sending the twin to a station
    await page.locator('.career .room__prop[data-prop-id="ms-exagate"]').click();
    await page.waitForFunction(() => document.querySelector('.career__card h2')?.textContent === 'Exagate internship', null, { timeout: 15000 });
    ok(true, 'clicking a station sends the twin there and shows the milestone');
    await page.waitForSelector('.pet__bubble', { timeout: 3000 }).catch(() => {});

    // the toggle takes the room away and back
    await page.locator('.career .room-toggle').click();
    await page.waitForTimeout(300);
    ok((await page.locator('.career .room').count()) === 0, 'the room toggle closes the room');
    await page.locator('.career .room-toggle').click();
    await page.waitForSelector('.career .room', { timeout: 5000 });
    ok(true, '... and opens it again');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await palette(page, 'career');
    await page.waitForSelector('.career');
    ok((await page.locator('.career .room, .career .room-toggle').count()) === 0, 'without the twin there is no room and no toggle, only the list');
    ok((await page.locator('.career__list li').count()) === 7, '... and the list is all there');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { langOverride: 'tr', assistantHidden: true }, noPet: true, locale: 'tr-TR' });
    await palette(page, 'kariyer');
    await page.waitForSelector('.career');
    ok((await page.locator('.career__card h2').innerText()) === 'Arketic AI' && (await page.locator('.career__bar h1').innerText()) === 'Kariyer', 'Turkish title');
    await page.locator('.career__list button').first().click();
    ok((await page.locator('.career__card h2').innerText()) === 'Altınbaş Üniversitesi', 'Turkish milestone');
    await ctx.close();
  }

  console.log('\n[2] How this site is built');
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    let ciRequests = 0;
    await page.route(CI_ROUTE, (r) => {
      ciRequests += 1;
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CI_RUN('success')) });
    });
    await palette(page, 'how this site');
    await page.waitForSelector('.about-site');
    ok(await hasWindow(page, 'about-site-app'), 'the palette opens the window');
    await page.waitForSelector('.about-site__ci a', { timeout: 8000 });
    const ci = await page.locator('.about-site__ci').innerText();
    ok(/passing/.test(ci) && /refresh the terminal's git log snapshot/.test(ci) && !/body text/.test(ci), 'the CI status of main: passing, with the commit message (first line)');
    ok(/3 hours ago/.test(ci), 'and how long ago: ' + ci.replace(/\s+/g, ' ').slice(-30));
    ok((await page.locator('.about-site__ci a').getAttribute('href')) === 'https://github.com/ymcbzrgn/ymcbzrgn/actions/runs/1', '... linking to the run');

    // numbers measured on this build
    const info = JSON.parse(fs.readFileSync(path.join(DIST, 'data', 'build-info.json'), 'utf8'));
    const tiles = await page.locator('.about-site__tiles').innerText();
    ok(info.firstScreenKB > 40 && info.firstScreenKB < 90, `build-info.json: first screen ${info.firstScreenKB} KB gzip`);
    ok(tiles.includes(`${info.firstScreenKB} KB`), 'the first-screen weight of this build is shown');
    ok(tiles.includes(String(info.suites)) && info.suites >= 10, `${info.suites} browser test suites counted from the repository`);
    ok(/\d+ commits?|[0-9a-f]{7}/.test(await page.locator('.about-site__commits').innerText()), 'recent commits are listed');
    ok((await page.locator('.about-site__commits li').count()) === 7, 'seven commits');
    ok((await page.locator('.about-site__commits a').first().getAttribute('href')).startsWith('https://github.com/ymcbzrgn/ymcbzrgn/commit/'), 'each links to the commit');
    await page.screenshot({ path: `${SHOTS}/about-site.png` });

    // the answer is cached: a second look does not ask GitHub again
    await page.locator('.window[data-app-id="about-site-app"] [aria-label="Close window"]').click();
    await page.waitForTimeout(300);
    await palette(page, 'how this site');
    await page.waitForSelector('.about-site__ci a', { timeout: 8000 });
    ok(ciRequests === 1, 'the CI status is cached for ten minutes (' + ciRequests + ' request)');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await page.route(CI_ROUTE, (r) => r.fulfill({ status: 403, contentType: 'application/json', body: '{"message":"rate limit"}' }));
    await palette(page, 'how this site');
    await page.waitForSelector('.about-site__ci a', { timeout: 8000 });
    ok(/unavailable/.test(await page.locator('.about-site__ci').innerText()), 'a refused API call degrades to "unavailable" with a link');
    ok((await page.locator('.about-site__ci a').getAttribute('href')) === 'https://github.com/ymcbzrgn/ymcbzrgn/actions', '... to the Actions page');
    ok((await page.locator('.about-site__tiles').innerText()).length > 0, 'the measured numbers are still there');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await page.route(CI_ROUTE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CI_RUN(null, 'in_progress')) }));
    await palette(page, 'how this site');
    await page.waitForSelector('.about-site__ci a', { timeout: 8000 });
    ok(/running/.test(await page.locator('.about-site__ci').innerText()), 'a run in progress shows as running');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await page.route(CI_ROUTE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CI_RUN('failure')) }));
    await palette(page, 'how this site');
    await page.waitForSelector('.about-site__ci a', { timeout: 8000 });
    ok(/failing/.test(await page.locator('.about-site__ci').innerText()), 'a failed run shows as failing');
    await ctx.close();
  }

  console.log('\n[3] From the terminal, and on a phone');
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await page.route(CI_ROUTE, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CI_RUN('success')) }));
    await page.locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Terminal$/ }) }).first().dblclick();
    await page.waitForSelector('.terminal-app__input');
    const run = async (cmd) => {
      await page.locator('.terminal-app__input').fill(cmd);
      await page.locator('.terminal-app__input').press('Enter');
      await page.waitForTimeout(250);
    };
    await run('career');
    ok(await hasWindow(page, 'career-app'), '`career` opens the timeline');
    await run('site');
    ok(await hasWindow(page, 'about-site-app'), '`site` opens "How this site is built"');
    await run('help');
    const help = await page.locator('.terminal-app__entry').last().innerText();
    ok(/career\s+the career timeline/.test(help) && /site\s+how this site is built/.test(help), 'help lists both');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    const page = await ctx.newPage();
    await mockNetwork(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForSelector('.lock', { timeout: 15000 });
    await page.locator('.lock-card[data-action="glance"]').click();
    await page.waitForSelector('.glance');
    await page.getByRole('button', { name: /Career timeline/ }).click();
    await page.waitForSelector('.career', { timeout: 8000 });
    ok((await page.locator('.career .room, .career .room-toggle').count()) === 0, 'phone: the timeline is the list (no room for the twin)');
    await page.locator('.career__list button').nth(1).click();
    ok((await page.locator('.career__card h2').innerText()) === 'Erasmus+ in Milan', 'phone: tapping a milestone shows it');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    ok(!overflow, 'phone: no horizontal scroll');
    await page.screenshot({ path: `${SHOTS}/career-mobile.png` });
    ok(errors.length === 0, 'phone: no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
