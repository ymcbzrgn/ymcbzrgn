# Development notes

The site is a React + TypeScript + Vite "desktop OS". `main` is deployed by Cloudflare Pages.

## Everything at once

```bash
npm ci
npm run verify        # type check, lint errors, build, bundle budgets, behaviour table, browser tests
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
| `npm run test:e2e` | all browser suites in `tests/e2e` against `dist/` (`node tests/e2e/run.cjs features pet` runs some) |
| `npm run bench:drag` | window drag frame-time benchmark (needs a running server in `BASE`) |
| `npm run build:sprites` | regenerates the pixel twin and the room scenery sheets from `scripts/sprites` |
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

## Browser tests

`tests/e2e/lib.cjs` has the shared helpers (static server for `dist/`, a page factory that mocks the network and
collects console errors). `PDFJS_DIR` can point at local copies of `pdf.min.js` and `pdf.worker.min.js` for
hermetic runs; without it the real CDN is used. Screenshots go to the OS temp folder (`SHOT_DIR` overrides).
