/**
 * The sound effects themselves: tiny chiptune-style blips made of oscillators and filtered noise,
 * so the site ships zero audio files. Loaded the first time a sound is needed (see ./sfx).
 */
import { audio } from './ctx';
import type { SfxName } from './sfx';

type Out = AudioNode;

interface ToneOpts {
  f: number;
  to?: number;
  d: number;
  type?: OscillatorType;
  v?: number;
  at?: number;
}

interface NoiseOpts {
  d: number;
  v?: number;
  lp?: number;
  hp?: number;
  /** Band-pass sweep (Hz) over the sound's length. */
  sweep?: [number, number];
  at?: number;
}

let noiseBuffer: AudioBuffer | null = null;
let voices = 0;

function tone(c: AudioContext, out: Out, o: ToneOpts) {
  const t0 = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.v ?? 0.16, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + o.d + 0.03);
  voices += 1;
  osc.onended = () => {
    voices -= 1;
  };
}

function noise(c: AudioContext, out: Out, o: NoiseOpts) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
    noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.8), c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.v ?? 0.14, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
  let node: AudioNode = src;
  if (o.sweep) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(o.sweep[0], t0);
    bp.frequency.exponentialRampToValueAtTime(o.sweep[1], t0 + o.d);
    node = node.connect(bp);
  }
  if (o.lp) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.lp;
    node = node.connect(lp);
  }
  if (o.hp) {
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = o.hp;
    node = node.connect(hp);
  }
  node.connect(g).connect(out);
  src.start(t0, Math.random() * 0.4);
  src.stop(t0 + o.d + 0.03);
  voices += 1;
  src.onended = () => {
    voices -= 1;
  };
}

/** Rising / falling little runs of notes. */
function notes(c: AudioContext, out: Out, freqs: number[], gap: number, o: Partial<ToneOpts> = {}) {
  freqs.forEach((f, i) => tone(c, out, { f, d: o.d ?? gap * 1.6, type: o.type ?? 'square', v: o.v ?? 0.1, at: i * gap }));
}

const jitter = (base: number, spread: number) => base + (Math.random() - 0.5) * spread;

const FX: Record<SfxName, (c: AudioContext, out: Out) => void> = {
  step: (c, out) => noise(c, out, { d: 0.045, v: 0.1, lp: jitter(760, 300) }),
  run: (c, out) => noise(c, out, { d: 0.04, v: 0.12, lp: jitter(1100, 400) }),
  jump: (c, out) => tone(c, out, { f: 280, to: 640, d: 0.14, v: 0.1 }),
  land: (c, out) => {
    noise(c, out, { d: 0.08, v: 0.16, lp: 420 });
    tone(c, out, { f: 130, to: 55, d: 0.09, type: 'sine', v: 0.2 });
  },
  pick: (c, out) => notes(c, out, [520, 784], 0.06, { type: 'triangle', v: 0.16 }),
  drop: (c, out) => notes(c, out, [784, 520], 0.06, { type: 'triangle', v: 0.16 }),
  door: (c, out) => {
    noise(c, out, { d: 0.28, v: 0.14, sweep: [300, 1800] });
    tone(c, out, { f: 660, d: 0.16, type: 'triangle', v: 0.12, at: 0.2 });
  },
  whoosh: (c, out) => noise(c, out, { d: 0.24, v: 0.14, sweep: [1900, 260] }),
  pop: (c, out) => tone(c, out, { f: 420, to: 920, d: 0.09, type: 'sine', v: 0.2 }),
  open: (c, out) => notes(c, out, [392, 587], 0.07, { type: 'triangle', v: 0.14, d: 0.1 }),
  close: (c, out) => notes(c, out, [587, 392], 0.06, { type: 'triangle', v: 0.12, d: 0.09 }),
  ok: (c, out) => notes(c, out, [523, 659, 784], 0.07, { v: 0.1 }),
  nope: (c, out) => {
    tone(c, out, { f: 170, d: 0.1, v: 0.12 });
    tone(c, out, { f: 120, d: 0.16, v: 0.14, at: 0.11 });
  },
  ach: (c, out) => {
    notes(c, out, [523, 659, 784, 1047], 0.075, { v: 0.11 });
    tone(c, out, { f: 1319, d: 0.45, type: 'sine', v: 0.1, at: 0.3 });
  },
  knock: (c, out) => {
    for (const at of [0, 0.15]) {
      noise(c, out, { d: 0.06, v: 0.2, lp: 320, at });
      tone(c, out, { f: 150, to: 90, d: 0.07, type: 'sine', v: 0.22, at });
    }
  },
  dizzy: (c, out) => {
    tone(c, out, { f: 500, to: 300, d: 0.22, type: 'sine', v: 0.14 });
    tone(c, out, { f: 300, to: 520, d: 0.22, type: 'sine', v: 0.14, at: 0.22 });
  },
  bell: (c, out) => {
    tone(c, out, { f: 880, d: 0.55, type: 'sine', v: 0.16 });
    tone(c, out, { f: 1760, d: 0.3, type: 'sine', v: 0.06 });
  },
  crash: (c, out) => {
    noise(c, out, { d: 0.7, v: 0.3, lp: 2200 });
    tone(c, out, { f: 240, to: 45, d: 0.8, type: 'sawtooth', v: 0.2 });
  },
  boot: (c, out) => {
    notes(c, out, [262, 330, 392, 523], 0.13, { type: 'triangle', v: 0.14, d: 0.22 });
    notes(c, out, [523, 659, 784], 0.001, { type: 'triangle', v: 0.1, d: 0.7 });
  },
  celebrate: (c, out) => notes(c, out, [392, 523, 659, 784, 1047], 0.06, { v: 0.1 }),
};

/** Minimum gap between two plays of the same sound (ms): a held key must not machine-gun the speakers. */
const GAP: Partial<Record<SfxName, number>> = { step: 120, run: 90, jump: 120, land: 120, dizzy: 600 };
const lastPlayed: Partial<Record<SfxName, number>> = {};

export function play(name: SfxName) {
  const a = audio();
  if (!a || a.ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < (GAP[name] ?? 40)) return;
  if (voices > 16 && (name === 'step' || name === 'run')) return;
  lastPlayed[name] = now;
  FX[name](a.ctx, a.out);
}
