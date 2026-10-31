/**
 * Colours and materials of the mascot.
 * Hair, skin, eyes, lips and sweater are sampled from public/legacy/ME.png and nudged a little
 * warmer/brighter so they read at 3x on the teal desktop. Pants, shoes and props are free choices.
 *
 * Every symbol maps to a colour and a material. Materials decide the outline colour that the
 * outline pass puts around a pose ("coloured outlines": dark brown around hair, warm brown
 * around skin, deep sage around the sweater ...), so no frame needs a hand-drawn outline.
 */
import { rgba } from './lib.mjs';

export const MAT = {
  hair: 1,
  skin: 2,
  face: 3, // eyes, brows, mouth: always inside the head, never outlined
  sweater: 4,
  shirt: 5,
  jeans: 6,
  shoe: 7,
  prop: 8, // generic prop: dark slate outline
  paper: 9, // light props (pages, mugs, cards): grey outline
  fx: 10, // sparkles, motion lines, sweat, notes: drawn last, no outline
  duck: 11,
  wood: 12,
  fire: 13, // warm props (pizza, mug)
  metal: 14,
};

/** Outline colour per material (missing = no outline). */
export const OUTLINE = {
  [MAT.hair]: rgba('#2f1d17'),
  [MAT.skin]: rgba('#93574a'),
  [MAT.sweater]: rgba('#2c4037'),
  [MAT.shirt]: rgba('#2c4037'),
  [MAT.jeans]: rgba('#1c2337'),
  [MAT.shoe]: rgba('#3a3e4c'),
  [MAT.prop]: rgba('#222736'),
  [MAT.paper]: rgba('#4a5162'),
  [MAT.duck]: rgba('#8a5a12'),
  [MAT.wood]: rgba('#3d2414'),
  [MAT.fire]: rgba('#6b2f16'),
  [MAT.metal]: rgba('#2b303d'),
};
/** Where two materials meet the same transparent pixel, the earlier one's outline wins. */
export const OUTLINE_PRIORITY = [MAT.hair, MAT.skin, MAT.prop, MAT.metal, MAT.wood, MAT.fire, MAT.duck, MAT.paper, MAT.sweater, MAT.shirt, MAT.jeans, MAT.shoe];

const P = (hex, m) => ({ c: rgba(hex), m });

export const PAL = {
  /* hair: shadow, base, light, highlight strand, parting */
  D: P('#3d2a23', MAT.hair),
  H: P('#583d32', MAT.hair),
  h: P('#77533f', MAT.hair),
  i: P('#9c7459', MAT.hair),
  P: P('#2a1915', MAT.hair),
  /* skin: light, base, shadow, deep shadow, blush */
  L: P('#fde3d3', MAT.skin),
  S: P('#f4c8b2', MAT.skin),
  s: P('#e2a690', MAT.skin),
  z: P('#c98571', MAT.skin),
  r: P('#f0a39c', MAT.skin),
  /* eyes: lash line, pupil, grey-blue iris, iris light, glint, eye white */
  E: P('#2b2226', MAT.face),
  p: P('#363d52', MAT.face),
  I: P('#7189a6', MAT.face),
  j: P('#a8bccf', MAT.face),
  w: P('#ffffff', MAT.face),
  W: P('#f3eeea', MAT.face),
  /* brows, mouth: lip line, lip, inside, tongue, teeth */
  B: P('#4b3128', MAT.face),
  m: P('#a8505c', MAT.face),
  M: P('#d3888d', MAT.face),
  k: P('#6e2b38', MAT.face),
  t: P('#e47d87', MAT.face),
  T: P('#fffaf4', MAT.face),
  /* sage sweater: base, shadow, light, rib/highlight, fold line */
  G: P('#6d8b7b', MAT.sweater),
  g: P('#55705f', MAT.sweater),
  c: P('#87a594', MAT.sweater),
  C: P('#a3bfae', MAT.sweater),
  Y: P('#43584c', MAT.sweater),
  /* white undershirt collar */
  Q: P('#f4f1ec', MAT.shirt),
  q: P('#cfc8be', MAT.shirt),
  /* jeans */
  J: P('#3f4c6e', MAT.jeans),
  U: P('#56668f', MAT.jeans),
  u: P('#2e3854', MAT.jeans),
  /* sneakers: white, shade, sole, orange accent */
  F: P('#f6f5f2', MAT.shoe),
  f: P('#c9cbd3', MAT.shoe),
  V: P('#8d93a3', MAT.shoe),
  v: P('#f08a3c', MAT.shoe),

  /* ---- props ---- */
  // laptop / phone / dark gadgets
  A: P('#c7ccd8', MAT.metal), // aluminium
  a: P('#9aa1b2', MAT.metal), // aluminium shade
  Z: P('#1f2937', MAT.prop), // screen / phone body
  '1': P('#4ade80', MAT.prop), // terminal green
  '2': P('#60a5fa', MAT.prop), // screen blue
  // book (indigo) / pages
  b: P('#6366f1', MAT.prop),
  d: P('#4338ca', MAT.prop),
  e: P('#fbfaf7', MAT.paper),
  l: P('#d9d6cf', MAT.paper),
  // mug (orange) / coffee
  O: P('#f59e0b', MAT.fire),
  o: P('#c2740a', MAT.fire),
  n: P('#6b3f1d', MAT.fire), // coffee
  // rubber duck
  K: P('#fcd34d', MAT.duck),
  x: P('#e8b923', MAT.duck),
  X: P('#f97316', MAT.duck), // beak
  // pizza
  R: P('#f6c453', MAT.fire), // cheese
  N: P('#d9822b', MAT.fire), // crust
  y: P('#d1453b', MAT.fire), // pepperoni
  // wood (drumsticks, rod, baton handle, comb)
  '3': P('#a86b3c', MAT.wood),
  '4': P('#7a4a26', MAT.wood),
  // juggling balls / confetti / misc colours
  '5': P('#ef4444', MAT.prop), // red
  '6': P('#3b82f6', MAT.prop), // blue
  '7': P('#facc15', MAT.prop), // yellow
  '8': P('#a855f7', MAT.prop), // purple
  '9': P('#22c55e', MAT.prop), // green
  /* ---- effects (no outline) ---- */
  '*': P('#ffffff', MAT.fx), // sparkle / glint
  '+': P('#fde68a', MAT.fx), // warm sparkle
  '~': P('#e2e8f0', MAT.fx), // steam / speed line
  '%': P('#7dd3fc', MAT.fx), // sweat / water
  '!': P('#ffffff', MAT.fx), // marks drawn in white
  '#': P('#ef4444', MAT.fx), // anger mark / heart red
  '&': P('#1e293b', MAT.fx), // dark marks (? !)
  '^': P('#f472b6', MAT.fx), // pink
  ':': P('#bfdbfe', MAT.fx), // pale blue (bubble)
  '=': P('#94a3b8', MAT.fx), // grey motion line
};
