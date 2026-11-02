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
            en: 'HydraQuant is an AI-assisted trading engine for cryptocurrency markets. It has four main parts: a rule-based signal engine, a debate between language-model agents, adaptive learning that updates after every closed trade, and Bayesian position sizing. It runs on free-tier LLM providers and free data sources. It is alpha software for research, and nothing it produces is investment advice.',
            tr: 'HydraQuant, kripto para piyasaları için yapay zeka destekli bir ticaret motoru. Dört ana parçası var: kural tabanlı bir sinyal motoru, dil modeli ajanları arasında bir tartışma, kapanan her işlemden sonra güncellenen uyarlanabilir öğrenme ve Bayes pozisyon boyutlandırması. Ücretsiz LLM sağlayıcıları ve ücretsiz veri kaynaklarıyla çalışır. Alfa aşamasında, araştırma amaçlı bir yazılım. Ürettiği hiçbir şey yatırım tavsiyesi değil.',
          },
        ],
      },
      {
        title: { en: 'Design decisions', tr: 'Tasarım kararları' },
        bullets: [
          {
            en: 'A rule-based Evidence Engine scores each trade in about 50 ms and costs nothing in API calls. It asks a language model only when the remaining uncertainty is worth the cost, so most decisions never reach one.',
            tr: 'Kural tabanlı Kanıt Motoru her işlemi yaklaşık 50 ms’de puanlar ve API maliyeti çıkarmaz. Dil modeline yalnızca kalan belirsizlik maliyete değdiğinde sorar, bu yüzden kararların çoğu hiçbirine uğramaz.',
          },
          {
            en: 'Six questions are scored on their own: trend, momentum, crowd positioning, historical evidence, macro conditions and risk. When the scores disagree, the engine gets more cautious and keeps the disagreement as a signal.',
            tr: 'Altı soru ayrı ayrı puanlanır: trend, momentum, kalabalığın konumu, tarihsel kanıt, makro koşullar ve risk. Puanlar çeliştiğinde motor daha temkinli davranır ve çelişkiyi bir sinyal olarak tutar.',
          },
          {
            en: 'When the engine needs a second opinion, a debate runs. Four to seven specialist agents, picked from twelve for the current market regime, argue for up to three rounds. If the first round already agrees, the engine skips the cross-examination to save cost.',
            tr: 'Motorun ikinci bir görüşe ihtiyacı olduğunda tartışma başlar. On iki uzman arasından mevcut piyasa rejimine göre seçilen dört ila yedi ajan en fazla üç tur tartışır. İlk tur zaten uzlaşıyorsa motor, maliyeti düşürmek için çapraz sorguyu atlar.',
          },
          {
            en: 'Learning rates, risk thresholds and exit multipliers are adaptive parameters. The engine updates them after every closed trade.',
            tr: 'Öğrenme oranları, risk eşikleri ve çıkış çarpanları uyarlanabilir parametrelerdir. Motor onları kapanan her işlemden sonra günceller.',
          },
          {
            en: 'Confidence decides the size of a position. A weak signal becomes a shadow trade that the engine studies later, and a ledger records what the skipped signals would have earned. Thresholds loosen when caution costs too much.',
            tr: 'Güven, pozisyonun boyutunu belirler. Zayıf bir sinyal, motorun sonradan incelediği bir gölge işlem olur. Bir defter, atlanan sinyallerin ne kazandıracağını kaydeder. Temkin fazla pahalıya mal olduğunda eşikler gevşer.',
          },
          {
            en: 'Seven LLM providers sit behind a bandit-based router with a circuit breaker. Macro data arrives through three fallback cascades, and five independent risk guardrails stand in front of the exchange.',
            tr: 'Yedi LLM sağlayıcısı, devre kesicili ve bandit tabanlı bir yönlendiricinin arkasında durur. Makro veri üç yedekli kademeden gelir, borsanın önünde de beş bağımsız risk koruması vardır.',
          },
        ],
      },
      {
        title: { en: 'Architecture', tr: 'Mimari' },
        paragraphs: [
          {
            en: 'The system has six layers. At the top are a Vue 3 dashboard (an extended FreqUI) and a Telegram notifier. Below them sit a FastAPI read API, an APScheduler layer for training, evolution and consolidation jobs, the cognition layer (evidence engine, debate, agent pool, LLM router, adaptive parameters) and the decision layer (Bayesian Kelly sizing, hard risk limits, graduated autonomy). Execution goes to freqtrade through CCXT.',
            tr: 'Sistemin altı katmanı var. En üstte bir Vue 3 panosu (genişletilmiş FreqUI) ve bir Telegram bildiricisi duruyor. Altında bir FastAPI okuma API’si, eğitim, evrim ve pekiştirme işleri için bir APScheduler katmanı, biliş katmanı (kanıt motoru, tartışma, ajan havuzu, LLM yönlendirici, uyarlanabilir parametreler) ve karar katmanı (Bayes Kelly boyutlandırma, katı risk limitleri, kademeli özerklik) geliyor. Yürütme CCXT üzerinden freqtrade’e gidiyor.',
          },
        ],
      },
      {
        title: { en: 'How a decision flows', tr: 'Bir karar nasıl akar' },
        bullets: [
          { en: 'A candle arrives and the strategy callback fires.', tr: 'Bir mum gelir ve strateji geri çağrısı çalışır.' },
          {
            en: 'Three forecasters run in parallel (Tiny Time Mixer embeddings, Chronos-Bolt quantiles and a CatBoost classifier), and the engine fuses them into one direction estimate.',
            tr: 'Üç tahminci paralel çalışır (Tiny Time Mixer gömmeleri, Chronos-Bolt kantilleri ve bir CatBoost sınıflandırıcısı) ve motor çıktılarını tek bir yön tahmininde birleştirir.',
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
    title: { en: 'A desktop OS in the browser: this portfolio', tr: 'Tarayıcıda masaüstü işletim sistemi: portfolyom' },
    description: {
      en: 'How this portfolio is built: a desktop OS in the browser with React, TypeScript and Vite, a virtual file system, a pixel-art twin and a phone mode. No backend.',
      tr: 'Bu portfolyo nasıl yapıldı: React, TypeScript ve Vite ile tarayıcıda masaüstü işletim sistemi, sanal dosya sistemi, piksel ikiz ve telefon modu. Backend yok.',
    },
    tagline: {
      en: 'A portfolio built as an operating system: windows, a file system, a terminal, a pixel-art twin and a phone mode, with no backend.',
      tr: 'İşletim sistemi olarak kurulmuş bir portfolyo: pencereler, dosya sistemi, terminal, piksel ikiz ve telefon modu. Backend yok.',
    },
    repo: 'https://github.com/ymcbzrgn/ymcbzrgn',
    demo: 'https://yamacbezirgan.com/',
    languages: ['TypeScript', 'CSS', 'JavaScript'],
    keywords: ['React', 'TypeScript', 'Vite', 'IndexedDB', 'pixel art', 'Cloudflare Pages', 'Playwright'],
    facts: [
      { label: { en: 'Stack', tr: 'Teknoloji' }, value: { en: 'React 18, TypeScript, Vite, Zustand', tr: 'React 18, TypeScript, Vite, Zustand' } },
      { label: { en: 'First screen', tr: 'İlk ekran' }, value: { en: '{firstScreenKB} KB gzip', tr: '{firstScreenKB} KB gzip' } },
      { label: { en: 'Scripts', tr: 'Script' }, value: { en: '{scripts}; only the entry and a few vendor chunks load up front', tr: '{scripts} adet; açılışta yalnızca giriş betiği ve birkaç vendor parçası yüklenir' } },
      { label: { en: 'Browser test suites', tr: 'Tarayıcı test paketi' }, value: { en: '{suites}, run on every push', tr: '{suites} adet, her push’ta çalışır' } },
      { label: { en: 'Hosting', tr: 'Barındırma' }, value: { en: 'Cloudflare Pages, static files only', tr: 'Cloudflare Pages, yalnızca statik dosyalar' } },
    ],
    sections: [
      {
        title: { en: 'What it is', tr: 'Nedir' },
        paragraphs: [
          {
            en: 'The desktop runs in the browser with no backend. You can drag its windows, and a virtual file system kept in IndexedDB remembers your changes. The built-in apps are a PDF viewer, a terminal with pipes and git log, a Markdown reader, a GitHub project explorer, a music player, four games, notes, a calculator, a calendar and photos. There is also a command palette, a guided tour and achievements. On a phone it turns into a phone: a lock screen, a home screen with widgets, and the same apps in a full-screen shell.',
            tr: 'Masaüstü backend olmadan tarayıcıda çalışıyor. Pencerelerini sürükleyebilirsin, IndexedDB’de tutulan sanal dosya sistemi de yaptığın değişiklikleri hatırlıyor. Yerleşik uygulamalar şunlar: PDF görüntüleyici, pipe ve git log destekli terminal, Markdown okuyucu, GitHub proje gezgini, müzik çalar, dört oyun, notlar, hesap makinesi, takvim ve fotoğraflar. Komut paleti, rehberli tur ve başarımlar da var. Telefonda bir telefona dönüşüyor: kilit ekranı, widget’lı ana ekran ve aynı uygulamalar tam ekran bir kabukta.',
          },
        ],
      },
      {
        title: { en: 'The pixel twin', tr: 'Piksel ikiz' },
        paragraphs: [
          {
            en: 'A pixel-art character walks around the desktop, sits on window title bars, moves into folders as rooms and reacts to what you do. I draw every sprite, tile, room prop and app icon in code (scripts/sprites): ASCII bitmaps and shapes with automatic outlines, packed into indexed PNG sheets of a few kilobytes each. The Web Audio API synthesises the sound, so there are no audio files.',
            tr: 'Piksel-art bir karakter masaüstünde dolaşıyor, pencere başlık çubuklarına oturuyor, klasörlere oda olarak taşınıyor ve yaptıklarına tepki veriyor. Her sprite’ı, karoyu, oda eşyasını ve uygulama ikonunu kodla çiziyorum (scripts/sprites): otomatik kenarlıklı ASCII bitmap’ler ve şekiller, her biri birkaç kilobaytlık indeksli PNG sayfalarına paketleniyor. Sesi Web Audio API sentezliyor, ses dosyası yok.',
          },
        ],
      },
      {
        title: { en: 'The size budget', tr: 'Boyut bütçesi' },
        paragraphs: [
          {
            en: 'The first screen is {firstScreenKB} KB gzip, measured by the build. A script fails the build when it grows past its budget. Every app, the twin, the palette and the story load when you ask for them. The phone UI and its animation library are a separate chunk that desktop visitors never download.',
            tr: 'İlk ekran {firstScreenKB} KB gzip ve bunu derleme ölçüyor. Bütçeyi aşarsa bir betik derlemeyi düşürüyor. Her uygulama, ikiz, palet ve hikâye istenince yükleniyor. Telefon arayüzü animasyon kütüphanesiyle birlikte ayrı bir parça, masaüstü ziyaretçileri onu hiç indirmiyor.',
          },
        ],
      },
      {
        title: { en: 'Search engines and assistants', tr: 'Arama motorları ve asistanlar' },
        paragraphs: [
          {
            en: 'A client-rendered app is an empty div to a crawler, so a Vite plugin writes the facts into the HTML at build time: head tags, structured data, a plain boot block, a static résumé in two languages, Markdown copies, a sitemap, llms.txt and one page per project, like this one.',
            tr: 'İstemcide çizilen bir uygulama arama robotuna boş bir div görünür. Bu yüzden bir Vite eklentisi bilgileri derleme sırasında HTML’e yazıyor: head etiketleri, yapılandırılmış veri, düz bir açılış bloğu, iki dilde statik özgeçmiş, Markdown kopyaları, site haritası, llms.txt ve her proje için bir sayfa, tıpkı bu sayfa gibi.',
          },
        ],
      },
      {
        title: { en: 'Quality', tr: 'Kalite' },
        paragraphs: [
          {
            en: 'Type checking, ESLint, bundle budgets, an SEO audit and {suites} Playwright suites run against the production build on every push. I made the test server imitate the routing of Cloudflare Pages, which exposed requests that the single-page-app fallback had been answering silently.',
            tr: 'Tip denetimi, ESLint, paket bütçeleri, SEO denetimi ve {suites} Playwright paketi her push’ta üretim derlemesine karşı çalışıyor. Test sunucusunu Cloudflare Pages’in yönlendirmesini taklit edecek şekilde kurdum. Bu, tek sayfalık uygulama yedeğinin sessizce yanıtladığı istekleri ortaya çıkardı.',
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
            en: 'QuirkLLM is a terminal coding assistant in the spirit of Claude Code CLI and Gemini CLI. It runs on the developer’s own machine, so the code never has to leave the laptop. It needs no GPU and uses one when it finds one.',
            tr: 'QuirkLLM, Claude Code CLI ve Gemini CLI ruhunda bir terminal kodlama asistanı. Geliştiricinin kendi makinesinde çalışıyor, yani kod dizüstünden hiç çıkmak zorunda kalmıyor. GPU gerektirmiyor, bulursa kullanıyor.',
          },
        ],
      },
      {
        title: { en: 'RAM-aware profiles', tr: 'RAM duyarlı profiller' },
        paragraphs: [
          {
            en: 'On start it detects the available RAM and picks one of four profiles. Context length, cache sizes and quantisation follow the profile, and you can override the profile by hand.',
            tr: 'Açılışta kullanılabilir RAM’i algılar ve dört profilden birini seçer. Bağlam uzunluğu, önbellek boyutları ve nicemleme profile göre belirlenir, profili elle de değiştirebilirsin.',
          },
        ],
        bullets: [
          { en: 'Survival (about 8 GB): 16K context, 4-bit weights, the core features.', tr: 'Survival (yaklaşık 8 GB): 16K bağlam, 4-bit ağırlık, temel özellikler.' },
          { en: 'Comfort (about 16 GB): 32K context, 4-bit weights, every feature.', tr: 'Comfort (yaklaşık 16 GB): 32K bağlam, 4-bit ağırlık, tüm özellikler.' },
          { en: 'Power (about 32 GB): 64K context, 8-bit weights, parallel work.', tr: 'Power (yaklaşık 32 GB): 64K bağlam, 8-bit ağırlık, paralel çalışma.' },
          { en: 'Beast (64 GB and up): 128K context at 8 bits.', tr: 'Beast (64 GB ve üzeri): 8 bitte 128K bağlam.' },
        ],
      },
      {
        title: { en: 'Four working modes', tr: 'Dört çalışma modu' },
        bullets: [
          { en: 'Chat is the default. It asks for confirmation before anything critical.', tr: 'Chat varsayılan moddur. Kritik her işlemden önce onay ister.' },
          {
            en: 'YAMI is “auto-accept”. It writes code, runs tests and fixes files without asking, except for very risky commands.',
            tr: 'YAMI “otomatik kabul” modudur. Çok riskli komutlar dışında sormadan kod yazar, test çalıştırır ve dosyaları düzeltir.',
          },
          {
            en: 'Plan is read-only. It analyses the project and writes plans (TODO and architecture notes) without changing any code.',
            tr: 'Plan salt okunurdur. Projeyi inceler, hiçbir kodu değiştirmeden planlar (TODO ve mimari notları) yazar.',
          },
          {
            en: 'Ghost watches in the background. When you save a file, it analyses the change and warns you if it broke another file.',
            tr: 'Ghost arka planda izler. Bir dosyayı kaydettiğinde değişikliği inceler, başka bir dosyayı bozduysa uyarır.',
          },
        ],
      },
      {
        title: { en: 'Knowledge and integration', tr: 'Bilgi ve entegrasyon' },
        paragraphs: [
          {
            en: 'Knowledge Eater takes a documentation URL or a PDF and embeds its pages into a local vector store, so QuirkLLM can answer from documentation that is private or offline. Neural Link runs QuirkLLM as a Model Context Protocol (MCP) server, which lets MCP-capable tools such as Claude Desktop or Cursor see the local repository.',
            tr: 'Knowledge Eater, bir dokümantasyon URL’sini ya da PDF’ini alıp sayfalarını yerel bir vektör deposuna gömer, böylece QuirkLLM özel ya da çevrimdışı dokümanlardan yanıt verebilir. Neural Link, QuirkLLM’i bir Model Context Protocol (MCP) sunucusu olarak çalıştırır. Claude Desktop ya da Cursor gibi MCP destekli araçlar da yerel depoyu görebilir.',
          },
        ],
      },
      {
        title: { en: 'How it is put together', tr: 'Nasıl kurulu' },
        paragraphs: [
          {
            en: 'According to the README, the pipeline has a system detector (psutil), an interactive CLI with a REPL and session manager, a project analyser that detects frameworks and package managers, a conversation engine that manages the context window, compacts history and resolves references such as “it” and “that component”, and adaptive inference and RAG layers that follow the active profile. The base model it names is DeepSeek Coder 1.3B.',
            tr: 'README’ye göre hattın parçaları şunlar: bir sistem algılayıcı (psutil), REPL ve oturum yöneticili etkileşimli CLI, çatıları ve paket yöneticilerini algılayan proje analizcisi, bağlam penceresini yöneten, geçmişi sıkıştıran ve “bunu”, “şu bileşen” gibi göndermeleri çözen konuşma motoru, bir de etkin profili izleyen uyarlanabilir çıkarım ve RAG katmanları. README’nin adını andığı temel model DeepSeek Coder 1.3B.',
          },
        ],
      },
    ],
  },

  {
    id: 'shiffy',
    title: { en: 'Shiffy: AI shift scheduling built on Llama', tr: 'Shiffy: Llama destekli vardiya planlama' },
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
            en: 'According to the README, small businesses with part-time staff build shift schedules by hand and collect availability over WhatsApp or on paper. The result feels unfair, and managers lose hours every week.',
            tr: 'README’ye göre yarı zamanlı çalışanı olan küçük işletmeler vardiya planını elle hazırlıyor, müsaitlikleri WhatsApp ya da kâğıt üzerinden topluyor. Sonuç adil hissettirmiyor ve yöneticiler her hafta saatlerini kaybediyor.',
          },
        ],
      },
      {
        title: { en: 'What Shiffy does', tr: 'Shiffy ne yapar' },
        bullets: [
          {
            en: 'Managers sign up and set up a business themselves, add employee accounts with context notes, generate a schedule with the model in seconds, adjust it by drag and drop, then approve and distribute it in one tap. They can also track daily and weekly sales and tune deadlines, working days and shift lengths.',
            tr: 'Yöneticiler kendi başlarına kayıt olup işletmeyi kurar, bağlam notlarıyla çalışan hesapları ekler, modelle saniyeler içinde plan üretir, sürükle-bırak ile düzeltir, tek dokunuşla onaylayıp dağıtır. Günlük ve haftalık satışları da izleyebilir, son tarihi, çalışma günlerini ve vardiya sürelerini ayarlayabilir.',
          },
          {
            en: 'Employees sign in with a username (no email needed), pick their availability in 30-minute slots (available, unavailable or leave request), see approved schedules and past shifts, and get deadline reminders. Drafts autosave, offline too.',
            tr: 'Çalışanlar kullanıcı adıyla giriş yapar (e-posta gerekmez), müsaitliğini 30 dakikalık dilimlerde seçer (müsait, müsait değil ya da izin talebi), onaylanan planları ve geçmiş vardiyaları görür, son tarih hatırlatıcıları alır. Uygulama taslakları çevrimdışıyken de otomatik kaydeder.',
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
            en: 'I implemented the Canny edge detection algorithm (John F. Canny, 1986), a classic of computer vision, from scratch to strengthen my fundamentals, and put it in a Tkinter desktop app. You choose an image, set how much to blur it, press Submit and see the result. I wrote each stage by hand, so the app can show them one by one.',
            tr: 'Canny kenar algılama algoritmasını (John F. Canny, 1986) bilgisayarlı görü temellerimi sağlamlaştırmak için sıfırdan yazdım ve bir Tkinter masaüstü uygulamasına koydum. Bir görüntü seçiyor, ne kadar bulanıklaştıracağını ayarlıyor, Submit’e basıp sonucu görüyorsun. Her aşamayı elle yazdığım için uygulama onları tek tek gösterebiliyor.',
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
          { en: 'Hysteresis keeps weak edges only when they connect to strong ones.', tr: 'Histerezis, zayıf kenarları yalnızca güçlü kenarlara bağlandıklarında tutar.' },
        ],
      },
    ],
  },
];
