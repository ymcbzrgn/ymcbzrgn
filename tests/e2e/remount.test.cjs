// Gerçek Chromium'da test: pencere sürüklenirken içindeki uygulama yeniden mount oluyor mu?
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://127.0.0.1:4173/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));

  // CDN'e bağımlı olmadan test (PDF.js bu testte alakasız)
  await page.route('**/cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  if (process.env.ONB) await page.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, assistantHidden: true } }, version: 0 })));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.desktop-icon__label', { timeout: 20000 });

  const labels = await page.$$eval('.desktop-icon__label', (els) => els.map((e) => e.textContent.trim()));
  console.log('Masaüstü ikonları:', JSON.stringify(labels));

  const icon = page.locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Terminal$/ }) }).first();
  await icon.dblclick();
  await page.waitForSelector('.window .terminal-app', { timeout: 10000 });

  // Orijinal DOM düğümünü işaretle + window__content altındaki childList değişimlerini say
  await page.evaluate(() => {
    const root = document.querySelector('.window .terminal-app');
    root.__marker = 'ORIGINAL';
    window.__orig = root;
    window.__childListMutations = 0;
    window.__removedCalc = 0;
    const content = document.querySelector('.window__content');
    new MutationObserver((muts) => {
      for (const m of muts) {
        window.__childListMutations++;
        m.removedNodes.forEach((n) => {
          if (n === window.__orig || (n.contains && n.contains(window.__orig))) window.__removedCalc++;
        });
      }
    }).observe(content, { childList: true, subtree: true });
  });

  // Uygulama içinde durum oluştur: 7, 8
  const inp = page.locator('.terminal-app__input');
  await inp.click();
  await inp.fill('echo merhaba-dunya');
  await inp.press('Enter');
  await inp.fill('help');
  await inp.press('Enter');
  await page.waitForTimeout(200);
  const countEntries = () => page.locator('.terminal-app__entry').count();
  const before = 'komut girdisi sayısı=' + (await countEntries());

  // Sürükleme sırasında AppLoader'ın kaç kez render olduğunu say
  const renderBefore = logs.filter((l) => l.includes('RENDER START')).length;

  // Pencereyi başlık çubuğundan sürükle (40 adım)
  const tb = await page.locator('.window__titlebar').first().boundingBox();
  const sx = tb.x + tb.width / 2;
  const sy = tb.y + 10;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 40; i++) {
    await page.mouse.move(sx + i * 5, sy + i * 2);
  }
  await page.mouse.up();
  await page.waitForTimeout(500);

  const renderAfter = logs.filter((l) => l.includes('RENDER START')).length;
  const res = await page.evaluate(() => {
    const cur = document.querySelector('.window .terminal-app');
    return {
      sameNode: cur === window.__orig,
      origStillConnected: window.__orig.isConnected,
      markerOnCurrent: cur ? cur.__marker || null : 'NO-ELEMENT',
      display: cur ? 'komut girdisi sayısı=' + cur.querySelectorAll('.terminal-app__entry').length : null,
      childListMutations: window.__childListMutations,
      removedCalcCount: window.__removedCalc,
    };
  });

  console.log('--- SONUÇ ---');
  console.log('Sürüklemeden önce ekran :', JSON.stringify(before));
  console.log('Sürüklemeden sonra ekran:', JSON.stringify(res.display));
  console.log('Aynı DOM düğümü mü?     :', res.sameNode, '(marker:', res.markerOnCurrent + ')');
  console.log('Orijinal düğüm DOM\'da mı:', res.origStillConnected);
  console.log('Terminal kaç kez DOM\'dan söküldü:', res.removedCalcCount);
  console.log('window__content childList mutasyonu:', res.childListMutations);
  console.log('Sürükleme boyunca AppLoader render sayısı:', renderAfter - renderBefore);
  console.log('Toplam console.log çıktısı (sayfa ömrü):', logs.length);

  await browser.close();
})().catch((e) => {
  console.error('TEST HATASI:', e.message);
  process.exit(1);
});
