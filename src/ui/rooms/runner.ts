/**
 * The twin's "hands" inside a room strip: walks to props, knocks on doors, picks files up and puts
 * them down, opens things. Used both by the control engine (E / F keys) and by plain mouse clicks on
 * the strip, so the twin does the work whether or not it is being driven.
 */
import type { StringKey } from '../../os/i18n/full';
import type { PetApi } from '../pet/control/types';
import { anim } from '../pet/control/moves';
import { SPRITE_ANCHORS, SPRITE_ANIMS } from '../../assets/sprites/mascot.meta';
import { useRoomStore, type RoomRunner, type RoomTarget } from './roomStore';
import type { RoomPropSpec } from './rooms';

export interface LaidOut {
  spec: RoomPropSpec;
  /** centre of the prop in world px */
  x: number;
}

export interface RunnerCtx {
  props(): LaidOut[];
  exit(): LaidOut;
  el(id: string): HTMLElement | null;
  /** show a prop's open sprite (a door opening), or none */
  open(id: string | null): void;
  t(key: StringKey): string;
  /** resolves once the strip has re-rendered after a navigation */
  settled(): Promise<void>;
  /** world x where the twin appears when it comes through the entrance */
  entryX: number;
}

const SPEED = 170; // px/s, a stroll
const REACH = 64; // how close (px) the twin's centre has to be to a prop to use it

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
/** How long an animation takes to play once. */
const lengthOf = (a: string, fallbackMs = 700) => {
  const def = (SPRITE_ANIMS as Record<string, { frames: number; fps: number } | undefined>)[a];
  return def ? Math.round((def.frames / def.fps) * 1000) + 40 : fallbackMs;
};

function frames(ms: number, fn: (k: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now: number) => {
      // the window (and its room) may close mid-walk: the twin is back on the desktop then, leave it alone
      if (!useRoomStore.getState().host) return resolve();
      const k = Math.min(1, ms <= 0 ? 1 : (now - t0) / ms);
      fn(k);
      if (k < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export function createRunner(ctx: RunnerCtx): RoomRunner {
  const store = () => useRoomStore.getState();
  let running = false;

  /** Run one scripted interaction: the twin's own life and the control engine step aside meanwhile. */
  async function script(fn: (api: PetApi) => Promise<void>) {
    const api = store().api;
    if (!api || running) return;
    running = true;
    api.lock(true);
    store().setBusy(true);
    try {
      await fn(api);
    } catch (e) {
      console.warn('[room]', e);
    } finally {
      ctx.open(null);
      store().setBusy(false);
      api.lock(false);
      // (if the room closed meanwhile the twin is already popping in on the desktop: leave that alone)
      api.set({ anim: store().carrying ? anim('carryIdle', 'idle') : 'idle', fx: 'none', ...(store().host ? { vis: { scale: 1, opacity: 1 } } : null) });
      running = false;
    }
  }

  async function walk(api: PetApi, centreX: number) {
    const max = Math.max(0, store().width - api.W);
    const to = clamp(centreX - api.W / 2, 0, max);
    const from = api.get().x;
    const dist = Math.abs(to - from);
    if (dist < 3) return;
    const dir: 1 | -1 = to >= from ? 1 : -1;
    api.set({ anim: store().carrying ? anim('carryWalk', 'walk') : 'walk', facing: dir, fx: 'none' });
    await frames((dist / SPEED) * 1000, (k) => api.set({ x: from + (to - from) * k, gy: 0, jy: 0, facing: dir }));
  }

  /**
   * Walk up to something and stand next to it, facing it. `beside` is the distance between the
   * twin's centre and the middle of the thing; for items to pick up or put down the twin stands so
   * that the floor spot just in front of its toes (where the item lies) is the middle of the thing.
   */
  async function approach(api: PetApi, centreX: number, beside: number) {
    const max = store().width;
    const cur = api.get().x + api.W / 2;
    let side: 1 | -1 = cur <= centreX ? -1 : 1; // which side of it we stand on (-1: left of it, facing right)
    if (centreX + side * beside < api.W / 2 || centreX + side * beside > max - api.W / 2) side = (side * -1) as 1 | -1;
    await walk(api, centreX + side * beside);
    api.set({ facing: (side * -1) as 1 | -1, anim: store().carrying ? anim('carryIdle', 'idle') : 'idle' });
  }
  const toeOffset = (api: PetApi) => (SPRITE_ANCHORS.floor.x - 20) * (api.W / 40); // frame centre -> floor spot, px

  async function fade(api: PetApi, from: number, to: number, ms: number) {
    await frames(ms, (k) => {
      const v = from + (to - from) * k;
      api.set({ vis: { scale: 0.6 + 0.4 * v, opacity: v } });
    });
  }

  async function pick(api: PetApi, item: LaidOut) {
    const c = item.spec.carry;
    if (!c) return;
    if (c.heavy) {
      await approach(api, item.x, toeOffset(api) + 4);
      api.say(ctx.t('roomHeavy'), 2600);
      api.set({ anim: anim('shrug', 'idle') });
      await sleep(900);
      return;
    }
    await approach(api, item.x, toeOffset(api));
    // the item is lifted off the floor: it follows the hands frame by frame (see CarryItem)
    store().setCarrying({ nodeId: c.nodeId, name: item.spec.label, icon: c.item });
    api.set({ anim: anim('pickup', 'idle') });
    await sleep(lengthOf('pickup'));
  }

  /** Put what it carries down at its feet. */
  async function putDown(api: PetApi) {
    api.set({ anim: anim('putdown', 'idle') });
    await sleep(lengthOf('putdown'));
    store().setCarrying(null);
  }

  /** Back to where the carried thing came from, and put it down there. */
  async function dropAtHome(api: PetApi) {
    const carried = store().carrying;
    if (!carried) return;
    const home = ctx.props().find((p) => p.spec.id === carried.nodeId);
    if (home) await approach(api, home.x, toeOffset(api));
    await putDown(api);
  }

  async function useProp(api: PetApi, item: LaidOut) {
    const { spec } = item;
    const carried = store().carrying;

    // carrying something to a door (folder / exit): move it in
    if (carried && spec.accept) {
      await approach(api, item.x, toeOffset(api));
      const result = await spec.accept(carried);
      if (result !== 'moved') {
        api.say(ctx.t(result === 'locked' ? 'roomLocked' : 'roomExists'), 2800);
        api.set({ anim: anim('shrug', 'idle') });
        await sleep(1000);
        return;
      }
      ctx.open(spec.id);
      await putDown(api);
      api.say(ctx.t('roomMoved'), 2400);
      api.set({ anim: anim('celebrate', 'wave') });
      await sleep(1000);
      return;
    }
    // hands full and nothing here takes it: put it back first
    if (carried) await dropAtHome(api);

    await approach(api, item.x, spec.knock ? 42 : 36);
    if (spec.knock) {
      api.set({ anim: anim('knock', 'wave') });
      await sleep(lengthOf('knock', 700));
      ctx.open(spec.id);
      await sleep(280);
      await fade(api, 1, 0, 240);
      await spec.use();
      await ctx.settled();
      if (!store().host) return; // the door led out of the room: the twin is back on the desktop
      // it comes out of the entrance of whatever it just opened
      api.set({ x: ctx.entryX, gy: 0, facing: 1, anim: 'wave' });
      await fade(api, 0, 1, 280);
      return;
    }
    api.set({ anim: anim(spec.anim ?? 'point', 'idle'), fx: 'none' });
    await sleep(spec.secret ? 800 : 700);
    await spec.use();
    if (spec.secret) await sleep(1400);
  }

  const all = () => [...ctx.props(), ctx.exit()];
  const find = (id: string) => all().find((it) => it.spec.id === id);

  const runner: RoomRunner = {
    nearest(worldX) {
      let best: LaidOut | null = null;
      let bestD = REACH;
      for (const it of all()) {
        const d = Math.abs(it.x - worldX);
        if (d < bestD) {
          best = it;
          bestD = d;
        }
      }
      if (!best) return null;
      const item = best;
      const el = ctx.el(item.spec.id);
      if (!el) return null;
      const carried = store().carrying;
      const { spec } = item;
      const name = spec.name ?? spec.label;
      const label =
        carried && spec.accept
          ? `${ctx.t('roomPutIn')} ${name}`
          : spec.exit
            ? spec.label
            : spec.knock
              ? `${ctx.t('roomEnter')} ${name}`
              : spec.secret
                ? ctx.t('roomInspect')
                : `${ctx.t('ctrlOpen')} ${spec.label}`;
      const target: RoomTarget = {
        id: spec.id,
        label,
        extra: carried ? `F ${ctx.t('roomDrop')}` : spec.carry ? `F ${ctx.t('roomCarry')}` : undefined,
        rect: el.getBoundingClientRect(),
        use: () => script((api) => useProp(api, item)),
        carry: () =>
          script(async (api) => {
            if (store().carrying) await dropAtHome(api);
            else await pick(api, item);
          }),
      };
      return target;
    },
    walkTo: (worldX) => script((api) => walk(api, worldX)),
    use: async (id) => {
      const item = find(id);
      if (item) await script((api) => useProp(api, item));
    },
    drop: () => script(async (api) => (store().carrying ? dropAtHome(api) : undefined)),
  };
  return runner;
}
