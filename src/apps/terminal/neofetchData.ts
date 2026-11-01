/** The rows of `neofetch`: the specs of this "machine", as plain data (the terminal prints them as text or as a picture). */
import { useStore } from '../../os/store';
import { getLang } from '../../os/i18n';
import { PROFILE } from '../../os/content/profile';
import { ACHIEVEMENT_IDS, unlockedAt } from '../../os/achievements';
import { readSeen } from '../../ui/pet/control/seen';

export type Row = [label: string, value: string];

export function neofetchRows(): Row[] {
  const lang = getLang();
  const { settings, nodes } = useStore.getState();
  const mins = Math.floor(performance.now() / 60000);
  const apps = Object.values(nodes).filter((n) => n.type === 'app').length;
  const theme = settings.theme.replace(/-/g, ' ');
  return [
    ['OS', 'Ubuntu×XP Desktop (browser edition)'],
    ['Host', PROFILE.site.replace(/^https?:\/\/(www\.)?/, '')],
    ['Kernel', 'React 18 · TypeScript · Vite'],
    ['Uptime', mins < 1 ? '< 1 min' : `${mins} min`],
    ['Apps', String(apps)],
    ['Shell', 'yb-sh 1.0'],
    ['Screen', `${window.innerWidth}×${window.innerHeight}`],
    ['Theme', theme],
    ['Language', lang === 'tr' ? 'Türkçe' : 'English'],
    ['Moves', `${readSeen().size} discovered`],
    ['Trophies', `${Object.keys(unlockedAt()).length}/${ACHIEVEMENT_IDS.length}`],
    ['Role', `${PROFILE.name}, ${lang === 'tr' ? 'Arketic AI' : 'Arketic AI'}`],
  ];
}

export function neofetchText(): string {
  const rows = neofetchRows();
  const pad = Math.max(...rows.map(([k]) => k.length));
  return ['yamac@portfolio', '-'.repeat(15), ...rows.map(([k, v]) => `${k.padEnd(pad)}  ${v}`)].join('\n');
}

