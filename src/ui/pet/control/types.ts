import type { SpriteAnim } from '../../mascot/Sprite';
import type { Fx } from '../../../assets/sprites/mascot.behaviors';

/**
 * Where the twin is. `x` is the left edge of its frame in viewport px, `gy` how far above the taskbar line
 * it stands (its place on the desktop plane), `jy` how far it is above its own ground point (a jump).
 */
export interface PetPose {
  x: number;
  gy: number;
  jy: number;
  facing: 1 | -1;
  anim: SpriteAnim;
}

/** What the control engine may do to the twin (implemented by Pet.tsx). */
export interface PetApi {
  /** Frame size in CSS px and transparent rows below the shoes (they change with the world's scale), taskbar height. */
  readonly W: number;
  readonly H: number;
  readonly FEET: number;
  readonly TASKBAR: number;
  /** The world the twin is in: the desktop (viewport px) or a room strip (world px). */
  world(): { kind: 'desktop' | 'room'; width: number };
  /** Screen rect of the twin's frame. */
  rect(): DOMRect | null;
  /** Pause / resume the twin's own life (tips, behaviours) while a script drives it. */
  lock(on: boolean): void;
  /** Current pose; `busy` while the visitor is dragging the twin or has its menu open. */
  get(): PetPose & { busy: boolean; controlled: boolean };
  /** Instant pose update (no CSS transition): position, facing, animation, body effect. */
  set(p: Partial<PetPose> & { fx?: Fx; vis?: { scale: number; opacity: number } }): void;
  say(text: string, ms?: number): void;
  /** Leave control mode: the twin drops back to the taskbar and carries on with its own life. */
  exit(opts?: { silent?: boolean }): void;
}
