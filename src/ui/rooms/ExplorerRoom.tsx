/**
 * The room of a file explorer window: every item of the open folder is a prop. Folders are doors
 * (knock to go in), apps are arcade machines / computers, files are scrolls, PDFs, easels. The twin
 * can open them, or pick files up and carry them into another folder (a real move). Hidden places
 * show up as suspicious wall panels; finding one makes it visible for good.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useDesktopActions, useVFSActions, useVFSNodes, useVFSNodesByParent } from '../../os/store';
import { nameExists } from '../../os/utils/naming';
import { useT } from '../../os/i18n/full';
import { anim } from '../pet/control/moves';
import type { VFSNode } from '../../os/types';
import RoomStrip from './RoomStrip';
import { NEVER_REVEAL, themeFor, visualFor, type RoomPropSpec } from './rooms';
import { useRoomStore, type Carry } from './roomStore';
import { unlock } from '../../os/achievements';

interface Props {
  windowId: string;
  folderId: string;
  /** the explorer has a parent folder to go back to (its path is longer than one) */
  parentId?: string;
  goUp(): void;
  goInto(folderId: string): void;
  openNode(node: VFSNode): void;
}

/** Hidden places the twin can find. */
const SECRETS = ['photo-gallery-app', 'downloads', 'music-player-app'];

export default function ExplorerRoom({ windowId, folderId, parentId, goUp, goInto, openNode }: Props) {
  const t = useT();
  const nodes = useVFSNodes();
  const children = useVFSNodesByParent(folderId);
  const { updateNode, moveNode } = useVFSActions();
  const { initializeIconPosition, removeIconPosition } = useDesktopActions();
  const folder = nodes[folderId];

  // the explorer re-creates its callbacks every render: the props below always call the latest ones
  const cb = useRef({ goUp, goInto, openNode });
  cb.current = { goUp, goInto, openNode };

  const isInside = (id: string, ancestorId: string) => {
    const seen = new Set<string>();
    let cur: VFSNode | undefined = nodes[id];
    while (cur && !seen.has(cur.id)) {
      if (cur.id === ancestorId) return true;
      seen.add(cur.id);
      cur = cur.parentId ? nodes[cur.parentId] : undefined;
    }
    return false;
  };

  async function moveInto(c: Carry, targetId: string): Promise<'moved' | 'locked' | 'exists'> {
    const node = nodes[c.nodeId];
    const target = nodes[targetId];
    if (!node || !target || target.type !== 'folder' || target.readonly || c.nodeId === targetId || isInside(targetId, c.nodeId)) return 'locked';
    if (node.parentId === targetId) return 'locked';
    if (nameExists(node.name, targetId, nodes, node.id)) return 'exists';
    try {
      await moveNode(node.id, targetId);
      if (node.parentId === 'root') removeIconPosition(node.id); // it left the desktop
      if (targetId === 'root') initializeIconPosition(node.id, node.type); // it landed on the desktop
      unlock('carry');
      return 'moved';
    } catch {
      return 'locked';
    }
  }

  const hidden = useMemo(
    () => Object.values(nodes).filter((n) => n.parentId === folderId && n.hidden && !NEVER_REVEAL.has(n.id)),
    [nodes, folderId]
  );
  const found = SECRETS.filter((id) => nodes[id] && !nodes[id].hidden).length;
  const total = SECRETS.filter((id) => nodes[id]).length;
  // (also for places found on an earlier visit: the badge says so, the achievements should agree)
  useEffect(() => {
    if (found > 0) unlock('secret');
    if (total > 0 && found >= total) unlock('secretsAll');
  }, [found, total]);

  const sorted = useMemo(
    () =>
      [...children].sort((a, b) => (a.type === 'folder') !== (b.type === 'folder') ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)),
    [children]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specs = useMemo<RoomPropSpec[]>(() => {
    const list: RoomPropSpec[] = sorted.map((node) => {
      const v = visualFor(node, folderId);
      if (node.type === 'folder') {
        return {
          id: node.id,
          label: node.name,
          sprite: v.sprite,
          spriteOpen: 'door_open',
          knock: true,
          use: () => cb.current.goInto(node.id),
          accept: (c: Carry) => moveInto(c, node.id),
        };
      }
      return {
        id: node.id,
        label: node.name,
        sprite: v.sprite,
        anim: v.anim,
        use: () => cb.current.openNode(node),
        carry: { nodeId: node.id, item: v.item, heavy: !!node.readonly },
      };
    });
    for (const n of hidden) {
      list.push({
        id: n.id,
        label: '???',
        sprite: 'secret',
        spriteOpen: 'secret_open',
        secret: true,
        anim: 'inspect',
        use: async () => {
          await updateNode(n.id, { hidden: false });
          const api = useRoomStore.getState().api;
          api?.say(t('roomSecretFound'), 3600);
          api?.set({ anim: anim('celebrate', 'wave') });
        },
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, hidden, folderId, nodes, t]);

  const exit = useMemo<RoomPropSpec>(
    () =>
      parentId
        ? {
            id: '__exit',
            label: `${t('roomUp')} ${nodes[parentId]?.name ?? ''}`.trim(),
            name: nodes[parentId]?.name,
            exit: true,
            sprite: 'door_up',
            spriteOpen: 'door_open',
            knock: true,
            use: () => cb.current.goUp(),
            accept: (c) => moveInto(c, parentId),
          }
        : { id: '__exit', label: t('roomLeave'), exit: true, sprite: 'door_up', spriteOpen: 'door_open', knock: true, use: () => useRoomStore.getState().leave() },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentId, nodes, t]
  );

  return (
    <RoomStrip
      windowId={windowId}
      theme={themeFor(folderId)}
      specs={specs}
      exit={exit}
      title={`🏠 ${folder?.name ?? ''}`}
      badge={folderId === 'home' && total > 0 ? `${t('roomSecrets')} ${found}/${total}` : undefined}
    />
  );
}
