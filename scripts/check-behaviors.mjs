#!/usr/bin/env node
/**
 * Sanity check of the pixel twin's generated behaviour table (src/assets/sprites/mascot.behaviors.ts):
 * every animation of the sprite sheet is used by some behaviour, shows up in the calm tier as well,
 * there is enough to say in both languages, and no single behaviour dominates.
 *
 *   npm run check:behaviors
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../src/assets/sprites/', import.meta.url));
const meta = readFileSync(`${dir}mascot.meta.ts`, 'utf8');
const anims = [...meta.matchAll(/^\s+(\w+): \{ row: (\d+), frames: (\d+), fps/gm)].map((m) => m[1]);
const src = readFileSync(`${dir}mascot.behaviors.ts`, 'utf8');
const start = src.indexOf('BEHAVIORS: readonly Behavior[] =');
const body = src.slice(src.indexOf('[', start), src.lastIndexOf(']') + 1);
const B = new Function('return ' + body)();

// animations the engines play themselves (the entrance run, waving hello, being dragged, walking in rooms ...)
const ENGINE_SPECIAL = new Set(['run', 'wave', 'drag', 'walkUp', 'walkDown', 'carryIdle', 'carryWalk', 'pickup', 'putdown', 'knock', 'arcade']);

const calm = new Set();
const any = new Set();
for (const b of B) {
  any.add(b.anim);
  if (b.arrive) any.add(b.arrive);
  if (b.weight[0] > 0) {
    calm.add(b.anim);
    if (b.arrive) calm.add(b.arrive);
  }
}
const notUsed = anims.filter((a) => !any.has(a) && !ENGINE_SPECIAL.has(a));
const notCalm = anims.filter((a) => any.has(a) && !calm.has(a) && a !== 'sleep');
const lines = (lang) => B.reduce((sum, b) => sum + (b.lines ? b.lines[lang].length : 0), 0);
const tierTotal = [0, 1, 2].map((t) => B.reduce((sum, b) => sum + b.weight[t], 0));
const maxShare = Math.max(...B.map((b) => b.weight[0])) / tierTotal[0];

console.log(`animations: ${anims.length} | behaviours: ${B.length} | speech lines EN ${lines('en')} / TR ${lines('tr')}`);
console.log(`never used by a behaviour: ${notUsed.length ? notUsed.join(', ') : 'none'}`);
console.log(`never in the calm tier:    ${notCalm.length ? notCalm.join(', ') : 'none'}`);
console.log(`most dominant behaviour:   ${(maxShare * 100).toFixed(1)}% of the calm tier`);

const ok = notUsed.length === 0 && notCalm.length === 0 && lines('en') >= 40 && lines('tr') >= 40 && maxShare < 0.12 && B.length >= 50;
console.log(ok ? 'Coverage OK' : 'Coverage incomplete (every animation used, EN/TR >= 40 lines, >= 50 behaviours, no behaviour above 12%)');
process.exit(ok ? 0 : 1);
