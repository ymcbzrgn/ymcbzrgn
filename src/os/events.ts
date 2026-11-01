/**
 * Tiny cross-module events that have to be reachable from the main bundle (taskbar, welcome window)
 * while the code that answers them is loaded lazily.
 *
 * Each request also leaves a flag behind, so asking before the lazy part has loaded is not lost:
 * the overlay host checks the flag when it starts.
 */

export const PALETTE_EVENT = 'yb:palette';
export const MELTDOWN_EVENT = 'yb:meltdown';

let paletteWanted = false;

/** Open the command palette (Ctrl/Cmd+K does the same). */
export function openPalette() {
  paletteWanted = true;
  window.dispatchEvent(new Event(PALETTE_EVENT));
}

/** Read and clear a pending palette request. */
export function takePaletteRequest(): boolean {
  const wanted = paletteWanted;
  paletteWanted = false;
  return wanted;
}

/** The terminal's classic prank: the desktop "crashes", then comes back untouched. */
export function requestMeltdown() {
  window.dispatchEvent(new Event(MELTDOWN_EVENT));
}
