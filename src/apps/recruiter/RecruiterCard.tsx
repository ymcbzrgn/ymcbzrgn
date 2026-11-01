/**
 * RecruiterCard ("At a glance"): the whole profile on one screen for someone who has ten seconds.
 * Facts come from src/os/content/career.ts (the same source as the static resume and the JSON-LD).
 * Reachable from the welcome window, the palette, the terminal (`glance`, `sudo hire-me`) and the twin.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../../os/store';
import { useLang, useT } from '../../os/i18n/full';
import { PROFILE } from '../../os/content/profile';
import { HIGHLIGHTS, ROLES, SKILLS, SPOKEN } from '../../os/content/career';
import { guest } from '../../os/personal';
import { useLaunch } from '../../os/hooks/useLaunch';
import { openSimpleView } from '../../os/view';
import bustUrl from '../../assets/sprites/mascot-bust.png';
import { SPRITE_BUST } from '../../assets/sprites/mascot.meta';
import { downloadVCard } from './vcard';
import './RecruiterCard.css';

interface Props {
  windowId?: string;
}

const LABEL = {
  en: { forYou: 'Prepared for', stack: 'Stack', facts: 'The short version', cv: 'Download CV', save: 'Save contact', saved: 'Saved', copy: 'Copy email', copied: 'Copied!', page: 'Resume page', career: 'Career timeline', medals: "Ideathon'25 · Llama Hackathon", edu: 'Computer Eng. · Erasmus+ Milan', since: 'Jun 2025 →', degree: 'B.Sc. 2025', langs: 'languages', rank: ['2nd', '6th'] },
  tr: { forYou: 'Şunun için hazırlandı:', stack: 'Teknolojiler', facts: 'Kısaca', cv: "CV'yi indir", save: 'Rehbere kaydet', saved: 'Kaydedildi', copy: 'E-postayı kopyala', copied: 'Kopyalandı!', page: 'Özgeçmiş sayfası', career: 'Kariyer zaman çizelgesi', medals: "Ideathon'25 · Llama Hackathon", edu: 'Bilgisayar Müh. · Erasmus+ Milano', since: 'Haz 2025 →', degree: 'Lisans 2025', langs: 'dil', rank: ['2.', '6.'] },
} as const;

export default function RecruiterCard({ windowId }: Props) {
  const t = useT();
  const lang = useLang();
  const L = LABEL[lang];
  const updateWindowTitle = useStore((s) => s.updateWindowTitle);
  const launch = useLaunch();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (windowId) updateWindowTitle(windowId, t('glanceTitle'));
  }, [t, windowId, updateWindowTitle]);

  const now = ROLES[0];
  const tiles = [
    { icon: '🏢', value: L.since, label: `${now.title[lang]}, ${now.org}` },
    { icon: '🎓', value: L.degree, label: L.edu },
    { icon: '🏆', value: `${L.rank[0]} · ${L.rank[1]}`, label: L.medals },
    { icon: '🌍', value: `${SPOKEN.length} ${L.langs}`, label: SPOKEN.map((s) => s.code.toUpperCase()).join(' · ') },
  ];

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is on screen and selectable anyway */
    }
  };

  const save = () => {
    downloadVCard(lang);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="glance">
      <header className="glance__head">
        <img className="glance__avatar" src={bustUrl} width={SPRITE_BUST * 3} height={SPRITE_BUST * 3} alt="" />
        <div className="glance__who">
          <h1>{PROFILE.name}</h1>
          <p className="glance__role">
            {t('role')} · {t('tagline')}
          </p>
          <p className="glance__chip">{t('currentRole')}</p>
        </div>
      </header>
      {guest && (
        <p className="glance__for">
          {L.forYou} <strong>{guest}</strong>
        </p>
      )}

      <div className="glance__actions">
        <a className="glance__btn glance__btn--primary" href={PROFILE.cvUrl} download>
          {L.cv}
        </a>
        <button type="button" className="glance__btn glance__btn--soft" onClick={save}>
          {saved ? `✓ ${L.saved}` : `📇 ${L.save}`}
        </button>
        <button type="button" className="glance__btn glance__btn--soft" onClick={copyEmail}>
          {copied ? L.copied : `✉️ ${L.copy}`}
        </button>
        <a className="glance__btn glance__btn--ghost" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        <a className="glance__btn glance__btn--ghost" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <button type="button" className="glance__btn glance__btn--ghost" onClick={() => launch('career')}>
          🗺️ {L.career}
        </button>
        <button type="button" className="glance__btn glance__btn--ghost" onClick={openSimpleView}>
          {L.page}
        </button>
      </div>

      <section className="glance__tiles" aria-label={L.facts}>
        {tiles.map((tile) => (
          <div key={tile.icon} className="glance__tile">
            <span className="glance__tile-icon" aria-hidden="true">
              {tile.icon}
            </span>
            <strong>{tile.value}</strong>
            <span>{tile.label}</span>
          </div>
        ))}
      </section>

      <section className="glance__sec">
        <h2>{L.stack}</h2>
        <ul className="glance__chips">
          {SKILLS.flatMap((g) => g.items).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="glance__sec">
        <h2>{L.facts}</h2>
        <ul className="glance__list">
          {HIGHLIGHTS.map((h) => (
            <li key={h.icon}>
              <span aria-hidden="true">{h.icon}</span>
              <div>
                <strong>{h.title[lang]}</strong>
                <p>{h.text[lang]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

    </div>
  );
}
