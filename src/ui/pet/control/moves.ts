import { SPRITE_ANIMS } from '../../../assets/sprites/mascot.meta';
import { BEHAVIORS, type Behavior } from '../../../assets/sprites/mascot.behaviors';
import type { SpriteAnim } from '../../mascot/Sprite';

const exists = (name: string): name is SpriteAnim => name in SPRITE_ANIMS;

/** Pick an animation by name, falling back when the sheet does not have it (yet). */
export const anim = (name: string, fallback: SpriteAnim): SpriteAnim => (exists(name) ? name : fallback);

/** Movement states and engine helpers: not "moves" to show off. */
const NOT_MOVES = new Set(['idle', 'drag', 'walk', 'run', 'walkUp', 'walkDown', 'carryIdle', 'carryWalk', 'pickup', 'putdown']);

/** Everything the move palette lists, in sheet order. */
export const PALETTE: SpriteAnim[] = (Object.keys(SPRITE_ANIMS) as SpriteAnim[]).filter((a) => !NOT_MOVES.has(a));

/** Keys 1-9. */
export const QUICK: SpriteAnim[] = ['wave', 'pushup', 'cartwheel', 'dance', 'guitar', 'celebrate', 'flex', 'heart', 'sit'].filter(exists);

/** Small things it does while you are thinking. */
export const FIDGETS: SpriteAnim[] = ['look', 'stretch', 'hairfix', 'whistle', 'shrug', 'think', 'stare'].filter(exists);

const byAnim = new Map<string, Behavior>();
for (const b of BEHAVIORS) if (!byAnim.has(b.anim)) byAnim.set(b.anim, b);

/** The autonomous behaviour that uses this animation (duration, body effect, speech lines), if any. */
export const behaviorFor = (a: SpriteAnim): Behavior | undefined => byAnim.get(a);
