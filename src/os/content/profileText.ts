/**
 * Biography text for the simple view, the terminal `about` command and the About-Me.md / Hakkimda.md
 * files in the virtual file system (English / Turkish). Write it here once: `aboutMeMarkdown` builds
 * the Markdown files from it. Pure data and pure functions, so the build can import it as well.
 */
import type { Lang } from '../i18n/core';
import { PROFILE } from './profile';

export interface ProfileText {
  summary: string;
  focus: string[];
  work: { title: string; text: string }[];
  portfolio: string;
  style: string;
}

export const PROFILE_TEXT: Record<Lang, ProfileText> = {
  en: {
    summary:
      "I'm a software engineer focused on AI platforms, backend architecture and full-stack product development. I work mostly in Python and TypeScript and own systems from design to delivery: LLM workflows, automation and the products on top of them.",
    focus: [
      'At Arketic AI I built the core enterprise platform end to end and own its backend and LLM flows. I designed its assistant and agent workflows for HR, Finance, IT and R&D. I also built its VPC and on-prem deployments, with RBAC, audit trails and encrypted logging.',
      "I'm growing toward technical leadership and learning the product and business side along the way.",
    ],
    work: [
      {
        title: 'AI Platforms & Automation',
        text: 'LLM integration, RAG, agent workflows, orchestration, and automation pipelines',
      },
      {
        title: 'Full-Stack Engineering',
        text: 'React, React Native, Node.js, Express, REST APIs, PostgreSQL, and Supabase',
      },
      {
        title: 'Product & Architecture',
        text: 'end-to-end ownership, system design, developer tooling, and performance-focused UX',
      },
    ],
    portfolio:
      'This portfolio is a desktop that runs in your browser. It has a virtual file system, draggable windows, a PDF viewer, a terminal, a Markdown reader and a phone mode. It is also one of my projects, and the "How this site is built" window explains how it works.',
    style:
      'I care about reliability, so I like work that comes with a way to check it. This site keeps its first load under 80 KB and the build fails if it grows. Its browser tests run on every push. HydraQuant puts five independent risk guardrails in front of the exchange.',
  },
  tr: {
    summary:
      'Yapay zeka platformları, backend mimarisi ve uçtan uca ürün geliştirme odağında çalışan bir yazılım mühendisiyim. Çoğunlukla Python ve TypeScript yazıyorum. LLM akışları, otomasyon ve üstüne kurulan ürünler dahil, bir sistemin tasarımından teslimine kadar sorumluluk alıyorum.',
    focus: [
      "Arketic AI'da kurumsal platformun çekirdeğini uçtan uca kurdum, backend'in ve LLM akışlarının sahibiyim. İK, Finans, BT ve Ar-Ge için asistan ve ajan iş akışları tasarladım. VPC ve on-prem kurulumlarını da RBAC, denetim izi ve şifreli loglamayla birlikte geliştirdim.",
      'Teknik liderliğe doğru ilerliyorum, yolda ürün ve iş tarafını da öğreniyorum.',
    ],
    work: [
      {
        title: 'AI Platformları ve Otomasyon',
        text: 'LLM entegrasyonu, RAG, ajan tabanlı akışlar, orkestrasyon ve otomasyon süreçleri',
      },
      {
        title: 'Full-Stack Geliştirme',
        text: "React, React Native, Node.js, Express, REST API'ler, PostgreSQL ve Supabase",
      },
      {
        title: 'Ürün ve Mimari',
        text: 'uçtan uca sahiplenme, sistem tasarımı, geliştirici araçları ve performans odaklı kullanıcı deneyimi',
      },
    ],
    portfolio:
      'Bu portfolyo tarayıcıda çalışan bir masaüstü. Sanal dosya sistemi, sürüklenebilir pencereler, PDF görüntüleyici, terminal, Markdown okuyucu ve telefon modu var. Aynı zamanda projelerimden biri, nasıl çalıştığını "Bu site nasıl yapıldı" penceresinde anlatıyorum.',
    style:
      "Güvenilirliği önemsiyorum, o yüzden kontrol edilebilen işleri seviyorum. Bu sitenin ilk yüklemesi 80 KB'ın altında kalıyor, büyürse derleme kırılıyor. Tarayıcı testleri her push'ta çalışıyor. HydraQuant'ta borsanın önünde beş bağımsız risk koruması var.",
  },
};

const MD_HEADINGS: Record<Lang, Record<'role' | 'focus' | 'work' | 'portfolio' | 'style' | 'contact' | 'email' | 'site', string>> = {
  en: {
    role: 'Software Engineer',
    focus: 'Current Focus',
    work: 'Areas of Work',
    portfolio: 'About This Portfolio',
    style: 'Working Style',
    contact: 'Contact',
    email: 'Email',
    site: 'Website',
  },
  tr: {
    role: 'Yazılım Mühendisi',
    focus: 'Güncel Odağım',
    work: 'Çalışma Alanlarım',
    portfolio: 'Bu Portfolyo Hakkında',
    style: 'Çalışma Yaklaşımım',
    contact: 'İletişim',
    email: 'E-posta',
    site: 'Web sitesi',
  },
};

/** The text of About-Me.md (English) and Hakkimda.md (Turkish) in the virtual file system. */
export function aboutMeMarkdown(lang: Lang): string {
  const t = PROFILE_TEXT[lang];
  const h = MD_HEADINGS[lang];
  return [
    `# ${PROFILE.name}`,
    '',
    `## ${h.role}`,
    '',
    t.summary,
    '',
    `### ${h.focus}`,
    '',
    ...t.focus.map((f) => `- ${f}`),
    '',
    `### ${h.work}`,
    '',
    ...t.work.map((w) => `- **${w.title}:** ${w.text}`),
    '',
    `### ${h.portfolio}`,
    '',
    t.portfolio,
    '',
    `### ${h.style}`,
    '',
    t.style,
    '',
    `### ${h.contact}`,
    '',
    `- ${h.email}: [${PROFILE.email}](mailto:${PROFILE.email})`,
    `- ${h.site}: [yamacbezirgan.com](${PROFILE.site})`,
    `- LinkedIn: [linkedin.com/in/yamacbezirgan](${PROFILE.linkedin})`,
    `- GitHub: [github.com/ymcbzrgn](${PROFILE.github})`,
  ].join('\n');
}
