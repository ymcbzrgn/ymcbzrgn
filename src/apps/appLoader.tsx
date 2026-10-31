/**
 * App Loader - Lazy loading system for apps
 * Ubuntu×XP Desktop Portfolio
 */

import { lazy, memo, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { AppRegistry } from './types';

/**
 * App registry - Maps app IDs to lazy component loaders
 * Apps are code-split automatically by Vite
 */
const appRegistry: AppRegistry = {
  'pdf-viewer': () => import('./pdf-viewer/PdfViewer'),
  'image-viewer': () => import('./image-viewer/ImageViewer'),
  'browser': () => import('./browser/Browser'),
  'file-explorer': () => import('./file-explorer/FileExplorer'),
  'text-viewer': () => import('./text-viewer/TextViewer'),
  'markdown-viewer': () => import('./markdown-viewer/MarkdownViewer'),
  'github-projects': () => import('./github-projects/GitHubProjects'),
  'properties-modal': () => import('./properties-modal/PropertiesModal'),
  'folder-placeholder': () => import('./placeholder/FolderPlaceholder'), // Deprecated, use file-explorer
  // Games (Phase 4)
  'snake-game': () => import('./games/Snake'),
  'tetris-game': () => import('./games/Tetris'),
  '2048-game': () => import('./games/Game2048'),
  'minesweeper-game': () => import('./games/Minesweeper'),
  // Utility Apps (Phase 5)
  'settings-app': () => import('./settings/Settings'),
  'calculator-app': () => import('./calculator/Calculator'),
  'notes-app': () => import('./notes/Notes'),
  'calendar-app': () => import('./calendar/Calendar'),
  'terminal-app': () => import('./terminal/Terminal'),
  'music-player-app': () => import('./music-player/MusicPlayer'),
  'photo-gallery-app': () => import('./photo-gallery/PhotoGallery'),
};

/**
 * One lazy component per app, created once.
 *
 * lazy() must not be called during render: a new lazy component is a new component
 * type, so every re-render of the parent window (drag, resize, focus) would suspend
 * again and paint the skeleton in place of the running app.
 */
const lazyApps = new Map<string, LazyExoticComponent<ComponentType<Record<string, unknown>>>>();

function getLazyApp(appId: string) {
  let App = lazyApps.get(appId);
  if (!App && Object.prototype.hasOwnProperty.call(appRegistry, appId)) {
    App = lazy(appRegistry[appId]);
    lazyApps.set(appId, App);
  }
  return App;
}

/**
 * Loading skeleton with animated bones
 */
function AppSkeleton() {
  return (
    <div className="app-skeleton">
      <div className="app-skeleton__header" />
      <div className="app-skeleton__content">
        <div className="app-skeleton__line app-skeleton__line--long" />
        <div className="app-skeleton__line app-skeleton__line--medium" />
        <div className="app-skeleton__line app-skeleton__line--short" />
        <div className="app-skeleton__line app-skeleton__line--medium" />
      </div>
      <style>{`
        .app-skeleton {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .app-skeleton__header {
          height: 40px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite;
          border-radius: 4px;
        }

        .app-skeleton__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .app-skeleton__line {
          height: 16px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite;
          border-radius: 4px;
        }

        .app-skeleton__line--long {
          width: 90%;
        }

        .app-skeleton__line--medium {
          width: 70%;
        }

        .app-skeleton__line--short {
          width: 50%;
        }

        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Error display for unknown or failed apps
 */
function AppError({ appId, error }: { appId: string; error?: string }) {
  return (
    <div className="app-error">
      <div className="app-error__icon">⚠️</div>
      <h3 className="app-error__title">App Error</h3>
      <p className="app-error__message">
        {error || `App not found: ${appId}`}
      </p>
      <p className="app-error__hint">
        Please try refreshing the page or contact support.
      </p>
      <style>{`
        .app-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 24px;
          text-align: center;
          color: var(--color-text-secondary, #666);
        }

        .app-error__icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .app-error__title {
          font-size: 20px;
          font-weight: 600;
          color: var(--color-text, #333);
          margin: 0 0 8px 0;
        }

        .app-error__message {
          font-size: 14px;
          margin: 0 0 8px 0;
        }

        .app-error__hint {
          font-size: 12px;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

/**
 * App Loader Props
 */
interface AppLoaderProps {
  appId: string;
  [key: string]: any; // Forward all props to the app
}

/**
 * App Loader Component
 * Lazy loads apps and shows skeleton while loading
 *
 * Memoized so a window that re-renders only because its bounds or focus changed
 * does not re-render the app inside it.
 */
function AppLoader({ appId, ...props }: AppLoaderProps) {
  const AppComponent = getLazyApp(appId);

  // App not found in registry
  if (!AppComponent) {
    console.error('[AppLoader] App not found in registry', {
      appId,
      availableApps: Object.keys(appRegistry),
    });
    return <AppError appId={appId} />;
  }

  return (
    <Suspense fallback={<AppSkeleton />}>
      <AppComponent {...props} />
    </Suspense>
  );
}

export default memo(AppLoader);
