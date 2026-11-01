/**
 * Animation frames for the mascot. Each animation is a list of 40x46 bitmaps; build-sprites.mjs
 * lays them out as one row per animation in the sprite sheet. FPS is the playback speed.
 *
 * Poses are described with joints (see character.mjs `pose`): arms as [elbow, wrist] offsets from
 * the shoulder, legs as [knee offset, ankle] from the hip, all in frame pixels. The side view faces
 * right; the engine mirrors the sprite when the twin walks left.
 *
 * The engine does not restart an animation when it switches to it, so every loop is written to
 * read well from any frame (one-shot stories are short loops that make sense when repeated).
 */
import { FLOOR, TORSO_SIDE, face, pose, standLegs } from './character.mjs';
import { part, place, rotPart, rotFrame } from './lib.mjs';
import * as PR from './props.mjs';

const FX = PR.FX;
const A = FLOOR - 2; // ankle row when standing
const add = (p, d) => [p[0] + d[0], p[1] + d[1]];
const limb = (base, s, def = {}) => (s ? [base, add(base, [s[0], s[1]]), add(base, [s[2], s[3]]), { ...def, ...(s[4] ?? {}) }] : null);
const legAt = (hip, s, def) => (s ? [hip, add(hip, [s[0], s[1]]), [hip[0] + s[2], s[3]], { ...def, ...(s[4] ?? {}) }] : null);

/* front view: arms [elbowDx, elbowDy, wristDx, wristDy, opts] from each shoulder; legs [kneeDx, kneeDy, ankleDx, ankleY, opts] */
const fa = (l, r, extra = {}) => (j) => ({ l: limb(j.shL, l, { thumb: -1 }), r: limb(j.shR, r, { thumb: 1 }), ...extra });
const fl = (l, r) => (j) => ({ l: legAt(j.hipL, l, { shoe: 'front' }), r: legAt(j.hipR, r, { shoe: 'front', flipShoe: true }) });
/* side view: l = near arm/leg (in front), r = far arm/leg (behind, darker) */
const sa = (n, f, extra = {}) => (j) => ({ backArm: 'r', l: limb(j.shL, n, { thumb: 1 }), r: limb(j.shR, f, { back: true }), ...extra });
const sl = (n, f) => (j) => ({ l: legAt(j.hipL, n, { shoe: 'right', thin: true }), r: legAt(j.hipR, f, { shoe: 'right', back: true, thin: true }) });

const F = (o = {}) => pose(o);
const S = (o = {}) => pose({ view: 'side', ...o });
const fx = (p, x, y, flip) => ({ p, x, y, flip });
const prop = (p, x, y, flip) => ({ p, x, y, flip });

/* common arm specs (front) */
const HANG_L = [-1, 3, -1, 6];
const HANG_R = [1, 3, 1, 6];
const UP_L = [-3, -3, -3, -8, { hand: 'open', thumb: 1 }];
const UP_R = [3, -3, 3, -8, { hand: 'open', thumb: -1 }];
const HIP_L = [-3, 2, -1, 5];
const HIP_R = [3, 2, 1, 5];
const OUT_L = [-3, 0, -6, 0, { hand: 'open', thumb: 1 }];
const OUT_R = [3, 0, 6, 0, { hand: 'open', thumb: -1 }];
const BEHIND = { backArm: ['l', 'r'] };
const BEHIND_L = [0, 3, 2, 5, { hand: 'none' }];
const BEHIND_R = [0, 3, -2, 5, { hand: 'none' }];

/* sitting on the floor, front view, knees up (legs drawn over the body) */
const SIT = { dy: 6, order: 'legsFront', legs: fl([0, -5, -1, A], [0, -5, 1, A]) };
/* sitting on the floor, side view, knees up and feet out to the right */
const sitSide = (n = [5, -5, 9, A], f = [5, -4, 8, A]) => ({
  dy: 6,
  legs: (j) => ({
    l: legAt(j.hipL, n, { shoe: 'right', thin: true }),
    r: legAt(j.hipR, f, { shoe: 'right', back: true, thin: true }),
  }),
});

/** Playback speed (frames per second) per animation – read by the app through mascot.meta.ts. */
export const FPS = {};
export const ANIMS = {};
const anim = (name, fps, frames) => {
  FPS[name] = fps;
  ANIMS[name] = frames;
};

/* =================================================================== */
/* Engine animations                                                    */
/* =================================================================== */

// Standing and breathing, a blink, a little glance
anim('idle', 2.5, [
  F({}),
  F({ dy: 1, arms: fa([-1, 3, -1, 5], [1, 3, 1, 5]) }),
  F({ face: { eyes: 'blink' } }),
  F({ face: { eyes: 'open', mouth: 'small' } }),
]);

// Glancing around (also used by the welcome window)
anim('look', 2, [
  F({ face: { eyes: 'left' }, headDx: -1 }),
  F({ face: { eyes: 'left', mouth: 'small' }, headDx: -1 }),
  F({ face: { eyes: 'right' }, headDx: 1 }),
  F({ face: { eyes: 'right', brows: 'up', mouth: 'small' }, headDx: 1 }),
]);

// Walk cycle (side view)
anim('walk', 8, [
  S({ legs: sl([1, 2, 3, A], [-1, 2, -3, A]), arms: sa([-1, 3, -2, 6], [1, 3, 2, 6]) }),
  S({ dy: -1, legs: sl([0, 2, 0, A], [1, 2, 0, A - 2]), arms: sa([0, 3, 0, 6], [0, 3, 0, 6]) }),
  S({ legs: sl([-1, 2, -3, A], [1, 2, 3, A]), arms: sa([1, 3, 2, 6], [-1, 3, -2, 6]) }),
  S({ dy: -1, legs: sl([1, 2, 0, A - 2], [0, 2, 0, A]), arms: sa([0, 3, 0, 6], [0, 3, 0, 6]) }),
]);

// Run cycle: leaning in, arms pumping, airborne frames
const RUNF = { mouth: 'o' };
anim('run', 12, [
  S({ dx: 1, dy: -1, headDx: 1, face: RUNF, legs: sl([2, 1, 5, A - 1], [-2, 2, -5, A - 3]), arms: sa([-3, 2, -4, 5], [2, 3, 4, 1]) }),
  S({ dx: 1, dy: -3, headDx: 1, face: RUNF, legs: sl([2, 1, 1, A - 4], [-1, 2, -3, A - 4]), arms: sa([0, 3, 2, 3], [-1, 3, 1, 4]) }),
  S({ dx: 1, dy: -1, headDx: 1, face: RUNF, legs: sl([-2, 2, -5, A - 3], [2, 1, 5, A - 1]), arms: sa([2, 3, 4, 1], [-3, 2, -4, 5]) }),
  S({ dx: 1, dy: -3, headDx: 1, face: RUNF, legs: sl([-1, 2, -3, A - 4], [2, 1, 1, A - 4]), arms: sa([-1, 3, 1, 4], [0, 3, 2, 3]) }),
]);

// Waving hello (greeting + menu)
const waveArm = (hx) => [3, -2, 4 + hx, -6, { hand: 'open', thumb: -1 }];
anim('wave', 6, [
  F({ face: { eyes: 'happy', mouth: 'grin' }, arms: fa(HANG_L, waveArm(0)) }),
  F({ face: { eyes: 'happy', mouth: 'grin' }, arms: fa(HANG_L, waveArm(2)) }),
  F({ face: { eyes: 'open', mouth: 'grin' }, arms: fa(HANG_L, waveArm(0)) }),
  F({ face: { eyes: 'happy', mouth: 'smile' }, arms: fa(HANG_L, waveArm(-1)) }),
]);

// Asleep sitting up: nodding, with a bubble that grows and pops
const sleepF = { eyes: 'closed', mouth: 'small', brows: 'none' };
anim('sleep', 1.5, [
  F({ ...SIT, headDy: 1, face: sleepF, arms: fa([0, 3, 2, 3], [0, 3, -2, 3]), fx: [fx(FX.bubbleS, 25, 31)] }),
  F({ ...SIT, headDy: 2, face: sleepF, arms: fa([0, 3, 2, 3], [0, 3, -2, 3]), fx: [fx(FX.bubble, 25, 30)] }),
  F({ ...SIT, headDy: 2, headDx: 1, face: { ...sleepF, mouth: 'o' }, arms: fa([0, 3, 2, 3], [0, 3, -2, 3]), fx: [fx(FX.bubbleL, 24, 28)] }),
  F({ ...SIT, headDy: 1, face: sleepF, arms: fa([0, 3, 2, 3], [0, 3, -2, 3]) }),
]);

// Stretch + yawn (waking up)
anim('stretch', 2, [
  F({ face: { eyes: 'closed', mouth: 'small' }, arms: fa([-3, -1, -2, -6, { hand: 'open', thumb: 1 }], [3, -1, 2, -6, { hand: 'open', thumb: -1 }]) }),
  F({ dy: -1, lift: [1, 1], face: { eyes: 'squeeze', mouth: 'yawn', brows: 'sad' }, arms: fa(UP_L, UP_R) }),
  F({ dy: -1, lift: [1, 1], face: { eyes: 'squeeze', mouth: 'yawn', brows: 'sad', extras: ['tears'] }, arms: fa([-2, -4, -1, -9, { hand: 'open' }], [2, -4, 1, -9, { hand: 'open' }]) }),
  F({ face: { eyes: 'half', mouth: 'smile' }, arms: fa(HANG_L, HANG_R) }),
]);

// Picked up by the collar: dangling, kicking, a bit alarmed
const dragF = { eyes: 'wide', brows: 'up', mouth: 'o', extras: ['sweat'] };
anim('drag', 6, [
  F({ dy: -2, lift: [3, 1], face: dragF, arms: fa([-3, -2, -4, -6, { hand: 'open' }], [3, -2, 4, -6, { hand: 'open' }]) }),
  F({ dy: -2, lift: [1, 3], face: { ...dragF, mouth: 'wavy' }, arms: fa([-3, -1, -5, -4, { hand: 'open' }], [3, -1, 5, -4, { hand: 'open' }]) }),
  F({ dy: -2, lift: [3, 1], face: dragF, arms: fa([-3, -2, -4, -6, { hand: 'open' }], [3, -2, 4, -6, { hand: 'open' }]) }),
  F({ dy: -2, lift: [2, 2], face: { ...dragF, eyes: 'squeeze' }, arms: fa([-3, -1, -5, -4, { hand: 'open' }], [3, -1, 5, -4, { hand: 'open' }]) }),
]);

// Jump: crouch, airborne, land
anim('jump', 6, [
  F({ dy: 3, face: { eyes: 'squint', mouth: 'flat' }, arms: fa([-2, 2, -3, 4], [2, 2, 3, 4]) }),
  F({ dy: -2, lift: [3, 3], face: { eyes: 'happy', mouth: 'grin' }, arms: fa(UP_L, UP_R) }),
  F({ dy: 2, face: { eyes: 'open', mouth: 'o' }, arms: fa([-3, 1, -5, 3, { hand: 'open' }], [3, 1, 5, 3, { hand: 'open' }]) }),
]);

/* =================================================================== */
/* Everyday                                                              */
/* =================================================================== */

// Sitting on the floor, legs out, feet swinging
const sitArms = sa([-2, 3, -4, 6, { hand: 'open' }], [-2, 3, -4, 6, { hand: 'open' }]);
anim('sit', 2, [
  S({ ...sitSide([5, -5, 9, A], [5, -4, 8, A]), arms: sitArms, face: { eyes: 'right' } }),
  S({ ...sitSide([5, -5, 10, A - 2], [5, -4, 8, A]), arms: sitArms, face: { eyes: 'right', mouth: 'small' } }),
  S({ ...sitSide([5, -5, 9, A], [5, -4, 9, A - 2]), arms: sitArms, face: { eyes: 'blink' } }),
  S({ ...sitSide([5, -5, 10, A - 1], [5, -4, 8, A]), arms: sitArms, face: { eyes: 'happy' } }),
]);

// Coffee: hold, sip (eyes closed), aah, hold
const MUGAT = (x, y) => [prop(PR.MUG, x, y)];
anim('coffee', 2.5, [
  F({ arms: fa(HANG_L, [2, 4, -1, 3, { thumb: -1 }], { frontArm: 'r' }), front: MUGAT(23, 31) }),
  F({ face: { eyes: 'closed', mouth: 'small' }, arms: fa(HANG_L, [2, 3, -3, -1, { thumb: -1 }], { frontArm: 'r' }), front: [...MUGAT(20, 24), fx(FX.steam, 21, 20)] }),
  F({ face: { eyes: 'happy', mouth: 'small', extras: ['blush'] }, arms: fa(HANG_L, [2, 3, -3, -1, { thumb: -1 }], { frontArm: 'r' }), front: [...MUGAT(20, 24), fx(FX.steam2, 21, 20)] }),
  F({ face: { eyes: 'happy', mouth: 'smile' }, arms: fa(HANG_L, [2, 4, -1, 3, { thumb: -1 }], { frontArm: 'r' }), front: [...MUGAT(23, 31), fx(FX.steam, 24, 27)] }),
]);

// Turkish tea (çay) in a tulip glass, with a simit
anim('cay', 2, [
  F({ arms: fa([1, 4, 2, 3, { thumb: 1 }], [2, 4, -1, 2, { thumb: -1 }], { frontArm: ['l', 'r'] }), front: [prop(PR.CAY, 24, 29), prop(PR.SIMIT, 13, 31), fx(FX.steam, 25, 26)] }),
  F({ face: { eyes: 'closed', mouth: 'small' }, arms: fa([1, 4, 2, 3, { thumb: 1 }], [2, 3, -3, -2, { thumb: -1 }], { frontArm: ['l', 'r'] }), front: [prop(PR.CAY, 21, 23), prop(PR.SIMIT, 13, 31)] }),
  F({ face: { eyes: 'happy', mouth: 'grin', extras: ['blush'] }, arms: fa([1, 4, 2, 3, { thumb: 1 }], [2, 4, -1, 2, { thumb: -1 }], { frontArm: ['l', 'r'] }), front: [prop(PR.CAY, 24, 29), prop(PR.SIMIT, 13, 31), fx(FX.sparkle, 30, 22)] }),
  F({ face: { eyes: 'happy', mouth: 'chew' }, arms: fa([2, 3, 5, -2, { thumb: 1 }], [2, 4, -1, 2, { thumb: -1 }], { frontArm: ['l', 'r'] }), front: [prop(PR.CAY, 24, 29), prop(PR.SIMIT, 15, 25)] }),
]);

// Reading a book on the knees, turning a page
const readArms = fa([1, 3, 3, 1], [-1, 3, -3, 1], { frontArm: ['l', 'r'] });
anim('read', 1.5, [
  F({ ...SIT, headDy: 1, face: { eyes: 'down', mouth: 'small' }, arms: readArms, front: [prop(PR.BOOK, 14, 31)] }),
  F({ ...SIT, headDy: 1, face: { eyes: 'down', mouth: 'smile' }, arms: readArms, front: [prop(PR.BOOK, 14, 31)] }),
  F({ ...SIT, headDy: 1, face: { eyes: 'down', mouth: 'small' }, arms: readArms, front: [prop(PR.BOOK_TURN, 14, 31)] }),
  F({ ...SIT, headDy: 1, face: { eyes: 'blink', mouth: 'small' }, arms: readArms, front: [prop(PR.BOOK, 14, 31)] }),
]);

// Typing on a laptop, sitting on the floor
const typeArms = (a, b) => fa([1, 3, 3, 2 + a, { hand: 'none' }], [-1, 3, -3, 2 + b, { hand: 'none' }]);
const LAP = (glow) => [prop(PR.LAPTOP, 14, 33), ...(glow ? [fx(FX.spark1, 20, 30)] : [])];
anim('type', 8, [
  F({ ...SIT, face: { eyes: 'down', mouth: 'small' }, arms: typeArms(0, 1), front: LAP(false) }),
  F({ ...SIT, face: { eyes: 'down', mouth: 'small' }, arms: typeArms(1, 0), front: LAP(true) }),
  F({ ...SIT, face: { eyes: 'down', mouth: 'flat' }, arms: typeArms(0, 1), front: LAP(false) }),
  F({ ...SIT, face: { eyes: 'down', mouth: 'small' }, arms: typeArms(1, 1), front: LAP(false) }),
]);

// Scrolling a phone, a giggle
const phoneArms = fa([1, 4, 4, 2, { thumb: 1 }], [-1, 4, -4, 2, { thumb: -1 }], { frontArm: ['l', 'r'] });
anim('phone', 3, [
  F({ headDy: 1, face: { eyes: 'down', mouth: 'small' }, arms: phoneArms, front: [prop(PR.PHONE_LIT, 18, 31)] }),
  F({ headDy: 1, face: { eyes: 'down', mouth: 'smile' }, arms: phoneArms, front: [prop(PR.PHONE, 18, 31)] }),
  F({ headDy: 1, face: { eyes: 'happy', mouth: 'grin' }, arms: phoneArms, front: [prop(PR.PHONE_LIT, 18, 31)] }),
  F({ headDy: 1, face: { eyes: 'down', mouth: 'smile' }, arms: phoneArms, front: [prop(PR.PHONE, 18, 31)] }),
]);

// Checking an imaginary watch, tapping a foot
const watchArms = fa([2, 3, 6, 1, { thumb: 1 }], HIP_R, { frontArm: 'l' });
const WATCH = [prop(PR.WATCH, 17, 29)];
anim('watch', 3, [
  F({ headDx: -1, face: { eyes: 'down', mouth: 'flat' }, arms: watchArms, front: WATCH }),
  F({ headDx: -1, lift: [0, 2], face: { eyes: 'down', mouth: 'flat' }, arms: watchArms, front: WATCH }),
  F({ face: { eyes: 'left', brows: 'sad', mouth: 'flat' }, arms: watchArms, front: WATCH }),
  F({ lift: [0, 2], face: { eyes: 'half', brows: 'sad', mouth: 'wavy' }, arms: watchArms, front: WATCH }),
]);

// Thinking: hand on the chin, a question mark shows up
const thinkArms = fa(HIP_L, [1, 4, -4, -1, { thumb: -1 }], { frontArm: 'r' });
anim('think', 2, [
  F({ face: { eyes: 'up', mouth: 'flat' }, arms: thinkArms }),
  F({ face: { eyes: 'up', mouth: 'small' }, arms: thinkArms, fx: [fx(FX.q, 29, 3)] }),
  F({ headDx: 1, face: { eyes: 'right', brows: 'up', mouth: 'flat' }, arms: thinkArms, fx: [fx(FX.q, 30, 2)] }),
  F({ face: { eyes: 'up', mouth: 'cat' }, arms: thinkArms, fx: [fx(FX.q, 29, 3)] }),
]);

// Whistling with hands behind the back, swaying
anim('whistle', 3, [
  F({ headDx: -1, face: { eyes: 'up', mouth: 'whistle' }, arms: fa(BEHIND_L, BEHIND_R, BEHIND), fx: [fx(FX.note, 31, 10)] }),
  F({ face: { eyes: 'closed', mouth: 'whistle' }, arms: fa(BEHIND_L, BEHIND_R, BEHIND), fx: [fx(FX.note, 32, 7), fx(FX.note2, 27, 3)] }),
  F({ headDx: 1, face: { eyes: 'left', mouth: 'whistle' }, arms: fa(BEHIND_L, BEHIND_R, BEHIND), fx: [fx(FX.note2, 29, 1)] }),
  F({ face: { eyes: 'closed', mouth: 'whistle' }, lift: [0, 1], arms: fa(BEHIND_L, BEHIND_R, BEHIND), fx: [fx(FX.note, 31, 9)] }),
]);

// Rubber-duck debugging: explaining the code to the duck
const duckArms = fa([1, 3, 4, 0, { thumb: 1 }], HANG_R, { frontArm: 'l' });
anim('duck', 3, [
  F({ face: { eyes: 'left', mouth: 'o' }, arms: duckArms, front: [prop(PR.DUCK, 13, 25)] }),
  F({ face: { eyes: 'left', mouth: 'smile' }, arms: duckArms, front: [prop(PR.DUCK, 13, 25)] }),
  F({ face: { eyes: 'left', brows: 'up', mouth: 'small' }, arms: duckArms, front: [prop(PR.DUCK_TALK, 13, 25)] }),
  F({ face: { eyes: 'happy', mouth: 'grin' }, arms: fa([1, 3, 4, 0, { thumb: 1 }], [3, -2, 4, -6, { hand: 'open', thumb: -1 }], { frontArm: 'l' }), front: [prop(PR.DUCK, 13, 25)], fx: [fx(FX.ex, 30, 4)] }),
]);

// Pizza: admire, bite, chew, bliss
const pizzaArm = (dx, dy) => fa(HANG_L, [2, 4, dx, dy, { thumb: -1 }], { frontArm: 'r' });
anim('pizza', 3, [
  F({ face: { eyes: 'heart', mouth: 'o' }, arms: pizzaArm(-1, 1), front: [prop(PR.PIZZA, 23, 28)] }),
  F({ face: { eyes: 'closed', mouth: 'o' }, arms: pizzaArm(-4, -2), front: [prop(PR.PIZZA, 19, 23)] }),
  F({ face: { eyes: 'happy', mouth: 'chew', extras: ['blush'] }, arms: pizzaArm(-1, 1), front: [prop(PR.PIZZA_BIT, 23, 28)] }),
  F({ face: { eyes: 'happy', mouth: 'small', extras: ['blush'] }, arms: pizzaArm(-1, 1), front: [prop(PR.PIZZA_BIT, 23, 28)], fx: [fx(FX.heart, 31, 6)] }),
]);

// Staring up at something (the cursor)
anim('stare', 1.5, [
  F({ headDy: -1, face: { eyes: 'up', mouth: 'small' } }),
  F({ headDy: -1, face: { eyes: 'up', mouth: 'small' } }),
  F({ headDy: -1, face: { eyes: 'up', mouth: 'o' }, fx: [fx(FX.ex, 30, 2)] }),
  F({ headDy: -1, face: { eyes: 'blink', mouth: 'small' } }),
]);

// Fixing the hair in a hand mirror: it has to be perfect
anim('hairfix', 3, [
  F({ face: { eyes: 'left', mouth: 'smile' }, arms: fa([0, 3, 2, -2, { thumb: 1 }], [3, -3, -1, -11, { thumb: -1 }], { frontArm: 'l', overHead: 'r' }), front: [prop(PR.MIRROR, 12, 22), prop(PR.COMB, 19, 8)] }),
  F({ face: { eyes: 'left', mouth: 'smile' }, arms: fa([0, 3, 2, -2, { thumb: 1 }], [3, -3, 1, -11, { thumb: -1 }], { frontArm: 'l', overHead: 'r' }), front: [prop(PR.MIRROR, 12, 22), prop(PR.COMB, 22, 8)] }),
  F({ face: { eyes: 'left', mouth: 'cat' }, arms: fa([0, 3, 2, -2, { thumb: 1 }], [3, -3, 3, -10, { thumb: -1 }], { frontArm: 'l', overHead: 'r' }), front: [prop(PR.MIRROR, 12, 22), prop(PR.COMB, 25, 9)] }),
  F({ face: { eyes: ['happy', 'happy'], mouth: 'cat', extras: ['blush'] }, arms: fa([0, 3, 2, -2, { thumb: 1 }], [3, -1, 5, -5, { hand: 'open', thumb: -1 }], { frontArm: 'l' }), front: [prop(PR.MIRROR, 12, 22)], fx: [fx(FX.sparkle, 27, 5), fx(FX.spark1, 14, 7)] }),
]);

/* =================================================================== */
/* Sudden and silly (front view)                                        */
/* =================================================================== */

// Jumping jacks
anim('jacks', 6, [
  F({ face: { eyes: 'squint', mouth: 'flat' }, arms: fa(HANG_L, HANG_R) }),
  F({ dy: -1, face: { eyes: 'open', mouth: 'o' }, legs: fl([-1, 2, -3, A], [1, 2, 3, A]), arms: fa([-3, -1, -5, -4, { hand: 'open' }], [3, -1, 5, -4, { hand: 'open' }]) }),
  F({ dy: -3, face: { eyes: 'happy', mouth: 'grin' }, legs: fl([-2, 2, -4, A - 2], [2, 2, 4, A - 2]), arms: fa([-3, -3, -2, -9, { hand: 'open' }], [3, -3, 2, -9, { hand: 'open' }]) }),
  F({ dy: -1, face: { eyes: 'open', mouth: 'o' }, legs: fl([-1, 2, -3, A], [1, 2, 3, A]), arms: fa([-3, -1, -5, -4, { hand: 'open' }], [3, -1, 5, -4, { hand: 'open' }]) }),
]);

// "Works on my machine" shrug
const shrugArms = fa([-3, 2, -6, 0, { hand: 'open', thumb: 1 }], [3, 2, 6, 0, { hand: 'open', thumb: -1 }]);
anim('shrug', 3, [
  F({ face: { eyes: 'half', mouth: 'flat' }, arms: fa([-2, 3, -4, 4, { hand: 'open' }], [2, 3, 4, 4, { hand: 'open' }]) }),
  F({ dy: -1, face: { eyes: 'half', brows: 'up', mouth: 'cat' }, arms: shrugArms }),
  F({ dy: -1, headDx: -1, face: { eyes: 'closed', brows: 'up', mouth: 'cat' }, arms: shrugArms }),
  F({ dy: -1, headDx: 1, face: { eyes: 'half', brows: 'up', mouth: 'smile' }, arms: shrugArms }),
]);

// Facepalm, with a slow head shake
const palm = [1, 3, -5, -7, { hand: 'open', thumb: -1 }];
anim('facepalm', 2, [
  F({ face: { eyes: 'half', brows: 'sad', mouth: 'flat' }, arms: fa(HANG_L, [2, 3, -2, -2, { hand: 'open' }], { frontArm: 'r' }) }),
  F({ face: { eyes: 'closed', brows: 'sad', mouth: 'flat' }, arms: fa(HANG_L, palm, { overHead: 'r' }) }),
  F({ headDx: -1, face: { eyes: 'closed', brows: 'sad', mouth: 'wavy', extras: ['sweat'] }, arms: fa(HANG_L, [1, 3, -6, -7, { hand: 'open', thumb: -1 }], { overHead: 'r' }) }),
  F({ headDx: 1, face: { eyes: 'closed', brows: 'sad', mouth: 'wavy', extras: ['sweat'] }, arms: fa(HANG_L, [1, 3, -4, -7, { hand: 'open', thumb: -1 }], { overHead: 'r' }) }),
]);

// Sneeze: ah... ahh... CHOO! sniff
anim('sneeze', 3, [
  F({ headDy: -1, face: { eyes: 'half', brows: 'sad', mouth: 'o' }, arms: fa(HANG_L, HANG_R) }),
  F({ dy: -1, headDy: -2, face: { eyes: 'squeeze', brows: 'sad', mouth: 'yawn' }, arms: fa([-2, 2, -3, 4], [2, 2, 3, 4]) }),
  F({ dy: 1, headDy: 1, face: { eyes: 'squeeze', mouth: 'shout' }, arms: fa([-3, 1, -5, 3, { hand: 'open' }], [3, 1, 5, 3, { hand: 'open' }]), fx: [fx(FX.spray, 30, 23), fx(FX.spray, 32, 27)] }),
  F({ face: { eyes: 'half', mouth: 'wavy', extras: ['blush'] }, arms: fa(HANG_L, [1, 4, -4, -2, { thumb: -1 }], { frontArm: 'r' }) }),
]);

// Hiccups
anim('hiccup', 4, [
  F({ face: { eyes: 'open', mouth: 'flat' } }),
  F({ dy: -2, lift: [2, 2], face: { eyes: 'wide', brows: 'up', mouth: 'o' }, arms: fa([-2, 2, -3, 4, { hand: 'open' }], [2, 2, 3, 4, { hand: 'open' }]), fx: [fx(FX.hic, 30, 22)] }),
  F({ face: { eyes: 'half', mouth: 'wavy', extras: ['blush'] } }),
  F({ face: { eyes: 'open', mouth: 'small' } }),
]);

// Juggling three balls
const JUG = [[8, 26], [11, 3], [26, 1], [30, 25]];
const balls = (k) => [prop(PR.BALL_R, ...JUG[k % 4]), prop(PR.BALL_B, ...JUG[(k + 1) % 4]), prop(PR.BALL_Y, ...JUG[(k + 2) % 4])];
anim('juggle', 6, [
  F({ face: { eyes: 'up', mouth: 'small' }, arms: fa([-1, 3, -2, 0, { hand: 'open' }], [1, 3, 2, 3, { hand: 'open' }]), front: balls(0) }),
  F({ face: { eyes: 'up', mouth: 'o' }, arms: fa([-1, 3, -1, 3, { hand: 'open' }], [1, 3, 2, 0, { hand: 'open' }]), front: balls(1) }),
  F({ face: { eyes: 'up', mouth: 'small' }, arms: fa([-1, 3, -2, 0, { hand: 'open' }], [1, 3, 2, 3, { hand: 'open' }]), front: balls(2) }),
  F({ face: { eyes: 'up', mouth: 'tongue' }, arms: fa([-1, 3, -1, 3, { hand: 'open' }], [1, 3, 2, 0, { hand: 'open' }]), front: balls(3) }),
]);

// Balancing a book on the head
const balanceArms = (t) => fa([-3, -t, -6, 1 - 2 * t, { hand: 'open', thumb: 1 }], [3, t, 6, 1 + 2 * t, { hand: 'open', thumb: -1 }]);
anim('balance', 3, [
  F({ face: { eyes: 'up', mouth: 'tongue' }, arms: balanceArms(0), front: [prop(PR.BOOK_FLAT, 15, 5)] }),
  F({ headDx: -1, lift: [0, 3], face: { eyes: 'up', mouth: 'tongue', extras: ['sweat'] }, arms: balanceArms(1), front: [prop(PR.BOOK_FLAT, 13, 5)] }),
  F({ face: { eyes: 'up', mouth: 'o' }, arms: balanceArms(0), front: [prop(PR.BOOK_FLAT, 15, 5)] }),
  F({ headDx: 1, lift: [3, 0], face: { eyes: 'up', mouth: 'tongue' }, arms: balanceArms(-1), front: [prop(PR.BOOK_FLAT, 17, 5)] }),
]);

// Air guitar
const guitar = (strum, f) => F({
  headDy: strum ? 1 : 0,
  face: f,
  legs: fl([-1, 2, -3, A], [1, 2, 3, A]),
  arms: fa([-3, -1, -7, -3, { hand: 'open', thumb: 1 }], [1, 4, -3, strum ? 6 : 3, { thumb: -1 }], { frontArm: 'r' }),
  fx: strum ? [fx(FX.note, 31, 8)] : [fx(FX.note2, 30, 4)],
});
anim('guitar', 6, [
  guitar(0, { eyes: 'squeeze', mouth: 'grin' }),
  guitar(1, { eyes: 'squeeze', mouth: 'shout' }),
  guitar(0, { eyes: 'closed', mouth: 'grin' }),
  guitar(1, { eyes: 'squeeze', mouth: 'teeth' }),
]);

// Conducting an orchestra with a baton
const BAT = [[33, 15], [31, 27], [22, 22], [33, 21]];
const conduct = (k, f) => F({
  face: f,
  arms: fa([-3, 1, -5, 3, { hand: 'open', thumb: 1 }], [[3, -3, 5, -7], [3, 1, 5, 3], [2, -1, -1, -3], [3, -2, 6, -3]][k], { overHead: 'r' }),
  front: [prop(PR.BATON, ...BAT[k])],
  fx: [fx(k % 2 ? FX.note : FX.note2, 7, 6 + k)],
});
anim('conduct', 4, [
  conduct(0, { eyes: 'closed', brows: 'up', mouth: 'small' }),
  conduct(1, { eyes: 'closed', mouth: 'o' }),
  conduct(2, { eyes: 'closed', brows: 'up', mouth: 'small' }),
  conduct(3, { eyes: 'happy', mouth: 'smile' }),
]);

// Disco point
const discoUp = fa(HIP_L, [3, -3, 6, -8, { thumb: -1 }]);
const discoDown = fa(HIP_L, [-1, 3, -6, 6, { thumb: -1 }], { frontArm: 'r' });
anim('disco', 4, [
  F({ dx: 1, face: { eyes: 'half', mouth: 'cat' }, arms: discoUp, lift: [0, 1], fx: [fx(FX.sparkle, 32, 12)] }),
  F({ dx: -1, face: { eyes: 'half', mouth: 'o' }, arms: discoDown }),
  F({ dx: 1, face: { eyes: 'happy', mouth: 'cat' }, arms: discoUp, lift: [0, 1], fx: [fx(FX.star, 31, 9)] }),
  F({ dx: -1, face: { eyes: 'half', mouth: 'smile' }, arms: discoDown, fx: [fx(FX.spark1, 6, 30)] }),
]);

// Headbanging, rock fists up
const rock = fa([-3, -2, -4, -6], [3, -2, 4, -6]);
anim('headbang', 8, [
  F({ face: { eyes: 'squeeze', mouth: 'shout' }, arms: rock }),
  F({ dy: 1, headDy: 2, face: { eyes: 'squeeze', mouth: 'grin' }, arms: rock }),
  F({ face: { eyes: 'squeeze', mouth: 'teeth' }, arms: rock }),
  F({ dy: 1, headDy: 2, face: { eyes: 'closed', mouth: 'shout' }, arms: rock, fx: [fx(FX.note, 31, 6)] }),
]);

// Floss dance
const floss = (k) => {
  const L = [[-2, 3, -4, 6], [0, 3, 2, 6], [-1, 3, -3, 6], [0, 3, 2, 6]][k];
  const R = [[-2, 3, -5, 6], [1, 3, 3, 6], [2, 3, 5, 6], [1, 3, 3, 6]][k];
  const front = [['r'], ['l'], ['l'], ['l']][k];
  return F({ dx: [1, 0, -1, 0][k], headDx: [-1, 0, 1, 0][k], face: { eyes: k % 2 ? 'happy' : 'half', mouth: k % 2 ? 'tongue' : 'cat' }, arms: fa(L, R, { frontArm: front }) });
};
anim('dance', 6, [floss(0), floss(1), floss(2), floss(3)]);

// Over-caffeinated: wide eyes, trembling mug (the engine shakes the whole body too)
const cafF = { eyes: 'wide', brows: 'up', mouth: 'teeth', extras: ['sweat'] };
anim('caffeine', 10, [
  F({ face: cafF, arms: fa(HANG_L, [2, 4, -1, 3, { thumb: -1 }], { frontArm: 'r' }), front: [prop(PR.MUG, 23, 31), fx(FX.steam, 24, 27)] }),
  F({ dx: 1, face: { ...cafF, eyes: ['wide', 'open'] }, arms: fa([-1, 3, -2, 6], [2, 4, -1, 2, { thumb: -1 }], { frontArm: 'r' }), front: [prop(PR.MUG, 24, 30), fx(FX.steam2, 25, 26)] }),
  F({ face: cafF, arms: fa(HANG_L, [2, 4, -1, 3, { thumb: -1 }], { frontArm: 'r' }), front: [prop(PR.MUG, 23, 31), fx(FX.steam2, 24, 27)] }),
  F({ dx: -1, face: { ...cafF, mouth: 'grin' }, arms: fa([-1, 3, 0, 6], [2, 4, -1, 3, { thumb: -1 }], { frontArm: 'r' }), front: [prop(PR.MUG, 22, 31), fx(FX.steam, 23, 27)] }),
]);

// Celebration with confetti ("tests passed!")
anim('celebrate', 5, [
  F({ face: { eyes: 'star', mouth: 'grin' }, arms: fa(UP_L, UP_R), fx: [fx(FX.confetti, 6, 2), fx(FX.confetti2, 24, 6)] }),
  F({ dy: -2, lift: [2, 2], face: { eyes: 'happy', mouth: 'grin' }, arms: fa([-3, -3, -4, -8, { hand: 'open' }], [3, -3, 4, -8, { hand: 'open' }]), fx: [fx(FX.confetti2, 6, 5), fx(FX.confetti, 25, 1)] }),
  F({ face: { eyes: 'star', mouth: 'grin' }, arms: fa(UP_L, UP_R), fx: [fx(FX.confetti, 7, 8), fx(FX.confetti2, 24, 3)] }),
  F({ dy: -2, lift: [2, 2], face: { eyes: 'happy', mouth: 'teeth' }, arms: fa([-3, -3, -4, -8, { hand: 'open' }], [3, -3, 4, -8, { hand: 'open' }]), fx: [fx(FX.confetti2, 5, 1), fx(FX.confetti, 25, 7)] }),
]);

// Flexing tiny biceps
const flexArms = fa([-6, 0, -7, -5], [6, 0, 7, -5]);
anim('flex', 3, [
  F({ face: { eyes: 'half', mouth: 'cat' }, arms: flexArms }),
  F({ dy: -1, face: { eyes: 'half', brows: 'up', mouth: 'cat' }, arms: flexArms, fx: [fx(FX.sparkle, 4, 23), fx(FX.sparkle, 33, 23)] }),
  F({ headDx: 1, face: { eyes: 'closed', mouth: 'o', extras: ['blush'] }, arms: flexArms, fx: [fx(FX.heart, 33, 18)] }),
  F({ face: { eyes: 'happy', mouth: 'grin' }, arms: flexArms, fx: [fx(FX.spark1, 6, 22)] }),
]);

// Angry-cute stomping ("it doesn't compile")
const angryF = { eyes: 'squint', brows: 'angry', mouth: 'frown', extras: ['anger'] };
const fists = fa([-2, 3, -3, 6], [2, 3, 3, 6]);
anim('angry', 6, [
  F({ lift: [2, 0], face: angryF, arms: fists, fx: [fx(FX.puff, 9, 4)] }),
  F({ face: { ...angryF, mouth: 'teeth' }, arms: fists, fx: [fx(FX.dust, 13, 41)] }),
  F({ lift: [0, 2], face: angryF, arms: fists, fx: [fx(FX.puff, 27, 3)] }),
  F({ face: { ...angryF, mouth: 'teeth' }, arms: fists, fx: [fx(FX.dust, 24, 41)] }),
]);

// Dizzy: stars circling (the engine wobbles the body)
const dizzyArms = fa([-3, 2, -5, 5, { hand: 'open' }], [3, 2, 5, 5, { hand: 'open' }]);
anim('dizzy', 4, [
  F({ headDx: -1, face: { eyes: 'dizzy', mouth: 'wavy' }, arms: dizzyArms, fx: [fx(FX.dizzy, 12, 2), fx(FX.star, 26, 4)] }),
  F({ face: { eyes: 'ring', mouth: 'wavy' }, arms: dizzyArms, fx: [fx(FX.dizzy2, 22, 1), fx(FX.star, 10, 5)] }),
  F({ headDx: 1, face: { eyes: 'dizzy', mouth: 'o' }, arms: dizzyArms, fx: [fx(FX.dizzy, 18, 0), fx(FX.star, 29, 6)] }),
  F({ face: { eyes: 'ring', mouth: 'wavy', extras: ['sweat'] }, arms: dizzyArms, fx: [fx(FX.dizzy2, 8, 3), fx(FX.star, 24, 2)] }),
]);

// A bug on the floor: spot it, stomp it, proud
anim('bug', 4, [
  F({ face: { eyes: 'down', brows: 'up', mouth: 'o' }, arms: fa(HANG_L, HANG_R), front: [prop(PR.BUG, 31, 40)], fx: [fx(FX.ex, 31, 33)] }),
  F({ dy: -1, lift: [0, 4], face: { eyes: 'squint', brows: 'angry', mouth: 'teeth' }, arms: fa([-3, 1, -5, 2, { hand: 'open' }], [3, 0, 5, -2, { hand: 'open' }]), front: [prop(PR.BUG_B, 29, 40)] }),
  F({ dy: 1, face: { eyes: 'squeeze', mouth: 'shout' }, arms: fa([-3, 1, -5, 3, { hand: 'open' }], [3, 1, 5, 3, { hand: 'open' }]), fx: [fx(FX.impact, 27, 36), fx(FX.dust2, 28, 41)] }),
  F({ face: { eyes: 'happy', mouth: 'grin' }, arms: fa(HIP_L, HIP_R), fx: [fx(FX.sparkle, 31, 8)] }),
]);

// Making a heart with both hands
const heartArms = fa([1, 3, 5, 0, { hand: 'open', thumb: 1 }], [-1, 3, -5, 0, { hand: 'open', thumb: -1 }], { frontArm: ['l', 'r'] });
anim('heart', 3, [
  F({ face: { eyes: 'happy', mouth: 'smile', extras: ['blush'] }, arms: heartArms, front: [prop(FX.heartBig, 17, 28)] }),
  F({ face: { eyes: 'happy', mouth: 'smile', extras: ['blush'] }, arms: heartArms, front: [prop(FX.heartBig, 17, 28)], fx: [fx(FX.heart, 29, 12)] }),
  F({ face: { eyes: ['open', 'happy'], mouth: 'cat', extras: ['blush'] }, arms: heartArms, front: [prop(FX.heartBig, 17, 28)], fx: [fx(FX.heart, 31, 8), fx(FX.heart, 7, 14)] }),
  F({ face: { eyes: 'happy', mouth: 'grin', extras: ['blush'] }, arms: heartArms, front: [prop(FX.heartBig, 17, 28)], fx: [fx(FX.heart, 8, 9)] }),
]);

// Vibing with headphones
const hp = (dy) => [prop(PR.HEADPHONES, 9, 7 + dy)];
anim('headphones', 4, [
  F({ face: { eyes: 'closed', mouth: 'smile' }, front: hp(0), arms: fa(HANG_L, [3, -1, 4, -6, { hand: 'open', thumb: -1 }]), fx: [fx(FX.note, 33, 4)] }),
  F({ headDy: 1, dy: 1, face: { eyes: 'closed', mouth: 'whistle' }, front: hp(2), arms: fa(HANG_L, [3, 0, 4, -5, { hand: 'open', thumb: -1 }]) }),
  F({ face: { eyes: 'closed', mouth: 'smile' }, front: hp(0), arms: fa(HANG_L, [3, -1, 4, -6, { hand: 'open', thumb: -1 }]), fx: [fx(FX.note2, 31, 2)] }),
  F({ headDy: 1, dy: 1, face: { eyes: 'happy', mouth: 'grin' }, front: hp(2), arms: fa(HANG_L, [3, 0, 4, -5, { hand: 'open', thumb: -1 }]), lift: [1, 0] }),
]);

// Selfie with a peace sign
const selfieArms = fa([-3, -3, -6, -7, { thumb: 1 }], [2, 1, -1, -5, { hand: 'open', thumb: -1 }], { overHead: 'r' });
anim('selfie', 3, [
  F({ face: { eyes: ['happy', 'open'], mouth: 'tongue' }, arms: selfieArms, front: [prop(PR.PHONE, 5, 16)] }),
  F({ headDx: -1, face: { eyes: ['happy', 'open'], mouth: 'cat' }, arms: selfieArms, front: [prop(PR.PHONE, 5, 16)] }),
  F({ headDx: -1, face: { eyes: 'squeeze', mouth: 'grin' }, arms: selfieArms, front: [prop(PR.PHONE, 5, 16)], fx: [fx(FX.flash, 3, 9)] }),
  F({ face: { eyes: 'open', mouth: 'smile' }, arms: fa([-3, -2, -5, -5, { thumb: 1 }], HANG_R), front: [prop(PR.PHONE_LIT, 5, 19)] }),
]);

// Bubble gum: chew, blow, bigger, POP
anim('bubblegum', 2, [
  F({ face: { eyes: 'half', mouth: 'chew' } }),
  F({ face: { eyes: 'half', mouth: 'small' }, front: [prop(FX.gumS, 19, 25)] }),
  F({ face: { eyes: 'up', mouth: 'small' }, front: [prop(FX.gum, 17, 23)] }),
  F({ face: { eyes: 'wide', brows: 'up', mouth: 'o', extras: ['blush'] }, fx: [fx(FX.pop, 17, 22)] }),
]);

// Yo-yo: down to the floor and back up
const YO = [30, 36, 40, 34];
anim('yoyo', 6, YO.map((y, k) => F({
  face: { eyes: k === 0 ? 'happy' : 'down', mouth: k === 2 ? 'o' : 'smile' },
  arms: fa(HANG_L, [3, 1, 4, k === 0 ? 0 : 2, { thumb: -1 }]),
  front: [prop(PR.YOYO, 30, y)],
  fx: y > 33 ? [{ p: part('STRING', Array(y - 32).fill('!')), x: 31, y: 32 }] : [],
})));

// Hula hoop: hips sway, hoop shifts around
const hoop = (cx, front) => {
  const rows = [];
  const w = 23;
  const h = 7;
  for (let y = 0; y < h; y++) {
    let r = '';
    for (let x = 0; x < w; x++) {
      const ex = (x - (w - 1) / 2) / ((w - 1) / 2);
      const ey = (y - (h - 1) / 2) / ((h - 1) / 2);
      const d = ex * ex + ey * ey;
      const onRing = d > 0.62 && d < 1.12;
      const isFront = y >= (h - 1) / 2;
      r += onRing && isFront === front ? ((x >> 1) % 2 ? '5' : '7') : '.';
    }
    rows.push(r);
  }
  return { p: part(front ? 'HOOP_F' : 'HOOP_B', rows), x: cx - 11, y: 31 };
};
anim('hula', 6, [0, 1, 2, 3].map((k) => {
  const sway = [1, 0, -1, 0][k];
  return F({
    dx: sway,
    face: { eyes: k % 2 ? 'happy' : 'open', mouth: 'grin' },
    arms: fa(UP_L, UP_R),
    back: [{ ...hoop(20 - 2 * sway, false), y: 30 }],
    front: [{ ...hoop(20 - 2 * sway, true), y: 30 }],
  });
}));

// Meditating, cross-legged (the engine makes it float)
const medLegs = (j) => ({
  l: [j.hipL, [j.hipL[0] - 4, j.hipL[1] - 1], [j.hipL[0] + 4, j.hipL[1]], { shoe: 'none' }],
  r: [j.hipR, [j.hipR[0] + 4, j.hipR[1] - 1], [j.hipR[0] - 4, j.hipR[1]], { shoe: 'none' }],
});
const medArms = fa([-1, 3, -3, 6, { hand: 'open', thumb: 1 }], [1, 3, 3, 6, { hand: 'open', thumb: -1 }]);
anim('meditate', 2, [
  F({ dy: 6, order: 'legsFront', legs: medLegs, arms: medArms, face: { eyes: 'closed', mouth: 'small' }, fx: [fx(FX.ommm, 6, 14)] }),
  F({ dy: 6, order: 'legsFront', legs: medLegs, arms: medArms, face: { eyes: 'closed', mouth: 'small' }, fx: [fx(FX.ommm, 26, 10)] }),
  F({ dy: 6, order: 'legsFront', legs: medLegs, arms: medArms, face: { eyes: 'closed', mouth: 'smile' }, fx: [fx(FX.sparkle, 5, 20), fx(FX.spark1, 33, 16)] }),
  F({ dy: 6, order: 'legsFront', legs: medLegs, arms: medArms, face: { eyes: 'closed', mouth: 'small' }, fx: [fx(FX.ommm, 16, 6)] }),
]);

// Drumming on a tiny drum (and a cymbal crash)
const drum = (k) => F({
  headDy: k % 2,
  face: { eyes: k === 2 ? 'squeeze' : 'closed', mouth: k === 2 ? 'shout' : 'tongue' },
  legs: fl([-1, 2, -2, A], [1, 2, 2, A]),
  arms: fa(k % 2 ? [-1, 3, 1, 1] : [-1, 3, 2, 5], k % 2 ? [1, 3, -2, 5] : [1, 3, -1, 1], { frontArm: ['l', 'r'] }),
  front: [
    prop(PR.DRUM, 13, 35),
    prop(k % 2 ? PR.STICK_HI : PR.STICK_LO, 15, k % 2 ? 27 : 31),
    prop(k % 2 ? PR.STICK_LO : PR.STICK_HI, 21, k % 2 ? 31 : 27, true),
  ],
  fx: k === 2 ? [fx(FX.sparkle, 31, 18), fx(FX.spark1, 6, 20)] : [fx(FX.spark1, k % 2 ? 23 : 16, 33)],
});
anim('drums', 8, [drum(0), drum(1), drum(2), drum(3)]);

// Tucked up into a ball (the engine flips it over: backflip)
const tuck = (f) => F({
  dy: 3,
  order: 'legsFront',
  face: f,
  legs: fl([0, -4, -1, 38], [0, -4, 1, 38]),
  arms: fa([1, 3, 3, 1], [-1, 3, -3, 1], { frontArm: ['l', 'r'] }),
});
anim('tuck', 4, [tuck({ eyes: 'squeeze', mouth: 'grin' }), tuck({ eyes: 'squeeze', mouth: 'o' })]);

// Headstand: upside down on the head (feet wiggling); with a spin it becomes a headspin
const inverted = ({ legsL, legsR, armsOut = 0, f, wiggle = 0 }) => {
  const head = face({ eyes: f?.eyes ?? 'happy', mouth: f?.mouth ?? 'frown', brows: f?.brows ?? 'flat', extras: f?.extras ?? [] });
  return pose({
    torsoAt: [12, 14],
    torsoFlipY: true,
    head: { x: 9, y: 23, flipY: true },
    face: head,
    legs: () => ({
      l: [[15, 14], [15 + legsL[0], 11], [15 + legsL[1], legsL[2]], { shoe: 'front', flipYShoe: true }],
      r: [[24, 14], [24 + legsR[0], 11], [24 + legsR[1], legsR[2]], { shoe: 'front', flipShoe: true, flipYShoe: true }],
    }),
    arms: () => ({
      l: [[13, 20], [10, 22 + armsOut], [7 + wiggle, 25 + armsOut], { hand: 'open' }],
      r: [[26, 20], [29, 22 + armsOut], [32 + wiggle, 25 + armsOut], { hand: 'open' }],
    }),
  });
};
anim('headstand', 3, [
  inverted({ legsL: [0, 0, 7], legsR: [0, 0, 7], f: { eyes: 'happy', mouth: 'frown' } }),
  inverted({ legsL: [-1, -2, 7], legsR: [1, 1, 8], armsOut: 1, f: { eyes: 'happy', mouth: 'frown', extras: ['blush'] } }),
  inverted({ legsL: [0, 0, 7], legsR: [0, 0, 7], f: { eyes: 'squeeze', mouth: 'frown' } }),
  inverted({ legsL: [-1, -1, 8], legsR: [1, 2, 7], armsOut: -1, wiggle: 1, f: { eyes: 'happy', mouth: 'o' } }),
]);
anim('headspin', 8, [
  inverted({ legsL: [-2, -5, 8], legsR: [2, 5, 8], f: { eyes: 'squeeze', mouth: 'frown' } }),
  inverted({ legsL: [-1, -4, 7], legsR: [2, 4, 9], armsOut: 2, f: { eyes: 'squeeze', mouth: 'o' } }),
]);

// Cartwheel: an X pose rolled over in quarter turns (the engine moves it along)
const xPose = F({
  face: { eyes: 'happy', mouth: 'grin' },
  legs: fl([-2, 2, -4, A], [2, 2, 4, A]),
  arms: fa([-3, -2, -6, -5, { hand: 'open' }], [3, -2, 6, -5, { hand: 'open' }]),
});
anim('cartwheel', 8, [0, 1, 2, 3].map((t) => place(rotFrame(xPose, t), FLOOR + 1, 20)));

// Ballet: arms rounded overhead, up on the toes, one knee raised (the engine spins it: pirouette)
anim('ballet', 4, [
  F({ dy: -1, face: { eyes: 'closed', mouth: 'small' }, legs: fl([0, 2, 0, A - 1], [-2, 1, -4, A - 4]), arms: fa([-3, -3, 0, -9, { hand: 'open' }], [3, -3, 0, -9, { hand: 'open' }]) }),
  F({ dy: -1, face: { eyes: 'closed', mouth: 'smile' }, legs: fl([0, 2, 0, A - 1], [-2, 1, -4, A - 4]), arms: fa([-3, -3, 0, -9, { hand: 'open' }], [3, -3, 0, -9, { hand: 'open' }]), fx: [fx(FX.spark1, 33, 14)] }),
]);

/* =================================================================== */
/* On the move (side view, facing right)                                 */
/* =================================================================== */

// Tiptoeing like a cartoon burglar
const paws = sa([1, 2, 3, 1], [1, 2, 3, 0]);
anim('tiptoe', 6, [
  S({ face: { eyes: 'half', mouth: 'small' }, legs: sl([1, 2, 2, A - 1], [-1, 2, -2, A - 1]), arms: paws }),
  S({ dy: -1, face: { eyes: 'right', mouth: 'small' }, legs: sl([2, 0, 2, A - 4], [0, 2, 0, A - 1]), arms: paws }),
  S({ face: { eyes: 'half', mouth: 'cat' }, legs: sl([-1, 2, -2, A - 1], [1, 2, 2, A - 1]), arms: paws }),
  S({ dy: -1, face: { eyes: 'right', mouth: 'small' }, legs: sl([0, 2, 0, A - 1], [2, 0, 2, A - 4]), arms: paws }),
]);

// Sneaking up low (stalking the cursor)
const claws = (k) => sa([2, 1, 5, 1 - k, { hand: 'open' }], [2, 1, 5, 2 + k, { hand: 'open' }]);
anim('sneak', 5, [
  S({ dy: 3, dx: 1, headDx: 2, face: { eyes: 'squint', mouth: 'cat' }, legs: sl([3, 0, 3, A], [-2, 1, -4, A]), arms: claws(0) }),
  S({ dy: 2, dx: 1, headDx: 2, face: { eyes: 'squint', mouth: 'cat' }, legs: sl([1, 1, 1, A - 1], [0, 1, -1, A]), arms: claws(1) }),
  S({ dy: 3, dx: 1, headDx: 2, face: { eyes: 'squint', mouth: 'small' }, legs: sl([-2, 1, -4, A], [3, 0, 3, A]), arms: claws(0) }),
  S({ dy: 2, dx: 1, headDx: 2, face: { eyes: 'half', mouth: 'cat' }, legs: sl([0, 1, -1, A], [1, 1, 1, A - 1]), arms: claws(1) }),
]);

// Running away in a panic, arms in the air
const fleeF = { eyes: 'wide', brows: 'sad', mouth: 'shout', extras: ['sweat'] };
anim('flee', 14, [
  S({ dx: 1, dy: -1, face: fleeF, legs: sl([2, 1, 5, A - 1], [-2, 2, -5, A - 3]), arms: sa([3, -2, 6, -6, { hand: 'open' }], [-3, -2, -6, -5, { hand: 'open' }], { overHead: 'l' }) }),
  S({ dx: 1, dy: -3, face: { ...fleeF, eyes: 'squeeze', extras: ['tears'] }, legs: sl([2, 1, 1, A - 4], [-1, 2, -3, A - 4]), arms: sa([-3, -2, -6, -5, { hand: 'open' }], [3, -2, 6, -6, { hand: 'open' }], { overHead: 'l' }) }),
  S({ dx: 1, dy: -1, face: fleeF, legs: sl([-2, 2, -5, A - 3], [2, 1, 5, A - 1]), arms: sa([3, -2, 6, -6, { hand: 'open' }], [-3, -2, -6, -5, { hand: 'open' }], { overHead: 'l' }) }),
  S({ dx: 1, dy: -3, face: { ...fleeF, eyes: 'squeeze', extras: ['tears'] }, legs: sl([-1, 2, -3, A - 4], [2, 1, 1, A - 4]), arms: sa([-3, -2, -6, -5, { hand: 'open' }], [3, -2, 6, -6, { hand: 'open' }], { overHead: 'l' }) }),
]);

// Happy skipping
anim('skip', 6, [
  S({ dy: -3, face: { eyes: 'happy', mouth: 'grin' }, legs: sl([3, -1, 3, A - 5], [0, 2, -1, A - 3]), arms: sa([-2, 1, -3, -2, { hand: 'open' }], [2, 1, 3, -2, { hand: 'open' }]) }),
  S({ dy: 0, face: { eyes: 'happy', mouth: 'smile' }, legs: sl([1, 2, 1, A], [-2, 1, -4, A - 2]), arms: sa([0, 3, 0, 6], [0, 3, 0, 6]) }),
  S({ dy: -3, face: { eyes: 'happy', mouth: 'grin' }, legs: sl([0, 2, -1, A - 3], [3, -1, 3, A - 5]), arms: sa([2, 1, 3, -2, { hand: 'open' }], [-2, 1, -3, -2, { hand: 'open' }]) }),
  S({ dy: 0, face: { eyes: 'happy', mouth: 'smile' }, legs: sl([-2, 1, -4, A - 2], [1, 2, 1, A]), arms: sa([0, 3, 0, 6], [0, 3, 0, 6]) }),
]);

// Robot walk: stiff legs, arms at right angles
const robotF = { eyes: 'squint', mouth: 'flat' };
anim('robot', 4, [
  S({ face: robotF, legs: sl([1, 2, 2, A], [-1, 2, -2, A]), arms: sa([0, 4, 4, 4], [0, 4, 4, 2]) }),
  S({ dy: -1, face: { ...robotF, eyes: 'right' }, legs: sl([0, 2, 0, A], [0, 2, 0, A - 1]), arms: sa([0, 4, 4, 2], [0, 4, 4, 4]) }),
  S({ face: robotF, legs: sl([-1, 2, -2, A], [1, 2, 2, A]), arms: sa([0, 4, 4, 4], [0, 4, 4, 2]) }),
  S({ dy: -1, face: { ...robotF, mouth: 'small' }, legs: sl([0, 2, 0, A - 1], [0, 2, 0, A]), arms: sa([0, 4, 4, 2], [0, 4, 4, 4]) }),
]);

// Moonwalk: facing in, gliding backwards (the engine moves it towards the edge)
const mjF = { eyes: 'half', mouth: 'cat' };
anim('moonwalk', 6, [
  S({ face: mjF, legs: sl([1, 1, 1, A - 1], [-1, 2, -3, A]), arms: sa([2, 2, 3, -1], [0, 3, -1, 6]) }),
  S({ face: mjF, legs: sl([0, 2, -1, A], [0, 2, -1, A]), arms: sa([2, 2, 3, -1], [0, 3, -1, 6]) }),
  S({ face: { ...mjF, mouth: 'o' }, legs: sl([-1, 2, -3, A], [1, 1, 1, A - 1]), arms: sa([2, 2, 3, -1], [0, 3, -1, 6]) }),
  S({ face: mjF, legs: sl([0, 2, -1, A], [0, 2, -1, A]), arms: sa([2, 2, 3, 0], [0, 3, -1, 6]), fx: [fx(FX.sparkle, 30, 8)] }),
]);

// Zoomies: flat-out sprint with speed lines
const zoomF = { eyes: 'wide', mouth: 'grin' };
anim('zoomies', 16, [
  S({ dx: 2, dy: -1, headDx: 2, face: zoomF, legs: sl([3, 0, 6, A - 2], [-3, 1, -6, A - 3]), arms: sa([-4, 1, -7, 2], [4, 0, 7, -1]), fx: [fx(FX.speed, 0, 22), fx(FX.dust, 3, 40)] }),
  S({ dx: 2, dy: -2, headDx: 2, face: zoomF, legs: sl([2, 1, 0, A - 4], [-1, 2, -3, A - 5]), arms: sa([0, 3, 3, 2], [0, 3, 3, 2]), fx: [fx(FX.speed, 1, 24), fx(FX.dust2, 1, 40)] }),
  S({ dx: 2, dy: -1, headDx: 2, face: { ...zoomF, mouth: 'tongue' }, legs: sl([-3, 1, -6, A - 3], [3, 0, 6, A - 2]), arms: sa([4, 0, 7, -1], [-4, 1, -7, 2]), fx: [fx(FX.speed, 0, 23), fx(FX.dust, 4, 40)] }),
  S({ dx: 2, dy: -2, headDx: 2, face: zoomF, legs: sl([-1, 2, -3, A - 5], [2, 1, 0, A - 4]), arms: sa([0, 3, 3, 2], [0, 3, 3, 2]), fx: [fx(FX.speed, 1, 21), fx(FX.dust2, 2, 40)] }),
]);

/* ---------------- lying / prone poses ---------------- */
const TORSO_PRONE = rotPart(TORSO_SIDE, 1, 'TORSO_PRONE'); // face down, head end on the right
const TORSO_SUPINE = rotPart(TORSO_SIDE, 3, 'TORSO_SUPINE'); // on the back, head end on the left

/** Face-down body on the floor; up = arm length the chest is lifted (push-ups, crawling, faceplant). */
function prone({ lift = 7, f = {}, headDx = 0, headDy = 0, legs, arms, fx: effects = [], front = [] }) {
  const top = FLOOR - 9 - lift; // torso box top
  return pose({
    view: 'side',
    torso: TORSO_PRONE,
    torsoAt: [13, top - 1],
    head: { x: 17 + headDx, y: top - 13 + headDy },
    face: { view: 'side', ...f },
    legs: () => legs(top),
    arms: () => arms(top),
    fx: effects,
    front,
  });
}
const plankLegs = (top) => ({
  back: 'r',
  l: [[14, top + 6], [9, top + 7 + Math.round((FLOOR - top - 8) / 2)], [4, FLOOR - 3], { shoe: 'down', thin: true }],
  r: [[14, top + 4], [9, top + 5 + Math.round((FLOOR - top - 8) / 2)], [4, FLOOR - 4], { shoe: 'down', back: true, thin: true }],
});
// arm from the shoulder at the head end down to the floor; bend > 0 pushes the elbow back
const floorArms = (bend, nearX = 21, farX = 20) => (top) => ({
  backArm: 'r',
  l: [[nearX, top + 3], [nearX - bend, top + 3 + Math.max(2, (FLOOR - top - 4) >> 1)], [nearX, FLOOR - 2], { hand: 'open' }],
  r: [[farX, top + 2], [farX - bend, top + 2 + Math.max(2, (FLOOR - top - 4) >> 1)], [farX - 1, FLOOR - 2], { hand: 'open', back: true }],
});

// Push-ups
anim('pushup', 3, [
  prone({ lift: 7, f: { eyes: 'right', mouth: 'flat' }, legs: plankLegs, arms: floorArms(0) }),
  prone({ lift: 2, headDy: 1, f: { eyes: 'squeeze', mouth: 'teeth' }, legs: plankLegs, arms: floorArms(4) }),
  prone({ lift: 2, headDy: 1, f: { eyes: 'squeeze', mouth: 'teeth', extras: ['sweat'] }, legs: plankLegs, arms: floorArms(4) }),
  prone({ lift: 7, f: { eyes: 'right', mouth: 'grin' }, legs: plankLegs, arms: floorArms(0), fx: [fx(FX.sparkle, 36, 10)] }),
]);

// Crawling on all fours
const crawlLegs = (k) => (top) => ({
  back: 'r',
  l: [[14, top + 6], [12 + (k ? 1 : -1), FLOOR - 2], [7 + (k ? 1 : -1), FLOOR - 2], { shoe: 'none', thin: true }],
  r: [[14, top + 4], [12 + (k ? -1 : 1), FLOOR - 3], [7 + (k ? -1 : 1), FLOOR - 3], { shoe: 'none', back: true, thin: true }],
});
const crawlArms = (k) => (top) => ({
  backArm: 'r',
  l: [[21, top + 3], [21 + (k ? 2 : 0), top + 6], [22 + (k ? 3 : -1), FLOOR - 2], { hand: 'open' }],
  r: [[20, top + 2], [20 + (k ? 0 : 2), top + 5], [21 + (k ? -1 : 3), FLOOR - 2], { hand: 'open', back: true }],
});
anim('crawl', 4, [
  prone({ lift: 5, f: { eyes: 'right', mouth: 'smile' }, legs: crawlLegs(0), arms: crawlArms(0) }),
  prone({ lift: 5, headDy: -1, f: { eyes: 'right', mouth: 'o' }, legs: crawlLegs(1), arms: crawlArms(1) }),
  prone({ lift: 5, f: { eyes: 'happy', mouth: 'smile' }, legs: crawlLegs(0), arms: crawlArms(0) }),
  prone({ lift: 5, headDy: -1, f: { eyes: 'right', mouth: 'cat' }, legs: crawlLegs(1), arms: crawlArms(1) }),
]);

// Trip over nothing, faceplant, get up embarrassed (short loop that reads well repeated)
const flatLegs = (up) => (top) => ({
  back: 'r',
  l: [[14, top + 6], [9, top + 6 - up], [5, top + 6 - 2 * up], { shoe: 'down', thin: true }],
  r: [[14, top + 4], [10, top + 4 - up], [6, top + 4 - 2 * up], { shoe: 'down', back: true, thin: true }],
});
const flatArms = () => (top) => ({
  backArm: 'r',
  l: [[21, top + 3], [25, top + 5], [29, FLOOR - 2], { hand: 'open' }],
  r: [[20, top + 2], [16, top + 5], [13, FLOOR - 2], { hand: 'open', back: true }],
});
anim('trip', 5, [
  S({ face: { eyes: 'happy', mouth: 'smile' }, legs: sl([1, 2, 3, A], [-1, 2, -3, A]), arms: sa([-1, 3, -2, 6], [1, 3, 2, 6]) }),
  S({ dx: 3, dy: 2, headDx: 2, face: { eyes: 'wide', brows: 'up', mouth: 'o' }, legs: sl([2, 1, 4, A], [-4, -1, -8, A - 6]), arms: sa([3, -2, 6, -5, { hand: 'open' }], [3, -3, 5, -7, { hand: 'open' }]) }),
  prone({ lift: 0, headDy: 2, headDx: 1, f: { eyes: 'squeeze', mouth: 'wavy' }, legs: flatLegs(3), arms: flatArms(), fx: [fx(FX.impact, 33, 28), fx(FX.dust2, 30, 40)] }),
  prone({ lift: 0, headDy: 2, headDx: 1, f: { eyes: 'dizzy', mouth: 'wavy' }, legs: flatLegs(0), arms: flatArms(), fx: [fx(FX.dizzy, 25, 16)] }),
  prone({ lift: 5, f: { eyes: 'half', mouth: 'wavy', extras: ['blush'] }, legs: crawlLegs(0), arms: crawlArms(0) }),
  S({ face: { eyes: 'happy', mouth: 'wavy', extras: ['blush', 'sweat'] }, arms: sa([0, 3, 0, 6], [2, -3, 0, -9, { hand: 'open' }], { backArm: [], overHead: 'r' }) }),
]);

// Lying on the back, hands behind the head, one foot tapping
const lyingHead = (f) => rotPart(face({ view: 'side', ...f }), 3, 'HEAD_LYING');
const lie = (k, f) => pose({
  view: 'side',
  torso: TORSO_SUPINE,
  torsoAt: [21, FLOOR - 11],
  head: { x: 1, y: FLOOR - 21 },
  face: lyingHead(f),
  legs: () => ({
    back: 'l',
    l: [[30, FLOOR - 6], [34, FLOOR - 11], [37, FLOOR - 2], { shoe: 'right', thin: true, back: true }],
    r: [[30, FLOOR - 7], [34, FLOOR - 11], [37 + (k ? 1 : 0), FLOOR - 15 - (k ? 1 : 0)], { shoe: 'up', thin: true }],
  }),
  arms: () => ({
    backArm: 'r',
    l: [[24, FLOOR - 9], [21, FLOOR - 14], [18, FLOOR - 11], { hand: 'none' }],
    r: [[24, FLOOR - 4], [21, FLOOR - 1], [18, FLOOR - 4], { hand: 'none', back: true }],
  }),
  fx: k ? [fx(FX.note, 8, 13)] : [fx(FX.note2, 10, 15)],
});
anim('lie', 1.5, [
  lie(0, { eyes: 'closed', mouth: 'smile' }),
  lie(1, { eyes: 'closed', mouth: 'whistle' }),
  lie(0, { eyes: 'half', mouth: 'smile' }),
  lie(1, { eyes: 'closed', mouth: 'whistle' }),
]);

// Karate: stance, high kick, chop
anim('karate', 5, [
  S({ dy: 1, face: { eyes: 'squint', brows: 'angry', mouth: 'flat' }, legs: sl([2, 1, 4, A], [-2, 1, -4, A]), arms: sa([2, 2, 4, 0], [0, 3, 1, 5]) }),
  S({ dx: -1, face: { eyes: 'squint', brows: 'angry', mouth: 'shout' }, legs: sl([4, -2, 10, 33, { shoe: 'right' }], [0, 2, -1, A]), arms: sa([-2, 2, -4, 0], [2, 1, 5, -1]), fx: [fx(FX.impact, 33, 29)] }),
  S({ dy: 1, face: { eyes: 'squint', brows: 'angry', mouth: 'teeth' }, legs: sl([2, 1, 4, A], [-2, 1, -4, A]), arms: sa([3, 0, 8, 0, { hand: 'open' }], [0, 3, -1, 5]), fx: [fx(FX.spark1, 32, 28)] }),
  S({ dy: 1, face: { eyes: 'closed', mouth: 'smile' }, legs: sl([2, 1, 4, A], [-2, 1, -4, A]), arms: sa([2, 2, 4, 0], [0, 3, 1, 5]) }),
]);

// Shadow boxing
const guard = sa([2, 2, 3, -2], [1, 2, 3, -3]);
anim('box', 6, [
  S({ face: { eyes: 'squint', mouth: 'flat' }, legs: sl([2, 1, 3, A], [-2, 1, -3, A]), arms: guard }),
  S({ dy: -1, face: { eyes: 'squint', mouth: 'teeth' }, legs: sl([2, 1, 3, A - 1], [-2, 1, -3, A]), arms: sa([3, 0, 8, -1], [1, 2, 3, -3]), fx: [fx(FX.spark1, 31, 27)] }),
  S({ face: { eyes: 'squint', mouth: 'flat', extras: ['sweat'] }, legs: sl([2, 1, 3, A], [-2, 1, -3, A]), arms: guard }),
  S({ dy: -1, face: { eyes: 'squint', mouth: 'shout' }, legs: sl([2, 1, 3, A], [-2, 1, -3, A - 1]), arms: sa([2, 2, 3, -2], [3, 0, 8, -2]), fx: [fx(FX.spark1, 30, 26)] }),
]);

// Fishing from the edge of the taskbar
const rod = (tipX, tipY) => {
  const pts = [];
  const x0 = 25;
  const y0 = 33;
  const n = Math.max(Math.abs(tipX - x0), Math.abs(tipY - y0));
  for (let i = 0; i <= n; i++) pts.push([Math.round(x0 + ((tipX - x0) * i) / n), Math.round(y0 + ((tipY - y0) * i) / n)]);
  const minX = Math.min(...pts.map((q) => q[0]));
  const minY = Math.min(...pts.map((q) => q[1]));
  const w = Math.max(...pts.map((q) => q[0])) - minX + 1;
  const h = Math.max(...pts.map((q) => q[1])) - minY + 1;
  const rows = Array.from({ length: h }, () => Array(w).fill('.'));
  pts.forEach(([x, y], i) => (rows[y - minY][x - minX] = i < 3 ? '3' : '4'));
  return { p: part('ROD', rows.map((r) => r.join(''))), x: minX, y: minY };
};
const fishLine = (tipX, tipY, bobY) => ({ p: part('FLINE', Array(Math.max(1, bobY - tipY - 1)).fill('!')), x: tipX + 1, y: tipY + 1 });
const fishArms = sa([2, 2, 5, 3], [2, 2, 5, 4]);
const fishing = (f, tip, bobY, extra = {}) => S({
  ...sitSide(),
  face: f,
  arms: extra.arms ?? fishArms,
  front: [rod(...tip), ...(bobY ? [prop(PR.BOBBER, tip[0] + 1, bobY)] : []), ...(extra.front ?? [])],
  fx: [...(bobY ? [fishLine(tip[0], tip[1], bobY)] : []), ...(extra.fx ?? [])],
});
anim('fish', 2, [
  fishing({ eyes: 'half', mouth: 'small' }, [35, 22], 41),
  fishing({ eyes: 'half', mouth: 'smile' }, [35, 22], 42),
  fishing({ eyes: 'blink', mouth: 'small' }, [35, 22], 41),
  fishing({ eyes: 'wide', brows: 'up', mouth: 'o' }, [35, 23], 43, { fx: [fx(FX.ex, 30, 14)] }),
  fishing({ eyes: 'squeeze', mouth: 'teeth' }, [32, 15], 0, { arms: sa([1, 1, 4, 0], [1, 1, 4, 1]), front: [prop(PR.FISH, 33, 7)], fx: [fx(FX.sparkle, 30, 4)] }),
  fishing({ eyes: 'happy', mouth: 'grin' }, [33, 18], 0, { front: [prop(PR.FISH, 33, 18)] }),
]);

// Peeking in from the edge of the screen (only the right half of the frame shows there)
const peekArms = (open) => sa([3, -1, 4, -5, { hand: open ? 'open' : 'fist' }], [2, 2, 3, 5]);
anim('peek', 2, [
  S({ dx: 6, dy: 2, headDx: 3, face: { eyes: 'right', mouth: 'small' }, arms: peekArms(false) }),
  S({ dx: 6, dy: 2, headDx: 3, face: { eyes: 'blink', mouth: 'small' }, arms: peekArms(false) }),
  S({ dx: 6, dy: 2, headDx: 3, face: { eyes: 'happy', mouth: 'grin' }, arms: peekArms(true) }),
  S({ dx: 6, dy: 2, headDx: 3, face: { eyes: 'right', brows: 'up', mouth: 'o' }, arms: peekArms(false), fx: [fx(FX.ex, 37, 6)] }),
]);

/* =================================================================== */
/* Control mode and rooms (mostly driven by the app directly)          */
/* =================================================================== */
const Bk = (o = {}) => pose({ view: 'back', ...o });

// Walking towards the viewer / away from the viewer: one step per three frames.
// Feet: F = planted in front, M = planted under the body, P = pushing off (heel up), W = swinging through.
// Front view: the foot in front is closer, so it sits 1 px lower; a foot in the air rises.
// Back view: the foot in front is farther away, so it sits higher; pushing off / swinging shows the sole.
const STEPS = [
  // [body dy, left foot, right foot, arm swing (+1 = left arm forward)]
  [0, 'F', 'P', -1], // left foot lands in front
  [1, 'M', 'P', -1], // weight on it (body dips), the right heel peels off
  [0, 'M', 'W', 0], // right foot swings through
  [0, 'P', 'F', 1], // right foot lands
  [1, 'P', 'M', 1],
  [0, 'W', 'M', 0],
];
const LIFT_FRONT = { F: -1, M: 0, P: 1, W: 2 };
const LIFT_BACK = { F: 1, M: 0, P: 0, W: 2 };
const walkLegs = (left, right, back) => (j) => {
  const T = back ? LIFT_BACK : LIFT_FRONT;
  const L = standLegs(j, [T[left], T[right]], back ? 'back' : 'front');
  if (back && 'PW'.includes(left)) L.l[3] = { ...L.l[3], shoe: 'heel' };
  if (back && 'PW'.includes(right)) L.r[3] = { ...L.r[3], shoe: 'heel' };
  return L;
};
// the forward hand swings in towards the belly and up a little (foreshortened), the other one out
const swingArms = (s) => fa(s > 0 ? [-1, 3, 0, 5] : s < 0 ? [-1, 3, -2, 5] : HANG_L, s < 0 ? [1, 3, 0, 5] : s > 0 ? [1, 3, 2, 5] : HANG_R);
anim('walkDown', 9, STEPS.map(([dy, l, r, s]) => F({
  dy,
  legs: walkLegs(l, r, false),
  face: { eyes: 'open', mouth: 'smile' },
  arms: swingArms(s),
})));
anim('walkUp', 9, STEPS.map(([dy, l, r, s]) => Bk({ dy, legs: walkLegs(l, r, true), arms: swingArms(-s) })));

/* ---- squatting (crouch, pickup, putdown) ---- */
// The feet stay planted where they stand; the hips sink and go back, the knees come forward over
// the toes and the head leans in. depth = px the hips sink (2..4).
const squat = (depth, { lean = true } = {}) => ({
  dx: lean ? -1 : 0,
  dy: depth,
  headDx: lean ? 2 : 0,
  legs: (j) => ({
    l: [j.hipL, depth > 2 ? [25, 37] : [24, 37], [20, A], { shoe: 'right', thin: true }],
    r: [j.hipR, depth > 2 ? [22, 38] : [21, 38], [17, A], { shoe: 'right', back: true, thin: true }],
  }),
});
// both hands reaching forward and down to (x, y): open hands, the far one a pixel behind
const reach = (x, y) => (j) => ({
  backArm: 'r',
  l: [j.shL, [j.shL[0] + 3, j.shL[1] + 4], [x, y], { hand: 'open' }],
  r: [j.shR, [j.shR[0] + 3, j.shR[1] + 4], [x - 1, y], { hand: 'open', back: true }],
});

// Squatting low, hands on the knees, breathing and blinking
const kneeHands = (j) => ({
  backArm: 'r',
  l: [j.shL, [j.shL[0] + 2, j.shL[1] + 3], [23, j.shL[1] + 3], { hand: 'open' }],
  r: [j.shR, [j.shR[0] + 2, j.shR[1] + 3], [21, j.shR[1] + 4], { hand: 'open', back: true }],
});
anim('crouch', 3, [
  S({ ...squat(3), face: { eyes: 'right', mouth: 'smile' }, arms: kneeHands }),
  S({ ...squat(4), face: { eyes: 'right', mouth: 'small' }, arms: kneeHands }),
  S({ ...squat(4), face: { eyes: 'blink', mouth: 'small' }, arms: kneeHands }),
  S({ ...squat(3), face: { eyes: 'right', mouth: 'cat' }, arms: kneeHands }),
]);

/* ---- carrying things overhead (rooms) ---- */
// The arms are far too short to reach over the big head, so they rise behind it: only the sleeves
// and the fists show above the hair, gripping the bottom corners of the item. The app draws the
// item (16x16) with its bottom-centre at CARRY: frame pixels, sprite facing right, item drawn at
// (x - 8, y - 16). x is the frame centre, so the mirrored sprite uses the same anchor.
export const CARRY = { x: 20, y: 4 };
// Where an item lies on the floor just in front of the toes, for pickup / putdown (same convention).
export const CARRY_FLOOR = { x: 36, y: 45 };
const NEAR_FIST_X = 27; // fists 15 px apart: they sit on the item's bottom corners
const FAR_FIST_X = 12;
/** Arms raised behind the head; hy moves the fists (positive = down). */
const liftArms = (hy = 0) => (j) => ({
  backArm: ['l', 'r'],
  l: [j.shL, [j.shL[0] + 6, j.shL[1] - 11], [NEAR_FIST_X, CARRY.y + 1 + hy], { hand: 'fist' }],
  r: [j.shR, [j.shR[0] - 5, j.shR[1] - 11], [FAR_FIST_X, CARRY.y + 1 + hy], { hand: 'fist', back: true }],
});
const carryF = (f) => ({ eyes: 'right', mouth: 'smile', ...f });
const CARRY_IDLE = [
  S({ face: carryF(), arms: liftArms(0) }),
  S({ dy: 1, face: carryF({ mouth: 'flat' }), arms: liftArms(1) }),
  S({ face: carryF({ eyes: 'blink' }), arms: liftArms(0) }),
  S({ dy: 1, face: carryF({ mouth: 'wavy', extras: ['sweat'] }), arms: liftArms(1) }),
];
// holding the (invisible) load against the chest on the way up / down
const hug = sa([3, 2, 7, 0, { hand: 'fist' }], [3, 2, 6, 1, { hand: 'fist' }]);
const HUG_ITEM = { x: 27, y: 31 };

// Picking something up from the floor in front of the feet and lifting it overhead.
// The last frame is carryIdle's first frame.
anim('pickup', 7, [
  S({ headDx: 1, headDy: 1, face: { eyes: 'down', mouth: 'o' }, arms: sa([1, 3, 3, 5, { hand: 'open' }], [1, 3, 2, 6, { hand: 'open' }]), fx: [fx(FX.ex, 31, 5)] }),
  S({ ...squat(3), face: { eyes: 'down', mouth: 'small' }, arms: reach(26, 39) }),
  S({ ...squat(4), face: { eyes: 'squeeze', mouth: 'flat' }, arms: reach(27, 41), fx: [fx(FX.dust, 32, 41)] }),
  S({ ...squat(2), face: { eyes: 'squeeze', mouth: 'teeth', extras: ['sweat'] }, arms: hug }),
  S({ ...squat(2, { lean: false }), face: { eyes: 'squint', mouth: 'grin' }, arms: liftArms(2) }),
  CARRY_IDLE[0],
]);
// Putting it down again: the same story backwards, ending relaxed and pleased.
anim('putdown', 7, [
  CARRY_IDLE[0],
  S({ ...squat(2, { lean: false }), face: { eyes: 'right', mouth: 'small' }, arms: liftArms(2) }),
  S({ ...squat(2), face: { eyes: 'down', mouth: 'flat' }, arms: hug }),
  S({ ...squat(4), face: { eyes: 'down', mouth: 'small' }, arms: reach(27, 41) }),
  S({ ...squat(3), face: { eyes: 'happy', mouth: 'smile' }, arms: reach(25, 38) }),
  S({ face: { eyes: 'happy', mouth: 'grin' }, arms: sa([-1, 3, -1, 6], [1, 3, 1, 6]), fx: [fx(FX.sparkle, 31, 6)] }),
]);
anim('carryIdle', 4, CARRY_IDLE);

// Walking with the load: a slightly heavier step than the normal walk (6 frames, the body dips on each step)
const CW = [
  // [dy, near leg, far leg]
  [0, [1, 2, 3, A], [-1, 2, -3, A]], // near foot in front
  [1, [1, 2, 1, A], [-1, 1, -3, A - 2]], // weight on it, far heel up
  [0, [0, 2, -1, A], [1, 2, 1, A - 2]], // far foot swings through
  [0, [-1, 2, -3, A], [1, 2, 3, A]], // far foot in front
  [1, [-1, 1, -3, A - 2], [1, 2, 1, A]],
  [0, [1, 2, 1, A - 2], [0, 2, -1, A]],
];
anim('carryWalk', 9, CW.map(([dy, n, f]) => S({ dy, legs: sl(n, f), face: carryF(), arms: liftArms(dy) })));

/**
 * Optional, per frame: where the carried item's bottom-centre is (same convention as CARRY), so the
 * app can let it ride along with the hands; null = the item lies on the floor at CARRY_FLOOR.
 */
const up = (hy = 0) => ({ x: CARRY.x, y: CARRY.y + hy });
export const CARRY_PATH = {
  pickup: [null, null, null, HUG_ITEM, up(2), up(0)],
  putdown: [up(0), up(2), HUG_ITEM, null, null, null],
  carryIdle: [up(0), up(1), up(0), up(1)],
  carryWalk: CW.map(([dy]) => up(dy)),
};

// Pointing straight ahead, other hand on the hip, chin up: "Look, over there!"
const FINGER = part('FINGER', ['SS']);
const pointArms = (reach) => sa([4, -1, 8 + reach, -2, { hand: 'fist', thumb: -1 }], [-4, 2, -1, 5, { hand: 'none' }]);
anim('point', 4, [
  S({ headDy: -1, face: { eyes: 'right', mouth: 'o' }, arms: pointArms(0), front: [prop(FINGER, 30, 26)] }),
  S({ headDy: -1, face: { eyes: 'right', brows: 'up', mouth: 'grin' }, arms: pointArms(1), front: [prop(FINGER, 31, 26)], fx: [fx(FX.sparkle, 34, 22)] }),
  S({ headDy: -1, face: { eyes: 'right', mouth: 'grin' }, arms: pointArms(1), front: [prop(FINGER, 31, 26)], fx: [fx(FX.ex, 31, 3)] }),
  S({ headDy: -1, face: { eyes: 'happy', mouth: 'grin' }, arms: pointArms(0), front: [prop(FINGER, 30, 26)], fx: [fx(FX.spark1, 35, 23)] }),
]);

// Inspecting something with a magnifying glass, leaning in and squinting
const MAGNIFIER = part('MAGNIFIER', [
  '.aaa.',
  'a*::a',
  'a:::a',
  'a:::a',
  '.aaa.',
  '4....',
  '4....',
]);
const inspectArms = (dy) => sa([4, 1, 9, -4 + dy, { hand: 'fist', thumb: -1 }], [1, 3, 2, 6], { overHead: 'l' });
anim('inspect', 3, [
  S({ dx: 1, headDx: 1, face: { eyes: ['squint', 'right'], mouth: 'flat' }, arms: inspectArms(0), front: [prop(MAGNIFIER, 30, 16)] }),
  S({ dx: 1, headDx: 1, face: { eyes: ['squint', 'right'], mouth: 'o' }, arms: inspectArms(-1), front: [prop(MAGNIFIER, 30, 15)] }),
  S({ dx: 1, headDx: 2, face: { eyes: ['squint', 'right'], brows: 'up', mouth: 'cat' }, arms: inspectArms(-1), front: [prop(MAGNIFIER, 30, 15)], fx: [fx(FX.spark1, 34, 13)] }),
  S({ dx: 1, headDx: 1, face: { eyes: ['squint', 'right'], mouth: 'flat' }, arms: inspectArms(0), front: [prop(MAGNIFIER, 30, 16)], fx: [fx(FX.q, 26, 1)] }),
]);

// Knocking on a door just in front of him (tiny tick marks on each knock)
const KNOCK = part('KNOCK', ['..!', '.!.', '...', '!!.', '...', '.!.', '..!']);
const knockArm = (out) => sa([9, 1, 11 + out, -5, { hand: 'fist', thumb: -1 }], [0, 3, 0, 6]);
anim('knock', 6, [
  S({ face: { eyes: 'right', mouth: 'small' }, arms: knockArm(0) }),
  S({ dx: 1, headDx: 1, face: { eyes: 'right', mouth: 'o' }, arms: knockArm(2), fx: [fx(KNOCK, 35, 18)] }),
  S({ face: { eyes: 'right', mouth: 'small' }, arms: knockArm(0) }),
  S({ dx: 1, headDx: 1, face: { eyes: 'blink', mouth: 'o' }, arms: knockArm(2), fx: [fx(KNOCK, 35, 18)] }),
]);

// Playing an arcade machine: joystick and buttons, swaying, tongue out
const arcadeArms = (stick, btn) => sa([3, 3, 8 + stick, 1, { hand: 'fist' }], [3, 3, 7, 2 + btn, { hand: 'fist' }]);
anim('arcade', 8, [
  S({ face: { eyes: 'right', mouth: 'tongue' }, arms: arcadeArms(0, 0) }),
  S({ dx: -1, headDx: -1, face: { eyes: 'squint', mouth: 'tongue' }, arms: arcadeArms(-1, 1) }),
  S({ face: { eyes: 'right', brows: 'up', mouth: 'tongue', extras: ['sweat'] }, arms: arcadeArms(0, 0) }),
  S({ dx: 1, headDx: 1, face: { eyes: 'squint', mouth: 'tongue' }, arms: arcadeArms(1, 1), fx: [fx(FX.spark1, 35, 24)] }),
]);
