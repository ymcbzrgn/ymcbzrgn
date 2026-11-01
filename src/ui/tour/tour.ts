/**
 * The guided tour: the pixel twin shows the visitor around. It runs to the widget, hops into the CV,
 * the projects and the games, sits on the terminal, points at the links, and every step is also
 * written in the panel at the bottom (TourHud). "Next" cuts the current step short, "Stop" / Esc ends
 * the tour, and grabbing the twin or taking its controls does too.
 *
 * Everything it opens it closes again before moving on.
 */
import { useStore } from '../../os/store';
import { getLang } from '../../os/i18n';
import { t as tr } from '../../os/i18n/full';
import { unlock } from '../../os/achievements';
import { sfx } from '../../os/sound/sfx';
import { useRoomStore } from '../rooms/roomStore';
import type { PetApi } from '../pet/control/types';
import { anim } from '../pet/control/moves';
import { enterNode, type EnterCtx } from '../pet/control/enter';
import { clamp, hopDown, runTo, sleep } from '../pet/moveKit';
import { requestPetControl } from '../pet/petEvents';
import { useTourStore } from './tourStore';

type Text = { en: string; tr: string };

interface Step {
  icon: string;
  title: Text;
  say: Text | (() => Text);
  run(c: Ctx): Promise<void>;
}

interface Ctx {
  api: PetApi;
  /** false once the step was cut short, the tour stopped or somebody took the twin */
  alive(): boolean;
  pause(ms: number): Promise<void>;
  /** desktop icon of a node, if it is visible */
  icon(nodeId: string): HTMLElement | null;
  /** hop into a node's desktop icon (opens its window; a folder or the projects window takes the twin into its room) */
  enter(nodeId: string): Promise<void>;
  say(text: string, ms?: number): void;
}

const pickText = (x: Text) => x[getLang()];

const STEPS: Step[] = [
  {
    icon: '👋',
    title: { en: 'Welcome', tr: 'Hoş geldin' },
    say: { en: "Hi! I'm Yamaç's pixel twin. Let me show you around. Space: next, Esc: stop.", tr: "Selam! Ben Yamaç'ın piksel ikiziyim. Sana etrafı göstereyim. Space: ileri, Esc: bitir." },
    async run({ api, alive, pause }) {
      api.set({ anim: 'wave', fx: 'none' });
      if (alive()) await pause(4200);
    },
  },
  {
    icon: '🧑‍💻',
    title: { en: 'Who', tr: 'Kim' },
    say: () => ({
      en: `This is Yamaç. ${tr('currentRole')}. ${tr('tagline')}.`,
      tr: `Bu Yamaç. ${tr('currentRole')}. ${tr('tagline')}.`,
    }),
    async run({ api, alive, pause }) {
      const card = document.querySelector<HTMLElement>('.desktop-widget');
      const r = card?.getBoundingClientRect();
      if (r && r.width > 0) {
        const vh = window.innerHeight;
        const maxGy = Math.max(0, vh - api.TASKBAR - (api.H - api.FEET) - 4);
        // stand just under the card, to its left, pointing at it
        await runTo(api, clamp(r.left + 20 - api.W / 2, 0, window.innerWidth - api.W), clamp(vh - api.TASKBAR - (r.bottom + 10), 0, maxGy), alive);
      }
      if (!alive()) return;
      api.set({ anim: anim('point', 'wave'), facing: 1, fx: 'none' });
      await pause(5200);
    },
  },
  {
    icon: '📄',
    title: { en: 'CV', tr: 'Özgeçmiş' },
    say: { en: 'His CV. One page, always the latest version.', tr: 'Özgeçmişi. Tek sayfa, her zaman güncel.' },
    async run({ enter, pause, alive }) {
      await enter('cv-pdf');
      if (alive()) await pause(5200);
    },
  },
  {
    icon: '🚀',
    title: { en: 'Projects', tr: 'Projeler' },
    say: {
      en: 'The workshop. Every crate is a repo and its colour is the language. Press E on one to open it.',
      tr: 'Atölye. Her sandık bir repo, rengi de dili. Birine E ile bastığında açılır.',
    },
    async run({ enter, pause, alive }) {
      await enter('projects');
      if (alive()) await pause(6200);
    },
  },
  {
    icon: '🕹️',
    title: { en: 'Arcade', tr: 'Oyun salonu' },
    say: {
      en: 'The arcade: Snake, Tetris, 2048 and Minesweeper. Those machines really work.',
      tr: 'Oyun salonu: Snake, Tetris, 2048 ve Mayın Tarlası. Bu makineler gerçekten çalışıyor.',
    },
    async run({ enter, pause, alive, say }) {
      await enter('games');
      if (!alive()) return;
      await pause(3600);
      const room = useRoomStore.getState();
      if (alive() && room.host && room.runner) {
        say(getLang() === 'tr' ? 'Bir tur Snake?' : 'A quick round of Snake?', 2400);
        await room.runner.use('snake-game');
        if (alive()) await pause(3200);
      }
    },
  },
  {
    icon: '🖥️',
    title: { en: 'Terminal', tr: 'Terminal' },
    say: {
      en: 'A real little shell. Try help, neofetch, or pet go games.',
      tr: 'Gerçek bir mini kabuk. help, neofetch ya da pet go games dene.',
    },
    async run({ enter, pause, alive }) {
      await enter('terminal-app');
      if (alive()) await pause(5600);
    },
  },
  {
    icon: '🔗',
    title: { en: 'Links', tr: 'Bağlantılar' },
    say: {
      en: "Find him on LinkedIn and GitHub, or press Ctrl K and type 'email'.",
      tr: "Onu LinkedIn ve GitHub'da bulabilirsin ya da Ctrl K'ya basıp 'email' yaz.",
    },
    async run({ api, alive, pause, icon }) {
      const el = icon('linkedin-link') ?? icon('github-link');
      const r = el?.getBoundingClientRect();
      if (r) {
        const vh = window.innerHeight;
        const maxGy = Math.max(0, vh - api.TASKBAR - (api.H - api.FEET) - 4);
        await runTo(api, clamp(r.left + r.width / 2 - api.W / 2, 0, window.innerWidth - api.W), clamp(vh - api.TASKBAR - (r.bottom + 6), 0, maxGy), alive);
      }
      if (!alive()) return;
      api.set({ anim: anim('point', 'wave'), fx: 'none' });
      await pause(5200);
    },
  },
];

/** Resolves true when the visitor saw the whole tour, false when it was stopped or interrupted. */
export async function runTour(api: PetApi): Promise<boolean> {
  const store = useTourStore;
  if (store.getState().active) return false;
  const lang = getLang();
  store.getState().begin(STEPS.length);
  api.lock(true);

  // windows that were open before a step started stay; whatever the step opened is closed after it
  let baseline = new Set(useStore.getState().windows.map((w) => w.id));
  const interrupted = () => store.getState().stopped || api.get().busy || api.get().controlled;
  let stepNudge = 0;
  const alive = () => !interrupted() && store.getState().nudge === stepNudge;

  const pause = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = window.setTimeout(done, ms);
      const unsub = store.subscribe(() => {
        if (!alive()) done();
      });
      function done() {
        window.clearTimeout(timer);
        unsub();
        resolve();
      }
    });

  const icon = (nodeId: string) => document.querySelector<HTMLElement>(`.desktop-icon[data-node-id="${CSS.escape(nodeId)}"]`);

  const closeOpened = () => {
    const st = useStore.getState();
    for (const w of st.windows) if (!baseline.has(w.id)) st.closeWindow(w.id);
  };

  const enter = async (nodeId: string) => {
    const el = icon(nodeId);
    const node = useStore.getState().nodes[nodeId];
    if (!el || !node) return;
    const ctx: EnterCtx = {
      api,
      pose: () => {
        const p = api.get();
        return { x: p.x, gy: p.gy, facing: p.facing };
      },
      place: () => {},
      alive,
      t: tr,
    };
    await enterNode(ctx, node, el.getBoundingClientRect());
  };

  const ctx: Ctx = {
    api,
    alive,
    pause,
    icon,
    enter,
    say: (text, ms) => api.say(text, ms),
  };

  let completed = false;
  try {
    for (let i = 0; i < STEPS.length; i += 1) {
      if (interrupted()) break;
      const step = STEPS[i];
      stepNudge = store.getState().nudge;
      baseline = new Set(useStore.getState().windows.map((w) => w.id));
      const text = pickText(typeof step.say === 'function' ? step.say() : step.say);
      store.getState().show(i, step.icon, step.title[lang], text);
      sfx('bell');
      api.say(text, 6500);
      try {
        await step.run(ctx);
      } catch (e) {
        console.warn('[tour]', e);
      }
      closeOpened();
      // whatever happened, the twin goes back down to the taskbar between steps
      if (!interrupted()) {
        api.set({ vis: { scale: 1, opacity: 1 } });
        await hopDown(api, () => !interrupted());
        await sleep(250);
      }
    }
    completed = !interrupted();

    if (completed) {
      unlock('tour');
      sfx('celebrate');
      const end = lang === 'tr' ? 'Tur bu kadar! Biraz da beni sürmek ister misin?' : "That's the tour! Want to drive me for a bit?";
      store.getState().show(STEPS.length - 1, '🎉', lang === 'tr' ? 'Tur bitti' : 'That was it', end);
      store.getState().finish();
      api.say(end, 9000);
      api.set({ anim: anim('celebrate', 'wave'), fx: 'hop' });
      // wait for a choice (or give up after a while)
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(done, 14000);
        const unsub = store.subscribe((s) => {
          if (s.choice || s.stopped) done();
        });
        function done() {
          window.clearTimeout(timer);
          unsub();
          resolve();
        }
      });
    }
  } finally {
    closeOpened();
    const choice = store.getState().choice;
    store.getState().end();
    api.set({ vis: { scale: 1, opacity: 1 }, fx: 'none' });
    if (!api.get().controlled) await hopDown(api, () => !api.get().busy);
    if (!api.get().busy && !api.get().controlled) api.set({ anim: 'idle', fx: 'none', gy: 0, jy: 0 });
    api.lock(false);
    if (choice === 'drive' && completed) requestPetControl();
  }
  return completed;
}
