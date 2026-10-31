/**
 * Animation frames for the mascot. Each animation is a list of 28x38 bitmaps;
 * build-sprites.mjs lays them out as one row per animation in the sprite sheet.
 */
import {
  ARM,
  ARM_HOLD,
  ARM_SIP,
  ARM_UP_A,
  ARM_UP_B,
  BOOK,
  BOOK_TILT,
  HEADS,
  LAPTOP,
  MUG,
  POS,
  STEAM_A,
  STEAM_B,
  render,
} from './character.mjs';

/** Hanging arms with individual vertical offsets (relative to the body offset). */
const hang = (dy = 0, dl = 0, dr = 0, dx = 0) => ({
  armL: { part: ARM, x: POS.armLX + dx, y: POS.armY + dy + dl, flip: false },
  armR: { part: ARM, x: POS.armRX + dx, y: POS.armY + dy + dr, flip: true },
});
const upR = (variant, dy = 0) => ({ part: variant === 'B' ? ARM_UP_B : ARM_UP_A, x: 20, y: 10 + dy, flip: false });
const upL = (variant, dy = 0) => ({ part: variant === 'B' ? ARM_UP_B : ARM_UP_A, x: 2, y: 10 + dy, flip: true });

export const ANIMS = {
  // Standing, breathing, one blink per loop
  idle: [
    render({}),
    render({ dy: 1 }),
    render({}),
    render({ head: HEADS.blink }),
  ],

  // Quick glances left / right
  look: [render({ head: HEADS.lookL, headDx: -1 }), render({ head: HEADS.lookR, headDx: 1 })],

  // Waddle (the sprite is flipped with CSS for the other direction)
  walk: [
    render({ headDx: 1, lift: [2, 0], ...hang(0, -1, 1) }),
    render({ headDx: 1, dy: -1, ...hang(-1) }),
    render({ headDx: 1, lift: [0, 2], ...hang(0, 1, -1) }),
    render({ headDx: 1, dy: -1, ...hang(-1) }),
  ],

  // Run: leaning forward, arms pumping, airborne frames
  run: [
    render({ dx: 1, headDx: 1, dy: -1, lift: [3, 0], ...hang(-1, -2, 2, 1) }),
    render({ dx: 1, headDx: 1, dy: -3, lift: [2, 2], ...hang(-3, -2, -2, 1) }),
    render({ dx: 1, headDx: 1, dy: -1, lift: [0, 3], ...hang(-1, 2, -2, 1) }),
    render({ dx: 1, headDx: 1, dy: -3, lift: [2, 2], ...hang(-3, -2, -2, 1) }),
  ],

  // Greeting wave with the right hand
  wave: [
    render({ head: HEADS.happy, armR: upR('A') }),
    render({ head: HEADS.happy, armR: upR('B') }),
    render({ head: HEADS.open, armR: upR('A') }),
    render({ head: HEADS.happy, armR: upR('B') }),
  ],

  // Sitting with knees up
  sit: [
    render({ dy: 6, legsTop: 31, legsFront: true }),
    render({ dy: 6, legsTop: 31, legsFront: true, head: HEADS.blink }),
  ],

  // Asleep, head drooping
  sleep: [
    render({ dy: 6, legsTop: 31, legsFront: true, head: HEADS.sleep, headDx: 1, headDy: 2 }),
    render({ dy: 7, legsTop: 31, legsFront: true, head: HEADS.sleep, headDx: 1, headDy: 2 }),
  ],

  // Typing on a laptop (we see the lid)
  type: [
    render({ dy: 6, legsTop: 31, head: HEADS.down, ...armsOnLaptop(0, 1), front: [{ part: LAPTOP, x: 7, y: 29 }] }),
    render({ dy: 6, legsTop: 31, head: HEADS.down, ...armsOnLaptop(1, 0), front: [{ part: LAPTOP, x: 7, y: 29 }] }),
    render({ dy: 6, legsTop: 31, head: HEADS.down, ...armsOnLaptop(0, 1), front: [{ part: LAPTOP, x: 7, y: 29 }] }),
    render({ dy: 6, legsTop: 31, head: HEADS.blink, ...armsOnLaptop(1, 1), front: [{ part: LAPTOP, x: 7, y: 29 }] }),
  ],

  // Reading a book (hands grip the sides of the book)
  read: [
    render({ dy: 6, legsTop: 31, head: HEADS.open, armL: null, armR: null, front: [{ part: BOOK, x: 8, y: 20 }, bookArm(false), bookArm(true)] }),
    render({ dy: 6, legsTop: 31, head: HEADS.blink, armL: null, armR: null, front: [{ part: BOOK_TILT, x: 8, y: 20 }, bookArm(false), bookArm(true)] }),
  ],

  // Coffee break
  coffee: [
    render({ armR: { part: ARM_HOLD, x: 20, y: 18, flip: false }, front: [{ part: MUG, x: 22, y: 14 }] }),
    render({ head: HEADS.happy, armR: { part: ARM_SIP, x: 20, y: 15, flip: false }, front: [{ part: MUG, x: 22, y: 11 }, { part: STEAM_A, x: 24, y: 8 }] }),
    render({ head: HEADS.blink, armR: { part: ARM_SIP, x: 20, y: 15, flip: false }, front: [{ part: MUG, x: 22, y: 11 }, { part: STEAM_B, x: 24, y: 8 }] }),
    render({ armR: { part: ARM_HOLD, x: 20, y: 18, flip: false }, front: [{ part: MUG, x: 22, y: 14 }, { part: STEAM_A, x: 24, y: 11 }] }),
  ],

  // Jump: crouch, airborne, landing
  jump: [
    render({ dy: 3, ...hang(3, -1, -1) }),
    render({ dy: -2, lift: [3, 3], head: HEADS.happy, armL: upL('A', -2), armR: upR('B', -2) }),
    render({ dy: 2, ...hang(2, 0, 0) }),
  ],

  // Stretch + yawn
  stretch: [
    render({ armL: upL('A', 4), armR: upR('A', 4) }),
    render({ head: HEADS.yawn, armL: upL('A'), armR: upR('A') }),
    render({ head: HEADS.yawn, dy: -1, lift: [1, 1], armL: upL('A', -1), armR: upR('B', -1) }),
  ],

  // Picked up by the collar (while being dragged)
  drag: [
    render({ dy: -1, lift: [3, 2], head: HEADS.gasp, armL: upL('A', -1), armR: upR('A', -1) }),
    render({ dy: -1, lift: [2, 3], head: HEADS.gasp, armL: upL('B', -1), armR: upR('B', -1) }),
  ],
};

// Hands stay hidden behind the laptop lid; a/b (0 or 1) make the arms bob alternately.
function armsOnLaptop(a, b) {
  return {
    armL: { part: ARM, x: POS.armLX + 2, y: 24 + a, flip: false },
    armR: { part: ARM, x: POS.armRX - 2, y: 24 + b, flip: true },
  };
}
function bookArm(right) {
  return right ? { part: ARM, x: POS.armRX - 1, y: 17, flip: true } : { part: ARM, x: POS.armLX + 1, y: 17, flip: false };
}
