/**
 * RoomStrip: a small side-scrolling pixel room at the top of a folder window. The twin lives in it
 * (Pet.tsx portals itself into `.room__world`); every item of the folder is a prop it can walk up to
 * and use, pick up and carry, or knock on (folders are doors). The window decides what the props are.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../os/i18n/full';
import { useRoomStore } from './roomStore';
import { addToSet, unlock } from '../../os/achievements';
import { createRunner, type LaidOut } from './runner';
import SceneSprite from './SceneSprite';
import { SPRITES, THEMES, tileUrl } from './scene';
import type { RoomPropSpec } from './rooms';
import { timeOfDay } from '../pet/specialDays';
import './rooms.css';

const SCALE = 2;
const STRIP_H = 136;
const CONTACT = 16; // px from the bottom of the strip to the floor line the twin and the props stand on (the art puts it 8 px up)
const GAP = 104; // px between two props
const FIRST = 200; // x of the first prop
const EXIT_X = 56; // x of the exit door
const ENTRY_X = 96; // where the twin appears

export interface RoomStripProps {
  windowId: string;
  theme: string;
  specs: RoomPropSpec[];
  exit: RoomPropSpec;
  title: string;
  /** e.g. "Secret places 1/2" */
  badge?: string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const nextFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

const FALLBACK_EMOJI: Record<string, string> = { door: '🚪', door_up: '⬆️', arcade: '🕹️', computer: '🖥️', sign: '🪧', pdf: '📕', scroll: '📜', book_stack: '📚', secret: '❓' };

export default function RoomStrip({ windowId, theme: themeId, specs, exit, title, badge }: RoomStripProps) {
  const t = useT();
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tiles, setTiles] = useState({ wall: '', floor: '' });
  const carrying = useRoomStore((s) => s.carrying);
  const theme = THEMES[themeId] ?? THEMES.default;

  const laid = useMemo<LaidOut[]>(() => specs.map((spec, i) => ({ spec, x: FIRST + i * GAP })), [specs]);
  const worldW = Math.max(view, FIRST + Math.max(specs.length, 1) * GAP + 80);

  // latest values for the long-lived runner and camera loop
  const latest = useRef({ laid, exit, t, worldW, view });
  latest.current = { laid, exit, t, worldW, view };

  // width of the visible strip
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setView(stage.clientWidth);
    const ro = new ResizeObserver(() => setView(stage.clientWidth));
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // wall / floor tiles cut out of the scene sheet
  useEffect(() => {
    let alive = true;
    if (!theme) return;
    void Promise.all([tileUrl(theme.wall), tileUrl(theme.floor)]).then(([wall, floor]) => alive && setTiles({ wall, floor }));
    return () => {
      alive = false;
    };
  }, [theme]);

  // register with the store: the twin portals into the world element and drives it through the runner
  useEffect(() => {
    const host = worldRef.current;
    if (!host) return;
    const runner = createRunner({
      props: () => latest.current.laid,
      exit: () => ({ spec: latest.current.exit, x: EXIT_X }),
      el: (id) => host.querySelector<HTMLElement>(`[data-prop-id="${CSS.escape(id)}"]`),
      open: setOpenId,
      t: (key) => latest.current.t(key),
      settled: nextFrames,
      entryX: ENTRY_X,
    });
    useRoomStore.getState().mount({ windowId, host, width: latest.current.worldW, view: latest.current.view, contact: CONTACT, runner });
    return () => useRoomStore.getState().unmount(windowId);
  }, [windowId]);
  useEffect(() => {
    useRoomStore.getState().resize(worldW, view);
  }, [worldW, view]);

  // achievements: being in a room, and how many different ones
  useEffect(() => {
    unlock('room');
    if (addToSet('rooms', themeId) >= 5) unlock('rooms5');
  }, [themeId]);

  // camera: follows the twin along the world, unless the visitor is looking around (wheel / arrows)
  const pan = useRef({ target: 0, until: 0 });
  const camNow = useRef(0);
  const lookAround = (delta: number) => {
    const max = Math.max(0, latest.current.worldW - latest.current.view);
    pan.current = { target: clamp((performance.now() < pan.current.until ? pan.current.target : camNow.current) + delta, 0, max), until: performance.now() + 3500 };
  };
  useEffect(() => {
    let raf = 0;
    let cam = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const world = worldRef.current;
      const stage = stageRef.current;
      if (!world || !stage) return;
      const viewW = stage.clientWidth;
      const pet = world.querySelector<HTMLElement>('.pet');
      let target = cam;
      if (performance.now() < pan.current.until) {
        target = pan.current.target;
      } else if (pet) {
        const pr = pet.getBoundingClientRect();
        const wr = world.getBoundingClientRect();
        target = clamp(pr.left - wr.left + pr.width / 2 - viewW / 2, 0, Math.max(0, latest.current.worldW - viewW));
      }
      cam += (target - cam) * 0.14;
      if (Math.abs(target - cam) < 0.4) cam = target;
      camNow.current = cam;
      world.style.transform = `translate3d(${-Math.round(cam * 2) / 2}px, 0, 0)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // click on the wall / floor: walk there
  const onWorldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.room__prop, .pet, .room__close')) return;
    const world = worldRef.current;
    if (!world || e.button !== 0) return;
    void useRoomStore.getState().runner?.walkTo(e.clientX - world.getBoundingClientRect().left);
  };

  // decoration sits in every third gap between two props, so it never hides one
  const decorSpots = useMemo(() => {
    const list = theme?.decor ?? [];
    const out: { name: string; x: number }[] = [];
    for (let j = 0; list.length > 0 && FIRST + (1.5 + 3 * j) * GAP < worldW - 60; j++) out.push({ name: list[j % list.length], x: FIRST + (1.5 + 3 * j) * GAP });
    return out;
  }, [theme, worldW]);

  const wallDef = SPRITES[theme?.wall ?? ''];
  const floorDef = SPRITES[theme?.floor ?? ''];
  const wallH = wallDef ? wallDef.h * SCALE : STRIP_H - 24;
  const floorH = floorDef ? floorDef.h * SCALE : 24;
  const emoji = (name: string, secret?: boolean) => FALLBACK_EMOJI[name] ?? (secret ? '❓' : name.startsWith('crate') ? '📦' : name.startsWith('easel') ? '🖼️' : '📄');

  return (
    <div
      ref={stageRef}
      className="room"
      style={{ height: STRIP_H }}
      data-room-theme={themeId}
      data-tod={timeOfDay()}
      data-room-window={windowId}
      onWheel={(e) => worldW > view && lookAround(e.deltaX + (Math.abs(e.deltaX) < 1 ? e.deltaY : 0))}
    >
      <div ref={worldRef} className="room__world" style={{ width: worldW }} onPointerDown={onWorldPointerDown}>
        <div
          className="room__wall"
          style={{
            height: wallH,
            backgroundImage: tiles.wall ? `url(${tiles.wall})` : undefined,
            backgroundSize: wallDef ? `${wallDef.w * SCALE}px ${wallDef.h * SCALE}px` : undefined,
          }}
        />
        <div
          className="room__floor"
          style={{
            height: floorH,
            backgroundImage: tiles.floor ? `url(${tiles.floor})` : undefined,
            backgroundSize: floorDef ? `${floorDef.w * SCALE}px ${floorDef.h * SCALE}px` : undefined,
          }}
        />

        {decorSpots.map(({ name, x }, i) => (
          <span key={name + i} className="room__decor" style={{ left: x, bottom: CONTACT }}>
            <SceneSprite name={name} scale={SCALE} />
          </span>
        ))}

        {[{ spec: exit, x: EXIT_X }, ...laid].map(({ spec, x }) => (
          <button
            key={spec.id}
            type="button"
            className={`room__prop${carrying?.nodeId === spec.id ? ' is-carried' : ''}`}
            data-prop-id={spec.id}
            data-label={spec.label}
            aria-label={spec.label}
            style={{ left: x, bottom: CONTACT }}
            onClick={() => void useRoomStore.getState().runner?.use(spec.id)}
          >
            <SceneSprite name={openId === spec.id && spec.spriteOpen ? spec.spriteOpen : spec.sprite} scale={SCALE} fallback={emoji(spec.sprite, spec.secret)} />
            {spec.overlay && (
              <img
                className="room__overlay"
                src={spec.overlay.src}
                alt=""
                draggable={false}
                style={{ left: spec.overlay.x * SCALE, top: spec.overlay.y * SCALE, width: spec.overlay.w * SCALE, height: spec.overlay.h * SCALE }}
              />
            )}
            <span className="room__tag">{spec.label}</span>
          </button>
        ))}
      </div>

      {worldW > view + 8 && (
        <>
          <button type="button" className="room__pan room__pan--left" onClick={() => lookAround(-view * 0.7)} aria-label="←" tabIndex={-1}>
            ‹
          </button>
          <button type="button" className="room__pan room__pan--right" onClick={() => lookAround(view * 0.7)} aria-label="→" tabIndex={-1}>
            ›
          </button>
        </>
      )}

      <div className="room__chrome">
        <span className="room__title">{title}</span>
        {badge && <span className="room__badge">{badge}</span>}
        <button type="button" className="room__close" style={badge ? undefined : { marginLeft: 'auto' }} onClick={() => useRoomStore.getState().leave()} aria-label={t('roomClose')} title={t('roomClose')}>
          ✕
        </button>
      </div>
    </div>
  );
}
