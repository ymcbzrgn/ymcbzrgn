/**
 * The mascot: head + expressions, body parts and the pose composer.
 *
 * Proportions are chibi: a 22x21 head on a 16 px tall body in a 40x46 frame.
 * Heads and the torso are hand-drawn ASCII (fills only); arms and legs are drawn
 * procedurally from joint positions with light/base/shadow sides, and the outline pass
 * (lib.mjs) adds coloured outlines around every pose. Light comes from the top-left.
 */
import { Bmp, blit, outline, part, rotPart, stamp } from './lib.mjs';
import { MAT, OUTLINE, OUTLINE_PRIORITY, PAL } from './palette.mjs';

export const FW = 40; // frame width
export const FH = 46; // frame height
export const FLOOR = 43; // last row of the shoes (the outline sits on row 44, row 45 stays empty)

/* ------------------------------------------------------------------ */
/* Head (front view, 22x21). Eyes, brows and mouth are stamped on.     */
/* ------------------------------------------------------------------ */
const HEAD_BASE = part('HEAD', [
  '..............hD......', // 0  loose tuft
  '........HHH..hD.......', // 1
  '......HHhhhHHhHD......', // 2
  '....HHhiiihhPhhhHD....', // 3  parting just left of centre
  '...HhiihhhhPHhiiihHD..', // 4
  '..HhhhhhhHPHHhhhiiihD.', // 5
  '.DHhhHHHHPHHhhDHhhiiHD', // 6  fringe swept to the right, split into locks
  'DHHHHHHHSPDHHHHDHhhihD', // 7
  'DHHHHHsSSSSsDHHHDHHHhD', // 8
  'DHHHsSSSSSSSSssDHHHhHD', // 9  forehead, shadow under the fringe
  'DHHHSSSSSSSSSSSSsDHhHD', // 10 brows
  '.DHHSSSSSSSSSSSSSSHHD.', // 11
  '.DHHSSSSSSSSSSSSSSHHD.', // 12 eyes (rows 12-15)
  '..SsSSSSSSSSSSSSSSsS..', // 13 ears
  '..zsSSSSSSSSSSSSSSsz..', // 14
  '..ssSSSSSSSSSSSSSSss..', // 15
  '....SrrSSSSLSSSSrrS...', // 16 blush, nose highlight
  '....SSSSSSSsSSSSSSS...', // 17 nose
  '.....SSSSSSSSSSSSS....', // 18 mouth
  '......sSSSSSSSSSs.....', // 19
  '........ssSSSss.......', // 20 chin
]);
// Three-quarter view turned to the right (walking, running, side poses). Same 22x21 box.
const HEAD_SIDE = part('HEAD_SIDE', [
  '...............hD.....', // 0
  '.........HHH..hD......', // 1
  '.......HHhhhHHhHD.....', // 2
  '.....HHhiiihhPhhhHD...', // 3
  '....HhiihhhhPHhiiihHD.', // 4
  '...HhhhhhhhPHHhhhiiihD', // 5
  '..DHhhhHHHPHHhhDHhhiiD', // 6
  '.DHHHhHHHHSPDHHHDHhhiD', // 7
  'DHHHhHHHHsSSSDHHHDHhD.', // 8
  'DHHhHHHHsSSSSSSssDHhD.', // 9
  'DHhHHHHSSSSSSSSSSsSD..', // 10 brows
  'DHHHHHSSSSSSSSSSSSSS..', // 11
  'DHHHHSSSSSSSSSSSSSSS..', // 12 eyes
  'DHHHDsSSSSSSSSSSSSSS..', // 13
  '.DHDzsSSSSSSSSSSSSSSS.', // 14 ear
  '.DHDzsSSSSSSSSSSSSSSS.', // 15
  '..DDssSSSrrSSSSSSSLrS.', // 16 blush, nose
  '....sSSSSSSSSSSSSSsS..', // 17
  '.....sSSSSSSSSSSSSS...', // 18 mouth
  '......ssSSSSSSSSSs....', // 19
  '........sssSSSSs......', // 20 chin
]);
export const HEAD_W = HEAD_BASE.w;
export const HEAD_H = HEAD_BASE.h;

const P = (name, rows) => part(name, rows);
const EYES = {
  open: P('eye', ['EEE', 'wpI', 'IpI', 'jjj']),
  left: P('eyeL', ['EEE', 'pwI', 'pIj', 'jjj']),
  right: P('eyeR', ['EEE', 'Iwp', 'jIp', 'jjj']),
  up: P('eyeU', ['EEE', 'pwp', 'IIj', 'jjj']),
  down: P('eyeD', ['SSS', 'EEE', 'IpI', 'jjj']),
  half: P('eyeH', ['SSS', 'EEE', 'wpI', 'jjj']),
  blink: P('eyeB', ['SSS', 'SSS', 'EEE', 'SSS']),
  happy: P('eyeHa', ['SSS', 'SES', 'ESE', 'SSS']),
  closed: P('eyeC', ['SSS', 'SSS', 'ESE', 'SES']),
  squeeze: P('eyeSq', ['SSS', 'ESS', 'SEE', 'ESS']),
  wide: P('eyeW', ['EEE', 'WWW', 'WpW', 'WWW']),
  dizzy: P('eyeX', ['SSS', 'ESE', 'SES', 'ESE']),
  ring: P('eyeO', ['SES', 'ESE', 'ESE', 'SES']),
  star: P('eyeS', ['S7S', '777', 'S7S', 'SSS']),
  heart: P('eyeHt', ['SSS', '#S#', '###', 'S#S']),
  squint: P('eyeQ', ['SSS', 'EEE', 'pIp', 'SSS']),
};
const SQUEEZE_R = P('eyeSqR', ['SSS', 'SSE', 'EES', 'SSE']);
const BROWS = {
  flat: [P('b', ['BBB']), P('b', ['BBB']), 0],
  up: [P('b', ['BBB']), P('b', ['BBB']), -1],
  angry: [P('bA', ['B..', '.BB']), P('bA2', ['..B', 'BB.']), -1],
  sad: [P('bS', ['..B', 'BB.']), P('bS2', ['B..', '.BB']), -1],
  none: null,
};
const MOUTHS = {
  smile: P('m', ['m..m', '.mm.']),
  grin: P('mG', ['mmmm', 'mktm', '.mm.']),
  o: P('mO', ['.mm.', 'mkkm', '.mm.']),
  small: P('mo', ['.mm.', '.mm.']),
  yawn: P('mY', ['.mm.', 'mkkm', 'mktm', '.mm.']),
  flat: P('mF', ['SSSS', '.mm.']),
  wavy: P('mW', ['m.mS', 'SmSm']),
  tongue: P('mT', ['mmmm', '.tt.']),
  teeth: P('mTe', ['mmmm', 'mTTm', '.mm.']),
  whistle: P('mWh', ['SSm.', 'SmkS', 'SSm.']),
  frown: P('mFr', ['.mm.', 'm..m']),
  chew: P('mC', ['.mm.', 'mmmm']),
  shout: P('mSh', ['mmmm', 'mkkm', 'mkkm', '.mm.']),
  cat: P('mCat', ['m.mS', '.m.m']),
};
// mouth anchor rows: most mouths start on row 18, tall ones one row higher
const MOUTH_Y = { yawn: 17, shout: 17 };


// Where the features go, per view
const LAYOUT = {
  front: { base: HEAD_BASE, eyeL: [6, 12], eyeR: [13, 12], browL: [6, 10], browR: [13, 10], mouth: [9, 18], defEyes: 'open' },
  side: { base: HEAD_SIDE, eyeL: [9, 12], eyeR: [16, 12], farW: 2, browL: [9, 10], browR: [16, 10], mouth: [14, 18], defEyes: 'right' },
};
const EXTRA_AT = {
  front: { blush: [[4, 16], [15, 16]], sweat: [[18, 8]], tears: [[6, 16], [15, 16]], anger: [[17, 2]] },
  side: { blush: [[7, 16], [16, 16]], sweat: [[19, 8]], tears: [[9, 16], [16, 16]], anger: [[17, 2]] },
};
const EXTRA = {
  blush: [P('bl', ['rrr', 'Srr']), P('bl2', ['rrr', 'rrS'])],
  sweat: [P('sw', ['%.', '%%'])],
  tears: [P('tr', ['%', '%']), P('tr', ['%', '%'])],
  anger: [P('an', ['#.#', '.#.', '#.#'])],
};
const crop2 = (p) => part(p.name + '2', p.rows.map((r) => r.slice(1)));

const cache = new Map();
/**
 * A head with an expression.
 *   view   front | side (three-quarter, facing right)
 *   eyes   name or [left, right]   brows   flat|up|angry|sad|none
 *   mouth  name                    extras  ['blush','sweat','tears','anger']
 */
export function face({ view = 'front', eyes, brows = 'flat', mouth = 'smile', extras = [] } = {}) {
  const key = JSON.stringify([view, eyes, brows, mouth, extras]);
  if (cache.has(key)) return cache.get(key);
  const Lo = LAYOUT[view];
  const e = eyes ?? Lo.defEyes;
  const [eyeL, eyeR] = Array.isArray(e) ? e : [e, e];
  const ov = [];
  const br = BROWS[brows];
  const far = (p) => (Lo.farW ? crop2(p) : p);
  if (br) ov.push([br[0], Lo.browL[0], Lo.browL[1] + br[2]], [far(br[1]), Lo.browR[0], Lo.browR[1] + br[2]]);
  const rEye = eyeR === 'squeeze' && view === 'front' ? SQUEEZE_R : EYES[eyeR];
  ov.push([EYES[eyeL], ...Lo.eyeL], [far(rEye), ...Lo.eyeR]);
  ov.push([MOUTHS[mouth], Lo.mouth[0], (MOUTH_Y[mouth] ?? 18) - 18 + Lo.mouth[1]]);
  for (const x of extras) EXTRA_AT[view][x].forEach((at, i) => ov.push([EXTRA[x][i] ?? EXTRA[x][0], ...at]));
  for (const [p] of ov) if (!p) throw new Error(`face: unknown part in ${key}`);
  const h = stamp(Lo.base, 'HEAD:' + key, ov);
  cache.set(key, h);
  return h;
}

/* ------------------------------------------------------------------ */
/* Torso                                                               */
/* ------------------------------------------------------------------ */
// Front, 16 wide (shoulders are 14), 9 rows: crew neck with the white undershirt, ribbed hem.
export const TORSO = part('TORSO', [
  '....CCQQQQCC....',
  '..cGCqQqqQqCGg..',
  '.cGGcCCCCCCcGgg.',
  '.cGGGGGGGGGGGgg.',
  '.cGGGGGGGGGGGgg.',
  '.cGGGGGGGGGGGgg.',
  '.cGGGGGGGGGGgGg.',
  '.CCcCcCcCcCcCCg.',
  '.cCCCCCCCCCCCcg.',
]);
// Side view (facing right, chest on the right), 12 wide.
export const TORSO_SIDE = part('TORSO_SIDE', [
  '.....CCQQC..',
  '...cGGCqQCg.',
  '..cGGGGCCGg.',
  '..cGGGGGGGg.',
  '..cGGGGGGGg.',
  '..cGGGGGGGg.',
  '..cGGGGGGgg.',
  '..CcCcCcCcg.',
  '..cCCCCCCCg.',
]);

/* ------------------------------------------------------------------ */
/* Limbs                                                               */
/* ------------------------------------------------------------------ */
const LIGHT = [-0.6, -0.8];

/** Rasterise a thick polyline with light / base / shadow sides. */
function stroke(b, pts, r, sym, endSym, endFrom = 1) {
  const ids = [];
  const [lightS, baseS, darkS] = sym;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[k + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const len = Math.sqrt(len2);
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * LIGHT[0] + ny * LIGHT[1] < 0) {
      nx = -nx;
      ny = -ny;
    }
    const x0 = Math.floor(Math.min(ax, bx) - r - 1);
    const x1 = Math.ceil(Math.max(ax, bx) + r + 1);
    const y0 = Math.floor(Math.min(ay, by) - r - 1);
    const y1 = Math.ceil(Math.max(ay, by) + r + 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
        const cx = ax + t * dx;
        const cy = ay + t * dy;
        const ex = x - cx;
        const ey = y - cy;
        if (ex * ex + ey * ey > r * r) continue;
        const side = ex * nx + ey * ny;
        let s = side > 0.5 ? lightS : side < -0.5 ? darkS : baseS;
        if (endSym && k === pts.length - 2 && t >= endFrom) s = side < -0.5 ? endSym[1] : endSym[0];
        ids.push([x, y, s]);
      }
  }
  return ids;
}

/** Put a list of [x, y, symbol] pixels down as one part (with a contour on what is underneath). */
function put(b, pixels, contour = true) {
  if (!pixels.length) return;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pixels) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const rows = [];
  for (let y = minY; y <= maxY; y++) rows.push(new Array(maxX - minX + 1).fill('.'));
  for (const [x, y, s] of pixels) rows[y - minY][x - minX] = s;
  blit(b, part('LIMB', rows.map((r) => r.join(''))), minX, minY, PAL, { contour, outlines: OUTLINE });
}

const unit = (dx, dy) => {
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
};

/**
 * Arm from shoulder through elbow to wrist (absolute frame coordinates).
 *   hand: 'fist' (default) | 'open' | 'none';  thumb: +1 / -1 side of the thumb (perpendicular), 0 = none
 *   back: true for the far arm (drawn darker)
 */
export function arm(b, [sx, sy], [ex, ey], [wx, wy], { hand = 'fist', thumb = 0, back = false } = {}) {
  const sym = back ? ['G', 'g', 'Y'] : ['c', 'G', 'g'];
  const px = stroke(b, [[sx, sy], [ex, ey], [wx, wy]], 1.15, sym, back ? ['g', 'Y'] : ['c', 'g'], 0.8);
  put(b, px);
  if (hand === 'none') return;
  // the hand continues the forearm: two skin pixels, a little thinner, plus a thumb
  const [ux, uy] = unit(wx - ex, wy - ey);
  const len = hand === 'open' ? 2.6 : 1.9;
  const hp = stroke(b, [[wx + ux * 0.9, wy + uy * 0.9], [wx + ux * len, wy + uy * len]], hand === 'open' ? 1.05 : 0.95, back ? ['s', 's', 'z'] : ['S', 'S', 's']);
  if (thumb) {
    const tx = Math.round(wx + ux * 1.2 + uy * thumb * 1.3);
    const ty = Math.round(wy + uy * 1.2 - ux * thumb * 1.3);
    hp.push([tx, ty, back ? 's' : 'S']);
  }
  put(b, hp);
}

/**
 * Leg from hip through knee to ankle, plus a shoe.
 *   shoe: 'front' | 'right' (side view, toes to the right) | 'left' | 'sole' | 'none'
 */
export function leg(b, [hx, hy], [kx, ky], [ax, ay], { shoe = 'front', back = false, flipShoe = false, flipYShoe = false, thin = false } = {}) {
  const sym = back ? ['J', 'u', 'u'] : ['U', 'J', 'u'];
  put(b, stroke(b, [[hx, hy], [kx, ky], [ax, ay]], thin ? 1.15 : 1.55, sym));
  if (shoe === 'none') return;
  const s = SHOES[shoe];
  const [ox, oy] = SHOE_ANCHOR[shoe];
  const sx = Math.round(ax) - (flipShoe ? s.w - 1 - ox : ox);
  const sy = flipYShoe ? Math.round(ay) - (s.h - 1 - oy) : Math.round(ay) - oy;
  blit(b, s, sx, sy, PAL, { flip: flipShoe, flipY: flipYShoe, contour: true, outlines: OUTLINE });
}

const SHOES = {
  front: part('SHOE_F', ['.FFFf', 'vFFFf', 'VVVVV']),
  right: part('SHOE_R', ['FFf...', 'FFFFFf', 'vVVVVV']),
  left: part('SHOE_L', ['...fFF', 'fFFFFF', 'VVVVVv']),
  sole: part('SHOE_S', ['VVV', 'VfV', 'VfV', 'VVV']),
};
SHOES.up = part('SHOE_UP', ['Ff.', 'FFV', 'FFV', 'vfV']); // side view, toes up, sole facing forward (sitting, legs out)
SHOES.down = rotPart(SHOES.right, 1, 'SHOE_DN'); // side view, toes down (lying on the belly, kicking)
// pixel of the shoe that sits under the ankle
const SHOE_ANCHOR = { front: [2, 0], right: [1, 0], left: [4, 0], sole: [1, 0], up: [0, 3], down: [1, 0] };

/* ------------------------------------------------------------------ */
/* Pose composer                                                       */
/* ------------------------------------------------------------------ */
const VIEW = {
  // torso position, shoulders/hips relative to the torso, head offset relative to the torso
  front: { torso: TORSO, at: [12, 27], shL: [1, 2], shR: [14, 2], hipL: [3, 9], hipR: [12, 9], head: [-3, -20] },
  side: { torso: TORSO_SIDE, at: [13, 27], shL: [6, 2], shR: [5, 2], hipL: [7, 9], hipR: [5, 9], head: [-5, -20] },
};

/**
 * Compose one frame. Everything is optional; the default is the neutral standing pose.
 *   view          'front' | 'side' (three-quarter, facing right; the engine mirrors it for left)
 *   dx, dy        offset of the upper body (torso, head, shoulders, hips)
 *   face          expression for face() (view is filled in) or a ready head part
 *   headDx/headDy fine-tune the head; head: {x, y, flip, flipY} absolute override; head: null hides it
 *   torso         part (default per view) or null; torsoAt [x, y] absolute override
 *   arms          fn(j) -> {l, r, backArm?, frontArm?}; j has shoulders/hips/torso position
 *                 each arm: [shoulder, elbow, wrist, opts] (absolute frame coordinates)
 *   legs          fn(j) -> {l, r} with [hip, knee, ankle, opts]
 *   back / mid / front   props [{p, x, y, flip, flipY}] behind everything / over the body / over the head
 *   fx            effect parts on top, never outlined
 *   order         'normal' | 'legsFront' (sitting with knees up)
 */
export function pose(o = {}) {
  const b = new Bmp(FW, FH);
  const view = o.view ?? 'front';
  const V = VIEW[view];
  const dx = o.dx ?? 0;
  const dy = o.dy ?? 0;
  const tx = o.torsoAt?.[0] ?? V.at[0] + dx;
  const ty = o.torsoAt?.[1] ?? V.at[1] + dy;
  const j = {
    tx,
    ty,
    shL: [tx + V.shL[0], ty + V.shL[1]],
    shR: [tx + V.shR[0], ty + V.shR[1]],
    hipL: [tx + V.hipL[0], ty + V.hipL[1]],
    hipR: [tx + V.hipR[0], ty + V.hipR[1]],
    view,
  };
  const L = o.legs ? o.legs(j) : view === 'side' ? sideLegs(j) : standLegs(j, o.lift ?? [0, 0]);
  const A = o.arms ? o.arms(j) : view === 'side' ? sideArms(j) : hangArms(j);

  const drawP = (list) => {
    for (const p of list ?? []) blit(b, p.p, p.x, p.y, PAL, { flip: p.flip, flipY: p.flipY, contour: p.contour ?? true, outlines: OUTLINE });
  };
  const drawLeg = (k) => L[k] && leg(b, ...L[k]);
  const drawArm = (k) => A[k] && arm(b, ...A[k]);
  const backLeg = L.back ?? (view === 'side' ? 'r' : null);

  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const behind = list(A.backArm);
  const inFront = [...list(A.frontArm), ...list(A.overHead)];
  drawP(o.back);
  for (const k of behind) drawArm(k);
  if (o.order !== 'legsFront') {
    if (backLeg) drawLeg(backLeg);
    for (const k of ['l', 'r']) if (k !== backLeg) drawLeg(k);
  }
  if (o.torso !== null) blit(b, o.torso ?? V.torso, tx, ty, PAL, { contour: true, outlines: OUTLINE, flip: o.torsoFlip, flipY: o.torsoFlipY });
  if (o.order === 'legsFront') for (const k of ['l', 'r']) drawLeg(k);
  drawP(o.mid);
  for (const k of ['l', 'r']) if (!behind.includes(k) && !inFront.includes(k)) drawArm(k);
  if (o.head !== null) {
    const fc = o.face && o.face.rows ? o.face : face({ view, ...(o.face ?? {}) });
    const hx = o.head?.x ?? tx + V.head[0] + (o.headDx ?? 0);
    const hy = o.head?.y ?? ty + V.head[1] + (o.headDy ?? 0);
    blit(b, fc, hx, hy, PAL, { flip: o.head?.flip, flipY: o.head?.flipY, contour: true, outlines: OUTLINE });
  }
  for (const k of inFront) drawArm(k);
  drawP(o.front);
  outline(b, OUTLINE, OUTLINE_PRIORITY);
  for (const p of o.fx ?? []) blit(b, p.p, p.x, p.y, PAL, { flip: p.flip, flipY: p.flipY });
  return b;
}

const ANKLE_Y = FLOOR - 2;

/** Front view legs: standing, feet slightly apart. lift = [left, right] px a foot is raised. */
export function standLegs(j, [liftL, liftR] = [0, 0]) {
  const [lx, ly] = j.hipL;
  const [rx, ry] = j.hipR;
  return {
    l: [[lx, ly], [lx, Math.min(ly + 2, ANKLE_Y - liftL)], [lx, ANKLE_Y - liftL], { shoe: 'front' }],
    r: [[rx, ry], [rx, Math.min(ry + 2, ANKLE_Y - liftR)], [rx, ANKLE_Y - liftR], { shoe: 'front', flipShoe: true }],
  };
}

/** Front view arms hanging by the sides. */
export function hangArms(j, { swingL = 0, swingR = 0, raiseL = 0, raiseR = 0 } = {}) {
  const [lx, ly] = j.shL;
  const [rx, ry] = j.shR;
  return {
    l: [[lx, ly], [lx - 1, ly + 3 - raiseL], [lx - 1 + swingL, ly + 6 - raiseL], { thumb: -1 }],
    r: [[rx, ry], [rx + 1, ry + 3 - raiseR], [rx + 1 + swingR, ry + 6 - raiseR], { thumb: 1 }],
  };
}

/** Side view defaults: standing, arms down (far arm behind the body). */
export function sideLegs(j) {
  const [nx, ny] = j.hipL;
  const [fx, fy] = j.hipR;
  return {
    l: [[nx, ny], [nx, ny + 2], [nx, ANKLE_Y], { shoe: 'right', thin: true }],
    r: [[fx, fy], [fx - 1, fy + 2], [fx - 1, ANKLE_Y], { shoe: 'right', back: true, thin: true }],
  };
}
export function sideArms(j, near = [0, 6], far = [0, 6]) {
  const [nx, ny] = j.shL;
  const [fx, fy] = j.shR;
  return {
    backArm: 'r',
    l: [[nx, ny], [nx + Math.round(near[0] / 2), ny + 3], [nx + near[0], ny + near[1]], { thumb: 1 }],
    r: [[fx, fy], [fx + Math.round(far[0] / 2), fy + 3], [fx + far[0], fy + far[1]], { back: true }],
  };
}

export { PAL, MAT };
