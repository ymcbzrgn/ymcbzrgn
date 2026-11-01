/**
 * Initial window geometry.
 *
 * Windows used to open at a fixed 600x400, exactly centered, so on a large screen the CV and the
 * project list were tiny and every new window hid the previous one completely. Sizes now follow the
 * viewport per app, and each additional open window is offset a little (cascade).
 */
import { useStore } from '../store';
import type { WindowBounds } from '../types';

const TASKBAR_HEIGHT = 48;
const MARGIN = 8;
const CASCADE_STEP = 28;
const CASCADE_SLOTS = 6;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type SizeFn = (vw: number, vh: number) => [number, number];

const SIZES: Record<string, SizeFn> = {
  'welcome-app': (vw, vh) => [clamp(vw * 0.6, 600, 820), clamp(vh * 0.76, 460, 560)],
  'pdf-viewer': (vw, vh) => [clamp(vw * 0.5, 540, 880), clamp(vh * 0.9, 440, 1000)],
  'github-projects': (vw, vh) => [clamp(vw * 0.74, 660, 1120), clamp(vh * 0.8, 460, 820)],
  'terminal-app': (vw, vh) => [clamp(vw * 0.5, 600, 780), clamp(vh * 0.58, 380, 520)],
  'achievements-app': (vw, vh) => [clamp(vw * 0.4, 460, 560), clamp(vh * 0.8, 440, 680)],
  'recruiter-app': (vw, vh) => [clamp(vw * 0.46, 520, 640), clamp(vh * 0.84, 460, 700)],
  'career-app': (vw, vh) => [clamp(vw * 0.5, 560, 720), clamp(vh * 0.84, 480, 720)],
  'about-site-app': (vw, vh) => [clamp(vw * 0.42, 500, 600), clamp(vh * 0.84, 460, 700)],
  'music-player-app': () => [420, 540],
  'markdown-viewer': (vw, vh) => [clamp(vw * 0.5, 600, 800), clamp(vh * 0.8, 440, 720)],
  'file-explorer': () => [680, 460],
  'text-viewer': () => [640, 460],
  'image-viewer': () => [640, 460],
};
const DEFAULT_SIZE: [number, number] = [600, 400];

export function getInitialBounds(appId: string): WindowBounds {
  const vw = window.innerWidth;
  const vh = window.innerHeight - TASKBAR_HEIGHT;

  const [w, h] = (SIZES[appId] ?? (() => DEFAULT_SIZE))(vw, vh);
  const width = Math.round(Math.min(w, vw - MARGIN * 2));
  const height = Math.round(Math.min(h, vh - MARGIN * 2));

  const slot = useStore.getState().windows.length % CASCADE_SLOTS;
  const x = clamp((vw - width) / 2 + slot * CASCADE_STEP, MARGIN, Math.max(MARGIN, vw - width - MARGIN));
  const y = clamp((vh - height) / 2 + slot * CASCADE_STEP, MARGIN, Math.max(MARGIN, vh - height - MARGIN));

  return { x: Math.round(x), y: Math.round(y), width, height };
}
