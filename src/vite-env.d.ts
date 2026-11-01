/// <reference types="vite/client" />

/** [short hash, author, date, subject] of the latest commits, injected at build time (vite.config.ts) */
declare const __GIT_LOG__: ReadonlyArray<readonly [string, string, string, string]>;
