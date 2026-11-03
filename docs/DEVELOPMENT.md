# Development notes

The site is a React + TypeScript + Vite "desktop OS". `main` is deployed by Cloudflare Pages.

## Everything at once

```bash
npm ci
npm run verify        # type check, lint errors, build, bundle budgets, behaviour table, SEO checks, browser tests
```

The browser tests need Chromium once: `npx playwright install chromium`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build:new` | production build of the desktop (`dist/`). First writes the GitHub repository snapshot, see below |
| `npm run build` | `build:new` plus the legacy site: the full production build |
| `npm run check:budgets` | fails when the first paint (gzip) or a lazy chunk gets heavier than its budget (`scripts/check-budgets.mjs`) |
| `npm run check:behaviors` | sanity check of the pixel twin's generated behaviour table |
| `npm run check:seo` | checks the built pages: canonical, hreflang, JSON-LD, sitemap, the boot block, every address in `llms.txt`, `_headers`, no link to the dead `www` host, the CV's links and title (`scripts/check-seo.mjs`) |
| `npm run seo:assets` | redraws `og-en.jpg`, `og-tr.jpg` and `avatar.png` (the share images) with the pixel twin; commit the result |
| `npm run test:e2e` | all browser suites in `tests/e2e` against `dist/` (`node tests/e2e/run.cjs features pet` runs some) |
| `npm run bench:drag` | window drag frame-time benchmark (needs a running server in `BASE`) |
| `npm run build:sprites` | regenerates the pixel twin and the room scenery sheets from `scripts/sprites` (props are drawn in code in `scene.mjs`; `--preview out.png` writes an enlarged contact sheet) |
| `npm run build:icons` | regenerates the phone's app icon sheet (`src/assets/sprites/icons.png`, drawn in code in `scripts/sprites/icons.mjs`; `--preview out.png` writes an enlarged contact sheet) |
| `npm run gitlog` | refreshes `src/assets/gitlog.fallback.json` (what the terminal's `git log` shows when the build has no history) |

## Things worth knowing

- **Everything new is lazy.** The first paint is about 76 KB gzip and has a budget; features load on demand.
  The overlay host (`src/ui/extras`) carries the command palette, achievement toasts, the tour panel and the
  `rm -rf /` prank; the tray buttons, the terminal, the music player and the pixel twin are their own chunks.
- **Sound is off until the visitor switches it on**, and there are no audio files: `src/os/sound` and
  `src/apps/music-player` synthesise everything with the Web Audio API.
- **The pixel twin** (`src/ui/pet`) has an autonomous engine (`Pet.tsx`, driven by the behaviour table), a lazy
  control engine (`control/`), scripted moves (`autonomy.ts`, `script.ts`, the tour in `src/ui/tour`) and rooms
  inside file windows (`src/ui/rooms`). Features talk to it through small events (`petEvents.ts`) and never import it.
- **Achievements** are one tiny module (`src/os/achievements.ts`): call `unlock('id')` from anywhere.
  Titles live in `achievementDefs.ts` (lazy).
- **GitHub snapshot.** `scripts/snapshot-github.mjs` saves the repositories to `public/data/github-repos.json`
  at build time (git-ignored). The Projects window falls back to it when the live API refuses. It never fails a
  build; set `GITHUB_TOKEN` in the build environment to avoid the anonymous rate limit.
- **Special days** (`src/ui/pet/specialDays.ts`): add `?day=MM-DD` to the address to see one.
- **The phone UI** (`src/ui/mobile`, one lazy chunk with its animation library, so desktop visitors never get it):
  a lock screen (`MobileLock`: clock, the twin and four "notifications" that open the story, the recruiter card,
  the CV and the career timeline; shown once per visit and again for a personal `?for=` link, skipped by `/?story`),
  then a home screen (`MobileLauncher`: profile, "Now" and story widgets, a swipeable project rail, twelve apps and a
  dock with CV, email, LinkedIn and GitHub). The wallpaper is a sky per part of the day (`dayPart.ts`, `MobileOS.css`).
  The app icons are drawn in code (`npm run build:icons`) and shown by `PixelIcon`.
  Two things learnt the hard way: the phone is `position: fixed; inset: 0`, never `100vh` (on iOS that is taller than
  the visible screen and hides the dock), and the CV opens in the device's own PDF viewer on a phone instead of PDF.js
  from a CDN (on a desktop the viewer gives up after 8 s and offers the PDF itself).

## SEO and GEO

The desktop is client-rendered, so the HTML on its own would be an empty `<div>`. `scripts/seo` (a Vite plugin,
so a plain `vite build` is enough on any host) fixes that at build time:

- `index.html` only holds two markers. The plugin fills them with the title, description, canonical, hreflang,
  Open Graph, Twitter and JSON-LD (WebSite, ProfilePage, Person), and a "boot" block: name, role, links, and the
  five projects with one sentence each in a closed `<details>` (150 to 180 words in all). It is everything of the
  home page that a crawler without JavaScript reads, so it links every case study, the writing, the other language
  and `llms.txt`; `check:seo` fails below 120 words or when one of those links is missing. The card stays small
  while the page loads because the projects are folded away. `src/main.tsx` removes the boot block once the
  desktop or the phone UI is on screen.
- After the bundle is written it derives `/tr/` (the same shell in Turkish; opening it selects Turkish),
  the static resume pages `/resume/` and `/tr/ozgecmis/`, `404.html`, `sitemap.xml`, `llms.txt` and `llms-full.txt`.
  Old `/#simple` links are redirected to the resume by a script in `index.html`.
- The same résumé is also served as Markdown (`/resume.md`, `/tr/ozgecmis.md`): linked from the pages
  (`<link rel="alternate" type="text/markdown">`) and from `llms.txt`. `robots.txt` names the AI search and
  user-triggered bots (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User)
  so their welcome does not depend on a host's managed block; training crawlers are left to that block.
- **Projects and writing.** `src/os/content/caseStudies.ts` holds one case study per project in both languages
  (from the READMEs and the CV, nothing invented); the build writes `/projects/`, `/projects/<slug>/` and
  `/tr/projeler/...` with `SoftwareSourceCode` structured data, a Markdown copy of each (`.md`) and sitemap and
  `llms.txt` entries. Articles are Markdown files in `content/writing/` (front matter: `title`, `description`,
  `date: YYYY-MM-DD`, `tags`), published at `/writing/<file name>/` with `TechArticle` data, a `.md` copy, and the
  Atom feed `/feed.xml`. `{{firstScreenKB}}`, `{{scripts}}` and `{{suites}}` in an article (and
  `{firstScreenKB}` etc. in a case study) are replaced by the numbers the build measured.
- **One source of facts**: `src/os/content/career.ts` (from the CV). The pages, JSON-LD, llms.txt, the recruiter
  card and the story all read it. When the CV changes, change that file.
- **The canonical host is the apex, `https://yamacbezirgan.com`.** `www` has no DNS record, so nothing may point
  at it (`check:seo` fails if something does). If you add a `www` record in Cloudflare, redirect it to the apex.
- **The CV PDF** comes out of Canva with the file name as its title and a link to the dead `www` host. After
  every new export run `pip install pypdf && python3 scripts/seo/fix-cv-pdf.py`; the rendering does not change.
- Cloudflare's "AI crawlers" setting adds its own block to `robots.txt` and can answer 403 to training crawlers;
  that is a dashboard setting, not something in this repo. The result is the intended one: the search and
  user-triggered bots named in `robots.txt` are welcome, the training bots (GPTBot, ClaudeBot, Google-Extended) are not.
- **`public/_headers`.** Pages answers `/index.html` with a redirect to `/`, so a rule for `/index.html` never
  applies; `check:seo` fails on one. HSTS and Permissions-Policy are on `/*`, X-Frame-Options (SAMEORIGIN, the app
  frames `/legacy/` and PDFs from this origin) on the page addresses only. Pages joins the values of every matching
  rule, so a header goes in one rule. There is no Content-Security-Policy yet (inline script in `index.html`, PDF.js
  from a CDN); try it as report-only first.
- **A changed `_headers` does not reach files that have not changed.** The edge keeps a cached file for as long as
  its old `Cache-Control` said. The CV PDF was once served as `immutable` (one year) and stayed that way at the
  edge for days, with an older file than the one in the repository. After a header change that touches such files,
  purge them (dashboard, Caching, Configuration, Purge Cache, by URL) and compare
  `curl -sD - -o /dev/null https://yamacbezirgan.com/<file>` with the same address plus `?x=1`.

## For visitors who have ten seconds

All lazy, none of it in the first paint:

- **Personal links.** `/?for=Acme` greets "Acme" in the welcome window, from the twin and on the recruiter card
  (`src/os/personal.ts` cleans the value: letters, digits, spaces and `. & ' - _`, 40 characters, shown as text only).
- **At a glance** (`src/apps/recruiter`): the whole profile on one screen, with the CV, a `.vcf` contact
  (`vcard.ts`, no phone number on purpose) and a copy-email button. `glance` in the terminal, `sudo hire-me`, the palette.
- **Yamaç in 30 seconds** (`src/ui/story`): seven tap-through cards (tap, hold, swipe), full screen on a phone,
  offered on the phone's lock screen and home screen and reachable at `/?story`, in the palette and as `story` in the terminal.
- **Career** (`src/apps/career`, `src/ui/rooms/CareerRoom.tsx`): the timeline as a room for the twin, and as a list
  for phones and for anyone who has the twin switched off.
- **How this site is built** (`src/apps/about-site`): numbers measured on the build (`dist/data/build-info.json`,
  written by the SEO plugin), what this visit has downloaded, and the live CI status of `main` from the GitHub API
  (cached for ten minutes; it says so when GitHub refuses).

## Browser tests

`tests/e2e/lib.cjs` has the shared helpers (static server for `dist/`, a page factory that mocks the network and
collects console errors). `PDFJS_DIR` can point at local copies of `pdf.min.js` and `pdf.worker.min.js` for
hermetic runs; without it the real CDN is used. Screenshots go to the OS temp folder (`SHOT_DIR` overrides).
