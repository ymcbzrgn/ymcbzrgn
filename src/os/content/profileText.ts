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
      "At Arketic AI I'm the main builder of the core enterprise platform and own its backend and LLM flows. It runs AI assistants, agents and no-code workflows for HR, Finance, IT and R&D, on-premise or in a private cloud, with role-based access and audit trails.",
      'I lead a team of three and act as the de facto product owner. I run planning, review code, set the roadmap and approve releases.',
      'On my own I build and run products. Swipflix, a group movie picker, has been on the App Store since Dec 2025 and had 5,400+ downloads by Nov 2026.',
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
      "Arketic AI'da kurumsal platformun çekirdeğinin ana geliştiricisiyim, backend'in ve LLM akışlarının sahibiyim. Platform İK, Finans, BT ve Ar-Ge için yapay zeka asistanları, ajanlar ve no-code iş akışları çalıştırıyor. On-premise ya da özel bulutta, rol tabanlı erişim ve denetim iziyle çalışıyor.",
      'Üç kişilik bir ekibi yönetiyorum, fiilen ürün sahibiyim. Planlamayı yürütüyorum, kodu inceliyorum, yol haritasını belirliyorum ve sürümleri onaylıyorum.',
      "Kendi başıma ürün geliştirip yürütüyorum. Grup halinde film seçme uygulaması Swipflix Aralık 2025'ten beri App Store'da, Kasım 2026 itibarıyla 5.400+ indirme aldı.",
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
