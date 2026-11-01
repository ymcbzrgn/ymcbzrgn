/** Which moves the visitor has seen the twin perform (playing them by hand or just watching it live). */
const KEY = 'yb-moves';
let cache: Set<string> | null = null;

export function readSeen(): Set<string> {
  if (cache) return cache;
  let list: unknown = [];
  try {
    list = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    /* storage unavailable or corrupt: start over */
  }
  cache = new Set(Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : []);
  return cache;
}

/** Returns true when this move is new to the visitor. */
export function markSeen(anim: string): boolean {
  const seen = readSeen();
  if (seen.has(anim)) return false;
  seen.add(anim);
  try {
    localStorage.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    /* kept in memory for this visit */
  }
  return true;
}
