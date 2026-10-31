/**
 * Tiny dependency-free helpers for the sprite generator:
 * ASCII bitmaps with materials, compositing, automatic coloured outlines,
 * nearest-neighbour scaling and a PNG encoder (indexed when the image has <= 256 colours).
 */
import zlib from 'node:zlib';

export const rgba = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255,
];

/**
 * RGBA bitmap plus two bookkeeping layers used while composing a frame:
 *   mat  – material index per pixel (0 = nothing), decides outline colours
 *   id   – which part instance drew the pixel (lets a part in front draw a contour on the part behind)
 */
export class Bmp {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
    this.mat = new Uint8Array(w * h);
    this.id = new Uint16Array(w * h);
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x, y, c, mat = 0, id = 0) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.px.set(c, i * 4);
    this.mat[i] = mat;
    this.id[i] = id;
  }
  get(x, y) {
    const o = (y * this.w + x) * 4;
    return this.px.slice(o, o + 4);
  }
  alpha(x, y) {
    return this.inside(x, y) ? this.px[(y * this.w + x) * 4 + 3] : 0;
  }
  matAt(x, y) {
    return this.inside(x, y) ? this.mat[y * this.w + x] : 0;
  }
  idAt(x, y) {
    return this.inside(x, y) ? this.id[y * this.w + x] : 0;
  }
  clear(x, y) {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.px.fill(0, i * 4, i * 4 + 4);
    this.mat[i] = 0;
    this.id[i] = 0;
  }
  /** Copy `src` into this bitmap at (x, y); transparent pixels are skipped. */
  paste(src, x, y, { flip = false, flipY = false } = {}) {
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const sx = flip ? src.w - 1 - i : i;
        const sy = flipY ? src.h - 1 - j : j;
        const o = sy * src.w + sx;
        if (src.px[o * 4 + 3]) this.set(x + i, y + j, src.px.slice(o * 4, o * 4 + 4), src.mat[o], src.id[o]);
      }
  }
  fill(c, x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  clone() {
    const b = new Bmp(this.w, this.h);
    b.px.set(this.px);
    b.mat.set(this.mat);
    b.id.set(this.id);
    return b;
  }
}

/** ASCII bitmap -> {name,w,h,rows}; validates that every row has the same width. */
export function part(name, rows) {
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name}: row ${i} has width ${r.length}, expected ${w}: "${r}"`);
  });
  return { name, w, h: rows.length, rows };
}

/** Mirror a part horizontally (as data, so it can be edited further). */
export const mirror = (p, name = p.name + '_M') => part(name, p.rows.map((r) => [...r].reverse().join('')));

/** Return a copy of a part with some pixels replaced. edits: [[x, y, 'c'], ...] */
export function edit(p, name, edits) {
  const rows = p.rows.map((r) => r.split(''));
  for (const [x, y, ch] of edits) {
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) throw new Error(`${name}: edit out of range (${x},${y})`);
    rows[y][x] = ch;
  }
  return part(name, rows.map((r) => r.join('')));
}

/** Stamp a smaller part onto a copy of a bigger one at (x, y); '.' in the stamp leaves the base, ' ' clears it. */
export function stamp(base, name, overlays) {
  const rows = base.rows.map((r) => r.split(''));
  for (const [p, x, y] of overlays) {
    for (let j = 0; j < p.h; j++)
      for (let i = 0; i < p.w; i++) {
        const ch = p.rows[j][i];
        if (ch === '.') continue;
        const yy = y + j;
        const xx = x + i;
        if (yy < 0 || yy >= rows.length || xx < 0 || xx >= rows[0].length) throw new Error(`${name}: stamp ${p.name} out of range`);
        rows[yy][xx] = ch === ' ' ? '.' : ch;
      }
  }
  return part(name, rows.map((r) => r.join('')));
}

let nextId = 1;
/** A fresh part-instance id (used for contour lines between overlapping parts). */
export const newId = () => {
  nextId = (nextId % 65000) + 1;
  return nextId;
};

/**
 * Draw an ASCII part onto a bitmap.
 *   pal      {symbol: {c: [r,g,b,a], m: materialIndex}}
 *   flip     mirror horizontally, flipY mirror vertically
 *   contour  draw a 1px contour on whatever is already underneath, around this part
 *            (the colour is the outline colour of the material next to it) – this is how
 *            an arm in front of the body or the chin above the collar stays readable
 */
export function blit(dst, p, x, y, pal, { flip = false, flipY = false, contour = false, outlines = null } = {}) {
  const id = newId();
  const at = (i, j) => p.rows[flipY ? p.h - 1 - j : j][flip ? p.w - 1 - i : i];
  if (contour) {
    for (let j = 0; j < p.h; j++)
      for (let i = 0; i < p.w; i++) {
        const ch = at(i, j);
        if (ch === '.' || !pal[ch] || pal[ch].noContour) continue;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ni = i + di;
          const nj = j + dj;
          const inPart = ni >= 0 && nj >= 0 && ni < p.w && nj < p.h && at(ni, nj) !== '.';
          if (inPart) continue;
          const X = x + ni;
          const Y = y + nj;
          if (dst.alpha(X, Y) && outlines && dst.idAt(X, Y) !== id) {
            const ol = outlines[pal[ch].m];
            if (ol) dst.set(X, Y, ol, 255, dst.idAt(X, Y));
          }
        }
      }
  }
  for (let j = 0; j < p.h; j++) {
    for (let i = 0; i < p.w; i++) {
      const ch = at(i, j);
      if (ch === '.') continue;
      const e = pal[ch];
      if (!e) throw new Error(`${p.name}: unknown symbol "${ch}"`);
      dst.set(x + i, y + j, e.c, e.m, id);
    }
  }
  return id;
}

/**
 * Outline pass: every transparent pixel that touches (4-neighbourhood) a material with an outline
 * colour gets that colour. Materials listed earlier in `priority` win where several meet.
 * Pixels written by a previous contour (material 255) are treated as outline already.
 */
export function outline(bmp, outlines, priority) {
  const add = [];
  for (let y = 0; y < bmp.h; y++)
    for (let x = 0; x < bmp.w; x++) {
      if (bmp.alpha(x, y)) continue;
      let best = null;
      let bestRank = Infinity;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const m = bmp.matAt(x + dx, y + dy);
        if (!m || m === 255 || !outlines[m]) continue;
        const rank = priority.indexOf(m);
        const r = rank < 0 ? 999 : rank;
        if (r < bestRank) {
          bestRank = r;
          best = outlines[m];
        }
      }
      if (best) add.push([x, y, best]);
    }
  for (const [x, y, c] of add) bmp.set(x, y, c, 255, 0);
}

export function scaleNearest(src, k) {
  const out = new Bmp(src.w * k, src.h * k);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const o = ((((y / k) | 0) * src.w) + ((x / k) | 0)) * 4;
      if (src.px[o + 3]) out.px.set(src.px.subarray(o, o + 4), (y * out.w + x) * 4);
    }
  return out;
}

/* ---------------- PNG encoder ---------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

/** PNG: palette-based (with tRNS) when the image has at most 256 distinct colours, else RGBA. */
export function encodePNG(bmp) {
  const { w, h, px } = bmp;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth

  // Collect colours (all fully transparent pixels share one entry)
  const index = new Map();
  const colours = [];
  const key = (o) => (px[o + 3] === 0 ? 0 : ((px[o] << 24) | (px[o + 1] << 16) | (px[o + 2] << 8) | px[o + 3]) >>> 0);
  index.set(0, 0);
  colours.push([0, 0, 0, 0]);
  for (let o = 0; o < px.length && colours.length <= 256; o += 4) {
    const k = key(o);
    if (!index.has(k)) {
      index.set(k, colours.length);
      colours.push([px[o], px[o + 1], px[o + 2], px[o + 3]]);
    }
  }

  if (colours.length <= 256) {
    ihdr[9] = 3; // indexed
    const raw = Buffer.alloc((w + 1) * h);
    for (let y = 0; y < h; y++) {
      raw[y * (w + 1)] = 0;
      for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = index.get(key((y * w + x) * 4));
    }
    const plte = Buffer.alloc(colours.length * 3);
    colours.forEach((c, i) => plte.set(c.slice(0, 3), i * 3));
    // tRNS only needs entries up to the last non-opaque colour
    let last = 0;
    colours.forEach((c, i) => {
      if (c[3] < 255) last = i;
    });
    const trns = Buffer.from(colours.slice(0, last + 1).map((c) => c[3]));
    return Buffer.concat([
      sig,
      chunk('IHDR', ihdr),
      chunk('PLTE', plte),
      chunk('tRNS', trns),
      chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }

  ihdr[9] = 6; // RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(px.buffer, px.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Rotate an ASCII part by 90 degrees clockwise (turns = 1..3). Lossless, so pixel art stays crisp. */
export function rotPart(p, turns = 1, name = p.name + '_R' + turns) {
  let rows = p.rows;
  for (let t = 0; t < ((turns % 4) + 4) % 4; t++) {
    const h = rows.length;
    const w = rows[0].length;
    const out = [];
    for (let x = 0; x < w; x++) {
      let r = '';
      for (let y = h - 1; y >= 0; y--) r += rows[y][x];
      out.push(r);
    }
    rows = out;
  }
  return part(name, rows);
}

/** Rotate a whole frame by quarter turns around its centre (content may be clipped). */
export function rotFrame(src, turns = 1) {
  const t = ((turns % 4) + 4) % 4;
  const out = new Bmp(src.w, src.h);
  const cx = (src.w - 1) / 2;
  const cy = (src.h - 1) / 2;
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const o = y * src.w + x;
      if (!src.px[o * 4 + 3]) continue;
      let dx = x - cx;
      let dy = y - cy;
      for (let k = 0; k < t; k++) [dx, dy] = [-dy, dx];
      const nx = Math.round(cx + dx);
      const ny = Math.round(cy + dy);
      out.set(nx, ny, src.px.slice(o * 4, o * 4 + 4), src.mat[o], src.id[o]);
    }
  return out;
}

/** Shift a frame so its content's bounding box is centred on column `cx` and rests on row `floor`. */
export function place(src, floor, cx) {
  let minX = Infinity;
  let maxX = -Infinity;
  let low = -1;
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++)
      if (src.alpha(x, y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        low = y;
      }
  const out = new Bmp(src.w, src.h);
  if (low < 0) return out;
  out.paste(src, Math.round(cx - (minX + maxX) / 2), floor - low);
  return out;
}
