// Refreshes src/assets/gitlog.fallback.json from the local git history (used by the terminal's `git log`
// when the build machine only has a shallow clone). Run: npm run gitlog
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const out = execSync('git log -n 15 --pretty=format:%h%x09%an%x09%ad%x09%s --date=short', { encoding: 'utf8' });
const rows = out.split('\n').filter(Boolean).map((line) => line.split('\t'));
writeFileSync(new URL('../src/assets/gitlog.fallback.json', import.meta.url), JSON.stringify(rows, null, 0) + '\n');
console.log(`gitlog.fallback.json: ${rows.length} commits`);
