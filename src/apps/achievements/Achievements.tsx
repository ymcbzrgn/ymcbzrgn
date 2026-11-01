/**
 * Achievements window: everything there is to find on this desktop, what is unlocked, what is still secret.
 */
import { useEffect, useState } from 'react';
import { ACHIEVEMENT_IDS, ACH_RESET_EVENT, onUnlock, resetAchievements, unlockedAt } from '../../os/achievements';
import { DEFS, GROUPS, type AchievementGroup } from '../../os/achievementDefs';
import { useLang, useT, type StringKey } from '../../os/i18n/full';
import { PALETTE } from '../../ui/pet/control/moves';
import { readSeen } from '../../ui/pet/control/seen';
import './Achievements.css';

interface AchievementsProps {
  windowId: string;
  nodeId?: string;
}

const GROUP_KEY: Record<AchievementGroup, StringKey> = {
  twin: 'achGroupTwin',
  rooms: 'achGroupRooms',
  games: 'achGroupGames',
  terminal: 'achGroupTerminal',
  desktop: 'achGroupDesktop',
  sound: 'achGroupSound',
};

export default function Achievements(_props: AchievementsProps) {
  const t = useT();
  const lang = useLang();
  const [got, setGot] = useState<Record<string, number>>(() => ({ ...unlockedAt() }));
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const refresh = () => setGot({ ...unlockedAt() });
    const off = onUnlock(refresh, 0);
    window.addEventListener(ACH_RESET_EVENT, refresh);
    return () => {
      off();
      window.removeEventListener(ACH_RESET_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 3500);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  const total = ACHIEVEMENT_IDS.length;
  const done = ACHIEVEMENT_IDS.filter((id) => got[id]).length;
  const moves = readSeen().size;
  const movesTotal = PALETTE.length;
  const date = (ts: number) => new Date(ts).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="ach">
      <header className="ach__head">
        <div className="ach__cup" aria-hidden="true">
          🏆
        </div>
        <div className="ach__headtext">
          <h2>{t('achTitle')}</h2>
          <p>
            <strong>{done}</strong> / {total} {t('achCount')}
          </p>
          <div className="ach__bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
            <span style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="ach__body">
        {GROUPS.map((group) => {
          const defs = DEFS.filter((d) => d.group === group);
          if (!defs.length) return null;
          return (
            <section key={group} className="ach__group">
              <h3>{t(GROUP_KEY[group])}</h3>
              {group === 'twin' && (
                <div className="ach__moves">
                  <span>
                    {moves} / {movesTotal} {t('achMoves')}
                  </span>
                  <div className="ach__bar ach__bar--thin">
                    <span style={{ width: `${Math.min(100, (moves / movesTotal) * 100)}%` }} />
                  </div>
                </div>
              )}
              <ul className="ach__list">
                {defs.map((def) => {
                  const when = got[def.id];
                  const secret = def.hidden && !when;
                  const [title, description] = def[lang];
                  return (
                    <li key={def.id} className={`ach__row${when ? ' ach__row--on' : ''}`}>
                      <span className="ach__icon" aria-hidden="true">
                        {secret ? '❓' : def.icon}
                      </span>
                      <span className="ach__text">
                        <strong>{secret ? t('achHidden') : title}</strong>
                        <small>{secret ? t('achHiddenHint') : description}</small>
                      </span>
                      <span className="ach__when">{when ? date(when) : '🔒'}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="ach__foot">
        <button
          type="button"
          className={`ach__reset${confirmReset ? ' ach__reset--ask' : ''}`}
          onClick={() => {
            if (confirmReset) {
              resetAchievements();
              setConfirmReset(false);
            } else setConfirmReset(true);
          }}
        >
          {confirmReset ? (lang === 'tr' ? 'Emin misin? Tekrar tıkla' : 'Sure? Click again') : lang === 'tr' ? 'İlerlemeyi sıfırla' : 'Reset progress'}
        </button>
      </footer>
    </div>
  );
}
