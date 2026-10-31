/**
 * SimpleView – a plain one-page version of the portfolio (summary, CV, projects, contact)
 * for visitors who don't want to explore a desktop. Reachable at /#simple.
 */
import { lazy, Suspense, useState } from 'react';
import { toggleLang, useLang, useT } from '../../os/i18n/full';
import { openDesktopView } from '../../os/view';
import { PROFILE } from '../../os/content/profile';
import { PROFILE_TEXT } from '../../os/content/profileText';
import bustUrl from '../../assets/sprites/mascot-bust.png';
import './SimpleView.css';

// The embedded project list is the same app used in the desktop window (with its GitHub cache).
const GitHubProjects = lazy(() => import('../../apps/github-projects/GitHubProjects'));

export default function SimpleView() {
  const t = useT();
  const lang = useLang();
  const text = PROFILE_TEXT[lang];
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is visible and selectable anyway */
    }
  };

  return (
    <div className="simple">
      <header className="simple__bar">
        <span className="simple__brand">{PROFILE.name}</span>
        <div className="simple__bar-actions">
          <button type="button" className="simple__pill" onClick={toggleLang} aria-label={t('langSwitchLabel')} title={t('langSwitchLabel')}>
            {t('langOther')}
          </button>
          <button type="button" className="simple__btn simple__btn--ghost" onClick={openDesktopView}>
            {t('simpleBack')} →
          </button>
        </div>
      </header>

      <main className="simple__main">
        <section className="simple__hero">
          <img className="simple__avatar" src={bustUrl} width={96} height={96} alt="" />
          <div>
            <h1 className="simple__name">{PROFILE.name}</h1>
            <p className="simple__role">
              {t('role')} · {t('tagline')}
            </p>
            <p className="simple__chip">{t('currentRole')}</p>
          </div>
        </section>

        <p className="simple__summary">{text.summary}</p>

        <div className="simple__cta">
          <a className="simple__btn simple__btn--primary" href={PROFILE.cvUrl} download>
            {t('downloadCv')}
          </a>
          <a className="simple__btn simple__btn--soft" href={PROFILE.cvUrl} target="_blank" rel="noopener noreferrer">
            {t('viewCv')}
          </a>
          <a className="simple__btn simple__btn--soft" href={`mailto:${PROFILE.email}`}>
            {t('emailMe')}
          </a>
          <a className="simple__btn simple__btn--ghost" href={PROFILE.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a className="simple__btn simple__btn--ghost" href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </div>

        <section className="simple__section">
          <h2>{t('secFocus')}</h2>
          <ul className="simple__list">
            {text.focus.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="simple__section">
          <h2>{t('secWork')}</h2>
          <div className="simple__cards">
            {text.work.map((item) => (
              <article key={item.title} className="simple__card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="simple__section">
          <h2>{t('secStyle')}</h2>
          <p>{text.style}</p>
        </section>

        <section className="simple__section">
          <h2>{t('secProjects')}</h2>
          <div className="simple__projects">
            <Suspense fallback={null}>
              <GitHubProjects windowId="simple-view" />
            </Suspense>
          </div>
        </section>

        <section className="simple__section" id="contact">
          <h2>{t('secContact')}</h2>
          <ul className="simple__contact">
            <li>
              <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
              <button type="button" className="simple__copy" onClick={copyEmail}>
                {copied ? t('copied') : t('copy')}
              </button>
            </li>
            <li>
              <a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer">
                linkedin.com/in/yamacbezirgan
              </a>
            </li>
            <li>
              <a href={PROFILE.github} target="_blank" rel="noopener noreferrer">
                github.com/ymcbzrgn
              </a>
            </li>
          </ul>
        </section>
      </main>

      <footer className="simple__footer">
        <button type="button" className="simple__link" onClick={openDesktopView}>
          {t('simpleBack')}
        </button>
        <a href="/privacy">Privacy</a>
      </footer>
    </div>
  );
}
