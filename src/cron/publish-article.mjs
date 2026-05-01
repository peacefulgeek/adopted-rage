// Per master-scope §8 + §12D + §15 — phase-aware publish handler.
// Phase 1: published_count < 60 → 2 fresh articles per day.
// Phase 2: published_count >= 60 → release one queued, refresh one published.
// Quality gate is final; failure never stores.
import {
  countPublished,
  listQueued,
  publishQueued,
  insertPublished,
  listAllPublishedForFeed,
} from '../lib/db.mjs';
import { runQualityGate } from '../lib/article-quality-gate.mjs';
import { generateArticle } from '../lib/deepseek-generate.mjs';
import { pickInternalLinks } from '../lib/internal-links.mjs';
import { matchProducts } from '../lib/match-products.mjs';
import { assignHeroImage, libraryUrlForSlug } from '../lib/bunny.mjs';
import { SITE } from '../lib/site-config.mjs';
import { extractAsinsFromText, countAmazonLinks } from '../lib/amazon-verify.mjs';
import topicsData from '../data/topics.json' with { type: 'json' };
import asinPool from '../data/asin-pool.json' with { type: 'json' };

const MAX_ATTEMPTS = 4;

function pickTopic() {
  const t = topicsData.topics[Math.floor(Math.random() * topicsData.topics.length)];
  return t;
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function generateOrReleaseArticle({ allowedPhase }) {
  const published = await countPublished();
  const currentPhase = published < 60 ? 1 : 2;
  if (allowedPhase && currentPhase !== allowedPhase) {
    return { skipped: true, currentPhase, allowedPhase };
  }

  // Try the queue first
  const queued = await listQueued({ limit: 1 });
  if (queued.length > 0) {
    const a = queued[0];
    const gate = runQualityGate(a.body);
    if (gate.passed) {
      const heroUrl = await assignHeroImage(a.slug);
      await publishQueued(a.id, heroUrl);
      return { released: true, slug: a.slug };
    }
    // queued article rotted; fall through to fresh-gen
  }

  // Pick context for fresh generation
  const topic = pickTopic();
  const pool = (await listAllPublishedForFeed()).map((a) => ({
    title: a.title,
    slug: a.slug,
    category: a.category,
    tags: a.tags,
  }));
  const internalLinks = pickInternalLinks({
    topic: topic.topic,
    category: topic.category,
    tags: topic.tags,
    pool,
    take: 5,
  });
  // Fall back to most-recent if scorer found < 3
  if (internalLinks.length < 3 && pool.length > 0) {
    for (const p of pool) {
      if (!internalLinks.find((x) => x.slug === p.slug)) internalLinks.push(p);
      if (internalLinks.length >= 5) break;
    }
  }
  const products = matchProducts({
    articleTitle: topic.topic,
    articleTags: topic.tags,
    articleCategory: topic.category,
    catalog: asinPool.products,
    minLinks: 3,
    maxLinks: 4,
  });

  let article = null;
  let gate = null;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      article = await generateArticle({
        topic: topic.topic,
        category: topic.category,
        tags: topic.tags,
        internalLinks,
        products,
        authorName: SITE.author,
      });
    } catch (err) {
      console.error(`[publish] gen attempt ${i} threw:`, err.message);
      continue;
    }
    gate = runQualityGate(article.body);
    if (gate.passed) break;
    console.warn(`[publish] gen attempt ${i} failed gate:`, gate.failures.slice(0, 6));
  }
  if (!gate || !gate.passed) {
    return { stored: false, reason: 'quality-gate-exhausted', failures: gate?.failures || [] };
  }

  const slug = article.slug || slugify(article.title);
  const heroUrl = await assignHeroImage(slug);
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
  });
  return {
    stored: true,
    slug,
    wordCount: gate.wordCount,
    amazonLinks: countAmazonLinks(article.body),
  };
}
