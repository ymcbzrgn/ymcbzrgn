/**
 * Shared Web Audio context + master volume. Sound is OFF until the visitor switches it on
 * (speaker in the taskbar, Settings, command palette or `sound on` in the terminal).
 *
 * This file is tiny on purpose: the synth that actually makes the noises (./synth) and the music
 * engine are lazy chunks that just ask for `audio()`.
 */
import { useStore } from '../store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let broken = false;
let wired = false;

export function soundOn(): boolean {
  return useStore.getState().settings.soundOn === true;
}

export function soundVolume(): number {
  const v = useStore.getState().settings.soundVolume;
  return typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.6;
}

/** Perceptual curve: the slider feels linear, the gain is not. */
const gainFor = (v: number) => v * v * 1.3;

/**
 * The shared context and its master output. The first call should happen inside a user gesture
 * (a click on the speaker, the Play button) so browsers let it start; later calls just make sure it is running.
 */
export function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (broken) return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('no Web Audio');
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = gainFor(soundVolume());
      master.connect(ctx.destination);
    } catch {
      broken = true;
      return null;
    }
  }
  if (!wired) {
    wired = true;
    // keep the output in step with the Settings slider
    useStore.subscribe((s, prev) => {
      if (s.settings.soundVolume !== prev.settings.soundVolume && master && ctx) {
        master.gain.setTargetAtTime(gainFor(soundVolume()), ctx.currentTime, 0.02);
      }
    });
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return { ctx, out: master as GainNode };
}

/** Switch sound effects on or off. Turning on is meant to be called from a click (it starts the audio context). */
export function setSoundOn(on: boolean) {
  useStore.getState().updateSettings({ soundOn: on });
  if (on) audio();
}
