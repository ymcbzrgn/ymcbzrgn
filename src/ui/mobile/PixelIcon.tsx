/**
 * PixelIcon: one tile of the app icon sheet (icons.png, drawn in code by scripts/sprites/icons.mjs).
 * Shown at an integer scale so the pixels stay crisp: 2 = 56 px, the size of an app icon on a phone.
 */
import type { CSSProperties } from 'react';
import sheetUrl from '../../assets/sprites/icons.png';
import { ICONS, ICON_SHEET, type IconName } from '../../assets/sprites/icons.meta';
import './PixelIcon.css';

export type { IconName };

interface Props {
  name: IconName;
  /** Integer pixel scale (1 art pixel = `scale` CSS pixels). */
  scale?: number;
  className?: string;
}

export default function PixelIcon({ name, scale = 2, className = '' }: Props) {
  const { x, y } = ICONS[name];
  const size = ICON_SHEET.tile * scale;
  const style: CSSProperties = {
    width: size,
    height: size,
    backgroundImage: `url(${sheetUrl})`,
    backgroundSize: `${ICON_SHEET.w * scale}px ${ICON_SHEET.h * scale}px`,
    backgroundPosition: `${-x * scale}px ${-y * scale}px`,
  };
  return <span className={`pixel-icon ${className}`} style={style} aria-hidden="true" />;
}
