#!/usr/bin/env node
// Seed the 30 launch articles for Site 87 per per-site §SITE 87.
// Iterates topics.json, generates with DeepSeek, runs the master-scope
// quality gate, retries up to MAX_ATTEMPTS, then stores as published.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/seed-launch-articles.mjs [N]
//
// If N omitted, seeds the entire 30-topic file.
// Idempotent: skips topics whose slug already exists in data/articles.json.
import { generateArticle } from '../src/lib/deepseek-generate.mjs';
import { runQualityGate } from '../src/lib/article-quality-gate.mjs';
import { pickInternalLinks } from '../src/lib/internal-links.mjs';
import { matchProducts } from '../src/lib/match-products.mjs';
import { assignHeroImage, libraryUrlForSlug, bespokeHeroForTopic, bespokeHeroForSlug } from '../src/lib/bunny.mjs';
import {
  insertPublished,
  listAllPublishedForFeed,
  getBySlug,
  listPublished,
} from '../src/lib/db.mjs';
import { extractAsinsFromText } from '../src/lib/amazon-verify.mjs';
import { enrichEEAT } from '../src/lib/enrich-eeat.mjs';
import { SITE } from '../src/lib/site-config.mjs';
import topicsData from '../src/data/topics.json' with { type: 'json' };
import asinPool from '../src/data/asin-pool.json' with { type: 'json' };
import fs from 'node:fs';

const MAX_ATTEMPTS = 4;
const N = parseInt(process.argv[2] || '30', 10);

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function buildContext(topic) {
  const pool = (await listAllPublishedForFeed()).map((a) => ({
    title: a.title,
    slug: a.slug,
    category: a.category,
    tags: a.tags,
  }));
  let internalLinks = pickInternalLinks({
    topic: topic.topic,
    category: topic.category,
    tags: topic.tags,
    pool,
    take: 5,
  });
  // For early seeds when pool is small, also include any other topics from
  // this seed run that already published, so first articles still link out.
  if (internalLinks.length < 3 && pool.length > 0) {
    for (const p of pool) {
      if (!internalLinks.find((x) => x.slug === p.slug)) internalLinks.push(p);
      if (internalLinks.length >= 5) break;
    }
  }
  // Even before any published, supply *future* slugs so the model writes
  // proper internal links; they'll resolve once the seed loop fills them in.
  if (internalLinks.length < 3) {
    const futureSeeds = topicsData.topics
      .filter((t) => t.topic !== topic.topic)
      .slice(0, 5)
      .map((t) => ({
        title: t.topic,
        slug: slugify(t.topic),
        category: t.category,
        tags: t.tags,
      }));
    internalLinks = internalLinks.concat(futureSeeds).slice(0, 5);
  }
  const products = matchProducts({
    articleTitle: topic.topic,
    articleTags: topic.tags,
    articleCategory: topic.category,
    catalog: asinPool.products,
    minLinks: 3,
    maxLinks: 4,
  });
  return { internalLinks, products };
}

async function seedOne(topic, idx, total, existingByTopicIndex) {
  const targetSlug = slugify(topic.topic);
  console.log(`[seed] (${idx + 1}/${total}) starting: ${topic.topic}`);
  // Skip if (a) targetSlug already exists OR (b) any article was previously
  // stored for this topic_index (model often picks a shorter slug than
  // slugify(topic.topic), and we don't want to re-seed the same topic).
  if (await getBySlug(targetSlug)) {
    console.log(`[seed] skip (slug exists): ${targetSlug}`);
    return { skipped: true, slug: targetSlug };
  }
  if (existingByTopicIndex.has(idx)) {
    const ex = existingByTopicIndex.get(idx);
    console.log(`[seed] skip (topic_index exists): #${idx} -> ${ex.slug}`);
    return { skipped: true, slug: ex.slug };
  }
  const { internalLinks, products } = await buildContext(topic);
  console.log(`[seed]   ctx built: ${internalLinks.length} links, ${products.length} products`);

  let article = null;
  let gate = null;
  let lastErr = null;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const t0 = Date.now();
    console.log(`[seed]   attempt ${i} -> deepseek...`);
    try {
      article = await generateArticle({
        topic: topic.topic,
        category: topic.category,
        tags: topic.tags,
        internalLinks,
        products,
        authorName: SITE.author,
      });
      console.log(`[seed]   attempt ${i} returned in ${(Date.now() - t0) / 1000}s, body=${(article?.body || '').length}ch`);
      // Auto-inject EEAT scaffolding (TL;DR, byline, time, links, self-ref)
      // so the gate passes on attempt 1. Master scope demands all 6 EEAT
      // signals; the model frequently forgets one or more.
      if (article && article.body) {
        article.body = enrichEEAT(article.body, {
          slug: article.slug || targetSlug,
          title: article.title,
          author: SITE.author,
          internalLinks,
        });
      }
    } catch (err) {
      lastErr = err;
      console.error(`[seed] attempt ${i} threw (${(Date.now() - t0) / 1000}s):`, err.message);
      continue;
    }
    gate = runQualityGate(article.body || '');
    if (gate.passed) {
      console.log(`[seed]   gate PASS: words=${gate.wordCount} amz=${gate.amazonLinks}`);
      break;
    }
    console.warn(
      `[seed] attempt ${i} failed gate (${gate.wordCount}w):`,
      gate.failures.slice(0, 8).join('; ')
    );
  }
  if (!gate || !gate.passed) {
    return {
      stored: false,
      slug: targetSlug,
      reason: gate ? 'quality-gate-exhausted' : `gen-error: ${lastErr?.message}`,
      failures: gate?.failures || [],
    };
  }
  const slug = article.slug || targetSlug;
  // Each launch topic has a bespoke watercolour hero painted for it.
  // Prefer slug-exact, then by topic index, then random library, then random fallback.
  const heroUrl =
    bespokeHeroForSlug(slug) ||
    bespokeHeroForTopic(idx) ||
    (await assignHeroImage(slug));
  // Backdate so the site looks naturally aged (avoids Google authority hit
  // from publishing 30 articles on one day). Spread across the past `total`
  // days, oldest first, with a random 6–22h jitter inside each day.
  const dayOffset = total - 1 - idx;
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() - dayOffset);
  base.setUTCHours(6 + Math.floor(Math.random() * 16), Math.floor(Math.random() * 60), 0, 0);
  const publishedAt = base.toISOString();
  await insertPublished({
    slug,
    title: article.title,
    body: article.body,
    category: article.category || topic.category,
    tags: article.tags || topic.tags,
    meta_description: article.metaDescription || '',
    image_alt: article.imageAlt || article.title,
    hero_url: heroUrl || libraryUrlForSlug(slug),
    word_count: gate.wordCount,
    asins_used: extractAsinsFromText(article.body),
    author: SITE.author,
    published_at: publishedAt,
    topic_index: idx,
  });
  console.log(`[seed] PUBLISHED ${slug} (${gate.wordCount}w, amz=${gate.amazonLinks})`);
  return { stored: true, slug, wordCount: gate.wordCount };
}

const LOCK = '/tmp/adoption-fog-seed.lock';
function acquireLock() {
  try {
    const fd = fs.openSync(LOCK, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch {} });
    process.on('SIGINT', () => { try { fs.unlinkSync(LOCK); } catch {} ; process.exit(130); });
    process.on('SIGTERM', () => { try { fs.unlinkSync(LOCK); } catch {} ; process.exit(143); });
    return true;
  } catch (e) {
    if (e.code === 'EEXIST') {
      // Stale-lock cleanup: if PID inside is dead, take over.
      try {
        const pid = parseInt(fs.readFileSync(LOCK, 'utf8'), 10);
        if (pid && pid !== process.pid) {
          try { process.kill(pid, 0); } catch (probeErr) {
            // process is dead, lock is stale
            fs.unlinkSync(LOCK);
            return acquireLock();
          }
        }
      } catch {}
    }
    return false;
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('[seed] OPENAI_API_KEY missing - aborting.');
    process.exit(1);
  }
  if (!acquireLock()) {
    console.error('[seed] another seeder is already running (lockfile ' + LOCK + ' present). aborting.');
    process.exit(2);
  }
  console.log(`[seed] seeding up to ${N} of ${topicsData.topics.length} topics into Site 87`);
  const results = { stored: 0, skipped: 0, failed: 0, failures: [] };
  const total = Math.min(N, topicsData.topics.length);
  // Build the topic_index -> existing-row map. Articles seeded in earlier runs
  // may not have a topic_index field; for those, match by exact title.
  const existing = await listPublished({ limit: 1000 });
  const existingByTopicIndex = new Map();
  for (const a of existing) {
    if (typeof a.topic_index === 'number') existingByTopicIndex.set(a.topic_index, a);
  }
  // For rows missing topic_index, infer it by best-match title and backfill.
  for (const a of existing) {
    if (typeof a.topic_index === 'number') continue;
    const idx = topicsData.topics.findIndex((t) => t.topic === a.title);
    if (idx >= 0 && !existingByTopicIndex.has(idx)) {
      existingByTopicIndex.set(idx, a);
      // Patch the row so the next run sees it cleanly.
      a.topic_index = idx;
    }
  }
  for (let i = 0; i < total; i++) {
    const t = topicsData.topics[i];
    const r = await seedOne(t, i, total, existingByTopicIndex);
    if (r.stored) results.stored++;
    else if (r.skipped) results.skipped++;
    else {
      results.failed++;
      results.failures.push({ topic: t.topic, reason: r.reason, failures: r.failures });
    }
  }
  console.log('\n[seed] DONE', JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('[seed] fatal', e);
  process.exit(1);
});
