/**
 * The file / app icon the twin holds above its head while carrying something. While the twin
 * plays an animation that has a carry path (pickup, putdown, carrying) the icon follows the hands
 * frame by frame, floor -> chest -> overhead, and bobs with the walk.
 */
import { useLayoutEffect, useRef } from 'react';
import { SPRITE_ANCHORS, SPRITE_ANIMS, SPRITE_CARRY_PATH, SPRITE_FRAME_W, type SpriteAnim } from '../../assets/sprites/mascot.meta';
import SceneSprite from './SceneSprite';

interface Props {
  icon: string;
  anim: SpriteAnim;
  scale: number;
  facing: 1 | -1;
}

export default function CarryItem({ icon, anim, scale, facing }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const path = SPRITE_CARRY_PATH[anim];

  // the anchors are for a sprite facing right; mirrored sprites mirror x around the frame
  const at = (p: { x: number; y: number } | null) => {
    const q = p ?? SPRITE_ANCHORS.floor;
    return { x: (facing === 1 ? q.x : SPRITE_FRAME_W - q.x) * scale, y: q.y * scale };
  };
  const first = at(path ? path[0] : SPRITE_ANCHORS.carry);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !path || path.length < 2 || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const n = path.length;
    const frames: Keyframe[] = path.map((p, i) => {
      const pos = at(p);
      return { offset: i / n, transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`, easing: 'steps(1, end)' };
    });
    const last = at(path[0]);
    frames.push({ offset: 1, transform: `translate(${last.x}px, ${last.y}px) translate(-50%, -100%)` });
    const anim2 = el.animate(frames, { duration: (n / SPRITE_ANIMS[anim].fps) * 1000, iterations: Infinity });
    return () => anim2.cancel();
    // `at` only depends on facing / scale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, path, facing, scale]);

  return (
    <div ref={ref} className="pet__carry" style={{ transform: `translate(${first.x}px, ${first.y}px) translate(-50%, -100%)` }}>
      <SceneSprite name={icon} scale={scale} fallback="📄" />
    </div>
  );
}
