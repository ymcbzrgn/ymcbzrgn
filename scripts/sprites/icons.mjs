/**
 * App icons for the phone home screen: 28x28 pixel-art tiles (a rounded square in a five-step colour
 * ramp, light from the top-left, with a white glyph that casts a one-pixel shadow). Shown at 2x (56 px),
 * the size of an app icon on a phone.
 *
 * Each icon is drawn on a small transparent layer with plain shapes (rect / line / disc) and a few ASCII
 * rows, then composited onto its tile: first the glyph's shadow, then the glyph itself. buildIcons()
 * draws everything, checks it and packs it into one sheet; build-icons.mjs writes icons.png and
 * icons.meta.ts.
 */
import { Bmp, rgba } from './lib.mjs';

export const TILE = 28;
const GLYPH = 18;
const GLYPH_X = 5;
const GLYPH_Y = 4;

/* ---------------------------------------------------------------- helpers */
const cache = new Map();
const col = (hex) => {
  let c = cache.get(hex);
  if (!c) cache.set(hex, (c = rgba(hex)));
  return c;
};
/** Darker (k < 1) or lighter (k > 1) version of a colour. */
const shade = (hex, k) => {
  const c = rgba(hex);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))));
  return '#' + [0, 1, 2].map((i) => f(c[i]).toString(16).padStart(2, '0')).join('');
};
const ramp = (hex) => ({ hi: shade(hex, 1.45), light: shade(hex, 1.13), base: hex, mid: shade(hex, 0.89), dark: shade(hex, 0.77), rim: shade(hex, 0.46) });

const put = (b, x, y, hex) => b.set(x, y, col(hex), 1);
const rect = (b, x, y, w, h, hex) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) put(b, i, j, hex);
};
const hline = (b, x0, x1, y, hex) => rect(b, x0, y, x1 - x0 + 1, 1, hex);
const vline = (b, x, y0, y1, hex) => rect(b, x, y0, 1, y1 - y0 + 1, hex);
/** A filled disc of the given radius around (cx, cy), pixel centres. */
const disc = (b, cx, cy, r, hex) => {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(b, x, y, hex);
};
/** A ring between two radii. */
const ring = (b, cx, cy, r0, r1, hex) => {
  for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++)
    for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d <= r1 * r1 && d >= r0 * r0) put(b, x, y, hex);
    }
};
/** A line with a square brush of `t` pixels (Bresenham). */
const line = (b, x0, y0, x1, y1, hex, t = 2) => {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    rect(b, x0, y0, t, t, hex);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
};
/** ASCII rows: pal maps a symbol to a colour; '.' leaves the pixel alone. */
function art(b, x, y, rows, pal) {
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      if (ch === '.') return;
      if (!pal[ch]) throw new Error(`icons: unknown symbol "${ch}"`);
      put(b, x + i, y + j, pal[ch]);
    })
  );
}

const W = '#ffffff';
const SOFT = '#dbe4f5';
const GREY = '#a9b6d0';
const INK = '#1e293b';

/* ------------------------------------------------------------------ tile */
/** The rounded square: banded ramp, light top/left edge, dark rim. */
function tile(r) {
  const b = new Bmp(TILE, TILE);
  const cut = [4, 2, 1, 1]; // pixels cut off the corner, per row from the edge
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return false;
    const ry = Math.min(y, TILE - 1 - y);
    const cx = Math.min(x, TILE - 1 - x);
    return cx >= (cut[ry] ?? 0);
  };
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (!inside(x, y)) continue;
      const t = y / (TILE - 1);
      put(b, x, y, t < 0.2 ? r.light : t < 0.58 ? r.base : t < 0.86 ? r.mid : r.dark);
    }
  // top and left highlight, one pixel in from the rim
  for (let x = 0; x < TILE; x++) if (inside(x, 1) && inside(x - 1, 1) && inside(x + 1, 1) && inside(x, 0)) put(b, x, 1, r.hi);
  for (let y = 3; y < TILE - 3; y++) if (inside(1, y)) put(b, 1, y, r.light);
  // rim: any pixel of the tile touching the outside
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) put(b, x, y, r.rim);
    }
  return b;
}

/** Glyph on its tile: a one-pixel shadow first, then the glyph. */
function compose(r, drawGlyph, shadow) {
  const b = tile(r);
  const g = new Bmp(GLYPH, GLYPH);
  drawGlyph(g);
  const sh = shadow ?? r.dark;
  for (let y = 0; y < GLYPH; y++)
    for (let x = 0; x < GLYPH; x++) {
      if (!g.alpha(x, y)) continue;
      if (!g.alpha(x, y + 1)) put(b, GLYPH_X + x, GLYPH_Y + y + 1, sh);
    }
  for (let y = 0; y < GLYPH; y++)
    for (let x = 0; x < GLYPH; x++) {
      if (!g.alpha(x, y)) continue;
      const o = (y * GLYPH + x) * 4;
      b.set(GLYPH_X + x, GLYPH_Y + y, g.px.slice(o, o + 4), 1);
    }
  return b;
}

/* ----------------------------------------------------------------- glyphs */
const GLYPHS = {
  // the one-page CV: a page with a cut corner, a photo block, a name line and body lines
  cv(g) {
    for (let y = 0; y < 16; y++) hline(g, 2, y < 4 ? 10 + y : 13, y, W);
    for (let r = 1; r < 4; r++) hline(g, 10, 10 + r - 1, r, GREY); // the folded corner
    rect(g, 3, 5, 3, 3, '#f97316'); // photo
    hline(g, 7, 12, 5, GREY); // name
    hline(g, 7, 10, 7, GREY);
    for (const y of [10, 12]) hline(g, 3, 12, y, GREY);
    hline(g, 3, 8, 14, GREY);
  },

  // an envelope
  mail(g) {
    rect(g, 1, 3, 16, 11, W);
    // the flap: two diagonals meeting in the middle
    for (let i = 0; i < 7; i++) {
      put(g, 2 + i, 4 + i, GREY);
      put(g, 15 - i, 4 + i, GREY);
    }
    put(g, 8, 11, GREY);
    put(g, 9, 11, GREY);
    hline(g, 1, 16, 3, SOFT);
  },

  // the "in" of the professional network (a letterform, drawn on a blue tile)
  linkedin(g) {
    rect(g, 2, 3, 3, 3, W); // dot of the i
    rect(g, 2, 7, 3, 8, W); // stem of the i
    rect(g, 7, 7, 3, 8, W); // stem of the n
    rect(g, 10, 7, 4, 2, W); // arch
    rect(g, 11, 6, 3, 1, W);
    rect(g, 13, 7, 3, 8, W); // right stem
    put(g, 10, 9, W);
  },

  // a branch: two commits on a line and a branch coming off it
  github(g) {
    vline(g, 4, 5, 12, W);
    vline(g, 5, 5, 12, W);
    disc(g, 4.5, 3.5, 2.6, W); // top-left commit
    disc(g, 4.5, 13.5, 2.6, W); // bottom-left commit
    disc(g, 13.5, 3.5, 2.6, W); // branch tip
    // the branch curves from the tip down and left into the line
    vline(g, 13, 6, 8, W);
    vline(g, 14, 6, 8, W);
    line(g, 13, 8, 6, 12, W, 2);
  },

  // </> : the code
  projects(g) {
    line(g, 5, 2, 1, 7, W, 2);
    line(g, 1, 8, 5, 13, W, 2);
    line(g, 12, 2, 16, 7, W, 2);
    line(g, 16, 8, 12, 13, W, 2);
    line(g, 10, 1, 7, 14, W, 2);
  },

  // the career: a timeline, newest on top
  career(g) {
    vline(g, 3, 2, 15, SOFT);
    vline(g, 4, 2, 15, SOFT);
    const rows = [
      [3, 8, '#fde047'],
      [9, 6, W],
      [15, 9, W],
    ];
    for (const [y, len, dot] of rows) {
      disc(g, 3.5, y, 2.5, dot);
      rect(g, 9, y - 1, len, 2, W);
    }
  },

  // >_
  terminal(g) {
    line(g, 1, 3, 7, 8, '#4ade80', 2);
    line(g, 7, 9, 1, 14, '#4ade80', 2);
    rect(g, 9, 13, 8, 2, '#4ade80');
  },

  // a folder
  files(g) {
    rect(g, 1, 2, 7, 3, GREY); // the tab
    rect(g, 1, 4, 16, 10, SOFT); // the back
    rect(g, 1, 6, 16, 8, W); // the front
    hline(g, 1, 16, 6, SOFT);
  },

  // a gamepad
  games(g) {
    art(
      g,
      0,
      3,
      [
        '..WWWWWWWWWWWWWW..',
        '.WWWWWWWWWWWWWWWW.',
        'WWWWWWWWWWWWWWWWWW',
        'WWWWiWWWWWWWWWYWWW',
        'WWWiiiWWWWWWWYWYWW',
        'WWWWiWWWWWWWWWYWWW',
        'WWWWWWWWWWWWWWWWWW',
        '.WWWWWWWWWWWWWWWW.',
        '..WWWW......WWWW..',
      ],
      { W, i: INK, Y: '#fbbf24' }
    );
  },

  // two eighth notes joined by a beam
  music(g) {
    rect(g, 5, 2, 10, 3, W);
    rect(g, 5, 2, 2, 11, W);
    rect(g, 13, 2, 2, 11, W);
    art(g, 1, 10, ['.WWWW.', 'WWWWWW', 'WWWWWW', '.WWWW.'], { W });
    art(g, 9, 10, ['.WWWW.', 'WWWWWW', 'WWWWWW', '.WWWW.'], { W });
  },

  // a picture: sky, sun, hills
  photos(g) {
    rect(g, 0, 1, 18, 14, W);
    rect(g, 2, 3, 14, 10, '#7dd3fc');
    disc(g, 5.5, 6.5, 1.8, '#fde047');
    art(
      g,
      2,
      7,
      [
        '.........GG.....',
        '.......GGGGG....',
        '..G...GGGGGGG...',
        '.GGG.GGGGGGGGG..',
        'GGGGGGGGGGGGGGG.',
        'GGGGGGGGGGGGGGGG',
      ].map((r) => r.slice(0, 14)),
      { G: '#22c55e' }
    );
  },

  // a notepad with a pencil
  notes(g) {
    rect(g, 1, 1, 13, 15, W);
    rect(g, 1, 1, 13, 3, '#f59e0b');
    for (const y of [6, 9, 12]) hline(g, 3, 11, y, GREY);
    // the pencil
    line(g, 16, 5, 10, 14, '#fbbf24', 2);
    put(g, 9, 15, INK);
    put(g, 10, 15, INK);
  },

  // a gear
  settings(g) {
    const cx = 8.5;
    const cy = 8.5;
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < 18; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        let on = d <= 6 && d >= 2.8;
        // eight teeth
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          const along = dx * Math.cos(a) + dy * Math.sin(a);
          const across = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
          if (along > 4 && along <= 8 && across <= 1.7) on = true;
        }
        if (on) put(g, x, y, W);
      }
  },

  // a cup
  achievements(g) {
    rect(g, 4, 1, 10, 7, W);
    art(g, 5, 8, ['WWWWWWWW', '.WWWWWW.', '..WWWW..'], { W });
    rect(g, 7, 11, 4, 3, W);
    rect(g, 4, 14, 10, 2, W);
    // handles
    ring(g, 2.5, 4.5, 1.2, 2.6, W);
    ring(g, 15.5, 4.5, 1.2, 2.6, W);
    // a star
    put(g, 9, 3, '#fbbf24');
    rect(g, 8, 4, 3, 1, '#fbbf24');
    put(g, 9, 5, '#fbbf24');
  },

  // a chip: how the site is built
  aboutsite(g) {
    rect(g, 3, 3, 12, 12, W);
    rect(g, 6, 6, 6, 6, '#64748b');
    rect(g, 7, 7, 4, 4, W);
    for (const p of [4, 7, 10, 13]) {
      rect(g, p, 1, 2, 2, W);
      rect(g, p, 15, 2, 2, W);
      rect(g, 1, p, 2, 2, W);
      rect(g, 15, p, 2, 2, W);
    }
  },

  // the plain résumé: a page of lines
  resume(g) {
    rect(g, 2, 1, 14, 16, W);
    rect(g, 4, 3, 6, 2, '#16a34a');
    for (const y of [7, 10, 13]) hline(g, 4, 13, y, GREY);
    hline(g, 4, 9, 15, GREY);
  },

  // a play triangle in a ring: the 30-second story
  story(g) {
    ring(g, 8.5, 8.5, 6.4, 8, W);
    for (let i = 0; i < 7; i++) rect(g, 7 + i, 5 + i, 1, 7 - 2 * i < 1 ? 1 : 1, W);
    // triangle, drawn as columns
    for (let x = 0; x < 6; x++) vline(g, 7 + x, 5 + Math.floor(x / 2), 12 - Math.floor(x / 2), W);
  },
};

/** Tile colour of each icon. */
const COLOURS = {
  cv: '#f97316',
  mail: '#3b82f6',
  linkedin: '#0a66c2',
  github: '#374151',
  projects: '#6366f1',
  career: '#0d9488',
  terminal: '#111827',
  files: '#d97706',
  games: '#e11d48',
  music: '#9333ea',
  photos: '#0ea5e9',
  notes: '#eab308',
  settings: '#64748b',
  achievements: '#c2410c',
  aboutsite: '#475569',
  resume: '#16a34a',
  story: '#db2777',
};

export const ICON_KEYS = Object.keys(GLYPHS);

export function buildIcons() {
  for (const k of ICON_KEYS) if (!COLOURS[k]) throw new Error(`icons: no colour for "${k}"`);
  const icons = ICON_KEYS.map((key) => ({ key, bmp: compose(ramp(COLOURS[key]), GLYPHS[key], key === 'terminal' ? '#000000' : undefined) }));
  // shelf packing: 8 per row, 1 px gap
  const perRow = 8;
  const rows = Math.ceil(icons.length / perRow);
  const sheet = new Bmp(perRow * (TILE + 1) - 1, rows * (TILE + 1) - 1);
  const sprites = icons.map((icon, i) => {
    const x = (i % perRow) * (TILE + 1);
    const y = Math.floor(i / perRow) * (TILE + 1);
    sheet.paste(icon.bmp, x, y);
    return { key: icon.key, x, y };
  });
  return { sheet, sprites, tile: TILE };
}
