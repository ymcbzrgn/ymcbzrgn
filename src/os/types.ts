/**
 * Core OS Type Definitions
 * Ubuntu×XP Desktop Portfolio
 */

// ============================================================================
// VFS (Virtual File System) Types
// ============================================================================

export type VFSNodeType = 'folder' | 'file' | 'link' | 'app';

export interface VFSNode {
  // Identity
  id: string; // UUID v4
  type: VFSNodeType;
  name: string; // Display name (user-editable)

  // Hierarchy
  parentId: string | null; // null = root (Desktop)

  // Metadata
  icon?: string; // Icon identifier
  createdAt: number; // Unix timestamp (ms)
  modifiedAt: number; // Unix timestamp (ms)
  accessedAt?: number; // Last access (for cleanup)

  // File-specific
  size?: number; // Bytes (for files)
  mimeType?: string; // MIME type (e.g., 'text/plain', 'application/pdf')
  contentRef?: string; // Reference to VFSContent.id
  encoding?: 'utf8' | 'base64'; // Text encoding

  // Link-specific
  targetUrl?: string; // External URL (http/https)
  targetNodeId?: string; // Internal node reference (for aliases)

  // App-specific
  appId?: string; // Registered app identifier (e.g., 'pdf-viewer', 'snake')
  appConfig?: Record<string, unknown>; // App-specific configuration

  // UI/Layout
  order?: number; // Sort order within parent (default: createdAt)
  color?: string; // Custom color/theme
  tags?: string[]; // User-defined tags (for search)

  // Permissions (future-proofing)
  readonly?: boolean; // Prevent edits
  hidden?: boolean; // Hide from normal view
  starred?: boolean; // User favorite
}

export interface VFSContent {
  id: string; // Same as contentRef in VFSNode
  data: string | ArrayBuffer; // Text or binary
  compressed?: boolean; // If pako compression used
}

// ============================================================================
// Window Management Types
// ============================================================================

export type WindowStateType = 'normal' | 'minimized' | 'maximized' | 'fullscreen';

export interface WindowBounds {
  x: number; // Left position (px)
  y: number; // Top position (px)
  width: number; // Width (px)
  height: number; // Height (px)
}

export interface WindowState {
  // Identity
  id: string; // Unique window instance ID
  appId: string; // App identifier (e.g., 'pdf-viewer')
  nodeId?: string; // VFS node being displayed (optional)

  // Display
  title: string; // Window title
  icon?: string; // Titlebar icon

  // Geometry
  bounds: WindowBounds;

  // State
  state: WindowStateType;
  zIndex: number; // Stacking order (auto-managed)

  // Constraints
  minWidth?: number; // Minimum width (default: 200)
  minHeight?: number; // Minimum height (default: 150)
  maxWidth?: number; // Maximum width (default: screen width)
  maxHeight?: number; // Maximum height (default: screen height)
  resizable?: boolean; // Allow resize (default: true)
  movable?: boolean; // Allow drag (default: true)

  // App-specific metadata
  meta?: Record<string, unknown>; // Any app-specific data

  // Lifecycle
  createdAt: number; // When window opened
  lastFocusedAt?: number; // Last focus timestamp
}

// ============================================================================
// Desktop Layout Types
// ============================================================================

export interface IconPosition {
  x: number; // Grid cell X
  y: number; // Grid cell Y
  pinned?: boolean; // User pinned position
}

export interface DesktopLayout {
  [nodeId: string]: IconPosition;
}

export interface GridSettings {
  cols: number; // Number of columns
  rows: number; // Number of rows
}

// ============================================================================
// Settings Types
// ============================================================================

export type ThemeType = 'ubuntu-light' | 'ubuntu-dark' | 'xp-classic' | 'high-contrast';
export type DeviceMode = 'desktop' | 'mobile' | 'auto';
export type FontSize = 'small' | 'medium' | 'large';

export interface Settings {
  // Theme
  theme: ThemeType;
  customTheme?: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
  };

  // Mode
  mode: DeviceMode;
  modeLock?: boolean; // Prevent auto-switching

  // Wallpaper
  wallpaper: string; // Preset ID or custom URL
  wallpaperFit: 'cover' | 'contain' | 'stretch';

  // Icon Pack
  iconPack: 'ubuntu' | 'xp' | 'macos' | 'custom';
  iconSize: 'extra-small' | 'small' | 'medium' | 'large'; // Desktop icon size

  // Language
  language: 'en' | 'tr';

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSize;

  // Privacy
  analytics: boolean;
  crashReports: boolean;

  // Advanced
  showHiddenFiles: boolean;
  enableExperimentalFeatures: boolean;

  // Onboarding & assistant.
  // Optional on purpose: settings saved by earlier versions don't have these keys,
  // and `undefined` means "use the default" (see src/os/i18n and the store's persist merge).
  langOverride?: 'en' | 'tr'; // explicit UI language; undefined = follow the browser
  onboarded?: boolean; // the welcome window has been shown and closed once
  iconHintSeen?: boolean; // visitor already learned that desktop icons need a double-click
  widgetHidden?: boolean; // desktop intro widget dismissed
  assistantHidden?: boolean; // pixel assistant dismissed
}

// ============================================================================
// Event System Types
// ============================================================================

export type EventType =
  | 'WINDOW_OPENED'
  | 'WINDOW_CLOSED'
  | 'WINDOW_FOCUSED'
  | 'FILE_CREATED'
  | 'FILE_DELETED'
  | 'FILE_MOVED'
  | 'SETTINGS_CHANGED'
  | 'THEME_CHANGED';

export interface SystemEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: number;
}

export type EventHandler<T = unknown> = (event: SystemEvent<T>) => void;

// ============================================================================
// App Registry Types
// ============================================================================

export interface AppManifest {
  id: string; // Unique app identifier
  name: string; // Display name
  icon: string; // Icon path/identifier
  description?: string; // Short description
  defaultSize?: WindowBounds; // Default window size
  minSize?: { width: number; height: number }; // Minimum window size
  maxSize?: { width: number; height: number }; // Maximum window size
  singleton?: boolean; // Only one instance allowed
  capabilities?: string[]; // Required system capabilities
}
