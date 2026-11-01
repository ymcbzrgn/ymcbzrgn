/**
 * `neofetch`: the pixel twin next to the specs of this "machine". The same rows are available as plain
 * text (for pipes: `neofetch | grep Role`).
 */
import { useEffect, useState } from 'react';
import Sprite from '../../ui/mascot/Sprite';
import { readSeen } from '../../ui/pet/control/seen';
import { neofetchRows, type Row } from './neofetchData';

const SWATCH = ['#1a1a1a', '#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#f8fafc'];

export default function Neofetch() {
  const [rows, setRows] = useState<Row[]>(() => neofetchRows());

  // the total number of moves lives with the move palette: load it on the side
  useEffect(() => {
    let alive = true;
    void import('../../ui/pet/control/moves').then(({ PALETTE }) => {
      if (!alive) return;
      setRows((list) => list.map(([k, v]) => (k === 'Moves' ? [k, `${readSeen().size}/${PALETTE.length} discovered`] : [k, v])));
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="neofetch">
      <div className="neofetch__art" aria-hidden="true">
        <Sprite anim="idle" scale={4} />
      </div>
      <div className="neofetch__info">
        <div className="neofetch__user">yamac@portfolio</div>
        <div className="neofetch__rule">{'─'.repeat(15)}</div>
        {rows.map(([k, v]) => (
          <div key={k} className="neofetch__row">
            <span className="neofetch__key">{k}</span>
            <span>{v}</span>
          </div>
        ))}
        <div className="neofetch__swatches" aria-hidden="true">
          {SWATCH.map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
