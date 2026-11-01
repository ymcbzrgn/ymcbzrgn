/// <reference types="vite/client" />

/** [short hash, author, date, subject] of the latest commits, injected at build time (vite.config.ts) */
declare const __GIT_LOG__: ReadonlyArray<readonly [string, string, string, string]>;

/** File names found in public/projects at build time (screenshots for the Projects window), injected by vite.config.ts */
declare const __PROJECT_IMAGES__: readonly string[];
