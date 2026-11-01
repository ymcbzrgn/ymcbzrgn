// Odalar: pencere içi piksel oda şeridi, pet'in pencereye girmesi, props, E/F etkileşimi, taşıma, gizli yerler, yaşam döngüsü.
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const SP = process.env.E2E_TMP || path.join(require('os').tmpdir(), 'portfolio-e2e');
fs.mkdirSync(path.join(SP, 'room-shots'), { recursive: true });
const { pdfjsRoutes } = require('./lib.cjs');
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const SHOTS = path.join(SP, 'room-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(DIST, p);
  if (!(f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile())) f = path.join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

let failures = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL:'} ${m}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REPOS = [
  ['SelfFork', 'TypeScript', 12], ['HydraQuant', 'Python', 0], ['Shiffy', 'JavaScript', 3], ['NeuralForge', 'Python', 1],
].map(([name, language, stars], i) => ({ id: 100 + i, name, description: 'demo ' + name, html_url: 'https://github.com/ymcbzrgn/' + name, homepage: null, stargazers_count: stars, language, updated_at: '2026-01-01T00:00:00Z', topics: [], fork: false, owner: { login: 'ymcbzrgn' }, default_branch: 'main' }));

async function routes(page) {
  await pdfjsRoutes(page);
  await page.route('https://cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.route('https://raw.githubusercontent.com/**', (r) => r.abort());
  await page.route('https://api.github.com/users/ymcbzrgn/repos**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REPOS) }));
  await page.route('https://api.github.com/repos/**/languages', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
}
const onboarded = (extra) => (e) => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, ...e } }, version: 0 }));

async function boot(browser, BASE, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  await ctx.addInitScript(onboarded(opts.settings || {}), opts.settings || {});
  const page = await ctx.newPage();
  await routes(page);
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && page.__errors.push(m.text().slice(0, 160)));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  if (!opts.noPet) { await page.waitForSelector('.pet .sprite', { timeout: 15000 }); await page.waitForTimeout(3300); }
  return { ctx, page };
}
const openFolder = async (page, id) => {
  await page.locator(`.desktop-icon[data-node-id="${id}"]`).dblclick();
  const win = page.locator('.window').last();
  await win.waitFor();
  return win;
};
const petIn = (page) => page.evaluate(() => ({ room: !!document.querySelector('.room__world .pet'), cls: document.querySelector('.pet')?.className || '' }));
const props = (page) => page.$$eval('.room__prop', (els) => els.map((e) => ({ id: e.dataset.propId, label: e.dataset.label })));
const hintText = async (page) => (await page.locator('.pet-ctl-hint:not([hidden])').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
async function startControlViaMenu(page) {
  const box = await page.locator('.pet__hit').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForSelector('.pet__menu');
  await page.locator('.pet__menu-control').click();
  await page.waitForSelector('.pet-ctl');
  await page.waitForTimeout(250);
}
async function walkUntil(page, key, pred, maxMs = 9000) {
  const t0 = Date.now();
  await page.keyboard.down(key);
  let last = '';
  while (Date.now() - t0 < maxMs) {
    last = await hintText(page);
    if (pred(last)) break;
    await page.waitForTimeout(40);
  }
  await page.keyboard.up(key);
  await page.waitForTimeout(160);
  return pred(await hintText(page)) ? await hintText(page) : '';
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();

  /* ---------- 1) Games odası ---------- */
  console.log('\n[1] Oda şeridi ve pet\'in odaya girişi');
  let { ctx, page } = await boot(browser, BASE);
  const win = await openFolder(page, 'games');
  ok((await page.locator('.room').count()) === 0, 'oda varsayılan olarak kapalı (pencere eskisi gibi)');
  await win.locator('.room-toggle').click();
  await page.waitForSelector('.room', { timeout: 6000 });
  await page.waitForTimeout(1200);
  ok((await page.locator('.room').getAttribute('data-room-theme')) === 'games', 'Games klasörü games temasında');
  const ps = await props(page);
  ok(ps.length === 5, `5 prop (çıkış kapısı + 4 oyun): ${ps.map((p) => p.label).join(', ')}`);
  ok(['Snake', 'Tetris', '2048', 'Minesweeper'].every((n) => ps.some((p) => p.label === n)), 'dört oyun da nesne olarak odada');
  const inRoom = await petIn(page);
  ok(inRoom.room && /pet--room/.test(inRoom.cls), 'pet odanın içine taşındı (portal)');
  const pw = await page.locator('.room .pet').evaluate((e) => e.getBoundingClientRect().width);
  ok(pw === 80, `odada ölçek 2: karakter 80 px genişliğinde (${pw})`);
  const inside = await page.evaluate(() => { const r = document.querySelector('.room').getBoundingClientRect(); const p = document.querySelector('.room .pet').getBoundingClientRect(); return p.left >= r.left - 2 && p.right <= r.right + 2 && p.bottom <= r.bottom + 2 && p.bottom >= r.top; });
  ok(inside, 'karakter şeridin içinde, görünür');
  await page.screenshot({ path: `${SHOTS}/room-games.png` });

  /* ---------- 2) Tıkla: yürü ve kullan ---------- */
  console.log('\n[2] Props\'a tıklayınca karakter yürür ve kullanır');
  const px0 = await page.locator('.room .pet').evaluate((e) => e.getBoundingClientRect().left);
  await page.locator('.room__prop[data-label="Snake"]').click();
  await page.waitForTimeout(500);
  const px1 = await page.locator('.room .pet').evaluate((e) => e.getBoundingClientRect().left);
  ok(Math.abs(px1 - px0) > 20, `karakter prop'a doğru yürüyor (${px0.toFixed(0)} → ${px1.toFixed(0)})`);
  await page.waitForSelector('.window[data-app-id="snake-game"]', { timeout: 9000 });
  ok(true, 'Snake penceresi açıldı');
  await page.locator('.window[data-app-id="snake-game"] .window__button--close').click();
  await page.waitForTimeout(300);
  // zemine tıkla (karakter Snake'in yanında dururken, kendi hayatına dönmeden önce)
  const pBefore = await page.locator('.room .pet').evaluate((e) => e.getBoundingClientRect().left);
  const room = await page.locator('.room').boundingBox();
  await page.mouse.click(room.x + 40, room.y + room.height - 8);
  await page.waitForTimeout(1300);
  const px2 = await page.locator('.room .pet').evaluate((e) => e.getBoundingClientRect().left);
  ok(px2 < pBefore - 40, `zemine tıklayınca oraya yürüdü (${pBefore.toFixed(0)} → ${px2.toFixed(0)})`);

  /* ---------- 3) Kontrol modu odada ---------- */
  console.log('\n[3] Odada kontrol modu: yürü, ipucu, E');
  await page.waitForTimeout(1500);
  await startControlViaMenu(page);
  ok(/Control|driving/.test(await page.locator('.pet-ctl').innerText()), 'HUD açık');
  const h1 = await walkUntil(page, 'ArrowRight', (t) => /Open 2048|Open Minesweeper|Open Snake|Open Tetris/.test(t));
  ok(/E .*Open (2048|Minesweeper|Snake|Tetris)/.test(h1), `bir prop'un yanında ipucu: "${h1}"`);
  ok(/F carry/.test(h1), 'taşınabilir prop için "F carry" ipucu da var');
  await page.screenshot({ path: `${SHOTS}/room-hint.png` });
  const wins0 = await page.locator('.window').count();
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(2500);
  ok((await page.locator('.window').count()) === wins0 + 1, 'E ile oyun penceresi açıldı');
  await page.locator('.window').last().locator('.window__button--close').click();
  await page.waitForTimeout(400);
  await page.mouse.click(1380, 850); // klavye karaktere dönsün
  const camMoved = await page.locator('.room__world').evaluate((e) => e.style.transform);
  ok(/translate3d/.test(camMoved), 'kamera dünyayı kaydırıyor');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await win.locator('.window__button--close').click().catch(() => {});
  await page.waitForTimeout(500);
  ok(!(await petIn(page)).room, 'pencere kapanınca pet masaüstüne döndü');
  await ctx.close();

  /* ---------- 4) Home odası: dosya taşıma + gizli yerler ---------- */
  console.log('\n[4] Home odası: taşı ve gizli yerler');
  ({ ctx, page } = await boot(browser, BASE));
  const home = await openFolder(page, 'home');
  await home.locator('.room-toggle').click();
  await page.waitForSelector('.room');
  await page.waitForTimeout(1300);
  const hp = await props(page);
  const labels = hp.map((p) => p.label);
  ok(labels.includes('Documents') && labels.includes('Pictures') && labels.includes('Calculator'), `Home: ${labels.join(', ')}`);
  ok(labels.filter((l) => l === '???').length === 3, 'üç gizli yer var (Fotoğraflar, İndirilenler, Müzik Çalar)');
  ok(/Secret places 0\/3/.test(await page.locator('.room__badge').innerText().catch(() => '')), 'rozet: Secret places 0/3');
  await page.screenshot({ path: `${SHOTS}/room-home.png` });
  // C: Calculator'ı al
  await startControlViaMenu(page);
  const calc = await walkUntil(page, 'ArrowRight', (t) => /Calculator/.test(t));
  ok(/Calculator/.test(calc), `hesap makinesinin yanında: "${calc}"`);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(1300);
  ok((await page.locator('.pet__carry').count()) === 1, 'F: hesap makinesini kaldırdı');
  const itemY = await page.evaluate(() => { const c = document.querySelector('.pet__carry').getBoundingClientRect(); const s = document.querySelector('.room .pet .sprite').getBoundingClientRect(); return [c.bottom - s.top, s.height]; });
  ok(itemY[0] < 22 && itemY[0] > -4, `eşya karakterin başının üstünde, elleriyle birlikte (alt kenar çerçevenin ${itemY[0].toFixed(0)}/${itemY[1]} px'inde)`);
  await page.screenshot({ path: `${SHOTS}/room-carry.png` });
  ok((await page.locator('.room__prop.is-carried').count()) === 1, 'prop yerinden kalktı (gizlendi)');
  const back = await walkUntil(page, 'ArrowLeft', (t) => /Put it in Documents/.test(t), 12000);
  ok(/Put it in Documents/.test(back), `Documents kapısında: "${back}"`);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(3200);
  ok((await page.locator('.pet__carry').count()) === 0, 'E: eşyayı kapıdan içeri koydu');
  const after = (await props(page)).map((p) => p.label);
  ok(!after.includes('Calculator'), 'Calculator artık Home odasında değil (gerçek taşıma)');
  const listNames = await home.locator('.file-explorer__item-name').allTextContents();
  ok(!listNames.includes('Calculator'), 'dosya listesinde de yok (aynı VFS)');
  // Documents'ın içinde mi?
  await page.waitForTimeout(500);
  await page.mouse.click(1380, 850);
  await home.locator('.file-explorer__item', { hasText: 'Documents' }).dblclick();
  await page.waitForTimeout(900);
  const docs = await home.locator('.file-explorer__item-name').allTextContents();
  ok(docs.includes('Calculator'), `Calculator şimdi Documents içinde: ${docs.join(', ')}`);
  await page.screenshot({ path: `${SHOTS}/room-documents.png` });
  // gizli yer
  await home.locator('.file-explorer__breadcrumb-link', { hasText: 'Home' }).click();
  await page.waitForTimeout(800);
  const secret = page.locator('.room__prop[data-label="???"]').first();
  await secret.dispatchEvent('click');
  await page.waitForTimeout(4500);
  ok(/Secret places 1\/3/.test(await page.locator('.room__badge').innerText().catch(() => '')), 'bir gizli yer bulundu: rozet 1/3');
  ok((await page.locator('.room__prop[data-label="???"]').count()) === 2, 'bulunan yer artık gizli değil');
  const namesNow = await home.locator('.file-explorer__item-name').allTextContents();
  ok(namesNow.some((n) => /Photos|Downloads/.test(n)), `bulunan yer dosya listesinde göründü: ${namesNow.join(', ')}`);
  ok(!namesNow.some((n) => /Music/.test(n)), 'müzik oynatıcı hâlâ gizli (taslak)');
  await page.screenshot({ path: `${SHOTS}/room-secret.png` });
  ok(await page.evaluate(() => { for (let e = document.querySelector('.room'); e; e = e.parentElement) if (e.scrollLeft !== 0) return false; return true; }), 'oda açıkken ve uzak bir yere gidildikten sonra da pencere yana kaymadı');
  // uzun odada kamerayı elle gezdir: ok düğmesi
  const camBefore = await page.locator('.room__world').evaluate((e) => e.style.transform);
  await page.locator('.room__pan--left').click({ force: true });
  await page.waitForTimeout(700);
  const camAfter = await page.locator('.room__world').evaluate((e) => e.style.transform);
  ok(camBefore !== camAfter, `kamera ok düğmesiyle kaydı (${camBefore} → ${camAfter})`);

  /* ---------- 5) Çıkış kapısı ve yaşam döngüsü ---------- */
  console.log('\n[5] Çıkış ve yaşam döngüsü');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const exitBtn = page.locator('.room__prop[data-prop-id="__exit"]');
  ok(/Up to/.test(await exitBtn.getAttribute('data-label')) || /Leave/.test(await exitBtn.getAttribute('data-label')), `çıkış kapısı: "${await exitBtn.getAttribute('data-label')}"`);
  await page.locator('.room__close').click();
  await page.waitForTimeout(900);
  ok((await page.locator('.room').count()) === 0 && !(await petIn(page)).room, 'odayı kapatınca şerit gitti, pet masaüstünde');
  ok(await page.evaluate(() => { for (let e = document.querySelector('.file-explorer'); e; e = e.parentElement) if (e.scrollLeft !== 0) return false; return true; }), 'oda pencerenin içeriğini yana kaydırmadı (scrollLeft = 0)');
  await home.locator('.room-toggle').click();
  await page.waitForSelector('.room');
  await page.waitForTimeout(1000);
  ok((await petIn(page)).room, 'düğmeyle pet yine davet edildi');
  await home.locator('.window__button--minimize, .window__button--close').first().click();
  await page.waitForTimeout(900);
  ok(!(await petIn(page)).room, 'pencere küçülünce/kapanınca pet masaüstüne döndü');
  ok(page.__errors.length === 0, `konsol hatası yok (${page.__errors.join(' | ').slice(0, 220) || 'temiz'})`);
  await ctx.close();

  /* ---------- 6) Projects odası ---------- */
  console.log('\n[6] Projects atölyesi');
  ({ ctx, page } = await boot(browser, BASE));
  await page.locator('.desktop-icon[data-node-id="projects"]').dblclick();
  await page.waitForSelector('.repo-card', { timeout: 10000 });
  await page.locator('.github-projects .room-toggle').click();
  await page.waitForSelector('.room');
  await page.waitForTimeout(1200);
  const pr = await props(page);
  ok((await page.locator('.room').getAttribute('data-room-theme')) === 'projects' && pr.length === REPOS.length + 1, `atölye: ${REPOS.length} repo kutusu + çıkış (${pr.map((p) => p.label).join(', ')})`);
  ok(pr.some((p) => /SelfFork ★12/.test(p.label)), 'yıldızlı repo etiketinde ★ sayısı var');
  await page.locator('.room__prop', { hasText: '' }).filter({ has: page.locator('[data-prop-id]') }).first().isVisible().catch(() => {});
  await page.locator('.room__prop[data-label^="Shiffy"]').click();
  await page.waitForTimeout(3500);
  ok((await page.locator('.repo-card--spot, .repo-card[data-repo="Shiffy"]').count()) >= 1, 'kutuya gidince ilgili repo kartı öne çıktı');
  await page.screenshot({ path: `${SHOTS}/room-projects.png` });
  await ctx.close();

  /* ---------- 7) Asistan kapalıysa / mobil ---------- */
  console.log('\n[7] Asistan kapalı ve mobil');
  ({ ctx, page } = await boot(browser, BASE, { settings: { assistantHidden: true }, noPet: true }));
  const w7 = await openFolder(page, 'games');
  ok((await w7.locator('.room-toggle').count()) === 0, 'asistan kapalıyken oda düğmesi yok');
  await ctx.close();
  const mctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
  await mctx.addInitScript(onboarded({}), {});
  const mp = await mctx.newPage();
  await routes(mp);
  await mp.goto(BASE + '/', { waitUntil: 'load' });
  await mp.waitForTimeout(2500);
  ok((await mp.locator('.room-toggle, .room, .pet').count()) === 0, 'mobilde oda düğmesi, şerit ve pet yok');
  await mctx.close();

  await browser.close();
  server.close();
  console.log(`\n${failures === 0 ? 'TÜM ODA TESTLERİ GEÇTİ' : failures + ' BAŞARISIZ'}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST HATASI', e); process.exit(2); });
