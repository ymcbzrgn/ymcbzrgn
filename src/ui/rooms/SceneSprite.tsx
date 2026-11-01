/** One sprite of the scene sheet (animated with CSS steps when it has several frames). */
import type { CSSProperties } from 'react';
import { SHEET, SHEET_URL, SPRITES } from './scene';
import './rooms.css';

interface Props {
  name: string;
  /** Integer pixel scale (1 art pixel = `scale` CSS pixels). */
  scale?: number;
  /** Show this frame only (no animation). */
  frame?: number;
  className?: string;
  style?: CSSProperties;
  /** Shown instead when the sheet has no such sprite. */
  fallback?: string;
}

export default function SceneSprite({ name, scale = 2, frame, className = '', style, fallback }: Props) {
  const d = SPRITES[name];
  if (!d || !SHEET_URL) {
    const size = 14 * scale;
    return (
      <span className={`scene-sprite scene-sprite--missing ${className}`} style={{ width: size * 2, height: size * 2, ...style }} aria-hidden="true">
        {fallback ?? '▫'}
      </span>
    );
  }
  const animated = d.frames > 1 && frame === undefined;
  const x0 = -(d.x + (frame ?? 0) * d.w) * scale;
  const css = {
    width: d.w * scale,
    height: d.h * scale,
    backgroundImage: `url(${SHEET_URL})`,
    backgroundSize: `${SHEET.w * scale}px ${SHEET.h * scale}px`,
    backgroundPosition: `${x0}px ${-d.y * scale}px`,
    ...(animated
      ? {
          '--x0': `${-d.x * scale}px`,
          '--x1': `${-(d.x + d.frames * d.w) * scale}px`,
          animationDuration: `${d.frames / Math.max(d.fps, 0.5)}s`,
          animationTimingFunction: `steps(${d.frames})`,
        }
      : null),
    ...style,
  } as CSSProperties;
  return <span className={`scene-sprite ${animated ? 'scene-sprite--anim' : ''} ${className}`} style={css} aria-hidden="true" />;
}
