/**
 * Window Component
 * Ubuntu×XP Desktop Portfolio
 *
 * Draggable, resizable window with title bar
 */

import { useEffect, useRef, useState } from 'react';
import type { WindowState } from '../os/types';
import { useVFSNodes } from '../os/store';
import { getIconDisplay } from '../os/utils/iconMap';
import AppLoader from '../apps/appLoader';
import './Window.css';

interface WindowProps {
  window: WindowState;
  onClose: (windowId: string) => void;
  onFocus: (windowId: string) => void;
  onMinimize: (windowId: string) => void;
  onMaximize: (windowId: string) => void;
  onRestore: (windowId: string) => void;
  onUpdateBounds: (windowId: string, bounds: Partial<WindowState['bounds']>) => void;
  isFocused: boolean;
  children?: React.ReactNode;
}

interface DragState {
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  isResizing: boolean;
  direction: string;
  startX: number;
  startY: number;
  startBounds: WindowState['bounds'];
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const RESIZE_HANDLES: Array<{
  position: ResizeDirection;
  cursor: string;
  className: string;
}> = [
  { position: 'n', cursor: 'n-resize', className: 'window__resize-handle window__resize-handle--n' },
  { position: 's', cursor: 's-resize', className: 'window__resize-handle window__resize-handle--s' },
  { position: 'e', cursor: 'e-resize', className: 'window__resize-handle window__resize-handle--e' },
  { position: 'w', cursor: 'w-resize', className: 'window__resize-handle window__resize-handle--w' },
  { position: 'ne', cursor: 'ne-resize', className: 'window__resize-handle window__resize-handle--ne' },
  { position: 'nw', cursor: 'nw-resize', className: 'window__resize-handle window__resize-handle--nw' },
  { position: 'se', cursor: 'se-resize', className: 'window__resize-handle window__resize-handle--se' },
  { position: 'sw', cursor: 'sw-resize', className: 'window__resize-handle window__resize-handle--sw' },
];

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

export default function Window({
  window,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onRestore,
  onUpdateBounds,
  isFocused,
  children,
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const vfsNodes = useVFSNodes();
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    direction: '',
    startX: 0,
    startY: 0,
    startBounds: { x: 0, y: 0, width: 0, height: 0 },
  });

  // Handle mouse down on title bar (start drag)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Ignore if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // Don't drag if maximized
    if (window.state === 'maximized') {
      return;
    }

    // Focus this window
    onFocus(window.id);

    // Calculate offset from window position to mouse position
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragState({
        isDragging: true,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      });
    }
  };

  // Handle mouse move (drag)
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate new position
      const newX = e.clientX - dragState.offsetX;
      const newY = e.clientY - dragState.offsetY;

      // Update window bounds via RAF for performance
      requestAnimationFrame(() => {
        onUpdateBounds(window.id, { x: newX, y: newY });
      });
    };

    const handleMouseUp = () => {
      setDragState((prev) => ({ ...prev, isDragging: false }));
    };

    // Add document-level listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState.isDragging, dragState.offsetX, dragState.offsetY, window.id, onUpdateBounds]);

  // Handle resize mouse down
  const handleResizeMouseDown = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();

    onFocus(window.id);

    setResizeState({
      isResizing: true,
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startBounds: { ...window.bounds },
    });
  };

  // Handle resize mouse move
  useEffect(() => {
    if (!resizeState.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;

      const newBounds = { ...resizeState.startBounds };
      const direction = resizeState.direction;

      // North (top edge)
      if (direction.includes('n')) {
        const newHeight = resizeState.startBounds.height - deltaY;
        if (newHeight >= MIN_HEIGHT) {
          newBounds.y = resizeState.startBounds.y + deltaY;
          newBounds.height = newHeight;
        } else {
          newBounds.height = MIN_HEIGHT;
        }
      }

      // South (bottom edge)
      if (direction.includes('s')) {
        newBounds.height = Math.max(MIN_HEIGHT, resizeState.startBounds.height + deltaY);
      }

      // West (left edge)
      if (direction.includes('w')) {
        const newWidth = resizeState.startBounds.width - deltaX;
        if (newWidth >= MIN_WIDTH) {
          newBounds.x = resizeState.startBounds.x + deltaX;
          newBounds.width = newWidth;
        } else {
          newBounds.width = MIN_WIDTH;
        }
      }

      // East (right edge)
      if (direction.includes('e')) {
        newBounds.width = Math.max(MIN_WIDTH, resizeState.startBounds.width + deltaX);
      }

      // Update window bounds via RAF for performance
      requestAnimationFrame(() => {
        onUpdateBounds(window.id, newBounds);
      });
    };

    const handleMouseUp = () => {
      setResizeState((prev) => ({ ...prev, isResizing: false }));
    };

    // Add document-level listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    resizeState.isResizing,
    resizeState.direction,
    resizeState.startX,
    resizeState.startY,
    resizeState.startBounds,
    window.id,
    onUpdateBounds,
  ]);

  // Handle title bar double-click (maximize toggle)
  const handleTitleBarDoubleClick = () => {
    if (window.state === 'maximized') {
      onRestore(window.id);
    } else {
      onMaximize(window.id);
    }
  };

  // Handle close button click
  const handleClose = () => {
    onClose(window.id);
  };

  // Handle minimize button click
  const handleMinimize = () => {
    onMinimize(window.id);
  };

  // Handle maximize/restore button click
  const handleMaximizeToggle = () => {
    if (window.state === 'maximized') {
      onRestore(window.id);
    } else {
      onMaximize(window.id);
    }
  };

  // Handle window click (focus)
  const handleWindowClick = () => {
    if (!isFocused) {
      onFocus(window.id);
    }
  };

  // Determine if window is minimized (don't render)
  if (window.state === 'minimized') {
    return null;
  }

  // Calculate transform based on bounds
  const isMaximized = window.state === 'maximized';
  const transform = isMaximized ? 'translate3d(0, 0, 0)' : `translate3d(${window.bounds.x}px, ${window.bounds.y}px, 0)`;

  // Window classes
  const windowClasses = [
    'window',
    isFocused ? 'window--focused' : '',
    dragState.isDragging ? 'window--dragging' : '',
    resizeState.isResizing ? 'window--resizing' : '',
    isMaximized ? 'window--maximized' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={windowRef}
      data-window-id={window.id}
      data-app-id={window.appId}
      className={windowClasses}
      style={{
        transform,
        width: isMaximized ? '100vw' : `${window.bounds.width}px`,
        height: isMaximized ? '100vh' : `${window.bounds.height}px`,
        zIndex: window.zIndex,
      }}
      onClick={handleWindowClick}
    >
      {/* Title Bar */}
      <div
        className="window__titlebar"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleTitleBarDoubleClick}
        style={{ cursor: dragState.isDragging ? 'grabbing' : isMaximized ? 'default' : 'grab' }}
      >
        <div className="window__titlebar-left">
          {window.icon && <span className="window__icon">{getIconDisplay(window.icon)}</span>}
          <span className="window__title">{window.title}</span>
        </div>
        <div className="window__titlebar-right">
          <button
            className="window__button window__button--minimize"
            onClick={handleMinimize}
            aria-label="Minimize window"
          >
            ─
          </button>
          <button
            className="window__button window__button--maximize"
            onClick={handleMaximizeToggle}
            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button
            className="window__button window__button--close"
            onClick={handleClose}
            aria-label="Close window"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="window__content">
        {children || (
          <AppLoader
            appId={window.appId}
            windowId={window.id}
            nodeId={window.nodeId}
            // Pass all meta props (for browser app, pdf-viewer fileUrl, etc.)
            {...(window.meta || {})}
          />
        )}
      </div>

      {/* Resize Handles (only if not maximized) */}
      {!isMaximized &&
        RESIZE_HANDLES.map((handle) => (
          <div
            key={handle.position}
            className={handle.className}
            style={{ cursor: handle.cursor }}
            onMouseDown={(e) => handleResizeMouseDown(e, handle.position)}
          />
        ))}
    </div>
  );
}
