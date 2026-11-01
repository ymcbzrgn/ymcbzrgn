/**
 * Launch well-known apps from anywhere (welcome window, widget, assistant, taskbar, terminal).
 *
 * - Platform-aware: delegates to useAppOpener (desktop window or mobile full-screen app).
 * - Singleton: launching an app that is already open focuses (and restores) it instead of
 *   stacking another copy.
 */
import { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import { getLang } from '../i18n';
import { PROFILE } from '../content/profile';
import { getInitialBounds } from '../utils/windowBounds';
import { useAppOpener } from './useAppOpener';

export type LaunchTarget = 'welcome' | 'cv' | 'projects' | 'terminal' | 'settings' | 'achievements' | 'recruiter' | 'career' | 'aboutsite';

interface LaunchSpec {
  appId: string;
  title: string;
  icon: string;
  meta?: Record<string, unknown>;
  singleton: boolean;
  /** VFS node behind the app, if any. The mobile shell opens apps by node. */
  nodeId?: string;
}

function specFor(target: LaunchTarget): LaunchSpec {
  const tr = getLang() === 'tr';
  switch (target) {
    case 'welcome':
      return { appId: 'welcome-app', title: tr ? 'Hoş geldin' : 'Welcome', icon: '👋', singleton: true };
    case 'cv':
      return { appId: 'pdf-viewer', title: 'CV.pdf', icon: 'file-pdf', meta: { fileUrl: PROFILE.cvUrl }, singleton: true, nodeId: 'cv-pdf' };
    case 'projects':
      return { appId: 'github-projects', title: tr ? 'Projeler' : 'Projects', icon: 'folder-code', singleton: true, nodeId: 'projects' };
    case 'terminal':
      return { appId: 'terminal-app', title: 'Terminal', icon: '🖥️', singleton: false };
    case 'settings':
      return { appId: 'settings-app', title: tr ? 'Ayarlar' : 'Settings', icon: '⚙️', singleton: true };
    case 'achievements':
      return { appId: 'achievements-app', title: tr ? 'Başarımlar' : 'Achievements', icon: '🏆', singleton: true };
    case 'recruiter':
      return { appId: 'recruiter-app', title: tr ? 'Tek bakışta' : 'At a glance', icon: '🧾', singleton: true };
    case 'career':
      return { appId: 'career-app', title: tr ? 'Kariyer' : 'Career', icon: '🗺️', singleton: true };
    case 'aboutsite':
      return { appId: 'about-site-app', title: tr ? 'Bu site nasıl yapıldı' : 'How this site is built', icon: '🛠️', singleton: true };
  }
}

export function useLaunch() {
  const openApp = useAppOpener();
  // useAppOpener returns a new function on every render; keep the latest one in a ref so the
  // callback below stays stable and can safely be used in effects.
  const openRef = useRef(openApp);
  openRef.current = openApp;

  return useCallback((target: LaunchTarget) => {
    const spec = specFor(target);
    const state = useStore.getState();

    if (spec.singleton) {
      const existing = state.windows.find(
        (w) => w.appId === spec.appId && (!spec.meta?.fileUrl || w.meta?.fileUrl === spec.meta.fileUrl)
      );
      if (existing) {
        if (existing.state === 'minimized') state.restoreWindow(existing.id);
        state.focusWindow(existing.id);
        return;
      }
    }

    openRef.current({
      id: uuidv4(),
      appId: spec.appId,
      nodeId: spec.nodeId,
      title: spec.title,
      icon: spec.icon,
      bounds: getInitialBounds(spec.appId),
      state: 'normal',
      meta: spec.meta,
    });
  }, []);
}
