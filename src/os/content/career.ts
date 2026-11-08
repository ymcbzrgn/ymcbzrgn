/**
 * Career facts in one place. The build-time pages (résumé, JSON-LD, llms.txt), the recruiter card,
 * the mobile story and the career room all read from here, so a fact is written once.
 *
 * Source: the CV. The PDF in public/ (YAMAC_BEZIRGAN_CURRENT_CV.pdf) is a separate file and can lag behind
 * this one until a new export is swapped in. When the CV changes, change this file too.
 * Pure data and pure functions, no browser APIs: the build (vite.config.ts) imports it as well.
 */
import type { Lang } from '../i18n/core';

export type L10n = Record<Lang, string>;

/** 'YYYY-MM' */
type Month = string;

export interface Role {
  id: string;
  org: string;
  kind: 'work' | 'intern';
  title: L10n;
  /** what the title does not say, shown next to the employer (the CV's "de facto team lead and product owner") */
  note?: L10n;
  start: Month;
  /** null = still there; the same month as `start` = a single month */
  end: Month | null;
  points: L10n[];
}

/** 'YYYY' or 'YYYY-MM' */
type When = string;

export interface Study {
  id: string;
  school: L10n;
  degree: L10n;
  start: When;
  end: When;
  focus?: L10n;
  courses: L10n;
}

export interface Project {
  id: string;
  /** the address of its page: /projects/<slug>/ (and /tr/projeler/<slug>/) */
  slug: string;
  name: string;
  stack: string;
  summary: L10n;
  /** a repo we know exists; other links come from the GitHub snapshot by name */
  repo?: string;
}

export interface Medal {
  id: string;
  name: string;
  /** the place, or what he did when there was no ranking */
  result: L10n;
  /** his part in the team, next to a place */
  role?: L10n;
  when: When;
  podium: boolean;
}

/** A product he built and runs alone: it has its own address, which is the link. */
export interface Product {
  id: string;
  name: string;
  url: string;
  /** a few words on what kind of thing it is */
  kind: L10n;
  summary: L10n;
  since: Month;
}

export const ROLES: Role[] = [
  {
    id: 'arketic',
    org: 'Arketic AI',
    kind: 'work',
    title: { en: 'Software Engineer', tr: 'Yazılım Mühendisi' },
    note: { en: 'De facto team lead and product owner', tr: 'Fiili takım lideri ve ürün sahibi' },
    start: '2026-01',
    end: null,
    // (the Story card "Right now" shows points 0, 4 and 5)
    points: [
      {
        en: 'Lead a team of three: run planning, review code, mentor one-to-one, join interviews.',
        tr: 'Üç kişilik bir ekibi yönetiyorum: planlamayı yürütüyor, kodu inceliyor, birebir mentorluk yapıyor, mülakatlara katılıyorum.',
      },
      {
        en: 'Assign a team member to each client account.',
        tr: 'Her müşteri hesabına bir ekip üyesi atıyorum.',
      },
      {
        en: 'Set the roadmap and approve releases, using AI and page usage data to rank priorities.',
        tr: 'Yol haritasını belirliyor ve sürümleri onaylıyorum. Öncelikleri yapay zeka ve sayfa kullanım verisiyle sıralıyorum.',
      },
      {
        en: 'Have assigned all team work since spring 2026.',
        tr: "İlkbahar 2026'dan beri ekibin bütün işlerini ben dağıtıyorum.",
      },
      {
        en: 'Main builder of the core product.',
        tr: 'Çekirdek ürünün ana geliştiricisiyim.',
      },
      {
        en: 'The platform runs AI assistants, agents and no-code workflows for HR, Finance, IT and R&D teams.',
        tr: 'Platform; İK, Finans, BT ve Ar-Ge ekipleri için yapay zeka asistanları, ajanlar ve no-code iş akışları çalıştırıyor.',
      },
      {
        en: 'Deployed on-premise and in private cloud with role-based access and audit trails.',
        tr: 'Platform on-premise ve özel bulutta çalışıyor; rol tabanlı erişim ve denetim izi var.',
      },
      {
        en: 'Built BI and automation features for KPI reporting, summaries, approvals, and task execution.',
        tr: 'KPI raporlama, özetleme, onay ve görev yürütme için BI ve otomasyon özellikleri geliştirdim.',
      },
      {
        en: 'Integrated business systems and team tools for fast rollout without rip-and-replace migrations.',
        tr: 'Mevcut sistemler yerinde kalırken platform hızla devreye girsin diye iş sistemlerini ve ekip araçlarını entegre ettim.',
      },
    ],
  },
  {
    id: 'arketic-intern',
    org: 'Arketic AI',
    kind: 'intern',
    title: { en: 'Software Engineer Intern', tr: 'Yazılım Mühendisi Stajyeri' },
    start: '2025-06',
    end: '2025-12',
    points: [
      {
        en: 'Took on team coordination in Nov 2025 as an intern.',
        tr: "Kasım 2025'te stajyerken ekip koordinasyonunu üstlendim.",
      },
    ],
  },
  {
    id: 'exagate',
    org: 'Exagate',
    kind: 'intern',
    title: { en: 'Intern (front-end development)', tr: 'Stajyer (front-end geliştirme)' },
    start: '2023-08',
    end: '2023-08',
    points: [
      {
        en: 'Contributed to front-end delivery and Node.js web projects, from design to launch.',
        tr: 'Tasarımdan yayına kadar front-end ve Node.js web projelerinde görev aldım.',
      },
      {
        en: 'Improved UI responsiveness and scalability with optimized React patterns and state handling.',
        tr: 'React kalıplarını ve durum yönetimini optimize ederek arayüzü daha hızlı tepki verir ve daha ölçeklenebilir hale getirdim.',
      },
      {
        en: 'Wrote process documentation so other projects could reuse the work.',
        tr: 'Başka projeler de kullanabilsin diye süreç dokümantasyonu yazdım.',
      },
      {
        en: 'Worked with cross-functional teams to integrate the projects.',
        tr: 'Projeleri entegre etmek için farklı disiplinlerden ekiplerle çalıştım.',
      },
    ],
  },
];

export const STUDIES: Study[] = [
  {
    id: 'altinbas',
    school: { en: 'Altınbaş University', tr: 'Altınbaş Üniversitesi' },
    degree: { en: 'B.Sc. in Computer Engineering', tr: 'Bilgisayar Mühendisliği, Lisans' },
    start: '2020-09',
    end: '2026-01',
    courses: {
      en: 'Data Structures, Algorithms, Artificial Intelligence, Database Systems, Image Processing',
      tr: 'Veri Yapıları, Algoritmalar, Yapay Zeka, Veritabanı Sistemleri, Görüntü İşleme',
    },
  },
  {
    id: 'milan',
    school: { en: 'Università degli Studi di Milano', tr: 'Milano Üniversitesi (Università degli Studi di Milano)' },
    degree: { en: 'Erasmus+ Exchange Program', tr: 'Erasmus+ Değişim Programı' },
    start: '2022',
    end: '2023',
    focus: { en: 'Advanced Software Development and Artificial Intelligence', tr: 'İleri Yazılım Geliştirme ve Yapay Zeka' },
    courses: {
      en: 'Intelligent Systems, Real-Time Graphics Programming, Natural Interaction',
      tr: 'Akıllı Sistemler, Gerçek Zamanlı Grafik Programlama, Doğal Etkileşim',
    },
  },
];

export const SKILLS: { group: L10n; items: string[]; /** a way of working, not a tool: left out of the chips of the cards */ practice?: boolean }[] = [
  { group: { en: 'Programming languages', tr: 'Programlama dilleri' }, items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  { group: { en: 'Front-end & mobile', tr: 'Front-end ve mobil' }, items: ['React', 'React Native', 'Expo'] },
  { group: { en: 'Backend & data', tr: 'Backend ve veri' }, items: ['Node.js', 'Express.js', 'REST APIs', 'PostgreSQL', 'Supabase', 'OAuth/JWT'] },
  { group: { en: 'AI & automation', tr: 'Yapay zeka ve otomasyon' }, items: ['LLM Integration', 'RAG', 'AI Agents', 'MCP Servers', 'Automation', 'n8n'] },
  { group: { en: 'Delivery', tr: 'Teslimat' }, items: ['Docker', 'Git', 'CI/CD', 'GitHub Actions'] },
  {
    group: { en: 'Product', tr: 'Ürün' },
    items: ['Roadmapping', 'Release planning', 'Usage analytics', 'App Store optimisation'],
    practice: true,
  },
];

/** The tools among the skills: what the stack chips of the recruiter card and the story show. */
export const TOOLS: string[] = SKILLS.filter((g) => !g.practice).flatMap((g) => g.items);

export const SPOKEN: { code: string; name: L10n; level: L10n }[] = [
  { code: 'tr', name: { en: 'Turkish', tr: 'Türkçe' }, level: { en: 'Native', tr: 'Ana dil' } },
  { code: 'en', name: { en: 'English', tr: 'İngilizce' }, level: { en: 'Professional working proficiency', tr: 'Mesleki çalışma yeterliliği' } },
  { code: 'it', name: { en: 'Italian', tr: 'İtalyanca' }, level: { en: 'A1', tr: 'A1' } },
  { code: 'de', name: { en: 'German', tr: 'Almanca' }, level: { en: 'A1', tr: 'A1' } },
];

export const MEDALS: Medal[] = [
  { id: 'ideathon', name: "Ideathon'25", result: { en: '2nd place', tr: 'İkincilik' }, when: '2025', podium: true },
  {
    id: 'llama',
    name: 'Meta & YTU Llama Hackathon',
    result: { en: '6th place', tr: 'Altıncılık' },
    role: { en: 'Project lead of a 4-person team', tr: '4 kişilik ekibin proje lideri' },
    when: '2025-10',
    podium: true,
  },
  {
    id: 'kkb',
    name: 'KKB Agentic AI Hackathon',
    result: { en: 'Tech lead of a 3-person team', tr: '3 kişilik ekibin teknik lideri' },
    when: '2025-12',
    podium: false,
  },
  { id: 'aimpact', name: 'AImpact Hackathon', result: { en: 'Participant', tr: 'Katılımcı' }, when: '2025-12', podium: false },
  { id: 'neova', name: 'Neova Ideathon', result: { en: 'Participant', tr: 'Katılımcı' }, when: '2026-11', podium: false },
];

export const PROGRAMS: { name: string; by: string }[] = [
  { name: 'Introduction to Big Data', by: 'BTK Akademi' },
  { name: 'CEO Career Summit', by: 'Youthall' },
  { name: 'Preparing to My New Job', by: 'Kodluyoruz' },
  { name: '18. MÜYAK', by: 'Endüstri ve Verimlilik Kulübü' },
];

export const PROJECTS: Project[] = [
  {
    id: 'hydraquant',
    slug: 'hydraquant',
    name: 'HydraQuant',
    stack: 'Python · Quant AI',
    summary: {
      en: 'AI-assisted crypto trading platform for research, signal generation and execution, with decision and risk workflows for signal scoring, position sizing and trade automation.',
      tr: 'Araştırma, sinyal üretimi ve işlem yürütme için yapay zeka destekli kripto ticaret platformu; sinyal puanlama, pozisyon boyutlandırma ve işlem otomasyonu için karar ve risk akışları.',
    },
  },
  {
    id: 'portfolio',
    slug: 'desktop-os-portfolio',
    name: 'Yamac-Bezirgan',
    stack: 'React · TypeScript',
    repo: 'https://github.com/ymcbzrgn/ymcbzrgn',
    summary: {
      en: 'This site: an interactive portfolio that recreates a desktop operating system in the browser, with a persistent virtual file system and built-in apps (PDF viewer, terminal, markdown reader, GitHub explorer).',
      tr: 'Bu site: tarayıcıda masaüstü işletim sistemini yeniden yaratan etkileşimli portfolyo; kalıcı sanal dosya sistemi ve yerleşik uygulamalar (PDF görüntüleyici, terminal, markdown okuyucu, GitHub gezgini).',
    },
  },
  {
    id: 'quirkllm',
    slug: 'quirkllm',
    name: 'QuirkLLM',
    stack: 'Python · Local LLMs',
    summary: {
      en: 'Local CLI coding assistant, a privacy-focused alternative to cloud developer tools, with RAM-aware runtime profiles that adapt context, caching and inference to the machine.',
      tr: 'Bulut geliştirici araçlarına gizlilik odaklı bir alternatif olan yerel CLI kodlama asistanı; bağlamı, önbelleği ve çıkarımı makineye göre ayarlayan RAM duyarlı çalışma profilleri.',
    },
  },
  {
    id: 'shiffy',
    slug: 'shiffy',
    name: 'Shiffy',
    stack: 'React Native · Node.js · Llama',
    summary: {
      en: 'Mobile-first shift management platform for managers and part-time employees; Llama 3.2 drafts schedules from availability and manager notes. Full-stack MVP on Expo, Express and Supabase.',
      tr: 'Yöneticiler ve yarı zamanlı çalışanlar için mobil öncelikli vardiya yönetim platformu; Llama 3.2, müsaitlik ve yönetici notlarından taslak plan üretir. Expo, Express ve Supabase ile uçtan uca MVP.',
    },
  },
  {
    id: 'canny',
    slug: 'canny-edge-detection',
    name: 'Canny Edge Detection GUI',
    stack: 'Python · OpenCV',
    summary: {
      en: 'Canny edge detection implemented from scratch (Sobel gradients, non-maximum suppression, double thresholding, hysteresis) with a desktop UI that shows every stage of the pipeline.',
      tr: 'Canny kenar algılamanın sıfırdan uygulaması (Sobel gradyanları, maksimum olmayan bastırma, çift eşikleme, histerezis) ve hattın her aşamasını gösteren masaüstü arayüzü.',
    },
  },
];

/**
 * The products he built and runs alone (the CV's "Independent products"). They have their own addresses,
 * not a case study here, so the résumé page, llms.txt and the home page's boot block link out to them.
 * Only what the CV says; a count carries its date.
 */
export const PRODUCTS: Product[] = [
  {
    id: 'swipflix',
    name: 'Swipflix',
    url: 'https://swipflix.yamacbezirgan.com',
    kind: { en: 'iOS', tr: 'iOS' },
    summary: {
      en: 'Group movie picker for iOS. On the App Store since Dec 2025, with 5,400+ downloads by Nov 2026.',
      tr: "iOS için grup halinde film seçme uygulaması. Aralık 2025'ten beri App Store'da, Kasım 2026 itibarıyla 5.400+ indirme.",
    },
    since: '2025-12',
  },
  {
    id: 'engineering-corpus',
    name: 'Engineering Corpus',
    url: 'https://engineeringcorpus.com',
    kind: { en: 'Open-core · MCP', tr: 'Open-core · MCP' },
    summary: {
      en: 'Licence-aware code search for AI coding agents, served over MCP. The engine is MIT, the hosted service is paid. Beta waitlist open.',
      tr: 'Yapay zeka kodlama ajanları için lisansa duyarlı kod arama, MCP üzerinden çalışıyor. Motor MIT lisanslı, barındırılan servis ücretli. Beta bekleme listesi açık.',
    },
    since: '2026-10',
  },
  {
    id: 'meenikai',
    name: 'Meenikai',
    url: 'https://meenik.ai',
    kind: { en: 'Web app', tr: 'Web uygulaması' },
    summary: {
      en: 'Autonomous marketing engine for solo founders. Waitlist open.',
      tr: 'Solo kurucular için otonom pazarlama motoru. Bekleme listesi açık.',
    },
    since: '2026-05',
  },
  {
    id: 'lingoswap',
    name: 'LingoSwap',
    url: 'https://lingoswap.xyz',
    kind: { en: 'Web app', tr: 'Web uygulaması' },
    summary: {
      en: 'Learn languages by reading. Free, live in 22 languages.',
      tr: 'Okuyarak dil öğrenme. Ücretsiz, 22 dilde yayında.',
    },
    since: '2025-11',
  },
  {
    id: 'selffork',
    name: 'SelfFork',
    url: 'https://github.com/ymcbzrgn/SelfFork',
    kind: { en: 'Open source', tr: 'Açık kaynak' },
    summary: {
      en: 'Open-source coding orchestrator that runs coding agents on a local LLM from a PRD. In development.',
      tr: 'Kodlama ajanlarını bir PRD üzerinden yerel bir LLM ile çalıştıran açık kaynak orkestratör. Geliştirme aşamasında.',
    },
    since: '2026-04',
  },
];

/** What he works on, as a phrase that fits after "Software Engineer at Arketic AI: ". */
export const FOCUS: L10n = {
  en: 'AI platforms, backend architecture and full-stack product development',
  tr: 'yapay zeka platformları, backend mimarisi ve uçtan uca ürün geliştirme',
};

/** One sentence about what he does, per language (cards, stories, JSON-LD). */
export const PITCH: L10n = {
  en: `Software engineer focused on ${FOCUS.en}.`,
  tr: 'Yapay zeka platformları, backend mimarisi ve uçtan uca ürün geliştirme odağında yazılım mühendisi.',
};

/** Highlights for the recruiter card and the story (short, factual, all from the CV). */
export interface Highlight {
  icon: string;
  title: L10n;
  text: L10n;
}

export const HIGHLIGHTS: Highlight[] = [
  {
    icon: '🏢',
    title: { en: 'Now', tr: 'Şu an' },
    text: {
      en: 'Software Engineer at Arketic AI since January 2026, after joining as an intern in June 2025. De facto team lead and product owner; leads a team of three.',
      tr: "Ocak 2026'dan beri Arketic AI'da yazılım mühendisi, şirkete Haziran 2025'te stajyer olarak girdi. Fiili takım lideri ve ürün sahibi, üç kişilik bir ekibi yönetiyor.",
    },
  },
  {
    icon: '🔐',
    title: { en: 'Production', tr: 'Canlıda' },
    text: {
      en: 'On-premise and private-cloud deployments with role-based access and audit trails; AI assistants and agents for HR, Finance, IT and R&D.',
      tr: 'On-premise ve özel bulut kurulumları, rol tabanlı erişim ve denetim iziyle; İK, Finans, BT ve Ar-Ge için yapay zeka asistanları ve ajanlar.',
    },
  },
  {
    icon: '🏆',
    title: { en: 'Competitions', tr: 'Yarışmalar' },
    text: {
      en: "2nd place at Ideathon'25 and 6th at the Meta & YTU Llama Hackathon.",
      tr: "Ideathon'25 ikincisi, Meta & YTU Llama Hackathon altıncısı.",
    },
  },
  {
    icon: '🎓',
    title: { en: 'Education', tr: 'Eğitim' },
    text: {
      en: 'B.Sc. Computer Engineering (Altınbaş, January 2026), with an Erasmus+ exchange in Milan (2022–2023) focused on software and AI.',
      tr: "Bilgisayar Mühendisliği lisansı (Altınbaş, Ocak 2026), Milano'da yazılım ve yapay zeka odaklı Erasmus+ değişimi (2022–2023).",
    },
  },
  {
    icon: '🌍',
    title: { en: 'Languages', tr: 'Diller' },
    text: {
      en: 'Turkish (native), English (professional working proficiency), Italian and German (A1).',
      tr: 'Türkçe (ana dil), İngilizce (mesleki çalışma yeterliliği), İtalyanca ve Almanca (A1).',
    },
  },
  {
    icon: '📱',
    title: { en: 'Products', tr: 'Ürünler' },
    text: {
      en: 'Swipflix, a group movie picker, has been on the App Store since Dec 2025 (5,400+ downloads by Nov 2026). Also Engineering Corpus, Meenikai, LingoSwap and SelfFork.',
      tr: "Grup halinde film seçme uygulaması Swipflix Aralık 2025'ten beri App Store'da (Kasım 2026 itibarıyla 5.400+ indirme). Ayrıca Engineering Corpus, Meenikai, LingoSwap ve SelfFork.",
    },
  },
];

/** Entries for the timeline (career room, story): newest last. */
export interface Milestone {
  id: string;
  year: string;
  icon: string;
  title: L10n;
  text: L10n;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'altinbas',
    year: '2020',
    icon: '🎓',
    title: { en: 'Altınbaş University', tr: 'Altınbaş Üniversitesi' },
    text: { en: 'Starts B.Sc. in Computer Engineering.', tr: 'Bilgisayar Mühendisliği lisansına başlar.' },
  },
  {
    id: 'milan',
    year: '2022',
    icon: '🇮🇹',
    title: { en: 'Erasmus+ in Milan', tr: "Milano'da Erasmus+" },
    text: {
      en: 'Erasmus+ exchange at the Università degli Studi di Milano: Intelligent Systems, Real-Time Graphics, Natural Interaction.',
      tr: 'Milano Üniversitesi’nde Erasmus+ değişimi: Akıllı Sistemler, Gerçek Zamanlı Grafik, Doğal Etkileşim.',
    },
  },
  {
    id: 'exagate',
    year: '2023',
    icon: '🧑‍💻',
    title: { en: 'Exagate internship', tr: 'Exagate stajı' },
    text: { en: 'Front-end and Node.js web projects, from design to launch.', tr: 'Tasarımdan yayına front-end ve Node.js web projeleri.' },
  },
  {
    id: 'ideathon',
    year: '2025',
    icon: '🏆',
    title: { en: "Ideathon'25, 2nd place", tr: "Ideathon'25, ikincilik" },
    text: { en: 'Podium finish. Sixth at the Meta & YTU Llama Hackathon.', tr: "Kürsü. Meta & YTU Llama Hackathon'da altıncılık." },
  },
  {
    id: 'arketic-intern',
    year: '2025',
    icon: '💼',
    title: { en: 'Arketic AI internship', tr: 'Arketic AI stajı' },
    text: {
      en: 'Joins as a Software Engineer Intern in June. Takes on team coordination in November.',
      tr: "Haziran'da yazılım mühendisi stajyeri olarak katılır. Kasım'da ekip koordinasyonunu üstlenir.",
    },
  },
  {
    id: 'graduate',
    year: '2026',
    icon: '📜',
    title: { en: 'Graduates', tr: 'Mezuniyet' },
    text: { en: 'B.Sc. in Computer Engineering, January 2026.', tr: 'Bilgisayar Mühendisliği lisansı, Ocak 2026.' },
  },
  {
    id: 'arketic',
    year: '2026',
    icon: '🚀',
    title: { en: 'Arketic AI', tr: 'Arketic AI' },
    text: {
      en: 'Software Engineer since January, and de facto team lead and product owner: leads a team of three.',
      tr: "Ocak'tan beri yazılım mühendisi, fiili takım lideri ve ürün sahibi: üç kişilik bir ekibi yönetiyor.",
    },
  },
];

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
};

/** 'Jun 2025' / 'Haz 2025' */
export function monthLabel(m: Month, lang: Lang): string {
  const [y, mo] = m.split('-');
  return `${MONTHS[lang][Number(mo) - 1]} ${y}`;
}

/** 'Jun 2025 – Present', and 'Aug 2023' for a single month */
export function spanLabel(role: Pick<Role, 'start' | 'end'>, lang: Lang): string {
  if (role.end === role.start) return monthLabel(role.start, lang);
  const end = role.end ? monthLabel(role.end, lang) : lang === 'tr' ? 'Günümüz' : 'Present';
  return `${monthLabel(role.start, lang)} – ${end}`;
}

/** '2023' stays '2023'; '2025-10' becomes 'Oct 2025' / 'Eki 2025' */
export function dateLabel(when: When, lang: Lang): string {
  return when.length > 4 ? monthLabel(when, lang) : when;
}

/** 'Sep 2020 – Jan 2026' for a study with months, '2022 – 2023' for one with years */
export function studySpan(study: Pick<Study, 'start' | 'end'>, lang: Lang): string {
  return `${dateLabel(study.start, lang)} – ${dateLabel(study.end, lang)}`;
}

/** The result of a competition and, when he led a team there, his part: '6th place, project lead of a 4-person team' */
export function medalResult(medal: Pick<Medal, 'result' | 'role'>, lang: Lang): string {
  return medal.role ? `${medal.result[lang]}, ${medal.role[lang].charAt(0).toLocaleLowerCase(lang)}${medal.role[lang].slice(1)}` : medal.result[lang];
}

/** Whole text of the career as plain lines (llms-full.txt, the terminal, search). */
export function careerLines(lang: Lang): string[] {
  const out: string[] = [];
  for (const r of ROLES) {
    out.push(`${r.title[lang]}, ${r.org} (${spanLabel(r, lang)})`);
    for (const p of r.points) out.push(`- ${p[lang]}`);
  }
  for (const s of STUDIES) out.push(`${s.degree[lang]}, ${s.school[lang]} (${studySpan(s, lang)})`);
  return out;
}
