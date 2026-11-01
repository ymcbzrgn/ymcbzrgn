// For someone who has ten seconds: the personal link (?for=), the "At a glance" card, the contact (.vcf).
const fs = require('fs');
const { chromium, devices } = require('playwright');
const { serve, ok, summary, mockNetwork, boot } = require('./lib.cjs');

/** the Ctrl+K hotkey and the tray buttons come with the lazy overlay host: wait for it */
const ready = (page) => page.waitForSelector('.tray-x__kbd', { timeout: 15000 });

/** a fresh visitor (not onboarded), so the welcome window opens by itself */
async function visitor(browser, base, query, { locale = 'en-US', device } = {}) {
  const ctx = await browser.newContext(device ? { ...device, locale } : { viewport: { width: 1440, height: 900 }, locale });
  const page = await ctx.newPage();
  await mockNetwork(page);
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push(e.message));
  await page.goto(base + '/' + query, { waitUntil: 'load' });
  await page.waitForSelector('.welcome', { timeout: 15000 });
  return { ctx, page };
}

(async () => {
  const { server, base } = await serve();
  const browser = await chromium.launch();

  console.log('\n[1] A personal link greets by name');
  {
    const { ctx, page } = await visitor(browser, base, '?for=acme-corp');
    ok((await page.locator('.welcome__title').innerText()) === "Hi Acme Corp, I'm Yamaç", 'welcome title: "Hi Acme Corp, I\'m Yamaç"');
    ok((await page.locator('.welcome__bubble').innerText()) === "Hi Acme Corp! I'm Yamaç's pixel twin.", "the twin's bubble in the welcome window says it too");
    await page.waitForSelector('.pet__bubble', { timeout: 15000 });
    ok((await page.locator('.pet__bubble').first().innerText()).includes('Hi Acme Corp!'), 'the twin on the desktop greets by name');
    await page.getByRole('button', { name: /At a glance/ }).click();
    await page.waitForSelector('.glance');
    ok(!(await page.locator('.welcome').count()), 'the welcome window made room for the card');
    ok((await page.locator('.glance__for').innerText()).includes('Acme Corp'), 'the card says who it was prepared for');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }
  for (const [query, expected, why] of [
    ['?for=Trendyol', "Hi Trendyol, I'm Yamaç", 'a plain name stays as written'],
    ['?for=Coca-Cola', "Hi Coca-Cola, I'm Yamaç", 'a dash inside a real name stays'],
    ['?for=Ay%C5%9Fe%20Y%C4%B1lmaz', "Hi Ayşe Yılmaz, I'm Yamaç", 'Turkish letters work'],
    ['?for=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', "Hi Img Src X Onerror Alert 1, I'm Yamaç", 'markup is reduced to plain words'],
    ['?for=' + 'a'.repeat(80), `Hi ${'A' + 'a'.repeat(39)}, I'm Yamaç`, 'at most 40 characters'],
    ['?for=%20%21%21%20', "Hi, I'm Yamaç", 'nothing usable: the normal greeting'],
  ]) {
    const { ctx, page } = await visitor(browser, base, query);
    const title = await page.locator('.welcome__title').innerText();
    ok(title === expected, `?for sanitising, ${why}: "${title}"`);
    ok((await page.locator('.welcome__title script, .welcome__title img').count()) === 0, '... as text only');
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, '?for=Acme', { locale: 'tr-TR' });
    ok((await page.locator('.welcome__title').innerText()) === 'Merhaba Acme, ben Yamaç', 'Turkish: "Merhaba Acme, ben Yamaç"');
    await ctx.close();
  }
  {
    const { ctx, page } = await visitor(browser, base, '');
    ok((await page.locator('.welcome__title').innerText()) === "Hi, I'm Yamaç", 'without ?for the greeting is the usual one');
    await ctx.close();
  }

  console.log('\n[2] The card');
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await ready(page);
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.palette__input');
    await page.locator('.palette__input').fill('glance');
    await page.waitForTimeout(120);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.glance');
    ok(true, 'the command palette opens it ("glance")');
    ok((await page.locator('.window[data-app-id="recruiter-app"] .window__title').innerText()) === 'At a glance', 'window title: At a glance');
    const text = await page.locator('.glance').innerText();
    ok(/Arketic AI/.test(text) && /Jun 2025/.test(text), 'the current job');
    ok(/Python/.test(text) && /TypeScript/.test(text) && /RAG/.test(text) && /AI Agents/.test(text), 'the stack');
    ok(/2nd/.test(text) && /6th/.test(text), 'the competition results');
    ok(/TR · EN · IT · DE/.test(text), 'the languages');
    ok(!(await page.locator('.glance__for').count()), 'no "prepared for" line without a personal link');
    ok((await page.locator('.glance a[href="/YAMAC_BEZIRGAN_CURRENT_CV.pdf"][download]').count()) === 1, 'CV download');
    ok(!/\+90|telephone/i.test(text), 'no phone number on the card');
    await page.screenshot({ path: `${process.env.SHOT_DIR || '/tmp'}/glance-card.png` });

    // Save contact
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Save contact/ }).click()]);
    ok(download.suggestedFilename() === 'Yamac-Bezirgan.vcf', 'the download is Yamac-Bezirgan.vcf');
    const vcf = fs.readFileSync(await download.path(), 'utf8');
    ok(vcf.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n') && vcf.endsWith('END:VCARD\r\n'), 'a vCard 3.0 with CRLF line ends');
    ok(vcf.includes('FN:Yamaç Bezirgan') && vcf.includes('N:Bezirgan;Yamaç;;;') && vcf.includes('ORG:Arketic AI') && vcf.includes('TITLE:Software Engineer'), 'name, company and title');
    ok(vcf.includes('EMAIL;TYPE=INTERNET,WORK:contact@yamacbezirgan.com') && vcf.includes('URL:https://yamacbezirgan.com/'), 'email and website');
    ok(vcf.includes('linkedin.com/in/yamacbezirgan') && vcf.includes('github.com/ymcbzrgn'), 'LinkedIn and GitHub');
    ok(!/^TEL/m.test(vcf), 'no phone number in the vCard');
    ok(vcf.split('\r\n').every((l) => Buffer.byteLength(l) <= 75), 'no line longer than 75 bytes');
    ok(await page.getByRole('button', { name: /Saved/ }).isVisible(), 'the button confirms');

    // Copy email
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: /Copy email/ }).click();
    ok((await page.evaluate(() => navigator.clipboard.readText())) === 'contact@yamacbezirgan.com', 'the email address is on the clipboard');

    // Resume page button
    await Promise.all([page.waitForURL('**/resume/'), page.getByRole('button', { name: 'Resume page' }).click()]);
    ok(true, '"Resume page" goes to /resume/');
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { langOverride: 'tr', assistantHidden: true }, noPet: true, locale: 'tr-TR' });
    await ready(page);
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.palette__input');
    await page.locator('.palette__input').fill('tek bakista');
    await page.waitForTimeout(120);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.glance');
    const text = await page.locator('.glance').textContent(); // (innerText would be the upper-cased headings)
    ok(/Haz 2025/.test(text) && /Teknolojiler/.test(text) && /Rehbere kaydet/.test(text), 'Turkish card');
    await ctx.close();
  }

  console.log('\n[3] From the terminal');
  {
    const { context: ctx, page } = await boot(browser, base, { settings: { assistantHidden: true }, noPet: true });
    await page.locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Terminal$/ }) }).first().dblclick();
    await page.waitForSelector('.terminal-app__input');
    const run = async (cmd) => {
      await page.locator('.terminal-app__input').fill(cmd);
      await page.locator('.terminal-app__input').press('Enter');
      await page.waitForTimeout(200);
    };
    await run('help');
    ok(/glance\s+the recruiter card/.test(await page.locator('.terminal-app__entry').last().innerText()), 'help lists glance');
    ok(/vcard\s+save my contact/.test(await page.locator('.terminal-app__entry').last().innerText()), 'help lists vcard');
    await run('glance');
    await page.waitForSelector('.glance');
    ok(true, '`glance` opens the card');
    await page.locator('.window[data-app-id="recruiter-app"] [aria-label="Close window"]').click();
    await page.waitForTimeout(300);
    await run('sudo hire-me');
    await page.waitForSelector('.glance', { timeout: 5000 });
    ok(true, '`sudo hire-me` opens the card too');
    const [dl] = await Promise.all([page.waitForEvent('download'), run('vcard')]);
    ok(dl.suggestedFilename() === 'Yamac-Bezirgan.vcf', '`vcard` downloads the contact');
    await ctx.close();
  }

  console.log('\n[4] On a phone');
  {
    const { ctx, page } = await visitor(browser, base, '?for=Acme', { device: devices['iPhone 13'] });
    ok((await page.locator('.welcome__title').innerText()) === "Hi Acme, I'm Yamaç", 'the personal greeting works on a phone');
    await page.getByRole('button', { name: /At a glance/ }).click();
    await page.waitForSelector('.glance');
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    ok(!overflow, 'no horizontal scroll');
    ok(await page.getByRole('button', { name: /Save contact/ }).isVisible(), 'the actions are reachable');
    await page.screenshot({ path: `${process.env.SHOT_DIR || '/tmp'}/glance-mobile.png` });
    ok(page.__errors.length === 0, 'no errors' + (page.__errors.length ? ': ' + page.__errors.join(' | ') : ''));
    await ctx.close();
  }

  await browser.close();
  server.close();
  process.exit(summary() ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI', e);
  process.exit(2);
});
