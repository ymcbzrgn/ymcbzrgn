/**
 * Shared state between the pixel twin (Pet.tsx), the control engine and the room strips that file
 * windows show. A room is a small side-scrolling scene inside a folder window; the twin lives in it by
 * being portalled into the strip's world element, at a smaller scale.
 */
import { create } from 'zustand';
import type { PetApi } from '../pet/control/types';

/** What the strip offers to whoever drives the twin (control engine, mouse clicks). */
export interface RoomTarget {
  id: string;
  label: string;
  /** Short extra hint, e.g. "F carry" */
  extra?: string;
  rect: DOMRect;
  /** Use it: walk there, play the right animation, do the thing. */
  use(): Promise<void>;
  /** Pick up / put down (files and apps only). */
  carry?: () => Promise<void>;
}

export interface RoomRunner {
  /** The prop closest to a position in world px, if one is near enough. */
  nearest(worldX: number): RoomTarget | null;
  /** Walk to a position in world px (click on the floor). */
  walkTo(worldX: number): Promise<void>;
  /** Use a prop by id (click on it). */
  use(id: string): Promise<void>;
  /** Put down what the twin is carrying (F with nothing to carry nearby). */
  drop(): Promise<void>;
}

export interface Carry {
  nodeId: string;
  name: string;
  /** key of the 16x16 item sprite in the scene sheet */
  icon: string;
}

interface RoomState {
  /** Window whose room the twin is invited to (the strip is shown there), if any. */
  windowId: string | null;
  /** The strip's world element: portal target for the twin. Set once the strip is mounted. */
  host: HTMLElement | null;
  /** World size in CSS px (wider than the strip when the folder is full) and the visible width. */
  width: number;
  view: number;
  /** Distance in CSS px from the bottom of the strip up to the floor line the twin stands on. */
  contact: number;
  /** A scripted interaction (walking up to a prop, a door ...) owns the twin right now. */
  busy: boolean;
  carrying: Carry | null;
  runner: RoomRunner | null;
  /** The twin's API, registered by Pet.tsx so strips can drive it without importing Pet. */
  api: PetApi | null;
  /** Where the twin was on the desktop when it joined (it goes back there when the room closes). */
  returnTo: { x: number; gy: number } | null;

  enter(windowId: string): void;
  leave(): void;
  mount(info: { windowId: string; host: HTMLElement; width: number; view: number; contact: number; runner: RoomRunner }): void;
  resize(width: number, view: number): void;
  unmount(windowId: string): void;
  setBusy(busy: boolean): void;
  setCarrying(c: Carry | null): void;
  setApi(api: PetApi | null): void;
  setReturnTo(p: { x: number; gy: number } | null): void;
}

export const useRoomStore = create<RoomState>()((set, get) => ({
  windowId: null,
  host: null,
  width: 0,
  view: 0,
  contact: 14,
  busy: false,
  carrying: null,
  runner: null,
  api: null,
  returnTo: null,

  enter: (windowId) => set((s) => (s.windowId === windowId ? s : { windowId, host: null, runner: null, carrying: null })),
  leave: () => set({ windowId: null, host: null, runner: null, carrying: null, busy: false }),
  mount: ({ windowId, host, width, view, contact, runner }) => {
    if (get().windowId !== windowId) return;
    set({ host, width, view, contact, runner });
  },
  resize: (width, view) => set({ width, view }),
  unmount: (windowId) => {
    if (get().windowId !== windowId) return;
    set({ windowId: null, host: null, runner: null, carrying: null, busy: false });
  },
  setBusy: (busy) => set({ busy }),
  setCarrying: (carrying) => set({ carrying }),
  setApi: (api) => set({ api }),
  setReturnTo: (returnTo) => set({ returnTo }),
}));
