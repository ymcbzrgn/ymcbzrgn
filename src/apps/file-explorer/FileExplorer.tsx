/**
 * SHARED (ADAPTIVE) Component
 *
 * FileExplorer - Classic OS-style file manager with navigation and file viewing.
 * Renders on both Desktop and Mobile with adaptive UX:
 *
 * Desktop (>=768px):
 * - Double-click to open files/folders
 * - Right-click context menu
 * - Drag & drop support
 * - Hover interactions
 *
 * Mobile (<768px):
 * - Single tap to open
 * - Long-press (500ms) for context menu
 * - No drag & drop (gestures disabled)
 * - Touch-optimized spacing (44px minimum targets)
 * - 3-column grid layout
 *
 * Implementation: Uses isMobile hook for conditional event handlers and className.
 */

import { lazy, Suspense, useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useVFSNodes, useVFSNodesByParent, useVFSActions, useStore } from '../../os/store';
import { useT } from '../../os/i18n/full';
import { useRoomStore } from '../../ui/rooms/roomStore';
import { getIconDisplay } from '../../os/utils/iconMap';
import { getInitialBounds } from '../../os/utils/windowBounds';
import {
  getUniqueFolderName,
  getUniqueTextFileName,
  validateName,
  nameExists,
} from '../../os/utils/naming';
import type { VFSNode } from '../../os/types';
import { useIsMobile } from '../../os/hooks/useDeviceType';
import { useLongPress } from '../../os/hooks/useLongPress';
import { useAppOpener } from '../../os/hooks/useAppOpener';
import ContextMenu, { type MenuItem } from '../../ui/ContextMenu';
import '../../ui/rooms/roomToggle.css';
import './FileExplorer.css';

// The room view (the pixel twin living in this window) is loaded only when somebody asks for it
const ExplorerRoom = lazy(() => import('../../ui/rooms/ExplorerRoom'));

interface FileExplorerProps {
  windowId: string;
  nodeId?: string; // Initial folder to open
}

// Helper: Extract coordinates from Touch or Mouse event
function getEventCoordinates(e: React.TouchEvent | React.MouseEvent): { x: number; y: number } {
  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

export default function FileExplorer({ windowId, nodeId }: FileExplorerProps) {
  const nodes = useVFSNodes();
  const openApp = useAppOpener();
  const { createNode, updateNode, deleteNode, moveNode } = useVFSActions();
  const isMobile = useIsMobile();
  const t = useT();
  const roomOn = useRoomStore((state) => state.windowId === windowId);
  const assistantHidden = useStore((state) => state.settings.assistantHidden);

  // DEBUG: Log FileExplorer mount and mobile detection
  useEffect(() => {
    console.log('[FileExplorer] 🚀 MOUNTED', {
      windowId,
      nodeId,
      isMobile,
      windowInnerWidth: window.innerWidth,
      timestamp: new Date().toISOString(),
    });
    return () => {
      console.log('[FileExplorer] 💀 UNMOUNTED', {
        windowId,
        timestamp: new Date().toISOString(),
      });
    };
  }, [windowId, nodeId, isMobile]);

  // DEBUG: Log when isMobile changes
  useEffect(() => {
    console.log('[FileExplorer] 📱 isMobile CHANGED', {
      isMobile,
      willApplyClassName: isMobile ? 'file-explorer file-explorer--mobile' : 'file-explorer',
      timestamp: new Date().toISOString(),
    });
  }, [isMobile]);

  // Navigation state: array of folder IDs representing the path
  const [path, setPath] = useState<string[]>([nodeId || 'root']);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetNode: VFSNode | null;
  } | null>(null);

  // Rename state
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Current folder is the last item in path
  const currentFolderId = path[path.length - 1];
  const currentFolder = nodes[currentFolderId];
  const children = useVFSNodesByParent(currentFolderId);

  // Build breadcrumb trail
  const breadcrumbTrail = useMemo(() => {
    return path.map((id) => ({
      id,
      name: nodes[id]?.name || 'Unknown',
      icon: nodes[id]?.icon,
    }));
  }, [path, nodes]);

  // Navigate to a folder in breadcrumb
  function navigateTo(targetId: string) {
    const index = path.indexOf(targetId);
    if (index !== -1) {
      // Go back to this folder by truncating path
      setPath(path.slice(0, index + 1));
    }
  }

  // Helper to open app (platform-aware: Desktop window or Mobile fullscreen)
  function openAppFromExplorer(appId: string, node: VFSNode) {
    openApp({
      id: uuidv4(),
      appId,
      nodeId: node.id,
      title: node.name,
      icon: node.icon || '📄',
      bounds: getInitialBounds(appId),
      state: 'normal',
      meta: {},
    });
  }

  // Handle double-click on item
  function handleOpen(node: VFSNode) {
    if (node.type === 'folder') {
      // Navigate into folder
      setPath([...path, node.id]);
    } else if (node.type === 'app') {
      // Open app in window (e.g., games, GitHub projects)
      openAppFromExplorer(node.appId || 'placeholder', node);
    } else if (node.type === 'file') {
      // Open file in appropriate viewer based on MIME type
      if (node.mimeType === 'text/plain') {
        openAppFromExplorer('text-viewer', node);
      } else if (node.mimeType === 'text/markdown') {
        openAppFromExplorer('markdown-viewer', node);
      } else if (node.mimeType === 'application/pdf') {
        openAppFromExplorer('pdf-viewer', node);
      } else if (node.mimeType === 'application/x-browser-pdf') {
        openApp({
          id: uuidv4(),
          appId: 'browser',
          nodeId: node.id,
          title: node.name,
          icon: node.icon || '📄',
          bounds: {
            x: (window.innerWidth - 800) / 2,
            y: (window.innerHeight - 600) / 2,
            width: 800,
            height: 600,
          },
          state: 'normal',
          meta: { url: node.targetUrl || '' },
        });
      } else if (node.mimeType === 'application/x-legacy-site') {
        // Legacy site easter egg - open in browser
        openApp({
          id: uuidv4(),
          appId: 'browser',
          nodeId: node.id,
          title: node.name,
          icon: node.icon || '🌐',
          bounds: {
            x: (window.innerWidth - 800) / 2,
            y: (window.innerHeight - 600) / 2,
            width: 800,
            height: 600,
          },
          state: 'normal',
          meta: { url: node.targetUrl || '/legacy/index.html' },
        });
      } else if (node.mimeType?.startsWith('image/')) {
        openAppFromExplorer('image-viewer', node);
      } else {
        // Generic file - try text viewer
        openAppFromExplorer('text-viewer', node);
      }
    } else if (node.type === 'link') {
      // Open external link in browser
      if (node.targetUrl) {
        window.open(node.targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }

  // Go back one level
  function goBack() {
    if (path.length > 1) {
      setPath(path.slice(0, -1));
    }
  }

  // Check if nodeId is a descendant of potentialParentId (prevent circular moves)
  const isDescendantOf = (nodeId: string, potentialParentId: string): boolean => {
    let currentId = nodeId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) return false; // Cycle detected
      visited.add(currentId);

      const currentNode = nodes[currentId];
      if (!currentNode) return false;

      if (currentNode.parentId === potentialParentId) return true;
      if (currentNode.parentId === null || currentNode.parentId === 'root') return false;

      currentId = currentNode.parentId;
    }

    return false;
  };

  // Context menu handlers (supports both Touch and Mouse events)
  function handleContextMenu(e: React.MouseEvent | React.TouchEvent, node: VFSNode | null) {
    e.preventDefault();
    e.stopPropagation();
    const coords = getEventCoordinates(e);
    setContextMenu({ x: coords.x, y: coords.y, targetNode: node });
  }

  async function handleNewFolder() {
    const name = getUniqueFolderName(currentFolderId, nodes);
    const newFolder: VFSNode = {
      id: uuidv4(),
      type: 'folder',
      name,
      parentId: currentFolderId,
      icon: '📁',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    await createNode(newFolder);
    setContextMenu(null);
  }

  async function handleNewTextFile() {
    const name = getUniqueTextFileName(currentFolderId, nodes);
    const newFile: VFSNode = {
      id: uuidv4(),
      type: 'file',
      name,
      parentId: currentFolderId,
      icon: '📄',
      mimeType: 'text/plain',
      size: 0,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    await createNode(newFile);
    setContextMenu(null);
  }

  async function handleDelete(node: VFSNode) {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      await deleteNode(node.id);
    }
    setContextMenu(null);
  }

  function handleProperties(node: VFSNode) {
    openApp({
      id: uuidv4(),
      appId: 'properties-modal',
      nodeId: node.id,
      title: `Properties - ${node.name}`,
      icon: '📋',
      bounds: {
        x: (window.innerWidth - 400) / 2,
        y: (window.innerHeight - 500) / 2,
        width: 400,
        height: 500,
      },
      state: 'normal',
      meta: {},
    });
    setContextMenu(null);
  }

  function handleRename(node: VFSNode) {
    setRenamingNodeId(node.id);
    setRenameValue(node.name);
    setContextMenu(null);
  }

  async function submitRename(nodeId: string) {
    const newName = renameValue.trim();
    const node = nodes[nodeId];

    if (!node) {
      setRenamingNodeId(null);
      return;
    }

    const validationResult = validateName(newName);
    if (validationResult !== true) {
      alert(validationResult);
      return;
    }

    if (newName !== node.name && nameExists(newName, node.parentId, nodes, node.id)) {
      alert('A file or folder with this name already exists');
      return;
    }

    if (newName !== node.name) {
      await updateNode(nodeId, { name: newName });
    }

    setRenamingNodeId(null);
  }

  function cancelRename() {
    setRenamingNodeId(null);
    setRenameValue('');
  }

  // Build context menu items
  function getContextMenuItems(): MenuItem[] {
    if (!contextMenu) return [];

    // Empty space context menu
    if (!contextMenu.targetNode) {
      return [
        {
          id: 'new-folder',
          label: 'New Folder',
          icon: '📁',
          onClick: handleNewFolder,
        },
        {
          id: 'new-text',
          label: 'New Text File',
          icon: '📄',
          onClick: handleNewTextFile,
        },
      ];
    }

    // Item context menu
    const node = contextMenu.targetNode;
    return [
      {
        id: 'open',
        label: 'Open',
        icon: '📂',
        shortcut: 'Enter',
        onClick: () => {
          handleOpen(node);
          setContextMenu(null);
        },
      },
      {
        id: 'divider-1',
        label: '',
        divider: true,
        onClick: () => {},
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: '✏️',
        shortcut: 'F2',
        onClick: () => handleRename(node),
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        shortcut: 'Del',
        onClick: () => handleDelete(node),
      },
      {
        id: 'divider-2',
        label: '',
        divider: true,
        onClick: () => {},
      },
      {
        id: 'properties',
        label: 'Properties',
        icon: '📋',
        shortcut: 'Alt+Enter',
        onClick: () => handleProperties(node),
      },
    ];
  }

  // Sort items: folders first, then files, alphabetically
  const sortedChildren = useMemo(() => {
    return [...children].sort((a, b) => {
      // Folders before files
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      // Alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }, [children]);

  // FileExplorerItem - Individual draggable/droppable item
  interface FileExplorerItemProps {
    node: VFSNode;
    isRenaming: boolean;
    renameValue: string;
    isMobile: boolean;
    onOpen: (node: VFSNode) => void;
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, node: VFSNode) => void;
    onRenameChange: (value: string) => void;
    onRenameSubmit: (nodeId: string) => void;
    onRenameCancel: () => void;
  }

  function FileExplorerItem({
    node,
    isRenaming,
    renameValue,
    isMobile,
    onOpen,
    onContextMenu,
    onRenameChange,
    onRenameSubmit,
    onRenameCancel,
  }: FileExplorerItemProps) {
    // Native HTML5 drag & drop state
    const [isDragging, setIsDragging] = useState(false);
    const [isOver, setIsOver] = useState(false);
    const [isLongPressing, setIsLongPressing] = useState(false);

    // Long-press handler for mobile context menu
    const longPressHandlers = useLongPress<HTMLDivElement>(
      (e) => {
        setIsLongPressing(false);
        onContextMenu(e, node);
      },
      {
        delay: 500,
        moveThreshold: 10,
        preventDefault: false, // Allow scroll on container
      }
    );

    // Drag start - store data
    const handleDragStart = (e: React.DragEvent) => {
      if (isRenaming) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(
        'application/vnd.file-node',
        JSON.stringify({
          id: node.id,
          type: node.type,
          parentId: node.parentId,
        })
      );
      setIsDragging(true);
    };

    // Drag end
    const handleDragEnd = () => {
      setIsDragging(false);
    };

    // Drag over - only folders accept drops
    const handleDragOver = (e: React.DragEvent) => {
      // Only folders can be drop targets
      if (node.type !== 'folder') return;

      // Check if correct data type
      if (!e.dataTransfer.types.includes('application/vnd.file-node')) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsOver(true);
    };

    // Drag leave
    const handleDragLeave = (e: React.DragEvent) => {
      // Only unhighlight if actually leaving (not entering child)
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsOver(false);
    };

    // Drop - move node
    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);

      // Only folders accept drops
      if (node.type !== 'folder') return;

      // Get dragged data
      const data = e.dataTransfer.getData('application/vnd.file-node');
      if (!data) return;

      const item = JSON.parse(data);

      // Validation
      if (item.id === node.id) return; // Can't drop on itself
      if (item.type === 'folder' && isDescendantOf(node.id, item.id)) {
        alert('Cannot move a folder into itself or its subfolder');
        return;
      }

      // Move node
      try {
        await moveNode(item.id, node.id);
      } catch (error) {
        console.error('Failed to move node:', error);
        alert('Failed to move item');
      }
    };

    const canDrop = node.type === 'folder';
    const isDropTarget = isOver && canDrop;

    // Conditional event handlers: Mobile (touch) vs Desktop (mouse)
    const mobileHandlers = isMobile
      ? {
          ...longPressHandlers,
          onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
            if (!isRenaming) {
              setIsLongPressing(true);
              longPressHandlers.onTouchStart(e);
            }
          },
          onTouchEnd: () => {
            setIsLongPressing(false);
            longPressHandlers.onTouchEnd();
          },
          onClick: () => !isRenaming && onOpen(node), // Single tap opens on mobile
        }
      : {};

    const desktopHandlers = {
      onDoubleClick: () => !isRenaming && onOpen(node),
      onContextMenu: (e: React.MouseEvent) => !isRenaming && onContextMenu(e, node),
    };

    return (
      <div
        className={`file-explorer__item ${isRenaming ? 'file-explorer__item--renaming' : ''} ${isDropTarget ? 'file-explorer__item--drop-target' : ''} ${isLongPressing ? 'file-explorer__item--long-pressing' : ''}`}
        style={{ opacity: isDragging ? 0.5 : isLongPressing ? 0.8 : 1 }}
        draggable={!isRenaming && !isMobile}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        {...mobileHandlers}
        {...desktopHandlers}
        title={!isRenaming ? node.name : undefined}
      >
        <div className="file-explorer__item-icon">{getIconDisplay(node.icon)}</div>
        {isRenaming ? (
          <input
            type="text"
            className="file-explorer__item-rename-input"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={() => onRenameSubmit(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRenameSubmit(node.id);
              } else if (e.key === 'Escape') {
                onRenameCancel();
              }
            }}
            autoFocus
            onFocus={(e) => {
              // Select filename without extension
              const lastDot = e.target.value.lastIndexOf('.');
              if (lastDot > 0) {
                e.target.setSelectionRange(0, lastDot);
              } else {
                e.target.select();
              }
            }}
          />
        ) : (
          <div className="file-explorer__item-name">{node.name}</div>
        )}
      </div>
    );
  }

  return (
    <div className={`file-explorer${isMobile ? ' file-explorer--mobile' : ''}`}>
      {/* Toolbar */}
      <div className="file-explorer__toolbar">
        <button
          className="file-explorer__back-btn"
          onClick={goBack}
          disabled={path.length <= 1}
          title="Go back"
        >
          ←
        </button>

        {/* Breadcrumb Navigation */}
        <div className="file-explorer__breadcrumb">
          {breadcrumbTrail.map((crumb, index) => (
            <span key={crumb.id} className="file-explorer__breadcrumb-item">
              {index > 0 && <span className="file-explorer__breadcrumb-separator"> › </span>}
              <button
                className="file-explorer__breadcrumb-link"
                onClick={() => navigateTo(crumb.id)}
                disabled={index === breadcrumbTrail.length - 1}
              >
                {crumb.icon && (
                  <span className="file-explorer__breadcrumb-icon">
                    {getIconDisplay(crumb.icon)}
                  </span>
                )}
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

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
          <ExplorerRoom
            windowId={windowId}
            folderId={currentFolderId}
            parentId={path.length > 1 ? path[path.length - 2] : undefined}
            goUp={goBack}
            goInto={(id) => setPath((prev) => [...prev, id])}
            openNode={handleOpen}
          />
        </Suspense>
      )}

      {/* Content Area */}
      <div
        className="file-explorer__content"
        onContextMenu={
          !isMobile
            ? (e) => {
                const target = e.target as HTMLElement;
                // If not clicking on an item, treat as empty space
                if (!target.closest('.file-explorer__item')) {
                  handleContextMenu(e, null);
                }
              }
            : undefined
        }
      >
        {sortedChildren.length === 0 ? (
          <div className="file-explorer__empty">
            <div className="file-explorer__empty-icon">📂</div>
            <p className="file-explorer__empty-text">This folder is empty</p>
          </div>
        ) : (
          <div className="file-explorer__grid">
            {sortedChildren.map((node) => (
              <FileExplorerItem
                key={node.id}
                node={node}
                isRenaming={renamingNodeId === node.id}
                renameValue={renameValue}
                isMobile={isMobile}
                onOpen={handleOpen}
                onContextMenu={handleContextMenu}
                onRenameChange={setRenameValue}
                onRenameSubmit={submitRename}
                onRenameCancel={cancelRename}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="file-explorer__statusbar">
        <span className="file-explorer__statusbar-text">
          {sortedChildren.length} {sortedChildren.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
