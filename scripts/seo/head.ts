/**
 * Build-time SEO, part 2: everything that goes into a page's <head> (title, description, canonical,
 * hreflang, Open Graph, Twitter, JSON-LD). One function per page and language, so the two languages
 * and the two page kinds can never drift apart.
 */
import { PROFILE } from '../../src/os/content/profile';
import { MEDALS, PITCH, SKILLS, SPOKEN, STUDIES } from '../../src/os/content/career';
import { STRINGS } from '../../src/os/i18n/strings';
import { AVATAR, LANGS, LOCALE, META, OG_IMAGE, OG_SIZE, PATH, abs, esc, jsonScript, type Lang, type PageId } from './site';

const PERSON_ID = abs('/#person');
const SITE_ID = abs('/#website');

function person(lang: Lang) {
  const skills = SKILLS.flatMap((g) => g.items);
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: PROFILE.name,
    givenName: 'Yamaç',
    familyName: 'Bezirgan',
    alternateName: ['Yamac Bezirgan', 'ymcbzrgn'],
    url: abs('/'),
    image: abs(AVATAR),
    description: PITCH[lang],
    jobTitle: STRINGS[lang].role,
    worksFor: { '@type': 'Organization', name: PROFILE.company },
    alumniOf: STUDIES.map((s) => ({ '@type': 'CollegeOrUniversity', name: s.school.en })),
    knowsAbout: ['Artificial Intelligence', 'Backend architecture', 'Full-stack development', ...skills],
    knowsLanguage: SPOKEN.map((l) => l.code),
    award: MEDALS.filter((m) => m.podium).map((m) => `${m.result.en}, ${m.name}`),
    email: PROFILE.email,
    sameAs: [PROFILE.github, PROFILE.linkedin],
  };
}

/** WebSite + ProfilePage + Person, linked by @id. */
export function graph(page: PageId, lang: Lang, modified: string) {
  const meta = META[page][lang];
  const url = abs(PATH[page][lang]);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': SITE_ID,
        url: abs('/'),
        name: PROFILE.name,
        alternateName: 'Yamac Bezirgan',
        inLanguage: LANGS,
        publisher: { '@id': PERSON_ID },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${url}#profilepage`,
        url,
        name: meta.title,
        description: meta.description,
        inLanguage: lang,
        isPartOf: { '@id': SITE_ID },
        mainEntity: { '@id': PERSON_ID },
        dateModified: modified,
        primaryImageOfPage: { '@type': 'ImageObject', url: abs(OG_IMAGE[lang]), ...OG_SIZE },
      },
      person(lang),
    ],
  };
}

/** The <head> block of one page. */
export function headBlock(page: PageId, lang: Lang, modified: string): string {
  const meta = META[page][lang];
  const url = abs(PATH[page][lang]);
  const image = abs(OG_IMAGE[lang]);
  const other: Lang = lang === 'en' ? 'tr' : 'en';
  const tags: string[] = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="author" content="${esc(PROFILE.name)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    `<link rel="canonical" href="${url}" />`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(PATH[page][l])}" />`),
    `<link rel="alternate" hreflang="x-default" href="${abs(PATH[page].en)}" />`,
    `<meta property="og:type" content="${page === 'resume' ? 'profile' : 'website'}" />`,
    `<meta property="og:site_name" content="${esc(PROFILE.name)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="${OG_SIZE.width}" />`,
    `<meta property="og:image:height" content="${OG_SIZE.height}" />`,
    `<meta property="og:image:alt" content="${esc(meta.alt)}" />`,
    `<meta property="og:locale" content="${LOCALE[lang]}" />`,
    `<meta property="og:locale:alternate" content="${LOCALE[other]}" />`,
    ...(page === 'resume'
      ? [
          `<meta property="profile:first_name" content="Yamaç" />`,
          `<meta property="profile:last_name" content="Bezirgan" />`,
          `<meta property="profile:username" content="ymcbzrgn" />`,
        ]
      : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:creator" content="@ymcbzrgn" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:image:alt" content="${esc(meta.alt)}" />`,
    jsonScript(graph(page, lang, modified)),
  ];
  return tags.join('\n    ');
}
