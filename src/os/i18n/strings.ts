/**
 * UI strings for the onboarding experience (welcome window, widget, simple view,
 * pixel assistant, terminal commands). English and Turkish.
 *
 * The longer biography text lives in ../content/profile.ts.
 * Add a key to `en` first; TypeScript then requires the Turkish counterpart.
 */

import { CORE, type CoreKey, type Lang } from './core';

export type { Lang };

const en = {
  // identity
  role: 'Software Engineer',
  tagline: 'AI platforms · backend · full-stack',
  currentRole: 'Software Engineer at Arketic AI',

  // welcome window
  welcomeGreeting: "Hi, I'm Yamaç",
  welcomeIntro:
    'This site is an interactive desktop. Double-click an icon to open it, drag windows around, or jump straight in with the shortcuts below.',
  welcomeTip: 'Tip: double-click an icon to open it. Right-click the desktop for more.',
  ctaCv: 'View CV',
  ctaProjects: 'Projects',
  ctaContact: 'Contact',
  ctaExplore: 'Explore the desktop',
  langSwitchLabel: 'Switch language',
  langOther: 'TR',

  // desktop widget
  greetMorning: 'Good morning',
  greetAfternoon: 'Good afternoon',
  greetEvening: 'Good evening',
  greetNight: 'Good night',
  widgetWelcome: 'Welcome to my desktop',
  widgetHide: 'Hide widget',

  // simple view
  simpleBack: 'Open the interactive desktop',
  secAbout: 'About',
  secFocus: 'Current focus',
  secWork: 'Areas of work',
  secStyle: 'Working style',
  secProjects: 'Projects',
  secContact: 'Contact',
  downloadCv: 'Download CV (PDF)',
  viewCv: 'Open CV',
  emailMe: 'Email me',
  copy: 'Copy',
  copied: 'Copied!',
  contactIntro: 'The quickest way to reach me:',

  // pixel assistant
  petHello: "Hi! I'm Yamaç's pixel twin.",
  petTipDouble: 'Double-click an icon to open it.',
  petTipTerminal: 'Try the Terminal: type "about".',
  petTipCv: 'Short on time? Open CV.pdf.',
  petTipGames: 'Check the Games folder. Snake is oddly addictive.',
  petTipDrag: 'You can drag me around, too.',
  petTipSimple: 'In a hurry? There is a Simple view.',
  petTipWallpaper: 'Not a teal fan? Settings has wallpapers.',
  petBoredA: 'Anyone there?',
  petBoredB: 'I could use a coffee.',
  petBoredC: 'Reading docs. Again.',
  petBoredD: 'git commit -m "one more fix"',
  petSleepy: 'zzz…',
  petJump: 'Wheee!',
  petMenuTitle: 'Hi, need a hand?',
  petMenuCv: 'Open CV',
  petMenuProjects: 'Projects',
  petMenuSimple: 'Simple view',
  petMenuWelcome: 'Show welcome',
  petMenuHide: 'Hide me',

  // settings
  setAssistant: 'Pixel assistant',
  setAssistantHint: 'A little pixel version of me that wanders around the desktop',
  setWidget: 'Desktop widget',
  setWidgetHint: 'Intro card in the top-right corner',
  setLanguage: 'Language',

  // terminal
  termHelpTitle: 'Portfolio commands',
  termHelpAbout: 'who I am',
  termHelpProjects: 'open my GitHub projects',
  termHelpCv: 'open my CV',
  termHelpContact: 'how to reach me',
  termHelpSimple: 'switch to the simple one-page view',
  termOpeningCv: 'Opening CV…',
  termOpeningProjects: 'Opening projects…',
  termOpeningSimple: 'Switching to the simple view…',
  termContact: 'Contact',
  termMore: 'Try: cv · projects · contact · simple',
};

type MoreKey = keyof typeof en;
export type StringKey = MoreKey | CoreKey;

const tr: Record<MoreKey, string> = {
  role: 'Yazılım Mühendisi',
  tagline: 'Yapay zeka platformları · backend · full-stack',
  currentRole: "Arketic AI'da Yazılım Mühendisi",

  welcomeGreeting: 'Merhaba, ben Yamaç',
  welcomeIntro:
    'Bu site etkileşimli bir masaüstü. Bir ikona çift tıklayarak aç, pencereleri sürükle ya da aşağıdaki kısayollarla doğrudan başla.',
  welcomeTip: 'İpucu: bir ikonu açmak için çift tıkla. Masaüstüne sağ tıklayınca daha fazlası çıkar.',
  ctaCv: "CV'yi aç",
  ctaProjects: 'Projeler',
  ctaContact: 'İletişim',
  ctaExplore: 'Masaüstünü keşfet',
  langSwitchLabel: 'Dili değiştir',
  langOther: 'EN',

  greetMorning: 'Günaydın',
  greetAfternoon: 'İyi günler',
  greetEvening: 'İyi akşamlar',
  greetNight: 'İyi geceler',
  widgetWelcome: 'Masaüstüme hoş geldin',
  widgetHide: "Widget'ı gizle",

  simpleBack: 'Etkileşimli masaüstünü aç',
  secAbout: 'Hakkımda',
  secFocus: 'Güncel odağım',
  secWork: 'Çalışma alanlarım',
  secStyle: 'Çalışma yaklaşımım',
  secProjects: 'Projeler',
  secContact: 'İletişim',
  downloadCv: "CV'yi indir (PDF)",
  viewCv: "CV'yi aç",
  emailMe: 'E-posta gönder',
  copy: 'Kopyala',
  copied: 'Kopyalandı!',
  contactIntro: 'Bana ulaşmanın en hızlı yolu:',

  petHello: "Selam! Ben Yamaç'ın piksel ikiziyim.",
  petTipDouble: 'Bir ikonu açmak için çift tıkla.',
  petTipTerminal: 'Terminal\'i dene: "about" yaz.',
  petTipCv: "Vaktin mi az? CV.pdf'i aç.",
  petTipGames: 'Games klasörüne göz at. Snake garip şekilde bağımlılık yapıyor.',
  petTipDrag: 'Beni de sürükleyebilirsin.',
  petTipSimple: 'Acelen mi var? Sade görünüm var.',
  petTipWallpaper: "Teal'i sevmediysen Ayarlar'da duvar kağıtları var.",
  petBoredA: 'Kimse yok mu?',
  petBoredB: 'Bir kahveye ihtiyacım var.',
  petBoredC: 'Yine dokümantasyon okuyorum.',
  petBoredD: 'git commit -m "bir düzeltme daha"',
  petSleepy: 'zzz…',
  petJump: 'Yaşasın!',
  petMenuTitle: 'Selam, yardım lazım mı?',
  petMenuCv: "CV'yi aç",
  petMenuProjects: 'Projeler',
  petMenuSimple: 'Sade görünüm',
  petMenuWelcome: 'Karşılamayı göster',
  petMenuHide: 'Beni gizle',

  setAssistant: 'Piksel asistan',
  setAssistantHint: 'Masaüstünde dolaşan küçük piksel halim',
  setWidget: "Masaüstü widget'ı",
  setWidgetHint: 'Sağ üst köşedeki tanıtım kartı',
  setLanguage: 'Dil',

  termHelpTitle: 'Portfolyo komutları',
  termHelpAbout: 'ben kimim',
  termHelpProjects: 'GitHub projelerimi aç',
  termHelpCv: "CV'mi aç",
  termHelpContact: 'bana nasıl ulaşırsın',
  termHelpSimple: 'sade tek sayfa görünüme geç',
  termOpeningCv: 'CV açılıyor…',
  termOpeningProjects: 'Projeler açılıyor…',
  termOpeningSimple: 'Sade görünüme geçiliyor…',
  termContact: 'İletişim',
  termMore: 'Dene: cv · projects · contact · simple',
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = {
  en: { ...CORE.en, ...en },
  tr: { ...CORE.tr, ...tr },
};
