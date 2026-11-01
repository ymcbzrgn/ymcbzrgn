#!/usr/bin/env node
/**
 * Build-time snapshot of the GitHub repositories (public/data/github-repos.json), so the Projects
 * window has something to show instantly and never depends on GitHub's anonymous rate limit
 * (60 requests an hour per IP, and the old code needed one request per repository for the languages).
 *
 * It must never break a build: any failure leaves the previous file (or none) in place and exits 0.
 * The window then falls back to the live API exactly as before.
 *
 * Set GITHUB_TOKEN in the build environment to lift the rate limit for the build itself.
 * Other knobs: GITHUB_USER (default ymcbzrgn), GITHUB_API_URL (tests point it at a mock server).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USER = process.env.GITHUB_USER || 'ymcbzrgn';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const OUT = fileURLToPath(new URL('../public/data/github-repos.json', import.meta.url));
const base = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-build' };
// A token only lifts the rate limit. A stale or placeholder one in the environment (a 401) must not cost us
// the snapshot, so after the first 401 the script carries on anonymously.
let token = process.env.GITHUB_TOKEN || '';

async function getJson(url) {
  let res = await fetch(url, { headers: token ? { ...base, Authorization: `Bearer ${token}` } : base, signal: AbortSignal.timeout(15000) });
  if (res.status === 401 && token) {
    token = '';
    res = await fetch(url, { headers: base, signal: AbortSignal.timeout(15000) });
  }
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

/** Only what the Projects window uses: the file stays small. */
const slim = (r, languages) => ({
  id: r.id,
  name: r.name,
  description: r.description ?? null,
  html_url: r.html_url,
  homepage: r.homepage || null,
  stargazers_count: r.stargazers_count ?? 0,
  language: r.language ?? null,
  updated_at: r.updated_at,
  topics: Array.isArray(r.topics) ? r.topics : [],
  fork: !!r.fork,
  owner: { login: r.owner?.login ?? USER },
  default_branch: r.default_branch ?? 'main',
  ...(languages ? { languages } : {}),
});

try {
  const repos = await getJson(`${API}/users/${USER}/repos?per_page=100&sort=updated`);
  if (!Array.isArray(repos) || repos.length === 0) throw new Error('no repositories returned');

  // languages: a few at a time, and a repo without them is still worth keeping
  const out = new Array(repos.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < repos.length) {
        const i = next++;
        const r = repos[i];
        let languages;
        try {
          languages = await getJson(`${API}/repos/${r.owner.login}/${r.name}/languages`);
        } catch {
          /* keep going without them */
        }
        out[i] = slim(r, languages);
      }
    })
  );

  mkdirSync(new URL('../public/data/', import.meta.url), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ generatedAt: Date.now(), repos: out }) + '\n');
  console.log(`[snapshot] ${out.length} repositories saved to public/data/github-repos.json`);
} catch (e) {
  console.warn(`[snapshot] skipped (${e instanceof Error ? e.message : e}); the Projects window will use the live API`);
}
process.exit(0);
