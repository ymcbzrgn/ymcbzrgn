---
title: A desktop OS in the browser, in under 80 KB
description: How a React desktop-OS portfolio keeps its first screen under 80 KB: a build-failing budget, lazy loading, code-drawn pixel art and lessons from real devices.
date: 2026-11-02
tags: React, TypeScript, Vite, performance, SEO
---

My portfolio is an operating system. There are windows you can drag, a file system, a terminal, a pixel-art twin that walks around the desktop, and on a phone it turns into a phone. It is also a page that a recruiter opens from a LinkedIn link on a mobile connection, so the first screen has to be small. This post is about how it stays at **{{firstScreenKB}} KB gzip**, what a budget script taught me, and four things that broke in the real world.

Everything here is in the [open repository](https://github.com/ymcbzrgn/ymcbzrgn), and the numbers are measured by the build itself. You can see them live in the "How this site is built" window of the [site](https://yamacbezirgan.com/).

## The budget is a test, not a goal

A performance target that lives in someone's head erodes. Mine is a script that runs in CI and fails the build:

```js
const BUDGETS = {
  criticalPath: { max: 78, now: 76.5 },   // everything index.html requests, gzip, KB
  chunks: [
    { name: 'Pet',      re: /^Pet-.*\.js$/,      max: 10 },
    { name: 'Terminal', re: /^Terminal-.*\.js$/, max: 13 },
    { name: 'MobileOS', re: /^MobileOS-.*\.js$/, max: 50 },
    // ...
  ],
};
```

`scripts/check-budgets.mjs` gzips what the built `index.html` asks for, compares it to the budget, and does the same for every lazy chunk that has its own line. The value of it is that a stray import is caught the day it happens: if the sound engine, say, were pulled into the main bundle, the build would go red instead of the site quietly getting slower.

## Everything that is not the first screen loads when asked for

The build produces {{scripts}} scripts, and only the first few are on the critical path. The terminal, the music player, the pixel twin, the command palette, the guided tour and the story are all `lazy()` imports that load when somebody opens them. The phone UI, with its animation library, is one chunk that desktop visitors never download:

```tsx
// Mobile UI (and framer-motion with it) is only needed on small screens,
// so keep it out of the bundle every desktop visitor downloads.
const MobileOS = lazy(() => import('./ui/mobile/MobileOS'));
```

The same idea reaches the strings. Two languages and a few hundred UI strings are not free, so `i18n/core.ts` holds only what the always-loaded shell needs, and the full dictionary is imported by lazy features through `i18n/full.ts`. PDF.js is fetched only when a PDF opens. None of this is clever; it is just done consistently and enforced by the budget.

## Pixels drawn in code

The twin, the room scenery and the phone's app icons are not image files someone exported. They are drawn by scripts (`scripts/sprites`): ASCII bitmaps and a few shape helpers, a material per colour so an outline pass can add coloured edges automatically, and a small PNG encoder (about sixty lines on top of `node:zlib`) that writes indexed sheets. The sheets have their own budgets: the character sheet 46 KB, the room scenery 30 KB, the phone icons 6 KB (the build prints 2.3 KB).

On screen, a sprite is a `div` with a background image and a CSS animation that steps through the frames:

```tsx
const css = {
  backgroundImage: `url(${sheetUrl})`,
  backgroundPositionY: -row * h,
  animationDuration: `${frames / speed}s`,
  animationTimingFunction: `steps(${frames})`,
};
```

There is no JavaScript timer per sprite, so animating one costs the main thread almost nothing. Sound follows the same philosophy: the music player and the sound effects are synthesised with the Web Audio API, so the site ships no audio files at all.

## A single-page app is an empty div to a crawler

A client-rendered desktop gives a crawler an empty `<div id="root">`. A Vite plugin fixes that at build time. It has two hooks: `transformIndexHtml` writes the title, description, canonical, hreflang, Open Graph tags and JSON-LD into `index.html` together with a small plain-HTML block that is removed once the desktop mounts, and `closeBundle` derives everything else from the same data:

```ts
export function seoPlugin(): Plugin {
  return {
    name: 'yb-seo',
    transformIndexHtml: { order: 'pre', handler: (html) => injectHead(html) },
    closeBundle() {
      // the Turkish entry, the static résumé pages, Markdown copies,
      // 404.html, sitemap.xml, llms.txt, llms-full.txt, one page per project
    },
  };
}
```

Facts live in one module (`career.ts`), so the page a crawler reads, the card a recruiter sees and the structured data can never disagree. A separate `check:seo` script audits the finished build: canonical and hreflang pairs, JSON-LD, title and description lengths, internal links, the sitemap.

The test server deserves a mention. The end-to-end tests run against the production build behind a tiny static server that imitates Cloudflare Pages (folder index, `name.html`, a real 404 with a 404 status). Before that, every unknown URL was answered with `index.html`, and requests for files that did not exist looked fine. They were not: a default wallpaper had never shipped, and the app had been quietly asking for it.

## What the real world taught me

**`100vh` is not the screen.** I wrote the phone UI's home screen as a flex column of `height: 100vh` with a dock at the bottom. On iOS Safari and in in-app browsers, `100vh` is the height with the browser bars retracted, so the dock sits partly behind the toolbar. The emulator cannot show that. The phone UI is now `position: fixed; inset: 0`, which is always the visible area.

**A CDN on the critical path of the most important button.** The CV opened in an in-page PDF viewer that loaded PDF.js from a CDN. When I made that host unreachable in a test, the way a strict corporate network can, what happened depended on how: if the request failed at once, the viewer showed an error whose only way out was a reload button; if the request was silently dropped, it kept spinning for over a minute. On phones the CV now opens in the device's own PDF viewer, which is better anyway, and on a desktop the viewer gives up after at most eight seconds and offers the PDF itself.

**The host can inject a script you never wrote.** Lighthouse gave the live site 82 for Best Practices and Performance in the low nineties. The only failing audit was a deprecated API used by a script Cloudflare adds to the page for bot detection, and it also accounted for the largest long task on the main thread (296 ms). Blocking that single URL in a Lighthouse run, same page, same device profile, gives Performance 98, Best Practices 100 and a Total Blocking Time of 30 ms instead of about 300. The fix is a switch in the dashboard, not a line of code, but I would not have known without looking at what was really on the page. (Measured on 2 November 2026 with Lighthouse 12.8.2, mobile profile.)

**Search engines need links more than markup.** Structured data, hreflang and static pages make a page eligible to be found. What gets it found is other pages linking to it, and no build step can do that part.

## Numbers

| | |
|---|---|
| First screen (gzip) | {{firstScreenKB}} KB, budget 78 KB |
| Scripts | {{scripts}}, all but the first lazy |
| Browser test suites | {{suites}}, on every push |
| Lighthouse, mobile | Performance 90 to 92, Best Practices 82 (98 and 100 with the host's script blocked), Accessibility 100 |

## Try it

The desktop and the phone UI are at [yamacbezirgan.com](https://yamacbezirgan.com/) (on a phone, it starts at a lock screen), the code is on [GitHub](https://github.com/ymcbzrgn/ymcbzrgn), and there is a [case study](/projects/desktop-os-portfolio/) with the short version.
