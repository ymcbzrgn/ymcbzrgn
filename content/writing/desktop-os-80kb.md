---
title: A desktop OS in the browser, in under 80 KB
description: How a React desktop-OS portfolio keeps its first screen under 80 KB: a build-failing budget, lazy loading, code-drawn pixel art and lessons from real devices.
date: 2026-11-02
tags: React, TypeScript, Vite, performance, SEO
---

My portfolio is an operating system. There are windows you can drag, a file system, a terminal, a pixel-art twin that walks around the desktop, and on a phone it turns into a phone. It is also the page a recruiter opens from a LinkedIn link on a mobile connection, so the first screen has to be small. Right now it is **{{firstScreenKB}} KB gzip**.

The code is in the [open repository](https://github.com/ymcbzrgn/ymcbzrgn). The size and count numbers come from the build itself, and the "How this site is built" window on the [site](https://yamacbezirgan.com/) shows them live.

## The budget is a test

A performance target that lives in my head erodes. Mine is a script that runs in CI and fails the build:

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

`scripts/check-budgets.mjs` gzips what the built `index.html` asks for, compares it to the budget, and does the same for every lazy chunk that has its own line. A stray import gets caught the day it lands. If the sound engine were pulled into the main bundle, the build would go red.

## The rest loads on demand

The build produces {{scripts}} scripts, and `index.html` requests four of them: the entry and three vendor chunks. The terminal, the music player, the pixel twin, the command palette, the guided tour and the story are all `lazy()` imports that load when somebody opens them. The phone UI, with its animation library, is one chunk that desktop visitors never download:

```tsx
// Mobile UI (and framer-motion with it) is only needed on small screens,
// so keep it out of the bundle every desktop visitor downloads.
const MobileOS = lazy(() => import('./ui/mobile/MobileOS'));
```

Strings follow the same rule. Two languages and a few hundred UI strings are not free, so `i18n/core.ts` holds only what the always-loaded shell needs, and lazy features import the full dictionary through `i18n/full.ts`. PDF.js is fetched only when a PDF opens. None of this is clever, and the budget is what keeps it consistent.

## Pixels drawn in code

Scripts draw the twin, the room scenery and the phone's app icons (`scripts/sprites`): ASCII bitmaps and a few shape helpers, a material per colour so an outline pass can add coloured edges, and a small PNG encoder (about sixty lines on top of `node:zlib`) that writes indexed sheets. The sheets have their own budgets: the character sheet 46 KB, the room scenery 30 KB, the phone icons 6 KB (the build prints 2.3 KB).

On screen, a sprite is a `div` with a background image and a CSS animation that steps through the frames:

```tsx
const css = {
  backgroundImage: `url(${sheetUrl})`,
  backgroundPositionY: -row * h,
  animationDuration: `${frames / speed}s`,
  animationTimingFunction: `steps(${frames})`,
};
```

There is no JavaScript timer per sprite, so animating one costs the main thread almost nothing. Sound works the same way: the music player and the sound effects are synthesised with the Web Audio API, so the site ships no audio files.

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

The end-to-end tests run against the production build behind a tiny static server that imitates Cloudflare Pages (folder index, `name.html`, a real 404 with a 404 status). Before that, the server answered every unknown URL with `index.html`, so requests for missing files looked fine. One of them was a default wallpaper that had never shipped, and the app kept asking for it without anyone noticing.

## Lessons from real devices and hosts

**`100vh` is taller than the visible screen.** I wrote the phone UI's home screen as a flex column of `height: 100vh` with a dock at the bottom. On iOS Safari and in in-app browsers, `100vh` is the height with the browser bars retracted, so the dock sits partly behind the toolbar. The emulator cannot show that. The phone UI is now `position: fixed; inset: 0`, which is always the visible area.

**A CDN sat on the critical path of the most important button.** The CV opened in an in-page PDF viewer that loaded PDF.js from a CDN. When I made that host unreachable in a test, the way a strict corporate network can, what happened depended on how: if the request failed at once, the viewer showed an error whose only way out was a reload button; if the request was silently dropped, it kept spinning for over a minute. On phones the CV now opens in the device's own PDF viewer, which is better anyway, and on a desktop the viewer gives up after at most eight seconds and offers the PDF itself.

**The host injected a script I never wrote.** Lighthouse gave the live site 82 for Best Practices and Performance in the low nineties. The only failing audit was a deprecated API used by a script Cloudflare adds to the page for bot detection, and it also accounted for the largest long task on the main thread (296 ms). Blocking that single URL in a Lighthouse run, same page, same device profile, gives Performance 98, Best Practices 100 and a Total Blocking Time of 30 ms instead of about 300. The fix is a switch in the dashboard. I only found it because I looked at what was on the page. (Measured on 2 November 2026 with Lighthouse 12.8.2, mobile profile.)

**Search engines need links.** Structured data, hreflang and static pages make a page eligible to be found. Other pages linking to it get it found, and no build step can do that part.

## Numbers

| | |
|---|---|
| First screen (gzip) | {{firstScreenKB}} KB, budget 78 KB |
| Scripts | {{scripts}}, only the entry and a few vendor chunks up front |
| Browser test suites | {{suites}}, on every push |
| Lighthouse, mobile | Performance 90 to 92, Best Practices 82 (98 and 100 with the host's script blocked), Accessibility 100 |

## Try it

The desktop and the phone UI are at [yamacbezirgan.com](https://yamacbezirgan.com/) (on a phone, it starts at a lock screen), the code is on [GitHub](https://github.com/ymcbzrgn/ymcbzrgn), and there is a [case study](/projects/desktop-os-portfolio/) with the short version.
