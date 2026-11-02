// Aşama 2 doğrulama: masaüstü ilk yükleme, CV (PDF.js on-demand), hata+yeniden deneme, mobil lazy MobileOS.
const { chromium } = require('playwright');
const fs = require('fs');

const PDFJS_DIR = process.env.PDFJS_DIR; // optional: local copies of pdf.js (hermetic runs); otherwise the real CDN is used
const BASE = process.env.BASE;
const LOCAL_CDN = PDFJS_DIR
  ? { 'pdf.min.js': `${PDFJS_DIR}/pdf.min.js`, 'pdf.worker.min.js': `${PDFJS_DIR}/pdf.worker.min.js` }
  : {};

let failures = 0;
const ok = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗ FAIL:'} ${msg}`);
  if (!cond) failures++;
};
const base = (u) => u.split('?')[0].split('/').pop();

function attachCdn(page, state) {
  state.hits = [];
  state.mode = 'fulfill';
  return page.route('https://cdn.jsdelivr.net/**', (route) => {
    const url = route.request().url();
    state.hits.push(base(url));
    if (state.mode === 'abort') return route.abort();
    const f = LOCAL_CDN[base(url)];
    if (!f) return PDFJS_DIR ? route.abort() : route.continue();
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(f) });
  });
}

async function canvasStats(page) {
  // PDF.js sayfayı çizene kadar bekle (yükleniyor/çiziliyor göstergeleri bitsin)
  await page.waitForSelector('.pdf-canvas', { timeout: 20000 });
  await page.waitForFunction(
    () => !document.querySelector('.pdf-loading') && !document.querySelector('.pdf-rendering-overlay'),
    null,
    { timeout: 20000 }
  );
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const c = document.querySelector('.pdf-canvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a > 0 && (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200)) ink++;
    }
    return {
      w: c.width,
      h: c.height,
      inkRatio: ink / (c.width * c.height),
      pages: (document.querySelector('.pdf-toolbar__page-total') || {}).textContent || '',
    };
  });
}

const openDesktopIcon = (page, name) =>
  page
    .locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: new RegExp('^' + name.replace('.', '\\.') + '$') }) })
    .first()
    .dblclick();

(async () => {
  const browser = await chromium.launch();

  // ---------------- A) Masaüstü: ilk yükleme + CV ----------------
  console.log('\n[A] MASAÜSTÜ (1280x800): ilk yükleme ve CV');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const reqs = [];
    const errors = [];
    page.on('request', (r) => reqs.push(r.url()));
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push('console.error: ' + m.text()));
    const cdn = {};
    await attachCdn(page, cdn);
  if (process.env.ONB) await page.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, assistantHidden: true } }, version: 0 })));

    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForSelector('.desktop-icon__label');
    await page.waitForTimeout(800);

    const assets = reqs.filter((u) => /\/assets\//.test(u)).map(base);
    console.log('  ilk yükleme JS/CSS istekleri:', assets.join(', '));
    ok(!reqs.some((u) => u.includes('jsdelivr')), 'ilk yüklemede jsdelivr (PDF.js) isteği YOK');
    ok(!assets.some((a) => a.startsWith('MobileOS')), 'masaüstünde MobileOS chunk\'ı inmiyor');
    ok(cdn.hits.length === 0, 'CDN isteği sayısı = 0 (CV açılmadan)');

    await openDesktopIcon(page, 'CV.pdf');
    const s = await canvasStats(page);
    console.log(`  CV canvas: ${s.w}x${s.h}, mürekkep oranı=${(s.inkRatio * 100).toFixed(2)}%, sayfa göstergesi="${s.pages}"`);
    ok(s.inkRatio > 0.005, 'CV gerçekten çizildi (canvas boş değil)');
    ok(cdn.hits.includes('pdf.min.js'), 'pdf.min.js CV açılınca (on-demand) istendi');
    ok(errors.length === 0, 'konsol hatası / yakalanmamış istisna yok ' + (errors.length ? JSON.stringify(errors.slice(0, 3)) : ''));
    await ctx.close();
  }

  // ---------------- B) CDN erişilemezse: hata mesajı + yeniden deneme ----------------
  console.log('\n[B] CDN ENGELLİ: hata mesajı, sonra yeniden deneme');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    if (process.env.ONB) await page.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, assistantHidden: true } }, version: 0 })));
    const cdn = {};
    await attachCdn(page, cdn);
    cdn.mode = 'abort';
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForSelector('.desktop-icon__label');
    await openDesktopIcon(page, 'CV.pdf');
    await page.waitForSelector('.pdf-error', { timeout: 15000 });
    const msg = await page.locator('.pdf-error h3').first().innerText();
    console.log('  hata başlığı:', JSON.stringify(msg));
    ok(/didn't load/i.test(msg), 'kullanıcıya anlaşılır hata başlığı gösteriliyor');
    ok(cdn.hits.includes('pdf.min.js'), 'yükleme denendi');
    ok((await page.locator('.pdf-error a.pdf-actions__btn--primary').getAttribute('href')) === '/YAMAC_BEZIRGAN_CURRENT_CV.pdf', 'PDF dosyasını doğrudan açma bağlantısı sunuluyor (ölü uç yok)');
    ok((await page.locator('.pdf-error a[download]').count()) === 1, 'indirme bağlantısı da var');

    // ağ düzeldi: pencereyi kapat, CV'yi tekrar aç
    cdn.mode = 'fulfill';
    await page.locator('.window__button--close').first().click();
    await page.waitForSelector('.window', { state: 'detached' });
    await openDesktopIcon(page, 'CV.pdf');
    const s = await canvasStats(page);
    ok(s.inkRatio > 0.005, 'CDN düzelince yeniden denemede CV çizildi (başarısız yükleme önbelleğe alınmıyor)');
    await ctx.close();
  }

  // ---------------- C) Mobil: lazy MobileOS ----------------
  console.log('\n[C] MOBİL (390x844, dokunmatik): MobileOS chunk\'ı + uygulama + CV');
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    if (process.env.ONB) await page.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, assistantHidden: true } }, version: 0 })));
    const reqs = [];
    const errors = [];
    page.on('request', (r) => reqs.push(r.url()));
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push('console.error: ' + m.text()));
    const cdn = {};
    await attachCdn(page, cdn);

    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForSelector('.mobile-launcher', { timeout: 15000 });
    const assets = reqs.filter((u) => /\/assets\//.test(u)).map(base);
    console.log('  mobil istekler:', assets.join(', '));
    ok(assets.some((a) => a.startsWith('MobileOS') && a.endsWith('.js')), 'MobileOS chunk\'ı mobilde iniyor ve launcher açılıyor');
    ok(cdn.hits.length === 0, 'mobilde de açılışta CDN isteği yok');

    // ana ekran: dört kısayollu dock ve uygulama karoları
    await page.waitForSelector('.dock__item', { timeout: 15000 });
    ok((await page.locator('.dock__item').count()) === 4, 'dock: CV, e-posta, LinkedIn, GitHub');
    const names = await page.$$eval('.app__name', (els) => els.map((e) => e.textContent.trim()));
    console.log('  ana ekran uygulamaları:', JSON.stringify(names));
    ok(names.length === 12, 'ana ekranda 12 uygulama var');

    // Terminal aç
    await page.locator('.app[data-app="terminal"]').tap();
    await page.waitForSelector('.mobile-app-shell .terminal-app', { timeout: 15000 });
    ok(true, 'Terminal mobilde açıldı (AppLoader + lazy uygulama)');
    await page.locator('.mobile-app-shell__close-btn').first().tap();
    await page.waitForSelector('.mobile-app-shell', { state: 'detached', timeout: 10000 });

    // CV (dock): cihazın kendi PDF görüntüleyicisi, PDF.js değil
    const pdfRequests = [];
    ctx.on('request', (r) => /\.pdf$/.test(r.url()) && pdfRequests.push(base(r.url())));
    await page.locator('.dock__item[data-dock="cv"]').tap();
    await page.waitForTimeout(1500);
    ok(pdfRequests.includes('YAMAC_BEZIRGAN_CURRENT_CV.pdf'), 'CV mobilde gerçek bir bağlantı olarak açıldı (cihazın PDF görüntüleyicisi)');
    ok(cdn.hits.length === 0, 'mobilde CV için PDF.js CDN isteği yok');
    ok(errors.length === 0, 'mobilde konsol hatası / yakalanmamış istisna yok ' + (errors.length ? JSON.stringify(errors.slice(0, 3)) : ''));
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\nSONUÇ: tüm kontroller geçti' : `\nSONUÇ: ${failures} kontrol BAŞARISIZ`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('TEST HATASI:', e.message);
  process.exit(2);
});
