/**
 * The mascot: palette, ASCII parts, head variants and the pose renderer.
 * Palette values are sampled from public/legacy/ME.png (hair, skin, stubble, sweater, eyes).
 * Pants, shoes and props are an artistic choice.
 */
import { Bmp, blit, edit, part, rgba } from './lib.mjs';

export const FW = 28; // frame width
export const FH = 38; // frame height

export const PAL = {
  O: '#241a1c', // outline
  H: '#54403a', // hair
  h: '#7a5d52', // hair highlight
  d: '#3a2a27', // hair shadow / parting
  S: '#e6b3a0', // skin
  l: '#f2cbbb', // skin light
  s: '#c98f80', // skin shadow
  b: '#b98a7d', // stubble
  B: '#9a6e66', // stubble dark
  N: '#4a3733', // eyebrow
  E: '#232a33', // eye dark
  e: '#5b7a94', // iris (grey-blue)
  w: '#f4f1f1', // eye white / highlight
  R: '#c8777c', // lips
  r: '#a85d62', // lips dark
  G: '#6b8283', // sweater
  g: '#546869', // sweater shadow
  c: '#86a09f', // sweater light / rib
  W: '#ece8e6', // undershirt
  J: '#3c4a6a', // jeans
  j: '#50618a', // jeans light
  k: '#2e3a55', // jeans dark
  K: '#f0eeee', // shoe
  q: '#c9c6cc', // shoe shadow
  A: '#c7ccd6', // laptop body
  a: '#9aa1b0', // laptop body dark
  Z: '#1e293b', // screen
  z: '#4ade80', // screen glow
  M: '#f59e0b', // mug
  m: '#c77d06', // mug dark
  P: '#6366f1', // book cover
  p: '#4f46e5', // book cover dark
  Q: '#f8fafc', // page
  u: '#cbd5e1', // page shadow
  y: '#ffffff', // steam / sparkle
};
export const COLORS = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, rgba(v)]));

/* ------------------------------------------------------------------ */
/* Head (16x16) and expression variants                               */
/* ------------------------------------------------------------------ */
const HEAD_ROWS = [
  '....OOOOOOOO....', // 0
  '..OOHHhhHHHHOO..', // 1
  '.OHHhhhHHHHHHHO.', // 2
  'OHHhhHHHHdHHHHHO', // 3
  'OHHHHHHHdHHHhHHO', // 4
  'OHHHdSSSSSdHHHHO', // 5  forehead window under the parting
  'OHHSSSllSSSdHHHO', // 6
  'OHHNNNSSSSNNNHHO', // 7  eyebrows
  'OHHSwESSSSwESHHO', // 8  eyes (top, with highlight)
  'OHHSeeSSSSeeSHHO', // 9  eyes (bottom, grey-blue iris)
  'OHHSSSSssSSSSHHO', // 10 nose
  'OHHbSsbbbbsSbHHO', // 11 moustache stubble, dimples
  '.OHbbbRRRRbbbHO.', // 12 mouth
  '..ObbbbbbbbbbO..', // 13 jaw
  '...ObbbBBbbbO...', // 14 chin
  '....OOOOOOOO....', // 15
];

const withRows = (name, patch) => {
  const rows = HEAD_ROWS.slice();
  for (const [i, r] of Object.entries(patch)) rows[Number(i)] = r;
  return part(name, rows);
};

export const HEAD = part('HEAD', HEAD_ROWS);
export const HEADS = {
  open: HEAD,
  // eyes closed (blink)
  blink: withRows('HEAD_BLINK', { 8: 'OHHSSSSSSSSSSHHO', 9: 'OHHSEESSSSEESHHO' }),
  // happy closed eyes + wider smile (greeting)
  happy: withRows('HEAD_HAPPY', {
    8: 'OHHSEESSSSEESHHO',
    9: 'OHHSSSSSSSSSSHHO',
    12: '.OHbbRRRRRRbbHO.',
  }),
  // looking to the sides
  lookL: withRows('HEAD_LOOK_L', { 8: 'OHHwESSSSwESSHHO', 9: 'OHHeeSSSSeeSSHHO' }),
  lookR: withRows('HEAD_LOOK_R', { 8: 'OHHSSwESSSSwEHHO', 9: 'OHHSSeeSSSSeeHHO' }),
  // looking down (typing / reading)
  down: withRows('HEAD_DOWN', { 8: 'OHHSSSSSSSSSSHHO', 9: 'OHHSwESSSSwESHHO' }),
  // asleep: closed eyes, relaxed mouth
  sleep: withRows('HEAD_SLEEP', {
    8: 'OHHSSSSSSSSSSHHO',
    9: 'OHHSEESSSSEESHHO',
    12: '.OHbbbbRRbbbbHO.',
  }),
  // yawn: eyes squeezed, mouth wide open
  yawn: withRows('HEAD_YAWN', {
    8: 'OHHSSSSSSSSSSHHO',
    9: 'OHHSEESSSSEESHHO',
    12: '.OHbbrrrrrrbbHO.',
    13: '..ObbrRRRRrbbO..',
    14: '...ObbbrrbbbO...',
  }),
  // mouth open a little (reaction)
  gasp: withRows('HEAD_GASP', { 12: '.OHbbbrRRrbbbHO.', 13: '..ObbbbrrbbbbO..' }),
};

/* ------------------------------------------------------------------ */
/* Body parts                                                         */
/* ------------------------------------------------------------------ */
export const TORSO = part('TORSO', [
  '.OccWWccccO.',
  'OGGGGGGGGGGO',
  'OGcGGGGGGGgO',
  'OGcGGGGGGGgO',
  'OGGGGGGGGGgO',
  'OGGGGGGGGGgO',
  'OGGGGGGGGGgO',
  'OGGGGGGGGggO',
  'OccccccccccO',
  '.OOOOOOOOOO.',
]);

export const ARM = part('ARM', [
  'OGG',
  'OGG',
  'OcG',
  'OGG',
  'OGG',
  'OGg',
  'OGg',
  'OSS',
  'OSS',
  '.OO',
]);

// Raised arm, 6 wide (placed at x=20 on the character's right side; flip + x=2 for the left one).
// A/B differ only in the hand position, which is what makes it wave.
const UP_SLEEVE = ['..GGGO', '..GGGO', '..GGgO', '..GGgO', '..GGGO', '..GGGO', '..GGGO', 'GGGGGO', 'GGGGGO', 'OOOOO.'];
export const ARM_UP_A = part('ARM_UP_A', ['..SSS.', '..SSSO', '..SSSO', ...UP_SLEEVE]);
export const ARM_UP_B = part('ARM_UP_B', ['...SSS', '...SSS', '...SSS', ...UP_SLEEVE]);
// Bent arm holding a mug up (sip) or low (hold).
export const ARM_SIP = part('ARM_SIP', ['..SSS.', '..SSSO', '..GGGO', '..GGgO', '..GGGO', 'GGGGGO', 'GGGGGO', 'OOOOO.']);
export const ARM_HOLD = part('ARM_HOLD', ['..SSS.', '..SSSO', 'GGGGGO', 'GGGGGO', 'OOOOO.']);

export const LEG = part('LEG', ['OjJJO', 'OjJJO', 'OjJJO', 'OjJkO', 'OjJkO', 'OjJkO']);
export const SHOE = part('SHOE', ['OKKKqO', 'OOOOOO']);

/* Props */
export const LAPTOP = part('LAPTOP', [
  '.OOOOOOOOOOOO.',
  'OAAAAAAAAAAAAO',
  'OAAAAAaaAAAAAO',
  'OAAAAAaaAAAAAO',
  'OAAAAAAAAAAAAO',
  'OaaaaaaaaaaaaO',
  '.OOOOOOOOOOOO.',
]);
// Open book seen from behind: two covers meeting at the spine.
export const BOOK = part('BOOK', [
  '.OOOOOOOOOO.',
  'OPPPPppPPPPO',
  'OPPPPppPPPPO',
  'OPPPPppPPPPO',
  'OPPPPppPPPPO',
  'OPPPPppPPPpO',
  'OppppppppppO',
  '.OOOOOOOOOO.',
]);
// Same book while a page is being turned (white page sliver on the right).
export const BOOK_TILT = part('BOOK_TILT', [
  '.OOOOOOOOOOQ',
  'OPPPPppPPPQQ',
  'OPPPPppPPQQu',
  'OPPPPppPPQuO',
  'OPPPPppPPPPO',
  'OPPPPppPPPpO',
  'OppppppppppO',
  '.OOOOOOOOOO.',
]);
export const MUG = part('MUG', ['OOOOO.', 'OMMMOO', 'OMMMmO', 'OMMMOO', 'OOOOO.']);
export const STEAM_A = part('STEAM_A', ['y.', '.y']);
export const STEAM_B = part('STEAM_B', ['.y', 'y.']);

/* ------------------------------------------------------------------ */
/* Pose renderer                                                      */
/* ------------------------------------------------------------------ */
export const POS = {
  headX: 6,
  headY: 3,
  torsoX: 8,
  torsoY: 19,
  armLX: 5,
  armRX: 20,
  armY: 20,
  legLX: 8,
  legRX: 15,
  legY: 29,
};

/** Jeans rows for a leg that is `n` rows tall (the last row is repeated when stretched). */
function legPart(n) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(LEG.rows[Math.min(i, LEG.h - 1)]);
  return part('LEG_N', rows);
}

/**
 * Render one frame.
 *  dx/dy        – offset of the upper body (torso, arms, head)
 *  head         – head part, headDx/headDy fine-tune it
 *  lift         – [l, r] how many px each foot is lifted
 *  legsTop      – y where the jeans start (default: follows the body, so legs stretch/compress)
 *  legsFront    – draw the legs over the torso (sitting with knees up)
 *  armL / armR  – {part, x, y, flip} (absolute) or null (hidden); default: hanging arms
 *  behind/front – [{part, x, y, flip}] props drawn before the body / after the head
 */
export function render(o = {}) {
  const f = new Bmp(FW, FH);
  const dx = o.dx ?? 0;
  const dy = o.dy ?? 0;
  const lift = o.lift ?? [0, 0];
  const shoeY = 35;
  const armL = o.armL === undefined ? { part: ARM, x: POS.armLX + dx, y: POS.armY + dy, flip: false } : o.armL;
  const armR = o.armR === undefined ? { part: ARM, x: POS.armRX + dx, y: POS.armY + dy, flip: true } : o.armR;

  const drawLegs = () => {
    [
      [POS.legLX, false, lift[0]],
      [POS.legRX, true, lift[1]],
    ].forEach(([x, flip, up]) => {
      const top = o.legsTop ?? POS.legY + Math.min(dy, 2);
      const n = shoeY - up - top;
      if (n > 0) blit(f, legPart(n), x, top, COLORS, { flip });
      blit(f, SHOE, flip ? x : x - 1, shoeY - up, COLORS, { flip });
    });
  };

  for (const p of o.behind ?? []) blit(f, p.part, p.x, p.y, COLORS, { flip: p.flip });
  if (!o.legsFront) drawLegs();
  blit(f, TORSO, POS.torsoX + dx, POS.torsoY + dy, COLORS);
  if (o.legsFront) drawLegs();
  for (const a of [armL, armR]) if (a) blit(f, a.part, a.x, a.y, COLORS, { flip: a.flip });
  blit(f, o.head ?? HEAD, POS.headX + dx + (o.headDx ?? 0), POS.headY + dy + (o.headDy ?? 0), COLORS);
  for (const p of o.front ?? []) blit(f, p.part, p.x, p.y, COLORS, { flip: p.flip });
  return f;
}

export { edit };
