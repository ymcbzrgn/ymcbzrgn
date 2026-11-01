/**
 * Tiny bridge so other parts of the OS (terminal, palette, welcome window) can ask the pixel twin to do
 * things without importing it. Requests leave a flag behind, so asking before the twin has loaded
 * (or before it has run in) is not lost.
 */
import { useStore } from '../../os/store';

export const PET_CONTROL_EVENT = 'pet:control';
export const PET_TOUR_EVENT = 'pet:tour';
export const PET_SCRIPT_EVENT = 'pet:script';

export function requestPetControl() {
  window.dispatchEvent(new CustomEvent(PET_CONTROL_EVENT));
}

let tourWanted = false;

/** Start the guided tour (the assistant is switched back on if the visitor had hidden it). */
export function requestTour() {
  tourWanted = true;
  const { settings, updateSettings } = useStore.getState();
  if (settings.assistantHidden) {
    // it loads, runs in, and picks the request up when it is ready
    updateSettings({ assistantHidden: false });
  } else {
    window.dispatchEvent(new Event(PET_TOUR_EVENT));
  }
}

export function takeTourRequest(): boolean {
  const wanted = tourWanted;
  tourWanted = false;
  return wanted;
}

/** Small one-off commands for the twin (used by the terminal's `pet` command). */
export type PetScript =
  | { kind: 'say'; text: string }
  | { kind: 'do'; anim: string }
  | { kind: 'go'; target: string };

export function sendPetScript(script: PetScript) {
  window.dispatchEvent(new CustomEvent<PetScript>(PET_SCRIPT_EVENT, { detail: script }));
}
