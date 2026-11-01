/**
 * Control-mode engine. While "Control me" is on, this reads the keyboard and the pointer and drives the
 * pixel twin through PetApi, one requestAnimationFrame at a time (the autonomous engine in Pet.tsx
 * sleeps meanwhile).
 *
 *   - 2D walking on the desktop plane (arrows / WASD, Shift runs), Space jumps, C crouches
 *   - click the desktop to walk there, click an icon to walk up to it, E / Enter uses what is next to it
 *   - 1-9 play favourite moves, M opens the move palette, Esc lets go
 *   - small surprises: dizzy after too many jumps, Konami code, fidgets while you think
 *   - gives up after a while without input and goes back to its own life
 *
 * Keyboard ownership: keys belong to the twin until the visitor clicks into a window; then the window
 * keeps them (games, terminal, notes) until the desktop (or the twin) is clicked again. Typing targets
 * and browser shortcuts are never touched.
 */
import { useStore } from '../../../os/store';
import { getLang } from '../../../os/i18n';
import type { StringKey } from '../../../os/i18n/full';
import type { Fx } from '../../../assets/sprites/mascot.behaviors';
import type { SpriteAnim } from '../../mascot/Sprite';
import type { PetApi } from './types';
import { FIDGETS, PALETTE, QUICK, anim, behaviorFor } from './moves';
import { markSeen, readSeen } from './seen';
import { findIconNear, getIcon, isActivatable, isTypingTarget, type IconTarget } from './world';
import { enterNode } from './enter';
import { useRoomStore } from '../../rooms/roomStore';

const WALK = 190; // px/s
const RUN = 380;
const VERT = 0.78; // walking up/down the screen is a bit slower than sideways
const JUMP_MS = 520;
const JUMP_H = 76;
const FIDGET_AFTER_MS = 6500;
const IDLE_WARN_MS = 18000;
const IDLE_EXIT_MS = 26000;
const GLIDE = { walk: 130, run: 260, dash: 400 } as const;

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const UP = ['ArrowUp', 'KeyW'];
const DOWN = ['ArrowDown', 'KeyS'];
const MOVE_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
/** Apps that read the keyboard themselves: when one opens, keys go to it. */
const KEY_APPS = new Set(['calculator-app', 'snake-game', 'tetris-game', '2048-game', 'terminal-app', 'notes-app']);

const A_UP = anim('walkUp', 'walk');
const A_DOWN = anim('walkDown', 'walk');
const A_CROUCH = anim('crouch', 'idle');
const A_DIZZY = anim('dizzy', 'idle');
const A_CELEBRATE = anim('celebrate', 'wave');
const A_SHRUG = anim('shrug', 'idle');
const A_SIT = anim('sit', 'idle');
const A_CARRY_IDLE = anim('carryIdle', 'idle');
const A_CARRY_WALK = anim('carryWalk', 'walk');

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

interface Act {
  anim: SpriteAnim;
  fx: Fx;
  until: number;
  /** Hold the pose until the visitor does something (sleep). */
  hold?: boolean;
  /** Ignore input until it is over. */
  locked?: boolean;
  /** Travel along the facing direction while it plays (walk / run / dash moves). */
  glide?: { speed: number; left: number };
}

/** Something the twin can use right here: a desktop icon, or a prop in a room. */
interface Target {
  key: string;
  text: string;
  extra?: string;
  rect: DOMRect;
  use(): void;
  carry?(): void;
}

export interface EngineUi {
  t(key: StringKey): string;
  reduced: boolean;
  setPalette(open?: boolean): void;
  isPaletteOpen(): boolean;
  setKeyboard(petOwnsKeys: boolean): void;
  onSeen(seen: ReadonlySet<string>): void;
  hintEl(): HTMLElement | null;
}

export interface Engine {
  start(): void;
  stop(): void;
  perform(name: SpriteAnim): void;
}

export function createEngine(api: PetApi, ui: EngineUi): Engine {
  const TASKBAR = api.TASKBAR;
  const keys = new Set<string>();
  let alive = false;
  let raf = 0;
  let kbPet = true;
  let x = 0;
  let gy = 0;
  let jy = 0;
  let facing: 1 | -1 = 1;
  let goal: { x: number; gy: number } | null = null;
  let goalRun = false; // far-away goals are run to
  let jumpT = -1;
  let jumps: number[] = [];
  let act: Act | null = null;
  let script = false; // a scripted sequence (entering an icon ...) owns the twin
  let perch: { winId: string; dx: number } | null = null; // sitting on a window's title bar
  let lastTick = 0;
  let lastInput = 0;
  let fidgetAt = 0;
  let warned = false;
  let konami = 0;
  let nothingCount = 0;
  let lastSay = 0;
  let target: Target | null = null;
  let pinned: string | null = null; // the icon the visitor clicked: it stays the target while the twin is near it
  let adopt = true; // take the pose from outside (drag, joining a room ...) on the next frame
  let lastKind: 'desktop' | 'room' = 'desktop';
  let targetAt = 0;
  let hintKey = '';
  let unsub: (() => void) | null = null;
  const last = { x: NaN, gy: NaN, jy: NaN, facing: 0, anim: '', fx: '' };

  /** The room strip's world when the twin is in one (1D, no vertical walking), else the desktop. */
  const bounds = () => {
    const world = api.world();
    if (world.kind === 'room') return { minX: 0, maxX: Math.max(0, world.width - api.W), maxGy: 0 };
    return {
      minX: -api.W * 0.15,
      maxX: window.innerWidth - api.W * 0.85,
      maxGy: Math.max(0, window.innerHeight - TASKBAR - (api.H - api.FEET) - 4),
    };
  };
  const inRoom = () => api.world().kind === 'room';
  const feet = () => ({ x: x + api.W / 2, y: window.innerHeight - TASKBAR - gy });

  const say = (text: string, ms = 3600) => {
    lastSay = performance.now();
    api.say(text, ms);
  };
  const touch = () => {
    lastInput = performance.now();
    warned = false;
  };
  const setKb = (v: boolean) => {
    if (kbPet === v) return;
    kbPet = v;
    if (!v) keys.clear();
    ui.setKeyboard(v);
  };

  /* ---------- moves ---------- */
  function startAct(a: Act) {
    act = a;
    goal = null;
    fidgetAt = performance.now() + 8000;
  }

  function perform(name: SpriteAnim) {
    if (act?.locked || script) return;
    if (useRoomStore.getState().carrying) {
      say(ui.t('roomHandsFull'), 2200);
      return;
    }
    const now = performance.now();
    touch();
    const b = behaviorFor(name);
    const dwell = b && b.duration[1] > 0 ? rand(b.duration[0], b.duration[1]) : 2400;
    const a: Act = { anim: name, fx: ui.reduced ? 'none' : (b?.fx ?? 'none'), until: now + clamp(dwell, 1800, 6500), hold: b?.until === 'activity' };
    if (b && (b.move === 'walk' || b.move === 'run' || b.move === 'dash')) a.glide = { speed: GLIDE[b.move], left: 260 };
    startAct(a);
    if (markSeen(name)) {
      const seen = readSeen();
      ui.onSeen(seen);
      const n = seen.size;
      const total = PALETTE.length;
      const milestone: StringKey | null = n >= total ? 'ctrlFoundAll' : n === 50 ? 'ctrlFound50' : n === 25 ? 'ctrlFound25' : n === 10 ? 'ctrlFound10' : null;
      if (milestone) {
        startAct({ anim: A_CELEBRATE, fx: ui.reduced ? 'none' : 'hop', until: now + 2200, locked: true });
        say(ui.t(milestone), 4200);
        return;
      }
    }
    if (b?.lines && now - lastSay > 5000 && Math.random() < 0.55) say(pick(b.lines[getLang()]));
  }

  function jump() {
    if (jumpT >= 0 || act?.locked || script || useRoomStore.getState().carrying) return;
    if (act) act = null;
    jumpT = 0;
    const now = performance.now();
    jumps = jumps.filter((t) => now - t < 6000);
    jumps.push(now);
    if (jumps.length >= 8) {
      jumps = [];
      startAct({ anim: A_DIZZY, fx: 'none', until: now + 2800, locked: true });
      markSeen('dizzy');
      say(ui.t('ctrlDizzy'), 2800);
    }
  }

  /* ---------- using what is next to the twin ---------- */
  function enterIcon(t: IconTarget) {
    const node = useStore.getState().nodes[t.id];
    if (!node) return;
    script = true;
    goal = null;
    keys.clear();
    setHint(null);
    void enterNode(
      {
        api,
        pose: () => ({ x, gy, facing }),
        place: (nx, ngy, nf) => {
          x = nx;
          gy = ngy;
          if (nf) facing = nf;
        },
        alive: () => alive,
        t: ui.t,
      },
      node,
      t.rect
    )
      .then((res) => {
        perch = res.perch ?? null;
      })
      .finally(() => {
        script = false;
        touch();
        adopt = true; // re-sync the pose on the next frame
      });
  }

  function interact() {
    if (act?.locked || script || useRoomStore.getState().busy) return;
    touch();
    if (!target) {
      nothingCount += 1;
      if (nothingCount <= 3) say(ui.t(inRoom() ? 'roomNothing' : 'ctrlNothing'), 3800);
      startAct({ anim: A_SHRUG, fx: 'none', until: performance.now() + 1300 });
      return;
    }
    keys.clear();
    goal = null;
    target.use();
  }

  /** F in a room: pick up / put down. */
  function carryKey() {
    if (act?.locked || script || useRoomStore.getState().busy || !inRoom()) return;
    touch();
    if (target?.carry) {
      keys.clear();
      goal = null;
      target.carry();
    } else if (useRoomStore.getState().carrying) {
      void useRoomStore.getState().runner?.drop();
    }
  }

  /** What can be used from where the twin stands (checked a few times a second). */
  function findTarget(): Target | null {
    if (act?.locked || jumpT >= 0) return null;
    if (inRoom()) {
      const t = useRoomStore.getState().runner?.nearest(x + api.W / 2);
      return t ? { key: t.id, text: t.label, extra: t.extra, rect: t.rect, use: () => void t.use(), carry: t.carry ? () => void t.carry?.() : undefined } : null;
    }
    const f = feet();
    // an icon the visitor clicked stays the target while the twin is next to it (icons at the top edge
    // cannot always be reached more closely than a neighbour)
    const wanted = pinned ? getIcon(pinned) : null;
    const near = wanted && Math.hypot(Math.max(wanted.rect.left - f.x, 0, f.x - wanted.rect.right), Math.max(wanted.rect.top - f.y, 0, f.y - wanted.rect.bottom)) <= 110 ? wanted : findIconNear(f.x, f.y);
    return near ? { key: near.id, text: `${ui.t('ctrlOpen')} ${near.name}`, rect: near.rect, use: () => enterIcon(near) } : null;
  }

  /* ---------- the hint above the twin ---------- */
  function setHint(t: Target | null) {
    const el = ui.hintEl();
    if (!el) return;
    const pet = api.rect();
    if (!t || !pet) {
      if (!el.hidden) el.hidden = true;
      hintKey = '';
      return;
    }
    const key = `${t.key}|${t.text}|${t.extra ?? ''}`;
    if (key !== hintKey) {
      hintKey = key;
      el.textContent = '';
      const kbd = document.createElement('kbd');
      kbd.textContent = 'E';
      el.append(kbd, ` ${t.text}`);
      if (t.extra) {
        const [k, ...rest] = t.extra.split(' ');
        const more = document.createElement('span');
        more.className = 'pet-ctl-hint__extra';
        const kbd2 = document.createElement('kbd');
        kbd2.textContent = k;
        more.append(kbd2, ` ${rest.join(' ')}`);
        el.append(more);
      }
    }
    if (el.hidden) el.hidden = false;
    // above the twin's head, and above its speech bubble if it has one
    const bubble = document.querySelector('.pet__bubble:not(.pet__bubble--below)')?.getBoundingClientRect();
    const top = bubble ? Math.min(pet.top + 18, bubble.top - 6) : pet.top + 18;
    el.style.transform = `translate(${Math.round(pet.left + pet.width / 2)}px, ${Math.round(top)}px) translate(-50%, -100%)`;
  }

  /* ---------- frame ---------- */
  function tick(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastTick) / 1000);
    lastTick = now;
    if (script || useRoomStore.getState().busy) {
      adopt = true;
      return;
    }
    // Someone else moved the twin (dragged, joined a room, a room script): take its pose
    const ext = api.get();
    if (ext.busy) {
      adopt = true;
      perch = null; // grabbed or being talked to: it is no longer sitting there
      return;
    }
    // moved by somebody else (dropped after a drag, a room appeared or closed around it)
    const kind = api.world().kind;
    if (kind !== lastKind) {
      lastKind = kind;
      adopt = true;
    }
    if (!adopt && !Number.isNaN(last.x) && (Math.abs(ext.x - last.x) > 3 || Math.abs(ext.gy - last.gy) > 3)) adopt = true;
    if (adopt) {
      adopt = false;
      x = ext.x;
      gy = ext.gy;
      jy = 0;
      jumpT = -1;
      goal = null;
      last.x = NaN;
    }
    if (perch && inRoom()) perch = null;

    // No input for a while: back to its own life
    const idleFor = now - lastInput;
    if (idleFor > IDLE_EXIT_MS) {
      say(ui.t('ctrlIdleBye'), 3000);
      api.exit({ silent: true });
      return;
    }
    if (idleFor > IDLE_WARN_MS && !warned) {
      warned = true;
      say(ui.t('ctrlIdleWarn'), 3600);
    }

    const { minX, maxX, maxGy } = bounds();
    const W = api.W;
    const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    let runNow = run;
    const speed = run ? RUN : WALK;
    const locked = !!act?.locked;
    let dx = 0;
    let dy = 0;
    if (kbPet && !locked) {
      dx = (RIGHT.some((k) => keys.has(k)) ? 1 : 0) - (LEFT.some((k) => keys.has(k)) ? 1 : 0);
      dy = (UP.some((k) => keys.has(k)) ? 1 : 0) - (DOWN.some((k) => keys.has(k)) ? 1 : 0);
    }
    let moving = false;
    if (dx || dy) {
      goal = null;
      pinned = null;
      if (act) act = null;
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      x += dx * speed * dt;
      gy += dy * speed * VERT * dt;
      moving = true;
    } else if (goal && !locked) {
      const tx = goal.x - x;
      const ty = goal.gy - gy;
      const dist = Math.hypot(tx, ty);
      if (dist < 5) {
        goal = null;
        goalRun = false;
      } else {
        if (dist > 260) goalRun = true;
        else if (dist < 70) goalRun = false;
        runNow = run || goalRun;
        const step = Math.min(dist, (runNow ? RUN : WALK) * dt);
        dx = tx / dist;
        dy = ty / dist;
        x += dx * step;
        gy += dy * step;
        moving = true;
      }
    }

    // Sitting on a window's title bar: ride along with it until the visitor moves or the window is no longer in front
    let perched = false;
    if (perch) {
      const st = useStore.getState();
      const w = st.windows.find((win) => win.id === perch?.winId);
      const el = document.querySelector<HTMLElement>(`[data-window-id="${perch.winId}"]`);
      if (moving || jumpT >= 0 || !w || !el || w.state !== 'normal' || st.focusedWindowId !== perch.winId) {
        perch = null;
      } else {
        const r = el.getBoundingClientRect();
        x = r.left + perch.dx - W / 2;
        gy = window.innerHeight - TASKBAR - (r.top + 3);
        facing = 1;
        perched = true;
      }
    }

    // Scripted travel of a performed move (walk / run / dash tricks)
    if (act?.glide && act.glide.left > 0) {
      const step = act.glide.speed * dt;
      x += facing * step;
      act.glide.left -= step;
      if (x < minX || x > maxX) facing = (facing * -1) as 1 | -1;
    }

    x = clamp(x, minX, maxX);
    gy = clamp(gy, 0, maxGy);
    if (dx > 0.2) facing = 1;
    else if (dx < -0.2) facing = -1;

    // Jump arc
    if (jumpT >= 0) {
      jumpT += dt * 1000;
      if (jumpT >= JUMP_MS) {
        jumpT = -1;
        jy = 0;
      } else {
        const k = jumpT / JUMP_MS;
        jy = JUMP_H * 4 * k * (1 - k);
      }
    }

    // A performed move that ran its course
    if (act && !act.hold && now > act.until) act = null;

    // Fidget while the visitor thinks
    if (!act && !moving && jumpT < 0 && !goal && now > fidgetAt && idleFor > FIDGET_AFTER_MS && FIDGETS.length && !useRoomStore.getState().carrying) {
      startAct({ anim: pick(FIDGETS), fx: 'none', until: now + rand(1800, 3200) });
      fidgetAt = now + rand(5000, 9000);
    }

    // Which animation / body effect
    const carrying = !!useRoomStore.getState().carrying;
    let a: SpriteAnim = 'idle';
    let fx: Fx = 'none';
    if (act && (act.locked || !(moving || jumpT >= 0))) {
      a = act.anim;
      fx = act.fx;
    } else if (jumpT >= 0) {
      a = 'jump';
    } else if (moving) {
      a = carrying ? A_CARRY_WALK : Math.abs(dx) >= 0.35 || dy === 0 ? (runNow ? 'run' : 'walk') : dy > 0 ? A_UP : A_DOWN;
    } else if (perched) {
      a = A_SIT;
    } else if (carrying) {
      a = A_CARRY_IDLE;
    } else if (kbPet && keys.has('KeyC')) {
      a = A_CROUCH;
    }

    commit(a, fx);

    // Something to use right here? (checked a few times a second, the hint follows every frame)
    if (now - targetAt > 120) {
      targetAt = now;
      target = findTarget();
    }
    setHint(kbPet ? target : null);
  }

  function commit(a: SpriteAnim, fx: Fx) {
    const rx = Math.round(x * 2) / 2;
    const rgy = Math.round(gy * 2) / 2;
    const rjy = Math.round(jy * 2) / 2;
    if (rx === last.x && rgy === last.gy && rjy === last.jy && facing === last.facing && a === last.anim && fx === last.fx) return;
    last.x = rx;
    last.gy = rgy;
    last.jy = rjy;
    last.facing = facing;
    last.anim = a;
    last.fx = fx;
    api.set({ x: rx, gy: rgy, jy: rjy, facing, anim: a, fx });
  }

  /* ---------- input ---------- */
  function wake() {
    if (act?.hold) act = null;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!alive || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target as HTMLElement | null;
    if (isTypingTarget(el)) return;
    const code = e.code;

    if (code === 'Escape') {
      // an open pet menu / context menu closes first
      if (document.querySelector('.pet__menu, .context-menu')) return;
      e.preventDefault();
      e.stopPropagation();
      if (ui.isPaletteOpen()) ui.setPalette(false);
      else api.exit();
      return;
    }
    if (!kbPet) return;

    const own = !!el?.closest?.('.pet-ctl, .pet-ctl-palette, .pet, .room');
    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (e.key === 'Shift') {
      keys.add(code);
      return;
    }
    // Konami code (any key counts towards it)
    if (code === KONAMI[konami]) {
      konami += 1;
      if (konami === KONAMI.length) {
        konami = 0;
        if (!act?.locked && !script) {
          startAct({ anim: A_CELEBRATE, fx: ui.reduced ? 'none' : 'backflip', until: performance.now() + 2600, locked: true });
          say(ui.t('ctrlKonami'), 4200);
          markSeen('celebrate');
        }
      }
    } else {
      konami = code === KONAMI[0] ? 1 : 0;
    }

    if (MOVE_KEYS.has(code)) {
      consume();
      keys.add(code);
      touch();
      wake();
      return;
    }
    if (code === 'Space') {
      if (isActivatable(el) && !own) return;
      consume();
      if (!e.repeat) jump();
      touch();
      wake();
      return;
    }
    if (code === 'KeyC') {
      consume();
      keys.add(code);
      touch();
      return;
    }
    if (code === 'KeyE' || code === 'Enter') {
      if (code === 'Enter' && isActivatable(el) && !own) return;
      consume();
      if (!e.repeat) interact();
      return;
    }
    if (code === 'KeyF') {
      consume();
      if (!e.repeat) carryKey();
      return;
    }
    if (code === 'KeyM') {
      consume();
      if (!e.repeat) ui.setPalette();
      touch();
      return;
    }
    const digit = /^Digit([1-9])$/.exec(code);
    if (digit) {
      const name = QUICK[Number(digit[1]) - 1];
      if (name) {
        consume();
        if (!e.repeat) perform(name);
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }

  function onBlur() {
    keys.clear();
  }

  function goToIcon(el: HTMLElement) {
    const id = el.dataset.nodeId;
    const t = id ? getIcon(id) : null;
    if (!t) return;
    const { minX, maxX, maxGy } = bounds();
    pinned = t.id;
    goal = {
      x: clamp(t.rect.left + t.rect.width / 2 - api.W / 2, minX, maxX),
      gy: clamp(window.innerHeight - TASKBAR - (t.rect.bottom + 6), 0, maxGy),
    };
  }

  function onPointerDown(e: PointerEvent) {
    if (!alive) return;
    const el = e.target as HTMLElement | null;
    if (!el?.closest) return;
    if (el.closest('.pet-ctl, .pet-ctl-palette, .pet, .room')) {
      setKb(true);
      touch();
      return; // (a click inside a room is handled by the strip itself)
    }
    if (el.closest('.window')) {
      setKb(false);
      return;
    }
    if (el.closest('.taskbar, .context-menu, .desktop-widget')) return;
    setKb(true);
    touch();
    if (e.button !== 0 || script || act?.locked) return;
    wake();
    const icon = el.closest<HTMLElement>('.desktop-icon');
    if (icon) {
      goToIcon(icon);
      return;
    }
    const { minX, maxX, maxGy } = bounds();
    pinned = null;
    goal = {
      x: clamp(e.clientX - api.W / 2, minX, maxX),
      gy: clamp(window.innerHeight - TASKBAR - e.clientY, 0, maxGy),
    };
    if (act && !act.locked) act = null;
  }

  return {
    perform,
    start() {
      alive = true;
      const p = api.get();
      x = p.x;
      gy = p.gy;
      jy = 0;
      facing = p.facing;
      const now = performance.now();
      lastTick = now;
      lastInput = now;
      fidgetAt = now + FIDGET_AFTER_MS;
      adopt = true;
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('keyup', onKeyUp, true);
      window.addEventListener('blur', onBlur);
      window.addEventListener('pointerdown', onPointerDown, true);
      // Apps that read the keyboard take it when they open; closing the last one gives it back
      unsub = useStore.subscribe((state, prev) => {
        if (state.windows.length > prev.windows.length) {
          const opened = state.windows[state.windows.length - 1];
          if (opened && KEY_APPS.has(opened.appId)) setKb(false);
        } else if (state.windows.length < prev.windows.length && !state.windows.some((w) => KEY_APPS.has(w.appId))) {
          setKb(true);
        }
      });
      api.set({ anim: 'idle', fx: 'none' });
      say(ui.t('ctrlStart'), 4200);
      raf = requestAnimationFrame(tick);
    },
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerdown', onPointerDown, true);
      unsub?.();
      unsub = null;
      keys.clear();
      setHint(null);
    },
  };
}
