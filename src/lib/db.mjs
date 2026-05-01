// JSON-file DB. Same shape as Postgres rows so we can swap to `pg` later
// without touching call sites. Per master-scope §1: "If it uses JSON files,
// adapt to JSON" — and §15A's queue logic is implemented identically.
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the data dir robustly: works whether this module is loaded from
// src/lib/db.mjs (dev) or bundled into dist/index.js (prod). Walk up from
// __dirname looking for a data/articles.json. As a last resort, walk up
// looking for package.json and put data/ next to it.
function resolveDataDir() {
  if (process.env.AF_DATA_DIR) return process.env.AF_DATA_DIR;
  // Try walking up from this file
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fsSync.existsSync(path.join(dir, 'data', 'articles.json'))) {
      return path.join(dir, 'data');
    }
    if (fsSync.existsSync(path.join(dir, 'package.json'))) {
      // Found the project root, even if data/ doesn't exist yet.
      return path.join(dir, 'data');
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Walk up from cwd as a last resort.
  let cwd = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fsSync.existsSync(path.join(cwd, 'data', 'articles.json'))) {
      return path.join(cwd, 'data');
    }
    if (fsSync.existsSync(path.join(cwd, 'package.json'))) {
      return path.join(cwd, 'data');
    }
    const parent = path.dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }
  return path.resolve(process.cwd(), 'data');
}

const DATA_DIR = resolveDataDir();
const DB_FILE = path.join(DATA_DIR, 'articles.json');

/**
 * Article row shape (mirrors §15B Postgres schema):
 *  id, slug, title, body, category, tags[], status('queued'|'published'),
 *  queued_at, published_at, last_modified_at, hero_url,
 *  asins_used[], word_count, meta_description, image_alt,
 *  reading_time, author, internal_links_used[]
 */

let _cache = null;
let _cacheMtime = 0;

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ articles: [] }, null, 2));
  }
}

async function load() {
  await ensureFile();
  // Reload if the file changed on disk (another process, like the seed
  // script or cron, may have written to it).
  let mtime = 0;
  try {
    const st = await fs.stat(DB_FILE);
    mtime = st.mtimeMs;
  } catch {}
  if (_cache && mtime && mtime <= _cacheMtime) return _cache;
  const raw = await fs.readFile(DB_FILE, 'utf8');
  _cache = JSON.parse(raw);
  if (!Array.isArray(_cache.articles)) _cache.articles = [];
  _cacheMtime = mtime;
  return _cache;
}

async function save() {
  if (!_cache) return;
  await fs.writeFile(DB_FILE, JSON.stringify(_cache, null, 2));
  try {
    const st = await fs.stat(DB_FILE);
    _cacheMtime = st.mtimeMs;
  } catch {}
}

export async function reload() {
  _cache = null;
  _cacheMtime = 0;
  return load();
}

// ─── Queries ─────────────────────────────────────────────────────────────

export async function listPublished({ limit = 50, offset = 0, category, q } = {}) {
  const db = await load();
  let rows = db.articles.filter((a) => a.status === 'published');
  if (category) {
    const cl = category.toLowerCase();
    rows = rows.filter((a) => (a.category || '').toLowerCase() === cl);
  }
  if (q) {
    const ql = q.toLowerCase();
    rows = rows.filter(
      (a) =>
        (a.title || '').toLowerCase().includes(ql) ||
        (a.body || '').toLowerCase().includes(ql) ||
        (a.tags || []).some((t) => t.toLowerCase().includes(ql))
    );
  }
  rows.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
  return rows.slice(offset, offset + limit);
}

export async function listAllPublishedForFeed() {
  const db = await load();
  return db.articles
    .filter((a) => a.status === 'published')
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
}

export async function listQueued({ limit = 1 } = {}) {
  const db = await load();
  return db.articles
    .filter((a) => a.status === 'queued')
    .sort((a, b) => (a.queued_at || '').localeCompare(b.queued_at || ''))
    .slice(0, limit);
}

export async function countByStatus() {
  const db = await load();
  const out = { queued: 0, published: 0 };
  for (const a of db.articles) {
    if (a.status === 'queued') out.queued++;
    else if (a.status === 'published') out.published++;
  }
  return out;
}

export async function countPublished() {
  return (await countByStatus()).published;
}

export async function getBySlug(slug) {
  const db = await load();
  return db.articles.find((a) => a.slug === slug && a.status === 'published') || null;
}

export async function getCategories() {
  const db = await load();
  const set = new Set();
  for (const a of db.articles) if (a.status === 'published' && a.category) set.add(a.category);
  return Array.from(set).sort();
}

// ─── Mutations ───────────────────────────────────────────────────────────

export async function insertQueued(article) {
  const db = await load();
  if (db.articles.find((a) => a.slug === article.slug)) return false; // dedupe
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
  await save();
  return true;
}

export async function insertPublished(article) {
  const db = await load();
  const existing = db.articles.find((a) => a.slug === article.slug);
  const now = new Date().toISOString();
  // Caller may supply `published_at` (e.g., to backdate launch articles so the
  // site doesn't look like it published 30 pieces in one day, which Google
  // treats as a spam/authority red flag).
  const publishedAt = article.published_at || now;
  if (existing) {
    Object.assign(existing, {
      ...article,
      status: 'published',
      published_at: existing.published_at || publishedAt,
      last_modified_at: now,
    });
  } else {
    db.articles.push({
      id: db.articles.length + 1,
      status: 'published',
      queued_at: null,
      asins_used: [],
      internal_links_used: [],
      word_count: 0,
      ...article,
      published_at: publishedAt,
      last_modified_at: now,
    });
  }
  await save();
}

export async function publishQueued(id, heroUrl) {
  const db = await load();
  const a = db.articles.find((x) => x.id === id);
  if (!a) return null;
  a.status = 'published';
  a.published_at = new Date().toISOString();
  a.last_modified_at = a.published_at;
  if (heroUrl) a.hero_url = heroUrl;
  await save();
  return a;
}

export async function updateBody(id, patch) {
  const db = await load();
  const a = db.articles.find((x) => x.id === id);
  if (!a) return null;
  Object.assign(a, patch);
  a.last_modified_at = new Date().toISOString();
  await save();
  return a;
}
