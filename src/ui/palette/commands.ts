/**
 * What the command palette can do: actions (tour, CV, language ...) plus everything on the virtual
 * file system that is not hidden. Also the (tiny) fuzzy matcher.
 */
import { useStore } from '../../os/store';
import type { VFSNode } from '../../os/types';
import type { StringKey } from '../../os/i18n/full';
import { toggleLang, type Lang } from '../../os/i18n/full';
import type { LaunchTarget } from '../../os/hooks/useLaunch';
import { openSimpleView } from '../../os/view';
import { openStory } from '../../os/events';
import { openNodeWindow } from '../../os/utils/openNode';
import { fold } from '../../os/utils/text';
import { PROFILE } from '../../os/content/profile';
import { requestPetControl, requestTour } from '../pet/petEvents';
import { setSoundOn, soundOn } from '../../os/sound/ctx';
import { sfx } from '../../os/sound/sfx';
import { unlock } from '../../os/achievements';

export interface PaletteItem {
  id: string;
  label: string;
  /** Right-aligned note: a shortcut, or where a file lives. */
  hint?: string;
  icon: string;
  /** Extra words that should find this item (both languages). */
  keywords: string;
  group: 'actions' | 'open';
  run(): void;
}

export interface PaletteCtx {
  lang: Lang;
  t(key: StringKey): string;
  launch(target: LaunchTarget): void;
}

/** The assistant has to be on screen for the tour and for driving it. */
function withAssistant(action: () => void) {
  const { settings, updateSettings } = useStore.getState();
  if (settings.assistantHidden) {
    updateSettings({ assistantHidden: false });
    window.setTimeout(action, 2600); // it loads, runs in, then listens
  } else {
    action();
  }
}

export function buildItems(ctx: PaletteCtx): PaletteItem[] {
  const { t, launch, lang } = ctx;
  const tr = lang === 'tr';
  const { settings, updateSettings, nodes } = useStore.getState();
  const action = (id: string, icon: string, label: string, keywords: string, run: () => void, hint?: string): PaletteItem => ({
    id,
    icon,
    label,
    keywords,
    run,
    hint,
    group: 'actions',
  });

  const items: PaletteItem[] = [
    action('tour', '🧭', t('petMenuTour'), 'tour guide show around walk rehber gezdir gezi tanitim', () => requestTour()),
    action('control', '🎮', t('petMenuControl'), 'control drive twin pet play game kontrol sur ikiz oyna', () => withAssistant(requestPetControl)),
    action('career', '🗺️', t('palCareer'), 'career timeline history experience education kariyer zaman cizelgesi gecmis deneyim egitim oda room', () => launch('career')),
    action('aboutsite', '🛠️', t('palAboutSite'), 'how this site is built engineering stack tests ci performance nasil yapildi muhendislik bu site', () => launch('aboutsite')),
    action('story', '▶️', t('palStory'), 'story stories 30 seconds quick intro short tap hikaye saniye kisa tanitim', () => openStory()),
    action('glance', '🧾', t('palGlance'), 'recruiter hr hire at a glance summary card contact ik insan kaynaklari ozet kart tek bakista', () => launch('recruiter')),
    action('vcard', '📇', t('palVcard'), 'save contact vcard vcf address book rehber kisi kaydet kartvizit', () => void import('../../apps/recruiter/vcard').then((m) => m.downloadVCard(lang))),
    action('cv', '📄', t('petMenuCv'), 'cv resume curriculum ozgecmis', () => launch('cv')),
    action('cv-dl', '⬇️', t('downloadCv'), 'download cv resume pdf indir ozgecmis', () => {
      const a = document.createElement('a');
      a.href = PROFILE.cvUrl;
      a.download = 'YAMAC_BEZIRGAN_CV.pdf';
      a.click();
    }),
    action('projects', '🚀', t('petMenuProjects'), 'projects github repos work portfolio projeler calisma', () => launch('projects')),
    action('terminal', '🖥️', t('palTerminal'), 'terminal shell console command line komut konsol', () => launch('terminal')),
    action('achievements', '🏆', t('achTitle'), 'achievements trophies badges basarim kupa rozet', () => launch('achievements')),
    action('settings', '⚙️', t('palSettings'), 'settings preferences wallpaper ayarlar duvar kagidi', () => launch('settings')),
    action('welcome', '👋', t('petMenuWelcome'), 'welcome hello intro karsilama merhaba', () => launch('welcome')),
    action('simple', '📃', t('petMenuSimple'), 'simple view plain page text sade gorunum', () => openSimpleView()),
    action(
      'lang',
      '🌍',
      t('palSwitchLang'),
      'language english turkish turkce ingilizce dil tr en',
      () => toggleLang(),
      tr ? 'EN' : 'TR'
    ),
    action(
      'sound',
      soundOn() ? '🔇' : '🔊',
      soundOn() ? t('palSoundOff') : t('palSoundOn'),
      'sound audio music mute volume ses muzik sessiz',
      () => {
        const next = !soundOn();
        setSoundOn(next);
        if (next) {
          unlock('sound');
          sfx('ok');
        }
      }
    ),
    action(
      'assistant',
      '👾',
      settings.assistantHidden ? t('palAssistantShow') : t('palAssistantHide'),
      'assistant pet twin mascot hide show asistan ikiz gizle goster',
      () => updateSettings({ assistantHidden: !settings.assistantHidden })
    ),
    action('email', '✉️', t('emailMe'), 'email mail contact write iletisim yaz eposta', () => {
      window.location.href = `mailto:${PROFILE.email}`;
    }),
    action('linkedin', '💼', 'LinkedIn', 'linkedin profile social', () => void window.open(PROFILE.linkedin, '_blank', 'noopener')),
    action('github', '🐙', 'GitHub', 'github code repos profile', () => void window.open(PROFILE.github, '_blank', 'noopener')),
  ];

  // Everything on the desktop / in folders that is not hidden (secret places stay secret)
  const byId = nodes as Record<string, VFSNode>;
  const pathOf = (node: VFSNode): string => {
    const names: string[] = [];
    let cur: VFSNode | undefined = node.parentId ? byId[node.parentId] : undefined;
    while (cur && cur.id !== 'root') {
      names.unshift(cur.name);
      cur = cur.parentId ? byId[cur.parentId] : undefined;
    }
    return names.join(' › ');
  };
  const hiddenAbove = (node: VFSNode): boolean => {
    let cur: VFSNode | undefined = node;
    while (cur) {
      if (cur.hidden) return true;
      cur = cur.parentId ? byId[cur.parentId] : undefined;
    }
    return false;
  };
  // (these already have an action above: no second copy of "Terminal" or "Projects")
  const covered = new Set(['terminal-app', 'settings-app', 'projects', 'cv-pdf']);
  const seen = new Set<string>();
  for (const node of Object.values(byId)) {
    if (node.id === 'root' || covered.has(node.id) || hiddenAbove(node)) continue;
    // the Trash keeps old things, not places to go
    if (node.parentId === 'trash') continue;
    const icon = node.type === 'folder' ? '📁' : node.type === 'app' ? '🧩' : node.type === 'link' ? '🔗' : '📝';
    const label = node.name;
    const key = `${label}|${node.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `node:${node.id}`,
      icon: node.icon && /\p{Extended_Pictographic}/u.test(node.icon) ? node.icon : icon,
      label,
      hint: pathOf(node) || (tr ? 'Masaüstü' : 'Desktop'),
      keywords: node.type,
      group: 'open',
      run: () => void openNodeWindow(node),
    });
  }
  return items;
}

/** Higher is better; 0 = no match. Every word of the query must match somewhere. */
export function score(item: PaletteItem, query: string): number {
  const q = fold(query).trim();
  if (!q) return 1;
  const label = fold(item.label);
  const extra = fold(item.keywords + ' ' + (item.hint ?? ''));
  let total = 0;
  for (const word of q.split(/\s+/)) {
    let s = 0;
    if (label.startsWith(word)) s = 100;
    else if (label.split(/[\s._-]+/).some((w) => w.startsWith(word))) s = 70;
    else if (label.includes(word)) s = 40;
    else if (extra.split(/\s+/).some((w) => w.startsWith(word))) s = 25;
    else if (extra.includes(word)) s = 12;
    else if (word.length > 2 && isSubsequence(word, label)) s = 6;
    if (!s) return 0;
    total += s;
  }
  return total - Math.min(label.length, 40) * 0.05;
}

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const ch of hay) if (ch === needle[i] && ++i === needle.length) return true;
  return false;
}

export function search(items: PaletteItem[], query: string, limit = 9): PaletteItem[] {
  if (!query.trim()) {
    const order = ['tour', 'control', 'cv', 'projects', 'terminal', 'achievements', 'lang', 'sound'];
    return order.map((id) => items.find((i) => i.id === id)).filter((i): i is PaletteItem => !!i);
  }
  return items
    .map((item) => ({ item, s: score(item, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.item);
}
