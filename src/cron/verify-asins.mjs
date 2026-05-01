// Monthly ASIN re-verification job.
// Scans every remedy in client/src/data/remedies.ts, fetches its Amazon
// product page with low concurrency + retries, classifies the response,
// and writes a health report to data/asin-health.json.
//
// Runs autonomously inside the production Node process via node-cron.
// Zero external dependencies beyond Node's built-in fetch.

import fs from 'node:fs/promises';
import path from 'node:path';

// Resolve the project root robustly. When this module is bundled into
// dist/index.js (esbuild --bundle), import.meta.url resolves to that bundle
// path which is one level shallower than the source location. We therefore
// anchor on process.cwd(), which DigitalOcean's run command sets to the
// project root via `node dist/index.js`.
const REPO_ROOT = process.cwd();
const REMEDIES_PATH = path.join(REPO_ROOT, 'client', 'src', 'data', 'remedies.ts');
const REPORT_PATH = path.join(REPO_ROOT, 'data', 'asin-health.json');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 3;
const DELAY_BETWEEN_REQUESTS_MS = 700;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 4_000;

/**
 * Parse remedies.ts and extract { idx, name, brand, asin } for each entry.
 * @returns {Promise<Array<{idx: number, name: string, brand: string, asin: string}>>}
 */
export async function extractRemedies() {
  const src = await fs.readFile(REMEDIES_PATH, 'utf-8');
  const re = /\{\s*name:\s*["']([^"']+)["'][^}]*?brand:\s*["']([^"']*)["'][^}]*?asin:\s*["']([A-Z0-9]{10})["']/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    out.push({ idx: out.length, name: m[1], brand: m[2], asin: m[3] });
  }
  return out;
}

async function fetchOne(asin) {
  const url = `https://www.amazon.com/dp/${asin}`;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const r = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
        },
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (r.status === 404) return { asin, status: 404, verdict: 'NOT_FOUND' };
      if (r.status === 200) return { asin, status: 200, verdict: 'REACHABLE' };
      if (r.status >= 500) {
        if (attempt < RETRY_COUNT) {
          await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
          continue;
        }
        return { asin, status: r.status, verdict: 'AMAZON_BLOCKED' };
      }
      return { asin, status: r.status, verdict: 'OTHER_' + r.status };
    } catch (e) {
      if (attempt < RETRY_COUNT) {
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
        continue;
      }
      return { asin, status: 0, verdict: 'ERROR' };
    }
  }
  return { asin, status: 0, verdict: 'ERROR' };
}

/**
 * Verify a list of remedies. Returns the full report.
 * @param {Array<{idx:number,name:string,brand:string,asin:string}>} remedies
 */
export async function verifyAll(remedies) {
  const results = [];
  let i = 0;
  let done = 0;

  async function worker() {
    while (i < remedies.length) {
      const my = i++;
      const r = await fetchOne(remedies[my].asin);
      results[my] = { ...remedies[my], ...r };
      done++;
      if (done % 25 === 0) {
        console.log(`[asin-verify] progress: ${done}/${remedies.length}`);
      }
      await new Promise((res) => setTimeout(res, DELAY_BETWEEN_REQUESTS_MS));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const counts = {};
  for (const r of results) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  const broken = results.filter((r) => r.verdict === 'NOT_FOUND');
  const blocked = results.filter((r) => r.verdict === 'AMAZON_BLOCKED' || r.verdict === 'ERROR');

  return {
    last_run_iso: new Date().toISOString(),
    total: results.length,
    counts,
    healthy: results.length - broken.length,
    broken_count: broken.length,
    broken_asins: broken.map(({ idx, name, brand, asin, status }) => ({
      idx,
      name,
      brand,
      asin,
      status,
    })),
    blocked_count: blocked.length,
    results,
  };
}

/**
 * Persist the report to data/asin-health.json.
 */
export async function writeReport(report) {
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Run the full job: extract → verify → persist. Used by the cron.
 */
export async function runAsinVerificationJob() {
  const start = Date.now();
  console.log('[asin-verify] starting monthly job');
  const remedies = await extractRemedies();
  console.log(`[asin-verify] extracted ${remedies.length} remedies`);
  const report = await verifyAll(remedies);
  await writeReport(report);
  const dur = Math.round((Date.now() - start) / 1000);
  console.log(
    `[asin-verify] done in ${dur}s — broken: ${report.broken_count} / ${report.total}; blocked: ${report.blocked_count}`
  );
  if (report.broken_count > 0) {
    console.warn(
      `[asin-verify] WARNING: ${report.broken_count} ASINs returned 404. See data/asin-health.json`
    );
    for (const b of report.broken_asins) {
      console.warn(`  [${b.idx}] ${b.brand} - ${b.name} (${b.asin})`);
    }
  }
  return report;
}

/**
 * Read the latest report (for the admin endpoint).
 */
export async function readLatestReport() {
  try {
    const raw = await fs.readFile(REPORT_PATH, 'utf-8');
    const r = JSON.parse(raw);
    // Trim down — admin endpoint doesn't need the full per-row results blob
    return {
      last_run_iso: r.last_run_iso,
      total: r.total,
      counts: r.counts,
      healthy: r.healthy,
      broken_count: r.broken_count,
      blocked_count: r.blocked_count,
      broken_asins: r.broken_asins,
    };
  } catch (e) {
    return { error: 'no_report_yet', message: 'Monthly verification has not run yet.' };
  }
}
