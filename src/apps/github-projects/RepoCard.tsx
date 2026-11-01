/**
 * RepoCard Component
 * Single repository card with preview image and metadata
 * 3-stage image fallback: GitHub raw → local → /legacy/LOGO.png
 * Shows all languages sorted by usage + fork badge
 */

import { useState, useEffect, useMemo, type CSSProperties } from 'react';

interface RepoCardProps {
  /** position in the grid: cards pop in one after another */
  index?: number;
  repo: {
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    stargazers_count: number;
    language: string | null;
    topics: string[];
    fork: boolean;
    languages?: Record<string, number>; // Language usage in bytes
    owner: {
      login: string;
    };
    default_branch: string;
  };
}

export default function RepoCard({ repo, index = 0 }: RepoCardProps) {
  const [previewImage, setPreviewImage] = useState<string>('/legacy/LOGO.png');
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    findPreviewImage();
  }, [repo.name]);

  /**
   * Sort languages by usage (bytes, descending) and take top 5
   * Falls back to primary language if languages API data not available
   */
  const sortedLanguages = useMemo(() => {
    if (repo.languages && Object.keys(repo.languages).length > 0) {
      return Object.entries(repo.languages)
        .sort(([, a], [, b]) => b - a) // Sort by bytes (descending)
        .map(([lang]) => lang)
        .slice(0, 5); // Top 5 languages
    }
    // Fallback to primary language
    return repo.language ? [repo.language] : [];
  }, [repo.languages, repo.language]);

  /**
   * 3-stage image fallback strategy
   * 1. Try GitHub raw: portfolioWebsiteImage{ext}
   * 2. Try local public: /projects/{repo}.{ext}
   * 3. Fallback: /legacy/LOGO.png
   */
  const findPreviewImage = async () => {
    setImageLoading(true);

    // Stage 1: GitHub raw
    const extensions = ['', '.png', '.jpg', '.jpeg', '.webp'];
    const owner = repo.owner.login;
    const branch = repo.default_branch || 'main';
    const repoName = encodeURIComponent(repo.name);

    for (const ext of extensions) {
      const githubUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/portfolioWebsiteImage${ext}`;
      const isValid = await checkImage(githubUrl);
      if (isValid) {
        setPreviewImage(githubUrl);
        setImageLoading(false);
        return;
      }
    }

    // Stage 2: Local public folder
    const localExtensions = ['.png', '.jpg'];
    for (const ext of localExtensions) {
      const localUrl = `/projects/${repo.name}${ext}`;
      const isValid = await checkImage(localUrl);
      if (isValid) {
        setPreviewImage(localUrl);
        setImageLoading(false);
        return;
      }
    }

    // Stage 3: Fallback to /legacy/LOGO.png (already set as initial state)
    setImageLoading(false);
  };

  /**
   * Check if image URL is valid by attempting to load it
   */
  const checkImage = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  return (
    <a
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="repo-card"
      data-repo={repo.name}
      style={{ '--i': index } as CSSProperties}
      title={`${repo.name} - View on GitHub`}
    >
      {/* Preview Image */}
      <div className="repo-card__image">
        <img
          src={previewImage}
          alt={`${repo.name} preview`}
          className={imageLoading ? 'repo-card__image-loading' : ''}
        />
      </div>

      {/* Content */}
      <div className="repo-card__content">
        {/* Header: Title + Fork Badge */}
        <div className="repo-card__header">
          <h3 className="repo-card__title">{repo.name}</h3>
          {repo.fork && (
            <span className="repo-card__fork-badge" title="This is a forked repository">
              🔱 Forked
            </span>
          )}
        </div>

        <p className="repo-card__description">
          {repo.description || 'No description available'}
        </p>

        {/* Languages (sorted by usage, top 5) */}
        {sortedLanguages.length > 0 && (
          <div className="repo-card__languages">
            {sortedLanguages.map((lang) => (
              <span key={lang} className="repo-card__language" title={lang}>
                {lang}
              </span>
            ))}
          </div>
        )}

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="repo-card__topics">
            {repo.topics.slice(0, 3).map((topic) => (
              <span key={topic} className="repo-card__topic" title={topic}>
                {topic}
              </span>
            ))}
            {repo.topics.length > 3 && (
              <span className="repo-card__topic repo-card__topic--more">
                +{repo.topics.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}
