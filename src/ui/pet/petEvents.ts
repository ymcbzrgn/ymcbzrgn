/** Tiny bridge so other parts of the OS (the terminal) can ask the pixel twin to be driven, without importing it. */
export const PET_CONTROL_EVENT = 'pet:control';

export function requestPetControl() {
  window.dispatchEvent(new CustomEvent(PET_CONTROL_EVENT));
}
