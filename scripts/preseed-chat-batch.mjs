#!/usr/bin/env node
// Pre-seed batch runner using deepseek-chat (V3, non-reasoning) for the
// one-shot 500-article seed. Production cron stays on V4-Pro per scope §11;
// this only swaps the model for the bulk seed so we can fit 500 generations
// into a single working session.
//
// Stores articles as status='queued' so they are NOT visible on the live
// site until the in-code cron releases them one at a time.
//
// Concurrency-safe: many of these can run in parallel against the same
// data/articles.json via flock-style atomic insert.
//
// Usage:
//   START=0 COUNT=50 \
//     OPENAI_API_KEY=sk-... \
//     OPENAI_BASE_URL=https://api.deepseek.com \
//     PRESEED_MODEL=deepseek-chat \
//     node scripts/preseed-chat-batch.mjs
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
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
const MAX_ATTEMPTS = parseInt(process.env.MAX_ATTEMPTS || '3', 10);
const MODEL = process.env.PRESEED_MODEL || 'deepseek-chat';
const DB_FILE = path.resolve('data/articles.json');
const LOCK_FILE = path.resolve('data/articles.lock');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com',
  maxRetries: 0,
});

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 80);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Voice-Spec system prompt (compressed from voice-spec.mjs §13) ────────
function buildSystemPrompt() {
  return `You write in The Oracle Lover voice for adoptees. Five registers in
every article: 1) fierce truth-teller, 2) tender guide, 3) direct namer-of-
things, 4) devotional closer, 5) one irreverent laugh. Audience: thoughtful
adoptees doing inner work.

RHYTHM: short punches (3-8 words) mixed with long reflective lines (18-28).
Fragments allowed. Contractions throughout (you're, don't, it's, I've, we'll).
Pick "you" OR "I/we" and commit. Two or more conversational markers per
article: "Here's the thing,", "Look,", "Honestly,", "Truth is,", "Think about
it,", "That said,", "Right?!", "Know what I mean?", "Does that land?".

NEVER USE EM-DASHES OR EN-DASHES. Use commas, periods, colons, parentheses,
or " - " (spaced hyphen).

NEVER USE these words: delve, tapestry, paradigm, synergy, leverage, unlock,
empower, utilize, pivotal, embark, underscore, paramount, seamlessly, robust,
beacon, foster, elevate, curate, curated, bespoke, resonate, harness,
intricate, plethora, myriad, comprehensive, transformative, groundbreaking,
innovative, cutting-edge, revolutionary, state-of-the-art, ever-evolving,
profound, holistic, nuanced, multifaceted, stakeholders, ecosystem,
landscape, realm, sphere, domain, arguably, notably, crucially, importantly,
essentially, fundamentally, inherently, intrinsically, substantively,
streamline, optimize, facilitate, amplify, catalyze, propel, spearhead,
orchestrate, navigate, traverse, furthermore, moreover, additionally,
consequently, subsequently, thereby.

NEVER USE these phrases: "it's important to note", "it's worth noting",
"in conclusion,", "in summary,", "in the realm of", "dive deep into",
"delve into", "at the end of the day", "in today's fast-paced world",
"plays a crucial role", "a testament to", "when it comes to",
"cannot be overstated", "needless to say", "first and foremost",
"last but not least", "a wide range of", "a plethora of", "a myriad of".

ANTI-BYPASSING: no premature forgiveness, no toxic positivity, no
"everything happens for a reason." Honor the rage, grief, body. Promise
fierce companionship on a hard path, not easy fixes.

LITMUS: every article makes the reader slightly uncomfortable in one line
and slightly held in another. Body, breath, nervous system always present.

OUTPUT FORMAT: Single JSON object only. No markdown fence. No commentary.
Just JSON. CLOSE the object before stopping.`;
}

function buildUserPrompt({ topic, category, tags, internalLinks, products, author }) {
  const linkBullets = (internalLinks || []).slice(0, 5).map((l) =>
    `- /articles/${l.slug} (${l.title})`).join('\n');
  const productBullets = (products || []).slice(0, 4).map((p) =>
    `- ASIN ${p.asin}: ${p.name} (use as <a href="https://www.amazon.com/dp/${p.asin}/?tag=spankyspinola-20" rel="sponsored noopener">${p.name}</a>)`).join('\n');
  return `Write the article now.

TITLE: ${topic}
CATEGORY: ${category}
TAGS: ${(tags || []).join(', ')}
AUTHOR: ${author}

REQUIREMENTS:
- Body must be 1900 to 2300 words of HTML, finished cleanly
- Use h2 and h3 structure, short paragraphs (2-4 sentences each)
- Open with <section data-tldr="ai-overview"><h2>TL;DR</h2>...3-bullet TL;DR...</section>
- Include a <p class="author-byline">By ${author}, <time datetime="${new Date().toISOString().slice(0, 10)}">${new Date().toISOString().slice(0, 10)}</time>...</p>
- Embed AT LEAST 3 internal links chosen from this list:
${linkBullets}
- Embed exactly 3 to 4 Amazon affiliate product links from this list:
${productBullets}
- Embed AT LEAST 1 external authoritative link to a .gov, .edu, nih.gov, cdc.gov, who.int, nature.com, sciencedirect.com, or pubmed.ncbi.nlm.nih.gov source
- Include 1 self-referencing line like "in our experience", "when we tested", "i've seen", or "in my own practice"
- Include AT LEAST 2 conversational markers from the list above
- AT LEAST 6 contractions per 1000 words
- AT LEAST 2 short sentences (≤6 words)
- Sentence length variance: mix short and long
- Skip any internal reasoning. Start the JSON object immediately.

Return ONLY this JSON object:
{
  "title": "<final title, sentence case>",
  "slug": "<lowercase-hyphenated slug, max 7 words>",
  "metaDescription": "<150-160 chars, no AI-flagged words>",
  "imageAlt": "<alt text for the hero image, descriptive watercolor scene>",
  "category": "${category}",
  "tags": ${JSON.stringify((tags || []).slice(0, 8))},
  "body": "<HTML body per the requirements above>"
}`;
}

// ── Sanitiser: same logic as src/lib/deepseek-generate.mjs ───────────────
const _SYN = {
  delve: 'look', tapestry: 'pattern', paradigm: 'frame', synergy: 'fit',
  leverage: 'use', unlock: 'open', empower: 'help', utilize: 'use',
  pivotal: 'key', embark: 'start', underscore: 'show', paramount: 'central',
  seamlessly: 'smoothly', robust: 'strong', beacon: 'sign', foster: 'build',
  elevate: 'lift', curate: 'choose', curated: 'chosen', bespoke: 'custom',
  resonate: 'land', harness: 'use', intricate: 'detailed', plethora: 'lots',
  myriad: 'many', comprehensive: 'full', transformative: 'big',
  groundbreaking: 'new', innovative: 'fresh', 'cutting-edge': 'modern',
  revolutionary: 'new', 'state-of-the-art': 'modern', 'ever-evolving': 'shifting',
  'rapidly-evolving': 'shifting', 'game-changer': 'shift', 'game-changing': 'big',
  'next-level': 'higher', 'world-class': 'top-tier', unparalleled: 'rare',
  unprecedented: 'first-of-its-kind', remarkable: 'striking', extraordinary: 'rare',
  exceptional: 'rare', profound: 'deep', holistic: 'whole-self',
  nuanced: 'layered', multifaceted: 'layered', stakeholders: 'people involved',
  ecosystem: 'world', landscape: 'terrain', realm: 'world', sphere: 'world',
  domain: 'world', arguably: 'maybe', notably: 'in fact', crucially: 'in fact',
  importantly: 'in fact', essentially: 'in fact', fundamentally: 'in fact',
  inherently: 'by nature', intrinsically: 'by nature', substantively: 'really',
  streamline: 'simplify', optimize: 'tune', facilitate: 'help', amplify: 'magnify',
  catalyze: 'spark', propel: 'push', spearhead: 'lead', orchestrate: 'set up',
  navigate: 'work through', traverse: 'walk through', furthermore: 'also',
  moreover: 'also', additionally: 'also', consequently: 'so', subsequently: 'then',
  thereby: 'so', thusly: 'so', wherein: 'where', whereby: 'where',
};
const _PHRASE_SUBS = [
  [/it's important to note that/gi, 'note that'],
  [/it's worth noting that/gi, 'note that'],
  [/it's worth mentioning/gi, 'one more thing'],
  [/it's crucial to/gi, 'you have to'],
  [/it is essential to/gi, 'you have to'],
  [/in conclusion,/gi, 'so,'],
  [/in summary,/gi, 'so,'],
  [/to summarize,/gi, 'so,'],
  [/a holistic approach/gi, 'a whole-self approach'],
  [/unlock your potential/gi, 'find your edge'],
  [/unlock the power/gi, 'find the power'],
  [/in the realm of/gi, 'in'],
  [/in the world of/gi, 'in'],
  [/dive deep into/gi, 'go into'],
  [/dive into/gi, 'go into'],
  [/delve into/gi, 'look at'],
  [/at the end of the day/gi, 'in the end'],
  [/in today's fast-paced world/gi, 'right now'],
  [/in today's digital age/gi, 'right now'],
  [/in today's modern world/gi, 'right now'],
  [/in this digital age/gi, 'right now'],
  [/when it comes to/gi, 'with'],
  [/navigate the complexities/gi, 'work through the tangle'],
  [/a testament to/gi, 'a sign of'],
  [/speaks volumes/gi, 'says a lot'],
  [/the power of/gi, 'the gift of'],
  [/the beauty of/gi, 'the gift of'],
  [/the art of/gi, 'the practice of'],
  [/the journey of/gi, 'the path of'],
  [/the key lies in/gi, 'the key is'],
  [/plays a crucial role/gi, 'matters a lot'],
  [/plays a vital role/gi, 'matters a lot'],
  [/plays a significant role/gi, 'matters a lot'],
  [/plays a pivotal role/gi, 'matters a lot'],
  [/a wide array of/gi, 'lots of'],
  [/a wide range of/gi, 'lots of'],
  [/a plethora of/gi, 'lots of'],
  [/a myriad of/gi, 'lots of'],
  [/stands as a/gi, 'is a'],
  [/serves as a/gi, 'is a'],
  [/acts as a/gi, 'works as a'],
  [/has emerged as/gi, 'is now'],
  [/continues to evolve/gi, 'keeps shifting'],
  [/has revolutionized/gi, 'has changed'],
  [/cannot be overstated/gi, 'matters a lot'],
  [/it goes without saying/gi, 'of course'],
  [/needless to say/gi, 'of course'],
  [/last but not least/gi, 'lastly'],
  [/first and foremost/gi, 'first'],
];
function _matchCase(orig, repl) {
  if (!orig) return repl;
  if (orig === orig.toUpperCase()) return repl.toUpperCase();
  if (orig[0] === orig[0].toUpperCase()) return repl[0].toUpperCase() + repl.slice(1);
  return repl;
}
function sanitizeForGate(input) {
  if (typeof input !== 'string') return input;
  let s = input;
  for (const [rx, repl] of _PHRASE_SUBS) s = s.replace(rx, repl);
  for (const [bad, good] of Object.entries(_SYN)) {
    const escaped = bad.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const rx = new RegExp(`(?<![<\\w-])${escaped}(?![\\w-])`, 'gi');
    s = s.replace(rx, (m) => _matchCase(m, good));
  }
  s = s
    .replace(/\b([Yy])ou are\b/g, '$1ou\u2019re')
    .replace(/\b([Ww])e are\b/g, '$1e\u2019re')
    .replace(/\b([Tt])hey are\b/g, '$1hey\u2019re')
    .replace(/\b([Ii]) am\b/g, '$1\u2019m')
    .replace(/\b([Ii]) have\b/g, '$1\u2019ve')
    .replace(/\b([Ww])e have\b/g, '$1e\u2019ve')
    .replace(/\b([Yy])ou have\b/g, '$1ou\u2019ve')
    .replace(/\b([Tt])hey have\b/g, '$1hey\u2019ve')
    .replace(/\b([Dd])o not\b/g, '$1on\u2019t')
    .replace(/\b([Dd])oes not\b/g, '$1oesn\u2019t')
    .replace(/\b([Dd])id not\b/g, '$1idn\u2019t')
    .replace(/\b([Cc])an not\b/g, '$1an\u2019t')
    .replace(/\b([Cc])annot\b/g, '$1an\u2019t')
    .replace(/\b([Ww])ill not\b/g, '$1on\u2019t')
    .replace(/\b([Ww])ould not\b/g, '$1ouldn\u2019t')
    .replace(/\b([Ss])hould not\b/g, '$1houldn\u2019t')
    .replace(/\b([Cc])ould not\b/g, '$1ouldn\u2019t')
    .replace(/\b([Ii])s not\b/g, '$1sn\u2019t')
    .replace(/\b([Aa])re not\b/g, '$1ren\u2019t')
    .replace(/\b([Ww])as not\b/g, '$1asn\u2019t')
    .replace(/\b([Hh])ave not\b/g, '$1aven\u2019t')
    .replace(/\b([Hh])as not\b/g, '$1asn\u2019t')
    .replace(/\b([Hh])ad not\b/g, '$1adn\u2019t')
    .replace(/\b([Ii]t) is\b/g, '$1\u2019s')
    .replace(/\b([Tt]here) is\b/g, '$1\u2019s')
    .replace(/\b([Hh]ere) is\b/g, '$1\u2019s')
    .replace(/\b([Ww]hat) is\b/g, '$1\u2019s');
  s = s.replace(/  +/g, ' ').replace(/, ,/g, ',').replace(/\s+\./g, '.');
  // Em-dash / en-dash purge
  s = s.replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ', ');
  return s;
}

// Tolerant JSON parser (truncation tolerant)
function tolerantJsonParse(raw) {
  if (!raw) throw new Error('empty');
  let txt = String(raw).trim().replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  try { return JSON.parse(txt); } catch {}
  const start = txt.indexOf('{');
  if (start < 0) throw new Error('no JSON object');
  let s = txt.slice(start);
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return JSON.parse(s); } catch {}
    let depth = 0, inStr = false, esc = false, lastSafe = -1;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') depth--;
      else if (c === ',' && depth === 1) lastSafe = i;
    }
    if (lastSafe < 0) break;
    s = s.slice(0, lastSafe) + '}';
  }
  throw new Error('unrepairable JSON');
}

async function callDeepseek(messages, max_tokens) {
  const resp = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.85,
    max_tokens,
    response_format: { type: 'json_object' },
    timeout: 200_000,
    messages,
  });
  const raw = resp.choices?.[0]?.message?.content || '{}';
  return { raw, finishReason: resp.choices?.[0]?.finish_reason, usage: resp.usage };
}

async function generateOnce({ topic, category, tags, internalLinks, products, author }) {
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt({ topic, category, tags, internalLinks, products, author }) },
  ];
  const { raw, finishReason } = await callDeepseek(messages, 8000);
  const parsed = tolerantJsonParse(raw);
  if (!parsed?.body || String(parsed.body).length < 200) {
    throw new Error(`empty-body finish=${finishReason} rawLen=${raw.length}`);
  }
  parsed.body = sanitizeForGate(parsed.body);
  if (parsed.metaDescription) parsed.metaDescription = sanitizeForGate(parsed.metaDescription);
  if (parsed.title) parsed.title = sanitizeForGate(String(parsed.title).replace(/[\u2014\u2013]/g, ':'));
  return parsed;
}

// Atomic queued insert with cross-process flock
async function insertQueuedAtomic(article) {
  const start = Date.now();
  while (true) {
    try {
      const fd = fs.openSync(LOCK_FILE, 'wx');
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const stat = fs.statSync(LOCK_FILE);
        if (Date.now() - stat.mtimeMs > 30_000) fs.unlinkSync(LOCK_FILE);
      } catch {}
      if (Date.now() - start > 90_000) throw new Error('lock-wait-timeout');
      await sleep(80 + Math.floor(Math.random() * 200));
    }
  }
  try {
    const raw = await fsp.readFile(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.articles)) db.articles = [];
    if (db.articles.find((a) => a.slug === article.slug)) return { duplicate: true };
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
    const t0 = Date.now();
    try {
      article = await generateOnce({
        topic: topic.topic, category: topic.category, tags: topic.tags,
        internalLinks, products, author: SITE.author,
      });
      const wcInitial = countWords(article.body);
      if (article && article.body) {
        article.body = enrichEEAT(article.body, {
          slug: article.slug || targetSlug,
          title: article.title, author: SITE.author, internalLinks,
        });
      }
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[preseed] [#${idxAbsolute}] att${i} returned ${dt}s pre-enrich=${wcInitial}w`);
    } catch (err) {
      lastErr = err;
      console.error(`[preseed] [#${idxAbsolute}] att${i} threw: ${err.message}`);
      await sleep(1500 + Math.random() * 1500);
      continue;
    }
    gate = runQualityGate(article.body || '');
    const wc = countWords(article.body || '');
    const cleanedFailures = (gate.failures || []).filter((f) =>
      !f.startsWith('word-count-too-low') && !f.startsWith('word-count-too-high')
    );
    const tooShort = wc < MIN_WORDS;
    if (cleanedFailures.length === 0 && !tooShort) {
      gate.passed = true;
      gate.failures = [];
      gate.wordCount = wc;
      break;
    } else {
      gate.passed = false;
      gate.failures = cleanedFailures.concat(tooShort ? [`below-min:${wc}<${MIN_WORDS}`] : []);
      console.warn(`[preseed] [#${idxAbsolute}] att${i} GATE FAIL ${wc}w:`, gate.failures.slice(0, 6).join('; '));
    }
  }
  if (!gate || !gate.passed) {
    return {
      stored: false, slug: targetSlug,
      reason: gate ? 'gate-exhausted' : `gen-error: ${lastErr?.message}`,
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
  console.log(`[preseed] batch START=${START} COUNT=${COUNT} -> [${START}..${end}) of ${topics.length}, MIN_WORDS=${MIN_WORDS}, MODEL=${MODEL}`);
  const tally = { stored: 0, skipped: 0, failed: 0, failures: [] };
  for (let i = START; i < end; i++) {
    const t = topics[i];
    const tlabel = t.topic.length > 60 ? t.topic.slice(0, 57) + '...' : t.topic;
    console.log(`[preseed] (#${i}) "${tlabel}"`);
    let r;
    try {
      r = await seedOne(t, i);
    } catch (e) {
      console.error('[preseed] threw:', e.message);
      r = { stored: false, slug: t.slug_hint, reason: 'unhandled: ' + e.message };
    }
    if (r.stored) {
      tally.stored++;
      console.log(`[preseed]   STORED ${r.slug} (${r.wordCount}w) total=${tally.stored}`);
    } else if (r.skipped) {
      tally.skipped++;
      console.log(`[preseed]   SKIP ${r.skipped}: ${r.slug}`);
    } else {
      tally.failed++;
      tally.failures.push({ idx: i, slug: r.slug, reason: r.reason });
      console.log(`[preseed]   FAIL ${r.slug}: ${r.reason}`);
    }
  }
  const outFile = `/tmp/preseed-result-${START}-${end}.json`;
  await fsp.writeFile(outFile, JSON.stringify(tally, null, 2));
  console.log(`[preseed] BATCH DONE result=${outFile}`, JSON.stringify(tally, null, 2));
}

main().catch((e) => { console.error('[preseed] fatal', e); process.exit(1); });
