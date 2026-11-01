/**
 * Things the twin does on its own that involve the desktop itself (not just walking along the
 * taskbar): leaping onto the title bar of an open window to sit there for a while, and sneaking into
 * a desktop icon to have a look. Loaded on demand, run as a script that pauses the twin's regular
 * behaviour loop, and given up the moment the visitor grabs the twin, opens its menu or takes control.
 */
import { useStore } from '../../os/store';
import { getLang } from '../../os/i18n';
import type { PetApi } from './control/types';
import { anim } from './control/moves';
import { ease, easeOutBack, flashIcon, frames, lerp, sleep } from './control/enter';

const A_SIT = anim('sit', 'idle');

const LINES = {
  perch: {
    en: ['Nice window. I like the view from up here.', 'Best seat in the house.', 'Do not mind me. I am just supervising.', 'This title bar fits me perfectly.'],
    tr: ['Güzel pencere. Buradan manzara harika.', 'Evin en iyi koltuğu.', 'Aldırma bana. Sadece denetliyorum.', 'Bu başlık çubuğu bana tam oldu.'],
  },
  visit: {
    en: ['I did not open anything. I just looked.', 'Cozy in there. A bit dusty.', 'Nothing to see here. Move along.', 'Checked: it is still a folder.'],
    tr: ['Hiçbir şey açmadım. Sadece baktım.', 'İçerisi rahat. Biraz tozlu.', 'Burada görülecek bir şey yok.', 'Kontrol ettim: hâlâ bir klasör.'],
  },
} as const;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const line = (kind: keyof typeof LINES) => pick(LINES[kind][getLang()]);

/** The visitor took over (grabbed the twin, opened its menu, or is driving it): stop whatever this was. */
const interrupted = (api: PetApi) => {
  const p = api.get();
  return p.busy || p.controlled;
};

/** An open window whose title bar the twin can reach and sit on. */
function pickWindow(api: PetApi): string | null {
  const { windows, focusedWindowId } = useStore.getState();
  const vh = window.innerHeight;
  const room = api.H - api.FEET + 12;
  const ok = windows.filter(
    (w) => w.state === 'normal' && Date.now() - (w.createdAt ?? 0) > 2500 && w.bounds.y > room && w.bounds.y < vh - api.TASKBAR - 90 && w.bounds.width > 260
  );
  if (!ok.length) return null;
  const top = ok.find((w) => w.id === focusedWindowId);
  return (top ?? pick(ok)).id;
}

/** A desktop icon in plain sight (not under a window). */
function pickIcon(): HTMLElement | null {
  const visible = [...document.querySelectorAll<HTMLElement>('.desktop-icon[data-node-id]')].filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.top < 40 || r.bottom > window.innerHeight - 60) return false;
    const top = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((n) => !n.closest('.pet'));
    return !!top && el.contains(top);
  });
  return visible.length ? pick(visible) : null;
}

async function perch(api: PetApi, winId: string) {
  const { W, H, FEET, TASKBAR } = api;
  const vh = window.innerHeight;
  const maxGy = Math.max(0, vh - TASKBAR - (H - FEET) - 4);
  const barRect = () => {
    const w = useStore.getState().windows.find((x) => x.id === winId);
    const el = document.querySelector<HTMLElement>(`[data-window-id="${winId}"]`);
    return w && el && w.state === 'normal' ? el.getBoundingClientRect() : null;
  };
  const r0 = barRect();
  if (!r0) return;
  const dx = clamp(rand(80, r0.width - 80), 40, Math.max(40, r0.width - 40));
  const spot = (r: DOMRect) => ({ x: r.left + dx - W / 2, gy: clamp(vh - TASKBAR - (r.top + 3), 0, maxGy) });
  let finishedOnBar = false;

  // 1. get under the window
  const from = api.get();
  const to = spot(r0);
  const dist = Math.abs(to.x - from.x);
  const dir: 1 | -1 = to.x >= from.x ? 1 : -1;
  api.set({ anim: dist > 500 ? 'run' : 'walk', facing: dir, fx: 'none' });
  await frames((dist / (dist > 500 ? 280 : 130)) * 1000, (k) => api.set({ x: lerp(from.x, to.x, k), gy: from.gy, jy: 0, facing: dir }), () => !interrupted(api));
  if (interrupted(api)) return;

  // 2. the leap
  const r1 = barRect();
  if (!r1) return;
  const land = spot(r1);
  api.set({ anim: 'jump' });
  await frames(
    720,
    (k) => {
      const e = ease(k);
      api.set({ x: lerp(to.x, land.x, e), gy: lerp(from.gy, land.gy, e) + Math.sin(k * Math.PI) * 70, jy: 0 });
    },
    () => !interrupted(api)
  );
  if (interrupted(api)) return;

  // 3. sit there, riding along with the window
  finishedOnBar = true;
  api.set({ anim: A_SIT, facing: 1 });
  api.say(line('perch'), 4200);
  const until = performance.now() + rand(9000, 15000);
  await new Promise<void>((resolve) => {
    const step = () => {
      const r = barRect();
      const frontmost = useStore.getState().focusedWindowId === winId;
      if (interrupted(api) || !r || !frontmost || performance.now() > until) return resolve();
      const s = spot(r);
      api.set({ x: s.x, gy: s.gy });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  if (interrupted(api)) return;

  // 4. hop back down to the taskbar
  const cur = api.get();
  const off = rand(-160, 160);
  api.set({ anim: 'jump' });
  await frames(
    620,
    (k) => api.set({ x: cur.x + off * k, gy: lerp(cur.gy, 0, k * k) + Math.sin(k * Math.PI) * 30, jy: 0 }),
    () => !interrupted(api)
  );
  void finishedOnBar;
}

async function visit(api: PetApi, icon: HTMLElement) {
  const { W, H, FEET, TASKBAR } = api;
  const vh = window.innerHeight;
  const maxGy = Math.max(0, vh - TASKBAR - (H - FEET) - 4);
  const rect = icon.getBoundingClientRect();
  const destX = rect.left + rect.width / 2 - W / 2;
  const destGy = clamp(vh - TASKBAR - (rect.bottom + 6), 0, maxGy);
  const intoGy = clamp(vh - TASKBAR - (rect.top + rect.height * 0.5), 0, maxGy);
  const show = (scale: number, opacity: number) => api.set({ vis: { scale, opacity } });

  // run up to it
  const from = api.get();
  const dist = Math.hypot(destX - from.x, destGy - from.gy);
  const dir: 1 | -1 = destX >= from.x ? 1 : -1;
  api.set({ anim: 'run', facing: dir, fx: 'none' });
  await frames((dist / 300) * 1000, (k) => api.set({ x: lerp(from.x, destX, k), gy: lerp(from.gy, destGy, k), jy: 0, facing: dir }), () => !interrupted(api));
  if (interrupted(api)) return;

  // hop in
  api.set({ anim: 'jump' });
  await frames(
    420,
    (k) => {
      const e = ease(k);
      api.set({ gy: lerp(destGy, intoGy, e), jy: Math.sin(k * Math.PI) * 26 });
      show(1 - 0.88 * e, 1 - 0.95 * e);
    },
    () => !interrupted(api)
  );
  show(0.12, 0);
  api.set({ jy: 0 });
  flashIcon(icon.dataset.nodeId ?? '');
  await sleep(rand(1100, 2000));
  if (interrupted(api)) return;

  // out again, with a comment, and back down to the taskbar
  api.set({ anim: 'wave', gy: intoGy });
  await frames(320, (k) => show(lerp(0.12, 1, easeOutBack(k)), Math.min(1, k * 2.5)), () => !interrupted(api));
  show(1, 1);
  api.say(line('visit'), 3800);
  await sleep(1300);
  if (interrupted(api)) return;
  api.set({ anim: 'jump' });
  await frames(560, (k) => api.set({ gy: lerp(intoGy, 0, k * k), jy: Math.sin(k * Math.PI) * 18 }), () => !interrupted(api));
}

/** Pick one of the above that is possible right now and run it. Resolves when it is over (or given up). */
export async function runAutonomy(api: PetApi): Promise<void> {
  if (interrupted(api)) return;
  const winId = pickWindow(api);
  const icon = pickIcon();
  const kind = winId && icon ? (Math.random() < 0.6 ? 'perch' : 'visit') : winId ? 'perch' : icon ? 'visit' : null;
  if (!kind) return;
  api.lock(true);
  try {
    if (kind === 'perch' && winId) await perch(api, winId);
    else if (icon) await visit(api, icon);
  } catch (e) {
    console.warn('[pet]', e);
  } finally {
    // put it back on the taskbar unless somebody else has taken over meanwhile
    if (!interrupted(api)) api.set({ anim: 'idle', fx: 'none', gy: 0, jy: 0, vis: { scale: 1, opacity: 1 } });
    else api.set({ vis: { scale: 1, opacity: 1 } });
    api.lock(false);
  }
}
