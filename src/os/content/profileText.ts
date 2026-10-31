/**
 * Biography text for the simple view and the terminal `about` command (English / Turkish).
 *
 * The texts are taken verbatim from About-Me.md / Hakkimda.md in the virtual file system
 * (src/os/vfs/seed.ts). If you edit those, mirror the change here.
 */
import type { Lang } from '../i18n/core';

export interface ProfileText {
  summary: string;
  focus: string[];
  work: { title: string; text: string }[];
  style: string;
}

export const PROFILE_TEXT: Record<Lang, ProfileText> = {
  en: {
    summary:
      'I am a software engineer focused on AI platforms, backend architecture, and full-stack product development. I build production-ready systems across Python and TypeScript ecosystems, combining system design, automation, LLM workflows, and user-facing products.',
    focus: [
      'Software Engineer at Arketic AI, contributing to enterprise AI products across backend services, LLM integrations, automation, and secure deployment workflows.',
      'Interested in technical leadership, product thinking, and scalable systems that connect engineering execution with real business impact.',
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
    style:
      'I enjoy building software that is technically solid, useful in practice, and clear in experience. I care about reliability, maintainability, thoughtful interfaces, and strong execution quality.',
  },
  tr: {
    summary:
      'Yapay zeka platformları, backend mimarisi ve uçtan uca ürün geliştirme odağında çalışan bir yazılım mühendisiyim. Python ve TypeScript ekosistemlerinde üretim ortamına uygun sistemler geliştiriyor; LLM entegrasyonu, otomasyon, sistem tasarımı ve kullanıcıya dokunan deneyimleri bir araya getiriyorum.',
    focus: [
      "Arketic AI'da yazılım mühendisi olarak kurumsal AI ürünleri üzerinde backend servisleri, LLM akışları, otomasyon ve güvenli dağıtım süreçleri geliştiriyorum.",
      'Uzun vadede mühendislik icrasını ürün ve iş etkisiyle buluşturan teknik liderlik rollerine ilerlemeyi hedefliyorum.',
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
    style:
      'Teknik olarak sağlam, gerçek kullanım değeri taşıyan ve deneyim açısından özenli yazılımlar üretmeyi seviyorum. Benim için güvenilirlik, bakım kolaylığı, iyi düşünülmüş arayüzler ve güçlü teslim kalitesi çok önemli.',
  },
};
