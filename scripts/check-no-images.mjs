#!/usr/bin/env node
// Per master-scope §9B.1 — fail the build if any image lives in the repo.
import { execSync } from 'child_process';

const ALLOW = new Set(['client/public/favicon.svg', 'public/favicon.svg']);
const IMG = /\.(png|jpe?g|gif|bmp|tiff?|webp|avif|heic|heif|ico|svg)$/i;

let tracked = '';
try {
  tracked = execSync('git ls-files', { encoding: 'utf8' });
} catch {
  // Not a git checkout (e.g. tarball deploy) - fall back to find
  tracked = execSync(
    "find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*'",
    { encoding: 'utf8' }
  );
}

const offenders = tracked
  .split('\n')
  .map((l) => l.replace(/^\.\//, '').trim())
  .filter((p) => p && IMG.test(p) && !ALLOW.has(p));

if (offenders.length > 0) {
  console.error('\n[check-no-images] FAILED — these image files must be on Bunny CDN, not in the repo:\n');
  for (const o of offenders) console.error('  ' + o);
  console.error('\nMove them to Bunny and reference via the pull zone URL. Allowed: public/favicon.svg only.\n');
  process.exit(1);
}
console.log('[check-no-images] OK (no images in repo besides favicon.svg).');
