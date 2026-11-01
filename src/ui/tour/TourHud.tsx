/**
 * The tour's control panel: which step, what the twin is saying (in writing too), Next / Stop.
 * Space, Enter or the right arrow go on; Esc stops.
 */
import { useEffect } from 'react';
import { useT } from '../../os/i18n/full';
import { isTypingTarget } from '../pet/control/world';
import { useTourStore } from './tourStore';
import './TourHud.css';

export default function TourHud() {
  const t = useT();
  const { step, total, icon, title, text, ending } = useTourStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const st = useTourStore.getState();
      // Esc always stops (even with the cursor in the terminal); the other keys never steal typing
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (st.ending) st.choose('done');
        else st.stop();
      } else if (!st.ending && !isTypingTarget(e.target as HTMLElement | null) && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight')) {
        if ((e.target as HTMLElement | null)?.closest?.('button, a[href]')) return; // keep Enter/Space for focused buttons
        e.preventDefault();
        e.stopPropagation();
        st.next();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div className="tour-hud" role="status" aria-live="polite">
      <div className="tour-hud__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="tour-hud__body">
        <div className="tour-hud__top">
          <span className="tour-hud__label">{t('tourLabel')}</span>
          {!ending && (
            <span className="tour-hud__count">
              {step + 1} / {total}
            </span>
          )}
        </div>
        <strong className="tour-hud__title">{title}</strong>
        <p className="tour-hud__text">{text}</p>
      </div>
      <div className="tour-hud__actions">
        {ending ? (
          <>
            <button type="button" className="tour-hud__btn tour-hud__btn--go" onClick={() => useTourStore.getState().choose('drive')}>
              {t('tourDriveCta')}
            </button>
            <button type="button" className="tour-hud__btn" onClick={() => useTourStore.getState().choose('done')}>
              OK
            </button>
          </>
        ) : (
          <>
            <button type="button" className="tour-hud__btn tour-hud__btn--go" onClick={() => useTourStore.getState().next()}>
              {t('tourNext')} ▸
            </button>
            <button type="button" className="tour-hud__btn" onClick={() => useTourStore.getState().stop()}>
              {t('tourStop')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
