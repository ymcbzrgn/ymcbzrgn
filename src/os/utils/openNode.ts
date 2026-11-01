/**
 * Open a VFS node the way a double-click on its desktop icon does. Shared by the desktop icons and the
 * pixel assistant (which opens things by walking up to them).
 */
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store';
import type { VFSNode } from '../types';
import { getInitialBounds } from './windowBounds';

/** Window id of the newly opened window, or null when the node opens in a new browser tab (external link). */
export function openNodeWindow(node: VFSNode): string | null {
  // External links: open directly in a new tab
  if (node.type === 'link' && node.targetUrl) {
    const url = node.targetUrl;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return null;
    }
  }

  let appId = 'placeholder';
  const meta: Record<string, unknown> = {};

  // IMPORTANT: check special folders BEFORE the generic folder case
  if (node.id === 'projects') {
    // Projects folder -> GitHub projects viewer (not the file explorer)
    appId = 'github-projects';
  } else if (node.type === 'folder') {
    appId = 'file-explorer';
  } else if (node.type === 'file' && node.mimeType === 'application/pdf') {
    appId = 'pdf-viewer';
    meta.fileUrl = node.targetUrl || '';
  } else if (node.type === 'file' && node.mimeType === 'application/x-browser-pdf') {
    appId = 'browser';
    meta.url = node.targetUrl || '';
  } else if (node.type === 'link') {
    // Internal links (same origin) -> browser app
    appId = 'browser';
    meta.url = node.targetUrl;
  } else if (node.type === 'app') {
    appId = node.appId || 'placeholder';
  } else if (node.mimeType === 'application/x-legacy-site') {
    // Legacy site easter egg
    appId = 'browser';
    meta.url = node.targetUrl || '/legacy/index.html';
  }

  const id = uuidv4();
  useStore.getState().openWindow({
    id,
    appId,
    nodeId: node.id,
    title: node.name,
    icon: node.icon || (node.type === 'folder' ? '📁' : '📄'),
    bounds: getInitialBounds(appId),
    state: 'normal',
    createdAt: Date.now(),
    meta,
  });
  return id;
}
