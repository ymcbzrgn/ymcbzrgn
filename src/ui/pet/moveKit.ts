/**
 * Scripted moves shared by the guided tour and the terminal's `pet` command: run somewhere on the
 * desktop plane, hop back down to the taskbar. They only talk to the twin through PetApi.
 */
import type { PetApi } from './control/types';
import { frames, lerp } from './control/enter';

export { sleep } from './control/enter';
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export async function runTo(api: PetApi, x: number, gy: number, alive: () => boolean) {
  const from = api.get();
  const dist = Math.hypot(x - from.x, gy - from.gy);
  if (dist < 12) return;
  const dir: 1 | -1 = x >= from.x ? 1 : -1;
  const fast = dist > 360;
  api.set({ anim: fast ? 'run' : 'walk', facing: dir, fx: 'none', jy: 0 });
  await frames((dist / (fast ? 330 : 170)) * 1000, (k) => api.set({ x: lerp(from.x, x, k), gy: lerp(from.gy, gy, k), jy: 0, facing: dir }), alive);
}

/** Hop down to the taskbar from wherever it is. */
export async function hopDown(api: PetApi, alive: () => boolean) {
  const cur = api.get();
  if (cur.gy < 3) return;
  api.set({ anim: 'jump', fx: 'none' });
  await frames(560, (k) => api.set({ x: cur.x, gy: lerp(cur.gy, 0, k * k), jy: Math.sin(k * Math.PI) * 24 }), alive);
  api.set({ jy: 0, gy: 0 });
}
