#!/usr/bin/env node
/**
 * Runs the browser suites against a production build (dist/ by default):
 *
 *   npm run build:new && npm run test:e2e              all suites
 *   node tests/e2e/run.cjs features pet                only these
 *
 * Needs Playwright's Chromium (npx playwright install chromium). DIST_DIR points at another build.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { DIST, serve } = require('./lib.cjs');

/** suites that start their own server */
const SELF_HOSTED = ['onboarding', 'pet', 'control', 'rooms', 'autonomy', 'features', 'seo', 'recruiter', 'story', 'wow', 'mobile'];
/** suites that are given BASE (a running server) */
const WITH_BASE = ['settings', 'smoke-apps', 'remount', 'stage2'];
const TIMEOUT_MS = 8 * 60 * 1000;

function run(name, env) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(__dirname, `${name}.test.cjs`)], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.on('close', (code) => {
      clearTimeout(timer);
      const pass = (out.match(/✓/g) || []).length;
      const fail = (out.match(/✗/g) || []).length;
      resolve({ name, code, pass, fail, out, seconds: Math.round((Date.now() - started) / 1000) });
    });
  });
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error(`No build found in ${DIST}. Run "npm run build:new" first.`);
    process.exit(2);
  }
  const wanted = process.argv.slice(2);
  const pick = (list) => list.filter((n) => !wanted.length || wanted.includes(n));
  const { server, base } = await serve();
  const results = [];
  for (const name of pick(SELF_HOSTED)) results.push(await run(name, { DIST_DIR: DIST }));
  for (const name of pick(WITH_BASE)) results.push(await run(name, { BASE: base, ONB: '1', DIST_DIR: DIST }));
  server.close();

  console.log('');
  let failed = false;
  for (const r of results) {
    const bad = r.code !== 0 || r.fail > 0;
    failed ||= bad;
    console.log(`${bad ? '✗' : '✓'} ${r.name.padEnd(12)} ${String(r.pass).padStart(4)} checks, ${r.fail} failed  (${r.seconds}s)`);
    if (bad) console.log(r.out.split('\n').filter((l) => /✗|Error|HATASI/.test(l)).slice(0, 12).join('\n'));
  }
  process.exit(failed ? 1 : 0);
})();
