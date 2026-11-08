/** The room of the career window: a hall with one station per milestone, in the order it happened. */
import { useMemo } from 'react';
import { useLang, useT } from '../../os/i18n/full';
import { MILESTONES } from '../../os/content/career';
import RoomStrip from './RoomStrip';
import type { RoomPropSpec } from './rooms';
import { useRoomStore } from './roomStore';

/** a prop from the scene sheet for each station */
const SPRITE: Record<string, string> = {
  altinbas: 'book_stack',
  milan: 'suitcase', // (with an Italian flag)
  exagate: 'toolbox',
  ideathon: 'trophy', // second place: a silver cup with a 2 on it
  'arketic-intern': 'computer',
  graduate: 'grad_cap',
  arketic: 'server_rack', // its lights blink
};

interface Props {
  windowId: string;
  onSelect(index: number): void;
}

export default function CareerRoom({ windowId, onSelect }: Props) {
  const t = useT();
  const lang = useLang();
  const specs = useMemo<RoomPropSpec[]>(
    () =>
      MILESTONES.map((m, i) => ({
        id: `ms-${m.id}`,
        label: `${m.year} · ${m.title[lang]}`,
        sprite: SPRITE[m.id] ?? 'scroll',
        anim: 'inspect',
        use: () => {
          useRoomStore.getState().api?.say(`${m.year} · ${m.title[lang]}`, 3200); // (the long text is on the card below)
          onSelect(i);
        },
      })),
    [lang, onSelect]
  );
  const exit = useMemo<RoomPropSpec>(
    () => ({ id: '__exit', label: t('roomLeave'), exit: true, sprite: 'door_up', spriteOpen: 'door_open', knock: true, use: () => useRoomStore.getState().leave() }),
    [t]
  );
  return <RoomStrip windowId={windowId} theme="documents" specs={specs} exit={exit} title={`🗺️ ${t('roomCareerTitle')}`} />;
}
