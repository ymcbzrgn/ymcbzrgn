/**
 * Sound effects facade. `sfx('jump')` does nothing (and loads nothing) while sound is off; once the
 * visitor has switched it on, the synth chunk is fetched the first time a sound is needed.
 */
import { soundOn } from './ctx';

export type SfxName =
  | 'step'
  | 'run'
  | 'jump'
  | 'land'
  | 'pick'
  | 'drop'
  | 'door'
  | 'whoosh'
  | 'pop'
  | 'open'
  | 'close'
  | 'ok'
  | 'nope'
  | 'ach'
  | 'knock'
  | 'dizzy'
  | 'bell'
  | 'crash'
  | 'boot'
  | 'celebrate';

let synth: Promise<typeof import('./synth')> | null = null;

export function sfx(name: SfxName) {
  if (!soundOn()) return;
  synth ??= import('./synth');
  void synth.then((m) => m.play(name)).catch(() => {});
}
