// "Yamaç in 30 seconds": the tap-through story, on a desktop and on a phone.
const { chromium, devices } = require('playwright');
const { serve, ok, summary, mockNetwork, boot } = require('./lib.cjs');

const SHOTS = process.env.SHOT_DIR || '/tmp';
const ready = (page) => page.waitForSelector('.tray-x__kbd', { timeout: 15000 });
const activeBar = (page) => page.$$eval('.story__bar', (els) => els.findIndex((e) => e.classList.contains('is-active')));
const heading = (page) => page.locator('.story__body h2').innerText();
const cardBox = (page) => page.locator('.story__card').boundingBox();

async function openFromPalette(page, query = 'story') {
  await ready(page);
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.palette__input');
  await page.locator('.palette__input').fill(query);
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.story');
}

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch();

  console.log('\n[1] On a desktop');
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await openFromPalette(page);
    ok((await page.locator('.story__bar').count()) === 7, 'seven cards');
    ok((await heading(page)) === "Hi, I'm Yamaç", 'first card: "Hi, I\'m Yamaç"');
    ok((await page.locator('.story__body .sprite, .story__body [class*="sprite"]').count()) >= 1, 'the pixel twin waves on the first card');
    await page.screenshot({ path: `${SHOTS}/story-1.png` });

    await page.keyboard.press('ArrowRight');
    ok((await heading(page)) === 'What I build' && (await activeBar(page)) === 1, 'ArrowRight: next card');
    await page.keyboard.press('ArrowLeft');
    ok((await activeBar(page)) === 0, 'ArrowLeft: back');

    // taps: right side = next, left side = back
    const box = await cardBox(page);
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.55);
    ok((await activeBar(page)) === 1, 'a tap on the right goes forward');
    await page.mouse.click(box.x + box.width * 0.12, box.y + box.height * 0.55);
    ok((await activeBar(page)) === 0, 'a tap on the left goes back');

    // hold = pause
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.waitForTimeout(450);
    const paused = await page.evaluate(() => getComputedStyle(document.querySelector('.story__bar.is-active i')).animationPlayState);
    ok(paused === 'paused', 'holding pauses the timer (' + paused + ')');
    await page.mouse.up();
    await page.waitForTimeout(150);
    ok((await activeBar(page)) === 0, '... and letting go does not skip a card');
    const running = await page.evaluate(() => getComputedStyle(document.querySelector('.story__bar.is-active i')).animationPlayState);
    ok(running === 'running', 'the timer runs again (' + running + ')');

    // it moves on by itself
    await page.waitForTimeout(5000);
    ok((await activeBar(page)) >= 1, 'it advances on its own');

    // walk to the end
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('ArrowRight');
    ok((await heading(page)) === "Let's talk" && (await activeBar(page)) === 6, 'the last card: "Let\'s talk"');
    ok((await page.locator('.story__body a[href="/YAMAC_BEZIRGAN_CURRENT_CV.pdf"][download]').count()) === 1, 'CV download on the last card');
    ok((await page.locator('.story__body a[href^="mailto:contact@yamacbezirgan.com"]').count()) === 1, 'email on the last card');
    await page.screenshot({ path: `${SHOTS}/story-7.png` });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save contact' }).click()]);
    ok(dl.suggestedFilename() === 'Yamac-Bezirgan.vcf', 'Save contact downloads the vCard');
    await page.getByRole('button', { name: /Replay/ }).click();
    ok((await activeBar(page)) === 0, 'Replay starts over');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    ok((await page.locator('.story').count()) === 0, 'Esc closes it');

    // swipe down closes it too
    await openFromPalette(page);
    const b2 = await cardBox(page);
    await page.mouse.move(b2.x + b2.width / 2, b2.y + 250);
    await page.mouse.down();
    await page.mouse.move(b2.x + b2.width / 2, b2.y + 480, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    ok((await page.locator('.story').count()) === 0, 'swiping down closes it');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }

  console.log('\n[2] Other ways in');
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true, query: '?story&for=Acme' });
    await page.waitForSelector('.story', { timeout: 10000 });
    ok((await heading(page)) === "Hi Acme, I'm Yamaç", '/?story opens it, and a personal link greets by name');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    ok(!new URL(page.url()).searchParams.has('story') && new URL(page.url()).searchParams.get('for') === 'Acme', 'closing removes ?story from the address (and keeps the rest)');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await page.locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Terminal$/ }) }).first().dblclick();
    await page.waitForSelector('.terminal-app__input');
    await page.locator('.terminal-app__input').fill('story');
    await page.locator('.terminal-app__input').press('Enter');
    await page.waitForSelector('.story', { timeout: 5000 });
    ok(true, 'the `story` command in the terminal');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { langOverride: 'tr', assistantHidden: true }, noPet: true, locale: 'tr-TR' });
    await openFromPalette(page, 'hikaye');
    ok((await heading(page)) === 'Merhaba, ben Yamaç', 'Turkish: "Merhaba, ben Yamaç"');
    await page.keyboard.press('ArrowRight');
    ok((await heading(page)) === 'Ne geliştiriyorum', 'Turkish: second card');
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true, context: { reducedMotion: 'reduce' } });
    await openFromPalette(page);
    await page.waitForTimeout(5600);
    ok((await activeBar(page)) === 0, 'reduced motion: it does not advance by itself');
    await page.keyboard.press('ArrowRight');
    ok((await activeBar(page)) === 1, '... but taps and keys still work');
    await ctx.close();
  }
  {
    // a visitor on a desktop is not offered it in the welcome window (there is the guided tour)
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
    const page = await ctx.newPage();
    await mockNetwork(page);
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForSelector('.welcome');
    ok((await page.getByRole('button', { name: /30 seconds/ }).count()) === 0, 'the desktop welcome window keeps the guided tour instead');
    await ctx.close();
  }

  console.log('\n[3] On a phone');
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
    const page = await ctx.newPage();
    await mockNetwork(page);
    page.__errors = [];
    page.on('pageerror', (e) => page.__errors.push(e.message));
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForSelector('.welcome', { timeout: 15000 });
    const button = page.getByRole('button', { name: /Yamaç in 30 seconds/ });
    ok(await button.isVisible(), 'the welcome app offers "Yamaç in 30 seconds"');
    await button.click();
    await page.waitForSelector('.story', { timeout: 5000 });
    const vp = page.viewportSize();
    const box = await cardBox(page);
    ok(Math.round(box.width) === vp.width && Math.round(box.height) === vp.height, `it fills the screen (${Math.round(box.width)}x${Math.round(box.height)})`);
    await page.touchscreen.tap(box.x + box.width * 0.85, box.y + box.height * 0.6);
    await page.waitForTimeout(150);
    ok((await activeBar(page)) === 1, 'a tap on the right goes forward');
    await page.touchscreen.tap(box.x + box.width * 0.1, box.y + box.height * 0.6);
    await page.waitForTimeout(150);
    ok((await activeBar(page)) === 0, 'a tap on the left goes back');
    for (let i = 0; i < 6; i += 1) {
      await page.touchscreen.tap(box.x + box.width * 0.85, box.y + box.height * 0.45);
      await page.waitForTimeout(120);
    }
    ok((await heading(page)) === "Let's talk", 'six taps reach the last card');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    ok(!overflow, 'no horizontal scroll');
    const ctaInside = await page.evaluate(() => {
      const card = document.querySelector('.story__card').getBoundingClientRect();
      return [...document.querySelectorAll('.story__cta .story__btn')].every((b) => { const r = b.getBoundingClientRect(); return r.bottom <= card.bottom + 1 && r.left >= card.left - 1 && r.right <= card.right + 1; });
    });
    ok(ctaInside, 'every button of the last card is on screen');
    await page.screenshot({ path: `${SHOTS}/story-mobile-7.png` });
    await page.getByRole('button', { name: 'Open the desktop' }).click();
    await page.waitForTimeout(200);
    ok((await page.locator('.story').count()) === 0, '"Open the desktop" closes it');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }
  {
    // every card must fit a small phone without cutting its text
    const ctx = await browser.newContext({ ...devices['iPhone SE'], locale: 'en-US' });
    const page = await ctx.newPage();
    await mockNetwork(page);
    await page.goto(base + '/?story', { waitUntil: 'load' });
    await page.waitForSelector('.story', { timeout: 15000 });
    let allFit = true;
    for (let i = 0; i < 7; i += 1) {
      const fits = await page.evaluate(() => { const b = document.querySelector('.story__body'); return b.scrollHeight <= b.clientHeight + 2; });
      if (!fits) { allFit = false; console.log('     card', i + 1, 'overflows on a small phone'); }
      await page.keyboard.press('ArrowRight');
    }
    ok(allFit, 'all seven cards fit a small phone (iPhone SE)');
    await ctx.close();
  }

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
