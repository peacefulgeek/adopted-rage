#!/usr/bin/env node
// Per master-scope §22 — quick post-build / post-deploy sanity audit.
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const fail = (msg) => {
  console.error('❌ ' + msg);
  process.exitCode = 1;
};
const ok = (msg) => console.log('✓ ' + msg);

function grepNoHits(label, pattern, cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8' });
    if (out.trim().length > 0) {
      fail(`${label} found:\n${out}`);
    } else {
      ok(`${label}: clean`);
    }
  } catch (err) {
    if (err.status === 1) ok(`${label}: clean`); // grep -E exit 1 = no match
    else fail(`${label}: grep error ${err.message}`);
  }
}

// 1. No banned packages anywhere in source
grepNoHits(
  'no @anthropic-ai/sdk',
  '@anthropic-ai/sdk',
  "grep -rln '@anthropic-ai/sdk' src/ scripts/ server/ client/ package.json | grep -v 'verify-deploy.mjs' | grep -v 'deepseek-generate.mjs' || true"
);
grepNoHits(
  'no fal.ai / @fal-ai',
  'fal',
  "grep -rlnE 'fal\\.ai|@fal-ai' src/ scripts/ server/ client/ package.json | grep -v 'verify-deploy.mjs' || true"
);
grepNoHits(
  'no FAL_KEY',
  'FAL_KEY',
  "grep -rln 'FAL_KEY' src/ scripts/ server/ .do/ | grep -v 'verify-deploy.mjs' || true"
);
grepNoHits(
  'no ANTHROPIC_API_KEY',
  'ANTHROPIC_API_KEY',
  "grep -rln 'ANTHROPIC_API_KEY' src/ scripts/ server/ .do/ | grep -v 'verify-deploy.mjs' | grep -v 'deepseek-generate.mjs' || true"
);
grepNoHits(
  'no overflow setTimeout',
  'overflow setTimeout',
  "grep -rnE 'setTimeout\\([^,]+,\\s*[0-9]{10,}' src/ scripts/ server/ || true"
);
grepNoHits(
  'no overflow setInterval',
  'overflow setInterval',
  "grep -rnE 'setInterval\\([^,]+,\\s*[0-9]{10,}' src/ scripts/ server/ || true"
);

// 2. No image files in repo besides favicon.svg
try {
  execSync('node scripts/check-no-images.mjs', { cwd: ROOT, stdio: 'inherit' });
} catch {
  fail('check-no-images failed');
}

// 3. Per-author leakage — Oracle Lover assigned, so Kalesh refs must be 0
const grepLeak = execSync(
  "grep -rIln 'kalesh' src/ scripts/ server/ client/src/ | grep -v 'verify-deploy.mjs' || true",
  { cwd: ROOT, encoding: 'utf8' }
);
if (grepLeak.trim()) fail(`per-author leakage found: ${grepLeak}`);
else ok('per-author leakage: clean');

// 4. .do/app.yaml present, app config sane
const ay = path.join(ROOT, '.do/app.yaml');
if (!fs.existsSync(ay)) fail('.do/app.yaml missing');
else {
  const s = fs.readFileSync(ay, 'utf8');
  if (s.includes('ANTHROPIC_API_KEY')) fail('.do/app.yaml still references ANTHROPIC_API_KEY');
  if (s.includes('FAL_KEY')) fail('.do/app.yaml still references FAL_KEY');
  if (!s.includes('OPENAI_BASE_URL')) fail('.do/app.yaml missing OPENAI_BASE_URL');
  if (!s.includes('http_path: /health')) fail('.do/app.yaml missing health check');
  ok('.do/app.yaml present, banned vars absent, OPENAI_BASE_URL set');
}

// 5. Per-site Bunny + apex set in code
const sc = fs.readFileSync(path.join(ROOT, 'src/lib/site-config.mjs'), 'utf8');
if (!/STORAGE_ZONE: 'adopted-rage'/.test(sc)) fail('Bunny STORAGE_ZONE not set to adopted-rage');
else ok('Bunny STORAGE_ZONE set: adopted-rage');
if (!/apex: 'adoptedrage\.com'/.test(sc)) fail('apex not set to adoptedrage.com');
else ok('apex set: adoptedrage.com');

// 6. Articles JSON shape - count
const dbPath = path.join(ROOT, 'data/articles.json');
if (fs.existsSync(dbPath)) {
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const pub = (db.articles || []).filter((a) => a.status === 'published').length;
  ok(`db: ${pub} published articles, ${(db.articles || []).length} total`);
} else {
  console.log('ℹ db: data/articles.json not yet created');
}

if (process.exitCode === 1) {
  console.error('\n[verify] FAILED');
} else {
  console.log('\n[verify] OK');
}
