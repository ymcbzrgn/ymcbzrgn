/** The room of the GitHub projects window: a workshop with one crate per repository, coloured by language. */
import { useMemo } from 'react';
import { useT } from '../../os/i18n/full';
import RoomStrip from './RoomStrip';
import { crateFor, type RoomPropSpec } from './rooms';
import { useRoomStore } from './roomStore';

interface Repo {
  id: number;
  name: string;
  language: string | null;
  stargazers_count: number;
}

/** Scroll the repo's card into view and make it flash. */
function spotlight(name: string) {
  const card = document.querySelector<HTMLElement>(`.repo-card[data-repo="${CSS.escape(name)}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('repo-card--spot');
  window.setTimeout(() => card.classList.remove('repo-card--spot'), 1800);
}

export default function ProjectsRoom({ windowId, repos }: { windowId: string; repos: Repo[] }) {
  const t = useT();
  const specs = useMemo<RoomPropSpec[]>(
    () =>
      repos.map((repo) => ({
        id: `repo-${repo.id}`,
        label: repo.stargazers_count > 0 ? `${repo.name} ★${repo.stargazers_count}` : repo.name,
        sprite: crateFor(repo.language),
        anim: 'inspect',
        use: () => {
          useRoomStore.getState().api?.say(t('roomLook'), 2400);
          spotlight(repo.name);
        },
      })),
    [repos, t]
  );
  const exit = useMemo<RoomPropSpec>(
    () => ({ id: '__exit', label: t('roomLeave'), exit: true, sprite: 'door_up', spriteOpen: 'door_open', knock: true, use: () => useRoomStore.getState().leave() }),
    [t]
  );
  return <RoomStrip windowId={windowId} theme="projects" specs={specs} exit={exit} title={`🏠 ${t('roomProjectsTitle')}`} />;
}
