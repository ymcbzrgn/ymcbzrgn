/**
 * The music engine: plays the tracks of ./tracks with oscillators and noise, scheduled on the Web
 * Audio clock by a look-ahead timer (the usual way to keep a sequencer tight while JavaScript is busy).
 *
 * One player lives for the whole session: minimising the window must not stop the music, only
 * closing it does (see MusicPlayer.tsx).
 */
import { audio } from '../../os/sound/ctx';
import { addToSet, unlock } from '../../os/achievements';
import { setMusicState } from './musicState';
import { BARS, LOOPS, LOOP_STEPS, STEPS_PER_BAR, TRACKS, chordTones, midiFreq, parseNote, type TrackDef, type Wave } from './tracks';

const LOOKAHEAD = 0.16; // s of music scheduled ahead of the audio clock
const LOOKAHEAD_HIDDEN = 1.4; // a hidden tab fires timers about once a second: schedule further ahead
const TICK_MS = 30;

export interface Position {
  /** seconds into the current pass through the track */
  seconds: number;
  total: number;
  /** how many times the track has been through already */
  loop: number;
}

export interface Player {
  trackIndex(): number;
  isPlaying(): boolean;
  start(index: number): boolean;
  pause(): void;
  resume(): boolean;
  seek(fraction: number): void;
  setVolume(v: number): void;
  position(): Position;
  analyser(): AnalyserNode | null;
  onEnd(cb: (() => void) | null): void;
  destroy(): void;
}

interface LeadNote {
  midi: number;
  steps: number;
}

/** "E5 _ _ _ G5 ..." -> a note on the steps where one starts, with its length in steps */
function leadEvents(def: TrackDef): (LeadNote | null)[][] {
  return def.lead.map((bar) => {
    const tokens = bar.trim().split(/\s+/);
    const out: (LeadNote | null)[] = tokens.map(() => null);
    let open: LeadNote | null = null;
    tokens.forEach((token, i) => {
      const midi = parseNote(token);
      if (midi !== null) {
        open = { midi, steps: 1 };
        out[i] = open;
      } else if (token === '_' && open) open.steps += 1;
      else open = null; // "." ends the note
    });
    return out;
  });
}

const LEADS = new Map(TRACKS.map((def) => [def.id, leadEvents(def)]));

function createPlayer(): Player {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null; // this player's volume
  let tap: AnalyserNode | null = null;
  let track: TrackDef = TRACKS[0];
  let index = 0;
  let playing = false;
  let step = 0; // next sixteenth to schedule
  let nextTime = 0; // when it starts, on the audio clock
  let timer = 0;
  let volume = 0.7;
  let endCb: (() => void) | null = null;
  const pulses = new Map<number, PeriodicWave>();
  let noise: AudioBuffer | null = null;

  const stepDur = () => 60 / track.bpm / 4;

  function ensure(): boolean {
    const a = audio();
    if (!a) return false;
    if (a.ctx !== ctx) {
      ctx = a.ctx;
      out = ctx.createGain();
      out.gain.value = playing ? volume : 0;
      tap = ctx.createAnalyser();
      tap.fftSize = 64;
      tap.smoothingTimeConstant = 0.72;
      out.connect(tap);
      tap.connect(a.out);
      pulses.clear();
      noise = null;
    }
    return true;
  }

  /* ---------- voices ---------- */
  function wave(c: AudioContext, kind: Wave): OscillatorType | PeriodicWave {
    if (kind === 'pulse25' || kind === 'pulse12') {
      const duty = kind === 'pulse25' ? 0.25 : 0.125;
      let w = pulses.get(duty);
      if (!w) {
        const real = new Float32Array(48);
        const imag = new Float32Array(48);
        for (let n = 1; n < real.length; n += 1) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
        w = c.createPeriodicWave(real, imag);
        pulses.set(duty, w);
      }
      return w;
    }
    return kind;
  }

  function voice(freq: number, t: number, dur: number, kind: Wave, vol: number) {
    if (!ctx || !out) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const w = wave(ctx, kind);
    if (w instanceof PeriodicWave) osc.setPeriodicWave(w);
    else osc.type = w as OscillatorType;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.62), t + Math.min(0.12, dur * 0.5));
    g.gain.setValueAtTime(Math.max(0.0002, vol * 0.6), t + Math.max(0.01, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBuffer(c: AudioContext) {
    if (!noise) {
      noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return noise;
  }

  function drum(kind: 'kick' | 'snare' | 'hat' | 'open', t: number, soft: boolean) {
    if (!ctx || !out) return;
    const k = soft ? 0.55 : 1;
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      g.gain.setValueAtTime(0.7 * k, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.18);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = kind === 'snare' ? 1400 : 7000;
    const g = ctx.createGain();
    const len = kind === 'snare' ? 0.14 : kind === 'open' ? 0.09 : 0.035;
    const vol = (kind === 'snare' ? 0.34 : 0.1) * k;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(g).connect(out);
    src.start(t, Math.random() * 0.2);
    src.stop(t + len + 0.02);
    if (kind === 'snare') voice(190, t, 0.07, 'triangle', 0.22 * k);
  }

  /* ---------- one sixteenth note of the song ---------- */
  function playStep(s: number, t0: number) {
    const inLoop = s % LOOP_STEPS;
    const bar = Math.floor(inLoop / STEPS_PER_BAR); // 0..15
    const inBar = inLoop % STEPS_PER_BAR;
    const b8 = bar % BARS;
    const second = bar >= BARS;
    const sd = stepDur();
    const t = t0 + (inBar % 2 === 1 ? track.swing * sd : 0);

    // lead (the second time through it is doubled an octave up)
    const lead = LEADS.get(track.id)?.[b8]?.[inBar];
    if (lead) {
      const dur = lead.steps * sd * 0.94;
      voice(midiFreq(lead.midi), t, dur, track.leadWave, 0.15);
      if (second) voice(midiFreq(lead.midi + 12), t, dur, track.leadWave === 'triangle' ? 'triangle' : 'square', 0.06);
    }

    // bass: the chord's root on every kick
    const chord = track.chords[b8];
    if (track.drums.kick[inBar] === 'x') {
      const tones = chordTones(chord, 36);
      let root = tones[0];
      if (root < 38) root += 12;
      voice(midiFreq(root), t, sd * 3.4, track.bassWave, track.bassWave === 'sawtooth' ? 0.12 : 0.3);
    }

    // arpeggio over the chord (eighths, or sixteenths when the song has gathered speed)
    if (second || track.id === 'boss' || inBar % 2 === 0) {
      const tones = chordTones(chord, 60);
      const pattern = track.arp;
      const pick = pattern[(bar * STEPS_PER_BAR + inBar) % pattern.length];
      voice(midiFreq(tones[pick % tones.length]), t, sd * 1.6, 'square', second || track.id === 'boss' ? 0.045 : 0.035);
    }

    // drums, with a fill at the end of each phrase
    const fill = b8 === 7 || (second && b8 === 3);
    const snare = fill ? track.drums.fill : track.drums.snare;
    if (track.drums.kick[inBar] !== '.') drum('kick', t, track.drums.kick[inBar] === 'o');
    if (snare[inBar] !== '.') drum('snare', t, snare[inBar] === 'o');
    const hat = track.drums.hat[inBar];
    if (hat !== '.') drum(hat === 'o' ? 'open' : 'hat', t, hat === 'o');
  }

  const lookahead = () => (typeof document !== 'undefined' && document.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD);

  function playedSteps(): number {
    if (!ctx || !playing) return step;
    return step - Math.max(0, nextTime - ctx.currentTime) / stepDur();
  }

  function tick() {
    if (!ctx || !playing) return;
    const sd = stepDur();
    while (nextTime < ctx.currentTime + lookahead()) {
      if (step >= LOOP_STEPS * LOOPS) {
        finish();
        return;
      }
      playStep(step, nextTime);
      step += 1;
      nextTime += sd;
    }
  }

  function announce(isPlaying: boolean) {
    setMusicState({ playing: isPlaying, track: track.id, bpm: track.bpm });
  }

  function run() {
    if (!ctx || !out) return;
    window.clearInterval(timer);
    playing = true;
    nextTime = ctx.currentTime + 0.07;
    out.gain.cancelScheduledValues(ctx.currentTime);
    out.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    timer = window.setInterval(tick, TICK_MS);
    tick();
    announce(true);
  }

  function finish() {
    window.clearInterval(timer);
    playing = false;
    step = 0;
    announce(false);
    endCb?.();
  }

  return {
    trackIndex: () => index,
    isPlaying: () => playing,
    start(i) {
      if (!ensure()) return false;
      if (playing) {
        window.clearInterval(timer);
        playing = false;
      }
      index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
      track = TRACKS[index];
      step = 0;
      if (addToSet('tracks', track.id) >= 3) unlock('dj');
      run();
      return true;
    },
    pause() {
      if (!ctx || !out || !playing) return;
      step = Math.max(0, Math.floor(playedSteps()));
      playing = false;
      window.clearInterval(timer);
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
      announce(false);
    },
    resume() {
      if (!ensure()) return false;
      if (!playing) run();
      return true;
    },
    seek(fraction) {
      const base = Math.floor(playedSteps() / LOOP_STEPS) * LOOP_STEPS;
      step = base + Math.max(0, Math.min(LOOP_STEPS - 1, Math.floor(fraction * LOOP_STEPS)));
      if (playing && ctx) nextTime = ctx.currentTime + 0.05;
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (playing && ctx && out) out.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
    },
    position() {
      const p = Math.max(0, playedSteps());
      const sd = stepDur();
      return { seconds: (p % LOOP_STEPS) * sd, total: LOOP_STEPS * sd, loop: Math.floor(p / LOOP_STEPS) };
    },
    analyser: () => tap,
    onEnd(cb) {
      endCb = cb;
    },
    destroy() {
      window.clearInterval(timer);
      const was = playing;
      playing = false;
      if (ctx && out) {
        out.gain.cancelScheduledValues(ctx.currentTime);
        out.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
        const o = out;
        const t = tap;
        window.setTimeout(() => {
          o.disconnect();
          t?.disconnect();
        }, 120);
      }
      ctx = null;
      out = null;
      tap = null;
      if (was) announce(false);
      else setMusicState({ playing: false, track: '', bpm: 0 });
    },
  };
}

let singleton: Player | null = null;

export const getPlayer = (): Player => (singleton ??= createPlayer());

export function destroyPlayer() {
  singleton?.destroy();
  singleton = null;
}
