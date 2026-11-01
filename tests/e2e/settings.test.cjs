// Ayarlar: dil, widget ve asistan anahtarları canlı çalışıyor mu?
const { chromium } = require('playwright');
const BASE = process.env.BASE;
let failures = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL:'} ${m}`); if (!c) failures++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  // yalnızca ilk açılışta tohumla; yenilemede kullanıcının kaydı ezilmesin
  await page.addInitScript(() => { if (!localStorage.getItem('ubuntu-xp-storage')) localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true } }, version: 0 })); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.desktop-widget');
  await page.waitForSelector('.pet', { timeout: 6000 });
  ok(true, 'widget ve asistan varsayılan olarak açık');

  await page.locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Home$/ }) }).first().dblclick();
  await page.waitForSelector('.window .file-explorer');
  await page.locator('.file-explorer__item', { has: page.locator('.file-explorer__item-name', { hasText: /^Settings$/ }) }).first().dblclick();
  await page.waitForSelector('.settings-app');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'vis/settings-new.png' });

  const boxes = page.locator('.settings-app input[type=checkbox]');
  ok((await boxes.count()) === 3 && (await boxes.nth(0).isChecked()) && (await boxes.nth(1).isChecked()) && !(await boxes.nth(2).isChecked()), 'widget ve asistan işaretli, ses kapalı (üç onay kutusu)');
  await boxes.nth(0).uncheck();
  await page.waitForTimeout(150);
  ok((await page.locator('.desktop-widget').count()) === 0, 'widget kapatılınca masaüstünden kalktı');
  await boxes.nth(1).uncheck();
  await page.waitForTimeout(150);
  ok((await page.locator('.pet').count()) === 0, 'asistan kapatılınca kalktı');
  await boxes.nth(0).check();
  await page.waitForTimeout(400);
  ok((await page.locator('.desktop-widget').count()) === 1, 'widget geri açıldı');

  await page.locator('.settings-app input[type=radio][name=lang]').nth(1).check(); // Türkçe
  await page.waitForTimeout(200);
  ok((await page.locator('.settings-app__group-title').first().innerText()) !== undefined, 'dil seçildi');
  ok((await page.locator('.desktop-widget__role').innerText()) === 'Yazılım Mühendisi', 'widget Türkçe oldu: ' + (await page.locator('.desktop-widget__role').innerText()));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu-xp-storage')).state.settings);
  ok(saved.langOverride === 'tr' && saved.widgetHidden === false && saved.assistantHidden === true, 'kalıcı ayarlar: ' + JSON.stringify({ lang: saved.langOverride, widgetHidden: saved.widgetHidden, assistantHidden: saved.assistantHidden }));
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.desktop-widget');
  ok((await page.locator('.desktop-widget__role').innerText()) === 'Yazılım Mühendisi', 'yenileyince dil seçimi korundu');
  await page.waitForTimeout(2500);
  ok((await page.locator('.pet').count()) === 0, 'yenileyince asistan kapalı kaldı');
  ok(errors.length === 0, 'yakalanmamış istisna yok ' + JSON.stringify(errors.slice(0, 2)));
  await browser.close();
  console.log(failures ? `\nSONUÇ: ${failures} BAŞARISIZ` : '\nSONUÇ: hepsi geçti');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST HATASI:', e.message.split('\n')[0]); process.exit(2); });
