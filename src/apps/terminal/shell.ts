/**
 * Small pure helpers for the terminal: quote-aware tokenizing, pipes and the text filters that can
 * sit behind a pipe (grep, head, tail, wc, sort, uniq, tac, nl), plus the `rm -rf /` detector.
 * No React, no store: easy to reason about and to test.
 */

/** Split a command line into words; single or double quotes keep spaces together. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let has = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (cur || has) out.push(cur);
      cur = '';
      has = false;
    } else cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}

/** Split on `|` that is not inside quotes. */
export function splitPipes(line: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === '|') {
      parts.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  parts.push(cur.trim());
  return parts;
}

export const FILTERS = new Set(['grep', 'head', 'tail', 'wc', 'sort', 'uniq', 'tac', 'nl']);

export interface FilterResult {
  ok: boolean;
  out: string;
}

const lines = (text: string) => (text === '' ? [] : text.split('\n'));

/** `-5` or `-n 5` / `-n5` */
function countArg(args: string[], fallback: number): { n: number; rest: string[] } {
  const rest: string[] = [];
  let n = fallback;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '-n' && args[i + 1] !== undefined) {
      n = Math.max(0, parseInt(args[i + 1], 10) || 0);
      i += 1;
    } else if (/^-n\d+$/.test(a)) n = parseInt(a.slice(2), 10);
    else if (/^-\d+$/.test(a)) n = parseInt(a.slice(1), 10);
    else rest.push(a);
  }
  return { n, rest };
}

export function runFilter(name: string, args: string[], input: string): FilterResult {
  const rows = lines(input);
  switch (name) {
    case 'grep': {
      let ignore = false;
      let invert = false;
      let count = false;
      let numbers = false;
      const rest: string[] = [];
      for (const a of args) {
        if (/^-[a-z]+$/i.test(a)) {
          ignore ||= a.includes('i');
          invert ||= a.includes('v');
          count ||= a.includes('c');
          numbers ||= a.includes('n');
        } else rest.push(a);
      }
      if (!rest.length) return { ok: false, out: 'Usage: grep [-i] [-v] [-c] [-n] <pattern>' };
      const source = rest[0];
      let re: RegExp;
      try {
        re = new RegExp(source, ignore ? 'i' : '');
      } catch {
        re = new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ignore ? 'i' : '');
      }
      const hits = rows.map((text, i) => ({ text, i })).filter((r) => re.test(r.text) !== invert);
      if (count) return { ok: true, out: String(hits.length) };
      return { ok: true, out: hits.map((r) => (numbers ? `${r.i + 1}:${r.text}` : r.text)).join('\n') };
    }
    case 'head': {
      const { n } = countArg(args, 10);
      return { ok: true, out: rows.slice(0, n).join('\n') };
    }
    case 'tail': {
      const { n } = countArg(args, 10);
      return { ok: true, out: n === 0 ? '' : rows.slice(-n).join('\n') };
    }
    case 'wc': {
      const words = input.trim() ? input.trim().split(/\s+/).length : 0;
      const chars = input.length;
      const flag = args.find((a) => /^-[lwc]$/.test(a));
      if (flag === '-l') return { ok: true, out: String(rows.length) };
      if (flag === '-w') return { ok: true, out: String(words) };
      if (flag === '-c') return { ok: true, out: String(chars) };
      return { ok: true, out: `${rows.length} ${words} ${chars}` };
    }
    case 'sort': {
      const sorted = [...rows].sort((a, b) => a.localeCompare(b));
      if (args.includes('-r')) sorted.reverse();
      return { ok: true, out: sorted.join('\n') };
    }
    case 'uniq': {
      const out: string[] = [];
      for (const r of rows) if (out[out.length - 1] !== r) out.push(r);
      return { ok: true, out: out.join('\n') };
    }
    case 'tac':
      return { ok: true, out: [...rows].reverse().join('\n') };
    case 'nl':
      return { ok: true, out: rows.map((r, i) => `${String(i + 1).padStart(4)}  ${r}`).join('\n') };
    default:
      return { ok: false, out: `${name}: not a filter` };
  }
}

/** `rm -rf /`, `sudo rm -rf /*`, `rm -fr /` ... the classic. */
export function isMeltdown(line: string): boolean {
  const words = tokenize(line.replace(/;.*$/, '')).filter((w) => w !== 'sudo');
  if (words[0] !== 'rm') return false;
  const flags = words.slice(1).filter((w) => w.startsWith('-')).join('');
  const targets = words.slice(1).filter((w) => !w.startsWith('-'));
  const recursive = /r|R/.test(flags) || words.includes('--recursive');
  const force = /f/.test(flags) || words.includes('--force');
  return recursive && force && targets.some((t) => t === '/' || t === '/*' || t === '~' || t === '~/' || t === '--no-preserve-root');
}

/** Pretty `tree` output for a node list (names only). */
export interface TreeNode {
  name: string;
  folder: boolean;
  children: TreeNode[];
}

export function drawTree(root: TreeNode, maxDepth = 3): string {
  const out: string[] = [root.name];
  const walk = (node: TreeNode, prefix: string, depth: number) => {
    if (depth >= maxDepth) return;
    node.children.forEach((child, i) => {
      const last = i === node.children.length - 1;
      out.push(`${prefix}${last ? '└── ' : '├── '}${child.name}${child.folder ? '/' : ''}`);
      if (child.folder) walk(child, prefix + (last ? '    ' : '│   '), depth + 1);
    });
  };
  walk(root, '', 0);
  return out.join('\n');
}
