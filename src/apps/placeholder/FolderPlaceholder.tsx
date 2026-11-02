/**
 * FolderPlaceholder Component
 * Temporary placeholder for folders until File Explorer is implemented
 * Styled to match classic OS folder window aesthetic
 */

import { useVFSNodes, useVFSNodesByParent } from '../../os/store';
import './FolderPlaceholder.css';

interface FolderPlaceholderProps {
  windowId: string;
  nodeId?: string;
}

export default function FolderPlaceholder({ nodeId }: FolderPlaceholderProps) {
  const nodes = useVFSNodes();
  const folder = nodeId ? nodes[nodeId] : null;
  const children = useVFSNodesByParent(nodeId || 'root');

  return (
    <div className="folder-placeholder">
      {/* Toolbar - Classic OS style */}
      <div className="folder-placeholder__toolbar">
        <span className="folder-placeholder__toolbar-text">
          📂 Folder Contents
        </span>
      </div>

      {/* Content Area */}
      <div className="folder-placeholder__content">
        <div className="folder-placeholder__icon">📁</div>
        <h2 className="folder-placeholder__title">
          {folder?.name || 'Folder'}
        </h2>
        <p className="folder-placeholder__info">
          This folder contains {children.length} {children.length === 1 ? 'item' : 'items'}
        </p>
        <p className="folder-placeholder__message">
          Open this folder in File Explorer to see what is inside.
        </p>
      </div>
    </div>
  );
}
