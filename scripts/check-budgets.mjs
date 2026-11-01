#!/usr/bin/env node
/**
 * Bundle budgets. The desktop paints from a handful of files (what index.html requests); everything
 * else is lazy. This fails when the first paint gets heavier or a lazy chunk balloons, so a stray
 * import (say, the sound engine pulled into the main bundle) is caught the day it happens.
 *
 *   npm run build:new && npm run check:budgets          (DIST_DIR=other/dist to check another build)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const DIST = resolve(process.env.DIST_DIR || 'dist');

/** KB, gzip, unless noted. "now" is what it weighed when the budget was set. */
const BUDGETS = {
  criticalPath: { max: 78, now: 76.4 },
  chunks: [
    { name: 'Pet', re: /^Pet-.*\.js$/, max: 10, now: 6.7 },
    { name: 'PetControl', re: /^PetControl-.*\.js$/, max: 10, now: 6.7 },
    { name: 'Terminal', re: /^Terminal-.*\.js$/, max: 13, now: 9.9 },
    { name: 'MusicPlayer', re: /^MusicPlayer-.*\.js$/, max: 8, now: 4.7 },
    { name: 'CommandPalette', re: /^CommandPalette-.*\.js$/, max: 5, now: 3.5 },
    { name: 'tour', re: /^tour-.*\.js$/, max: 4, now: 2.5 },
    { name: 'Extras', re: /^Extras-.*\.js$/, max: 3, now: 1.5 },
    { name: 'synth', re: /^synth-.*\.js$/, max: 3, now: 1.3 },
    { name: 'Achievements', re: /^Achievements-.*\.js$/, max: 3, now: 1.2 },
    { name: 'Story', re: /^Story-.*\.js$/, max: 5, now: 3.0 },
    { name: 'RecruiterCard', re: /^RecruiterCard-.*\.js$/, max: 4, now: 1.7 },
    { name: 'AboutSite', re: /^AboutSite-.*\.js$/, max: 5, now: 3.6 },
    { name: 'Career', re: /^Career-.*\.js$/, max: 3, now: 1.1 },
  ],
  /** raw KB (images are already compressed) */
  files: [
    { name: 'mascot sprite sheet', re: /^mascot-[\w-]+\.png$/, max: 46, now: 37.7 },
    { name: 'room scene sheet', re: /^scene-[\w-]+\.png$/, max: 30, now: 7.4 },
  ],
  /** any other lazy script */
  anyLazyChunk: 45,
};

const gz = (file) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length / 1024;
const kb = (n) => n.toFixed(1).padStart(6) + ' KB';

let failed = false;
const check = (label, value, max, now) => {
  const bad = value > max;
  if (bad) failed = true;
  console.log(`${bad ? '✗' : '✓'} ${label.padEnd(24)} ${kb(value)}  (budget ${max}${now ? `, was ${now}` : ''})`);
};

let html;
try {
  html = readFileSync(join(DIST, 'index.html'), 'utf8');
} catch {
  console.error(`No build found in ${DIST}. Run "npm run build:new" first.`);
  process.exit(2);
}

// the files index.html asks for before anything is drawn
const critical = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1].slice(1));
const criticalNames = new Set(critical.map((f) => f.replace('assets/', '')));
const total = critical.reduce((sum, f) => sum + gz(f), 0);
console.log('First paint:');
for (const f of critical) console.log(`    ${f.replace('assets/', '').padEnd(34)} ${kb(gz(f))}`);
check('first paint, total', total, BUDGETS.criticalPath.max, BUDGETS.criticalPath.now);

console.log('\nLazy chunks:');
const assets = readdirSync(join(DIST, 'assets'));
for (const b of BUDGETS.chunks) {
  const file = assets.find((f) => b.re.test(f));
  if (file) check(b.name, gz(`assets/${file}`), b.max, b.now);
  else console.log(`- ${b.name.padEnd(24)} (not in this build)`);
}
for (const f of assets.filter((n) => /\.js$/.test(n) && !criticalNames.has(n))) {
  const size = gz(`assets/${f}`);
  if (size > BUDGETS.anyLazyChunk && !BUDGETS.chunks.some((b) => b.re.test(f))) check(f, size, BUDGETS.anyLazyChunk);
}

console.log('\nImages:');
for (const b of BUDGETS.files) {
  const file = assets.find((f) => b.re.test(f));
  if (file) check(b.name, statSync(join(DIST, 'assets', file)).size / 1024, b.max, b.now);
}

console.log(failed ? '\nOVER BUDGET' : '\nWithin budget');
process.exit(failed ? 1 : 0);
