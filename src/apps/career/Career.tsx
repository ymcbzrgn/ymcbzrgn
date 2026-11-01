/**
 * Career: the story so far as a timeline. On a desktop the pixel twin walks it in a room (every
 * station is a milestone you can send it to); everywhere else, and for anyone who prefers reading,
 * the same milestones are a list below. Facts come from src/os/content/career.ts.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useStore } from '../../os/store';
import { useLang, useT } from '../../os/i18n/full';
import { useIsMobile } from '../../os/hooks/useDeviceType';
import { MILESTONES } from '../../os/content/career';
import { useRoomStore } from '../../ui/rooms/roomStore';
import '../../ui/rooms/roomToggle.css';
import './Career.css';

const CareerRoom = lazy(() => import('../../ui/rooms/CareerRoom'));

interface Props {
  windowId?: string;
}

export default function Career({ windowId = 'career' }: Props) {
  const t = useT();
  const lang = useLang();
  const isMobile = useIsMobile();
  const assistantHidden = useStore((s) => s.settings.assistantHidden);
  const updateWindowTitle = useStore((s) => s.updateWindowTitle);
  const roomOn = useRoomStore((s) => s.windowId === windowId);
  const [selected, setSelected] = useState(MILESTONES.length - 1);
  const canRoom = !isMobile && !assistantHidden;

  useEffect(() => {
    updateWindowTitle(windowId, t('careerTitle'));
  }, [t, windowId, updateWindowTitle]);

  // the twin is invited in as soon as the window opens (the toggle takes it out again)
  useEffect(() => {
    if (canRoom) useRoomStore.getState().enter(windowId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = useCallback((i: number) => setSelected(i), []);
  const m = MILESTONES[selected];

  return (
    <div className="career">
      <header className="career__bar">
        <h1>{t('careerTitle')}</h1>
        {canRoom && (
          <button
            type="button"
            className="room-toggle"
            aria-pressed={roomOn}
            title={t('roomToggle')}
            onClick={() => (roomOn ? useRoomStore.getState().leave() : useRoomStore.getState().enter(windowId))}
          >
            🏠
          </button>
        )}
      </header>

      {roomOn && canRoom && (
        <Suspense fallback={null}>
          <CareerRoom windowId={windowId} onSelect={pick} />
        </Suspense>
      )}

      <article className="career__card" aria-live="polite">
        <span className="career__icon" aria-hidden="true">
          {m.icon}
        </span>
        <div>
          <small>{m.year}</small>
          <h2>{m.title[lang]}</h2>
          <p>{m.text[lang]}</p>
        </div>
      </article>

      <ol className="career__list">
        {MILESTONES.map((x, i) => (
          <li key={x.id}>
            <button type="button" className={i === selected ? 'is-selected' : ''} onClick={() => setSelected(i)} aria-current={i === selected ? 'step' : undefined}>
              <span className="career__year">{x.year}</span>
              <span className="career__dot" aria-hidden="true">
                {x.icon}
              </span>
              <span className="career__name">{x.title[lang]}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
