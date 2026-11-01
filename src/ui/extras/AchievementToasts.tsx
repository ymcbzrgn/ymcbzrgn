/**
 * "Achievement unlocked" cards that slide in above the taskbar. Clicking one opens the Achievements window.
 */
import { useEffect, useRef, useState } from 'react';
import { onUnlock, type AchievementId } from '../../os/achievements';
import { defOf } from '../../os/achievementDefs';
import { useLang, useT } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { sfx } from '../../os/sound/sfx';
import './AchievementToasts.css';

interface Toast {
  key: number;
  id: AchievementId;
}

const SHOW_MS = 4600;
const MAX = 3;

export default function AchievementToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextKey = useRef(1);
  const lang = useLang();
  const t = useT();
  const launch = useLaunch();

  useEffect(() => {
    return onUnlock((id) => {
      const key = nextKey.current++;
      setToasts((list) => [...list.slice(-(MAX - 1)), { key, id }]);
      sfx('ach');
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.key !== key)), SHOW_MS);
    });
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="ach-toasts" role="status" aria-live="polite">
      {toasts.map(({ key, id }) => {
        const def = defOf(id);
        if (!def) return null;
        const [title] = def[lang];
        return (
          <button
            key={key}
            type="button"
            className="ach-toast"
            onClick={() => {
              setToasts((list) => list.filter((x) => x.key !== key));
              launch('achievements');
            }}
          >
            <span className="ach-toast__icon" aria-hidden="true">
              {def.icon}
            </span>
            <span className="ach-toast__text">
              <small>{t('achUnlocked')}</small>
              <strong>{title}</strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}
