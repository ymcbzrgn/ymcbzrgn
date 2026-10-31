/**
 * "Simple view": a one-page alternative to the desktop, addressed as /#simple so it can be
 * linked directly (e.g. from a CV or a LinkedIn profile).
 *
 * State lives in the URL hash, so no router is needed.
 */
import { useSyncExternalStore } from 'react';

const HASH = '#simple';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener('popstate', onChange);
  };
}

const getSnapshot = () => window.location.hash === HASH;
const getServerSnapshot = () => false;

/** True while the simple view is active. */
export function useSimpleView(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function openSimpleView(): void {
  window.location.hash = HASH;
}

export function openDesktopView(): void {
  // Drop the hash without leaving a "#" in the URL, then tell listeners (replaceState is silent)
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
