// Pencere sürükleme kıyaslaması: kare süreleri, long task'lar, iskelet (Suspense fallback) görünürlüğü.
// Sürükleme, sayfa içinde kare başına bir sentetik mousemove ile deterministik sürülür.
const { chromium } = require('playwright');

const BASE = process.env.BASE;
const RUNS = Number(process.env.RUNS || 3);
const FRAMES = Number(process.env.FRAMES || 150);

async function once(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  if (process.env.ONBOARDED) {
    // yeni onboarding: karşılamayı atla, widget/asistan ayarını env'den al
    const hidden = process.env.ONBOARDED === 'bare';
    await page.addInitScript((h) => localStorage.setItem('ubuntu-xp-storage', JSON.stringify({ state: { settings: { onboarded: true, widgetHidden: h, assistantHidden: h } }, version: 0 })), hidden);
  }
  await page.route('**/cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector('.desktop-icon__label', { timeout: 20000 });
  await page
    .locator('.desktop-icon', { has: page.locator('.desktop-icon__label', { hasText: /^Terminal$/ }) })
    .first()
    .dblclick();
  await page.waitForSelector('.window .terminal-app', { timeout: 10000 });
  await page.waitForTimeout(800);

  const renderBefore = logs.filter((l) => l.includes('RENDER START')).length;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metricsOf = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const m0 = await metricsOf();
  const tb = await page.locator('.window__titlebar').first().boundingBox();
  const sx = tb.x + tb.width / 2;
  const sy = tb.y + 10;
  await page.mouse.move(sx, sy);
  await page.mouse.down();

  const stats = await page.evaluate(
    async ({ sx, sy, N }) => {
      const dts = [];
      let skel = 0;
      let hidden = 0;
      let mutations = 0;
      const longTasks = [];
      const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => longTasks.push(e.duration)));
      try {
        po.observe({ type: 'longtask' });
      } catch (e) {}
      const mo = new MutationObserver((m) => {
        mutations += m.length;
      });
      mo.observe(document.querySelector('.window__content'), {
        childList: true,
        subtree: true,
        attributes: true,
      });
      let last = performance.now();
      for (let i = 1; i <= N; i++) {
        await new Promise((res) => requestAnimationFrame(res));
        const now = performance.now();
        dts.push(now - last);
        last = now;
        if (document.querySelector('.window__content .app-skeleton')) skel++;
        const t = document.querySelector('.window .terminal-app');
        if (!t || getComputedStyle(t).display === 'none') hidden++;
        document.dispatchEvent(
          new MouseEvent('mousemove', { clientX: sx + i * 3, clientY: sy + i, bubbles: true })
        );
      }
      await new Promise((res) => requestAnimationFrame(res));
      await new Promise((res) => setTimeout(res, 100));
      po.disconnect();
      mo.disconnect();
      const s = [...dts].sort((a, b) => a - b);
      const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
      return {
        frames: dts.length,
        mean,
        p50: s[Math.floor(s.length * 0.5)],
        p95: s[Math.floor(s.length * 0.95)],
        max: s[s.length - 1],
        longTasks: longTasks.length,
        longTaskMs: longTasks.reduce((a, b) => a + b, 0),
        skeletonFrames: skel,
        hiddenFrames: hidden,
        mutations,
      };
    },
    { sx, sy, N: FRAMES }
  );
  const m1 = await metricsOf();
  await page.mouse.up();
  const cpu = (k) => ((m1[k] - m0[k]) * 1000) / FRAMES; // ms / kare
  const renders = logs.filter((l) => l.includes('RENDER START')).length - renderBefore;
  await page.close();
  return { ...stats, appLoaderRenders: renders, cpuTask: cpu('TaskDuration'), cpuScript: cpu('ScriptDuration'), cpuLayout: cpu('LayoutDuration'), cpuStyle: cpu('RecalcStyleDuration') };
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (let i = 0; i < RUNS; i++) results.push(await once(browser));
  await browser.close();

  const med = (k) => {
    const v = results.map((r) => r[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  };
  const f = (n) => (typeof n === 'number' ? n.toFixed(1) : n);
  console.log(`BASE=${BASE}  RUNS=${RUNS}  FRAMES/run=${FRAMES}  (medyan değerler)`);
  console.log(`  kare süresi ort/p50/p95/max (ms): ${f(med('mean'))} / ${f(med('p50'))} / ${f(med('p95'))} / ${f(med('max'))}`);
  console.log(`  long task (>50ms) sayısı / toplam ms: ${f(med('longTasks'))} / ${f(med('longTaskMs'))}`);
  console.log(`  iskelet (Suspense fallback) görünen kare: ${f(med('skeletonFrames'))} / ${FRAMES}`);
  console.log(`  uygulama gizli (display:none) kare     : ${f(med('hiddenFrames'))} / ${FRAMES}`);
  console.log(`  pencere içi DOM mutasyonu              : ${f(med('mutations'))}`);
  console.log(`  AppLoader render sayısı                : ${f(med('appLoaderRenders'))}`);
  console.log(`  ana iş parçacığı ms/kare  görev/script/layout/style: ${f(med('cpuTask'))} / ${f(med('cpuScript'))} / ${f(med('cpuLayout'))} / ${f(med('cpuStyle'))}`);
  console.log('  ham:', JSON.stringify(results.map((r) => ({ mean: +r.mean.toFixed(1), skel: r.skeletonFrames, hid: r.hiddenFrames, mut: r.mutations, rend: r.appLoaderRenders }))));
})().catch((e) => {
  console.error('BENCH HATASI:', e.message);
  process.exit(1);
});
