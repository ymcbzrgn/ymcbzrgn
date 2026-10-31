/**
 * What the pixel assistant does when nobody is asking it for anything: one entry per behaviour.
 * build-sprites.mjs validates this table and writes src/assets/sprites/mascot.behaviors.ts,
 * which the (generic) engine in src/ui/pet/Pet.tsx reads. Adding a behaviour = adding an
 * animation in frames.mjs + an entry here; no engine code needs to change.
 *
 * Fields
 *   id        unique name
 *   anim      animation row to play (must exist in frames.mjs ANIMS)
 *   arrive    optional animation to switch to after a travelling behaviour has arrived
 *   weight    [calm, bored, sleepy] relative probability. The engine picks the tier from how long
 *             the visitor has been inactive (calm < 20 s <= bored < 60 s <= sleepy). 0 = never.
 *   duration  [min, max] ms the behaviour lasts (for travelling behaviours: dwell time after arriving)
 *   move      none | walk | run | dash | toCursor | fromCursor | toEdge   (horizontal travel)
 *   fx        none | hop | bounce | spin | backflip | upsideDown | shake | float | wobble   (body effect)
 *   face      travel (default when moving) | random | keep (default otherwise)
 *   until     "activity": hold the pose until the visitor moves the mouse / presses a key, then stretch
 *   lines     { chance, when?: "always" | "bored", en: [...], tr: [...] }   speech bubble on start
 *
 * The engine itself relies on these animations existing: idle, run (entrance), wave (greeting, menu),
 * sleep + stretch (falling asleep / waking up), drag (being picked up), jump (landing after a drop).
 */
export const BEHAVIORS = [
  { id: 'idle', anim: 'idle', weight: [24, 4, 8], duration: [2500, 6000],
    lines: { chance: 0.4, when: 'bored', en: ['Anyone there?'], tr: ['Kimse yok mu?'] } },
  { id: 'look', anim: 'look', weight: [12, 8, 6], duration: [1800, 2600] },
  { id: 'walk', anim: 'walk', weight: [28, 16, 0], duration: [0, 0], move: 'walk' },
  { id: 'run', anim: 'run', weight: [5, 10, 0], duration: [0, 0], move: 'run' },
  { id: 'sit', anim: 'sit', weight: [8, 12, 20], duration: [4000, 9000] },
  { id: 'coffee', anim: 'coffee', weight: [6, 10, 0], duration: [5500, 8000],
    lines: { chance: 0.4, en: ['I could use a coffee.'], tr: ['Bir kahveye ihtiyacım var.'] } },
  { id: 'read', anim: 'read', weight: [4, 12, 0], duration: [6000, 10000],
    lines: { chance: 0.4, en: ['Reading docs. Again.'], tr: ['Yine dokümantasyon okuyorum.'] } },
  { id: 'type', anim: 'type', weight: [4, 12, 0], duration: [6000, 10000],
    lines: { chance: 0.4, en: ['git commit -m "one more fix"'], tr: ['git commit -m "bir düzeltme daha"'] } },
  { id: 'jump', anim: 'jump', weight: [6, 8, 0], duration: [900, 900], fx: 'hop',
    lines: { chance: 0.5, en: ['Wheee!'], tr: ['Yaşasın!'] } },
  { id: 'stretch', anim: 'stretch', weight: [3, 8, 6], duration: [2800, 2800] },
  { id: 'sleep', anim: 'sleep', weight: [0, 0, 60], duration: [0, 0], until: 'activity' },
];
