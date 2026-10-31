/**
 * Pet – the pixel twin that lives on the desktop.
 *
 * It runs in from the left edge, waves hello, then gets on with its own life. What it does is DATA:
 * the behaviour table in src/assets/sprites/mascot.behaviors.ts (generated from
 * scripts/sprites/behaviors.mjs) lists every behaviour with its animation, odds, duration, travel,
 * body effect and speech lines. This component is only the generic engine that plays that table:
 *   - picks the next behaviour by weight, from a tier that depends on how long the visitor has been
 *     inactive (calm -> bored -> sleepy), avoiding recent repeats
 *   - travels (walk / run / dash / chase or flee the cursor / peek over a screen edge)
 *   - applies a body effect (hop, spin, backflip, shake ...) and speech bubbles
 *   - falls asleep when nobody is around and wakes up when the mouse moves
 * plus tips, the click menu, drag & drop, reduced motion and the Settings off switch.
 *
 * Cost: no render loop. Frames are stepped by a CSS animation, travel is a single CSS transform
 * transition, body effects are CSS keyframes, and one timeout at a time drives the behaviours.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../os/store';
import { useLang, useT, type StringKey } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { openSimpleView } from '../../os/view';
import Sprite, { type SpriteAnim } from '../mascot/Sprite';
import { SPRITE_FOOT_PAD, SPRITE_FRAME_H, SPRITE_FRAME_W } from '../../assets/sprites/mascot.meta';
import { BEHAVIORS, type Behavior, type Fx, type Move } from '../../assets/sprites/mascot.behaviors';
import './Pet.css';

const SCALE = 3;
const W = SPRITE_FRAME_W * SCALE;
const H = SPRITE_FRAME_H * SCALE;
const FEET = SPRITE_FOOT_PAD * SCALE; // transparent pixels below the shoes
const TASKBAR = 48;
const EDGE = 8;
const SPEED = { walk: 70, run: 190, dash: 340, toCursor: 230, fromCursor: 260, toEdge: 190 } as const; // px/s
const SPEECH_GAP_MS = 9000; // minimum time between two behaviour lines
const TIP_STORAGE_KEY = 'yb-pet-seen';

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/* ---------- behaviour selection ---------- */
type Tier = 0 | 1 | 2; // calm, bored, sleepy

function pickBehavior(tier: Tier, recent: string[]): Behavior {
  let pool = BEHAVIORS.filter((b) => b.weight[tier] > 0 && !recent.includes(b.id));
  if (pool.length === 0) pool = BEHAVIORS.filter((b) => b.weight[tier] > 0);
  const total = pool.reduce((sum, b) => sum + b.weight[tier], 0);
  let r = Math.random() * total;
  for (const b of pool) {
    r -= b.weight[tier];
    if (r <= 0) return b;
  }
  return pool[0];
}

/** Where a travelling behaviour goes, which way it faces and how fast. */
function travelPlan(move: Exclude<Move, 'none'>, fromX: number, pointerX: number | null, vw: number) {
  const max = Math.max(EDGE, vw - W - EDGE);

  if (move === 'toCursor' && pointerX != null) {
    const target = clamp(pointerX - W / 2, EDGE, max);
    return { target, facing: (target > fromX ? 1 : -1) as 1 | -1, speed: SPEED.toCursor };
  }
  if (move === 'fromCursor' && pointerX != null) {
    const target = pointerX < vw / 2 ? max : EDGE;
    return { target, facing: (target > fromX ? 1 : -1) as 1 | -1, speed: SPEED.fromCursor };
  }
  if (move === 'toEdge') {
    // Half of the sprite goes off-screen: it peeks in from the side
    const toLeft = Math.random() < 0.5;
    return { target: toLeft ? -W * 0.5 : vw - W * 0.5, facing: (toLeft ? 1 : -1) as 1 | -1, speed: SPEED.toEdge };
  }

  // walk / run / dash (and cursor moves when the pointer is unknown): a spot worth the trip
  let target = rand(EDGE, max);
  if (Math.abs(target - fromX) < 140) target = fromX < max / 2 ? rand(max * 0.55, max) : rand(EDGE, max * 0.45);
  const speed = move === 'walk' ? SPEED.walk : move === 'dash' ? SPEED.dash : SPEED.run;
  return { target, facing: (target > fromX ? 1 : -1) as 1 | -1, speed };
}

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
  const lang = useLang();
  const launch = useLaunch();
  const onboarded = useStore((s) => s.settings.onboarded);

  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const [mode, setMode] = useState<SpriteAnim>('idle');
  const [fx, setFx] = useState<Fx>('none');
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
  const modeRef = useRef<SpriteAnim>('idle');
  const draggingRef = useRef(false);
  const menuRef = useRef(false);
  const aliveRef = useRef(true);
  const timerRef = useRef(0);
  const bubbleTimerRef = useRef(0);
  const tipTimerRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const lastSpeechRef = useRef(0);
  const bubbleIdRef = useRef(0);
  const pointerXRef = useRef<number | null>(null);
  const recentRef = useRef<string[]>([]);
  const langRef = useRef(lang);
  langRef.current = lang;
  const appsRef = useRef<Set<string>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);

  const floorMax = useCallback(() => Math.max(EDGE, window.innerWidth - W - EDGE), []);

  /* ----- helpers ----- */
  const say = useCallback((text: string, ms = 4200) => {
    window.clearTimeout(bubbleTimerRef.current);
    bubbleIdRef.current += 1;
    lastSpeechRef.current = Date.now();
    setBubble({ text, id: bubbleIdRef.current });
    bubbleTimerRef.current = window.setTimeout(() => setBubble(null), ms);
  }, []);

  const enter = useCallback((m: SpriteAnim) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(fn, ms);
  }, []);

  const travel = useCallback((target: number, dir: 1 | -1, speed: number) => {
    const ms = (Math.abs(target - xRef.current) / speed) * 1000;
    setFacing(dir);
    setTravelMs(ms);
    xRef.current = target;
    setX(target);
    return ms;
  }, []);

  /* ----- behaviour loop (generic: plays the data table) ----- */
  const next = useCallback(() => {
    if (!aliveRef.current) return;
    // Busy being dragged / talked to: check again shortly
    if (draggingRef.current || menuRef.current) {
      schedule(next, 800);
      return;
    }

    // Back from peeking over a screen edge: walk inside first
    const max = floorMax();
    if (xRef.current < EDGE - 2 || xRef.current > max + 2) {
      const target = clamp(xRef.current, EDGE + 24, max - 24);
      setFx('none');
      enter('walk');
      schedule(next, travel(target, target > xRef.current ? 1 : -1, SPEED.walk) + 80);
      return;
    }

    const idleFor = (Date.now() - lastActivityRef.current) / 1000;
    const tier: Tier = idleFor > 60 ? 2 : idleFor > 20 ? 1 : 0;
    const b = pickBehavior(tier, recentRef.current);
    recentRef.current = [...recentRef.current.slice(-5), b.id];

    setFx(b.fx ?? 'none');
    enter(b.anim);

    // Speech bubble (rate limited so a chatty table can't spam)
    const lines = b.lines;
    if (lines && (lines.when !== 'bored' || tier >= 1) && Date.now() - lastSpeechRef.current > SPEECH_GAP_MS && Math.random() < lines.chance) {
      const pool = lines[langRef.current];
      if (pool.length) say(pool[Math.floor(Math.random() * pool.length)]);
    }

    // Fall asleep (or any "hold until the visitor shows up" pose)
    if (b.until === 'activity') {
      const watch = () => {
        if (!aliveRef.current) return;
        if (Date.now() - lastActivityRef.current < 2500) {
          setFx('none');
          enter('stretch');
          schedule(next, 2800);
        } else {
          schedule(watch, 1000);
        }
      };
      say(t('petSleepy'), 2600);
      schedule(watch, 1500);
      return;
    }

    const dwell = b.duration[1] > 0 ? rand(b.duration[0], b.duration[1]) : 0;
    const move = b.move ?? 'none';
    if (move === 'none') {
      if (b.face === 'random') setFacing(Math.random() < 0.5 ? 1 : -1);
      schedule(next, dwell || 2500);
      return;
    }

    // Travelling behaviour
    const plan = travelPlan(move, xRef.current, pointerXRef.current, window.innerWidth);
    const ms = travel(plan.target, plan.facing, plan.speed);
    if (b.arrive) {
      const arrive = b.arrive;
      schedule(() => {
        setTravelMs(0);
        enter(arrive);
        schedule(next, dwell);
      }, ms + 60);
    } else {
      schedule(next, ms + 60 + dwell);
    }
  }, [enter, floorMax, say, schedule, t, travel]);

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
      setFx('none');
      enter('run');
      const ms = travel(target, 1, SPEED.run);
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

  /* ----- track activity, pointer, opened apps, window size ----- */
  useEffect(() => {
    const touch = () => {
      lastActivityRef.current = Date.now();
    };
    const onMove = (e: PointerEvent) => {
      pointerXRef.current = e.clientX;
      lastActivityRef.current = Date.now();
    };
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    window.addEventListener('pointermove', onMove, { passive: true });

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
      window.removeEventListener('pointermove', onMove);
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
      setFx('none');
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
        setFx('none');
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
    setFx('hop');
    enter('jump');
    schedule(() => {
      setFall(false);
      setFx('none');
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
        bottom: TASKBAR - FEET,
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
        <div ref={bodyRef} className={`pet__body pet__fx pet__fx--${fx}`}>
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
