/**
 * State of the guided tour, shared by the script that runs it (./tour) and the little control panel
 * (./TourHud). Tiny on purpose: the desktop's overlay host reads `active` without loading the tour.
 */
import { create } from 'zustand';

export interface TourState {
  active: boolean;
  step: number;
  total: number;
  icon: string;
  title: string;
  text: string;
  /** the last stretch: offer to take the controls */
  ending: boolean;
  /** bumped by "Next": whatever the tour is doing right now is cut short */
  nudge: number;
  /** "Stop" / Esc */
  stopped: boolean;
  /** what the visitor picked on the last card */
  choice: 'drive' | 'done' | null;
  begin(total: number): void;
  show(step: number, icon: string, title: string, text: string): void;
  next(): void;
  stop(): void;
  finish(): void;
  choose(c: 'drive' | 'done'): void;
  end(): void;
}

export const useTourStore = create<TourState>((set) => ({
  active: false,
  step: 0,
  total: 0,
  icon: '🧭',
  title: '',
  text: '',
  ending: false,
  nudge: 0,
  stopped: false,
  choice: null,
  begin: (total) => set({ active: true, total, step: 0, ending: false, stopped: false, choice: null, nudge: 0 }),
  show: (step, icon, title, text) => set({ step, icon, title, text }),
  next: () => set((s) => ({ nudge: s.nudge + 1 })),
  stop: () => set({ stopped: true }),
  finish: () => set({ ending: true }),
  choose: (choice) => set({ choice }),
  end: () => set({ active: false, ending: false }),
}));
