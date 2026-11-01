/**
 * GitHubProjects Component
 * Fetches and displays GitHub repositories for ymcbzrgn
 * Classic OS-style interface with modern card grid
 * Features: Cache fallback, 403 error handling, cooldown mechanism
 */

import { lazy, Suspense, useState, useEffect } from 'react';
import { useStore } from '../../os/store';
import { useT } from '../../os/i18n/full';
import { useIsMobile } from '../../os/hooks/useDeviceType';
import { useRoomStore } from '../../ui/rooms/roomStore';
import RepoCard from './RepoCard';
import '../../ui/rooms/roomToggle.css';
import './GitHubProjects.css';

// The workshop room (the pixel twin living in this window) is loaded only when somebody asks for it
const ProjectsRoom = lazy(() => import('../../ui/rooms/ProjectsRoom'));

interface Repo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  topics: string[];
  fork: boolean;
  owner: {
    login: string;
  };
  default_branch: string;
  languages?: Record<string, number>; // Language usage in bytes (fetched separately)
}

interface CachedRepoData {
  repos: Repo[];
  timestamp: number;
}

interface ErrorState {
  message: string;
  isStale: boolean; // True if showing cached data
  cooldownUntil?: number; // Timestamp when cooldown expires
}

interface GitHubProjectsProps {
  windowId: string;
  nodeId?: string;
}

// Cache configuration
const CACHE_KEY = 'github-repos-cache';
const LAST_FETCH_KEY = 'github-last-fetch';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const COOLDOWN_MS = 1000 * 60 * 60; // 1 hour

/**
 * Format timestamp to human-readable relative time
 * Examples: "just now", "5m ago", "2h ago", "3d ago"
 */
function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Format cooldown remaining time
 * Examples: "5m", "1h 15m"
 */
function formatCooldown(until: number): string {
  const remaining = Math.max(0, until - Date.now());
  const totalMinutes = Math.ceil(remaining / 60000);

  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Save repos to localStorage cache
 */
function saveToCache(repos: Repo[]): void {
  try {
    const cacheData: CachedRepoData = {
      repos,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (err) {
    console.warn('[GitHubProjects] Failed to save cache:', err);
  }
}

/**
 * Load repos from localStorage cache
 */
function getFromCache(): CachedRepoData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (err) {
    console.warn('[GitHubProjects] Failed to load cache:', err);
    return null;
  }
}

export default function GitHubProjects({ windowId }: GitHubProjectsProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const t = useT();
  const isMobile = useIsMobile();
  const roomOn = useRoomStore((state) => state.windowId === windowId);
  const assistantHidden = useStore((state) => state.settings.assistantHidden);

  useEffect(() => {
    fetchRepos();
  }, []);

  /**
   * Fetch languages for a single repository
   * Returns null on rate limit (429) or error for graceful fallback
   */
  const fetchRepoLanguages = async (
    owner: string,
    repoName: string
  ): Promise<Record<string, number> | null> => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/languages`
      );

      if (res.status === 429) {
        console.warn('[Languages] Rate limit hit, falling back to primary language');
        return null; // Graceful fallback
      }

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error(`[Languages] Fetch failed for ${repoName}:`, err);
    }
    return null;
  };

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);

    const cached = getFromCache();
    const lastFetchStr = localStorage.getItem(LAST_FETCH_KEY);
    const lastFetch = lastFetchStr ? parseInt(lastFetchStr) : 0;

    // Cooldown check: If fetched recently and cache exists, show cached data
    const timeSinceLastFetch = Date.now() - lastFetch;
    if (timeSinceLastFetch < COOLDOWN_MS && cached) {
      console.log('[GitHubProjects] Cooldown active, using cache');
      setRepos(cached.repos);
      setError({
        message: `Using cached data from ${formatDate(cached.timestamp)}. Refresh available in ${formatCooldown(lastFetch + COOLDOWN_MS)}.`,
        isStale: true,
        cooldownUntil: lastFetch + COOLDOWN_MS,
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        'https://api.github.com/users/ymcbzrgn/repos?per_page=100&sort=updated'
      );

      if (!res.ok) {
        // Handle 403 Forbidden (API access restricted)
        if (res.status === 403) {
          console.warn('[GitHubProjects] 403 Forbidden - using cache fallback');
          if (cached) {
            setRepos(cached.repos);
            setError({
              message: `GitHub API access restricted. Showing cached data from ${formatDate(cached.timestamp)}.`,
              isStale: true,
              cooldownUntil: Date.now() + COOLDOWN_MS,
            });
            localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
            setLoading(false);
            return;
          } else {
            throw new Error('GitHub API access restricted. No cached data available.');
          }
        }

        // Handle 429 Rate Limit
        if (res.status === 429) {
          console.warn('[GitHubProjects] 429 Rate limit - using cache fallback');
          if (cached) {
            setRepos(cached.repos);
            setError({
              message: `Rate limit exceeded. Showing cached data from ${formatDate(cached.timestamp)}.`,
              isStale: true,
              cooldownUntil: Date.now() + COOLDOWN_MS,
            });
            localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
            setLoading(false);
            return;
          } else {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
        }

        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }

      const data: Repo[] = await res.json();

      // Sort by updated date (NO fork filtering - we show forks now!)
      const sorted = data.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      // Batch fetch languages for all repos
      console.log('[GitHubProjects] Fetching languages for', sorted.length, 'repos...');
      const reposWithLanguages = await Promise.all(
        sorted.map(async (repo) => {
          const languages = await fetchRepoLanguages(repo.owner.login, repo.name);
          return { ...repo, languages: languages ?? undefined }; // Convert null to undefined for type safety
        })
      );

      // Save to cache and update last fetch time
      saveToCache(reposWithLanguages);
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());

      setRepos(reposWithLanguages);
      setError(null); // Clear any previous errors
      console.log('[GitHubProjects] Repos loaded with languages');
    } catch (err) {
      // Network error or other fetch failure - use cache if available
      console.error('[GitHubProjects] Fetch error:', err);
      if (cached) {
        setRepos(cached.repos);
        setError({
          message: `Network error. Showing cached data from ${formatDate(cached.timestamp)}.`,
          isStale: true,
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Unknown error occurred',
          isStale: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter repos based on search query
  const filteredRepos = repos.filter((repo) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();

    // Check primary language
    const matchesPrimaryLang = repo.language?.toLowerCase().includes(query);

    // Check all languages from detailed language data
    const matchesAnyLang = repo.languages
      ? Object.keys(repo.languages).some((lang) => lang.toLowerCase().includes(query))
      : false;

    return (
      repo.name.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      repo.topics?.some((t) => t.toLowerCase().includes(query)) ||
      matchesPrimaryLang ||
      matchesAnyLang
    );
  });

  return (
    <div className="github-projects">
      {/* Toolbar */}
      <div className="github-projects__toolbar">
        <div className="github-projects__toolbar-title">
          <span className="github-projects__toolbar-icon">💻</span>
          <span>GitHub Projects</span>
        </div>
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="github-projects__search"
        />
        {!isMobile && !assistantHidden && (
          <button
            type="button"
            className="room-toggle"
            aria-pressed={roomOn}
            title={t('roomToggle')}
            onClick={() => (roomOn ? useRoomStore.getState().leave() : useRoomStore.getState().enter(windowId))}
          >
            🏠
          </button>
        )}
      </div>

      {roomOn && !isMobile && (
        <Suspense fallback={null}>
          <ProjectsRoom windowId={windowId} repos={filteredRepos} />
        </Suspense>
      )}

      {/* Content Area */}
      <div className="github-projects__content">
        {/* Warning Banner (stale cache) */}
        {!loading && error?.isStale && repos.length > 0 && (
          <div className="github-projects__warning-banner">
            <span className="github-projects__warning-icon">⚠️</span>
            <span className="github-projects__warning-text">{error.message}</span>
            {error.cooldownUntil && (
              <button
                className="github-projects__refresh-btn"
                onClick={fetchRepos}
                disabled={Date.now() < error.cooldownUntil}
                title={
                  Date.now() < error.cooldownUntil
                    ? `Cooldown active. Try again in ${formatCooldown(error.cooldownUntil)}`
                    : 'Refresh now'
                }
              >
                Refresh{' '}
                {Date.now() < error.cooldownUntil && `(${formatCooldown(error.cooldownUntil)})`}
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="github-projects__state">
            <div className="github-projects__spinner" />
            <p className="github-projects__state-text">Loading projects...</p>
          </div>
        )}

        {/* Error State (only when NO cache available) */}
        {!loading && error && !error.isStale && (
          <div className="github-projects__state">
            <div className="github-projects__error-icon">⚠️</div>
            <p className="github-projects__state-text github-projects__state-text--error">
              {error.message}
            </p>
            <button onClick={fetchRepos} className="github-projects__retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRepos.length === 0 && (
          <div className="github-projects__state">
            <div className="github-projects__empty-icon">📂</div>
            <p className="github-projects__state-text">
              {searchQuery
                ? `No projects found matching "${searchQuery}"`
                : 'No projects found'}
            </p>
          </div>
        )}

        {/* Repo Grid (show even with stale error) */}
        {!loading && filteredRepos.length > 0 && (
          <div className="github-projects__grid">
            {filteredRepos.map((repo, i) => (
              <RepoCard key={repo.id} repo={repo} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Status Bar (show even with stale error) */}
      {!loading && filteredRepos.length > 0 && (
        <div className="github-projects__statusbar">
          <span className="github-projects__statusbar-text">
            {filteredRepos.length} {filteredRepos.length === 1 ? 'project' : 'projects'}
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
        </div>
      )}
    </div>
  );
}
