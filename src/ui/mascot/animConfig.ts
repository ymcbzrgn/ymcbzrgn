/** Default playback speed (frames per second) for each mascot animation. */
import type { SpriteAnim } from '../../assets/sprites/mascot.meta';

export const ANIM_FPS: Record<SpriteAnim, number> = {
  idle: 2,
  look: 1.5,
  walk: 8,
  run: 12,
  wave: 6,
  sit: 1.5,
  sleep: 1,
  type: 7,
  read: 1,
  coffee: 2.5,
  jump: 6,
  stretch: 2,
  drag: 6,
};
