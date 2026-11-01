/**
 * One-off commands for the twin, sent from the terminal (`pet say`, `pet do`, `pet go`).
 * Lazy: loaded the first time a command arrives.
 */
import { useStore } from '../../os/store';
import { getLang } from '../../os/i18n';
import { t } from '../../os/i18n/full';
import { SPRITE_ANIMS } from '../../assets/sprites/mascot.meta';
import type { SpriteAnim } from '../mascot/Sprite';
import type { PetApi } from './control/types';
import type { PetScript } from './petEvents';
import { behaviorFor } from './control/moves';
import { markSeen } from './control/seen';
import { enterNode, type EnterCtx } from './control/enter';
import { hopDown, sleep } from './moveKit';

export async function runPetScript(api: PetApi, s: PetScript): Promise<void> {
  if (s.kind === 'say') {
    api.say(s.text, 5200);
    return;
  }
  const interrupted = () => {
    const p = api.get();
    return p.busy || p.controlled;
  };

  if (s.kind === 'do') {
    if (!(s.anim in SPRITE_ANIMS)) return;
    const a = s.anim as SpriteAnim;
    const b = behaviorFor(a);
    api.lock(true);
    try {
      api.set({ anim: a, fx: b?.fx ?? 'none' });
      markSeen(a);
      const dwell = b && b.duration[1] > 0 ? (b.duration[0] + b.duration[1]) / 2 : 2600;
      await sleep(Math.min(5200, Math.max(2000, dwell)));
    } finally {
      if (!interrupted()) api.set({ anim: 'idle', fx: 'none' });
      api.lock(false);
    }
    return;
  }

  // go: run to a desktop icon and hop into it, the way E does in control mode
  const node = useStore.getState().nodes[s.target];
  const el = document.querySelector<HTMLElement>(`.desktop-icon[data-node-id="${CSS.escape(s.target)}"]`);
  if (!node || !el) {
    api.say(getLang() === 'tr' ? 'Onu masaüstünde göremiyorum.' : "I can't see that on the desktop.", 3400);
    return;
  }
  api.lock(true);
  try {
    const ctx: EnterCtx = {
      api,
      pose: () => {
        const p = api.get();
        return { x: p.x, gy: p.gy, facing: p.facing };
      },
      place: () => {},
      alive: () => !interrupted(),
      t,
    };
    const res = await enterNode(ctx, node, el.getBoundingClientRect());
    const perch = res.perch;
    if (perch && !interrupted()) {
      // sit on the window's title bar for a while, then hop back down
      const until = performance.now() + 7000;
      while (!interrupted() && performance.now() < until && useStore.getState().windows.some((w) => w.id === perch.winId && w.state === 'normal')) {
        await sleep(250);
      }
      await hopDown(api, () => !interrupted());
    }
  } finally {
    api.set({ vis: { scale: 1, opacity: 1 } });
    if (!interrupted() && api.world().kind === 'desktop') api.set({ anim: 'idle', fx: 'none', gy: 0, jy: 0 });
    api.lock(false);
  }
}
