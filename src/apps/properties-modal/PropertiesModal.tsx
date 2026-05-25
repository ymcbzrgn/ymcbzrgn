/**
 * Properties Modal Component
 * Displays and edits VFS node metadata (Ubuntu×XP themed)
 */

import { useState } from 'react';
import { useVFSNodes, useVFSActions, useWindowActions } from '@os/store';
import { getIconDisplay } from '@os/utils/iconMap';
import type { VFSNode } from '@os/types';
import './PropertiesModal.css';

interface PropertiesModalProps {
  windowId?: string;
  nodeId: string;
}

type TabId = 'general' | 'details' | 'permissions';

export default function PropertiesModal({ windowId, nodeId }: PropertiesModalProps) {
  const nodes = useVFSNodes();
  const { updateNode } = useVFSActions();
  const { closeWindow } = useWindowActions();
  const node = nodes[nodeId];

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [editedName, setEditedName] = useState(node?.name || '');
  const [hasChanges, setHasChanges] = useState(false);

  if (!node) {
    return (
      <div className="properties-modal">
        <div className="properties-error">
          <div className="properties-error-icon">❌</div>
          <p>Node not found</p>
        </div>
      </div>
    );
  }

  // Helper: Format file size
  const formatSize = (bytes?: number): string => {
    if (!bytes && bytes !== 0) return 'N/A';
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // Helper: Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Helper: Get parent path
  const getPath = (): string => {
    const pathParts: string[] = [];
    let currentId = node.parentId;

    while (currentId && currentId !== 'root') {
      const parentNode = nodes[currentId];
      if (parentNode) {
        pathParts.unshift(parentNode.name);
        currentId = parentNode.parentId;
      } else {
        break;
      }
    }

    return pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
  };

  // Handle name change
  const handleNameChange = (newName: string) => {
    setEditedName(newName);
    if (newName.trim() !== node.name) {
      setHasChanges(true);
    }
  };

  // Handle name save (on blur or Enter)
  const handleNameSave = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== node.name) {
      updateNode(nodeId, { name: trimmedName });
      setHasChanges(false);
    } else {
      setEditedName(node.name);
    }
  };

  // Handle attribute change
  const handleAttributeChange = (attribute: keyof VFSNode, value: boolean) => {
    updateNode(nodeId, { [attribute]: value });
  };

  // Button handlers
  const handleOK = () => {
    handleNameSave();
    if (windowId) {
      closeWindow(windowId);
    }
  };

  const handleCancel = () => {
    if (windowId) {
      closeWindow(windowId);
    }
  };

  const handleApply = () => {
    handleNameSave();
    setHasChanges(false);
  };

  return (
    <div className="properties-modal">
      {/* Tab Navigation */}
      <div className="properties-tabs">
        <button
          className={`properties-tab ${activeTab === 'general' ? 'properties-tab--active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`properties-tab ${activeTab === 'details' ? 'properties-tab--active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`properties-tab ${activeTab === 'permissions' ? 'properties-tab--active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
      </div>

      {/* Content Area with Tab Panels */}
      <div className="properties-content">
        {/* General Tab */}
        <div className={`properties-tab-panel ${activeTab === 'general' ? 'properties-tab-panel--active' : ''}`}>
          {/* Header with Icon & Name */}
          <div className="properties-header">
            <div className="properties-icon-large">{getIconDisplay(node.icon)}</div>
            <input
              type="text"
              className="properties-name-input"
              value={editedName}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNameSave();
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === 'Escape') {
                  setEditedName(node.name);
                  setHasChanges(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </div>

          {/* General Information Section */}
          <div className="properties-section">
            <h3 className="properties-section-title">Information</h3>

            <div className="properties-row">
              <span className="properties-label">Type:</span>
              <span className="properties-value">
                {node.type === 'folder'
                  ? 'Folder'
                  : node.type === 'file'
                  ? 'File'
                  : node.type === 'link'
                  ? 'Link'
                  : node.type === 'app'
                  ? 'Application'
                  : 'Unknown'}
              </span>
            </div>

            {node.size !== undefined && (
              <div className="properties-row">
                <span className="properties-label">Size:</span>
                <span className="properties-value">{formatSize(node.size)}</span>
              </div>
            )}

            {node.mimeType && (
              <div className="properties-row">
                <span className="properties-label">MIME Type:</span>
                <span className="properties-value">{node.mimeType}</span>
              </div>
            )}

            <div className="properties-row">
              <span className="properties-label">Location:</span>
              <span className="properties-value">{getPath()}</span>
            </div>

            {node.targetUrl && (
              <div className="properties-row">
                <span className="properties-label">Target:</span>
                <a
                  href={node.targetUrl.trim().toLowerCase().startsWith('javascript:') ? '#' : node.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="properties-link"
                >
                  {node.targetUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Details Tab */}
        <div className={`properties-tab-panel ${activeTab === 'details' ? 'properties-tab-panel--active' : ''}`}>
          {/* Timestamps Section */}
          <div className="properties-section">
            <h3 className="properties-section-title">Timestamps</h3>

            <div className="properties-row">
              <span className="properties-label">Created:</span>
              <span className="properties-value">{formatDate(node.createdAt)}</span>
            </div>

            <div className="properties-row">
              <span className="properties-label">Modified:</span>
              <span className="properties-value">{formatDate(node.modifiedAt)}</span>
            </div>

            {node.accessedAt && (
              <div className="properties-row">
                <span className="properties-label">Accessed:</span>
                <span className="properties-value">{formatDate(node.accessedAt)}</span>
              </div>
            )}
          </div>

          {/* Additional Details Section */}
          <div className="properties-section">
            <h3 className="properties-section-title">Additional Details</h3>

            <div className="properties-row">
              <span className="properties-label">Node ID:</span>
              <span className="properties-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                {node.id}
              </span>
            </div>

            {node.parentId && (
              <div className="properties-row">
                <span className="properties-label">Parent ID:</span>
                <span className="properties-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {node.parentId}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Permissions Tab */}
        <div className={`properties-tab-panel ${activeTab === 'permissions' ? 'properties-tab-panel--active' : ''}`}>
          {/* Attributes Section */}
          <div className="properties-section">
            <h3 className="properties-section-title">Attributes</h3>

            <label className="properties-checkbox">
              <input
                type="checkbox"
                checked={node.readonly || false}
                onChange={(e) => handleAttributeChange('readonly', e.target.checked)}
              />
              <span>Read-only</span>
            </label>

            <label className="properties-checkbox">
              <input
                type="checkbox"
                checked={node.hidden || false}
                onChange={(e) => handleAttributeChange('hidden', e.target.checked)}
              />
              <span>Hidden</span>
            </label>

            <label className="properties-checkbox">
              <input
                type="checkbox"
                checked={node.starred || false}
                onChange={(e) => handleAttributeChange('starred', e.target.checked)}
              />
              <span>Starred / Favorite</span>
            </label>
          </div>

          {/* Security Section */}
          <div className="properties-section">
            <h3 className="properties-section-title">Security</h3>

            <div className="properties-row">
              <span className="properties-label">Status:</span>
              <span className="properties-value">
                {node.readonly ? '🔒 Protected' : '✏️ Editable'}
              </span>
            </div>

            <div className="properties-row">
              <span className="properties-label">Visibility:</span>
              <span className="properties-value">
                {node.hidden ? '👁️‍🗨️ Hidden' : '👁️ Visible'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Button Bar */}
      <div className="properties-footer">
        <button className="properties-button properties-button--primary" onClick={handleOK}>
          OK
        </button>
        <button className="properties-button properties-button--secondary" onClick={handleCancel}>
          Cancel
        </button>
        <button
          className="properties-button properties-button--secondary"
          onClick={handleApply}
          disabled={!hasChanges}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
