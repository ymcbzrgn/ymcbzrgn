/**
 * The desktop's lazy overlay host: everything that is not needed for the first paint but must be
 * reachable from anywhere lives under this one component (one small chunk loaded after the desktop):
 *   - Ctrl/Cmd+K command palette
 *   - achievement toasts
 *   - small sounds for windows opening and closing
 *   - a few achievements that belong to no single feature (language switch, night owl)
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useStore } from '../../os/store';
import { MELTDOWN_EVENT, PALETTE_EVENT, takePaletteRequest } from '../../os/events';
import { unlock } from '../../os/achievements';
import { sfx } from '../../os/sound/sfx';
import { useTourStore } from '../tour/tourStore';
import AchievementToasts from './AchievementToasts';

const CommandPalette = lazy(() => import('../palette/CommandPalette'));
const TourHud = lazy(() => import('../tour/TourHud'));
const Meltdown = lazy(() => import('../effects/Meltdown'));

export default function Extras() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [melting, setMelting] = useState(false);
  const openRef = useRef(false);
  const tourActive = useTourStore((s) => s.active);

  const setPalette = (open: boolean) => {
    openRef.current = open;
    setPaletteOpen(open);
    if (open) unlock('palette');
  };

  /* ----- palette: Ctrl/Cmd+K, the taskbar button, `/` when nothing is being typed ----- */
  useEffect(() => {
    if (takePaletteRequest()) setPalette(true);
    const onRequest = () => {
      takePaletteRequest();
      setPalette(true);
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && k === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setPalette(!openRef.current);
      }
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener(PALETTE_EVENT, onRequest);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener(PALETTE_EVENT, onRequest);
    };
  }, []);

  /* ----- `rm -rf /` from the terminal ----- */
  useEffect(() => {
    const on = () => setMelting(true);
    window.addEventListener(MELTDOWN_EVENT, on);
    return () => window.removeEventListener(MELTDOWN_EVENT, on);
  }, []);

  /* ----- window sounds ----- */
  useEffect(() => {
    let known = new Set(useStore.getState().windows.map((w) => w.id));
    return useStore.subscribe((state, prev) => {
      if (state.windows === prev.windows) return;
      const now = new Set(state.windows.map((w) => w.id));
      const opened = [...now].some((id) => !known.has(id));
      const closed = [...known].some((id) => !now.has(id));
      known = now;
      if (opened) sfx('open');
      else if (closed) sfx('close');
    });
  }, []);

  /* ----- achievements that belong to no single feature ----- */
  useEffect(() => {
    const onLang = () => unlock('polyglot');
    window.addEventListener('yb:lang', onLang);
    const owl = new Date().getHours() < 5 ? window.setTimeout(() => unlock('owl'), 6000) : 0;
    return () => {
      window.removeEventListener('yb:lang', onLang);
      window.clearTimeout(owl);
    };
  }, []);

  return (
    <>
      <AchievementToasts />
      {tourActive && (
        <Suspense fallback={null}>
          <TourHud />
        </Suspense>
      )}
      {melting && (
        <Suspense fallback={null}>
          <Meltdown onDone={() => setMelting(false)} />
        </Suspense>
      )}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette onClose={() => setPalette(false)} />
        </Suspense>
      )}
    </>
  );
}
