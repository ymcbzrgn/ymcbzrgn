// Duman testi: dosya gezgininden bulunabilen tüm uygulamaları aç, iskelet kalktı mı / hata var mı kontrol et.
const { chromium } = require('playwright');

const BASE = process.env.BASE;
let failures = 0;
const ok = (c, m) => {
  console.log(`  ${c ? '✓' : '✗ FAIL:'} ${m}`);
  if (!c) failures++;
};

const GROUPS = [
  { folder: 'Games', apps: ['Snake', 'Tetris', '2048', 'Minesweeper'] },
  { folder: 'Home', apps: ['Settings', 'Calculator', 'Notes', 'Calendar'] }, // Music Player / Photos seed'de bilerek hidden
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console.error: ' + m.text().slice(0, 160)));
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  if (process.env.ONB) await page.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, assistantHidden: true } }, version: 0 })));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.desktop-icon__label');

  const closeLast = async () => {
    await page.locator('.window').last().locator('.window__button--close').click();
  };
  const settled = async (label) => {
    const w = page.locator('.window').last();
    await w.locator('.window__content > *').first().waitFor({ timeout: 15000 });
    await page.waitForFunction(
      () => {
        const ws = document.querySelectorAll('.window');
        const c = ws[ws.length - 1].querySelector('.window__content');
        return c && !c.querySelector('.app-skeleton') && c.innerText.trim().length + c.querySelectorAll('canvas,svg,button,input,textarea').length > 0;
      },
      null,
      { timeout: 15000 }
    );
    const err = await w.locator('.app-error').count();
    ok(err === 0, `${label}: açıldı, iskelet kalktı, "App Error" yok`);
  };

  for (const g of GROUPS) {
    console.log(`\n[${g.folder}] klasörü ve içindeki uygulamalar`);
    await page
      .locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: new RegExp('^' + g.folder + '$') }) })
      .first()
      .dblclick();
    await page.locator('.window .file-explorer').last().waitFor({ timeout: 15000 });
    await settled(`${g.folder} (dosya gezgini)`);
    for (const app of g.apps) {
      await page
        .locator('.window .file-explorer__item', { has: page.locator('.file-explorer__item-name', { hasText: new RegExp('^' + app + '$') }) })
        .first()
        .dblclick();
      await settled(app);
      await page.waitForTimeout(250);
      await closeLast();
      await page.waitForTimeout(150);
    }
    await closeLast(); // gezgini kapat
    await page.waitForTimeout(150);
  }

  // Dosya görüntüleyiciler: Home > Documents > About-Me.md (Markdown), Home > Pictures > og-en.jpg (Görüntü)
  console.log('\n[Dosyalar] Home içinden Markdown ve görüntü görüntüleyici');
  await page
    .locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Home$/ }) })
    .first()
    .dblclick();
  await page.locator('.window .file-explorer').last().waitFor({ timeout: 15000 });
  const goBack = () => page.locator('.window .file-explorer__back, .window [aria-label="Back"], .window button[title*="Back" i]').first().click();
  const item = (name) =>
    page.locator('.window .file-explorer__item', { has: page.locator('.file-explorer__item-name', { hasText: new RegExp('^' + name.replace('.', '\\.') + '$') }) }).first();
  for (const [folder, file] of [['Documents', 'About-Me.md'], ['Pictures', 'og-en.jpg']]) {
    await item(folder).dblclick();
    await page.waitForTimeout(500);
    await item(file).dblclick();
    await settled(`${folder}/${file}`);
    await page.waitForTimeout(250);
    await closeLast();
    await page.waitForTimeout(150);
    await goBack();
    await page.waitForTimeout(250);
  }
  await closeLast(); // gezgini kapat

  // Projects (GitHub API sandbox'ta kapalı: hata arayüzü bekleniyor, ama pencere çökmemeli)
  console.log('\n[Projects] GitHub Projects penceresi');
  const before = errors.length;
  await page
    .locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Projects$/ }) })
    .first()
    .dblclick();
  await settled('Projects (GitHub Projects)');
  const uncaught = errors.slice(before).filter((e) => e.startsWith('pageerror'));
  ok(uncaught.length === 0, 'Projects: yakalanmamış istisna yok');
  await closeLast();

  const unexpected = errors.filter((e) => !/Failed to load resource|api\.github\.com|net::ERR|GitHub|Network error|Fetch error|Failed to fetch/i.test(e));
  ok(unexpected.length === 0, 'beklenmeyen konsol hatası / istisna yok ' + (unexpected.length ? JSON.stringify(unexpected.slice(0, 3)) : ''));
  if (errors.length !== unexpected.length) console.log(`  (bilgi: ${errors.length - unexpected.length} beklenen ağ/GitHub-API hatası yoksayıldı)`);

  await browser.close();
  console.log(failures === 0 ? '\nSONUÇ: tüm uygulamalar açıldı' : `\nSONUÇ: ${failures} kontrol BAŞARISIZ`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('TEST HATASI:', e.message.split('\n')[0]);
  process.exit(2);
});
