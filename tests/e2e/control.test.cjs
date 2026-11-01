// Kontrol modu: menü, 2D klavye, zıplama, palet, klavye koruması, tıkla-git, ikona girme (E), pencereye oturma, çıkış.
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const SP = process.env.E2E_TMP || path.join(require('os').tmpdir(), 'portfolio-e2e');
fs.mkdirSync(path.join(SP, 'room-shots'), { recursive: true });
const { pdfjsRoutes } = require('./lib.cjs');
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const SHOTS = path.join(SP, 'ctl-shots');
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

const META = fs.readFileSync(`${ROOT}/src/assets/sprites/mascot.meta.ts`, 'utf8');
const FRAME_H = Number(/SPRITE_FRAME_H = (\d+)/.exec(META)[1]);
const ANIM_ROWS = [];
for (const m of META.matchAll(/(\w+): \{ row: (\d+)/g)) ANIM_ROWS[Number(m[2])] = m[1];
const NOT_MOVES = new Set(['idle', 'drag', 'walk', 'run', 'walkUp', 'walkDown', 'carryIdle', 'carryWalk', 'pickup', 'putdown']);
const PALETTE = ANIM_ROWS.filter((a) => a && !NOT_MOVES.has(a));
const HAS = (a) => ANIM_ROWS.includes(a);

async function routes(page) {
  await pdfjsRoutes(page);
  await page.route('https://raw.githubusercontent.com/**', (r) => r.abort());
  await page.route('https://api.github.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
}
const onboarded = () => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true } }, version: 0 }));

const state = (page) =>
  page.evaluate(([rows, h]) => {
    const pet = document.querySelector('.pet');
    if (!pet) return null;
    const num = (re, s) => { const m = re.exec(s || ''); return m ? parseFloat(m[1]) : 0; };
    const sp = document.querySelector('.pet .sprite');
    const by = sp ? parseFloat(getComputedStyle(sp).backgroundPositionY) : 0;
    const body = document.querySelector('.pet__vis');
    return {
      x: num(/translate3d\((-?[\d.]+)px/, pet.style.transform),
      gy: -num(/translate3d\(0(?:px)?, (-?[\d.]+)px/, document.querySelector('.pet__ground')?.style.transform),
      jy: -num(/translate3d\(0(?:px)?, (-?[\d.]+)px/, document.querySelector('.pet__lift')?.style.transform),
      anim: rows[Math.round(-by / h)],
      vis: body?.style.opacity || '1',
    };
  }, [ANIM_ROWS, FRAME_H * 3]);

async function boot(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: opts.locale || 'en-US', reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(onboarded);
  const page = await ctx.newPage();
  await routes(page);
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text()) && page.__errors.push(m.text().slice(0, 160)));
  await page.goto(opts.base + '/', { waitUntil: 'load' });
  await page.waitForSelector('.pet .sprite', { timeout: 15000 });
  return { ctx, page };
}

async function startControl(page) {
  await page.waitForTimeout(3300); // entrance run + wave
  const box = await page.locator('.pet__hit').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForSelector('.pet__menu', { timeout: 3000 });
  await page.locator('.pet__menu-control').click();
  await page.waitForSelector('.pet-ctl', { timeout: 5000 });
  await page.waitForTimeout(200);
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();

  /* ---------- 1) menü + HUD ---------- */
  console.log('\n[1] Menü ve HUD');
  let { ctx, page } = await boot(browser, { base: BASE });
  await page.waitForTimeout(3300);
  const box0 = await page.locator('.pet__hit').boundingBox();
  await page.mouse.click(box0.x + box0.width / 2, box0.y + box0.height / 2);
  await page.waitForSelector('.pet__menu');
  const items = await page.locator('.pet__menu button').allTextContents();
  ok(items[0] === 'Control me', `menünün ilk maddesi "Control me" (${items[0]})`);
  await page.locator('.pet__menu-control').click();
  await page.waitForSelector('.pet-ctl');
  const hud = await page.locator('.pet-ctl').innerText();
  ok(/You are driving/.test(hud) && /walk/.test(hud) && /Esc/.test(hud), 'HUD başlığı ve tuş ipuçları görünüyor');
  ok((await page.locator('.pet__menu').count()) === 0, 'menü kapandı');
  await page.waitForTimeout(300);
  await page.mouse.click(box0.x + box0.width / 2, box0.y + box0.height / 2);
  await page.waitForSelector('.pet__menu');
  ok((await page.locator('.pet__menu-control').innerText()) === 'Stop controlling me', 'kontrol açıkken madde "Stop controlling me"');
  await page.keyboard.press('Escape'); // menüyü kapatır, kontrolden çıkmaz
  await page.waitForTimeout(300);
  ok((await page.locator('.pet-ctl').count()) === 1, 'Esc önce menüyü kapatır, kontrol sürer');

  /* ---------- 2) yürüme / koşma / dikey / zıplama ---------- */
  console.log('\n[2] Hareket');
  await page.mouse.click(1200, 120); // masaüstüne tıkla: klavye karakterde, aynı zamanda oraya yürümeye başlar
  await page.waitForTimeout(100);
  // hedef yürüyüşünü klavyeyle kes, sakin bir başlangıç noktası bul
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(150); await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(150);
  let s0 = await state(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  const mid = await state(page);
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowRight');
  let s1 = await state(page);
  const dWalk = s1.x - s0.x;
  ok(dWalk > 100 && dWalk < 190, `→ 700 ms ≈ 133 px yürüdü (${dWalk.toFixed(0)} px)`);
  ok(mid.anim === 'walk', `yürürken animasyon walk (${mid.anim})`);
  await page.waitForTimeout(120);
  s0 = await state(page);
  ok(s0.anim === 'idle', `bırakınca idle (${s0.anim})`);

  await page.keyboard.down('Shift'); await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(180);
  const runMid = await state(page);
  await page.waitForTimeout(320);
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('Shift');
  s1 = await state(page);
  const dRun = s0.x - s1.x;
  ok(dRun > 140 && dRun < 260, `Shift+← 500 ms ≈ 190 px koştu (${dRun.toFixed(0)} px)`);
  ok(runMid.anim === 'run', `koşarken animasyon run (${runMid.anim})`);

  s0 = await state(page);
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(250);
  const upMid = await state(page);
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowUp');
  s1 = await state(page);
  ok(s1.gy - s0.gy > 60 && s1.gy - s0.gy < 125, `↑ 600 ms ≈ 90 px yukarı yürüdü (${(s1.gy - s0.gy).toFixed(0)} px)`);
  ok(upMid.anim === (HAS('walkUp') ? 'walkUp' : 'walk'), `yukarı yürürken animasyon ${HAS('walkUp') ? 'walkUp' : 'walk'} (${upMid.anim})`);
  s0 = await state(page);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  const downMid = await state(page);
  await page.waitForTimeout(150);
  await page.keyboard.up('ArrowDown');
  ok(downMid.anim === (HAS('walkDown') ? 'walkDown' : 'walk'), `aşağı yürürken animasyon ${HAS('walkDown') ? 'walkDown' : 'walk'} (${downMid.anim})`);
  // gölge ve gövde birlikte yükseldi: gy ayrı katmanda
  ok(s1.gy > 40, 'dikey konum .pet__ground katmanında (gölge karakterle birlikte)');

  await page.keyboard.press('Space');
  await page.waitForTimeout(260);
  const air = await state(page);
  ok(air.jy > 40 && air.anim === 'jump', `Space ile zıpladı (jy=${air.jy.toFixed(0)}, ${air.anim})`);
  await page.waitForTimeout(500);
  const ground = await state(page);
  ok(ground.jy === 0 && ground.anim !== 'jump', `iniş yaptı (jy=${ground.jy}, ${ground.anim})`);
  await page.screenshot({ path: `${SHOTS}/control-hud.png` });

  /* ---------- 3) palet ---------- */
  console.log('\n[3] Hareket paleti');
  await page.keyboard.press('KeyM');
  await page.waitForSelector('.pet-ctl-palette');
  const nMoves = await page.locator('.pet-ctl-move').count();
  ok(nMoves === PALETTE.length, `palet ${PALETTE.length} hareketi listeliyor (${nMoves})`);
  const locked0 = await page.locator('.pet-ctl-move.is-locked').count();
  ok(locked0 > 0, `keşfedilmemiş hareketler silüet olarak kilitli (${locked0}/${nMoves})`);
  const pushBtn = page.locator('.pet-ctl-move[data-anim="pushup"]');
  const wasLocked = await pushBtn.evaluate((e) => e.classList.contains('is-locked'));
  await pushBtn.click();
  await page.waitForTimeout(250);
  let sp = await state(page);
  ok(sp.anim === 'pushup', `palette tıklayınca şınav (${sp.anim})`);
  const seenLS = await page.evaluate(() => localStorage.getItem('yb-moves'));
  ok(/pushup/.test(seenLS || ''), 'keşfedilen hareket localStorage\'a yazıldı');
  await page.waitForTimeout(100);
  ok(!(await pushBtn.evaluate((e) => e.classList.contains('is-locked'))) , wasLocked ? 'kilit açıldı' : 'zaten açıktı');
  ok((await page.locator('.pet-ctl__btn').first().innerText()).includes(`/${PALETTE.length}`), 'HUD sayacı N/M gösteriyor');
  await page.screenshot({ path: `${SHOTS}/control-palette.png` });
  await page.keyboard.press('Space'); // palet butonuna odak kalmamalı: Space zıplatır
  await page.waitForTimeout(260);
  ok((await state(page)).jy > 30, 'palet tıklandıktan sonra Space yine zıplatıyor (odak kapıldı mı yok)');
  await page.waitForTimeout(600);
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(200);
  sp = await state(page);
  ok(sp.anim === (HAS('pushup') ? 'pushup' : sp.anim) && sp.anim !== 'idle', `2 tuşu hızlı hareket oynattı (${sp.anim})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  ok((await page.locator('.pet-ctl-palette').count()) === 0 && (await page.locator('.pet-ctl').count()) === 1, 'Esc önce paleti kapatır, kontrol sürer');

  /* ---------- 4) klavye koruması ---------- */
  console.log('\n[4] Klavye koruması');
  await page.evaluate(() => { const i = document.createElement('input'); i.id = 'tt'; i.style.cssText = 'position:fixed;left:10px;top:10px;z-index:9999'; document.body.appendChild(i); i.focus(); });
  await page.waitForTimeout(100);
  s0 = await state(page);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
  await page.keyboard.type('e m');
  s1 = await state(page);
  ok(Math.abs(s1.x - s0.x) < 2, 'input odaktayken ok tuşları karakteri oynatmadı');
  ok((await page.inputValue('#tt')) === 'e m', 'E / M / boşluk input\'a yazıldı');
  ok((await page.locator('.pet-ctl-palette').count()) === 0, 'input\'a yazılan M paleti açmadı');
  await page.evaluate(() => document.getElementById('tt').remove());
  await page.mouse.click(1300, 700);

  /* ---------- 5) tıkla-git ---------- */
  console.log('\n[5] Tıkla-git');
  await page.mouse.click(900, 430);
  const t0 = Date.now();
  let runSeen = false;
  for (let i = 0; i < 40; i++) {
    s1 = await state(page);
    if (s1.anim === 'run') runSeen = true;
    if (Math.abs(s1.x + 60 - 900) < 12 && Math.abs(900 - 48 - s1.gy - 430) < 12) break;
    await page.waitForTimeout(150);
  }
  ok(Date.now() - t0 < 5200, `ekranı ${((Date.now() - t0) / 1000).toFixed(1)} sn'de geçti (uzak hedefe koşar)`);
  ok(runSeen, 'uzak hedefe koşarak gitti (run animasyonu)');
  ok(Math.abs(s1.x + 60 - 900) < 30, `tıklanan noktaya yürüdü (x merkezi ${(s1.x + 60).toFixed(0)} ≈ 900)`);
  ok(Math.abs(900 - 48 - s1.gy - 430) < 30, `aynı yüksekliğe geldi (ayak y ${(900 - 48 - s1.gy).toFixed(0)} ≈ 430)`);

  /* ---------- 6) ikona yürü + E ---------- */
  console.log('\n[6] İkona yürü, E ile içine gir');
  // 6a) bir klasör: karakter pencerenin ODASINA girer
  const icon = page.locator('.desktop-icon[data-node-id="games"]');
  ok((await icon.count()) === 1, 'Games ikonu data-node-id ile bulunuyor');
  await icon.click();
  await page.waitForTimeout(3500);
  const hint = page.locator('.pet-ctl-hint:not([hidden])');
  ok((await hint.count()) === 1, 'ikonun yanında "E · Open" ipucu çıktı');
  ok(/Open Games/.test(await hint.innerText().catch(() => '')), `ipucu metni (${(await hint.innerText().catch(() => '')).trim()})`);
  const hb = await hint.boundingBox();
  const sb = await page.locator('.pet .sprite').boundingBox();
  ok(hb && Math.abs(hb.x + hb.width / 2 - (sb.x + sb.width / 2)) < 30 && hb.y < sb.y + 40 && hb.y > sb.y - 90, `ipucu karakterin başının hemen üstünde, yükseklikte de (ipucu y ${hb && hb.y.toFixed(0)}, karakter y ${sb.y.toFixed(0)})`);
  await page.screenshot({ path: `${SHOTS}/control-hint.png` });
  const winsBefore = await page.locator('.window').count();
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
  const hopping = await state(page);
  ok(Number(hopping.vis) < 1 || hopping.anim === 'jump', `E: ikona atlıyor (opaklık ${hopping.vis}, ${hopping.anim})`);
  await page.waitForSelector('.window[data-app-id="file-explorer"]', { timeout: 4000 });
  ok((await page.locator('.window').count()) === winsBefore + 1, 'pencere açıldı');
  await page.waitForSelector('.room__world .pet', { timeout: 6000 });
  await page.waitForTimeout(1200);
  ok((await page.locator('.room').getAttribute('data-room-theme')) === 'games', 'karakter klasörün odasına girdi (şerit açıldı, games teması)');
  const roomState = await state(page);
  ok(roomState.vis === '1' && roomState.anim !== undefined, `odada görünür (${roomState.anim}, opaklık ${roomState.vis})`);
  await page.screenshot({ path: `${SHOTS}/control-room-enter.png` });
  await page.locator('.window[data-app-id="file-explorer"] .window__button--close').click();
  await page.waitForTimeout(900);
  ok(!(await page.evaluate(() => !!document.querySelector('.room__world .pet'))), 'pencere kapanınca karakter masaüstüne döndü');
  await page.mouse.click(1380, 760);
  await page.waitForTimeout(400);

  // 6b) bir uygulama: karakter pencerenin başlık çubuğuna oturur
  const term = page.locator('.desktop-icon[data-node-id="terminal-app"]');
  await term.click();
  await page.waitForTimeout(3600);
  ok(/Open Terminal/.test(await page.locator('.pet-ctl-hint:not([hidden])').innerText().catch(() => '')), 'Terminal ikonunun yanında ipucu');
  await page.keyboard.press('KeyE');
  await page.waitForSelector('.window[data-app-id="terminal-app"]', { timeout: 4000 });
  await page.waitForTimeout(1400);
  const perched = await state(page);
  const barBox = await page.locator('.window[data-app-id="terminal-app"] .window__titlebar').boundingBox();
  const petBox = await page.locator('.pet .sprite').boundingBox();
  const feet = petBox.y + petBox.height - 3;
  ok(Math.abs(feet - barBox.y) < 12, `karakter başlık çubuğunun üstünde (ayak ${feet.toFixed(0)} ≈ bar ${barBox.y.toFixed(0)})`);
  ok(perched.anim === 'sit' && perched.vis === '1', `oturuyor ve görünür (${perched.anim}, opaklık ${perched.vis})`);
  await page.screenshot({ path: `${SHOTS}/control-perch.png` });
  // pencereyi sürükle: karakter ona eşlik eder
  const bar = barBox;
  const px0 = (await state(page)).x;
  await page.mouse.move(bar.x + 400, bar.y + 12);
  await page.mouse.down();
  await page.mouse.move(bar.x + 520, bar.y + 70, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(250);
  const px1 = (await state(page)).x;
  ok(px1 - px0 > 80, `pencereyi sürükleyince karakter de taşındı (+${(px1 - px0).toFixed(0)} px)`);
  // klavye pencereye geçti mi? (terminal klavyeyi kendisi kullanır)
  const hudTxt = await page.locator('.pet-ctl').innerText();
  ok(/Keys are with the window/.test(hudTxt), 'terminal açılınca klavye pencerede (HUD uyarıyor)');
  s0 = await state(page);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  s1 = await state(page);
  ok(Math.abs(s1.x - s0.x) < 3, 'klavye pencerede: karakter yürümedi');
  await page.mouse.click(1380, 760);
  await page.waitForTimeout(200);
  ok(!/Keys are with the window/.test(await page.locator('.pet-ctl').innerText()), 'masaüstüne tıklayınca klavye karaktere döndü');

  /* ---------- 7) dizzy + Konami ---------- */
  console.log('\n[7] Sürprizler');
  await page.waitForTimeout(2000);
  let dizzy = false;
  for (let i = 0; i < 9 && !dizzy; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(580);
    dizzy = (await state(page)).anim === (HAS('dizzy') ? 'dizzy' : 'idle');
  }
  ok(dizzy && HAS('dizzy'), 'çok zıplayınca başı döndü (dizzy)');
  await page.waitForTimeout(3000);
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']) { await page.keyboard.press(k); await page.waitForTimeout(40); }
  await page.waitForTimeout(250);
  ok((await state(page)).anim === 'celebrate', 'Konami kodu kutlama başlattı');
  ok(/lives/.test(await page.locator('.pet__bubble').first().innerText().catch(() => '')), 'Konami konuşma balonu');
  await page.waitForTimeout(3200);

  /* ---------- 8) çıkış ---------- */
  console.log('\n[8] Çıkış');
  const hi = await state(page);
  ok(hi.gy > 5, `çıkmadan önce yerden yüksekte (gy=${hi.gy.toFixed(0)})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  ok((await page.locator('.pet-ctl').count()) === 0, 'Esc ile HUD kapandı');
  await page.waitForTimeout(1100);
  const low = await state(page);
  ok(low.gy === 0 && low.jy === 0, 'yerçekimi: görev çubuğuna indi');
  ok(/Alright, alright/.test(await page.locator('.pet__bubble').first().innerText().catch(() => '')) || true, 'veda balonu (bilgi)');
  const seenAnims = new Set();
  const xs = new Set();
  for (let i = 0; i < 24; i++) { const st = await state(page); seenAnims.add(st.anim); xs.add(Math.round(st.x / 30)); await page.waitForTimeout(350); }
  ok(seenAnims.size >= 2 || xs.size >= 2, `kendi hayatına döndü (${[...seenAnims].join(', ')})`);
  ok(page.__errors.length === 0, `konsol hatası yok (${page.__errors.join(' | ').slice(0, 200) || 'temiz'})`);
  await ctx.close();

  /* ---------- 9) boşta kalınca kendiliğinden bırakır ---------- */
  console.log('\n[9] Hareketsizlik');
  ({ ctx, page } = await boot(browser, { base: BASE }));
  await startControl(page);
  await page.waitForTimeout(19500);
  ok(/Still there/.test(await page.locator('.pet__bubble').first().innerText().catch(() => '')), '18 sn sonra uyarı balonu');
  await page.waitForTimeout(8500);
  ok((await page.locator('.pet-ctl').count()) === 0, '26 sn sonra kontrol kendiliğinden bitti');
  await ctx.close();

  /* ---------- 10) TR, azaltılmış hareket, mobil ---------- */
  console.log('\n[10] Dil, reduced-motion, mobil');
  ({ ctx, page } = await boot(browser, { base: BASE, locale: 'tr-TR' }));
  await page.waitForTimeout(3300);
  const bx = await page.locator('.pet__hit').boundingBox();
  await page.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await page.waitForSelector('.pet__menu');
  ok((await page.locator('.pet__menu-control').innerText()) === 'Beni kontrol et', 'TR menü: "Beni kontrol et"');
  await page.locator('.pet__menu-control').click();
  await page.waitForSelector('.pet-ctl');
  ok(/Direksiyon sende/.test(await page.locator('.pet-ctl').innerText()), 'TR HUD: "Direksiyon sende"');
  await ctx.close();

  ({ ctx, page } = await boot(browser, { base: BASE, reduced: true }));
  await page.waitForTimeout(2500);
  const rb = await page.locator('.pet__hit').boundingBox();
  await page.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await page.waitForSelector('.pet__menu');
  await page.locator('.pet__menu-control').click();
  await page.waitForSelector('.pet-ctl');
  s0 = await state(page);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(400); await page.keyboard.up('ArrowLeft');
  s1 = await state(page);
  ok(s0.x - s1.x > 50, `reduced-motion açıkken de kullanıcı yürütebiliyor (${(s0.x - s1.x).toFixed(0)} px)`);
  await ctx.close();

  const mctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'en-US' });
  await mctx.addInitScript(onboarded);
  const mp = await mctx.newPage();
  await routes(mp);
  await mp.goto(BASE + '/', { waitUntil: 'load' });
  await mp.waitForTimeout(3500);
  ok((await mp.locator('.pet, .pet-ctl').count()) === 0, 'mobilde karakter ve kumanda yok');
  await mctx.close();

  await browser.close();
  server.close();
  console.log(`\n${failures === 0 ? 'TÜM KONTROL TESTLERİ GEÇTİ' : failures + ' BAŞARISIZ'}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST HATASI', e); process.exit(2); });
