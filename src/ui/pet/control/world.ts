/** Reading the desktop (icons, windows) for the twin: all DOM based, nothing is cached for long. */

export interface IconTarget {
  id: string;
  name: string;
  type: string;
  rect: DOMRect;
}

const iconEl = (id: string) => document.querySelector<HTMLElement>(`.desktop-icon[data-node-id="${CSS.escape(id)}"]`);

function describe(el: HTMLElement): IconTarget {
  return {
    id: el.dataset.nodeId ?? '',
    name: el.querySelector('.desktop-icon__label')?.textContent?.trim() ?? '',
    type: el.dataset.nodeType ?? '',
    rect: el.getBoundingClientRect(),
  };
}

export function getIcon(id: string): IconTarget | null {
  const el = iconEl(id);
  return el ? describe(el) : null;
}

/** The desktop icon closest to a point (the twin's soles), if one is near enough and not hidden under a window. */
export function findIconNear(px: number, py: number, maxDist = 64): IconTarget | null {
  let best: HTMLElement | null = null;
  let bestD = maxDist;
  for (const el of document.querySelectorAll<HTMLElement>('.desktop-icon[data-node-id]')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const d = Math.hypot(Math.max(r.left - px, 0, px - r.right), Math.max(r.top - py, 0, py - r.bottom));
    if (d >= bestD) continue;
    // Skip icons a window is covering
    const top = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((n) => !n.closest('.pet'));
    if (top && el.contains(top)) {
      best = el;
      bestD = d;
    }
  }
  return best ? describe(best) : null;
}

/** Typing somewhere: leave the keyboard alone. */
export function isTypingTarget(el: HTMLElement | null): boolean {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return true;
  return !!el.closest('[role="textbox"], [contenteditable="true"], .xterm');
}

/** Buttons and links use Space/Enter themselves. */
export function isActivatable(el: HTMLElement | null): boolean {
  return !!el?.closest?.('button, a[href], summary, [role="button"], [role="menuitem"], [role="tab"]');
}
