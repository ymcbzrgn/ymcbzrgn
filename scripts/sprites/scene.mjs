/**
 * Room scenery for the twin's "rooms" (small side-scrolling scenes inside folder windows):
 * wall and floor tiles per theme, doors, content props (repo crates, scrolls, easels ...),
 * floor and wall decor, the 16x16 icons of carried items and a few effects.
 *
 * Same pixel language as the character: chunky shapes, light from the top-left, and coloured
 * outlines added by the outline pass from materials (lib.mjs) around every prop. Background tiles
 * get no outlines and stay a little calmer, so the twin and the props read in front of them.
 * Floor-standing sprites end on their floor-contact row (their bottom outline), like the twin's
 * outline row under the shoes.
 *
 * buildScene() draws everything, checks it and packs it into one sheet (shelf packing with a 1 px
 * gap); build-sprites.mjs writes scene.png and scene.meta.ts.
 */
import { Bmp, outline, rgba } from './lib.mjs';

/* ------------------------------------------------------------------ */
/* Materials (outline colours) and drawing helpers                      */
/* ------------------------------------------------------------------ */
const OUTLINE = {};
const PRIORITY = [];
const MAT = {};
/** A material index with its outline colour (null = never outlined: glows, light, effects). */
function mat(name, ol) {
  if (!(name in MAT)) {
    MAT[name] = PRIORITY.length + 1;
    PRIORITY.push(MAT[name]);
    if (ol) OUTLINE[MAT[name]] = rgba(ol);
  }
  return MAT[name];
}
// registration order = outline priority where two materials meet
const DARK = mat('dark', '#1c1f2b');
const WOOD = mat('wood', '#3d2414'); // same as the character's wood
const METAL = mat('metal', '#2b303d');
const BRASS = mat('brass', '#5c3d0c');
const RED = mat('red', '#5a1a17');
const PLANT = mat('plant', '#1c3a25');
const CLAY = mat('clay', '#5a2a16');
const CLOTH = mat('cloth', '#3a2440');
const PAPER = mat('paper', '#4a5162'); // same as the character's paper
const GLOW = mat('glow', null);

const colourCache = new Map();
const col = (hex) => {
  let c = colourCache.get(hex);
  if (!c) colourCache.set(hex, (c = rgba(hex)));
  return c;
};
const px = (b, x, y, hex, m = 0) => hex && b.set(x, y, col(hex), m);
/** Darker (k < 1) or lighter (k > 1) version of a colour, as hex. */
const shade = (hex, k) => {
  const c = rgba(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))));
  return '#' + [0, 1, 2].map((i) => f(c[i]).toString(16).padStart(2, '0')).join('');
};
const rect = (b, x, y, w, h, hex, m = 0) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(b, i, j, hex, m);
};
const hline = (b, x0, x1, y, hex, m = 0) => rect(b, x0, y, x1 - x0 + 1, 1, hex, m);
const vline = (b, x, y0, y1, hex, m = 0) => rect(b, x, y0, 1, y1 - y0 + 1, hex, m);
/** ASCII art: pal maps a symbol to [hex, material]; '.' leaves the pixel alone. */
function art(b, x, y, rows, pal) {
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === '.') return;
      const e = pal[ch];
      if (!e) throw new Error(`scene art: unknown symbol "${ch}"`);
      px(b, x + i, y + j, e[0], e[1] ?? 0);
    })
  );
}
/** A raised box: fill, light top/left edge, dark bottom/right edge (light from the top-left). */
function bevel(b, x, y, w, h, fill, light, dark, m = 0) {
  rect(b, x, y, w, h, fill, m);
  hline(b, x, x + w - 1, y, light, m);
  vline(b, x, y, y + h - 1, light, m);
  hline(b, x + 1, x + w - 1, y + h - 1, dark, m);
  vline(b, x + w - 1, y + 1, y + h - 1, dark, m);
}
const finish = (b) => {
  outline(b, OUTLINE, PRIORITY);
  return b;
};
/** Pick from a list by a cheap deterministic hash (stable textures without Math.random). */
const hash = (a, b2 = 0, c = 0) => {
  let h = (a * 374761393 + b2 * 668265263 + c * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/* ------------------------------------------------------------------ */
/* Shared palette                                                       */
/* ------------------------------------------------------------------ */
// Crate (repo language) colours, in the order crate_a ... crate_h. Close to GitHub's language colours:
const CRATES = [
  ['a', '#f2c14e'], // yellow: JavaScript
  ['b', '#4f8fe8'], // blue: TypeScript, Python
  ['c', '#4cbf6b'], // green: Shell, Vue, C#
  ['d', '#f08a3c'], // orange: HTML, Java, Swift
  ['e', '#e5534b'], // red: Ruby, Scala
  ['f', '#9b6be0'], // purple: CSS, Kotlin
  ['g', '#3cc6d6'], // cyan: Go, Dart
  ['h', '#9aa3b2'], // grey: anything else
];
/** Shared colour ramps (the crate hues): [highlight, light, base, mid, dark]. Props draw from these. */
const RAMP = Object.fromEntries(
  ['yellow', 'blue', 'green', 'orange', 'red', 'purple', 'cyan', 'grey'].map((n, i) => [n, [1.5, 1.28, 1, 0.8, 0.62].map((k) => shade(CRATES[i][1], k))])
);
const WOODS = { hi: '#dcae74', light: '#c48a52', base: '#a86b3c', mid: '#8f5a2c', dark: '#7a4a26', deep: '#5a3519' };
const METALS = { hi: '#e3e7ef', light: '#c7ccd8', base: '#9aa1b2', dark: '#6b7385', deep: '#4b5160' };
const PAPERS = { white: '#fbfaf7', cream: '#f6efdc', shade: '#e3d6b8', grey: '#d9d6cf', ink: '#9a8f78' };
const INK = mat('ink', '#2a2230'); // multi-coloured props (books, art, icons)

/* ------------------------------------------------------------------ */
/* Tiles: wall 32x56 + floor 32x12 per theme (repeat horizontally)      */
/* ------------------------------------------------------------------ */
export const TILE = { wall: { w: 32, h: 56 }, floor: { w: 32, h: 12 } };
const TW = TILE.wall.w;
const FLOOR_H = TILE.floor.h;

/** Moulding rows: [light, mid, dark] from top to bottom, starting at row y. */
const band = (b, y, colours) => colours.forEach((c, i) => hline(b, 0, TW - 1, y + i, c));
/** Two raised panels per tile (wainscot), rows y0..y1. */
function wainscot(b, y0, y1, frame, fill, light, dark) {
  rect(b, 0, y0, TW, y1 - y0 + 1, frame);
  for (const x of [2, 18]) bevel(b, x, y0 + 2, 12, y1 - y0 - 3, fill, light, dark);
}
/** Floor boards: rows of planks with end joints; boards = [{y, h, c, joint}] */
function planks(b, boards, seam, grain, light) {
  for (const { y, h, c, joint } of boards) {
    rect(b, 0, y, TW, h, c);
    hline(b, 0, TW - 1, y, light);
    for (let x = 0; x < TW; x++) if (hash(x, y, 7) % 9 === 0) px(b, x, y + 1 + (hash(x, y) % Math.max(1, h - 1)), grain);
    for (const jx of joint) {
      vline(b, jx, y, y + h - 1, seam);
      px(b, jx + 1, y + 1, light);
    }
    if (y + h < FLOOR_H) hline(b, 0, TW - 1, y + h - 1, seam);
  }
}

const TILES = {
  default: {
    wall(b) {
      // calm periwinkle-grey wallpaper with pinstripes, panelled wainscot
      rect(b, 0, 0, TW, 41, '#a1aec4');
      for (let x = 0; x < TW; x += 8) vline(b, x, 0, 40, '#acb8cc');
      for (let x = 4; x < TW; x += 8) for (let y = 4; y < 40; y += 8) px(b, x, y, '#97a4bb');
      hline(b, 0, TW - 1, 0, '#8794ab');
      hline(b, 0, TW - 1, 1, '#97a4ba');
      band(b, 41, ['#dfe5ee', '#c3ccda', '#76839b']);
      wainscot(b, 44, 52, '#76839c', '#7f8ca6', '#8e9bb4', '#66728a');
      band(b, 53, ['#d6dce6', '#bcc4d2', '#8e98aa']);
    },
    floor(b) {
      // light stone tiles in two rows, offset joints
      rect(b, 0, 0, TW, FLOOR_H, '#c0b7a9');
      hline(b, 0, TW - 1, 0, '#857d72');
      rect(b, 0, 1, TW, 5, '#b4ab9d');
      hline(b, 0, TW - 1, 1, '#a59c8f');
      hline(b, 0, TW - 1, 6, '#9b9285');
      hline(b, 0, TW - 1, 7, '#cec6b9');
      for (const x of [7, 23]) vline(b, x, 1, 5, '#9f9689');
      for (const x of [15, 31]) {
        vline(b, x, 7, 11, '#a69d90');
        px(b, (x + 1) % TW, 8, '#d2cabd');
      }
    },
  },
  projects: {
    wall(b) {
      // workshop: pegboard (the tools hang as wall decor, see pegtools), plank wainscot
      rect(b, 0, 0, TW, 40, '#c49c66');
      rect(b, 0, 0, TW, 2, '#a98352');
      for (let y = 4; y < 39; y += 4) for (let x = 2; x < TW; x += 4) {
        px(b, x, y, '#7e5b36');
        px(b, x, y - 1, '#d1ab76');
      }
      // a couple of empty hooks
      for (const [x, y] of [[10, 12], [26, 24]]) {
        px(b, x, y, '#9aa1b2');
        px(b, x + 1, y, '#c7ccd8');
        px(b, x + 1, y + 1, '#c7ccd8');
        px(b, x + 2, y + 1, '#8a6a42');
      }
      // plank wainscot
      band(b, 40, ['#b07a45', '#7a4a26']);
      rect(b, 0, 42, TW, 11, '#8f5d36');
      for (const x of [0, 7, 15, 22]) {
        vline(b, x, 42, 52, '#6b4224');
        vline(b, x + 1, 42, 52, '#a26a3f');
        px(b, x + 3, 44, '#5a3519');
        px(b, x + 3, 50, '#5a3519');
      }
      band(b, 53, ['#7a4a26', '#5a361d', '#47290f']);
    },
    floor(b) {
      // wide dark boards with sawdust
      hline(b, 0, TW - 1, 0, '#4a2c16');
      planks(b, [
        { y: 1, h: 3, c: '#9b643a', joint: [10] },
        { y: 4, h: 3, c: '#a46b3e', joint: [26] },
        { y: 7, h: 3, c: '#9f673b', joint: [4] },
        { y: 10, h: 2, c: '#a86f40', joint: [18] },
      ], '#6e4224', '#8a5530', '#b5804f');
      for (const [x, y] of [[13, 5], [14, 6], [29, 9], [6, 11]]) px(b, x, y, '#dcbc8c');
    },
  },
  games: {
    wall(b) {
      // arcade: dark navy with a cyan neon tube, pink stars and a neon trim over a dark panel
      rect(b, 0, 0, TW, 40, '#1f2449');
      rect(b, 0, 0, TW, 3, '#1a1e3e');
      hline(b, 0, TW - 1, 10, '#28396b');
      hline(b, 0, TW - 1, 11, '#7ff3ff');
      hline(b, 0, TW - 1, 12, '#36c2e0');
      hline(b, 0, TW - 1, 13, '#28396b');
      for (const [x, y, c] of [[6, 22, '#ff6ad5'], [23, 30, '#ffe066']]) {
        px(b, x, y, c);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(b, x + dx, y + dy, c === '#ff6ad5' ? '#9b3a8a' : '#8f7a3a');
      }
      for (const [x, y] of [[14, 19], [29, 18], [2, 33], [17, 36]]) px(b, x, y, '#6c63c9');
      hline(b, 0, TW - 1, 39, '#5a2a63');
      hline(b, 0, TW - 1, 40, '#ff6ad5');
      hline(b, 0, TW - 1, 41, '#b8459c');
      rect(b, 0, 42, TW, 11, '#161a36');
      for (let x = 0; x < TW; x += 8) art(b, x + 1, 45, ['..t...', '.ttt..', 'ttttt.'], { t: ['#2a2b5e'] });
      band(b, 53, ['#2c3160', '#22264a', '#14172e']);
    },
    floor(b) {
      // checker carpet with neon confetti
      hline(b, 0, TW - 1, 0, '#0f1124');
      for (let y = 1; y < FLOOR_H; y++) for (let x = 0; x < TW; x++) px(b, x, y, ((x >> 2) + ((y - 1) / 3 | 0)) % 2 ? '#3a2b6b' : '#281e4c');
      for (const [x, y, c] of [[2, 2, '#ff6ad5'], [13, 4, '#3fe7ff'], [21, 2, '#ffe066'], [27, 8, '#ff6ad5'], [9, 9, '#ffe066'], [18, 10, '#3fe7ff'], [30, 4, '#3fe7ff'], [5, 6, '#7cf27c']]) px(b, x, y, c);
    },
  },
  home: {
    wall(b) {
      // cosy wallpaper: soft cream stripes with tiny hearts, warm wood wainscot
      for (let x = 0; x < TW; x++) vline(b, x, 0, 40, (x >> 3) % 2 ? '#f0d6b4' : '#f4dec0');
      hline(b, 0, TW - 1, 0, '#dcbb94');
      hline(b, 0, TW - 1, 1, '#e8cba4');
      const heart = ['h.h', 'hhh', '.h.'];
      for (let y = 5, r = 0; y < 38; y += 8, r++) {
        for (let x = r % 2 ? 11 : 3; x < TW; x += 16) art(b, x, y, heart, { h: [r % 2 ? '#e9a99b' : '#e3b48e'] });
      }
      band(b, 41, ['#d39a5b', '#a86b3c', '#6e4122']);
      wainscot(b, 44, 52, '#a56d3e', '#b37b4a', '#c8915c', '#8f5a2c');
      band(b, 53, ['#8f5a2c', '#7a4a26', '#5a3519']);
    },
    floor(b) {
      hline(b, 0, TW - 1, 0, '#5a3519');
      planks(b, [
        { y: 1, h: 3, c: '#cf955a', joint: [6] },
        { y: 4, h: 3, c: '#d79e62', joint: [22] },
        { y: 7, h: 3, c: '#cc9154', joint: [14] },
        { y: 10, h: 2, c: '#d8a165', joint: [30] },
      ], '#9a6232', '#bd8448', '#e6b67d');
    },
  },
  documents: {
    wall(b) {
      // library: a high shelf of books, green-grey wall, dark green wainscot
      rect(b, 0, 0, TW, 41, '#8a9c90');
      for (let x = 2; x < TW; x += 6) vline(b, x, 17, 40, '#93a598');
      rect(b, 0, 0, TW, 2, '#5a3e28');
      rect(b, 0, 2, TW, 12, '#33423a');
      const books = ['#8e3b3b', '#3b4e7a', '#b8873b', '#6b7a3a', '#3b7a72', '#d8cfb4'];
      let x = 0;
      let k = 0;
      while (x < TW) {
        const w = 2 + (hash(k, 3) % 2);
        const h = 8 + (hash(k, 5) % 4);
        const c = books[k % books.length];
        const ww = Math.min(w, TW - x);
        rect(b, x, 14 - h, ww, h, c);
        vline(b, x + ww - 1, 14 - h, 13, shade(c, 0.72));
        if (ww > 2) px(b, x + 1, 14 - h + 2, '#e9dfc4');
        x += ww + (hash(k, 9) % 4 === 0 ? 1 : 0);
        k++;
      }
      hline(b, 0, TW - 1, 14, '#8a6545');
      hline(b, 0, TW - 1, 15, '#5a3e28');
      hline(b, 0, TW - 1, 16, '#6d7f73');
      band(b, 41, ['#b3c1b6', '#7d8f83', '#4f6157']);
      wainscot(b, 44, 52, '#4b5f52', '#53695b', '#647b6c', '#3c4d42');
      band(b, 53, ['#3e5045', '#33443a', '#26332b']);
    },
    floor(b) {
      // deep green archive carpet with a small diamond pattern
      rect(b, 0, 0, TW, FLOOR_H, '#4a5f50');
      hline(b, 0, TW - 1, 0, '#2b3830');
      hline(b, 0, TW - 1, 1, '#3f5245');
      for (let y = 3; y < FLOOR_H; y += 4) for (let x = (y >> 2) % 2 ? 4 : 0; x < TW; x += 8) {
        px(b, x + 2, y, '#5b725f');
        px(b, x + 1, y + 1, '#55695a');
        px(b, x + 3, y + 1, '#55695a');
      }
    },
  },
  pictures: {
    wall(b) {
      // gallery: warm white, a ceiling track with spotlights throwing soft cones down the wall
      rect(b, 0, 0, TW, 50, '#e9e5dd');
      hline(b, 0, TW - 1, 0, '#4b4f5c');
      hline(b, 0, TW - 1, 1, '#d3cdc2');
      for (let y = 4; y < 40; y++) {
        const half = Math.floor(2 + (y - 4) * 0.22);
        hline(b, 16 - half, 15 + half, y, y < 24 ? '#f4f1eb' : '#efebe4');
        if (y < 16) hline(b, 16 - Math.floor(half / 2), 15 + Math.floor(half / 2), y, '#f8f6f2');
      }
      art(b, 14, 1, ['.dd.', 'dDDd', '.ll.'], { d: ['#3c404c'], D: ['#5b6070'], l: ['#fff6d8'] });
      band(b, 50, ['#f7f5f1', '#e8e4dc', '#dcd7cd', '#d0cabf', '#c3bcb0', '#a39b8e']);
    },
    floor(b) {
      hline(b, 0, TW - 1, 0, '#9c8b70');
      planks(b, [
        { y: 1, h: 3, c: '#d9c49e', joint: [12] },
        { y: 4, h: 3, c: '#e0cca7', joint: [28] },
        { y: 7, h: 3, c: '#d6c099', joint: [20] },
        { y: 10, h: 2, c: '#e2cfab', joint: [4] },
      ], '#b39d77', '#ccb58d', '#ece0c7');
    },
  },
  trash: {
    wall(b) {
      // back alley: grimy bricks, drips, a crack, concrete curb
      const bricks = ['#6e5650', '#655049', '#735b53', '#5f4b45'];
      rect(b, 0, 0, TW, 53, '#3f3532');
      for (let row = 0; row * 4 < 53; row++) {
        const y = row * 4;
        const off = row % 2 ? 4 : 0;
        for (let bx = -8; bx < TW; bx += 8) {
          const x0 = bx + off;
          const c = bricks[hash(((x0 % TW) + TW) % TW, row) % bricks.length];
          for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) {
            const x = (((x0 + i) % TW) + TW) % TW;
            if (y + j < 53) px(b, x, y + j, j === 0 && i < 5 ? '#7d655d' : c);
          }
        }
      }
      // soot towards the ground (darker bricks), a few drips from above
      for (let y = 44; y < 53; y++) for (let x = 0; x < TW; x++) {
        const c = b.get(x, y);
        if ((y - 44) * 9 + (hash(x >> 3, y >> 2) % 20) > 30) b.set(x, y, [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 255].map(Math.round));
      }
      for (const [x, len] of [[5, 6], [27, 9]]) {
        vline(b, x, 0, len, '#54443e');
        px(b, x, len + 1, '#4a3c37');
      }
      band(b, 53, ['#77736c', '#5f5b55', '#46433e']);
    },
    floor(b) {
      // worn concrete: speckles, a hairline crack, a faint stain
      rect(b, 0, 0, TW, FLOOR_H, '#75726b');
      hline(b, 0, TW - 1, 0, '#3e3c38');
      hline(b, 0, TW - 1, 1, '#66635d');
      for (let y = 2; y < FLOOR_H; y++) for (let x = 0; x < TW; x++) {
        const h = hash(x, y, 11) % 23;
        if (h === 0) px(b, x, y, '#67645e');
        else if (h === 1) px(b, x, y, '#828078');
      }
      art(b, 5, 4, ['kk...', '..kk.', '....k'], { k: ['#5d5a54'] });
      art(b, 20, 8, ['.ssss.', 'ssssss'], { s: ['#6c6964'] });
    },
  },
};

/* ------------------------------------------------------------------ */
/* Sprites                                                              */
/* ------------------------------------------------------------------ */
const SPRITES = [];
/** Register a sprite: draw(frameIndex) -> Bmp of w x h. floor = it stands on the floor. */
function sprite(key, w, h, { frames = 1, fps = 0, floor = false } = {}, draw) {
  const list = [];
  for (let f = 0; f < frames; f++) {
    const b = new Bmp(w, h);
    draw(b, f);
    list.push(b);
  }
  SPRITES.push({ key, w, h, fps, floor, frames: list });
}

for (const [theme, t] of Object.entries(TILES)) {
  sprite(`wall_${theme}`, TILE.wall.w, TILE.wall.h, {}, (b) => t.wall(b));
  sprite(`floor_${theme}`, TILE.floor.w, TILE.floor.h, {}, (b) => t.floor(b));
}

/* ---- doors and the secret panel (28x50, stand on the floor) ---- */
// warm wood door in a dark frame; the frame has a folder tab on its top-left corner
const WD = { frame: '#7a4a26', frameL: '#a86b3c', frameD: '#5a3519', slab: '#c48a52', slabL: '#d9a46a', slabD: '#8f5a2c', panel: '#b97f48', panelL: '#dcae74', panelD: '#9a6232' };
function doorFrame(b, w = WD) {
  rect(b, 2, 1, 9, 2, w.frame, WOOD); // folder tab
  hline(b, 3, 9, 1, w.frameL, WOOD);
  rect(b, 1, 3, 26, 46, w.frame, WOOD);
  hline(b, 1, 26, 3, w.frameL, WOOD);
  vline(b, 1, 3, 48, w.frameL, WOOD);
  vline(b, 26, 4, 48, w.frameD, WOOD);
  vline(b, 3, 6, 48, w.frameD, WOOD); // inner shadow of the casing
  hline(b, 3, 24, 5, w.frameD, WOOD);
}
function doorSlab(b, w = WD) {
  rect(b, 4, 6, 20, 43, w.slab, WOOD);
  vline(b, 4, 6, 48, w.slabL, WOOD);
  hline(b, 4, 23, 6, w.slabL, WOOD);
  vline(b, 23, 7, 48, w.slabD, WOOD);
  for (const [y0, y1] of [[9, 24], [28, 45]]) {
    rect(b, 7, y0, 14, y1 - y0 + 1, w.panel, WOOD);
    hline(b, 7, 20, y0, w.panelD, WOOD);
    vline(b, 7, y0, y1, w.panelD, WOOD);
    hline(b, 8, 20, y1, w.panelL, WOOD);
    vline(b, 20, y0 + 1, y1, w.panelL, WOOD);
  }
  for (const y of [10, 40]) rect(b, 4, y, 1, 2, '#6b7385', WOOD); // hinges
  art(b, 20, 30, ['bB', 'Bk'], { b: ['#f7d36a', WOOD], B: ['#c48f2a', WOOD], k: ['#5c3d0c', WOOD] }); // knob
}
sprite('door', 28, 50, { floor: true }, (b) => {
  doorFrame(b);
  doorSlab(b);
  // name plate on the upper panel
  rect(b, 9, 12, 10, 5, '#f3ead8', WOOD);
  hline(b, 9, 18, 16, '#cdbf9f', WOOD);
  vline(b, 18, 12, 16, '#cdbf9f', WOOD);
  hline(b, 11, 16, 14, '#8a7a5c', WOOD);
  finish(b);
});
sprite('door_open', 28, 50, { floor: true }, (b) => {
  doorFrame(b);
  // warm light pouring out of the room behind
  for (let y = 6; y <= 48; y++) for (let x = 4; x <= 23; x++) {
    const d = Math.abs(x - 13.5) / 10 + (y < 10 ? (10 - y) * 0.06 : 0);
    px(b, x, y, d < 0.35 ? '#fff4c9' : d < 0.6 ? '#ffe39a' : d < 0.85 ? '#ffcd73' : '#f5ae55', GLOW);
  }
  rect(b, 5, 46, 18, 3, '#fff9e3', GLOW);
  for (const [x, y] of [[9, 14], [16, 22], [11, 33], [18, 11]]) px(b, x, y, '#ffffff', GLOW);
  // the door, swung inwards: seen almost edge-on against the right jamb
  rect(b, 19, 6, 5, 43, '#a86b3c', WOOD);
  vline(b, 19, 6, 48, '#c48a52', WOOD);
  vline(b, 23, 6, 48, '#7a4a26', WOOD);
  for (const y of [9, 28]) vline(b, 21, y, y + 15, '#8f5a2c', WOOD);
  art(b, 20, 31, ['b', 'B'], { b: ['#f7d36a', WOOD], B: ['#c48f2a', WOOD] });
  finish(b);
});
// exit (up to the parent folder): painted sage door with a green sign and a big white arrow
const SAGE = { frame: '#55705f', frameL: '#6d8b7b', frameD: '#3d5246', slab: '#87a594', slabL: '#a3bfae', slabD: '#5f7a6a', panel: '#7b9888', panelL: '#a3bfae', panelD: '#5f7a6a' };
sprite('door_up', 28, 50, { floor: true }, (b) => {
  doorFrame(b, SAGE);
  doorSlab(b, SAGE);
  rect(b, 7, 10, 14, 13, '#1f8f4e', WOOD);
  hline(b, 7, 20, 10, '#3fc27a', WOOD);
  vline(b, 7, 10, 22, '#3fc27a', WOOD);
  hline(b, 8, 20, 22, '#146b3a', WOOD);
  vline(b, 20, 11, 22, '#146b3a', WOOD);
  art(b, 9, 12, [
    '....W....',
    '...WWW...',
    '..WWWWW..',
    '.WWWWWWW.',
    '...WWW...',
    '...WWW...',
    '...WWW...',
    '...WWW...',
  ], { W: ['#ffffff', WOOD] });
  finish(b);
});
// a walnut wall panel with a crooked portrait whose eyes follow you, and light leaking underneath
function secretPanel(b) {
  rect(b, 1, 1, 26, 48, '#6e4a33', WOOD);
  hline(b, 1, 26, 1, '#86593d', WOOD);
  vline(b, 1, 1, 48, '#86593d', WOOD);
  vline(b, 26, 2, 48, '#4f3322', WOOD);
  for (const x of [6, 13, 20]) vline(b, x, 30, 46, '#63412c', WOOD);
  hline(b, 3, 24, 29, '#4f3322', WOOD);
  hline(b, 3, 24, 30, '#86593d', WOOD);
}
sprite('secret', 28, 50, { floor: true }, (b) => {
  secretPanel(b);
  // gilded frame, hanging a little crooked (right side one px higher)
  for (let x = 5; x <= 22; x++) {
    const t = x > 13 ? 0 : 1;
    vline(b, x, 5 + t, 24 + t, x === 5 || x === 22 ? '#a87a20' : '#e0b54a', WOOD);
  }
  for (let x = 7; x <= 20; x++) {
    const t = x > 13 ? 0 : 1;
    vline(b, x, 7 + t, 22 + t, '#2f4a3f', WOOD);
    px(b, x, 5 + t, '#f5d77a', WOOD);
    px(b, x, 24 + t, '#8a6418', WOOD);
  }
  // the gentleman: pale face, side-eye, moustache, dark coat
  art(b, 9, 10, [
    '..hhhh....',
    '.hhhhhh...',
    '.ffffff...',
    '.fWkfWk...',
    '.ffffff...',
    '.fmmmmf...',
    '..ffff....',
    '.cccccc...',
    'cccQQccc..',
    'cccccccc..',
  ], { h: ['#3a2a1e', WOOD], f: ['#e8c9a8', WOOD], W: ['#ffffff', WOOD], k: ['#1c1f2b', WOOD], m: ['#4a3020', WOOD], c: ['#2a2a3a', WOOD], Q: ['#e8e4d8', WOOD] });
  hline(b, 4, 23, 47, '#4fd6e8', GLOW); // a draft of light under the panel...
  hline(b, 6, 21, 48, '#b8f4ff', GLOW);
  finish(b);
});
sprite('secret_open', 28, 50, { floor: true }, (b) => {
  // the opening, glowing
  rect(b, 1, 1, 26, 48, '#3a2b52', WOOD);
  for (let y = 3; y <= 48; y++) for (let x = 7; x <= 24; x++) {
    const d = Math.hypot((x - 15.5) / 9, (y - 26) / 24);
    px(b, x, y, d < 0.45 ? '#f1e6ff' : d < 0.7 ? '#cdb3ff' : d < 0.9 ? '#9b7be8' : '#6a4cc0', GLOW);
  }
  for (const [x, y] of [[12, 12], [19, 20], [10, 30], [21, 37], [15, 41]]) {
    px(b, x, y, '#ffffff', GLOW);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(b, x + dx, y + dy, '#e9dcff', GLOW);
  }
  // the panel swung open towards us, seen edge-on on the left
  rect(b, 1, 1, 5, 48, '#6e4a33', WOOD);
  vline(b, 1, 1, 48, '#86593d', WOOD);
  vline(b, 5, 1, 48, '#4f3322', WOOD);
  for (let y = 6; y <= 25; y++) px(b, 3, y, '#e0b54a', WOOD); // the edge of the gilded frame
  finish(b);
});

/* ---- arcade cabinet (26x46): animated screen, control panel at the twin's hand height ---- */
const PLASTIC = mat('plastic', '#3d3528');
const CAB = mat('cabinet', '#1d1030');
function arcadeCabinet(b, on) {
  // marquee
  rect(b, 1, 1, 24, 6, '#3a1f63', CAB);
  rect(b, 2, 2, 22, 4, on ? '#ffd84d' : '#6b5a3a', CAB);
  hline(b, 2, 23, 2, on ? '#fff3b0' : '#7d6b48', CAB);
  hline(b, 2, 23, 5, on ? '#f59e0b' : '#55462c', CAB);
  art(b, 9, 3, ['p.p.p.p', 'ppppppp'], { p: [on ? '#e0338f' : '#4a3a2a', CAB] });
  // body with a darker side panel and a pink lightning bolt on it
  rect(b, 2, 7, 22, 38, '#5a2f8f', CAB);
  rect(b, 2, 7, 3, 38, '#40206b', CAB);
  vline(b, 23, 7, 44, '#40206b', CAB);
  art(b, 2, 12, ['.p', 'p.', 'pp', '.p', 'p.'], { p: [on ? '#ff5fd2' : '#8a3f7c', CAB] });
  // screen in its bezel, a speaker grille under it
  rect(b, 5, 8, 16, 17, '#151526', CAB);
  rect(b, 6, 9, 14, 15, on ? '#0c1430' : '#10121c', CAB);
  for (let x = 8; x < 19; x += 2) vline(b, x, 26, 28, '#40206b', CAB);
  // control panel at the twin's hand height: joystick + three buttons
  rect(b, 3, 31, 22, 2, '#8f63cf', CAB);
  hline(b, 3, 24, 31, '#b08ce6', CAB);
  rect(b, 3, 33, 22, 2, '#3a1f63', CAB);
  art(b, 8, 27, ['.r.', 'rRr', '.k.', '.k.'], { r: ['#ff5c5c', CAB], R: ['#c62828', CAB], k: ['#1c1f2b', CAB] });
  for (const [x, c] of [[14, '#3fe7ff'], [17, '#ffe066'], [20, '#ff6ad5']]) {
    px(b, x, 32, c, CAB);
    px(b, x + 1, 32, shade(c, 0.7), CAB);
  }
  // coin door and kick plate
  rect(b, 9, 36, 9, 6, '#2a1648', CAB);
  hline(b, 9, 17, 36, '#4a2a78', CAB);
  for (const x of [11, 15]) vline(b, x, 38, 39, on ? '#ff9a3c' : '#5a3a1a', CAB);
  rect(b, 2, 43, 22, 2, '#2a1648', CAB);
  hline(b, 2, 23, 43, '#4a2a78', CAB);
}
const STARS = [[8, 11], [16, 13], [12, 18], [18, 10], [9, 21]];
sprite('arcade', 26, 46, { frames: 4, fps: 6, floor: true }, (b, f) => {
  arcadeCabinet(b, true);
  for (const [x, y] of STARS) px(b, x, y + (f % 2), '#4a5a8a', CAB);
  // a little space shooter: the alien wobbles, the ship fires, the alien goes pop
  const ax = [9, 11, 13, 11][f];
  if (f !== 2) art(b, ax, 12, ['g.g', 'ggg', 'g.g'].map((r, i) => (f % 2 && i === 2 ? '.g.' : r)), { g: ['#7cf27c', CAB] });
  else art(b, 12, 12, ['y.y', '.w.', 'y.y'], { y: ['#ffe066', CAB], w: ['#ffffff', CAB] });
  art(b, 12 + [0, 1, 0, -1][f], 21, ['.c.', 'ccc'], { c: ['#3fe7ff', CAB] });
  if (f < 2) vline(b, 13, f === 0 ? 18 : 15, f === 0 ? 19 : 16, '#ffe066', CAB);
  hline(b, 7, 8 + f, 10, '#ff6ad5', CAB); // score bar creeping up
  finish(b);
});
sprite('arcade_off', 26, 46, { floor: true }, (b) => {
  arcadeCabinet(b, false);
  for (let i = 0; i < 6; i++) px(b, 14 + i, 10 + i, '#262b40', CAB); // glare on the dark glass
  px(b, 13, 10, '#262b40', CAB);
  finish(b);
});

/* ---- little desk with a beige computer (30x34), the cursor blinks ---- */
sprite('computer', 30, 34, { frames: 2, fps: 2, floor: true }, (b, f) => {
  // desk
  rect(b, 1, 20, 28, 3, '#a86b3c', WOOD);
  hline(b, 1, 28, 20, '#c48a52', WOOD);
  hline(b, 1, 28, 22, '#7a4a26', WOOD);
  for (const x of [2, 25]) {
    rect(b, x, 23, 3, 10, '#8f5a2c', WOOD);
    vline(b, x, 23, 32, '#a86b3c', WOOD);
  }
  rect(b, 16, 23, 9, 5, '#9a6232', WOOD);
  hline(b, 16, 24, 23, '#7a4a26', WOOD);
  px(b, 20, 25, '#f2c14e', WOOD);
  // monitor
  rect(b, 4, 4, 18, 14, '#e3dccb', PLASTIC);
  hline(b, 4, 21, 4, '#f4efe4', PLASTIC);
  vline(b, 4, 4, 17, '#f4efe4', PLASTIC);
  vline(b, 21, 5, 17, '#b3aa95', PLASTIC);
  hline(b, 5, 21, 17, '#b3aa95', PLASTIC);
  rect(b, 6, 6, 14, 10, '#16281f', PLASTIC);
  for (const [y, w] of [[7, 9], [9, 6], [11, 10]]) hline(b, 7, 6 + w, y, '#4ade80', PLASTIC);
  hline(b, 7, 8, 13, '#4ade80', PLASTIC);
  if (f === 0) rect(b, 10, 13, 2, 2, '#b9ffd2', PLASTIC);
  px(b, 19, 16, '#4ade80', PLASTIC); // power light
  rect(b, 9, 18, 8, 2, '#cfc6b2', PLASTIC);
  // keyboard and a mug of coffee
  rect(b, 5, 19, 13, 1, '#e3dccb', PLASTIC);
  for (let x = 6; x < 17; x += 2) px(b, x, 19, '#b3aa95', PLASTIC);
  art(b, 22, 16, ['nnn.', 'OOOo', 'OOO.', 'ooo.'], { n: ['#6b3f1d', RED], O: ['#f59e0b', RED], o: ['#c2740a', RED] });
  finish(b);
});

/* ---- repo crates (26x22) in eight language colours, a </> stencil on the front ---- */
const STENCIL = ['..k...k.k...', '.k...k...k..', 'k....k....k.', '.k..k....k..', '..k.k...k...'];
for (const [id, base] of CRATES) {
  const [hi, light, mid, dark] = [1.5, 1.28, 0.8, 0.62].map((k) => shade(base, k));
  const m = mat(`crate_${id}`, shade(base, 0.32));
  sprite(`crate_${id}`, 26, 22, { floor: true }, (b) => {
    // lid seen from above
    rect(b, 1, 1, 24, 3, light, m);
    hline(b, 1, 24, 1, hi, m);
    for (const x of [9, 17]) vline(b, x, 2, 3, mid, m);
    // front: frame boards, plank seams, stencil, nails
    rect(b, 1, 4, 24, 17, base, m);
    hline(b, 1, 24, 4, dark, m);
    for (const x of [1, 23]) rect(b, x, 5, 2, 16, mid, m);
    rect(b, 3, 5, 20, 2, mid, m);
    rect(b, 3, 18, 20, 3, mid, m);
    hline(b, 3, 22, 7, dark, m);
    hline(b, 3, 22, 17, dark, m);
    vline(b, 1, 5, 20, light, m);
    art(b, 7, 10, STENCIL, { k: [hi, m] });
    for (const [x, y] of [[2, 6], [23, 6], [2, 19], [23, 19]]) px(b, x, y, dark, m);
    finish(b);
  });
}

/* ---- content props ---- */
// a markdown scroll on a little wooden lectern (20x30)
sprite('scroll', 20, 30, { floor: true }, (b) => {
  rect(b, 9, 21, 2, 6, WOODS.base, WOOD);
  vline(b, 10, 21, 26, WOODS.dark, WOOD);
  rect(b, 5, 27, 10, 2, WOODS.base, WOOD);
  hline(b, 5, 14, 27, WOODS.light, WOOD);
  hline(b, 6, 14, 28, WOODS.dark, WOOD);
  for (const y of [2, 18]) {
    rect(b, 3, y, 14, 3, PAPERS.shade, PAPER);
    hline(b, 3, 16, y, PAPERS.cream, PAPER);
    hline(b, 3, 16, y + 2, '#cdbf9f', PAPER);
    for (const x of [2, 17]) vline(b, x, y, y + 2, WOODS.base, WOOD);
  }
  rect(b, 4, 5, 12, 13, PAPERS.cream, PAPER);
  vline(b, 15, 5, 17, PAPERS.shade, PAPER);
  art(b, 6, 7, ['b.b', 'bbb', 'b.b'], { b: [RAMP.blue[2], PAPER] }); // '#' heading mark
  hline(b, 10, 13, 8, RAMP.blue[3], PAPER);
  for (const [y, w] of [[11, 8], [13, 6], [15, 8]]) hline(b, 6, 5 + w, y, PAPERS.ink, PAPER);
  rect(b, 9, 21, 2, 2, RAMP.red[2], RED); // wax seal on a ribbon
  px(b, 9, 23, RAMP.red[3], RED);
  finish(b);
});

// a PDF on a metal display stand (20x30): white page, the classic red label sticking out
sprite('pdf', 20, 30, { floor: true }, (b) => {
  for (const [x0, x1] of [[6, 4], [13, 15]]) for (let y = 19; y <= 28; y++) px(b, Math.round(x0 + ((x1 - x0) * (y - 19)) / 9), y, METALS.dark, METAL);
  hline(b, 5, 14, 24, METALS.base, METAL);
  art(b, 3, 1, [
    'wwwwwwwwwwwf..',
    'wwwwwwwwwwwff.',
    'wwwwwwwwwwwfff',
  ], { w: [PAPERS.white, PAPER], f: [PAPERS.grey, PAPER] });
  rect(b, 3, 4, 14, 16, PAPERS.white, PAPER);
  vline(b, 16, 4, 19, PAPERS.grey, PAPER);
  for (const [y, w] of [[3, 7], [5, 9], [16, 10], [18, 7]]) hline(b, 5, 4 + w, y, METALS.light, PAPER);
  rect(b, 1, 8, 18, 7, RAMP.red[2], RED);
  hline(b, 1, 18, 8, RAMP.red[1], RED);
  hline(b, 1, 18, 14, RAMP.red[3], RED);
  art(b, 4, 9, [
    'PP..DD..FFF',
    'P.P.D.D.F..',
    'PP..D.D.FF.',
    'P...D.D.F..',
    'P...DD..F..',
  ], { P: ['#ffffff', RED], D: ['#ffffff', RED], F: ['#ffffff', RED] });
  finish(b);
});

// a stack of books with a glass of çay on top (24x22)
sprite('book_stack', 24, 22, { floor: true }, (b) => {
  const book = (x, y, w, h, r, band) => {
    rect(b, x, y, w, h, r[2], INK);
    hline(b, x, x + w - 1, y, r[1], INK);
    hline(b, x, x + w - 1, y + h - 1, r[4], INK);
    vline(b, x, y, y + h - 1, r[3], INK);
    vline(b, x + w - 1, y, y + h - 1, r[3], INK);
    hline(b, x + band[0], x + band[1], y + Math.floor(h / 2), band[2], INK);
  };
  book(1, 16, 21, 5, RAMP.blue, [5, 15, RAMP.blue[0]]);
  book(3, 12, 18, 4, RAMP.red, [4, 13, RAMP.yellow[1]]);
  book(2, 8, 17, 4, RAMP.green, [3, 11, RAMP.green[0]]);
  book(5, 5, 14, 3, RAMP.yellow, [3, 9, RAMP.orange[3]]);
  // a tulip glass of tea on its saucer
  art(b, 9, 0, ['e##e', '.##.', 'e##e', 'e##e', 'llll'], { e: ['#fbfaf7', PAPER], '#': ['#c2410c', RED], l: [PAPERS.grey, PAPER] });
  finish(b);
});

// painting easels (28x40) with three tiny artworks
const EASEL_ART = {
  a: { // sunny landscape
    rows: [
      'SSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSyyS',
      'SSSWWWSSSSSSyYYy',
      'SSWWWWWSSSSSyYYy',
      'SSSSSSSSSSSSSyyS',
      'ssssssssssssssss',
      'ssssssssssssssss',
      'ssssssssLLLsssss',
      'ssssssLLLLLLLsss',
      'sLLLLLLLLLLLLLLs',
      'LLLLLLMMMMLLLLLL',
      'LLLLMMMMMMMMLLLL',
      'MMMMMMMMMMMMMMMM',
      'MMMMMMMMDMMMMMMM',
      'MMMMMMMDDDMMMMMM',
      'MMMMMMMMtMMMMMMM',
    ],
    pal: { S: ['#8ec5f0'], s: ['#b9dcf5'], W: ['#ffffff'], y: [RAMP.yellow[1]], Y: [RAMP.yellow[0]], L: [RAMP.green[1]], M: [RAMP.green[2]], D: [RAMP.green[4]], t: [WOODS.dark] },
  },
  b: { // a ginger cat
    rows: [
      'pppppppppppppppp',
      'ppoppppppppppopp',
      'pooopppppppooopp',
      'pooOopppppoOoopp',
      'poooooooooooooop',
      'poooooooooooooop',
      'poookooooookooop',
      'pooowkoooowkooop',
      'poooooooooooooop',
      'poooooonnooooooo',
      'poooooomMooooop',
      'pooooooooooooop.',
      'ppoooooooooooopp',
      'pppoooooooooopppp',
      'pppppooooooppppp',
      'pppppppppppppppp',
    ].map((r) => r.padEnd(16, 'p').slice(0, 16)),
    pal: { p: ['#f7b6c8'], o: [RAMP.orange[1]], O: [RAMP.red[1]], k: ['#1c1f2b'], w: ['#ffffff'], n: [RAMP.red[1]], m: [RAMP.orange[4]], M: [RAMP.orange[4]] },
  },
  c: { // night over a little house
    rows: [
      'nnnnnnnnnnnnnnnn',
      'nnwnnnnnnnnmmnnn',
      'nnnnnnnnnnmmnnnn',
      'nnnnnnwnnnmmnnnn',
      'nnnnnnnnnnnmmnnn',
      'nwnnnnnnnnnnnnwn',
      'nnnnnnnnnwnnnnnn',
      'nnnnnnnnnnnnnnnn',
      'nnnnhhhhnnnnnnnn',
      'nnnhhhhhhnnnnnnn',
      'nnnbbbbbbnnnnggg',
      'gggbyybbbggggggg',
      'gggbyybbbggggggg',
      'GGGbbbbbbGGGGGGG',
      'GGGGGGGGGGGGGGGG',
      'GGGGGGGGGGGGGGGG',
    ],
    pal: { n: ['#23305e'], w: ['#ffffff'], m: [RAMP.yellow[0]], h: [RAMP.red[3]], b: [METALS.dark], y: [RAMP.yellow[1]], g: ['#2a3f5a'], G: ['#1b2a3a'] },
  },
};
for (const id of ['a', 'b', 'c']) {
  sprite(`easel_${id}`, 28, 40, { floor: true }, (b) => {
    const leg = (x0, y0, x1, y1, c) => {
      for (let y = y0; y <= y1; y++) {
        const x = Math.round(x0 + ((x1 - x0) * (y - y0)) / (y1 - y0));
        px(b, x, y, c, WOOD);
        px(b, x + 1, y, WOODS.dark, WOOD);
      }
    };
    leg(13, 6, 13, 38, WOODS.mid); // back leg
    leg(9, 3, 4, 38, WOODS.light);
    leg(17, 3, 22, 38, WOODS.base);
    rect(b, 5, 4, 18, 19, '#f6f2ea', PAPER); // canvas
    vline(b, 22, 4, 22, PAPERS.grey, PAPER);
    hline(b, 5, 22, 22, PAPERS.grey, PAPER);
    art(b, 6, 5, EASEL_ART[id].rows, Object.fromEntries(Object.entries(EASEL_ART[id].pal).map(([k, v]) => [k, [v[0], PAPER]])));
    rect(b, 3, 23, 22, 2, WOODS.base, WOOD); // ledge
    hline(b, 3, 24, 23, WOODS.light, WOOD);
    rect(b, 12, 1, 4, 3, WOODS.base, WOOD); // clamp
    hline(b, 12, 15, 1, WOODS.light, WOOD);
    finish(b);
  });
}

// signpost with two arrows, for links (24x42)
sprite('sign', 24, 42, { floor: true }, (b) => {
  rect(b, 11, 3, 2, 38, WOODS.base, WOOD);
  vline(b, 12, 3, 40, WOODS.dark, WOOD);
  rect(b, 10, 2, 4, 1, WOODS.dark, WOOD);
  const board = (x0, x1, y, dir) => {
    rect(b, x0, y, x1 - x0 + 1, 7, WOODS.light, WOOD);
    hline(b, x0, x1, y, WOODS.hi, WOOD);
    hline(b, x0, x1, y + 6, WOODS.mid, WOOD);
    const tip = dir > 0 ? x1 + 1 : x0 - 1;
    for (let k = 0; k < 3; k++) vline(b, tip + dir * k, y + 1 + k, y + 5 - k, k === 2 ? WOODS.mid : WOODS.light, WOOD);
    for (const [a, w] of [[2, 4], [7, 3]]) hline(b, (dir > 0 ? x0 : x0 + 1) + a, (dir > 0 ? x0 : x0 + 1) + a + w - 1, y + 3, WOODS.deep, WOOD);
  };
  board(3, 17, 6, 1);
  board(6, 20, 16, -1);
  for (const y of [9, 19]) px(b, 11, y, METALS.deep, WOOD);
  art(b, 7, 38, ['.g..g...g.', 'gGg.Gg.gG.', 'GGGGGGgGGg'], { g: [RAMP.green[1], PLANT], G: [RAMP.green[2], PLANT] });
  finish(b);
});

// a galvanised bin (24x30), closed and with the lid up (banana peel included)
function binBody(b) {
  rect(b, 3, 9, 18, 20, RAMP.grey[2], METAL);
  vline(b, 4, 9, 28, RAMP.grey[0], METAL);
  vline(b, 5, 9, 28, RAMP.grey[1], METAL);
  vline(b, 19, 9, 28, RAMP.grey[3], METAL);
  vline(b, 20, 9, 28, RAMP.grey[4], METAL);
  for (const x of [8, 12, 16]) {
    vline(b, x, 13, 24, RAMP.grey[3], METAL);
    vline(b, x - 1, 13, 24, RAMP.grey[1], METAL);
  }
  for (const y of [11, 26]) {
    hline(b, 3, 20, y, RAMP.grey[3], METAL);
    hline(b, 3, 20, y - 1, RAMP.grey[1], METAL);
  }
}
sprite('bin', 24, 30, { floor: true }, (b) => {
  binBody(b);
  rect(b, 2, 6, 20, 3, RAMP.grey[1], METAL);
  hline(b, 2, 21, 6, RAMP.grey[0], METAL);
  hline(b, 2, 21, 8, RAMP.grey[3], METAL);
  hline(b, 5, 18, 5, RAMP.grey[1], METAL);
  art(b, 9, 2, ['kkkkkk', 'k....k', 'k....k'], { k: [RAMP.grey[4], METAL] });
  finish(b);
});
sprite('bin_open', 24, 30, { floor: true }, (b) => {
  // the lid tipped back behind the can
  rect(b, 4, 0, 16, 6, RAMP.grey[3], METAL);
  hline(b, 4, 19, 0, RAMP.grey[1], METAL);
  hline(b, 5, 18, 5, RAMP.grey[4], METAL);
  binBody(b);
  hline(b, 3, 20, 8, RAMP.grey[0], METAL);
  rect(b, 4, 9, 16, 2, '#3a3f4c', METAL);
  // a crumpled page and a banana peel hanging over the rim
  art(b, 6, 6, ['.ww.', 'wwgw', '.ww.'], { w: [PAPERS.white, PAPER], g: [PAPERS.grey, PAPER] });
  art(b, 12, 5, [
    '..Yy..',
    '.YYyy.',
    'Yy..Yy',
    'y....y',
    'y....k',
    'k.....',
  ], { Y: [RAMP.yellow[1], BRASS], y: [RAMP.yellow[2], BRASS], k: [WOODS.dark, BRASS] });
  finish(b);
});

// a cosy bed (44x22): headboard left, quilt, pillow, a little teddy
sprite('bed', 44, 22, { floor: true }, (b) => {
  rect(b, 1, 2, 5, 19, WOODS.base, WOOD);
  hline(b, 2, 4, 1, WOODS.base, WOOD);
  vline(b, 1, 2, 20, WOODS.light, WOOD);
  vline(b, 5, 2, 20, WOODS.dark, WOOD);
  rect(b, 39, 9, 4, 12, WOODS.base, WOOD);
  hline(b, 40, 41, 8, WOODS.base, WOOD);
  vline(b, 39, 9, 20, WOODS.light, WOOD);
  vline(b, 42, 9, 20, WOODS.dark, WOOD);
  rect(b, 6, 16, 33, 3, WOODS.mid, WOOD);
  hline(b, 6, 38, 16, WOODS.base, WOOD);
  rect(b, 6, 12, 33, 4, PAPERS.white, CLOTH); // mattress
  hline(b, 6, 38, 15, PAPERS.grey, CLOTH);
  rect(b, 15, 10, 24, 7, RAMP.blue[2], CLOTH); // quilt, draped over the side
  for (let x = 17; x < 39; x += 4) vline(b, x, 10, 16, RAMP.blue[1], CLOTH);
  hline(b, 15, 38, 13, RAMP.blue[1], CLOTH);
  hline(b, 15, 38, 16, RAMP.blue[3], CLOTH);
  rect(b, 15, 10, 3, 6, PAPERS.cream, CLOTH); // turned-down sheet
  rect(b, 6, 8, 9, 5, '#ffffff', CLOTH); // pillow
  hline(b, 7, 14, 12, PAPERS.grey, CLOTH);
  vline(b, 14, 9, 12, PAPERS.grey, CLOTH);
  art(b, 9, 4, ['b..b', 'bbbb', 'bkkb', '.bb.'], { b: [WOODS.light, WOOD], k: [WOODS.deep, WOOD] }); // teddy
  finish(b);
});

/* ---- floor decor ---- */
// a leafy plant in a terracotta pot (16x28)
sprite('plant', 16, 28, { floor: true }, (b) => {
  art(b, 1, 1, [
    '.....LL.......',
    '....LLMM...LL.',
    '...LLMMD..LLMD',
    '...LMMDD.LMMDD',
    '....MDDs.MMDD.',
    '.LL..Dss.DDs..',
    'LLMM..s.sss...',
    'LMMDD.s.s.LLM.',
    '.MDDDss.sLLMMD',
    '..DDs.s.sMMMDD',
    '.....ss.s.DDD.',
    '.LLM..sss.....',
    'LLMMD.ss..LL..',
    '.MMDDss..LMMD.',
    '..DDDss.sMMDD.',
    '.....sssss.DD.',
    '......sss.....',
  ], { L: [RAMP.green[1], PLANT], M: [RAMP.green[2], PLANT], D: [RAMP.green[4], PLANT], s: ['#23502b', PLANT] });
  rect(b, 3, 17, 10, 2, '#e0844f', CLAY);
  hline(b, 3, 12, 17, '#f0a070', CLAY);
  hline(b, 4, 11, 19, '#a5502b', CLAY);
  rect(b, 4, 20, 8, 4, '#c86a3c', CLAY);
  rect(b, 5, 24, 6, 3, '#c86a3c', CLAY);
  vline(b, 4, 20, 23, '#e0844f', CLAY);
  vline(b, 11, 20, 23, '#a5502b', CLAY);
  vline(b, 10, 24, 26, '#a5502b', CLAY);
  hline(b, 5, 10, 26, '#7a3a1f', CLAY);
  finish(b);
});

// a floor lamp with a warm, lit shade (14x40)
sprite('lamp', 14, 40, { floor: true }, (b) => {
  rect(b, 6, 0, 2, 2, RAMP.yellow[3], BRASS);
  for (let y = 2; y <= 11; y++) {
    const half = 3 + Math.floor((y - 2) / 2);
    const x0 = 7 - half;
    const x1 = 6 + half;
    hline(b, x0, x1, y, PAPERS.cream, BRASS);
    px(b, x0, y, '#ffffff', BRASS);
    px(b, x1, y, PAPERS.shade, BRASS);
    if (y > 3 && y % 3 === 0) hline(b, x0 + 1, x1 - 1, y, '#f9f3e3', BRASS);
  }
  hline(b, 2, 11, 2, PAPERS.shade, BRASS);
  hline(b, 1, 12, 11, '#ffd37a', BRASS);
  rect(b, 6, 12, 2, 24, METALS.dark, METAL);
  vline(b, 6, 12, 35, METALS.base, METAL);
  vline(b, 9, 12, 13, RAMP.yellow[3], BRASS);
  px(b, 9, 14, RAMP.yellow[2], BRASS);
  rect(b, 3, 36, 8, 3, METALS.deep, METAL);
  hline(b, 3, 10, 36, METALS.dark, METAL);
  px(b, 4, 36, METALS.base, METAL);
  finish(b);
});

// a round rug, a flat floor decal (48x6): its last row is the near edge
sprite('rug', 48, 6, { floor: true }, (b) => {
  const spans = [[9, 38], [4, 43], [1, 46], [1, 46], [4, 43], [9, 38]];
  spans.forEach(([x0, x1], y) => {
    hline(b, x0, x1, y, RAMP.red[3], GLOW);
    if (y > 0 && y < 5) hline(b, x0 + 2, x1 - 2, y, RAMP.red[2], GLOW);
    if (y === 2 || y === 3) hline(b, x0 + 5, x1 - 5, y, RAMP.yellow[2], GLOW);
  });
  for (let x = 8; x < 40; x += 6) {
    px(b, x, 2, RAMP.red[2], GLOW);
    px(b, x + 1, 3, RAMP.red[2], GLOW);
    px(b, x + 3, 2, '#fbfaf7', GLOW);
  }
  for (const y of [2, 3]) {
    px(b, 0, y, PAPERS.cream, GLOW);
    px(b, 47, y, PAPERS.cream, GLOW);
  }
});

/* ---- wall decor (hang anywhere on the wall) ---- */
sprite('poster_a', 16, 22, {}, (b) => {
  rect(b, 1, 1, 14, 20, '#f6f2ea', PAPER);
  rect(b, 2, 2, 12, 18, '#23305e', PAPER);
  for (const [x, y] of [[3, 4], [11, 3], [12, 9], [4, 12], [10, 15]]) px(b, x, y, '#ffffff', PAPER);
  art(b, 5, 4, [
    '..rr..',
    '.rwwr.',
    '.wwww.',
    '.wbbw.',
    '.wbbw.',
    '.wwww.',
    'rwwwwr',
    'rrwwrr',
    'r.yy.r',
    '..oo..',
    '..yo..',
    '...o..',
  ], { r: [RAMP.red[2], PAPER], w: ['#f6f2ea', PAPER], b: [RAMP.blue[1], PAPER], y: [RAMP.yellow[1], PAPER], o: [RAMP.orange[2], PAPER] });
  for (const x of [1, 13]) rect(b, x, 0, 2, 2, '#f3e6b0', PAPER); // tape
  finish(b);
});
sprite('poster_b', 16, 22, {}, (b) => {
  rect(b, 1, 1, 14, 20, '#f6f2ea', PAPER);
  rect(b, 2, 2, 12, 18, RAMP.purple[4], PAPER);
  art(b, 3, 5, [
    '.yy......yy.',
    '.y........y.',
    '.y..p.p...y.',
    'y..ppppp...y',
    '.y.ppppp..y.',
    '.y..ppp...y.',
    '.y...p....y.',
    '.yy......yy.',
  ], { y: [RAMP.yellow[1], PAPER], p: ['#ff6ad5', PAPER] });
  hline(b, 4, 11, 16, RAMP.purple[1], PAPER);
  hline(b, 5, 9, 18, RAMP.purple[2], PAPER);
  for (const x of [1, 13]) rect(b, x, 0, 2, 2, '#f3e6b0', PAPER);
  finish(b);
});

/* ---- carried items (16x16 icons, drawn by the app above the twin's fists) ---- */
const ICON = (key, rows, pal) =>
  sprite(key, 16, 16, {}, (b) => {
    art(b, 0, 0, rows, pal);
    finish(b);
  });
const PAGE = [
  '................',
  '...wwwwwwwf.....',
  '...wwwwwwwff....',
  '...wwwwwwwfff...',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...wwwwwwwwwwW..',
  '...WWWWWWWWWWW..',
  '................',
];
const pagePal = { w: [PAPERS.white, PAPER], W: [PAPERS.grey, PAPER], f: ['#c3bfb6', PAPER], l: [METALS.base, PAPER] };
const withLines = (rows, lines) =>
  rows.map((r, y) => {
    const ln = lines.find((l) => l[0] === y);
    return ln ? r.slice(0, ln[1]) + 'l'.repeat(ln[2] - ln[1] + 1) + r.slice(ln[2] + 1) : r;
  });
ICON('item_file', withLines(PAGE, [[5, 5, 10], [7, 5, 11], [9, 5, 9], [11, 5, 11]]), pagePal);
ICON('item_pdf', [
  ...withLines(PAGE, [[5, 5, 10]]).slice(0, 7),
  '.RRRRRRRRRRRRRR.',
  '.RPP.DD..FFF.RR.',
  '.RP.PD.D.F...RR.',
  '.RPP.D.D.FF..RR.',
  '.RP..D.D.F...RR.',
  '.RP..DD..F...RR.',
  '.rrrrrrrrrrrrrr.',
  '...WWWWWWWWWWW..',
  '................',
], { ...pagePal, R: [RAMP.red[2], RED], r: [RAMP.red[3], RED], P: ['#ffffff', RED], D: ['#ffffff', RED], F: ['#ffffff', RED] });
ICON('item_text', [
  '................',
  '...m..m..m..m...',
  '..ymyymyymyymy..',
  '..YYYYYYYYYYYY..',
  '..YrYYYYYYYYYY..',
  '..YrbbbbbbbbbY..',
  '..YrYYYYYYYYYY..',
  '..Yrbbbbbbbbbb..',
  '..YrYYYYYYYYYY..',
  '..YrbbbbbbbYYY..',
  '..YrYYYYYYYYYY..',
  '..Yrbbbbbbbbbb..',
  '..YrYYYYYYYYYY..',
  '..YrYYYYYYYYYY..',
  '..yyyyyyyyyyyy..',
  '................',
], { m: [METALS.dark, METAL], y: [RAMP.yellow[2], BRASS], Y: [RAMP.yellow[0], BRASS], r: [RAMP.red[1], BRASS], b: [RAMP.blue[1], BRASS] });
ICON('item_image', [
  '................',
  '................',
  '.ffffffffffffff.',
  '.fssssssssssssf.',
  '.fssssssssyysSf.',
  '.fssWWsssyYYySf.',
  '.fsWWWWsssyysSf.',
  '.fsssssssLLssSf.',
  '.fsssssLLLLLLSf.',
  '.fLLssLLLLMMMLf.',
  '.fLLLLLMMMMMMMf.',
  '.fMMMMMMMMMDMMf.',
  '.fMMMMMMMMDDDMf.',
  '.ffffffffffffff.',
  '................',
  '................',
], { f: ['#f6f2ea', PAPER], s: ['#8ec5f0', PAPER], S: ['#7cb5e6', PAPER], W: ['#ffffff', PAPER], y: [RAMP.yellow[1], PAPER], Y: [RAMP.yellow[0], PAPER], L: [RAMP.green[1], PAPER], M: [RAMP.green[2], PAPER], D: [RAMP.green[4], PAPER] });
ICON('item_app', [
  '................',
  '................',
  '...hhhhhhhhhh...',
  '..hllllllllllb..',
  '..hlpppppppppd..',
  '..hlpppwwppppd..',
  '..hlpppwwwwppd..',
  '..hlpppwwwwwwd..',
  '..hlpppwwwwwwd..',
  '..hlpppwwwwppd..',
  '..hlpppwwppppd..',
  '..hlpppppppppd..',
  '..bddddddddddd..',
  '...dddddddddd...',
  '................',
  '................',
], { h: [RAMP.purple[0], INK], l: [RAMP.purple[1], INK], p: [RAMP.purple[2], INK], b: [RAMP.purple[3], INK], d: [RAMP.purple[4], INK], w: ['#ffffff', INK] });
ICON('item_link', [
  '................',
  '..........bbb...',
  '.........bBBBb..',
  '........bB...Bb.',
  '.......bB.....B.',
  '......bBB....Bb.',
  '.....bBbBB..Bb..',
  '....bBb..BBBb...',
  '...bBb..bBbb....',
  '..bB....Bb......',
  '.bB....bB.......',
  '.bB...Bb........',
  '.bBB.BBb........',
  '..bBBBb.........',
  '...bbb..........',
  '................',
], { b: [RAMP.blue[3], METAL], B: [RAMP.cyan[1], METAL] });
ICON('item_folder', [
  '................',
  '................',
  '.ttttt..........',
  '.tTTTTt.........',
  '.tTTTTTttttttt..',
  '.tTTTTTTTTTTTt..',
  '.hhhhhhhhhhhhhh.',
  '.FFFFFFFFFFFFFF.',
  '.FFFFFFFFFFFFFF.',
  '.FFFFFFFFFFFFFF.',
  '.FFFFFFFFFFFFFF.',
  '.FFFFFFFFFFFFFF.',
  '.FFFFFFFFFFFFFF.',
  '.ffffffffffffff.',
  '................',
  '................',
], { t: [RAMP.yellow[3], BRASS], T: [RAMP.yellow[2], BRASS], h: [RAMP.yellow[0], BRASS], F: [RAMP.yellow[1], BRASS], f: [RAMP.yellow[3], BRASS] });

/* ---- effects (no outlines) ---- */
const FXM = GLOW;
sprite('sparkle', 12, 12, { frames: 4, fps: 8 }, (b, f) => {
  const r = [1, 3, 5, 3][f];
  const cx = 5;
  const cy = 5;
  if (f === 3) {
    for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) px(b, cx + dx, cy + dy, '#ffe9a8', FXM);
    for (const [dx, dy] of [[-2, -2], [2, 2], [2, -2], [-2, 2]]) px(b, cx + dx, cy + dy, '#fff3b0', FXM);
    px(b, cx, cy, '#ffffff', FXM);
    return;
  }
  for (let k = 1; k <= r; k++) {
    const c = k === r ? '#ffd84d' : k > r / 2 ? '#ffe9a8' : '#ffffff';
    for (const [dx, dy] of [[0, -k], [0, k], [-k, 0], [k, 0]]) px(b, cx + dx, cy + dy, c, FXM);
  }
  px(b, cx, cy, '#ffffff', FXM);
  if (r >= 3) for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) px(b, cx + dx, cy + dy, '#fff3b0', FXM);
  if (r >= 5) for (const [dx, dy] of [[-3, -3], [3, 3], [3, -3], [-3, 3]]) px(b, cx + dx, cy + dy, '#ffe9a8', FXM);
});
sprite('dust', 14, 8, { frames: 4, fps: 10 }, (b, f) => {
  const puff = (x, y, r, c, cs) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) px(b, x + i, y + j, j > 0 && i > 0 ? cs : c, FXM);
  };
  if (f === 0) puff(7, 6, 1, '#ece6da', '#d4cbbd');
  if (f === 1) {
    puff(4, 5, 2, '#ece6da', '#d4cbbd');
    puff(9, 5, 2, '#ece6da', '#d4cbbd');
  }
  if (f === 2) {
    puff(3, 4, 2, '#f3eee5', '#ddd5c8');
    puff(7, 3, 2, '#f3eee5', '#ddd5c8');
    puff(11, 4, 2, '#f3eee5', '#ddd5c8');
  }
  if (f === 3) for (const [x, y] of [[1, 3], [5, 1], [8, 2], [12, 3], [10, 0], [3, 0]]) px(b, x, y, '#e6e0d5', FXM);
});
const EX = mat('exclaim', '#5c3d0c');
sprite('exclaim', 8, 12, { frames: 2, fps: 4 }, (b, f) => {
  const y0 = f === 0 ? 1 : 0;
  art(b, 1, y0, ['.YYy.', '.YYy.', '.YYy.', '.YYy.', '.YYy.', '..Y..', '.....', '.YYy.', '.yyy.'], { Y: ['#fff3b0', EX], y: [RAMP.yellow[1], EX] });
  finish(b);
});

/* ---- theme decor ---- */
// workshop: a red toolbox (24x14)
sprite('toolbox', 24, 14, { floor: true }, (b) => {
  art(b, 8, 1, ['kkkkkkkk', 'k......k', 'k......k'], { k: [METALS.dark, METAL] });
  rect(b, 2, 4, 20, 9, RAMP.red[2], RED);
  hline(b, 2, 21, 4, RAMP.red[1], RED);
  hline(b, 2, 21, 7, RAMP.red[4], RED);
  hline(b, 2, 21, 8, RAMP.red[1], RED);
  vline(b, 21, 5, 12, RAMP.red[3], RED);
  hline(b, 3, 21, 12, RAMP.red[3], RED);
  for (const x of [5, 17]) rect(b, x, 6, 2, 3, METALS.light, METAL);
  finish(b);
});
// arcade: a tall speaker with neon-rimmed cones (16x30)
sprite('speaker', 16, 30, { floor: true }, (b) => {
  rect(b, 2, 1, 12, 28, '#2a2b3e', DARK);
  vline(b, 2, 1, 28, '#3c3e58', DARK);
  hline(b, 2, 13, 1, '#3c3e58', DARK);
  const cone = (cx, cy, r) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j);
      if (d <= r + 0.3) px(b, cx + i, cy + j, d > r - 0.8 ? RAMP.cyan[1] : d > r - 1.8 ? '#1b1c2b' : d < 1.2 ? '#4b4d6a' : '#14151f', DARK);
    }
  };
  cone(7.5 | 0, 7, 2);
  cone(7, 18, 4);
  hline(b, 4, 11, 25, '#1b1c2b', DARK);
  px(b, 11, 26, '#ff6ad5', DARK);
  finish(b);
});
// library: a tall bookcase (28x48)
sprite('bookshelf', 28, 48, { floor: true }, (b) => {
  rect(b, 1, 1, 26, 46, WOODS.mid, WOOD);
  vline(b, 1, 1, 46, WOODS.light, WOOD);
  hline(b, 1, 26, 1, WOODS.light, WOOD);
  vline(b, 26, 2, 46, WOODS.deep, WOOD);
  const tones = [RAMP.red, RAMP.blue, RAMP.green, RAMP.yellow, RAMP.purple, RAMP.cyan, RAMP.orange];
  [4, 15, 26].forEach((y0, shelf) => {
    rect(b, 3, y0, 22, 10, WOODS.deep, WOOD);
    let x = 3;
    let k = shelf * 3;
    while (x < 25) {
      const w = 2 + (hash(k, shelf) % 2);
      const h = 7 + (hash(k, 7) % 3);
      const r = tones[k % tones.length];
      const lean = hash(k, 1) % 7 === 0 && x > 4;
      if (x + w > 25) break;
      rect(b, x, y0 + 10 - h, w, h, r[2], WOOD);
      vline(b, x + w - 1, y0 + 10 - h, y0 + 9, r[3], WOOD);
      if (w > 2) px(b, x + 1, y0 + 10 - h + 1, r[0], WOOD);
      if (lean) px(b, x - 1, y0 + 10 - h + 1, r[2], WOOD);
      x += w + (hash(k, 4) % 5 === 0 ? 1 : 0);
      k++;
    }
    rect(b, 2, y0 + 10, 24, 1, WOODS.light, WOOD);
  });
  rect(b, 3, 37, 22, 8, WOODS.deep, WOOD); // bottom cupboard
  bevel(b, 3, 37, 11, 8, WOODS.base, WOODS.light, WOODS.dark, WOOD);
  bevel(b, 14, 37, 11, 8, WOODS.base, WOODS.light, WOODS.dark, WOOD);
  px(b, 12, 41, RAMP.yellow[1], WOOD);
  px(b, 15, 41, RAMP.yellow[1], WOOD);
  rect(b, 1, 45, 26, 2, WOODS.dark, WOOD);
  finish(b);
});
// gallery: a padded bench (32x12)
sprite('bench', 32, 12, { floor: true }, (b) => {
  rect(b, 1, 2, 30, 4, '#3c4a63', CLOTH);
  hline(b, 1, 30, 2, '#56688a', CLOTH);
  hline(b, 1, 30, 5, '#2b3547', CLOTH);
  for (const x of [8, 16, 24]) px(b, x, 3, '#2b3547', CLOTH);
  for (const x of [3, 27]) {
    rect(b, x, 6, 2, 5, METALS.dark, METAL);
    vline(b, x, 6, 10, METALS.base, METAL);
  }
  hline(b, 5, 26, 8, METALS.dark, METAL);
  finish(b);
});
// alley: a heap of bin bags (26x18)
sprite('trashbags', 26, 18, { floor: true }, (b) => {
  const bag = (cx, cy, rx, ry) => {
    for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
      const d = (i * i) / (rx * rx) + (j * j) / (ry * ry);
      if (d <= 1.05) px(b, cx + i, cy + j, d < 0.35 && i < 0 && j < 0 ? '#5a5d6e' : i > rx / 3 || j > ry / 2 ? '#22232b' : '#33353f', DARK);
    }
  };
  bag(17, 11, 7, 5);
  bag(8, 10, 7, 6);
  art(b, 6, 2, ['k.k', '.k.', 'kkk'], { k: ['#33353f', DARK] });
  art(b, 16, 4, ['k.k', '.k.'], { k: ['#33353f', DARK] });
  px(b, 5, 8, '#7a7d90', DARK);
  hline(b, 2, 23, 16, '#22232b', DARK);
  finish(b);
});
// wall decor for the workshop pegboard: tools hanging off it (24x20)
sprite('pegtools', 24, 20, {}, (b) => {
  art(b, 1, 1, [
    '.AA.',
    'A..A',
    'A..A',
    '.AA.',
    '.Aa.',
    '.Aa.',
    '.Aa.',
    '.Aa.',
    '.Aa.',
    '.Aa.',
    'AAaA',
    'A..A',
    '.AA.',
  ], { A: [METALS.light, METAL], a: [METALS.dark, METAL] });
  art(b, 8, 1, [
    'AAAAAa',
    'AAAAAa',
    '..33..',
    '..34..',
    '..34..',
    '..34..',
    '..34..',
    '..34..',
    '..34..',
    '..44..',
  ], { A: [METALS.light, METAL], a: [METALS.dark, METAL], 3: [WOODS.light, WOOD], 4: [WOODS.dark, WOOD] });
  art(b, 17, 3, [
    '.rr.',
    'rRRr',
    'rRRr',
    'rRRr',
    '.AA.',
    '.Aa.',
    '.Aa.',
    '.Aa.',
    '..a.',
  ], { r: [RAMP.red[1], RED], R: [RAMP.red[3], RED], A: [METALS.light, METAL], a: [METALS.dark, METAL] });
  finish(b);
});

/** Room themes: wall + floor tiles and 1-3 floor-standing decor sprites that set the mood. */
export const THEMES = {
  default: { wall: 'wall_default', floor: 'floor_default', decor: ['plant', 'lamp'] },
  projects: { wall: 'wall_projects', floor: 'floor_projects', decor: ['toolbox', 'lamp'] },
  games: { wall: 'wall_games', floor: 'floor_games', decor: ['speaker', 'arcade_off'] },
  home: { wall: 'wall_home', floor: 'floor_home', decor: ['rug', 'plant', 'lamp'] },
  documents: { wall: 'wall_documents', floor: 'floor_documents', decor: ['bookshelf', 'plant'] },
  pictures: { wall: 'wall_pictures', floor: 'floor_pictures', decor: ['bench', 'plant'] },
  trash: { wall: 'wall_trash', floor: 'floor_trash', decor: ['trashbags'] },
};

/* ------------------------------------------------------------------ */
/* Checks + packing                                                     */
/* ------------------------------------------------------------------ */
/* ---- palette: the sheet must stay an indexed PNG (<= 255 colours + transparent) ---- */
const oklab = (c) => {
  const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [lin(c[0]), lin(c[1]), lin(c[2])];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2];
};
/**
 * Merge near-identical colours (OKLab distance below `same`) and, if the sheet still has more than
 * `max`, keep merging the closest pair; the rarer colour always takes the more common one.
 * Returns the colour count, the number of merges and the largest merge distance (the build prints
 * them, so palette creep stays visible: an OKLab distance under ~0.02 is not noticeable).
 */
function reducePalette(sprites, max = 255, same = 0.012) {
  const key = (p, o) => ((p[o] << 16) | (p[o + 1] << 8) | p[o + 2]) >>> 0;
  const count = new Map();
  for (const s of sprites) for (const f of s.frames) for (let o = 0; o < f.px.length; o += 4) if (f.px[o + 3]) count.set(key(f.px, o), (count.get(key(f.px, o)) ?? 0) + 1);
  const cols = [...count.keys()].map((k) => ({ k, n: count.get(k), lab: oklab([k >> 16, (k >> 8) & 255, k & 255]), to: null }));
  const dist = (a, b) => Math.hypot(a.lab[0] - b.lab[0], a.lab[1] - b.lab[1], a.lab[2] - b.lab[2]);
  let alive = cols.slice();
  let merges = 0;
  let worst = 0;
  for (;;) {
    let best = null;
    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++) {
        const d = dist(alive[i], alive[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    if (!best || (best.d >= same && alive.length <= max)) break;
    const [a, b] = [alive[best.i], alive[best.j]];
    const [keep, drop] = a.n >= b.n ? [a, b] : [b, a];
    drop.to = keep;
    if (process.env.SCENE_PALETTE_LOG) console.log(`merge #${drop.k.toString(16).padStart(6, '0')} (${drop.n}) -> #${keep.k.toString(16).padStart(6, '0')} (${keep.n})  d=${best.d.toFixed(4)}`);
    keep.n += drop.n;
    alive = alive.filter((c) => c !== drop);
    merges++;
    worst = Math.max(worst, best.d);
  }
  const final = (c) => (c.to ? final(c.to) : c);
  const map = new Map(cols.map((c) => [c.k, final(c).k]));
  for (const s of sprites)
    for (const f of s.frames)
      for (let o = 0; o < f.px.length; o += 4) {
        if (!f.px[o + 3]) continue;
        const k = map.get(key(f.px, o));
        f.px[o] = k >> 16;
        f.px[o + 1] = (k >> 8) & 255;
        f.px[o + 2] = k & 255;
      }
  return { colours: alive.length, merges, worst };
}

export function buildScene() {
  const keys = new Set();
  for (const s of SPRITES) {
    if (keys.has(s.key)) throw new Error(`scene: duplicate sprite "${s.key}"`);
    keys.add(s.key);
    for (const f of s.frames) {
      if (s.key.startsWith('wall_') || s.key.startsWith('floor_')) {
        for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (!f.alpha(x, y)) throw new Error(`scene: tile ${s.key} has a hole at ${x},${y}`);
      }
      if (s.floor) {
        let contact = false;
        for (let x = 0; x < f.w; x++) contact ||= f.alpha(x, f.h - 1) > 0;
        if (!contact) throw new Error(`scene: ${s.key} does not touch the floor (empty bottom row)`);
      }
    }
  }
  for (const [k, t] of Object.entries(THEMES)) {
    for (const ref of [t.wall, t.floor, ...t.decor]) if (!keys.has(ref)) throw new Error(`scene: theme ${k} uses unknown sprite "${ref}"`);
    if (t.decor.length < 1 || t.decor.length > 3) throw new Error(`scene: theme ${k} needs 1-3 decor sprites`);
    for (const d of t.decor) if (!SPRITES.find((s) => s.key === d).floor) throw new Error(`scene: theme ${k} decor "${d}" does not stand on the floor`);
  }
  for (const s of SPRITES) if (s.floor && s.h > 52) throw new Error(`scene: ${s.key} is taller than 52 px`);
  // shelf packing: tallest first, 1 px gap
  const W = 256;
  const order = [...SPRITES].sort((a, b) => b.h - a.h || b.w * b.frames.length - a.w * a.frames.length);
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const s of order) {
    const sw = s.w * s.frames.length;
    if (sw > W) throw new Error(`scene: ${s.key} is wider than the sheet`);
    if (x + sw > W) {
      y += shelf + 1;
      x = 0;
      shelf = 0;
    }
    s.x = x;
    s.y = y;
    x += sw + 1;
    shelf = Math.max(shelf, s.h);
  }
  const palette = reducePalette(SPRITES);
  const sheet = new Bmp(W, y + shelf);
  for (const s of SPRITES) s.frames.forEach((f, i) => sheet.paste(f, s.x + i * s.w, s.y));
  return { sheet, sprites: SPRITES, themes: THEMES, tile: TILE, palette };
}
