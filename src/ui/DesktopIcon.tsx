/**
 * DesktopIcon - Draggable icon on desktop grid
 * Ubuntu×XP Desktop Portfolio
 */

import { useState, useEffect, useRef } from 'react';
import type { VFSNode } from '@os/types';
import { useVFSActions, useVFSNodes, useDesktopActions, useWindowActions, useStore } from '@os/store';
import { validateName, nameExists } from '@os/utils/naming';
import { getIconDisplay } from '@os/utils/iconMap';
import { useIsMobile } from '@os/hooks/useDeviceType';
import { useT } from '@os/i18n';
import { v4 as uuidv4 } from 'uuid';
import ContextMenu, { type MenuItem } from './ContextMenu';
import './DesktopIcon.css';

interface DesktopIconProps {
  node: VFSNode;
  position: { x: number; y: number };
  isSelected?: boolean;
  onDragStart: (nodeId: string) => void;
  onDragMove: (nodeId: string, x: number, y: number) => void;
  onDragEnd: (nodeId: string) => void;
  onDoubleClick: (node: VFSNode) => void;
  onSelect: (nodeId: string, multi: boolean) => void;
}

export default function DesktopIcon({
  node,
  position,
  isSelected = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDoubleClick,
  onSelect,
}: DesktopIconProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(node.name);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  // First-time hint: a single click only selects an icon on desktop, which looks "broken" to newcomers
  const [hintVisible, setHintVisible] = useState(false);
  const iconHintSeen = useStore((state) => state.settings.iconHintSeen);
  // Living icons: lit while a window of theirs is open, they pop when something opens from them
  const isOpen = useStore((state) => state.windows.some((w) => w.nodeId === node.id));
  const [popping, setPopping] = useState(false);
  const t = useT();
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const iconRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store hooks
  const { updateNode, deleteNode, moveNode } = useVFSActions();
  const allNodes = useVFSNodes();
  const { showContextMenu, hideContextMenu, removeIconPosition } = useDesktopActions();
  const { openWindow } = useWindowActions();
  const isMobile = useIsMobile();

  // Handle mouse down - start drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent text selection during drag
    e.preventDefault();

    mouseDownPos.current = { x: e.clientX, y: e.clientY };

    // Check for multi-select (Ctrl/Cmd key)
    const isMulti = e.ctrlKey || e.metaKey;
    onSelect(node.id, isMulti);

    // Calculate drag offset
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });

    setIsDragging(true);
    onDragStart(node.id);
  };

  // Handle click - single-click on mobile, double-click on desktop
  const handleClick = (e: React.MouseEvent) => {
    // Mobile: Single click opens immediately
    if (isMobile) {
      onDoubleClick(node);
      return;
    }

    // Desktop: Double-click detection
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;

    if (timeSinceLastClick < 300) {
      // Double-click detected
      onDoubleClick(node);
      setLastClickTime(0); // Reset to prevent triple-click
      setHintVisible(false);
      setPopping(true);
      if (!iconHintSeen) useStore.getState().updateSettings({ iconHintSeen: true });
    } else {
      // Single click
      setLastClickTime(now);
      // Not after a drag: only when the pointer stayed put
      const moved = Math.hypot(e.clientX - mouseDownPos.current.x, e.clientY - mouseDownPos.current.y) > 4;
      if (!iconHintSeen && !moved) setHintVisible(true);
    }
  };

  // The pop animation ends on its own
  useEffect(() => {
    if (!popping) return;
    const timer = window.setTimeout(() => setPopping(false), 900);
    return () => window.clearTimeout(timer);
  }, [popping]);

  // Auto-hide the hint
  useEffect(() => {
    if (!hintVisible) return;
    const timer = window.setTimeout(() => setHintVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [hintVisible]);

  // Keep the hint on screen near the edges
  const hintClass = [
    'desktop-icon__hint',
    position.y > window.innerHeight * 0.6 ? 'desktop-icon__hint--above' : '',
    position.x > window.innerWidth - 220 ? 'desktop-icon__hint--right' : '',
    position.x < 120 ? 'desktop-icon__hint--left' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    showContextMenu(node.id, e.clientX, e.clientY);
  };

  // Start rename mode
  const startRename = () => {
    setIsRenaming(true);
    setRenamingValue(node.name);
    setContextMenuPos(null);
  };

  // Submit rename
  const submitRename = async () => {
    const newName = renamingValue.trim();

    // Validation
    const validationResult = validateName(newName);
    if (validationResult !== true) {
      alert(validationResult);
      return;
    }

    // Check for duplicates
    if (newName !== node.name && nameExists(newName, node.parentId, allNodes, node.id)) {
      alert('A file or folder with this name already exists');
      return;
    }

    // Update node
    if (newName !== node.name) {
      await updateNode(node.id, { name: newName });
    }

    setIsRenaming(false);
  };

  // Cancel rename
  const cancelRename = () => {
    setIsRenaming(false);
    setRenamingValue(node.name);
  };

  // Handle delete
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
      await deleteNode(node.id);
    }
    setContextMenuPos(null);
  };

  // Handle properties
  const handleProperties = () => {
    openWindow({
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
      createdAt: Date.now(),
      meta: {},
    });
    setContextMenuPos(null);
  };

  // HTML5 Drag & Drop - File moving handlers
  // Note: Desktop icons use mouse drag (not HTML5 drag) to avoid conflicts
  // Only folders accept drops from FileExplorer items

  // Check if nodeId is a descendant of potentialParentId (prevent circular moves)
  const isDescendantOf = (nodeId: string, potentialParentId: string): boolean => {
    let currentId = nodeId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) return false; // Cycle detected
      visited.add(currentId);

      const currentNode = allNodes[currentId];
      if (!currentNode) return false;

      if (currentNode.parentId === potentialParentId) return true;
      if (currentNode.parentId === null || currentNode.parentId === 'root') return false;

      currentId = currentNode.parentId;
    }

    return false;
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    // Only folders can be drop targets
    if (node.type !== 'folder') return;

    e.preventDefault();
    e.stopPropagation();

    // Check if the drag data type is correct (getData() doesn't work in dragOver!)
    if (!e.dataTransfer.types.includes('application/vnd.desktop-node')) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    // Allow drop - validation happens in onDrop where getData() works
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropTarget(false);

    // Only folders can receive drops
    if (node.type !== 'folder') return;

    const draggedNodeId = e.dataTransfer.getData('application/vnd.desktop-node');
    if (!draggedNodeId || draggedNodeId === node.id) return;

    const draggedNode = allNodes[draggedNodeId];
    if (!draggedNode) return;

    // Validate circular dependency again
    if (draggedNode.type === 'folder') {
      if (draggedNodeId === node.id || isDescendantOf(node.id, draggedNodeId)) {
        alert('Cannot move a folder into itself or its subfolder');
        return;
      }
    }

    try {
      // Move node to this folder
      await moveNode(draggedNodeId, node.id);

      // Remove from desktop layout (it's now inside a folder)
      removeIconPosition(draggedNodeId);
    } catch (error) {
      console.error('Failed to move node:', error);
      alert('Failed to move item');
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    // Only unhighlight if actually leaving the icon (not entering a child element)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDropTarget(false);
  };

  const handleFileDragEnd = () => {
    setIsDropTarget(false);
  };

  // Build context menu items
  const getContextMenuItems = (): MenuItem[] => {
    return [
      {
        id: 'open',
        label: 'Open',
        icon: '📂',
        shortcut: 'Enter',
        onClick: () => {
          onDoubleClick(node);
          setContextMenuPos(null);
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
        onClick: startRename,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: '🗑️',
        shortcut: 'Del',
        onClick: handleDelete,
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
        onClick: handleProperties,
      },
    ];
  };

  // Auto-focus and select text when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Mouse move effect
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      onDragMove(node.id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd(node.id);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, node.id, onDragMove, onDragEnd]);

  return (
    <>
      <div
        ref={iconRef}
        data-node-id={node.id}
        data-node-type={node.type}
        className={`desktop-icon${isSelected ? 'desktop-icon--selected' : ''} ${isDragging ? 'desktop-icon--dragging' : ''} ${isRenaming ? 'desktop-icon--renaming' : ''} ${isDropTarget ? 'desktop-icon--drop-target' : ''} ${isOpen ? 'desktop-icon--open' : ''} ${popping ? 'desktop-icon--opening' : ''}`}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        draggable={false}
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
        onDragLeave={handleFileDragLeave}
        onDragEnd={handleFileDragEnd}
        onMouseDown={isRenaming ? undefined : handleMouseDown}
        onClick={isRenaming ? undefined : handleClick}
        onContextMenu={handleContextMenu}
        tabIndex={0}
      >
        <div className="desktop-icon__image">
          {getIconDisplay(node.icon)}
        </div>
        <div className="desktop-icon__label">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              className="desktop-icon__rename-input"
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitRename();
                } else if (e.key === 'Escape') {
                  cancelRename();
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            node.name
          )}
        </div>
        {hintVisible && (
          <div className={hintClass} role="status">
            {t('hintDoubleClick')}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenuPos && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </>
  );
}
