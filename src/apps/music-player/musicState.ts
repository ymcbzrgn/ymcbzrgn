/**
 * What the music player is doing, in a form the rest of the desktop can read without loading the
 * audio engine (the pixel twin dances when it is playing).
 */
export const MUSIC_EVENT = 'yb:music';

export interface MusicState {
  playing: boolean;
  track: string;
  bpm: number;
}

let state: MusicState = { playing: false, track: '', bpm: 0 };

export const getMusicState = (): MusicState => state;

export function setMusicState(next: MusicState) {
  state = next;
  window.dispatchEvent(new CustomEvent<MusicState>(MUSIC_EVENT, { detail: next }));
}
