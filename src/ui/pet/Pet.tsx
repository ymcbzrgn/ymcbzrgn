/**
 * Pet – the pixel twin that lives on the desktop.
 *
 * It runs in from the left edge, waves hello, then gets on with its own life: wandering, running,
 * sitting, reading, typing, drinking coffee, jumping, stretching, and eventually falling asleep when
 * nobody touches the desktop for a while. It drops a helpful tip now and then, can be dragged
 * around, and opens a small menu when clicked.
 *
 * Cost: no render loop. Frames are stepped by a CSS animation, walking is a single CSS transform
 * transition, and behaviours are driven by one timeout at a time.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../os/store';
import { useT, type StringKey } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { openSimpleView } from '../../os/view';
import Sprite, { type SpriteAnim } from '../mascot/Sprite';
import { SPRITE_FRAME_H, SPRITE_FRAME_W } from '../../assets/sprites/mascot.meta';
import './Pet.css';

const SCALE = 3;
const W = SPRITE_FRAME_W * SCALE;
const H = SPRITE_FRAME_H * SCALE;
const TASKBAR = 48;
const EDGE = 8;
const WALK_SPEED = 70; // px/s
const RUN_SPEED = 190; // px/s
const TIP_STORAGE_KEY = 'yb-pet-seen';

type Mode = SpriteAnim;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/* ---------- behaviour table ---------- */
type Weights = [Mode, number][];
const CALM: Weights = [['idle', 24], ['look', 12], ['walk', 28], ['sit', 8], ['coffee', 6], ['read', 4], ['type', 4], ['jump', 6], ['stretch', 3], ['run', 5]];
const BORED: Weights = [['walk', 16], ['run', 10], ['sit', 12], ['read', 12], ['type', 12], ['coffee', 10], ['stretch', 8], ['look', 8], ['jump', 8], ['idle', 4]];
const SLEEPY: Weights = [['sleep', 60], ['sit', 20], ['stretch', 6], ['idle', 8], ['look', 6]];

function pickWeighted(table: Weights, exclude?: Mode): Mode {
  const rows = table.filter(([m]) => m !== exclude);
  const total = rows.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [mode, weight] of rows) {
    r -= weight;
    if (r <= 0) return mode;
  }
  return rows[0][0];
}

const DURATION: Partial<Record<Mode, [number, number]>> = {
  idle: [2500, 6000],
  look: [1800, 2600],
  sit: [4000, 9000],
  read: [6000, 10000],
  type: [6000, 10000],
  coffee: [5500, 8000],
  jump: [900, 900],
  stretch: [2800, 2800],
  wave: [2800, 2800],
};

/* ---------- tips ---------- */
interface TipContext {
  apps: Set<string>;
  iconHintSeen: boolean;
}
interface Tip {
  id: string;
  key: StringKey;
  when?: (c: TipContext) => boolean;
}
const TIPS: Tip[] = [
  { id: 'double', key: 'petTipDouble', when: (c) => !c.iconHintSeen },
  { id: 'terminal', key: 'petTipTerminal', when: (c) => !c.apps.has('terminal-app') },
  { id: 'cv', key: 'petTipCv', when: (c) => !c.apps.has('pdf-viewer') },
  { id: 'drag', key: 'petTipDrag' },
  { id: 'games', key: 'petTipGames', when: (c) => ![...c.apps].some((a) => a.endsWith('-game')) },
  { id: 'simple', key: 'petTipSimple' },
  { id: 'wallpaper', key: 'petTipWallpaper', when: (c) => !c.apps.has('settings-app') },
];

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(TIP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}
function writeSeen(seen: string[]) {
  try {
    localStorage.setItem(TIP_STORAGE_KEY, JSON.stringify(seen));
  } catch {
    /* storage unavailable: tips just repeat next visit */
  }
}

/* ---------- component ---------- */
export default function Pet() {
  const t = useT();
  const launch = useLaunch();
  const onboarded = useStore((s) => s.settings.onboarded);

  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const [mode, setMode] = useState<Mode>('idle');
  const [x, setX] = useState(-W - 24); // starts off-screen, runs in
  const [y, setY] = useState(0);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [travelMs, setTravelMs] = useState(0);
  const [fall, setFall] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; id: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vw, setVw] = useState(() => window.innerWidth);

  // Mutable engine state (kept out of React state: it changes without needing a render)
  const xRef = useRef(-W - 24);
  const modeRef = useRef<Mode>('idle');
  const draggingRef = useRef(false);
  const menuRef = useRef(false);
  const aliveRef = useRef(true);
  const timerRef = useRef(0);
  const bubbleTimerRef = useRef(0);
  const tipTimerRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const bubbleIdRef = useRef(0);
  const appsRef = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);

  const floorMax = useCallback(() => Math.max(EDGE, window.innerWidth - W - EDGE), []);

  /* ----- helpers ----- */
  const say = useCallback((text: string, ms = 4200) => {
    window.clearTimeout(bubbleTimerRef.current);
    bubbleIdRef.current += 1;
    setBubble({ text, id: bubbleIdRef.current });
    bubbleTimerRef.current = window.setTimeout(() => setBubble(null), ms);
  }, []);

  const enter = useCallback((m: Mode) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(fn, ms);
  }, []);

  /* ----- behaviour loop ----- */
  const next = useCallback(() => {
    if (!aliveRef.current) return;
    // Busy being dragged / talked to: check again shortly
    if (draggingRef.current || menuRef.current) {
      schedule(next, 800);
      return;
    }

    const idleFor = (Date.now() - lastActivityRef.current) / 1000;
    const table = idleFor > 60 ? SLEEPY : idleFor > 20 ? BORED : CALM;
    const choice = pickWeighted(table, modeRef.current);

    switch (choice) {
      case 'walk':
      case 'run': {
        const max = floorMax();
        let target = rand(EDGE, max);
        // Make the trip worth it
        if (Math.abs(target - xRef.current) < 140) target = xRef.current < max / 2 ? rand(max * 0.55, max) : rand(EDGE, max * 0.45);
        const dist = Math.abs(target - xRef.current);
        const ms = (dist / (choice === 'run' ? RUN_SPEED : WALK_SPEED)) * 1000;
        setFacing(target > xRef.current ? 1 : -1);
        setTravelMs(ms);
        xRef.current = target;
        setX(target);
        enter(choice);
        schedule(next, ms + 80);
        return;
      }
      case 'sleep': {
        enter('sleep');
        say(t('petSleepy'), 2600);
        // Sleep until somebody moves the mouse or presses a key
        const watch = () => {
          if (!aliveRef.current) return;
          if (Date.now() - lastActivityRef.current < 2500) {
            enter('stretch');
            schedule(next, 2800);
          } else {
            schedule(watch, 1000);
          }
        };
        schedule(watch, 1500);
        return;
      }
      default: {
        enter(choice);
        if (choice === 'jump' && Math.random() < 0.5) say(t('petJump'), 1800);
        if (choice === 'coffee' && Math.random() < 0.4) say(t('petBoredB'));
        if (choice === 'read' && Math.random() < 0.4) say(t('petBoredC'));
        if (choice === 'type' && Math.random() < 0.4) say(t('petBoredD'));
        if (choice === 'idle' && idleFor > 20 && Math.random() < 0.4) say(t('petBoredA'));
        const [min, max] = DURATION[choice] ?? [2500, 5000];
        schedule(next, rand(min, max));
      }
    }
  }, [enter, floorMax, say, schedule, t]);

  /* ----- start: run in from the left, wave, then live ----- */
  useEffect(() => {
    aliveRef.current = true;

    // First visit: let the welcome window have the stage; otherwise enter right away.
    const delay = onboarded ? 1200 : 9000;
    const starter = window.setTimeout(() => {
      if (reducedMotion.current) {
        // No wandering: park the twin in a corner and keep it clickable
        xRef.current = floorMax() - 16;
        setTravelMs(0);
        setX(xRef.current);
        enter('idle');
        return;
      }
      const target = Math.min(floorMax(), 72);
      const ms = ((target - xRef.current) / RUN_SPEED) * 1000;
      setFacing(1);
      setTravelMs(ms);
      xRef.current = target;
      setX(target);
      enter('run');
      schedule(() => {
        setTravelMs(0);
        enter('wave');
        const seen = readSeen();
        if (!seen.includes('hello')) {
          say(t('petHello'), 4800);
          writeSeen([...seen, 'hello']);
        }
        schedule(next, 3000);
      }, ms + 80);
    }, delay);

    return () => {
      aliveRef.current = false;
      window.clearTimeout(starter);
      window.clearTimeout(timerRef.current);
    };
    // The loop must only restart when onboarding state flips, not on every re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded]);

  /* ----- track activity, opened apps, window size ----- */
  useEffect(() => {
    const touch = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    appsRef.current = new Set(useStore.getState().windows.map((w) => w.appId));
    const unsub = useStore.subscribe((state, prev) => {
      if (state.windows !== prev.windows) state.windows.forEach((w) => appsRef.current.add(w.appId));
    });

    const onResize = () => {
      setVw(window.innerWidth);
      const max = floorMax();
      if (xRef.current > max) {
        xRef.current = max;
        setTravelMs(0);
        setX(max);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      window.removeEventListener('resize', onResize);
      unsub();
    };
  }, [floorMax]);

  /* ----- tips ----- */
  useEffect(() => {
    const tryTip = () => {
      if (!aliveRef.current) return;
      const busy = draggingRef.current || menuRef.current || modeRef.current === 'sleep' || modeRef.current === 'drag';
      if (!busy) {
        const seen = readSeen();
        const ctx: TipContext = { apps: appsRef.current, iconHintSeen: !!useStore.getState().settings.iconHintSeen };
        const tip = TIPS.find((c) => !seen.includes(c.id) && (!c.when || c.when(ctx)));
        if (tip) {
          say(t(tip.key), 5200);
          writeSeen([...seen, tip.id]);
        }
      }
      tipTimerRef.current = window.setTimeout(tryTip, rand(28000, 45000));
    };
    // First tip comes a little after the entrance
    tipTimerRef.current = window.setTimeout(tryTip, onboarded ? 14000 : 24000);
    return () => window.clearTimeout(tipTimerRef.current);
  }, [onboarded, say, t]);

  /* ----- pointer: click opens the menu, drag picks the twin up ----- */
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean; offX: number; offY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    const rect = bodyRef.current?.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      offX: rect ? e.clientX - rect.left : W / 2,
      offY: rect ? e.clientY - rect.top : 12,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) {
      d.moved = true;
      draggingRef.current = true;
      window.clearTimeout(timerRef.current);
      setMenuOpen(false);
      menuRef.current = false;
      setFall(false);
      enter('drag');
    }
    if (d.moved) {
      const left = Math.min(Math.max(e.clientX - d.offX, 0), window.innerWidth - W);
      const bottom = e.clientY - d.offY + H; // sprite bottom edge in viewport coords
      xRef.current = left;
      setTravelMs(0);
      setX(left);
      setY(Math.max(0, window.innerHeight - TASKBAR - bottom));
      setFacing(1);
    }
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (!d.moved) {
      // A click: toggle the menu
      const open = !menuRef.current;
      menuRef.current = open;
      setMenuOpen(open);
      if (open) {
        setBubble(null);
        enter('wave');
      } else {
        enter('idle');
        schedule(next, 1500);
      }
      return;
    }
    // Dropped: fall to the floor, land, carry on
    draggingRef.current = false;
    setFall(true);
    setY(0);
    enter('jump');
    if (Math.random() < 0.5) say(t('petJump'), 1800);
    schedule(() => {
      setFall(false);
      enter('idle');
      schedule(next, 1200);
    }, 700);
  };

  /* ----- menu ----- */
  const closeMenu = useCallback(() => {
    menuRef.current = false;
    setMenuOpen(false);
    enter('idle');
    schedule(next, 1200);
  }, [enter, next, schedule]);

  // Close on outside click / Escape / after a while
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.pet')) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const auto = window.setTimeout(closeMenu, 12000);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(auto);
    };
  }, [menuOpen, closeMenu]);

  const act = (fn: () => void) => () => {
    fn();
    closeMenu();
  };

  /* ----- render ----- */
  const alignClass = x < 120 ? 'pet__bubble--left' : x > vw - W - 120 ? 'pet__bubble--right' : '';

  return (
    <div
      className="pet"
      style={{
        width: W,
        height: H,
        transform: `translate3d(${x}px, 0, 0)`,
        transition: travelMs ? `transform ${travelMs}ms linear` : 'none',
      }}
    >
      <div className="pet__shadow" />
      <div
        className="pet__lift"
        style={{
          transform: `translate3d(0, ${-y}px, 0)`,
          transition: fall ? 'transform 380ms cubic-bezier(0.5, 0, 1, 0.6)' : 'none',
        }}
      >
        <div ref={bodyRef} className={`pet__body ${mode === 'jump' ? 'pet__body--hop' : ''}`}>
          <button
            type="button"
            className="pet__hit"
            aria-label={t('petMenuTitle')}
            aria-expanded={menuOpen}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <Sprite anim={mode} scale={SCALE} flip={facing === -1} />
          </button>
          {mode === 'sleep' && (
            <div className="pet__zzz" aria-hidden="true">
              <span>z</span>
              <span>z</span>
              <span>Z</span>
            </div>
          )}
        </div>

        {bubble && !menuOpen && (
          <div key={bubble.id} className={`pet__bubble ${alignClass}`} role="status">
            {bubble.text}
          </div>
        )}

        {menuOpen && (
          <div className={`pet__bubble pet__menu ${alignClass}`} role="menu">
            <div className="pet__menu-title">{t('petMenuTitle')}</div>
            <button type="button" role="menuitem" onClick={act(() => launch('cv'))}>
              {t('petMenuCv')}
            </button>
            <button type="button" role="menuitem" onClick={act(() => launch('projects'))}>
              {t('petMenuProjects')}
            </button>
            <button type="button" role="menuitem" onClick={act(openSimpleView)}>
              {t('petMenuSimple')}
            </button>
            <button type="button" role="menuitem" onClick={act(() => launch('welcome'))}>
              {t('petMenuWelcome')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="pet__menu-hide"
              onClick={() => useStore.getState().updateSettings({ assistantHidden: true })}
            >
              {t('petMenuHide')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
