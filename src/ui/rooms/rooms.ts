/**
 * What a room contains. The strip is generic: it lays out `RoomPropSpec`s; the owners (the file
 * explorer, the projects window) turn their real content into specs.
 */
import type { VFSNode } from '../../os/types';
import type { Carry } from './roomStore';

export interface RoomPropSpec {
  id: string;
  label: string;
  /** key in the scene sheet */
  sprite: string;
  /** swapped in while the prop is being used (a door opening) */
  spriteOpen?: string;
  /** what happens when the twin uses it (after walking up to it) */
  use: () => void | Promise<void>;
  /** the twin may pick it up and carry it elsewhere (files, apps) */
  carry?: { nodeId: string; item: string; heavy: boolean };
  /** receives a carried item (folders / the exit door) */
  accept?: (c: Carry) => Promise<'moved' | 'locked' | 'exists'>;
  /** animation to play while using it (fallback: point) */
  anim?: string;
  /** knock first (doors) */
  knock?: boolean;
  /** the way out (up to the parent folder / out of the room) */
  exit?: boolean;
  /** short name used in sentences ("Put it in <name>"), when it differs from the label */
  name?: string;
  secret?: boolean;
  /** a picture drawn on the prop (a photo on an easel's canvas); sprite pixels, relative to the sprite's top-left */
  overlay?: { src: string; x: number; y: number; w: number; h: number };
}

/** Wall/floor mood per folder; anything else gets the default room. */
const THEME_BY_FOLDER: Record<string, string> = {
  home: 'home',
  projects: 'projects',
  games: 'games',
  documents: 'documents',
  pictures: 'pictures',
  trash: 'trash',
};
export const themeFor = (folderId: string) => THEME_BY_FOLDER[folderId] ?? 'default';

/** Hidden places that are not ready yet and must never be offered as a secret (none at the moment). */
export const NEVER_REVEAL = new Set<string>();

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pickBy = <T,>(list: readonly T[], key: string): T => list[hash(key) % list.length];

/** Scene sprite + carried-item icon for a node. */
export function visualFor(node: VFSNode, folderId: string): { sprite: string; item: string; anim: string } {
  if (node.type === 'folder') return { sprite: 'door', item: 'item_folder', anim: 'knock' };
  if (node.type === 'app') {
    const game = folderId === 'games' || /-game$/.test(node.appId ?? '');
    return { sprite: game ? 'arcade' : 'computer', item: 'item_app', anim: game ? 'arcade' : 'type' };
  }
  if (node.type === 'link') return { sprite: 'sign', item: 'item_link', anim: 'point' };
  const mime = node.mimeType ?? '';
  if (mime === 'application/pdf') return { sprite: 'pdf', item: 'item_pdf', anim: 'read' };
  if (mime.startsWith('image/')) return { sprite: pickBy(['easel_a', 'easel_b', 'easel_c'], node.id), item: 'item_image', anim: 'inspect' };
  if (mime === 'text/markdown') return { sprite: 'scroll', item: 'item_text', anim: 'read' };
  if (mime === 'text/plain') return { sprite: pickBy(['book_stack', 'scroll'], node.id), item: 'item_text', anim: 'read' };
  return { sprite: 'scroll', item: 'item_file', anim: 'read' };
}

/** Repo crates are coloured by language. */
const CRATE_BY_LANGUAGE: Record<string, string> = {
  JavaScript: 'crate_a', // yellow
  TypeScript: 'crate_b', // blue
  Python: 'crate_c', // green
  Java: 'crate_d', // orange
  Kotlin: 'crate_d',
  HTML: 'crate_d',
  Rust: 'crate_e', // red
  C: 'crate_e',
  'C++': 'crate_e',
  Swift: 'crate_f', // purple
  Dart: 'crate_f',
  CSS: 'crate_f',
  Go: 'crate_g', // cyan
  Shell: 'crate_h', // grey
};
export const crateFor = (language: string | null) => (language && CRATE_BY_LANGUAGE[language]) || 'crate_h';
