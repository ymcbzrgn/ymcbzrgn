/**
 * "Yamaç in 30 seconds": seven full-screen cards you tap through, like a story. Built for a phone held
 * in one hand (tap right = next, tap left = back, hold = pause, swipe down = close), and it works on a
 * desktop as a centred card. Facts come from src/os/content/career.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useLang, type Lang } from '../../os/i18n/full';
import { PROFILE } from '../../os/content/profile';
import { MEDALS, PROJECTS, ROLES, SKILLS, SPOKEN } from '../../os/content/career';
import { PROFILE_TEXT } from '../../os/content/profileText';
import { guest } from '../../os/personal';
import { openSimpleView } from '../../os/view';
import { downloadVCard } from '../../apps/recruiter/vcard';
import Sprite from '../mascot/Sprite';
import SceneSprite from '../rooms/SceneSprite';
import './Story.css';

const SLIDE_MS = 4600;

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Yamaç in 30 seconds',
    close: 'Close',
    hi: 'Hi',
    hiTail: "I'm Yamaç",
    role: 'Software Engineer · AI platforms · backend · full-stack',
    now: 'Right now',
    nowSub: 'Arketic AI · since Jun 2025',
    build: 'What I build',
    proof: 'Proof, not promises',
    made: 'Things I made',
    stack: 'Tools I reach for',
    talk: "Let's talk",
    talkSub: 'Everything is one tap away.',
    cv: 'Download CV',
    save: 'Save contact',
    mail: 'Email me',
    page: 'Resume page',
    desktop: 'Open the desktop',
    replay: 'Replay',
    erasmus: 'Erasmus+ · Milan',
    langs: 'languages',
    second: '2nd place',
    sixth: '6th place',
  },
  tr: {
    title: '30 saniyede Yamaç',
    close: 'Kapat',
    hi: 'Merhaba',
    hiTail: 'ben Yamaç',
    role: 'Yazılım Mühendisi · Yapay zeka platformları · backend · full-stack',
    now: 'Şu an',
    nowSub: "Arketic AI · Haz 2025'ten beri",
    build: 'Ne geliştiriyorum',
    proof: 'Söz değil, kanıt',
    made: 'Yaptıklarım',
    stack: 'Sık kullandıklarım',
    talk: 'Konuşalım',
    talkSub: 'Hepsi tek dokunuş uzakta.',
    cv: "CV'yi indir",
    save: 'Rehbere kaydet',
    mail: 'E-posta gönder',
    page: 'Özgeçmiş sayfası',
    desktop: 'Masaüstünü aç',
    replay: 'Baştan oynat',
    erasmus: 'Erasmus+ · Milano',
    langs: 'dil',
    second: '2.lik',
    sixth: '6.lık',
  },
};

/** the icon (scene sheet) of each project of the CV */
const ICON: Record<string, string> = { hydraquant: 'proj_quant', portfolio: 'proj_os', quirkllm: 'proj_llm', shiffy: 'proj_shift', canny: 'proj_edge' };

const BG = [
  'linear-gradient(160deg,#134e4a,#0f766e 46%,#1e3a8a)',
  'linear-gradient(160deg,#312e81,#4c1d95)',
  'linear-gradient(160deg,#78350f,#b45309 60%,#7c2d12)',
  'linear-gradient(160deg,#064e3b,#047857)',
  'linear-gradient(160deg,#0f172a,#334155 55%,#1e293b)',
  'linear-gradient(160deg,#4a044e,#86198f)',
  'linear-gradient(160deg,#0f172a,#312e81 55%,#7c3aed)',
];

interface Props {
  onClose: () => void;
}

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

export default function Story({ onClose }: Props) {
  const lang = useLang();
  const L = TEXT[lang];
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [hidden, setHidden] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const press = useRef({ x: 0, y: 0, timer: 0, held: false, active: false });
  // a small phone has no room for the big twin
  const compact = typeof window !== 'undefined' && window.innerHeight < 720;
  const work = PROFILE_TEXT[lang].work;
  const arketic = ROLES[0];

  // pixel props from the room scenery, drawn bigger on a tall screen
  const art = (names: string[], scale: number) => (
    <div className="story__art">
      {names.map((name) => (
        <SceneSprite key={name} name={name} scale={scale} />
      ))}
    </div>
  );
  const big = compact ? 2 : 3;

  const slides: ReactNode[] = useMemo(
    () => [
      // 1: hello
      <>
        <div className="story__twin">
          <Sprite anim="wave" scale={compact ? 5 : 8} />
        </div>
        <h2>
          {L.hi}
          {guest ? ` ${guest}` : ''}, {L.hiTail}
        </h2>
        <p className="story__lead">{L.role}</p>
      </>,
      // 2: what I build
      <>
        {art(['computer', 'server_rack', 'toolbox'], big)}
        <h2>{L.build}</h2>
        <ul className="story__rows">
          {work.map((w) => (
            <li key={w.title}>
              <strong>{w.title}</strong>
              <span>{w.text}</span>
            </li>
          ))}
        </ul>
      </>,
      // 3: right now
      <>
        {art(['server_rack', 'computer'], big)}
        <h2>{L.now}</h2>
        <p className="story__lead">{L.nowSub}</p>
        <ul className="story__bullets">
          {[0, 3, 5].map((i) => (
            <li key={i}>{arketic.points[i][lang]}</li>
          ))}
        </ul>
      </>,
      // 4: proof
      <>
        {art(['trophy', 'grad_cap', 'suitcase'], big)}
        <h2>{L.proof}</h2>
        <div className="story__tiles">
          <div>
            <b>🏆 {L.second}</b>
            <span>{MEDALS[0].name}</span>
          </div>
          <div>
            <b>🏆 {L.sixth}</b>
            <span>{MEDALS[1].name}</span>
          </div>
          <div>
            <b>🇮🇹 {L.erasmus}</b>
            <span>{lang === 'tr' ? 'Yazılım ve yapay zeka' : 'Software and AI'}</span>
          </div>
          <div>
            <b>
              🌍 {SPOKEN.length} {L.langs}
            </b>
            <span>{SPOKEN.map((s) => s.code.toUpperCase()).join(' · ')}</span>
          </div>
        </div>
      </>,
      // 5: things I made
      <>
        <h2>{L.made}</h2>
        <ul className="story__rows story__rows--projects">
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <SceneSprite name={ICON[p.id] ?? 'proj_os'} scale={2} />
              <strong>{p.name}</strong>
              <span>{p.stack}</span>
            </li>
          ))}
        </ul>
      </>,
      // 6: stack
      <>
        {art(['toolbox', 'book_stack'], big)}
        <h2>{L.stack}</h2>
        <ul className="story__chips">
          {SKILLS.flatMap((g) => g.items).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </>,
      // 7: let's talk
      <>
        <div className="story__twin story__twin--small">
          <Sprite anim="celebrate" scale={compact ? 3 : 5} />
        </div>
        <h2>{L.talk}</h2>
        <p className="story__lead">{L.talkSub}</p>
        <div className="story__cta">
          <a className="story__btn story__btn--primary" href={PROFILE.cvUrl} download>
            {L.cv}
          </a>
          <button type="button" className="story__btn" onClick={() => downloadVCard(lang)}>
            {L.save}
          </button>
          <a className="story__btn" href={`mailto:${PROFILE.email}`}>
            {L.mail}
          </a>
          <a className="story__btn" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <button type="button" className="story__btn" onClick={openSimpleView}>
            {L.page}
          </button>
          <button type="button" className="story__btn story__btn--ghost" onClick={onClose}>
            {L.desktop}
          </button>
          <button type="button" className="story__btn story__btn--ghost" onClick={() => setIndex(0)}>
            ↺ {L.replay}
          </button>
        </div>
      </>,
    ],
    [L, arketic, big, compact, lang, onClose, work]
  );

  const last = slides.length - 1;
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // keyboard (a desktop visitor, or a phone with a keyboard)
  useEffect(() => {
    cardRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if ((e.target as HTMLElement | null)?.closest?.('button, a[href]')) return; // a focused button keeps Enter/Space
        e.preventDefault();
        e.stopPropagation();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        prev();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [next, onClose, prev]);

  // a hidden tab should not run the story
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  /* ---- touch and mouse: tap = next / back, hold = pause, swipe down = close, swipe sideways = go ---- */
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a[href]')) return;
    press.current = { x: e.clientX, y: e.clientY, timer: 0, held: false, active: true };
    press.current.timer = window.setTimeout(() => {
      press.current.held = true;
      setHeld(true);
    }, 220);
  };
  // moving the finger is a swipe, not a hold
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p.active || Math.hypot(e.clientX - p.x, e.clientY - p.y) <= 12) return;
    window.clearTimeout(p.timer);
    if (p.held) {
      p.held = false;
      setHeld(false);
    }
  };
  const finish = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if ((e.target as HTMLElement).closest('button, a[href]')) return;
    const p = press.current;
    window.clearTimeout(p.timer);
    p.active = false;
    if (p.held) {
      p.held = false;
      setHeld(false);
      return;
    }
    if (cancelled) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dy > 90 && Math.abs(dx) < 70) return onClose();
    if (dx < -60 && Math.abs(dy) < 70) return next();
    if (dx > 60 && Math.abs(dy) < 70) return prev();
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return; // a drag that went nowhere
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.32) prev();
    else next();
  };

  const playing = !held && !hidden;

  return (
    <div className="story" role="dialog" aria-modal="true" aria-label={L.title} data-reduce={reduce ? '1' : undefined} data-compact={compact ? '1' : undefined}>
      <div
        className="story__card"
        ref={cardRef}
        tabIndex={-1}
        style={{ ['--dur' as string]: `${SLIDE_MS}ms`, ['--play' as string]: playing ? 'running' : 'paused' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onPointerLeave={(e) => press.current.held && finish(e, true)}
      >
        <div className="story__bg" style={{ background: BG[index] }} />

        <div className="story__bars" aria-hidden="true">
          {slides.map((_, i) => (
            <span key={i} className={`story__bar${i < index ? ' is-done' : ''}${i === index ? ' is-active' : ''}${i === last ? ' is-last' : ''}`}>
              <i onAnimationEnd={i === index && i < last && !reduce ? next : undefined} />
            </span>
          ))}
        </div>

        <div className="story__top">
          <span>
            {L.title} · {index + 1}/{slides.length}
          </span>
          <button type="button" className="story__close" onClick={onClose} aria-label={L.close}>
            ×
          </button>
        </div>

        <div className="story__body" key={index} aria-live="polite">
          {slides[index]}
        </div>
      </div>
    </div>
  );
}
