#!/usr/bin/env node
/**
 * Draws the share images with the real pixel twin, so there is nothing to mistype:
 *   public/og-en.jpg, public/og-tr.jpg   1200x630, what LinkedIn / WhatsApp / Slack / X show for a link
 *   public/avatar.png                    512x512, the Person image in the JSON-LD
 *
 *   npm run seo:assets            (needs Playwright's Chromium; commit the results)
 *
 * OUT_DIR overrides the output folder (default: ../../public).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// (require, not import: it also finds a globally installed Playwright through NODE_PATH)
const { chromium } = createRequire(import.meta.url)('playwright');

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const OUT = process.env.OUT_DIR || here('../../public');
const uri = (file) => `data:image/png;base64,${readFileSync(here(file)).toString('base64')}`;
const SHEET = uri('../../src/assets/sprites/mascot.png');
const BUST = uri('../../src/assets/sprites/mascot-bust.png');

// sprite sheet geometry (src/assets/sprites/mascot.meta.ts): 40x46 frames, 6 columns; wave = row 4
const FW = 40;
const FH = 46;
const COLS = 6;
const ROWS = 79;
const WAVE_ROW = 4;
const WAVE_FRAME = 1;

const TEXT = {
  en: {
    kicker: 'PORTFOLIO · INTERACTIVE DESKTOP',
    role: 'Software Engineer',
    tagline: 'AI platforms · backend · full-stack',
    company: 'Arketic AI',
    hi: 'Hi!',
    window: 'Welcome',
  },
  tr: {
    kicker: 'PORTFÖY · ETKİLEŞİMLİ MASAÜSTÜ',
    role: 'Yazılım Mühendisi',
    tagline: 'Yapay zeka platformları · backend · full-stack',
    company: 'Arketic AI',
    hi: 'Selam!',
    window: 'Hoş geldin',
  },
};

function ogHtml(lang) {
  const t = TEXT[lang];
  const S = 7; // sprite scale
  return `<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:1200px;height:630px;overflow:hidden;font-family:Inter,'DejaVu Sans',system-ui,sans-serif;color:#fff}
    #og{position:relative;width:1200px;height:630px;background:radial-gradient(900px 520px at 85% 15%,rgba(139,92,246,.45),transparent),radial-gradient(700px 400px at 0% 100%,rgba(245,158,11,.14),transparent),linear-gradient(135deg,#0b1020 0%,#1b1f4b 55%,#3b1d7a 100%)}
    #og::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1.4px,transparent 1.6px);background-size:28px 28px}
    .left{position:absolute;left:76px;top:84px;width:660px}
    .kicker{font-size:19px;font-weight:600;letter-spacing:.2em;color:#a5b4fc}
    h1{margin-top:26px;font-size:76px;line-height:1.02;font-weight:800;letter-spacing:-.035em}
    .role{margin-top:18px;font-size:44px;font-weight:600;color:#e0e7ff;letter-spacing:-.01em}
    .tag{margin-top:12px;font-size:29px;color:#a5b4fc;line-height:1.3}
    .chip{display:inline-block;margin-top:34px;padding:10px 22px;border:2px solid #f59e0b;border-radius:999px;color:#fbbf24;font-size:25px;font-weight:700}
    .url{position:absolute;left:76px;bottom:62px;font-size:34px;font-weight:700;letter-spacing:-.01em}
    .url::after{content:'';display:block;width:84px;height:5px;margin-top:10px;border-radius:3px;background:linear-gradient(90deg,#f59e0b,#f97316)}
    .win{position:absolute;left:790px;top:78px;width:336px;height:474px;border:1px solid rgba(255,255,255,.16);border-radius:20px;overflow:hidden;background:rgba(15,23,42,.9);box-shadow:0 30px 70px rgba(0,0,0,.5)}
    .bar{display:flex;align-items:center;gap:8px;height:46px;padding:0 16px;background:rgba(255,255,255,.07);font-size:16px;color:#cbd5e1}
    .bar i{width:12px;height:12px;border-radius:50%;background:#64748b}
    .bar i:nth-child(1){background:#f87171}.bar i:nth-child(2){background:#fbbf24}.bar i:nth-child(3){background:#34d399}
    .bar b{margin-left:10px;font-weight:600}
    .stage{position:relative;height:428px;background:linear-gradient(180deg,rgba(77,182,172,.22),rgba(84,110,122,.4))}
    .bubble{position:absolute;left:46px;top:30px;padding:9px 18px;border-radius:14px;background:#fff;color:#0f172a;font-size:24px;font-weight:700}
    .bubble::after{content:'';position:absolute;left:34px;bottom:-9px;border:9px solid transparent;border-top-color:#fff;border-bottom:0}
    .twin{position:absolute;left:${(336 - FW * S) / 2}px;bottom:34px;width:${FW * S}px;height:${FH * S}px;background:url(${SHEET}) -${WAVE_FRAME * FW * S}px -${WAVE_ROW * FH * S}px/${COLS * FW * S}px ${ROWS * FH * S}px no-repeat;image-rendering:pixelated}
    .floor{position:absolute;left:0;right:0;bottom:0;height:34px;background:rgba(15,23,42,.55)}
  </style>
  <div id="og">
    <div class="left">
      <div class="kicker">${t.kicker}</div>
      <h1>Yamaç Bezirgan</h1>
      <div class="role">${t.role}</div>
      <div class="tag">${t.tagline}</div>
      <div class="chip">${t.company}</div>
    </div>
    <div class="url">yamacbezirgan.com</div>
    <div class="win">
      <div class="bar"><i></i><i></i><i></i><b>${t.window}</b></div>
      <div class="stage"><div class="bubble">${t.hi}</div><div class="floor"></div><div class="twin"></div></div>
    </div>
  </div>`;
}

const avatarHtml = `<!doctype html><meta charset="utf-8"><style>
  *{margin:0}body{width:512px;height:512px;display:grid;place-items:center;background:linear-gradient(160deg,#4db6ac,#546e7a)}
  img{width:416px;height:416px;image-rendering:pixelated}
</style><img src="${BUST}" alt="">`;

const browser = await chromium.launch();
try {
  for (const lang of ['en', 'tr']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(ogHtml(lang));
    await page.waitForTimeout(250);
    writeFileSync(`${OUT}/og-${lang}.jpg`, await page.screenshot({ type: 'jpeg', quality: 90 }));
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.setContent(avatarHtml);
  await page.waitForTimeout(150);
  writeFileSync(`${OUT}/avatar.png`, await page.screenshot({ type: 'png' }));
  await page.close();
  console.log(`[assets] og-en.jpg, og-tr.jpg, avatar.png written to ${OUT}`);
} finally {
  await browser.close();
}
