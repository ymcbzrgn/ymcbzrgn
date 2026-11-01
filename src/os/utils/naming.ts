/**
 * Naming Utilities
 * Helper functions for generating unique file/folder names
 */

import type { VFSNode } from '../types';

/**
 * Generate a unique name by appending (N) if name already exists
 * @param baseName - Base name to use (e.g., "New Folder")
 * @param parentId - Parent folder ID to check siblings
 * @param nodes - All VFS nodes
 * @returns Unique name (e.g., "New Folder", "New Folder (2)", etc.)
 */
export function getUniqueName(
  baseName: string,
  parentId: string | null,
  nodes: Record<string, VFSNode>
): string {
  // Get all siblings in the same parent
  const siblings = Object.values(nodes).filter(
    (node) => node.parentId === parentId
  );

  // Check if base name is available
  const existingNames = new Set(siblings.map((node) => node.name));

  if (!existingNames.has(baseName)) {
    return baseName;
  }

  // Find first available name with (N) suffix
  let counter = 2;
  while (existingNames.has(`${baseName} (${counter})`)) {
    counter++;
  }

  return `${baseName} (${counter})`;
}

/**
 * Generate unique name for new folder
 * @param parentId - Parent folder ID
 * @param nodes - All VFS nodes
 * @returns Unique folder name
 */
export function getUniqueFolderName(
  parentId: string | null,
  nodes: Record<string, VFSNode>
): string {
  return getUniqueName('New Folder', parentId, nodes);
}

/**
 * Generate unique name for new text file
 * @param parentId - Parent folder ID
 * @param nodes - All VFS nodes
 * @returns Unique file name
 */
export function getUniqueTextFileName(
  parentId: string | null,
  nodes: Record<string, VFSNode>
): string {
  return getUniqueName('Untitled.txt', parentId, nodes);
}

/**
 * Validate file/folder name
 * @param name - Name to validate
 * @returns true if valid, error message if invalid
 */
export function validateName(name: string): true | string {
  if (!name || name.trim().length === 0) {
    return 'Name cannot be empty';
  }

  if (name.length > 255) {
    return 'Name is too long (max 255 characters)';
  }

  // Check for invalid characters (OS-specific, but these are universal)
  // eslint-disable-next-line no-control-regex -- control characters are exactly what a file name must not contain
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
  if (invalidChars.test(name)) {
    return 'Name contains invalid characters';
  }

  // Reserved names (Windows)
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  if (reserved.test(name)) {
    return 'Name is reserved';
  }

  return true;
}

/**
 * Check if name already exists in parent folder
 * @param name - Name to check
 * @param parentId - Parent folder ID
 * @param nodes - All VFS nodes
 * @param excludeNodeId - Optional node ID to exclude from check (for rename)
 * @returns true if name exists, false otherwise
 */
export function nameExists(
  name: string,
  parentId: string | null,
  nodes: Record<string, VFSNode>,
  excludeNodeId?: string
): boolean {
  return Object.values(nodes).some(
    (node) =>
      node.parentId === parentId &&
      node.name === name &&
      node.id !== excludeNodeId
  );
}
