/**
 * "Entering" a desktop icon: the twin walks up to it, hops into it (shrinking), the icon opens its
 * window, and the twin pops out again on the window's title bar, where it sits for as long as the
 * window stays in front. All of it is a scripted sequence run by the control engine.
 */
import { useStore } from '../../../os/store';
import type { VFSNode } from '../../../os/types';
import { openNodeWindow } from '../../../os/utils/openNode';
import type { StringKey } from '../../../os/i18n/full';
import type { PetApi } from './types';
import { anim } from './moves';

export interface EnterCtx {
  api: PetApi;
  pose(): { x: number; gy: number; facing: 1 | -1 };
  /** Tell the engine where the script left the twin. */
  place(x: number, gy: number, facing?: 1 | -1): void;
  alive(): boolean;
  t(key: StringKey): string;
}

export interface EnterResult {
  /** Keep sitting on this window's title bar, `dx` px from its left edge. */
  perch?: { winId: string; dx: number };
}

const A_SIT = anim('sit', 'idle');
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOutBack = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function frames(ms: number, fn: (k: number) => void, alive: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      if (!alive()) return resolve();
      const k = Math.min(1, (now - t0) / ms);
      fn(k);
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

async function waitFor<T>(find: () => T | null, ms: number): Promise<T | null> {
  const t0 = performance.now();
  for (;;) {
    const v = find();
    if (v) return v;
    if (performance.now() - t0 > ms) return null;
    await sleep(40);
  }
}

function flashIcon(id: string) {
  const el = document.querySelector<HTMLElement>(`.desktop-icon[data-node-id="${CSS.escape(id)}"]`);
  if (!el) return;
  el.classList.add('desktop-icon--opening');
  window.setTimeout(() => el.classList.remove('desktop-icon--opening'), 1000);
}

export async function enterNode(ctx: EnterCtx, node: VFSNode, iconRect: DOMRect): Promise<EnterResult> {
  const { api } = ctx;
  const { W, H, FEET, TASKBAR } = api;
  const vh = window.innerHeight;
  const maxGy = Math.max(0, vh - TASKBAR - (H - FEET) - 4);
  const alive = ctx.alive;
  const show = (scale: number, opacity: number) => api.set({ vis: { scale, opacity } });

  try {
    // 1. walk up to the icon
    const cx = iconRect.left + iconRect.width / 2;
    const destX = cx - W / 2;
    const destGy = clamp(vh - TASKBAR - (iconRect.bottom + 6), 0, maxGy);
    const from = ctx.pose();
    const dist = Math.hypot(destX - from.x, destGy - from.gy);
    if (dist > 14) {
      const dir: 1 | -1 = destX >= from.x ? 1 : -1;
      api.set({ anim: 'run', facing: dir, fx: 'none' });
      await frames(
        (dist / 320) * 1000,
        (k) => {
          const x = lerp(from.x, destX, k);
          const gy = lerp(from.gy, destGy, k);
          ctx.place(x, gy, dir);
          api.set({ x, gy, jy: 0, facing: dir });
        },
        alive
      );
    }
    if (!alive()) return {};

    // 2. hop into the icon
    const intoGy = clamp(vh - TASKBAR - (iconRect.top + iconRect.height * 0.5), 0, maxGy);
    api.set({ anim: 'jump', fx: 'none' });
    await frames(
      420,
      (k) => {
        const e = ease(k);
        const x = lerp(destX, destX, e);
        const gy = lerp(destGy, intoGy, e);
        ctx.place(x, gy);
        api.set({ x, gy, jy: Math.sin(k * Math.PI) * 26 });
        show(1 - 0.88 * e, 1 - 0.95 * e);
      },
      alive
    );
    show(0.12, 0);
    api.set({ jy: 0 });

    // 3. the icon opens its window
    flashIcon(node.id);
    const winId = openNodeWindow(node);
    await sleep(winId ? 160 : 420);
    if (!alive()) return {};

    // 4a. an external link: pop out of the icon again
    if (!winId) {
      api.set({ anim: 'wave', x: destX, gy: destGy });
      ctx.place(destX, destGy);
      await frames(320, (k) => show(lerp(0.12, 1, easeOutBack(k)), clamp(k * 2, 0, 1)), alive);
      show(1, 1);
      return {};
    }

    // 4b. appear on the title bar of the new window
    const bar = await waitFor(() => document.querySelector<HTMLElement>(`[data-window-id="${winId}"] .window__titlebar`), 1500);
    if (!bar || !alive()) return {};
    const r = bar.getBoundingClientRect();
    const dx = Math.min(r.width * 0.28, 170);
    const x = r.left + dx - W / 2;
    const gy = clamp(vh - TASKBAR - (r.top + 3), 0, maxGy);
    ctx.place(x, gy, 1);
    api.set({ x, gy, jy: 0, facing: 1, anim: 'wave' });
    await frames(360, (k) => show(lerp(0.12, 1, easeOutBack(k)), clamp(k * 2.5, 0, 1)), alive);
    show(1, 1);
    api.set({ anim: A_SIT });
    // still on screen and in front? then stay on it
    const w = useStore.getState().windows.find((win) => win.id === winId);
    return w && w.state === 'normal' ? { perch: { winId, dx } } : {};
  } finally {
    show(1, 1);
  }
}
