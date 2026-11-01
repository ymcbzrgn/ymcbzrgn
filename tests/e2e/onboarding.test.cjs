// Onboarding testi: ilk ziyaret, dil, kapatma, tekrar ziyaret, CTA'lar, çift tık ipucu.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const SP = process.env.E2E_TMP || path.join(require('os').tmpdir(), 'portfolio-e2e');
fs.mkdirSync(path.join(SP, 'room-shots'), { recursive: true });
const { pdfjsRoutes } = require('./lib.cjs');
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const OUT = path.join(SP, 'vis');
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  const ok = f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile();
  if (!ok) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

let failures = 0;
const ok = (c, m) => {
  console.log(`  ${c ? '✓' : '✗ FAIL:'} ${m}`);
  if (!c) failures++;
};

async function routes(page) {
  await pdfjsRoutes(page);
  await page.route('https://raw.githubusercontent.com/**', (r) => r.abort());
  await page.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}
const savedSettings = (page) =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('ubuntu-xp-storage') || '{}').state?.settings ?? null;
    } catch {
      return null;
    }
  });

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();

  // ---------------- 1) yeni ziyaretçi (İngilizce tarayıcı) ----------------
  console.log('\n[1] Yeni ziyaretçi, İngilizce tarayıcı');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text().slice(0, 140)));
  await routes(page);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.window .welcome', { timeout: 8000 });
  await page.waitForTimeout(700);
  ok(true, 'karşılama penceresi kendiliğinden açıldı');
  ok((await page.locator('.window').count()) === 1, 'yalnızca 1 pencere var');
  ok((await page.locator('.welcome__title').innerText()) === "Hi, I'm Yamaç", 'başlık İngilizce: ' + (await page.locator('.welcome__title').innerText()));
  const wb = await page.locator('.window').first().boundingBox();
  console.log(`     pencere: ${Math.round(wb.width)}x${Math.round(wb.height)} @ (${Math.round(wb.x)},${Math.round(wb.y)})`);
  ok(wb.width >= 600 && wb.height >= 440, 'pencere makul boyutta (>=600x440)');
  await page.screenshot({ path: `${OUT}/onb-1-first-visit.png` });

  // sprite gerçekten oynuyor mu (background-position-x değişmeli)
  const pos = async () => page.evaluate(() => getComputedStyle(document.querySelector('.welcome__sprite--wide .sprite')).backgroundPositionX);
  const seen = new Set();
  for (let i = 0; i < 8; i++) { seen.add(await pos()); await page.waitForTimeout(110); }
  ok(seen.size > 1, 'sprite animasyonu oynuyor (kare konumları: ' + [...seen].join(' | ') + ')');

  // TR anahtarı
  await page.locator('.welcome__lang').click();
  await page.waitForTimeout(150);
  ok((await page.locator('.welcome__title').innerText()) === 'Merhaba, ben Yamaç', 'TR anahtarı çalışıyor: ' + (await page.locator('.welcome__title').innerText()));
  ok((await page.evaluate(() => document.documentElement.lang)) === 'tr', '<html lang> = tr');
  await page.screenshot({ path: `${OUT}/onb-2-turkish.png` });
  await page.locator('.welcome__lang').click(); // EN'e dön

  // İletişim paneli
  await page.locator('.welcome').getByRole('button', { name: 'Contact' }).click();
  ok(await page.locator('.welcome__contact a[href^="mailto:"]').isVisible(), 'İletişim paneli e-posta bağlantısını gösteriyor');
  await page.screenshot({ path: `${OUT}/onb-3-contact.png` });

  // kapat → onboarded
  ok((await savedSettings(page))?.onboarded !== true, 'kapatmadan önce onboarded=true DEĞİL');
  await page.locator('.window__button--close').click();
  await page.waitForTimeout(300);
  ok((await page.locator('.window').count()) === 0, 'pencere kapandı');
  const s1 = await savedSettings(page);
  ok(s1?.onboarded === true, 'kapatınca onboarded=true kaydedildi');

  // ---------------- 2) aynı ziyaretçi geri döner ----------------
  console.log('\n[2] Aynı ziyaretçi sayfayı yeniler');
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.desktop-icon__label');
  await page.waitForTimeout(1500);
  ok((await page.locator('.welcome').count()) === 0, 'karşılama tekrar AÇILMADI');

  // görev çubuğu logosu → tekrar aç (tekil)
  await page.locator('.taskbar__logo--button').click();
  await page.waitForSelector('.window .welcome');
  await page.locator('.taskbar__logo--button').click();
  await page.waitForTimeout(300);
  ok((await page.locator('.window .welcome').count()) === 1, 'logoya iki kez tıklayınca tek pencere (singleton)');

  // CV butonu: pencere açılır, karşılama kapanır, CV büyük açılır
  await page.locator('.welcome').getByRole('button', { name: 'View CV' }).click();
  await page.waitForSelector('.window .pdf-viewer, .window canvas', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  ok((await page.locator('.window .welcome').count()) === 0, 'CV butonu karşılamayı kapattı');
  const cvWin = page.locator('.window').first();
  const cb = await cvWin.boundingBox();
  console.log(`     CV penceresi: ${Math.round(cb.width)}x${Math.round(cb.height)}`);
  ok(cb.height > 700, 'CV penceresi uzun (>700px) – eskiden 400px idi');
  await page.screenshot({ path: `${OUT}/onb-4-cv.png` });

  // Projects: ikinci pencere kaskad ile açılır, CV'yi tamamen örtmez
  await page.locator('.taskbar__logo--button').click();
  await page.waitForSelector('.window .welcome');
  await page.locator('.welcome').getByRole('button', { name: 'Projects' }).click();
  await page.waitForSelector('.window .github-projects', { timeout: 10000 });
  await page.waitForTimeout(500);
  const wins = await page.locator('.window').evaluateAll((els) => els.map((e) => ({ x: Math.round(e.getBoundingClientRect().x), y: Math.round(e.getBoundingClientRect().y), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
  console.log('     pencereler:', JSON.stringify(wins));
  ok(wins.length === 2 && (wins[0].x !== wins[1].x || wins[0].y !== wins[1].y), 'iki pencere birebir üst üste DEĞİL (kaskad)');
  await page.screenshot({ path: `${OUT}/onb-5-cascade.png` });

  // ---------------- 3) çift tık ipucu ----------------
  console.log('\n[3] Çift tık ipucu (yeni bağlam)');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const p2 = await ctx2.newPage();
  await routes(p2);
  await p2.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true } }, version: 0 })));
  await p2.goto(BASE, { waitUntil: 'load' });
  await p2.waitForSelector('.desktop-icon__label');
  await p2.waitForTimeout(800);
  ok((await p2.locator('.welcome').count()) === 0, 'onboarded=true olan ziyaretçide karşılama yok (eski kayıt + yeni alan birleşimi çalışıyor)');
  const icon = p2.locator('.desktop-icon', { has: p2.locator('.desktop-icon__label', { hasText: /^Home$/ }) }).first();
  await icon.click();
  await p2.waitForSelector('.desktop-icon__hint', { timeout: 2000 });
  ok((await p2.locator('.desktop-icon__hint').innerText()) === 'Double-click to open', 'tek tık ipucu görünüyor');
  await p2.screenshot({ path: `${OUT}/onb-6-hint.png`, clip: { x: 0, y: 0, width: 420, height: 220 } });
  await icon.dblclick();
  await p2.waitForSelector('.window .file-explorer');
  ok((await p2.locator('.desktop-icon__hint').count()) === 0, 'çift tıkla açınca ipucu kalktı');
  ok((await savedSettings(p2))?.iconHintSeen === true, 'iconHintSeen=true kaydedildi');
  await p2.locator('.window__button--close').click();
  await icon.click();
  await p2.waitForTimeout(400);
  ok((await p2.locator('.desktop-icon__hint').count()) === 0, 'ipucu bir daha çıkmıyor');

  // ---------------- 4) Türkçe tarayıcı ----------------
  console.log('\n[4] Türkçe tarayıcı otomatik algılama');
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'tr-TR' });
  const p3 = await ctx3.newPage();
  await routes(p3);
  await p3.goto(BASE, { waitUntil: 'load' });
  await p3.waitForSelector('.window .welcome');
  ok((await p3.locator('.welcome__title').innerText()) === 'Merhaba, ben Yamaç', 'tr-TR tarayıcıda karşılama Türkçe açıldı');
  ok((await p3.locator('.window__title').first().innerText()) === 'Hoş geldin', 'pencere başlığı Türkçe');

  ok(errors.length === 0, 'konsol hatası / yakalanmamış istisna yok ' + (errors.length ? JSON.stringify(errors.slice(0, 3)) : ''));
  await browser.close();
  server.close();
  console.log(failures ? `\nSONUÇ: ${failures} kontrol BAŞARISIZ` : '\nSONUÇ: hepsi geçti');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI:', e.message.split('\n').slice(0, 3).join(' | '));
  server.close();
  process.exit(2);
});
