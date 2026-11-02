/**
 * The case studies behind /projects/ and /tr/projeler/: one page per project, in both languages.
 * Pure data (no browser APIs), read only by the build (scripts/seo), so it never reaches the app bundle.
 *
 * Every statement comes from the project's own README, from the CV, or from this repository. When a
 * README describes a plan rather than a shipped feature, the text says "the README describes".
 * Tokens like {firstScreenKB} are filled in from the numbers measured on the build (see scripts/seo).
 */
import type { L10n } from './career';

export interface Fact {
  label: L10n;
  value: L10n;
}

export interface Section {
  title: L10n;
  paragraphs?: L10n[];
  bullets?: L10n[];
}

export interface CaseStudy {
  /** a Project id from career.ts (name, stack and summary come from there) */
  id: string;
  /** "HydraQuant: a cognitive crypto trading engine" (the site name is added to it) */
  title: L10n;
  /** the meta description, 70-165 characters */
  description: L10n;
  tagline: L10n;
  repo: string;
  demo?: string;
  /** programming languages, for the structured data */
  languages: string[];
  keywords: string[];
  facts: Fact[];
  sections: Section[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'hydraquant',
    title: { en: 'HydraQuant: a cognitive crypto trading engine', tr: 'HydraQuant: bilişsel kripto ticaret motoru' },
    description: {
      en: 'HydraQuant by Yamaç Bezirgan: a Python crypto trading engine that combines a rule-based evidence engine, an LLM agent debate and Bayesian position sizing.',
      tr: "Yamaç Bezirgan'ın HydraQuant'ı: kural tabanlı kanıt motoru, LLM ajan tartışması ve Bayes pozisyon boyutlandırmasını birleştiren Python kripto ticaret motoru.",
    },
    tagline: {
      en: 'A trading engine that runs rules first and calls language models only when the uncertainty is worth it.',
      tr: 'Önce kurallarla çalışan, dil modellerini yalnızca belirsizlik buna değdiğinde devreye alan bir ticaret motoru.',
    },
    repo: 'https://github.com/ymcbzrgn/HydraQuant',
    languages: ['Python', 'TypeScript'],
    keywords: ['algorithmic trading', 'multi-agent LLM', 'RAG', 'Bayesian position sizing', 'FastAPI', 'freqtrade'],
    facts: [
      { label: { en: 'Status', tr: 'Durum' }, value: { en: 'Alpha, testnet first', tr: 'Alfa, önce testnet' } },
      { label: { en: 'Language', tr: 'Dil' }, value: { en: 'Python 3.11+', tr: 'Python 3.11+' } },
      {
        label: { en: 'Markets', tr: 'Piyasalar' },
        value: { en: 'Bybit and Binance testnet first; orders go through freqtrade and CCXT', tr: 'Önce Bybit ve Binance testnet; emirler freqtrade ve CCXT üzerinden gider' },
      },
      { label: { en: 'Licence', tr: 'Lisans' }, value: { en: 'GPLv3', tr: 'GPLv3' } },
    ],
    sections: [
      {
        title: { en: 'What it is', tr: 'Nedir' },
        paragraphs: [
          {
            en: 'HydraQuant is an AI-assisted trading engine for cryptocurrency markets. It combines a rule-based signal engine, a multi-agent language-model debate, adaptive learning that updates from every closed trade, and Bayesian position sizing. It runs on free-tier LLM providers and free data sources. It is alpha software and a research project, not investment advice.',
            tr: 'HydraQuant, kripto para piyasaları için yapay zeka destekli bir ticaret motoru. Kural tabanlı bir sinyal motorunu, çok ajanlı bir dil modeli tartışmasını, kapanan her işlemden öğrenen uyarlanabilir öğrenmeyi ve Bayes pozisyon boyutlandırmasını birleştirir. Ücretsiz katmandaki LLM sağlayıcıları ve ücretsiz veri kaynaklarıyla çalışır. Alfa aşamasında bir yazılım ve araştırma projesidir, yatırım tavsiyesi değildir.',
          },
        ],
      },
      {
        title: { en: 'Design decisions', tr: 'Tasarım kararları' },
        bullets: [
          {
            en: 'Rules first, models second. A rule-based Evidence Engine scores each trade in about 50 ms at no API cost. Language models are consulted only when the remaining uncertainty justifies it, so most decisions never touch one.',
            tr: 'Önce kurallar, sonra modeller. Kural tabanlı Kanıt Motoru her işlemi yaklaşık 50 ms içinde, API maliyeti olmadan puanlar. Dil modellerine yalnızca kalan belirsizlik buna değdiğinde başvurulur; kararların çoğu hiçbirine uğramaz.',
          },
          {
            en: 'Six questions, scored independently. Trend, momentum, crowd positioning, historical evidence, macro conditions and risk are each scored on their own. When the scores disagree the engine becomes more cautious instead of averaging the disagreement away.',
            tr: 'Altı soru, ayrı ayrı puanlanır. Trend, momentum, kalabalığın konumu, tarihsel kanıt, makro koşullar ve risk tek tek puanlanır. Puanlar çeliştiğinde motor, çelişkiyi ortalamayla yok etmek yerine daha temkinli davranır.',
          },
          {
            en: 'A debate when it is needed. Four to seven specialist agents, picked from twelve for the current market regime, argue in up to three rounds. Cross-examination is skipped when the first round already agrees, to save cost.',
            tr: 'Gerektiğinde tartışma. On ikisi arasından mevcut piyasa rejimine göre seçilen dört ila yedi uzman ajan, en fazla üç turda tartışır. İlk tur zaten uzlaşıyorsa maliyeti azaltmak için çapraz sorgu atlanır.',
          },
          {
            en: 'Parameters that learn. Learning rates, risk thresholds and exit multipliers are not constants: they are adaptive parameters that are updated after every closed trade.',
            tr: 'Öğrenen parametreler. Öğrenme oranları, risk eşikleri ve çıkış çarpanları sabit değildir; kapanan her işlemden sonra güncellenen uyarlanabilir parametrelerdir.',
          },
          {
            en: 'Confidence sizes a position, it does not block one. A weak signal becomes a shadow trade that is studied later. A ledger records what skipped signals would have earned, and thresholds loosen when caution costs too much.',
            tr: 'Güven, pozisyonu boyutlandırır, engellemez. Zayıf bir sinyal, sonradan incelenen bir gölge işlem olur. Bir defter, atlanan sinyallerin ne kazandıracağını kaydeder; temkin fazla pahalıya mal olduğunda eşikler gevşer.',
          },
          {
            en: 'No single point of failure. Seven LLM providers sit behind a bandit-based router with a circuit breaker, macro data arrives through three fallback cascades, and five independent risk guardrails stand in front of the exchange.',
            tr: 'Tek hata noktası yok. Yedi LLM sağlayıcısı, devre kesicili bir bandit yönlendiricinin arkasında durur; makro veri üç yedekli kademeden gelir ve borsanın önünde beş bağımsız risk koruması bulunur.',
          },
        ],
      },
      {
        title: { en: 'Architecture', tr: 'Mimari' },
        paragraphs: [
          {
            en: 'Six layers. A Vue 3 dashboard (an extended FreqUI) and a Telegram notifier on top; a FastAPI read API; an APScheduler layer for training, evolution and consolidation jobs; the cognition layer (evidence engine, debate, agent pool, LLM router, adaptive parameters); the decision layer (Bayesian Kelly sizing, hard risk limits, graduated autonomy); and execution, which is delegated to freqtrade through CCXT.',
            tr: 'Altı katman. Üstte Vue 3 panosu (genişletilmiş FreqUI) ve bir Telegram bildiricisi; bir FastAPI okuma API’si; eğitim, evrim ve pekiştirme işleri için bir APScheduler katmanı; biliş katmanı (kanıt motoru, tartışma, ajan havuzu, LLM yönlendirici, uyarlanabilir parametreler); karar katmanı (Bayes Kelly boyutlandırma, katı risk limitleri, kademeli özerklik) ve CCXT üzerinden freqtrade’e devredilen yürütme.',
          },
        ],
      },
      {
        title: { en: 'How a decision flows', tr: 'Bir karar nasıl akar' },
        bullets: [
          { en: 'A candle arrives and the strategy callback fires.', tr: 'Bir mum gelir ve strateji geri çağrısı çalışır.' },
          {
            en: 'Three forecasters run in parallel (Tiny Time Mixer embeddings, Chronos-Bolt quantiles and a CatBoost classifier) and are fused into a direction estimate.',
            tr: 'Üç tahminci paralel çalışır (Tiny Time Mixer gömmeleri, Chronos-Bolt kantilleri ve bir CatBoost sınıflandırıcısı) ve tek bir yön tahmininde birleştirilir.',
          },
          { en: 'The Evidence Engine scores the six questions.', tr: 'Kanıt Motoru altı soruyu puanlar.' },
          {
            en: 'If confidence clears an adaptive threshold the signal ships at once; otherwise the debate runs.',
            tr: 'Güven uyarlanabilir bir eşiği aşarsa sinyal hemen çıkar; aşmazsa tartışma başlar.',
          },
          { en: 'A nine-stage sizing pipeline sets the position.', tr: 'Dokuz aşamalı bir boyutlandırma hattı pozisyonu belirler.' },
          { en: 'The risk guards run in a cascade before the order reaches the exchange.', tr: 'Emir borsaya ulaşmadan önce risk korumaları art arda çalışır.' },
          { en: 'When the trade closes, the adaptive parameters update.', tr: 'İşlem kapandığında uyarlanabilir parametreler güncellenir.' },
        ],
      },
    ],
  },

  {
    id: 'portfolio',
    title: { en: 'A desktop OS in the browser: this portfolio', tr: 'Tarayıcıda masaüstü işletim sistemi: bu portföy' },
    description: {
      en: 'How this portfolio is built: a desktop OS in the browser with React, TypeScript and Vite, a virtual file system, a pixel-art twin and a phone mode. No backend.',
      tr: 'Bu portföy nasıl yapıldı: React, TypeScript ve Vite ile tarayıcıda masaüstü işletim sistemi, sanal dosya sistemi, piksel ikiz ve telefon modu. Backend yok.',
    },
    tagline: {
      en: 'A portfolio built as an operating system: windows, a file system, a terminal, a pixel-art twin and a phone mode, with no backend.',
      tr: 'İşletim sistemi olarak kurulmuş bir portföy: pencereler, dosya sistemi, terminal, piksel ikiz ve telefon modu; backend yok.',
    },
    repo: 'https://github.com/ymcbzrgn/ymcbzrgn',
    demo: 'https://yamacbezirgan.com/',
    languages: ['TypeScript', 'CSS', 'JavaScript'],
    keywords: ['React', 'TypeScript', 'Vite', 'IndexedDB', 'pixel art', 'Cloudflare Pages', 'Playwright'],
    facts: [
      { label: { en: 'Stack', tr: 'Teknoloji' }, value: { en: 'React 18, TypeScript, Vite, Zustand', tr: 'React 18, TypeScript, Vite, Zustand' } },
      { label: { en: 'First screen', tr: 'İlk ekran' }, value: { en: '{firstScreenKB} KB gzip', tr: '{firstScreenKB} KB gzip' } },
      { label: { en: 'Scripts', tr: 'Script' }, value: { en: '{scripts}, all but the first loaded on demand', tr: '{scripts} adet, ilki dışında hepsi istenince yüklenir' } },
      { label: { en: 'Browser test suites', tr: 'Tarayıcı test paketi' }, value: { en: '{suites}, run on every push', tr: '{suites} adet, her push’ta çalışır' } },
      { label: { en: 'Hosting', tr: 'Barındırma' }, value: { en: 'Cloudflare Pages, static files only', tr: 'Cloudflare Pages, yalnızca statik dosyalar' } },
    ],
    sections: [
      {
        title: { en: 'What it is', tr: 'Nedir' },
        paragraphs: [
          {
            en: 'The desktop runs in the browser with no backend: windows you can drag, a virtual file system kept in IndexedDB, and built-in apps (a PDF viewer, a terminal with pipes and git log, a Markdown reader, a GitHub project explorer, a music player, four games, notes, a calculator, a calendar and photos). There is a command palette, a guided tour and achievements. On a phone it becomes a phone: a lock screen, a home screen with widgets, and the same apps in a full-screen shell.',
            tr: 'Masaüstü, backend olmadan tarayıcıda çalışır: sürüklenebilir pencereler, IndexedDB’de tutulan sanal dosya sistemi ve yerleşik uygulamalar (PDF görüntüleyici, boru hatlı ve git log’lu terminal, Markdown okuyucu, GitHub proje gezgini, müzik çalar, dört oyun, notlar, hesap makinesi, takvim ve fotoğraflar). Komut paleti, rehberli tur ve başarımlar var. Telefonda bir telefona dönüşür: kilit ekranı, widget’lı ana ekran ve aynı uygulamalar tam ekran kabukta.',
          },
        ],
      },
      {
        title: { en: 'The pixel twin', tr: 'Piksel ikiz' },
        paragraphs: [
          {
            en: 'A pixel-art character walks around the desktop, sits on window title bars, moves into folders as rooms and reacts to what you do. Every sprite, tile, room prop and app icon is drawn in code (scripts/sprites): ASCII bitmaps and shapes with automatic outlines, packed into indexed PNG sheets of a few kilobytes each. Sound is synthesised with the Web Audio API, so there are no audio files.',
            tr: 'Piksel-art bir karakter masaüstünde dolaşır, pencere başlık çubuklarına oturur, klasörlere oda olarak taşınır ve yaptıklarına tepki verir. Her sprite, karo, oda eşyası ve uygulama ikonu kodla çizilir (scripts/sprites): otomatik kenarlıklı ASCII bitmap’ler ve şekiller, her biri birkaç kilobaytlık indeksli PNG sayfalarına paketlenir. Ses Web Audio API ile sentezlenir; ses dosyası yoktur.',
          },
        ],
      },
      {
        title: { en: 'Performance is a budget', tr: 'Performans bir bütçedir' },
        paragraphs: [
          {
            en: 'The first screen is {firstScreenKB} KB gzip, measured by the build, and a script fails the build when it grows past its budget. Every app, the twin, the palette and the story load when asked for. The phone UI, with its animation library, is a separate chunk that desktop visitors never download.',
            tr: 'İlk ekran {firstScreenKB} KB gzip; bunu derleme ölçer ve bütçeyi aşarsa bir betik derlemeyi düşürür. Her uygulama, ikiz, palet ve hikâye istenince yüklenir. Animasyon kütüphanesiyle birlikte telefon arayüzü ayrı bir parçadır ve masaüstü ziyaretçileri onu hiç indirmez.',
          },
        ],
      },
      {
        title: { en: 'Findable by search engines and assistants', tr: 'Arama motorları ve asistanlar için bulunabilir' },
        paragraphs: [
          {
            en: 'A client-rendered app is an empty div to a crawler, so a Vite plugin writes the facts into the HTML at build time: head tags, structured data, a plain boot block, a static résumé in two languages, Markdown copies, a sitemap, llms.txt and one page per project, like this one.',
            tr: 'İstemcide çizilen bir uygulama, tarayıcı robotu için boş bir div’dir; bu yüzden bir Vite eklentisi bilgileri derleme sırasında HTML’e yazar: head etiketleri, yapılandırılmış veri, düz bir açılış bloğu, iki dilde statik özgeçmiş, Markdown kopyaları, site haritası, llms.txt ve her proje için bir sayfa; bu sayfa gibi.',
          },
        ],
      },
      {
        title: { en: 'Quality', tr: 'Kalite' },
        paragraphs: [
          {
            en: 'Type checking, ESLint, bundle budgets, an SEO audit and {suites} Playwright suites run against the production build on every push. The test server imitates the routing of Cloudflare Pages, which found requests that were silently answered by the single-page-app fallback.',
            tr: 'Tip denetimi, ESLint, paket bütçeleri, SEO denetimi ve {suites} Playwright paketi her push’ta üretim derlemesine karşı çalışır. Test sunucusu Cloudflare Pages’in yönlendirmesini taklit eder; bu sayede tek sayfalık uygulama yedeği tarafından sessizce yanıtlanan istekler bulundu.',
          },
        ],
      },
    ],
  },

  {
    id: 'quirkllm',
    title: { en: 'QuirkLLM: a local, RAM-aware coding assistant', tr: 'QuirkLLM: yerel, RAM duyarlı kodlama asistanı' },
    description: {
      en: 'QuirkLLM by Yamaç Bezirgan: a local, GPU-free command-line coding assistant in Python that adapts context, caching and inference to the RAM it finds.',
      tr: "QuirkLLM: bağlamı, önbelleği ve çıkarımı RAM'e göre ayarlayan, yerel ve GPU gerektirmeyen Python komut satırı kodlama asistanı. Yamaç Bezirgan'ın projesi.",
    },
    tagline: {
      en: 'A command-line coding assistant that runs on your own machine, with no GPU and no cloud, and sizes itself to the RAM it finds.',
      tr: "Kendi makinende çalışan, GPU ve bulut gerektirmeyen; bulduğu RAM'e göre kendini ayarlayan komut satırı kodlama asistanı.",
    },
    repo: 'https://github.com/ymcbzrgn/QuirkLLM',
    languages: ['Python', 'Shell'],
    keywords: ['local LLM', 'coding assistant', 'CLI', 'RAG', 'MCP', 'privacy'],
    facts: [
      { label: { en: 'Language', tr: 'Dil' }, value: { en: 'Python', tr: 'Python' } },
      { label: { en: 'Runs', tr: 'Çalışma' }, value: { en: 'Locally; no GPU required (used when present)', tr: 'Yerelde; GPU gerekmez (varsa kullanılır)' } },
      { label: { en: 'Interface', tr: 'Arayüz' }, value: { en: 'Terminal, with an MCP server mode', tr: 'Terminal, MCP sunucu moduyla' } },
      { label: { en: 'Topics', tr: 'Konular' }, value: { en: 'cli, coding-assistant, local-llm, mcp, rag, ram-aware', tr: 'cli, coding-assistant, local-llm, mcp, rag, ram-aware' } },
    ],
    sections: [
      {
        title: { en: 'What it is', tr: 'Nedir' },
        paragraphs: [
          {
            en: 'QuirkLLM is a terminal coding assistant in the spirit of Claude Code CLI and Gemini CLI, with one difference: it runs entirely on the developer’s own machine. It is a privacy-focused alternative to cloud developer tools for people who do not want their code to leave the laptop. It does not need a GPU, and uses one automatically when it finds one.',
            tr: 'QuirkLLM, Claude Code CLI ve Gemini CLI ruhunda bir terminal kodlama asistanı; tek farkı tamamen geliştiricinin kendi makinesinde çalışması. Kodunun dizüstünden çıkmasını istemeyenler için bulut geliştirici araçlarına gizlilik odaklı bir alternatif. GPU gerektirmez, bulursa otomatik kullanır.',
          },
        ],
      },
      {
        title: { en: 'RAM-aware profiles', tr: 'RAM duyarlı profiller' },
        paragraphs: [
          {
            en: 'On start it detects the available RAM and picks one of four profiles. Survival (about 8 GB) uses a 16K context, 4-bit weights and the core features. Comfort (about 16 GB) uses a 32K context, 4-bit weights and every feature. Power (about 32 GB) uses a 64K context, 8-bit weights and parallel work. Beast (64 GB and up) uses a 128K context at 8 bits. Context length, cache sizes and quantisation follow the profile, and the profile can be overridden by hand.',
            tr: 'Açılışta kullanılabilir RAM’i algılar ve dört profilden birini seçer. Survival (yaklaşık 8 GB) 16K bağlam, 4-bit ağırlık ve temel özellikleri kullanır. Comfort (yaklaşık 16 GB) 32K bağlam, 4-bit ağırlık ve tüm özellikleri kullanır. Power (yaklaşık 32 GB) 64K bağlam, 8-bit ağırlık ve paralel çalışmayı kullanır. Beast (64 GB ve üzeri) 8-bit ile 128K bağlam kullanır. Bağlam uzunluğu, önbellek boyutları ve nicemleme profile göre belirlenir; profil elle de değiştirilebilir.',
          },
        ],
      },
      {
        title: { en: 'Four working modes', tr: 'Dört çalışma modu' },
        bullets: [
          { en: 'Chat (the default): asks for confirmation before anything critical.', tr: 'Chat (varsayılan): kritik her işlemden önce onay ister.' },
          {
            en: 'YAMI: “auto-accept”. It writes code, runs tests and fixes files without asking, apart from very risky commands.',
            tr: 'YAMI: “otomatik kabul”. Çok riskli komutlar dışında sormadan kod yazar, test çalıştırır ve dosyaları düzeltir.',
          },
          {
            en: 'Plan: read-only. It analyses the project and writes plans (TODO and architecture notes) without changing any code.',
            tr: 'Plan: salt okunur. Projeyi inceler ve hiçbir kodu değiştirmeden planlar (TODO ve mimari notları) yazar.',
          },
          {
            en: 'Ghost: watches in the background. When you save a file it analyses the change and warns you if it broke another file.',
            tr: 'Ghost: arka planda izler. Bir dosyayı kaydettiğinde değişikliği inceler ve başka bir dosyayı bozduysa uyarır.',
          },
        ],
      },
      {
        title: { en: 'Knowledge and integration', tr: 'Bilgi ve entegrasyon' },
        paragraphs: [
          {
            en: 'Knowledge Eater lets you point it at documentation, a URL or a PDF, and embeds the pages into a local vector store, so it can answer from documentation that is private or offline. Neural Link runs it as a Model Context Protocol (MCP) server, so MCP-capable tools such as Claude Desktop or Cursor can see the local repository.',
            tr: 'Knowledge Eater, bir dokümantasyonu (URL ya da PDF) gösterdiğinde sayfaları yerel bir vektör deposuna gömer; böylece özel ya da çevrimdışı dokümanlardan yanıt verebilir. Neural Link, onu bir Model Context Protocol (MCP) sunucusu olarak çalıştırır; Claude Desktop ya da Cursor gibi MCP destekli araçlar yerel depoyu görebilir.',
          },
        ],
      },
      {
        title: { en: 'How it is put together', tr: 'Nasıl kurulu' },
        paragraphs: [
          {
            en: 'The README describes a pipeline: a system detector (psutil), an interactive CLI with a REPL and session manager, a project analyser that detects frameworks and package managers, a conversation engine that manages the context window, compacts history and resolves references such as “it” and “that component”, and adaptive inference and RAG layers that follow the active profile. The base model it names is DeepSeek Coder 1.3B.',
            tr: 'README şu hattı anlatır: bir sistem algılayıcı (psutil), REPL ve oturum yöneticili etkileşimli CLI, çatıları ve paket yöneticilerini algılayan proje analizcisi, bağlam penceresini yöneten, geçmişi sıkıştıran ve “bunu”, “şu bileşen” gibi göndermeleri çözen konuşma motoru ve etkin profili izleyen uyarlanabilir çıkarım ve RAG katmanları. Adını andığı temel model DeepSeek Coder 1.3B’dir.',
          },
        ],
      },
    ],
  },

  {
    id: 'shiffy',
    title: { en: 'Shiffy: AI shift scheduling built on Llama', tr: 'Shiffy: Llama ile yapay zekâlı vardiya planı' },
    description: {
      en: 'Shiffy: a mobile-first shift management app (Expo, Express, Supabase) in which Meta’s Llama drafts fair schedules from availability and manager notes.',
      tr: 'Shiffy: Llama’nın müsaitlik ve yönetici notlarından adil vardiya planı çıkardığı, mobil öncelikli vardiya yönetim uygulaması (Expo, Express, Supabase).',
    },
    tagline: {
      en: 'A mobile-first platform where part-time employees say when they can work and a Llama model drafts the weekly schedule for the manager.',
      tr: 'Yarı zamanlı çalışanların ne zaman çalışabildiğini bildirdiği, haftalık planı ise yöneticiye bir Llama modelinin taslak olarak hazırladığı mobil öncelikli platform.',
    },
    repo: 'https://github.com/ymcbzrgn/Shiffy',
    demo: 'https://shiffy.vercel.app',
    languages: ['TypeScript', 'JavaScript', 'PLpgSQL'],
    keywords: ['React Native', 'Expo', 'Express', 'Supabase', 'Llama 3.2', 'shift scheduling'],
    facts: [
      {
        label: { en: 'Origin', tr: 'Çıkış' },
        value: {
          en: 'Meta & YTU Llama Hackathon 2025 (24–26 October 2025, Istanbul; team Golden Head; theme: productivity tools)',
          tr: 'Meta & YTU Llama Hackathon 2025 (24–26 Ekim 2025, İstanbul; takım Golden Head; tema: verimlilik araçları)',
        },
      },
      { label: { en: 'Mobile app', tr: 'Mobil uygulama' }, value: { en: 'Expo SDK 54, React Native, TypeScript (strict)', tr: 'Expo SDK 54, React Native, TypeScript (strict)' } },
      { label: { en: 'Backend', tr: 'Backend' }, value: { en: 'Node.js, Express, Supabase (PostgreSQL, Auth), JWT', tr: 'Node.js, Express, Supabase (PostgreSQL, Auth), JWT' } },
      { label: { en: 'AI model', tr: 'Yapay zeka modeli' }, value: { en: 'Meta Llama 3.2 70B Instruct, self-hosted on a RunPod GPU', tr: 'Meta Llama 3.2 70B Instruct, RunPod GPU’sunda kendi barındırmamız' } },
    ],
    sections: [
      {
        title: { en: 'The problem', tr: 'Sorun' },
        paragraphs: [
          {
            en: 'The README frames it like this: small businesses with part-time staff build shift schedules by hand, collect availability over WhatsApp or on paper, and end up with distributions that feel unfair, which costs managers hours every week.',
            tr: 'README sorunu şöyle çerçeveler: yarı zamanlı çalışanı olan küçük işletmeler vardiya planını elle hazırlar, müsaitlikleri WhatsApp ya da kâğıt üzerinden toplar ve adil görünmeyen dağılımlarla karşılaşır; bu da yöneticilere her hafta saatlere mal olur.',
          },
        ],
      },
      {
        title: { en: 'What Shiffy does', tr: 'Shiffy ne yapar' },
        bullets: [
          {
            en: 'Managers sign up and set up a business themselves, add employee accounts with context notes, generate a schedule with the model in seconds, adjust it by drag and drop, then approve and distribute it in one tap. They can also track daily and weekly sales and tune deadlines, working days and shift lengths.',
            tr: 'Yöneticiler kendi başlarına kayıt olup işletmeyi kurar, bağlam notlarıyla çalışan hesapları ekler, modelle saniyeler içinde plan üretir, sürükle-bırak ile düzeltir, tek dokunuşla onaylayıp dağıtır. Günlük ve haftalık satışları izleyebilir; son tarih, çalışma günleri ve vardiya sürelerini ayarlayabilir.',
          },
          {
            en: 'Employees sign in with a username (no email needed), pick their availability in 30-minute slots (available, unavailable or leave request), see approved schedules and past shifts, and get deadline reminders. Drafts are saved automatically, also offline.',
            tr: 'Çalışanlar kullanıcı adıyla giriş yapar (e-posta gerekmez), müsaitliğini 30 dakikalık dilimlerde seçer (müsait, müsait değil ya da izin talebi), onaylanan planları ve geçmiş vardiyaları görür, son tarih hatırlatıcıları alır. Taslaklar, çevrimdışıyken de otomatik kaydedilir.',
          },
        ],
      },
      {
        title: { en: 'How the AI part works', tr: 'Yapay zeka kısmı nasıl çalışır' },
        paragraphs: [
          {
            en: 'The backend sends availability, the manager’s notes and the business rules to Meta Llama 3.2 70B Instruct as structured JSON prompts. The model is hosted on a RunPod GPU instance. The prompt asks for a fair distribution: respect availability, use the manager’s notes, balance hours across people, leave at least eight hours of rest between shifts, rotate weekend shifts and respect working-day limits. A cron job generates the schedule on the deadline day.',
            tr: 'Backend; müsaitlikleri, yöneticinin notlarını ve işletme kurallarını yapılandırılmış JSON istemleri olarak Meta Llama 3.2 70B Instruct’a gönderir. Model bir RunPod GPU örneğinde barındırılır. İstem adil bir dağılım ister: müsaitliğe uy, yönetici notlarını kullan, saatleri kişiler arasında dengele, vardiyalar arasında en az sekiz saat dinlenme bırak, hafta sonu vardiyalarını döndür ve çalışma günü sınırlarına uy. Son tarih gününde bir cron işi planı kendiliğinden üretir.',
          },
        ],
      },
      {
        title: { en: 'Engineering notes', tr: 'Mühendislik notları' },
        bullets: [
          {
            en: 'Two kinds of sign-in: Supabase Auth for managers and custom JWTs for employees, so employees need no email address.',
            tr: 'İki tür giriş: yöneticiler için Supabase Auth, çalışanlar için özel JWT; böylece çalışanların e-posta adresine ihtiyacı yok.',
          },
          {
            en: 'Row-level security in Supabase isolates each business’s data.',
            tr: 'Supabase’deki satır düzeyi güvenlik, her işletmenin verisini ayırır.',
          },
          {
            en: 'The API has more than 30 REST endpoints in a layered Express app (routes, services, repositories, middleware) written in strict TypeScript. It runs on an Oracle Cloud free-tier VM behind Nginx with PM2.',
            tr: 'API, katmanlı bir Express uygulamasında (rotalar, servisler, depolar, ara katmanlar) 30’dan fazla REST uç noktasına sahip ve strict TypeScript ile yazıldı. Oracle Cloud ücretsiz katmanındaki bir VM’de, Nginx arkasında PM2 ile çalışır.',
          },
          {
            en: 'The landing page (React, Vite, Tailwind CSS and shadcn/ui) has an assistant chatbot and is available in Turkish and English.',
            tr: 'Tanıtım sayfası (React, Vite, Tailwind CSS ve shadcn/ui) bir asistan sohbet botuna sahip ve Türkçe ile İngilizce sunuluyor.',
          },
        ],
      },
      {
        title: { en: 'What was planned next', tr: 'Sırada ne vardı' },
        paragraphs: [
          {
            en: 'The README lists push notifications, shift swaps between employees, support for several stores, calendar and PDF export, dark mode and a design system as work after the MVP.',
            tr: 'README, MVP sonrası iş olarak anlık bildirimleri, çalışanlar arası vardiya takasını, birden çok mağaza desteğini, takvim ve PDF dışa aktarımını, karanlık modu ve bir tasarım sistemini sayar.',
          },
        ],
      },
    ],
  },

  {
    id: 'canny',
    title: { en: 'Canny Edge Detection GUI in Python and OpenCV', tr: 'Canny kenar algılama arayüzü (Python, OpenCV)' },
    description: {
      en: 'A from-scratch Canny edge detector in Python (Sobel gradients, non-maximum suppression, double thresholding, hysteresis) with a Tkinter app that shows each stage.',
      tr: 'Python ile sıfırdan yazılmış Canny kenar algılayıcı (Sobel, maksimum olmayan bastırma, çift eşikleme, histerezis) ve her aşamayı gösteren Tkinter uygulaması.',
    },
    tagline: {
      en: 'The Canny edge detector written from scratch, with a desktop app that lets you step through every stage of the pipeline.',
      tr: 'Canny kenar algılayıcısı sıfırdan yazıldı; hattın her aşamasını adım adım gösteren bir masaüstü uygulamasıyla birlikte.',
    },
    repo: 'https://github.com/ymcbzrgn/CannyEdgeDetection',
    languages: ['Python'],
    keywords: ['computer vision', 'edge detection', 'OpenCV', 'NumPy', 'Tkinter'],
    facts: [
      { label: { en: 'Language', tr: 'Dil' }, value: { en: 'Python', tr: 'Python' } },
      { label: { en: 'Libraries', tr: 'Kütüphaneler' }, value: { en: 'NumPy, OpenCV, Matplotlib; Tkinter for the interface', tr: 'NumPy, OpenCV, Matplotlib; arayüz için Tkinter' } },
      { label: { en: 'Licence', tr: 'Lisans' }, value: { en: 'Unlicense', tr: 'Unlicense' } },
    ],
    sections: [
      {
        title: { en: 'What it is', tr: 'Nedir' },
        paragraphs: [
          {
            en: 'An implementation of the Canny edge detection algorithm (John F. Canny, 1986), a classic of computer vision, wrapped in a Tkinter desktop app. You choose an image, set how much to blur it, press Submit and see the result. Writing the stages by hand rather than calling a library function makes each of them visible, and the app shows them one by one.',
            tr: 'Bilgisayarlı görünün klasiklerinden Canny kenar algılama algoritmasının (John F. Canny, 1986) bir Tkinter masaüstü uygulamasına sarılmış gerçeklemesi. Bir görüntü seçersin, ne kadar bulanıklaştıracağını ayarlarsın, Submit’e basıp sonucu görürsün. Aşamaları hazır bir kütüphane fonksiyonunu çağırmak yerine elle yazmak her birini görünür kılar; uygulama da onları tek tek gösterir.',
          },
        ],
      },
      {
        title: { en: 'The pipeline', tr: 'Hat' },
        bullets: [
          { en: 'Gaussian blur to suppress noise (the blur scale is a control in the app).', tr: 'Gürültüyü bastırmak için Gauss bulanıklığı (bulanıklık ölçeği uygulamada bir kontrol).' },
          { en: 'Sobel gradients for the strength and direction of every edge.', tr: 'Her kenarın gücü ve yönü için Sobel gradyanları.' },
          { en: 'Non-maximum suppression to thin edges to a single pixel.', tr: 'Kenarları tek piksele inceltmek için maksimum olmayan bastırma.' },
          { en: 'Double thresholding to separate strong edges, weak edges and non-edges.', tr: 'Güçlü kenarları, zayıf kenarları ve kenar olmayanları ayırmak için çift eşikleme.' },
          { en: 'Hysteresis: weak edges are kept only when they connect to strong ones.', tr: 'Histerezis: zayıf kenarlar yalnızca güçlü kenarlara bağlandıklarında tutulur.' },
        ],
      },
    ],
  },
];
