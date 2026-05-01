#!/usr/bin/env node
// Pre-seed batch runner. Reads a slice of src/data/topics-500.json and
// generates each article via DeepSeek -> sanitiser -> EEAT enrich -> quality
// gate (raised to 1800 words for this seed). Stores as status='queued' so
// the live site does NOT show them; the existing in-code cron will release
// them one at a time. Designed for parallel invocation from a wrapper script
// or from the Manus map tool, but is also runnable directly:
//
//   START=0 COUNT=20 OPENAI_API_KEY=sk-... \
//     OPENAI_BASE_URL=https://api.deepseek.com OPENAI_MODEL=deepseek-v4-pro \
//     node scripts/preseed-queued-batch.mjs
//
// Idempotent: skips topics whose slug already exists in data/articles.json.
// Lockfile-free (multiple batches can run concurrently because db.mjs uses
// mtime-based cache invalidation and we serialise writes via a flock).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { generateArticle } from '../src/lib/deepseek-generate.mjs';
import { runQualityGate, countWords } from '../src/lib/article-quality-gate.mjs';
import { pickInternalLinks } from '../src/lib/internal-links.mjs';
import { matchProducts } from '../src/lib/match-products.mjs';
import { extractAsinsFromText } from '../src/lib/amazon-verify.mjs';
import { enrichEEAT } from '../src/lib/enrich-eeat.mjs';
import { SITE } from '../src/lib/site-config.mjs';
import topics500 from '../src/data/topics-500.json' with { type: 'json' };
import topics30 from '../src/data/topics.json' with { type: 'json' };
import asinPool from '../src/data/asin-pool.json' with { type: 'json' };
import { listAllPublishedForFeed } from '../src/lib/db.mjs';

const START = parseInt(process.env.START || '0', 10);
const COUNT = parseInt(process.env.COUNT || '20', 10);
const MIN_WORDS = parseInt(process.env.MIN_WORDS || '1800', 10);
const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || '4', 10);
const DB_FILE = path.resolve('data/articles.json');
const LOCK_FILE = path.resolve('data/articles.lock');

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// Custom queued-row insert that re-reads articles.json fresh under flock,
// inserts atomically, then releases. Concurrency-safe across processes.
async function insertQueuedAtomic(article) {
  // Wait for lock
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // stale-lock cleanup
      try {
        const stat = fs.statSync(LOCK_FILE);
        if (Date.now() - stat.mtimeMs > 30_000) fs.unlinkSync(LOCK_FILE);
      } catch {}
      if (Date.now() - start > 60_000) throw new Error('lock-wait-timeout');
      await new Promise((r) => setTimeout(r, 100 + Math.floor(Math.random() * 200)));
    }
  }
  try {
    const raw = await fsp.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.articles)) db.articles = [];
    if (db.articles.find((a) => a.slug === article.slug)) {
      return { duplicate: true };
    }
    db.articles.push({
      id: db.articles.length + 1,
      status: 'queued',
      queued_at: new Date().toISOString(),
      published_at: null,
      last_modified_at: null,
      hero_url: null,
      asins_used: [],
      internal_links_used: [],
      word_count: 0,
      ...article,
    });
    await fsp.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    return { inserted: true, id: db.articles.at(-1).id };
  } finally {
    try { fs.unlinkSync(LOCK_FILE); } catch {}
  }
}

async function existingSlugs() {
  const raw = await fsp.readFile(DB_FILE, 'utf8');
  const db = JSON.parse(raw);
  return new Set((db.articles || []).map((a) => a.slug));
}

async function buildContext(topic) {
  const pool = (await listAllPublishedForFeed()).map((a) => ({
    title: a.title, slug: a.slug, category: a.category, tags: a.tags,
  }));
  let internalLinks = pickInternalLinks({
    topic: topic.topic, category: topic.category, tags: topic.tags,
    pool, take: 5,
  });
  if (internalLinks.length < 3 && pool.length > 0) {
    for (const p of pool) {
      if (!internalLinks.find((x) => x.slug === p.slug)) internalLinks.push(p);
      if (internalLinks.length >= 5) break;
    }
  }
  if (internalLinks.length < 3) {
    const futureSeeds = topics30.topics
      .filter((t) => t.topic !== topic.topic).slice(0, 5)
      .map((t) => ({
        title: t.topic, slug: slugify(t.topic),
        category: t.category, tags: t.tags,
      }));
    internalLinks = internalLinks.concat(futureSeeds).slice(0, 5);
  }
  const products = matchProducts({
    articleTitle: topic.topic, articleTags: topic.tags,
    articleCategory: topic.category, catalog: asinPool.products,
    minLinks: 3, maxLinks: 4,
  });
  return { internalLinks, products };
}

async function seedOne(topic, idxAbsolute) {
  const targetSlug = topic.slug_hint || slugify(topic.topic);
  const slugSet = await existingSlugs();
  if (slugSet.has(targetSlug)) return { skipped: 'slug-exists', slug: targetSlug };

  const { internalLinks, products } = await buildContext(topic);
  let article = null, gate = null, lastErr = null;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      article = await generateArticle({
        topic: topic.topic, category: topic.category, tags: topic.tags,
        internalLinks, products, authorName: SITE.author,
      });
      if (article && article.body) {
        article.body = enrichEEAT(article.body, {
          slug: article.slug || targetSlug,
          title: article.title, author: SITE.author, internalLinks,
        });
      }
    } catch (err) {
      lastErr = err;
      console.error(`[preseed] [#${idxAbsolute}] attempt ${i} threw:`, err.message);
      continue;
    }
    gate = runQualityGate(article.body || '');
    // Override the gate's stock 1500 floor with our pre-seed 1800 floor.
    const wc = countWords(article.body || '');
    const tooShort = wc < MIN_WORDS;
    const cleanedFailures = (gate.failures || []).filter((f) => !f.startsWith('word-count-too-low'));
    const passedExceptShort = cleanedFailures.length === 0;
    if (passedExceptShort && !tooShort) {
      gate.passed = true;
      gate.failures = [];
      gate.wordCount = wc;
      break;
    }
    if (!gate.passed) {
      console.warn(`[preseed] [#${idxAbsolute}] gate fail attempt ${i} (${wc}w):`,
        gate.failures.slice(0, 6).join('; '), tooShort ? `+below-min:${wc}<${MIN_WORDS}` : '');
    }
  }
  if (!gate || !gate.passed) {
    return {
      stored: false, slug: targetSlug,
      reason: gate ? 'quality-gate-exhausted' : `gen-error: ${lastErr?.message}`,
      failures: gate?.failures || [],
    };
  }
  const slug = article.slug || targetSlug;
  const ins = await insertQueuedAtomic({
    slug,
    title: article.title,
    body: article.body,
    category: article.category || topic.category,
    tags: article.tags || topic.tags,
    meta_description: article.metaDescription || '',
    image_alt: article.imageAlt || article.title,
    word_count: gate.wordCount,
    asins_used: extractAsinsFromText(article.body),
    author: SITE.author,
    topic_index_500: idxAbsolute,
  });
  if (ins?.duplicate) return { skipped: 'duplicate-after-gen', slug };
  return { stored: true, slug, wordCount: gate.wordCount };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[preseed] OPENAI_API_KEY missing; aborting');
    process.exit(1);
  }
  const topics = topics500.topics;
  const end = Math.min(START + COUNT, topics.length);
  console.log(`[preseed] batch START=${START} COUNT=${COUNT} -> [${START}..${end}) of ${topics.length}, MIN_WORDS=${MIN_WORDS}`);
  const tally = { stored: 0, skipped: 0, failed: 0, failures: [] };
  for (let i = START; i < end; i++) {
    const t = topics[i];
    console.log(`[preseed] (#${i}) "${t.topic.slice(0, 70)}"`);
    let r;
    try {
      r = await seedOne(t, i);
    } catch (e) {
      console.error('[preseed] threw:', e.message);
      r = { stored: false, slug: t.slug_hint, reason: 'unhandled: ' + e.message };
    }
    if (r.stored) { tally.stored++; console.log(`[preseed]   STORED ${r.slug} (${r.wordCount}w)`); }
    else if (r.skipped) { tally.skipped++; console.log(`[preseed]   SKIP ${r.skipped}: ${r.slug}`); }
    else { tally.failed++; tally.failures.push({ idx: i, slug: r.slug, reason: r.reason }); console.log(`[preseed]   FAIL ${r.slug}: ${r.reason}`); }
  }
  console.log('[preseed] BATCH DONE', JSON.stringify(tally, null, 2));
}

main().catch((e) => { console.error('[preseed] fatal', e); process.exit(1); });
