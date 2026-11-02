/**
 * "How this site is built": the engineering behind the portfolio, with numbers that are measured
 * rather than claimed: this build's first-screen weight (dist/data/build-info.json), what this very
 * visit has downloaded so far, the live status of the CI run on `main`, and the latest commits.
 */
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../os/store';
import { useLang, useT, type Lang } from '../../os/i18n/full';
import './AboutSite.css';

const REPO = 'ymcbzrgn/ymcbzrgn';
const CI_URL = `https://api.github.com/repos/${REPO}/actions/runs?branch=main&per_page=1`;
const CI_CACHE = 'yb-ci';

interface BuildInfo {
  built: string;
  commit: string;
  firstScreenKB: number;
  scripts: number;
  suites: number;
}
interface Ci {
  state: 'loading' | 'unavailable' | 'ok';
  passing?: boolean;
  running?: boolean;
  message?: string;
  sha?: string;
  url?: string;
  at?: string;
}

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    lead: 'A desktop operating system in the browser: React, TypeScript and Vite, no backend. The numbers come from the build, from GitHub and from your own visit.',
    first: 'first screen (gzip)',
    scripts: 'scripts, most load on demand',
    suites: 'browser test suites',
    visit: 'downloaded by this visit so far',
    ci: 'The build on main',
    passing: 'passing',
    failing: 'failing',
    running: 'running',
    ciGone: 'Status unavailable right now.',
    ciOpen: 'See the runs on GitHub',
    commits: 'Latest commits',
    how: 'How it is checked',
    source: 'Source code',
    docs: 'Development notes',
    built: 'This build',
    p1: 'Only the first screen loads up front. The terminal, the music player, the pixel twin and this window load when you open them.',
    p2: 'A size budget fails the build when the first screen gets heavier. Type check, lint, SEO checks and browser tests run on every push.',
    p3: 'The Web Audio API synthesises the sound, so there are no audio files. Files and folders live in IndexedDB, in your browser.',
    p4: 'The resume pages are plain HTML generated at build time, so search engines and AI assistants can read them without running any script.',
  },
  tr: {
    lead: 'Tarayıcıda bir masaüstü işletim sistemi: React, TypeScript ve Vite, backend yok. Sayılar derlemeden, GitHub’dan ve senin bu ziyaretinden geliyor.',
    first: 'ilk ekran (gzip)',
    scripts: 'script, çoğu istenince yüklenir',
    suites: 'tarayıcı test paketi',
    visit: 'bu ziyarette şimdiye kadar inen',
    ci: "main'deki derleme",
    passing: 'geçiyor',
    failing: 'başarısız',
    running: 'çalışıyor',
    ciGone: 'Durum şu an alınamıyor.',
    ciOpen: "GitHub'da çalışmalara bak",
    commits: 'Son commit’ler',
    how: 'Nasıl denetleniyor',
    source: 'Kaynak kodu',
    docs: 'Geliştirme notları',
    built: 'Bu derleme',
    p1: 'Açılışta yalnızca ilk ekran yüklenir. Terminal, müzik çalar, piksel ikiz ve bu pencere sen açınca yüklenir.',
    p2: 'İlk ekran ağırlaşırsa bir boyut bütçesi derlemeyi düşürür. Tip denetimi, lint, SEO denetimleri ve tarayıcı testleri her push’ta çalışır.',
    p3: 'Sesi Web Audio API sentezliyor, ses dosyası yok. Dosya ve klasörler tarayıcındaki IndexedDB’de durur.',
    p4: 'Özgeçmiş sayfaları derleme sırasında üretilen düz HTML; arama motorları ve yapay zekâ asistanları hiçbir script çalıştırmadan okuyabilir.',
  },
};

/** What this very visit has transferred so far (cached files count as nothing). */
function measureVisit(): { kb: number; requests: number } | null {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const bytes = res.reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0) + (nav ? nav.transferSize || nav.encodedBodySize || 0 : 0);
    return bytes > 0 ? { kb: Math.round(bytes / 1024), requests: res.length + 1 } : null;
  } catch {
    return null;
  }
}

function readCache(): { at: number; ci: Ci } | null {
  try {
    const c = JSON.parse(localStorage.getItem(CI_CACHE) || 'null') as { at: number; ci: Ci } | null;
    return c && Date.now() - c.at < 10 * 60 * 1000 ? c : null;
  } catch {
    return null;
  }
}

async function loadCi(): Promise<Ci> {
  const cached = readCache();
  if (cached) return cached.ci;
  try {
    const res = await fetch(CI_URL, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return { state: 'unavailable' };
    const data = (await res.json()) as { workflow_runs?: Array<{ status: string; conclusion: string | null; html_url: string; head_sha: string; updated_at: string; head_commit?: { message?: string } }> };
    const run = data.workflow_runs?.[0];
    if (!run) return { state: 'unavailable' };
    const ci: Ci = {
      state: 'ok',
      running: run.status !== 'completed',
      passing: run.conclusion === 'success',
      message: (run.head_commit?.message || '').split('\n')[0],
      sha: run.head_sha.slice(0, 7),
      url: run.html_url,
      at: run.updated_at,
    };
    try {
      localStorage.setItem(CI_CACHE, JSON.stringify({ at: Date.now(), ci }));
    } catch {
      /* private mode: no cache */
    }
    return ci;
  } catch {
    return { state: 'unavailable' };
  }
}

function ago(iso: string, lang: Lang): string {
  const secs = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]];
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  for (const [unit, size] of units) if (Math.abs(secs) >= size) return rtf.format(Math.round(secs / size), unit);
  return rtf.format(0, 'second');
}

interface Props {
  windowId?: string;
}

export default function AboutSite({ windowId = 'about-site' }: Props) {
  const t = useT();
  const lang = useLang();
  const L = TEXT[lang];
  const updateWindowTitle = useStore((s) => s.updateWindowTitle);
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [ci, setCi] = useState<Ci>({ state: 'loading' });
  const visit = useMemo(measureVisit, []);

  useEffect(() => {
    updateWindowTitle(windowId, t('aboutSiteTitle'));
  }, [t, windowId, updateWindowTitle]);

  useEffect(() => {
    let alive = true;
    fetch('/data/build-info.json')
      .then((r) => (r.ok ? (r.json() as Promise<BuildInfo>) : null))
      .then((d) => alive && d && typeof d.firstScreenKB === 'number' && setInfo(d))
      .catch(() => undefined);
    void loadCi().then((c) => alive && setCi(c));
    return () => {
      alive = false;
    };
  }, []);

  const commits = typeof __GIT_LOG__ !== 'undefined' ? __GIT_LOG__.slice(0, 7) : [];

  return (
    <div className="about-site">
      <p className="about-site__lead">{L.lead}</p>

      <section className="about-site__tiles">
        {info && (
          <>
            <div>
              <strong>{info.firstScreenKB} KB</strong>
              <span>{L.first}</span>
            </div>
            <div>
              <strong>{info.scripts}</strong>
              <span>{L.scripts}</span>
            </div>
            <div>
              <strong>{info.suites}</strong>
              <span>{L.suites}</span>
            </div>
          </>
        )}
        {visit && (
          <div>
            <strong>{visit.kb} KB</strong>
            <span>
              {L.visit} ({visit.requests})
            </span>
          </div>
        )}
      </section>

      <section className="about-site__ci" aria-live="polite">
        <h2>{L.ci}</h2>
        {ci.state === 'loading' && <p>…</p>}
        {ci.state === 'unavailable' && (
          <p>
            {L.ciGone}{' '}
            <a href={`https://github.com/${REPO}/actions`} target="_blank" rel="noopener noreferrer">
              {L.ciOpen}
            </a>
          </p>
        )}
        {ci.state === 'ok' && (
          <p>
            <b className={ci.running ? 'is-running' : ci.passing ? 'is-passing' : 'is-failing'}>
              {ci.running ? `⏳ ${L.running}` : ci.passing ? `✅ ${L.passing}` : `❌ ${L.failing}`}
            </b>{' '}
            · <a href={ci.url} target="_blank" rel="noopener noreferrer">{ci.message || ci.sha}</a>
            {ci.at ? ` · ${ago(ci.at, lang)}` : ''}
          </p>
        )}
      </section>

      <section>
        <h2>{L.how}</h2>
        <ul className="about-site__list">
          <li>{L.p1}</li>
          <li>{L.p2}</li>
          <li>{L.p3}</li>
          <li>{L.p4}</li>
        </ul>
      </section>

      {commits.length > 0 && (
        <section>
          <h2>{L.commits}</h2>
          <ul className="about-site__commits">
            {commits.map(([hash, , date, subject]) => (
              <li key={hash}>
                <a href={`https://github.com/${REPO}/commit/${hash}`} target="_blank" rel="noopener noreferrer">
                  {hash}
                </a>
                <span>{subject}</span>
                <time>{date}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="about-site__foot">
        <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer">
          {L.source}
        </a>
        <a href={`https://github.com/${REPO}/blob/main/docs/DEVELOPMENT.md`} target="_blank" rel="noopener noreferrer">
          {L.docs}
        </a>
        {info && (
          <span>
            {L.built}: {info.built}
            {info.commit ? ` · ${info.commit}` : ''}
          </span>
        )}
      </footer>
    </div>
  );
}
