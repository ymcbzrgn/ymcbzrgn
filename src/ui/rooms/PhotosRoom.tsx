/** The room of the Photos window: a gallery hall where every picture hangs on an easel. */
import { useEffect, useMemo } from 'react';
import { useT } from '../../os/i18n/full';
import { unlock } from '../../os/achievements';
import type { VFSNode } from '../../os/types';
import RoomStrip from './RoomStrip';
import type { RoomPropSpec } from './rooms';
import { useRoomStore } from './roomStore';

interface Props {
  windowId: string;
  images: VFSNode[];
  /** show picture number `index` in the viewer */
  onShow(index: number): void;
}

// where the easel sprites' canvas is (sprite px): a photo fits inside the white frame
const CANVAS = { x: 6, y: 4, w: 16, h: 15 };
const EASELS = ['easel_a', 'easel_b', 'easel_c'];

export default function PhotosRoom({ windowId, images, onShow }: Props) {
  const t = useT();

  useEffect(() => {
    unlock('gallery');
  }, []);

  const specs = useMemo<RoomPropSpec[]>(
    () =>
      images.map((image, i) => ({
        id: image.id,
        label: image.name,
        sprite: EASELS[i % EASELS.length],
        overlay: image.targetUrl ? { src: image.targetUrl, ...CANVAS } : undefined,
        anim: 'inspect',
        use: () => {
          useRoomStore.getState().api?.say(t('roomLook'), 2400);
          onShow(i);
        },
      })),
    [images, onShow, t]
  );
  const exit = useMemo<RoomPropSpec>(
    () => ({ id: '__exit', label: t('roomLeave'), exit: true, sprite: 'door_up', spriteOpen: 'door_open', knock: true, use: () => useRoomStore.getState().leave() }),
    [t]
  );
  return <RoomStrip windowId={windowId} theme="pictures" specs={specs} exit={exit} title={`🏠 ${t('roomPhotosTitle')}`} />;
}
