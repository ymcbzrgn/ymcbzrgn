/**
 * The songs of the Music Player. There are no audio files: each track is a few lines of notes
 * (16 steps per bar, 8 bars, played twice with a lift the second time) that the engine plays with
 * oscillators and noise. Notation per step: a note ("C#5"), "." for silence, "_" to hold the last note.
 */

export type Wave = 'pulse25' | 'pulse12' | 'square' | 'triangle' | 'sawtooth';

export interface TrackDef {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  /** 0..0.3: how late the odd sixteenths come (shuffle) */
  swing: number;
  /** one chord per bar: "C", "Am", "F#m" ... */
  chords: string[];
  /** 8 bars, 16 steps each */
  lead: string[];
  leadWave: Wave;
  bassWave: Wave;
  /** the sixteenth-note arpeggio pattern over the chord tones (indexes into root,third,fifth,octave) */
  arp: number[];
  /** 16 chars per drum: x hit, o soft hit, . none */
  drums: { kick: string; snare: string; hat: string; fill: string };
  /** a short line shown under the title */
  note: { en: string; tr: string };
}

export const STEPS_PER_BAR = 16;
export const BARS = 8;
export const PASSES = 2; // the same 8 bars again, with more going on
export const LOOP_STEPS = BARS * STEPS_PER_BAR * PASSES;
/** how many times a track runs through before the player moves on to the next one */
export const LOOPS = 2;

export const TRACKS: TrackDef[] = [
  {
    id: 'sunrise',
    title: 'Pixel Sunrise',
    artist: 'yb-synth',
    bpm: 104,
    swing: 0,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    lead: [
      'E5 _ _ _ G5 _ E5 _ C5 _ _ _ D5 _ E5 _',
      'D5 _ _ _ G5 _ _ _ B4 _ _ _ D5 _ _ _',
      'C5 _ _ _ E5 _ A5 _ G5 _ E5 _ C5 _ _ _',
      'A4 _ C5 _ F5 _ _ _ E5 _ D5 _ C5 _ _ _',
      'E5 _ _ G5 _ _ C6 _ B5 _ G5 _ E5 _ _ _',
      'D5 _ G5 _ B5 _ _ _ A5 _ G5 _ D5 _ _ _',
      'C5 _ F5 _ A5 _ G5 _ F5 _ E5 _ D5 _ C5 _',
      'D5 _ _ _ . _ _ _ G5 _ _ _ B5 _ _ _',
    ],
    leadWave: 'pulse25',
    bassWave: 'triangle',
    arp: [0, 1, 2, 3, 2, 1],
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', fill: '....x.......xxxx' },
    note: { en: 'Morning in an 8-bit town.', tr: '8-bit bir kasabada sabah.' },
  },
  {
    id: 'night',
    title: 'Night Shift',
    artist: 'yb-synth',
    bpm: 84,
    swing: 0.14,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E'],
    lead: [
      'E5 _ _ _ _ _ D5 _ C5 _ _ _ A4 _ _ _',
      'C5 _ _ _ . _ A4 _ F4 _ _ _ A4 _ C5 _',
      'E5 _ _ _ G5 _ _ _ E5 _ _ _ C5 _ _ _',
      'D5 _ _ _ B4 _ _ _ G4 _ _ _ . _ D5 _',
      'E5 _ _ _ A5 _ _ _ G5 _ E5 _ D5 _ C5 _',
      'C5 _ A4 _ F5 _ _ _ E5 _ C5 _ A4 _ _ _',
      'D5 _ _ _ F5 _ _ _ A5 _ _ _ G5 _ F5 _',
      'E5 _ _ _ G#5 _ _ _ B5 _ _ _ . _ . _',
    ],
    leadWave: 'triangle',
    bassWave: 'triangle',
    arp: [0, 2, 1, 3, 1, 2],
    drums: { kick: 'x.....x...x.....', snare: '....o.......x...', hat: 'x.o.x.o.x.o.x.o.', fill: '....x.....o.xoxx' },
    note: { en: 'Rain on the window, one more commit.', tr: 'Camda yağmur, bir commit daha.' },
  },
  {
    id: 'boss',
    title: 'Boss Fight',
    artist: 'yb-synth',
    bpm: 148,
    swing: 0,
    chords: ['Em', 'C', 'D', 'Em', 'Em', 'C', 'B', 'B'],
    lead: [
      'E5 E5 . E5 G5 . E5 . B5 . A5 G5 E5 . . .',
      'C5 C5 . C5 E5 . C5 . G5 . F5 E5 C5 . . .',
      'D5 D5 . D5 F5 . D5 . A5 . G5 F5 D5 . . .',
      'E5 . G5 . B5 . E6 . D6 . B5 . G5 . E5 .',
      'E5 E5 . E5 G5 . E5 . B5 . A5 G5 E5 . . .',
      'C5 C5 . C5 E5 . C5 . G5 . A5 B5 C6 . . .',
      'B4 B4 . B4 D#5 . B4 . F#5 . E5 D#5 B4 . . .',
      'B4 . D#5 . F#5 . B5 . A5 . F#5 . D#5 . B4 .',
    ],
    leadWave: 'pulse12',
    bassWave: 'sawtooth',
    arp: [0, 2, 3, 2, 0, 1, 2, 1],
    drums: { kick: 'x..xx..xx..xx..x', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', fill: '..x.x.x.xxxxxxxx' },
    note: { en: 'Nothing personal, just a boss.', tr: 'Kişisel değil, sadece bir boss.' },
  },
  {
    id: 'dock',
    title: 'Dock Breeze',
    artist: 'yb-synth',
    bpm: 96,
    swing: 0.2,
    chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'],
    lead: [
      'F#5 _ _ _ A5 _ F#5 _ D5 _ _ _ E5 _ F#5 _',
      'E5 _ _ _ A5 _ _ _ C#5 _ _ _ E5 _ _ _',
      'D5 _ F#5 _ B5 _ _ _ A5 _ F#5 _ D5 _ _ _',
      'B4 _ D5 _ G5 _ _ _ F#5 _ E5 _ D5 _ B4 _',
      'F#5 _ A5 _ D6 _ _ _ C#6 _ A5 _ F#5 _ _ _',
      'E5 _ A5 _ C#6 _ _ _ B5 _ A5 _ E5 _ _ _',
      'D5 _ G5 _ B5 _ A5 _ G5 _ F#5 _ E5 _ D5 _',
      'E5 _ _ _ A5 _ _ _ C#6 _ _ _ E6 _ _ _',
    ],
    leadWave: 'square',
    bassWave: 'triangle',
    arp: [0, 1, 2, 1],
    drums: { kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xo', fill: '....x.....x.xxxx' },
    note: { en: 'Boats, gulls, and a slow compile.', tr: 'Tekneler, martılar, yavaş bir derleme.' },
  },
];

/* ---------- notes ---------- */

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" -> MIDI 73, or null for silence / hold */
export function parseNote(token: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(token);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const midiFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Root pitch class (0-11) and whether it is minor: "F#m" -> {pc: 6, minor: true} */
export function parseChord(name: string): { pc: number; minor: boolean } {
  const m = /^([A-G])([#b]?)(m?)$/.exec(name);
  if (!m) return { pc: 0, minor: false };
  return { pc: (SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, minor: m[3] === 'm' };
}

/** Root, third, fifth, octave: as MIDI numbers around `base` (the octave the root sits in). */
export function chordTones(name: string, base: number): number[] {
  const { pc, minor } = parseChord(name);
  const root = base + pc;
  return [root, root + (minor ? 3 : 4), root + 7, root + 12];
}

export const barSeconds = (t: TrackDef) => (60 / t.bpm) * 4;
export const trackSeconds = (t: TrackDef) => barSeconds(t) * BARS * PASSES;
