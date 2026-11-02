/**
 * The phone's home screen: widgets first (who this is, what he does now, the 30-second story, the
 * projects), then the apps, and a dock with the four things a recruiter does next: CV, email,
 * LinkedIn, GitHub. The pixel twin lives in the profile widget.
 *
 * Apps open through the same event as everywhere else (useLaunch / onAppOpen), so nothing about the
 * app shell changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toggleLang, useLang, useT, type StringKey } from '../../os/i18n/full';
import { useVFSNodes } from '../../os/store';
import { useLaunch, type LaunchTarget } from '../../os/hooks/useLaunch';
import { PROFILE } from '../../os/content/profile';
import { FOCUS, PROJECTS, ROLES, monthLabel } from '../../os/content/career';
import { projectPath } from '../../os/content/paths';
import { guest } from '../../os/personal';
import { openStory } from '../../os/events';
import { openSimpleView } from '../../os/view';
import type { VFSNode } from '../../os/types';
import Sprite, { type SpriteAnim } from '../mascot/Sprite';
import PixelIcon, { type IconName } from './PixelIcon';
import StatusBar from './StatusBar';
import { GREETING_KEY, dayPart } from './dayPart';
import './MobileLauncher.css';

interface Props {
  onAppOpen: (node: VFSNode) => void;
}

interface Tile {
  id: string;
  icon: IconName;
  label: StringKey;
  open: () => void;
}

const SEQUENCE: [SpriteAnim, number][] = [
  ['wave', 3000],
  ['idle', 5200],
  ['look', 2400],
  ['idle', 4400],
  ['stretch', 2600],
  ['idle', 6000],
];
const TIPS: StringKey[] = ['homeTip1', 'homeTip2', 'homeTip3'];

export default function MobileLauncher({ onAppOpen }: Props) {
  const t = useT();
  const lang = useLang();
  const launch = useLaunch();
  const nodes = useVFSNodes();

  // Apps that are files or folders in the virtual file system open as nodes. The file system loads a
  // moment after the first paint, so a tap that comes earlier waits for it.
  const pending = useRef<string | null>(null);
  const openNode = useCallback(
    (id: string) => {
      const node = nodes[id];
      if (node) onAppOpen(node);
      else pending.current = id;
    },
    [nodes, onAppOpen]
  );
  useEffect(() => {
    const id = pending.current;
    if (id && nodes[id]) {
      pending.current = null;
      onAppOpen(nodes[id]);
    }
  }, [nodes, onAppOpen]);

  const app = useCallback((target: LaunchTarget) => () => launch(target), [launch]);

  const tiles = useMemo<Tile[]>(
    () => [
      { id: 'projects', icon: 'projects', label: 'appProjects', open: app('projects') },
      { id: 'career', icon: 'career', label: 'appCareer', open: app('career') },
      { id: 'terminal', icon: 'terminal', label: 'appTerminal', open: app('terminal') },
      { id: 'files', icon: 'files', label: 'appFiles', open: () => openNode('home') },
      { id: 'games', icon: 'games', label: 'appGames', open: () => openNode('games') },
      { id: 'music', icon: 'music', label: 'appMusic', open: () => openNode('music-player-app') },
      { id: 'photos', icon: 'photos', label: 'appPhotos', open: () => openNode('photo-gallery-app') },
      { id: 'notes', icon: 'notes', label: 'appNotes', open: () => openNode('notes-app') },
      { id: 'settings', icon: 'settings', label: 'appSettings', open: app('settings') },
      { id: 'trophies', icon: 'achievements', label: 'appTrophies', open: app('achievements') },
      { id: 'built', icon: 'aboutsite', label: 'appBuilt', open: app('aboutsite') },
      { id: 'plain', icon: 'resume', label: 'appPlain', open: openSimpleView },
    ],
    [app, openNode]
  );

  // the twin: waves and idles; a tap makes it say something
  const [step, setStep] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setStep((i) => (i + 1) % SEQUENCE.length), SEQUENCE[step][1]);
    return () => window.clearTimeout(timer);
  }, [step]);
  useEffect(() => {
    if (tip === null) return;
    const timer = window.setTimeout(() => setTip(null), 3800);
    return () => window.clearTimeout(timer);
  }, [tip]);
  const nextTip = useRef(0);
  const anim: SpriteAnim = tip === null ? SEQUENCE[step][0] : 'wave';

  const job = ROLES[0];
  const focus = FOCUS[lang].charAt(0).toLocaleUpperCase(lang) + FOCUS[lang].slice(1);
  const greeting = guest ? `${t(GREETING_KEY[dayPart()])}, ${guest}` : t(GREETING_KEY[dayPart()]);

  return (
    <div className="mobile-launcher">
      <StatusBar clear />

      <div className="home__scroll">
        <header className="home__top">
          <p className="home__greet">{greeting}</p>
          <button type="button" className="home__lang" onClick={toggleLang} aria-label={t('langSwitchLabel')} title={t('langSwitchLabel')}>
            {t('langOther')}
          </button>
        </header>

        <section className="widget widget--profile" aria-label={PROFILE.name}>
          <div className="profile__text">
            <h1 className="profile__name">{PROFILE.name}</h1>
            <p className="profile__role">{t('currentRole')}</p>
            <p className="profile__pitch">{focus}</p>
            <div className="profile__actions">
              <a className="btn btn--primary" href={PROFILE.cvUrl} target="_blank" rel="noopener noreferrer" data-home="cv">
                {t('dockCv')}
              </a>
              <button type="button" className="btn btn--glass" onClick={app('recruiter')} data-home="glance">
                {t('ctaGlance')}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="profile__twin"
            aria-label={t('homeTwinTap')}
            onClick={() => {
              setTip(nextTip.current);
              nextTip.current = (nextTip.current + 1) % TIPS.length;
            }}
          >
            {tip !== null && <span className="profile__bubble">{t(TIPS[tip])}</span>}
            <span className="profile__sprite profile__sprite--l">
              <Sprite anim={anim} scale={3} />
            </span>
            <span className="profile__sprite profile__sprite--s">
              <Sprite anim={anim} scale={2} />
            </span>
          </button>
        </section>

        <div className="widget-row">
          <button type="button" className="widget widget--small" onClick={app('career')} data-home="now">
            <span className="widget__label">{t('homeNow')}</span>
            <span className="widget__big">{monthLabel(job.start, lang)} →</span>
            <span className="widget__small">
              {job.title[lang]}, {job.org}
            </span>
          </button>
          <button type="button" className="widget widget--small widget--story" onClick={openStory} data-home="story">
            <PixelIcon name="story" scale={1} className="widget__icon" />
            <span className="widget__big">{t('ctaStory')}</span>
            <span className="widget__small">{t('homeStoryHint')}</span>
          </button>
        </div>

        <section className="widget widget--projects" aria-label={t('homeProjects')}>
          <header className="widget__head">
            <span className="widget__label">
              {t('homeProjects')} · {PROJECTS.length}
            </span>
            <button type="button" className="widget__link" onClick={app('projects')}>
              {t('homeAll')} →
            </button>
          </header>
          <ul className="projects__rail">
            {PROJECTS.map((p) => (
              <li key={p.id}>
                <a className="project" href={projectPath(p.slug, lang)} data-project={p.slug}>
                  <span className="project__name">{p.name}</span>
                  <span className="project__stack">{p.stack}</span>
                  <span className="project__sum">{p.summary[lang]}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <ul className="apps">
          {tiles.map((tile) => (
            <li key={tile.id}>
              <button type="button" className="app" onClick={tile.open} data-app={tile.id}>
                <PixelIcon name={tile.icon} scale={2} />
                <span className="app__name">{t(tile.label)}</span>
              </button>
            </li>
          ))}
        </ul>

        <footer className="home__foot">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="mobile-launcher__privacy">
            Privacy
          </a>
        </footer>
      </div>

      <nav className="dock" aria-label="Shortcuts">
        <a className="dock__item" href={PROFILE.cvUrl} target="_blank" rel="noopener noreferrer" data-dock="cv">
          <PixelIcon name="cv" scale={2} />
          <span>{t('dockCv')}</span>
        </a>
        <a className="dock__item" href={`mailto:${PROFILE.email}`} data-dock="mail">
          <PixelIcon name="mail" scale={2} />
          <span>{t('dockMail')}</span>
        </a>
        <a className="dock__item" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer" data-dock="linkedin">
          <PixelIcon name="linkedin" scale={2} />
          <span>{t('dockLinkedIn')}</span>
        </a>
        <a className="dock__item" href={PROFILE.github} target="_blank" rel="noopener noreferrer" data-dock="github">
          <PixelIcon name="github" scale={2} />
          <span>{t('dockGitHub')}</span>
        </a>
      </nav>
    </div>
  );
}
