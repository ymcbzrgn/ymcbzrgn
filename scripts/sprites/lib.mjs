/**
 * Tiny dependency-free helpers for the sprite generator:
 * ASCII bitmaps, compositing, nearest-neighbour scaling and a PNG encoder.
 */
import zlib from 'node:zlib';

export const rgba = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  255,
];

export class Bmp {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
  }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px.set(c, (y * this.w + x) * 4);
  }
  get(x, y) {
    const o = (y * this.w + x) * 4;
    return this.px.slice(o, o + 4);
  }
  /** Copy `src` into this bitmap at (x, y); transparent pixels are skipped. */
  paste(src, x, y) {
    for (let j = 0; j < src.h; j++)
      for (let i = 0; i < src.w; i++) {
        const c = src.get(i, j);
        if (c[3]) this.set(x + i, y + j, c);
      }
  }
  fill(c, x = 0, y = 0, w = this.w, h = this.h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
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

/** Draw an ASCII part onto a bitmap using a palette of {symbol: [r,g,b,a]}. */
export function blit(dst, p, x, y, colors, { flip = false } = {}) {
  for (let j = 0; j < p.h; j++) {
    for (let i = 0; i < p.w; i++) {
      const ch = p.rows[j][flip ? p.w - 1 - i : i];
      if (ch === '.') continue;
      const col = colors[ch];
      if (!col) throw new Error(`${p.name}: unknown symbol "${ch}"`);
      dst.set(x + i, y + j, col);
    }
  }
}

/** Return a copy of a part with some pixels replaced. edits: [[x, y, 'c'], ...] */
export function edit(p, name, edits) {
  const rows = p.rows.map((r) => r.split(''));
  for (const [x, y, ch] of edits) {
    if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) throw new Error(`${name}: edit out of range (${x},${y})`);
    rows[y][x] = ch;
  }
  return part(name, rows.map((r) => r.join('')));
}

export function scaleNearest(src, k) {
  const out = new Bmp(src.w * k, src.h * k);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) out.set(x, y, src.get((x / k) | 0, (y / k) | 0));
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

export function encodePNG(bmp) {
  const { w, h, px } = bmp;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(px.buffer, px.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
