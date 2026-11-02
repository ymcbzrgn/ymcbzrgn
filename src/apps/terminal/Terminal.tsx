/**
 * Terminal App
 * Interactive command-line interface with VFS integration
 */

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useVFSNodes, useVFSActions } from '../../os/store';
import type { VFSNode } from '../../os/types';
import { useLang, useT } from '../../os/i18n/full';
import { useLaunch } from '../../os/hooks/useLaunch';
import { openSimpleView } from '../../os/view';
import { useStore } from '../../os/store';
import { requestPetControl } from '../../ui/pet/petEvents';
import { PROFILE } from '../../os/content/profile';
import { PROFILE_TEXT } from '../../os/content/profileText';
import { SPRITE_ANIMS } from '../../assets/sprites/mascot.meta';
import { ACHIEVEMENT_IDS, unlock, unlockedAt } from '../../os/achievements';
import { DEFS } from '../../os/achievementDefs';
import { setSoundOn, soundOn } from '../../os/sound/ctx';
import { sfx } from '../../os/sound/sfx';
import { openStory, requestMeltdown } from '../../os/events';
import { openNodeWindow } from '../../os/utils/openNode';
import { fold } from '../../os/utils/text';
import { requestTour, sendPetScript } from '../../ui/pet/petEvents';
import { FILTERS, drawTree, isMeltdown, runFilter, splitPipes, tokenize, type TreeNode } from './shell';
import Neofetch from './Neofetch';
import { neofetchText } from './neofetchData';
import './Terminal.css';

interface TerminalProps {
  windowId: string;
  nodeId?: string;
}

interface CommandOutput {
  command: string;
  output: string;
  type: 'success' | 'error';
  /** rich output (neofetch); `output` is its plain-text version, used by pipes */
  node?: ReactNode;
}

export default function Terminal({ windowId }: TerminalProps) {
  const [history, setHistory] = useState<CommandOutput[]>([]);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState('/Desktop');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const vfsNodesRecord = useVFSNodes();
  const vfsNodes = Object.values(vfsNodesRecord);
  const { createNode, deleteNode, updateNode } = useVFSActions();
  const t = useT();
  const lang = useLang();
  const launch = useLaunch();

  // Focus input on mount and when clicking terminal
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  // Get current directory node
  const getCurrentDir = (): VFSNode | null => {
    if (currentPath === '/Desktop') {
      return vfsNodes.find(n => n.id === 'root') || null;
    }

    const pathParts = currentPath.split('/').filter(Boolean);
    let current: VFSNode | undefined = vfsNodes.find(n => n.id === 'root');

    for (let i = 1; i < pathParts.length; i++) {
      const part = pathParts[i];
      current = vfsNodes.find(n => n.parentId === current?.id && n.name === part);
      if (!current) return null;
    }

    return current || null;
  };

  // Get children of a directory
  const getChildren = (parentId: string): VFSNode[] => {
    return vfsNodes.filter(n => n.parentId === parentId);
  };

  // Find node by name in current directory
  const findNode = (name: string): VFSNode | null => {
    const currentDir = getCurrentDir();
    if (!currentDir) return null;
    return vfsNodes.find(n => n.parentId === currentDir.id && n.name === name) || null;
  };

  // Command: ls - list directory contents
  const cmdLs = (args: string[]): CommandOutput => {
    const currentDir = getCurrentDir();
    if (!currentDir) {
      return { command: input, output: 'Error: Current directory not found', type: 'error' };
    }

    const children = getChildren(currentDir.id);
    if (children.length === 0) {
      return { command: input, output: '(empty directory)', type: 'success' };
    }

    const items = children
      .map(node => {
        const icon = node.type === 'folder' ? '📁' :
                     node.type === 'file' ? '📄' :
                     node.type === 'app' ? '⚙️' : '🔗';
        return `${icon} ${node.name}`;
      })
      .join('\n');

    return { command: input, output: items, type: 'success' };
  };

  // Command: cd - change directory
  const cmdCd = (args: string[]): CommandOutput => {
    if (args.length === 0) {
      setCurrentPath('/Desktop');
      return { command: input, output: '', type: 'success' };
    }

    const target = args[0];

    // cd ..
    if (target === '..') {
      if (currentPath === '/Desktop') {
        return { command: input, output: 'Error: Already at root', type: 'error' };
      }
      const parts = currentPath.split('/').filter(Boolean);
      parts.pop();
      setCurrentPath('/' + parts.join('/'));
      return { command: input, output: '', type: 'success' };
    }

    // cd /
    if (target === '/') {
      setCurrentPath('/Desktop');
      return { command: input, output: '', type: 'success' };
    }

    // cd <dirname>
    const node = findNode(target);
    if (!node) {
      return { command: input, output: `Error: Directory not found: ${target}`, type: 'error' };
    }

    if (node.type !== 'folder') {
      return { command: input, output: `Error: Not a directory: ${target}`, type: 'error' };
    }

    setCurrentPath(`${currentPath}/${target}`);
    return { command: input, output: '', type: 'success' };
  };

  // Command: pwd - print working directory
  const cmdPwd = (args: string[]): CommandOutput => {
    return { command: input, output: currentPath, type: 'success' };
  };

  // Command: cat - read file contents
  const cmdCat = (args: string[]): CommandOutput => {
    if (args.length === 0) {
      return { command: input, output: 'Usage: cat <filename>', type: 'error' };
    }

    const filename = args[0];
    const node = findNode(filename);

    if (!node) {
      return { command: input, output: `Error: File not found: ${filename}`, type: 'error' };
    }

    if (node.type !== 'file') {
      return { command: input, output: `Error: Not a file: ${filename}`, type: 'error' };
    }

    // For data URLs, decode and show content
    if (node.targetUrl?.startsWith('data:')) {
      try {
        const base64Data = node.targetUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes); // (UTF-8: Turkish letters survive)
        return { command: input, output: decoded, type: 'success' };
      } catch (err) {
        return { command: input, output: 'Error: Failed to read file', type: 'error' };
      }
    }

    return { command: input, output: `(Binary file: ${node.name})`, type: 'success' };
  };

  // Command: echo - print text
  const cmdEcho = (args: string[]): CommandOutput => {
    return { command: input, output: args.join(' '), type: 'success' };
  };

  // Command: clear - clear terminal
  const cmdClear = (args: string[]): CommandOutput => {
    setHistory([]);
    return { command: '', output: '', type: 'success' };
  };

  // Command: mkdir - create directory
  const cmdMkdir = (args: string[]): CommandOutput => {
    if (args.length === 0) {
      return { command: input, output: 'Usage: mkdir <dirname>', type: 'error' };
    }

    const dirname = args[0];
    const currentDir = getCurrentDir();
    if (!currentDir) {
      return { command: input, output: 'Error: Current directory not found', type: 'error' };
    }

    // Check if already exists
    const existing = findNode(dirname);
    if (existing) {
      return { command: input, output: `Error: '${dirname}' already exists`, type: 'error' };
    }

    // Create new folder
    const newFolder: VFSNode = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'folder',
      name: dirname,
      parentId: currentDir.id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      readonly: false,
      hidden: false,
      starred: false,
    };

    createNode(newFolder);
    return { command: input, output: `Created directory: ${dirname}`, type: 'success' };
  };

  // Command: touch - create empty file
  const cmdTouch = (args: string[]): CommandOutput => {
    if (args.length === 0) {
      return { command: input, output: 'Usage: touch <filename>', type: 'error' };
    }

    const filename = args[0];
    const currentDir = getCurrentDir();
    if (!currentDir) {
      return { command: input, output: 'Error: Current directory not found', type: 'error' };
    }

    // Check if already exists
    const existing = findNode(filename);
    if (existing) {
      return { command: input, output: `Error: '${filename}' already exists`, type: 'error' };
    }

    // Create new empty file
    const newFile: VFSNode = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'file',
      name: filename,
      parentId: currentDir.id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      targetUrl: 'data:text/plain;base64,' + btoa(''),
      readonly: false,
      hidden: false,
      starred: false,
    };

    createNode(newFile);
    return { command: input, output: `Created file: ${filename}`, type: 'success' };
  };

  // Command: rm - remove file or directory
  const cmdRm = (args: string[]): CommandOutput => {
    if (args.length === 0) {
      return { command: input, output: 'Usage: rm <filename>', type: 'error' };
    }

    const filename = args[0];
    const node = findNode(filename);

    if (!node) {
      return { command: input, output: `Error: '${filename}' not found`, type: 'error' };
    }

    if (node.readonly) {
      return { command: input, output: `Error: '${filename}' is read-only`, type: 'error' };
    }

    // Check if directory has children
    if (node.type === 'folder') {
      const children = getChildren(node.id);
      if (children.length > 0) {
        return { command: input, output: `Error: Directory not empty. Use 'rm -r' to remove recursively.`, type: 'error' };
      }
    }

    deleteNode(node.id);
    return { command: input, output: `Removed: ${filename}`, type: 'success' };
  };

  // Command: cp - copy file
  const cmdCp = (args: string[]): CommandOutput => {
    if (args.length < 2) {
      return { command: input, output: 'Usage: cp <source> <destination>', type: 'error' };
    }

    const [srcName, dstName] = args;
    const srcNode = findNode(srcName);

    if (!srcNode) {
      return { command: input, output: `Error: '${srcName}' not found`, type: 'error' };
    }

    if (srcNode.type === 'folder') {
      return { command: input, output: `Error: Cannot copy directories yet`, type: 'error' };
    }

    // Check if destination already exists
    const existing = findNode(dstName);
    if (existing) {
      return { command: input, output: `Error: '${dstName}' already exists`, type: 'error' };
    }

    const currentDir = getCurrentDir();
    if (!currentDir) {
      return { command: input, output: 'Error: Current directory not found', type: 'error' };
    }

    // Create copy
    const newFile: VFSNode = {
      ...srcNode,
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: dstName,
      parentId: currentDir.id,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    createNode(newFile);
    return { command: input, output: `Copied: ${srcName} → ${dstName}`, type: 'success' };
  };

  // Command: mv - move/rename file
  const cmdMv = (args: string[]): CommandOutput => {
    if (args.length < 2) {
      return { command: input, output: 'Usage: mv <source> <destination>', type: 'error' };
    }

    const [srcName, dstName] = args;
    const srcNode = findNode(srcName);

    if (!srcNode) {
      return { command: input, output: `Error: '${srcName}' not found`, type: 'error' };
    }

    if (srcNode.readonly) {
      return { command: input, output: `Error: '${srcName}' is read-only`, type: 'error' };
    }

    // Check if destination already exists
    const existing = findNode(dstName);
    if (existing) {
      return { command: input, output: `Error: '${dstName}' already exists`, type: 'error' };
    }

    // Rename/move
    updateNode(srcNode.id, { name: dstName, modifiedAt: Date.now() });
    return { command: input, output: `Moved: ${srcName} → ${dstName}`, type: 'success' };
  };

  // Command: history - show command history
  const cmdHistory = (args: string[]): CommandOutput => {
    if (commandHistory.length === 0) {
      return { command: input, output: '(no command history)', type: 'success' };
    }

    const historyText = commandHistory
      .map((cmd, i) => `${i + 1}  ${cmd}`)
      .join('\n');

    return { command: input, output: historyText, type: 'success' };
  };

  // Command: man - manual for commands
  const cmdMan = (args: string[]): CommandOutput => {
    if (args.length === 0) {
      return { command: input, output: 'Usage: man <command>\nExample: man mkdir', type: 'error' };
    }

    const cmd = args[0].toLowerCase();
    const manPages: Record<string, string> = {
      ls: 'ls - List directory contents\nUsage: ls\nLists all files and folders in the current directory.',
      cd: 'cd - Change directory\nUsage: cd <dirname>\nChanges the current directory. Use ".." for parent, "/" for root.',
      pwd: 'pwd - Print working directory\nUsage: pwd\nDisplays the current directory path.',
      cat: 'cat - Display file contents\nUsage: cat <filename>\nPrints the contents of a text file.',
      echo: 'echo - Print text\nUsage: echo <text>\nPrints the specified text to the terminal.',
      clear: 'clear - Clear terminal screen\nUsage: clear\nClears all output from the terminal.',
      mkdir: 'mkdir - Make directory\nUsage: mkdir <dirname>\nCreates a new folder in the current directory.',
      touch: 'touch - Create empty file\nUsage: touch <filename>\nCreates a new empty file in the current directory.',
      rm: 'rm - Remove file/directory\nUsage: rm <filename>\nDeletes a file or empty directory.',
      cp: 'cp - Copy file\nUsage: cp <source> <destination>\nCopies a file to a new location.',
      mv: 'mv - Move/rename file\nUsage: mv <source> <destination>\nMoves or renames a file.',
      history: 'history - Command history\nUsage: history\nDisplays all previously executed commands.',
      man: 'man - Manual pages\nUsage: man <command>\nShows detailed help for a specific command.',
      whoami: 'whoami - Current user\nUsage: whoami\nDisplays the current user name.',
      date: 'date - Current date/time\nUsage: date\nDisplays the current date and time.',
      help: 'help - Show all commands\nUsage: help\nLists all available commands with examples.',
      tour: 'tour - Guided tour\nUsage: tour\nThe pixel twin shows you around: CV, projects, games, terminal, links.',
      neofetch: 'neofetch - System info\nUsage: neofetch\nThe twin next to the specs of this machine.',
      achievements: 'achievements - Trophies\nUsage: achievements\nLists what you unlocked and opens the Achievements window.',
      sound: 'sound - Sound effects\nUsage: sound [on|off]\nTurns the chiptune sound effects and music on or off.',
      pet: 'pet - Boss the twin around\nUsage: pet say <text> | pet do <move> | pet go <place> | pet list\nThe pixel twin must be switched on.',
      tree: 'tree - Folder tree\nUsage: tree\nDraws the folders and files below the current directory.',
      open: 'open - Open a file or app\nUsage: open <name>\nOpens it in a window, like a double-click.',
      git: 'git - Version history\nUsage: git log [--oneline] [-n N]\nThe real recent history of this site.',
      grep: 'grep - Search lines\nUsage: grep [-i] [-v] [-c] [-n] <pattern> [file]\nWorks on a file or behind a pipe.',
      head: 'head - First lines\nUsage: head [-n N] [file]\nWorks on a file or behind a pipe.',
      tail: 'tail - Last lines\nUsage: tail [-n N] [file]\nWorks on a file or behind a pipe.',
      wc: 'wc - Count\nUsage: wc [-l|-w|-c] [file]\nLines, words and characters.',
      sort: 'sort - Sort lines\nUsage: sort [-r] [file]',
      uniq: 'uniq - Drop repeated neighbours\nUsage: uniq [file]',
    };

    const manual = manPages[cmd];
    if (!manual) {
      return { command: input, output: `No manual entry for ${cmd}`, type: 'error' };
    }

    return { command: input, output: manual, type: 'success' };
  };

  // Command: whoami - show current user
  const cmdWhoami = (args: string[]): CommandOutput => {
    return { command: input, output: 'yamac@portfolio', type: 'success' };
  };

  // Command: date - show current date/time
  const cmdDate = (args: string[]): CommandOutput => {
    const now = new Date().toLocaleString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return { command: input, output: now, type: 'success' };
  };

  // ---- Portfolio commands (onboarding) ----
  const cmdAbout = (): CommandOutput => {
    const text = PROFILE_TEXT[lang];
    const lines = [
      `${PROFILE.name} - ${t('role')}`,
      '',
      text.summary,
      '',
      ...text.focus.map((line) => `* ${line}`),
      '',
      t('termMore'),
    ];
    return { command: input, output: lines.join('\n'), type: 'success' };
  };

  const cmdProjects = (): CommandOutput => {
    launch('projects');
    return { command: input, output: `${t('termOpeningProjects')}\n${PROFILE.github}`, type: 'success' };
  };

  const cmdCv = (): CommandOutput => {
    launch('cv');
    return { command: input, output: `${t('termOpeningCv')}\n${PROFILE.site}${PROFILE.cvUrl}`, type: 'success' };
  };

  const cmdContact = (): CommandOutput => {
    const lines = [
      `${t('termContact')}:`,
      `  email     ${PROFILE.email}`,
      `  linkedin  ${PROFILE.linkedin}`,
      `  github    ${PROFILE.github}`,
      `  web       ${PROFILE.site}`,
    ];
    return { command: input, output: lines.join('\n'), type: 'success' };
  };

  const cmdGlance = (): CommandOutput => {
    launch('recruiter');
    return { command: input, output: t('termOpeningGlance'), type: 'success' };
  };

  const cmdCareer = (): CommandOutput => {
    launch('career');
    return { command: input, output: t('termOpeningCareer'), type: 'success' };
  };

  const cmdSite = (): CommandOutput => {
    launch('aboutsite');
    return { command: input, output: t('termOpeningSite'), type: 'success' };
  };

  const cmdStory = (): CommandOutput => {
    window.setTimeout(openStory, 400);
    return { command: input, output: t('termOpeningStory'), type: 'success' };
  };

  const cmdVcard = (): CommandOutput => {
    void import('../recruiter/vcard').then((m) => m.downloadVCard(lang));
    return { command: input, output: t('termVcard'), type: 'success' };
  };

  const cmdSimple = (): CommandOutput => {
    // Let the output render before the page switches
    window.setTimeout(openSimpleView, 450);
    return { command: input, output: t('termOpeningSimple'), type: 'success' };
  };

  const cmdControl = (): CommandOutput => {
    if (useStore.getState().settings.assistantHidden) {
      return { command: input, output: t('termControlOff'), type: 'error' };
    }
    // Let the output render first; the twin then hands the keyboard over to itself
    window.setTimeout(requestPetControl, 350);
    return { command: input, output: t('termControlOn'), type: 'success' };
  };

  const cmdWelcome = (): CommandOutput => {
    launch('welcome');
    return { command: input, output: '', type: 'success' };
  };

  // ---- Extras: tour, neofetch, pet, git log, pipes ... ----
  const ok = (output: string, node?: ReactNode): CommandOutput => ({ command: input, output, type: 'success', node });
  const fail = (output: string): CommandOutput => ({ command: input, output, type: 'error' });
  const tr = lang === 'tr';

  const cmdTour = (): CommandOutput => {
    window.setTimeout(requestTour, 350);
    return ok(tr ? 'Tur başlıyor… (Esc ile durdurabilirsin)' : 'Starting the tour… (Esc stops it)');
  };

  const cmdNeofetch = (): CommandOutput => {
    unlock('neofetch');
    return ok(neofetchText(), <Neofetch />);
  };

  const cmdAchievements = (): CommandOutput => {
    const got = unlockedAt();
    const rows = DEFS.filter((d) => got[d.id]).map((d) => `${d.icon} ${d[lang][0]}`);
    launch('achievements');
    return ok([`${Object.keys(got).length}/${ACHIEVEMENT_IDS.length}`, ...rows].join('\n'));
  };

  const cmdSound = (args: string[]): CommandOutput => {
    const arg = args[0]?.toLowerCase();
    if (arg && arg !== 'on' && arg !== 'off') return fail('Usage: sound [on|off]');
    const next = arg ? arg === 'on' : !soundOn();
    setSoundOn(next); // (inside the Enter key press: lets the browser start the audio)
    if (next) {
      unlock('sound');
      sfx('ok');
    }
    return ok(next ? (tr ? 'Ses açık.' : 'Sound is on.') : tr ? 'Ses kapalı.' : 'Sound is off.');
  };

  const childrenOf = (id: string) =>
    getChildren(id)
      .filter((n) => !n.hidden && n.parentId !== 'trash')
      .sort((a, b) => ((a.type === 'folder') !== (b.type === 'folder') ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)));

  const cmdTree = (): CommandOutput => {
    const dir = getCurrentDir();
    if (!dir) return fail('Error: Current directory not found');
    const build = (n: VFSNode, depth: number): TreeNode => ({
      name: n.name,
      folder: n.type === 'folder',
      children: n.type === 'folder' && depth < 3 ? childrenOf(n.id).map((c) => build(c, depth + 1)) : [],
    });
    return ok(drawTree({ ...build(dir, 0), name: currentPath }));
  };

  const cmdOpen = (args: string[]): CommandOutput => {
    if (!args.length) return fail('Usage: open <name>');
    const node = findNode(args.join(' '));
    if (!node || node.hidden) return fail(`Error: '${args.join(' ')}' not found`);
    openNodeWindow(node);
    return ok(tr ? `${node.name} açılıyor…` : `Opening ${node.name}…`);
  };

  const cmdPet = (args: string[]): CommandOutput => {
    const sub = args[0]?.toLowerCase();
    const places = vfsNodes.filter((n) => n.parentId === 'root' && !n.hidden);
    if (!sub || sub === 'help') {
      return ok(
        [
          'pet say <text>      ' + (tr ? 'ikiz bir şey söyler' : 'the twin says something'),
          'pet do <move>       ' + (tr ? 'bir hareket yapar (pet list: hepsi)' : 'it performs a move (pet list: all of them)'),
          'pet go <place>      ' + (tr ? 'masaüstündeki bir yere koşar ve içine girer' : 'it runs to a desktop icon and hops in'),
          'pet list            ' + (tr ? 'hareketleri listeler' : 'list the moves'),
        ].join('\n')
      );
    }
    if (sub === 'list') {
      const skip = new Set(['idle', 'drag', 'walk', 'run', 'walkUp', 'walkDown', 'carryIdle', 'carryWalk', 'pickup', 'putdown']);
      return ok(Object.keys(SPRITE_ANIMS).filter((a) => !skip.has(a)).join(' '));
    }
    if (useStore.getState().settings.assistantHidden) return fail(t('termControlOff'));
    if (sub === 'say') {
      const text = args.slice(1).join(' ').trim();
      if (!text) return fail('Usage: pet say <text>');
      sendPetScript({ kind: 'say', text: text.slice(0, 140) });
      return ok('');
    }
    if (sub === 'do') {
      const name = args[1];
      if (!name) return fail('Usage: pet do <move>   (pet list)');
      const real = Object.keys(SPRITE_ANIMS).find((a) => a.toLowerCase() === name.toLowerCase());
      if (!real) return fail(`pet: ${tr ? 'böyle bir hareket yok' : 'no such move'}: ${name}`);
      sendPetScript({ kind: 'do', anim: real });
      return ok('');
    }
    if (sub === 'go') {
      const name = args.slice(1).join(' ');
      if (!name) return ok((tr ? 'Gidilebilecek yerler: ' : 'Places: ') + places.map((n) => n.name).join(', '));
      const q = fold(name);
      const hit = places.find((n) => fold(n.name) === q) ?? places.find((n) => fold(n.name).startsWith(q)) ?? places.find((n) => fold(n.name).includes(q));
      if (!hit) return fail(`pet: ${tr ? 'masaüstünde yok' : 'not on the desktop'}: ${name}`);
      sendPetScript({ kind: 'go', target: hit.id });
      return ok(tr ? `${hit.name} yoluna çıktı…` : `On its way to ${hit.name}…`);
    }
    return fail(`pet: ${tr ? 'bilinmeyen alt komut' : 'unknown subcommand'}: ${sub}`);
  };

  const cmdGit = (args: string[]): CommandOutput => {
    if (args[0] !== 'log') return fail(tr ? "git: bu terminalde yalnızca 'git log' var." : "git: only 'git log' is available here.");
    if (!__GIT_LOG__.length) return fail(tr ? '(bu sürümde geçmiş yok)' : '(no history in this build)');
    const oneline = args.includes('--oneline');
    const nIdx = args.indexOf('-n');
    const nArg = nIdx >= 0 ? args[nIdx + 1] : args.find((a) => /^-\d+$/.test(a))?.slice(1);
    const n = Math.max(1, parseInt(nArg ?? '', 10) || __GIT_LOG__.length);
    const rows = __GIT_LOG__.slice(0, n);
    const text = oneline
      ? rows.map((r) => `${r[0]} ${r[3]}`).join('\n')
      : rows.map((r) => `commit ${r[0]}\nAuthor: ${r[1]}\nDate:   ${r[2]}\n\n    ${r[3]}`).join('\n\n');
    return ok(text);
  };

  const cmdSudo = (args: string[]): CommandOutput => {
    unlock('sudo');
    const rest = args.join(' ').toLowerCase().replace(/[\s_]+/g, '-');
    if (rest === 'hire-me' || rest === 'hire-yamac') {
      sendPetScript({ kind: 'do', anim: 'celebrate' });
      sfx('celebrate');
      window.setTimeout(() => launch('recruiter'), 700);
      return ok(`[sudo] password for visitor: ********\n${tr ? 'İzin verildi.' : 'Permission granted.'}\n${PROFILE.email}`);
    }
    return fail(tr ? 'visitor, sudoers dosyasında değil. Bu olay rapor edilecek.' : 'visitor is not in the sudoers file. This incident will be reported.');
  };

  const cmdExit = (): CommandOutput => {
    window.setTimeout(() => useStore.getState().closeWindow(windowId), 250);
    return ok('logout');
  };

  /** rm -rf / : the desktop "crashes" and comes back; nothing is touched. */
  const cmdMeltdown = (): CommandOutput => {
    unlock('oops');
    window.setTimeout(requestMeltdown, 700);
    return fail(tr ? "rm: '/' siliniyor…\nrm: çekirdek paniği tetiklendi" : "rm: removing '/' …\nrm: kernel panic triggered");
  };

  /** grep / head / tail ... with a file instead of a pipe */
  const cmdFilter = (command: string, args: string[]): CommandOutput => {
    const file = [...args].reverse().find((a) => !a.startsWith('-') && findNode(a)?.type === 'file');
    if (!file) return fail(`${command}: ${tr ? 'bir dosya ver ya da boru (|) kullan' : 'give it a file, or use a pipe'}`);
    const content = cmdCat([file]);
    if (content.type === 'error') return content;
    const result = runFilter(command, args.filter((a) => a !== file), content.output);
    return result.ok ? ok(result.out) : fail(result.out);
  };

  const extrasHelp = tr
    ? `Eğlence ve portfolyo:
    glance          İK kartı: her şey tek ekranda
    story           "30 saniyede Yamaç", dokun-ilerle hikâye
    career          kariyer zaman çizelgesi (ikiz için bir oda)
    site            bu site nasıl yapıldı
    vcard           kişiyi rehbere kaydet (.vcf)
    tour            piksel ikizle rehberli tur
    neofetch        bu makinenin özellikleri
    achievements    başarımların
    sound [on|off]  ses efektleri
    pet <say|do|go> piksel ikizi yönet
    tree            klasör ağacını çiz
    open <ad>       dosya ya da uygulama aç
    git log         bu sitenin gerçek geçmişi
    cat About-Me.md | grep -i ai     (grep head tail wc sort uniq)
`
    : `Fun & portfolio extras:
    glance          the recruiter card: everything on one screen
    story           "Yamaç in 30 seconds", tap-through story
    career          the career timeline (a room for the twin)
    site            how this site is built
    vcard           save my contact (.vcf)
    tour            guided tour with the pixel twin
    neofetch        specs of this machine
    achievements    your trophies
    sound [on|off]  sound effects
    pet <say|do|go> boss the pixel twin around
    tree            draw the folder tree
    open <name>     open a file or an app
    git log         the real history of this site
    cat About-Me.md | grep -i ai     (grep head tail wc sort uniq)
`;

  // Command: help - show available commands
  const cmdHelp = (args: string[]): CommandOutput => {
    const helpText = `
${t('termHelpTitle')}:
    about           ${t('termHelpAbout')}
    projects        ${t('termHelpProjects')}
    cv              ${t('termHelpCv')}
    contact         ${t('termHelpContact')}
    simple          ${t('termHelpSimple')}
    control         ${t('termHelpControl')}

${extrasHelp}
Available Commands:
  File Navigation:
    ls              List directory contents
    cd <dir>        Change directory (use '..' for parent, '/' for root)
    pwd             Print working directory

  File Operations:
    cat <file>      Display file contents
    mkdir <dir>     Create new directory
    touch <file>    Create new empty file
    rm <file>       Remove file or empty directory
    cp <src> <dst>  Copy file
    mv <src> <dst>  Move/rename file

  Utilities:
    echo <text>     Print text to terminal
    history         Show command history
    man <cmd>       Show manual for command
    whoami          Display current user
    date            Show current date and time
    clear           Clear terminal screen
    help            Show this help message

Examples:
  mkdir projects           # Create 'projects' folder
  cd projects              # Enter projects folder
  touch README.md          # Create empty file
  echo "Hello" > file.txt  # (redirect not yet supported)
  cat README.md            # Read file contents
  cp file.txt backup.txt   # Copy file
  mv backup.txt old.txt    # Rename file
  rm old.txt               # Delete file
  cd ..                    # Go to parent directory
  history                  # View command history
  man mkdir                # Show help for mkdir
    `.trim();

    return { command: input, output: helpText, type: 'success' };
  };

  // One command (no pipes)
  const runOne = (cmd: string): CommandOutput => {
    const parts = tokenize(cmd.trim());
    if (!parts.length) {
      return { command: '', output: '', type: 'success' };
    }
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'ls':
        return cmdLs(args);
      case 'cd':
        return cmdCd(args);
      case 'pwd':
        return cmdPwd(args);
      case 'cat':
        return cmdCat(args);
      case 'echo':
        return cmdEcho(args);
      case 'clear':
        return cmdClear(args);
      case 'mkdir':
        return cmdMkdir(args);
      case 'touch':
        return cmdTouch(args);
      case 'rm':
        return cmdRm(args);
      case 'cp':
        return cmdCp(args);
      case 'mv':
        return cmdMv(args);
      case 'history':
        return cmdHistory(args);
      case 'man':
        return cmdMan(args);
      case 'whoami':
        return cmdWhoami(args);
      case 'date':
        return cmdDate(args);
      case 'help':
        return cmdHelp(args);
      case 'about':
        return cmdAbout();
      case 'projects':
        return cmdProjects();
      case 'cv':
        return cmdCv();
      case 'contact':
        return cmdContact();
      case 'simple':
        return cmdSimple();
      case 'glance':
      case 'recruiter':
        return cmdGlance();
      case 'vcard':
        return cmdVcard();
      case 'story':
        return cmdStory();
      case 'career':
        return cmdCareer();
      case 'site':
        return cmdSite();
      case 'control':
      case 'drive':
        return cmdControl();
      case 'welcome':
        return cmdWelcome();
      case 'tour':
        return cmdTour();
      case 'neofetch':
        return cmdNeofetch();
      case 'achievements':
      case 'trophies':
        return cmdAchievements();
      case 'sound':
        return cmdSound(args);
      case 'tree':
        return cmdTree();
      case 'open':
        return cmdOpen(args);
      case 'pet':
        return cmdPet(args);
      case 'git':
        return cmdGit(args);
      case 'sudo':
        return cmdSudo(args);
      case 'exit':
      case 'quit':
        return cmdExit();
      default:
        if (FILTERS.has(command)) return cmdFilter(command, args);
        return {
          command: input,
          output: `Command not found: ${command}\nType 'help' for available commands.`,
          type: 'error'
        };
    }
  };

  // Command dispatcher: rm -rf / is a joke, `a | b | c` is a pipeline, everything else runs as is
  const executeCommand = (cmd: string): CommandOutput => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      return { command: '', output: '', type: 'success' };
    }
    if (isMeltdown(trimmed)) return cmdMeltdown();

    const segments = splitPipes(trimmed);
    if (segments.length < 2) return runOne(trimmed);

    let current = runOne(segments[0]);
    if (current.type === 'error') return { ...current, command: input };
    let text = current.output;
    for (const segment of segments.slice(1)) {
      const [name, ...args] = tokenize(segment);
      const filter = name?.toLowerCase() ?? '';
      if (!FILTERS.has(filter)) return fail(`${name || '|'}: ${tr ? 'borudan sonra kullanılamaz (grep, head, tail, wc, sort, uniq, tac, nl)' : 'cannot be used after a pipe (grep, head, tail, wc, sort, uniq, tac, nl)'}`);
      const result = runFilter(filter, args, text);
      if (!result.ok) return fail(result.out);
      text = result.out;
    }
    unlock('pipe');
    current = ok(text);
    return current;
  };

  // Handle command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const result = executeCommand(input);

    if (result.command || result.output) {
      setHistory(prev => [...prev, result]);
    }

    // Add to command history
    if (input.trim()) {
      setCommandHistory(prev => [...prev, input.trim()]);
      setHistoryIndex(-1);
    }

    setInput('');
  };

  // Handle arrow key navigation through command history
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      const newIndex = historyIndex === -1
        ? commandHistory.length - 1
        : Math.max(0, historyIndex - 1);

      setHistoryIndex(newIndex);
      setInput(commandHistory[newIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;

      const newIndex = historyIndex + 1;

      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
  };

  return (
    <div className="terminal-app" onClick={() => inputRef.current?.focus()}>
      {/* Header */}
      <div className="terminal-app__header">
        <span className="terminal-app__title">Terminal</span>
        <span className="terminal-app__subtitle">yamac@portfolio:~$</span>
      </div>

      {/* Output */}
      <div className="terminal-app__output" ref={outputRef}>
        {/* Welcome message */}
        {history.length === 0 && (
          <div className="terminal-app__welcome">
            Welcome to Yamac's Portfolio Terminal!
            <br />
            Start with 'about', or type 'help' for all commands.
            <br />
            <br />
          </div>
        )}

        {/* Command history */}
        {history.map((entry, i) => (
          <div key={i} className="terminal-app__entry">
            {entry.command && (
              <div className="terminal-app__command">
                <span className="terminal-app__prompt">{currentPath}$</span> {entry.command}
              </div>
            )}
            {entry.node ? (
              <div className="terminal-app__result terminal-app__result--success">{entry.node}</div>
            ) : (
              entry.output && (
                <div className={`terminal-app__result terminal-app__result--${entry.type}`}>
                  {entry.output}
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="terminal-app__input-wrapper">
        <span className="terminal-app__prompt">{currentPath}$</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-app__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}
