/**
 * Achievements: a deliberately tiny module (an id list, a localStorage record and a broadcast), so any
 * feature can call `unlock('...')` without pulling in UI. The window that lists them, the toast and
 * the titles/descriptions are lazy (src/apps/achievements, src/ui/extras).
 *
 * Storage: one JSON record in localStorage. If storage is unavailable the achievements still work for
 * the current visit (memory only).
 */

export const ACHIEVEMENT_IDS = [
  // the pixel twin
  'drive',
  'door',
  'move10',
  'move25',
  'moveAll',
  'dizzy',
  'konami',
  // rooms
  'room',
  'rooms5',
  'carry',
  'secret',
  'secretsAll',
  'gallery',
  // games
  'snake',
  'tetris',
  'g2048',
  'mines',
  'arcade',
  // terminal
  'neofetch',
  'pipe',
  'oops',
  'sudo',
  // desktop
  'tour',
  'palette',
  'polyglot',
  'owl',
  'holiday',
  // sound
  'sound',
  'dj',
  'dance',
  // meta
  'all',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

const KEY = 'yb-ach';
const ACH_EVENT = 'yb:achievement';
export const ACH_RESET_EVENT = 'yb:achievement-reset';

interface Saved {
  got: Record<string, number>;
  sets: Record<string, string[]>;
}

let state: Saved | null = null;
const recent: { id: AchievementId; at: number }[] = [];

function load(): Saved {
  if (state) return state;
  let parsed: Partial<Saved> = {};
  try {
    parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
  } catch {
    /* storage unavailable or corrupt: start over */
  }
  state = {
    got: parsed.got && typeof parsed.got === 'object' ? parsed.got : {},
    sets: parsed.sets && typeof parsed.sets === 'object' ? parsed.sets : {},
  };
  return state;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* kept in memory for this visit */
  }
}

/** Unlock an achievement. Returns true the first time only. */
export function unlock(id: AchievementId): boolean {
  const s = load();
  if (s.got[id]) return false;
  s.got[id] = Date.now();
  save();
  recent.push({ id, at: Date.now() });
  window.dispatchEvent(new CustomEvent(ACH_EVENT, { detail: id }));
  // everything else done? then the last one unlocks too
  if (id !== 'all' && ACHIEVEMENT_IDS.every((other) => other === 'all' || s.got[other])) unlock('all');
  return true;
}

export function hasAchievement(id: AchievementId): boolean {
  return !!load().got[id];
}

/** id -> unlock time (ms since epoch) for everything unlocked so far. */
export function unlockedAt(): Readonly<Record<string, number>> {
  return load().got;
}

/** Adds a value to a named set (rooms visited, games played ...) and returns how many it holds now. */
export function addToSet(name: string, value: string): number {
  const s = load();
  const list = s.sets[name] ?? (s.sets[name] = []);
  if (!list.includes(value)) {
    list.push(value);
    save();
  }
  return list.length;
}

export function setSize(name: string): number {
  return load().sets[name]?.length ?? 0;
}

/** Forget everything (the Achievements window offers this; handy for trying things again). */
export function resetAchievements() {
  state = { got: {}, sets: {} };
  recent.length = 0;
  save();
  window.dispatchEvent(new Event(ACH_RESET_EVENT));
}

/** Subscribe to unlocks. Anything unlocked in the last few seconds (before the listener existed) is replayed. */
export function onUnlock(fn: (id: AchievementId) => void, replayMs = 6000): () => void {
  const now = Date.now();
  for (const r of recent) if (now - r.at < replayMs) fn(r.id);
  const handler = (e: Event) => fn((e as CustomEvent<AchievementId>).detail);
  window.addEventListener(ACH_EVENT, handler);
  return () => window.removeEventListener(ACH_EVENT, handler);
}
