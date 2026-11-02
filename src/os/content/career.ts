/**
 * Career facts in one place. The build-time pages (résumé, JSON-LD, llms.txt), the recruiter card,
 * the mobile story and the career room all read from here, so a fact is written once.
 *
 * Source: the CV (public/YAMAC_BEZIRGAN_CURRENT_CV.pdf). When the CV changes, change this file too.
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
  start: Month;
  /** null = still there */
  end: Month | null;
  points: L10n[];
}

export interface Study {
  id: string;
  school: L10n;
  degree: L10n;
  start: number;
  end: number;
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
  result: L10n;
  podium: boolean;
}

export const ROLES: Role[] = [
  {
    id: 'arketic',
    org: 'Arketic AI',
    kind: 'work',
    title: { en: 'Software Engineer', tr: 'Yazılım Mühendisi' },
    start: '2025-06',
    end: null,
    points: [
      {
        en: "Architected and built Arketic AI's core enterprise platform end to end, owning backend and LLM flows.",
        tr: "Arketic AI'ın çekirdek kurumsal platformunu uçtan uca tasarlayıp geliştirdim; backend ve LLM akışlarının sahibiyim.",
      },
      {
        en: 'Designed secure assistant and agent workflows for HR, Finance, IT, and R&D operations.',
        tr: 'İK, Finans, BT ve Ar-Ge operasyonları için güvenli asistan ve ajan iş akışları tasarladım.',
      },
      {
        en: 'Built BI and automation features for KPI reporting, summaries, approvals, and task execution.',
        tr: 'KPI raporlama, özetleme, onay ve görev yürütme için BI ve otomasyon özellikleri geliştirdim.',
      },
      {
        en: 'Engineered VPC and on-prem deployments with RBAC, audit trails, and encrypted logging.',
        tr: 'RBAC, denetim izi ve şifreli loglama ile VPC ve şirket içi (on-prem) kurulumlar geliştirdim.',
      },
      {
        en: 'Integrated business systems and team tools for fast rollout without rip-and-replace migrations.',
        tr: 'Mevcut sistemleri sökmeden hızlıca devreye alınabilmesi için iş sistemlerini ve ekip araçlarını entegre ettim.',
      },
      {
        en: 'Acted as the de facto platform owner, shaping architecture, roadmap, and production delivery.',
        tr: 'Fiilen platform sahibi olarak mimariyi, yol haritasını ve canlıya çıkış sürecini şekillendirdim.',
      },
    ],
  },
  {
    id: 'exagate',
    org: 'Exagate',
    kind: 'intern',
    title: { en: 'Software Development Intern', tr: 'Yazılım Geliştirme Stajyeri' },
    start: '2023-08',
    end: '2023-09',
    points: [
      {
        en: 'Contributed to front-end delivery and Node.js web projects, from design to launch.',
        tr: 'Tasarımdan yayına kadar front-end ve Node.js web projelerinde görev aldım.',
      },
      {
        en: 'Improved UI responsiveness and scalability with optimized React patterns and state handling.',
        tr: 'Optimize React kalıpları ve durum yönetimiyle arayüzün tepkiselliğini ve ölçeklenebilirliğini artırdım.',
      },
      {
        en: 'Wrote process documentation so the work could be reused and scaled across future projects.',
        tr: 'Çalışmanın gelecek projelerde yeniden kullanılabilmesi için süreç dokümantasyonu yazdım.',
      },
      {
        en: 'Worked closely with cross-functional teams to keep project integration seamless.',
        tr: 'Projelerin sorunsuz entegrasyonu için farklı disiplinlerden ekiplerle yakın çalıştım.',
      },
    ],
  },
];

export const STUDIES: Study[] = [
  {
    id: 'altinbas',
    school: { en: 'Altınbaş University', tr: 'Altınbaş Üniversitesi' },
    degree: { en: 'B.Sc. in Computer Engineering', tr: 'Bilgisayar Mühendisliği, Lisans' },
    start: 2020,
    end: 2025,
    courses: {
      en: 'Data Structures, Algorithms, Artificial Intelligence, Database Systems, Image Processing',
      tr: 'Veri Yapıları, Algoritmalar, Yapay Zeka, Veritabanı Sistemleri, Görüntü İşleme',
    },
  },
  {
    id: 'milan',
    school: { en: 'Università degli Studi di Milano', tr: 'Milano Üniversitesi (Università degli Studi di Milano)' },
    degree: { en: 'Erasmus+ Exchange Program', tr: 'Erasmus+ Değişim Programı' },
    start: 2022,
    end: 2023,
    focus: { en: 'Advanced Software Development and Artificial Intelligence', tr: 'İleri Yazılım Geliştirme ve Yapay Zeka' },
    courses: {
      en: 'Intelligent Systems, Real-Time Graphics Programming, Natural Interaction',
      tr: 'Akıllı Sistemler, Gerçek Zamanlı Grafik Programlama, Doğal Etkileşim',
    },
  },
];

export const SKILLS: { group: L10n; items: string[] }[] = [
  { group: { en: 'Languages', tr: 'Diller' }, items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
  { group: { en: 'Front-end & mobile', tr: 'Front-end ve mobil' }, items: ['React', 'React Native'] },
  { group: { en: 'Backend & data', tr: 'Backend ve veri' }, items: ['Node.js', 'Express.js', 'REST APIs', 'PostgreSQL', 'Supabase', 'OAuth/JWT'] },
  { group: { en: 'AI & automation', tr: 'Yapay zeka ve otomasyon' }, items: ['LLM Integration', 'RAG', 'AI Agents', 'Automation', 'n8n'] },
  { group: { en: 'Delivery', tr: 'Teslimat' }, items: ['Docker', 'Git', 'CI/CD', 'GitHub Actions'] },
];

export const SPOKEN: { code: string; name: L10n; level: L10n }[] = [
  { code: 'tr', name: { en: 'Turkish', tr: 'Türkçe' }, level: { en: 'Native', tr: 'Ana dil' } },
  { code: 'en', name: { en: 'English', tr: 'İngilizce' }, level: { en: 'Full professional proficiency', tr: 'Tam mesleki yeterlilik' } },
  { code: 'it', name: { en: 'Italian', tr: 'İtalyanca' }, level: { en: 'Elementary proficiency', tr: 'Temel yeterlilik' } },
  { code: 'de', name: { en: 'German', tr: 'Almanca' }, level: { en: 'Basic proficiency', tr: 'Başlangıç düzeyi' } },
];

export const MEDALS: Medal[] = [
  { id: 'ideathon', name: "Ideathon'25", result: { en: '2nd place', tr: '2.lik' }, podium: true },
  { id: 'llama', name: 'YTÜ Meta & YTU Llama Hackathon', result: { en: '6th place', tr: '6.lık' }, podium: true },
  { id: 'kkb', name: 'KKB Hackathon', result: { en: 'Participant', tr: 'Katılımcı' }, podium: false },
  { id: 'aimpact', name: 'AImpact Hackathon', result: { en: 'Participant', tr: 'Katılımcı' }, podium: false },
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
      tr: 'Bu site: tarayıcıda masaüstü işletim sistemini yeniden yaratan etkileşimli portföy; kalıcı sanal dosya sistemi ve yerleşik uygulamalar (PDF görüntüleyici, terminal, markdown okuyucu, GitHub gezgini).',
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
      en: "Software Engineer at Arketic AI since June 2025, owning the core enterprise AI platform's backend and LLM flows.",
      tr: "Haziran 2025'ten beri Arketic AI'da yazılım mühendisi; kurumsal AI platformunun backend'inin ve LLM akışlarının sahibi.",
    },
  },
  {
    icon: '🔐',
    title: { en: 'Production', tr: 'Canlıda' },
    text: {
      en: 'VPC and on-prem deployments with RBAC, audit trails and encrypted logging; agents for HR, Finance, IT and R&D.',
      tr: 'RBAC, denetim izi ve şifreli loglamalı VPC ve on-prem kurulumlar; İK, Finans, BT ve Ar-Ge için ajanlar.',
    },
  },
  {
    icon: '🏆',
    title: { en: 'Competitions', tr: 'Yarışmalar' },
    text: {
      en: "2nd place at Ideathon'25 and 6th at the YTÜ Meta & YTU Llama Hackathon.",
      tr: "Ideathon'25'te 2., YTÜ Meta & YTU Llama Hackathon'da 6. oldu.",
    },
  },
  {
    icon: '🎓',
    title: { en: 'Education', tr: 'Eğitim' },
    text: {
      en: 'B.Sc. Computer Engineering (Altınbaş, 2025) with an Erasmus+ year in Milan focused on software and AI.',
      tr: "Bilgisayar Mühendisliği lisansı (Altınbaş, 2025); Milano'da yazılım ve yapay zeka odaklı Erasmus+ dönemi.",
    },
  },
  {
    icon: '🌍',
    title: { en: 'Languages', tr: 'Diller' },
    text: {
      en: 'Turkish (native), English (full professional), Italian and German.',
      tr: 'Türkçe (ana dil), İngilizce (tam mesleki), İtalyanca ve Almanca.',
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
      en: 'A year at the Università degli Studi di Milano: Intelligent Systems, Real-Time Graphics, Natural Interaction.',
      tr: 'Milano Üniversitesi’nde bir dönem: Akıllı Sistemler, Gerçek Zamanlı Grafik, Doğal Etkileşim.',
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
    title: { en: "Ideathon'25, 2nd place", tr: "Ideathon'25, 2.lik" },
    text: { en: 'Podium finish, plus the YTÜ Meta & YTU Llama Hackathon (6th).', tr: 'Kürsü; ayrıca YTÜ Meta & YTU Llama Hackathon (6.).' },
  },
  {
    id: 'graduate',
    year: '2025',
    icon: '📜',
    title: { en: 'Graduates', tr: 'Mezuniyet' },
    text: { en: 'B.Sc. in Computer Engineering.', tr: 'Bilgisayar Mühendisliği lisansı.' },
  },
  {
    id: 'arketic',
    year: '2025',
    icon: '🚀',
    title: { en: 'Arketic AI', tr: 'Arketic AI' },
    text: {
      en: 'Software Engineer: builds the core enterprise AI platform end to end.',
      tr: 'Yazılım Mühendisi: çekirdek kurumsal AI platformunu uçtan uca geliştiriyor.',
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

/** 'Jun 2025 – Present' */
export function spanLabel(role: Pick<Role, 'start' | 'end'>, lang: Lang): string {
  const end = role.end ? monthLabel(role.end, lang) : lang === 'tr' ? 'Günümüz' : 'Present';
  return `${monthLabel(role.start, lang)} – ${end}`;
}

/** Whole text of the career as plain lines (llms-full.txt, the terminal, search). */
export function careerLines(lang: Lang): string[] {
  const out: string[] = [];
  for (const r of ROLES) {
    out.push(`${r.title[lang]}, ${r.org} (${spanLabel(r, lang)})`);
    for (const p of r.points) out.push(`- ${p[lang]}`);
  }
  for (const s of STUDIES) out.push(`${s.degree[lang]}, ${s.school[lang]} (${s.start}–${s.end})`);
  return out;
}
