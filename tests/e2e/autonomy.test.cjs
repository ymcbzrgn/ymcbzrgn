// Karakterin kendi başına yaptığı masaüstü işleri: pencere başlığına oturma ve ikona gizlice girme.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../..');
const SP = process.env.E2E_TMP || path.join(require('os').tmpdir(), 'portfolio-e2e');
fs.mkdirSync(path.join(SP, 'room-shots'), { recursive: true });
const { pdfjsRoutes } = require('./lib.cjs');
const DIST = path.resolve(process.env.DIST_DIR || path.join(ROOT, 'dist'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => { const p = decodeURIComponent(req.url.split('?')[0]); let f = path.join(DIST, p); if (!(f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile())) f = path.join(DIST, 'index.html'); res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
let failures = 0;
const ok = (c, m) => { console.log(`  ${c ? '✓' : '✗ FAIL:'} ${m}`); if (!c) failures++; };
const META = fs.readFileSync(`${ROOT}/src/assets/sprites/mascot.meta.ts`, 'utf8');
const FRAME_H = Number(/SPRITE_FRAME_H = (\d+)/.exec(META)[1]);
const ROWS = []; for (const m of META.matchAll(/(\w+): \{ row: (\d+)/g)) ROWS[Number(m[2])] = m[1];
const state = (page) => page.evaluate(([rows, h]) => {
  const pet = document.querySelector('.pet'); if (!pet) return null;
  const num = (re, s) => { const m = re.exec(s || ''); return m ? parseFloat(m[1]) : 0; };
  const sp = document.querySelector('.pet .sprite'); const by = sp ? parseFloat(getComputedStyle(sp).backgroundPositionY) : 0;
  const r = document.querySelector('.pet .sprite').getBoundingClientRect();
  return { x: num(/translate3d\((-?[\d.]+)px/, pet.style.transform), gy: -num(/translate3d\(0(?:px)?, (-?[\d.]+)px/, document.querySelector('.pet__ground')?.style.transform), anim: rows[Math.round(-by / h)], op: parseFloat(document.querySelector('.pet__vis')?.style.opacity || '1'), feet: r.bottom - 3, cx: r.left + r.width / 2 };
}, [ROWS, FRAME_H * 3]);
const iconOpening = (page) => page.evaluate(() => !!document.querySelector('.desktop-icon--opening'));
// Math.random = 0.01: the dice always say "do something" and the first choices are picked
const seed = () => { Math.random = () => 0.01; };
const boot = async (b, BASE, openGames) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  await ctx.addInitScript(() => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true } }, version: 0 })));
  await ctx.addInitScript(seed);
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', (e) => page.__errors.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForSelector('.desktop-icon');
  if (openGames) { await page.waitForTimeout(700); await page.locator('.desktop-icon[data-node-id="games"]').dblclick(); await page.waitForSelector('.window'); }
  return { ctx, page };
};
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const b = await chromium.launch();

  console.log('\n[1] Pencere açıkken: başlık çubuğuna sıçrayıp oturur');
  let { ctx, page } = await boot(b, BASE, true);
  let sat = null, jumped = false;
  for (let i = 0; i < 80; i++) {
    const s = await state(page);
    const bar = await page.locator('.window__titlebar').first().boundingBox();
    if (s && s.gy > 60 && s.anim === 'jump') jumped = true;
    if (s && bar && s.anim === 'sit' && Math.abs(s.feet - bar.y) < 14) { sat = s; break; }
    await page.waitForTimeout(150);
  }
  ok(jumped, 'önce zıplayarak yükseldi');
  ok(!!sat, 'başlık çubuğunun üstünde oturuyor');
  if (sat) {
    const bar0 = await page.locator('.window__titlebar').first().boundingBox();
    await page.mouse.move(bar0.x + 300, bar0.y + 12); await page.mouse.down(); await page.mouse.move(bar0.x + 420, bar0.y + 60, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(250);
    const s2 = await state(page); const bar1 = await page.locator('.window__titlebar').first().boundingBox();
    ok(Math.abs(s2.feet - bar1.y) < 14 && s2.cx - sat.cx > 80, `pencereyle birlikte taşındı (+${(s2.cx - sat.cx).toFixed(0)} px, ayak-bar farkı ${(s2.feet - bar1.y).toFixed(0)})`);
    await page.screenshot({ path: `${SP}/room-shots/autonomy-perch.png` });
  }
  let down = false;
  for (let i = 0; i < 120 && !down; i++) { const s = await state(page); down = !!s && s.gy === 0 && s.anim !== 'sit' && s.anim !== 'jump'; await page.waitForTimeout(200); }
  ok(down, 'bir süre sonra görev çubuğuna geri indi');
  ok(page.__errors.length === 0, 'sayfa hatası yok ' + page.__errors.join('|').slice(0, 120));
  await ctx.close();

  console.log('\n[2] Pencere yokken: bir ikona gizlice girip çıkar');
  ({ ctx, page } = await boot(b, BASE, false));
  let hidden = false, opening = false, spoke = false, maxGy = 0;
  for (let i = 0; i < 160; i++) {
    const s = await state(page);
    if (s) { maxGy = Math.max(maxGy, s.gy); if (s.op < 0.3) hidden = true; }
    if (await iconOpening(page)) opening = true;
    if (/looked|Cozy|Nothing to see|still a folder/.test(await page.evaluate(() => document.querySelector('.pet__bubble')?.textContent || ''))) spoke = true;
    if (hidden && spoke) break;
    await page.waitForTimeout(150);
  }
  ok(maxGy > 100, `ikona doğru yukarı yürüdü (en yüksek gy ${maxGy.toFixed(0)})`);
  ok(hidden, 'ikonun içine girip kayboldu');
  ok(opening, 'ikon "açılma" animasyonunu oynadı');
  ok(spoke, 'çıkınca bir şey söyledi');
  ok((await page.locator('.window').count()) === 0, 'hiçbir pencere açmadı (sadece baktı)');
  let landed = false;
  for (let i = 0; i < 40 && !landed; i++) { const s = await state(page); landed = !!s && s.gy === 0 && s.op === 1; await page.waitForTimeout(150); }
  ok(landed, 'sonunda görev çubuğuna indi, görünür');
  await page.screenshot({ path: `${SP}/room-shots/autonomy-visit.png` });
  ok(page.__errors.length === 0, 'sayfa hatası yok');
  await ctx.close();

  await b.close(); server.close();
  console.log(`\n${failures === 0 ? 'TÜM OTONOMİ TESTLERİ GEÇTİ' : failures + ' BAŞARISIZ'}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('TEST HATASI', e); process.exit(2); });
