// Per master-scope §9A — Bunny CDN library system.
// HARDCODE per site. DO NOT move to env. See ./site-config.mjs.
//
// Storage zone: adopted-rage  (NY endpoint)
// Pull zone:    https://adopted-rage.b-cdn.net
//
// All hero/card images live on Bunny as compressed WebP. Repo is image-free
// except client/public/favicon.svg (master-scope §5 + §9B.6).
import { BUNNY } from './site-config.mjs';

const PZ = BUNNY.PULL_ZONE.replace(/\/$/, '');

export const HERO_BACKGROUND_FALLBACK = `${PZ}/heroes/af-hero-fog.webp`;

// Per-slug bespoke watercolour hero (one per launch topic).
const SLUG_HERO_MAP = {
  'what-is-the-adoption-fog': `${PZ}/heroes/af-hero-01-fog.webp`,
  'what-is-adoption-fog': `${PZ}/heroes/af-hero-01-fog.webp`,
  'the-primal-wound-why-separation-from-birth-mother-matters': `${PZ}/heroes/af-hero-02-roots.webp`,
  'primal-wound-separation-matters': `${PZ}/heroes/af-hero-02-roots.webp`,
  'adoptee-compliance-the-mask-of-gratitude': `${PZ}/heroes/af-hero-03-mask.webp`,
  'why-adoptees-are-told-to-be-grateful': `${PZ}/heroes/af-hero-04-gratitude.webp`,
  'the-search-how-to-find-your-birth-parents': `${PZ}/heroes/af-hero-05-search.webp`,
  'reunion-trauma-when-finding-your-birth-family': `${PZ}/heroes/af-hero-06-reunion.webp`,
  'reunion-trauma-when-happy-ending-fails': `${PZ}/heroes/af-hero-06-reunion.webp`,
  'reunion-trauma-happy-ending': `${PZ}/heroes/af-hero-06-reunion.webp`,
  'late-discovery-adoptees-when-you-find-out': `${PZ}/heroes/af-hero-07-late-discovery.webp`,
  'transracial-adoption-growing-up-as-the-other': `${PZ}/heroes/af-hero-08-transracial.webp`,
  'adoptee-identity-who-am-i-if-i-dont-know': `${PZ}/heroes/af-hero-09-identity.webp`,
  'adoption-and-attachment-why-relationships-feel-complicated': `${PZ}/heroes/af-hero-10-attachment.webp`,
  'adoptive-parents-blind-spot': `${PZ}/heroes/af-hero-11-blindspot.webp`,
  'adoption-and-addiction-the-connection': `${PZ}/heroes/af-hero-12-addiction.webp`,
  'how-to-find-an-adoption-competent-therapist': `${PZ}/heroes/af-hero-13-therapist.webp`,
  'birth-mother-grief-the-other-side': `${PZ}/heroes/af-hero-14-birthmother.webp`,
  'the-adoptees-body-where-preverbal-trauma-lives': `${PZ}/heroes/af-hero-15-body.webp`,
  'dna-testing-and-adoption-23andme': `${PZ}/heroes/af-hero-16-dna.webp`,
  'closed-vs-open-adoption-impact': `${PZ}/heroes/af-hero-17-closed-open.webp`,
  'adoptee-rage-where-the-anger-comes-from': `${PZ}/heroes/af-hero-18-rage.webp`,
  'fantasy-parent-vs-real-parent': `${PZ}/heroes/af-hero-19-fantasy.webp`,
  'adoption-and-romantic-relationships': `${PZ}/heroes/af-hero-20-romantic.webp`,
  'how-to-talk-to-your-adoptive-parents': `${PZ}/heroes/af-hero-21-parenting.webp`,
  'adoptees-guide-to-nervous-system-regulation': `${PZ}/heroes/af-hero-22-grief.webp`,
  'international-adoption-cross-cultural-wounds': `${PZ}/heroes/af-hero-23-hidden.webp`,
  'when-reunion-goes-wrong-rejection': `${PZ}/heroes/af-hero-24-spiritual.webp`,
  'adoptee-peer-support': `${PZ}/heroes/af-hero-25-questions.webp`,
  'the-language-of-adoption-why-words-matter': `${PZ}/heroes/af-hero-26-trauma.webp`,
  'healing-the-primal-wound-somatic-approaches': `${PZ}/heroes/af-hero-27-rejection.webp`,
  'tcm-and-adoptee-trauma-heart-shen-kidney-jing': `${PZ}/heroes/af-hero-28-time.webp`,
  'parenting-as-an-adoptee': `${PZ}/heroes/af-hero-29-naming.webp`,
  'beyond-the-fog-what-life-looks-like': `${PZ}/heroes/af-hero-30-paths.webp`,
};

// Topic-index based fallback: 30 unique heroes ordered to match topics.json.
const HERO_BY_TOPIC_INDEX = Array.from({ length: 30 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  // The migration script preserved original filenames, so map index → filename:
  const names = [
    'fog', 'roots', 'mask', 'gratitude', 'search',
    'reunion', 'late-discovery', 'transracial', 'identity', 'attachment',
    'blindspot', 'addiction', 'therapist', 'birthmother', 'body',
    'dna', 'closed-open', 'rage', 'fantasy', 'romantic',
    'parenting', 'grief', 'hidden', 'spiritual', 'questions',
    'trauma', 'rejection', 'time', 'naming', 'paths',
  ];
  return `${PZ}/heroes/af-hero-${n}-${names[i]}.webp`;
});

// Library of generic adoptee-themed cards used when nothing matches.
const LIBRARY_FALLBACK = [
  `${PZ}/cards/af-card-roots.webp`,
  `${PZ}/cards/af-card-thread.webp`,
  `${PZ}/cards/af-card-window.webp`,
  `${PZ}/cards/af-card-letter.webp`,
  `${PZ}/cards/af-card-search.webp`,
  `${PZ}/cards/af-card-body.webp`,
  `${PZ}/cards/af-card-family.webp`,
  `${PZ}/cards/af-card-healing.webp`,
  `${PZ}/cards/af-card-identity.webp`,
  `${PZ}/cards/af-card-language.webp`,
  `${PZ}/cards/af-card-integration.webp`,
  `${PZ}/cards/af-card-child.webp`,
  `${PZ}/cards/af-card-beyond.webp`,
  `${PZ}/cards/af-card-peer.webp`,
];

/** Public: bespoke hero for a launch topic by index. */
export function bespokeHeroForTopic(idx) {
  return HERO_BY_TOPIC_INDEX[idx] ?? null;
}

/** Public: bespoke hero for an exact slug. */
export function bespokeHeroForSlug(slug) {
  return SLUG_HERO_MAP[slug] || null;
}

function stableIndex(slug, mod) {
  let h = 0;
  for (let i = 0; i < (slug || '').length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Stable URL for a slug from the generic library (deterministic). */
export function libraryUrlForSlug(slug) {
  return LIBRARY_FALLBACK[stableIndex(slug, LIBRARY_FALLBACK.length)];
}

/**
 * Pick a hero for a published article. Order:
 *   1. Bespoke per-slug map.
 *   2. (Future: per-topic-index, set by the seeder.)
 *   3. Stable library card.
 *
 * This is called by cron handlers when a brand-new article gets generated.
 * Bunny upload of any new generated images would happen via the migration
 * script run as a one-off; the cron path returns library URLs directly.
 */
export async function assignHeroImage(slug) {
  const bespoke = bespokeHeroForSlug(slug);
  if (bespoke) return bespoke;
  return libraryUrlForSlug(slug);
}
