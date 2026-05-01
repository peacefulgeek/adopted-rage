#!/usr/bin/env node
// One-shot: build a 500-topic plan for the pre-seed.
// All topics unique, all on-brand for Adopted Rage, distributed across the
// existing categories from src/data/topics.json so the cron's category logic
// continues to work.
import fs from 'node:fs';

const CATEGORIES = [
  'Primal Wound',
  'Identity & Search',
  'Reunion & Re-Wounding',
  'Late Discovery',
  'Transracial Adoption',
  'Body & Nervous System',
  'Adoptive Parents',
  'Healing Practices',
  'Adoptee Library',
];

// 9 thematic pools. Each pool has a category and a list of unique angles.
// Angles are short phrases that get combined with frame templates below.
// Total topics = sum(angles per pool) * frames per pool.

const POOLS = [
  // ── 1. Primal Wound (deep separation/early-life) ────────────────────────
  {
    category: 'Primal Wound',
    tags: ['primal-wound', 'separation', 'preverbal'],
    angles: [
      'preverbal grief in adopted infants',
      'why your body remembers what your mind cannot',
      'the silent rupture of newborn separation',
      'how Verrier\'s primal wound theory aged',
      'Maté on the wound that comes before language',
      'why the missing mother lives in the nervous system',
      'when grief has no words yet',
      'the cellular memory of separation',
      'adoptee rage as unmetabolized grief',
      'the long shadow of an early goodbye',
      'why infants cry even when fed and held',
      'what neuroscience now says about preverbal trauma',
      'the difference between attachment and bonding',
      'why being chosen still aches',
      'when the wound feels like an empty room',
      'the quiet ache no one named for you',
      'why adoption is not the same as never being lost',
      'the primal wound across cultures',
      'why no, you are not making it up',
      'the body remembers: a primer for adoptees',
      'inherited grief: the mother carried it too',
      'why early loss reshapes the brain',
      'the long tail of newborn skin hunger',
      'the wound of being held by hands that did not grow you',
      'how adoption can feel like a soft amputation',
    ],
  },
  // ── 2. Identity & Search ────────────────────────────────────────────────
  {
    category: 'Identity & Search',
    tags: ['identity', 'search', 'belonging'],
    angles: [
      'finding your face in a crowd of strangers',
      'who am I if my origin is sealed',
      'the gift and grief of a non-identifying letter',
      'when DNA results break your story',
      'searching without telling adoptive parents',
      'the search that takes a decade',
      'searching for a name that was changed',
      'genealogy for adoptees: how to start',
      'using AncestryDNA without losing your mind',
      'the moment you see your birth mother\'s photo',
      'reading your sealed file for the first time',
      'when your search agency goes silent',
      'building a search budget you can sustain',
      'paid intermediaries: how to vet one',
      'how to write the first letter to a birth parent',
      'the etiquette of contacting a possible half-sibling',
      'when the search ends in a grave',
      'identity as an adoptee of color in white spaces',
      'naming yourself: the right to a chosen name',
      'birth name vs adoptive name vs chosen name',
      'belonging without proof of where you began',
      'when your story is everyone else\'s gossip',
      'choosing not to search and still being whole',
      'searching in middle age vs early adulthood',
      'searching while parenting your own kids',
      'the relief of no longer needing to know',
      'the loneliness of being everyone\'s closing chapter',
      'when reunion changes your name back',
    ],
  },
  // ── 3. Reunion & Re-Wounding ────────────────────────────────────────────
  {
    category: 'Reunion & Re-Wounding',
    tags: ['reunion', 'rewounding', 'birth-family'],
    angles: [
      'reunion in the first 90 days',
      'the genetic mirror moment',
      'when your birth mother is not who you imagined',
      'when a birth sibling is the easier door',
      'preparing for a birth parent funeral',
      'second rejection after reunion',
      'long pauses, then ghosting',
      'reuniting with a parent who is dying',
      'reunion across time zones',
      'reunion across language barriers',
      'meeting the half-siblings who never knew about you',
      'meeting a birth father who denies you',
      'when reunion feels like falling in love',
      'reunion fantasy collapse',
      'why reunion makes adoptive parents nervous',
      'navigating the holidays after reunion',
      'first photo, first hug, first awkward pause',
      'reunion through letters only',
      'when reunion stays small and stays tender',
      'when a birth parent has another whole family',
      'reunion when one of you is in recovery',
      'reunion when one of you is poor and one is not',
      'reunion when religion gets in the way',
      'reunion when the language of love is different',
      'closing reunion gracefully when it stops working',
    ],
  },
  // ── 4. Late Discovery ───────────────────────────────────────────────────
  {
    category: 'Late Discovery',
    tags: ['late-discovery', 'lda', 'truth'],
    angles: [
      'the late-discovery shock at 30',
      'finding out at your father\'s funeral',
      'a DNA result that does not match your dad',
      'when a cousin\'s ancestry test reveals you',
      'late-discovery at 50 with kids of your own',
      'late-discovery and the rage that follows',
      'late-discovery and the people who hid it',
      'late-discovery as a misattributed paternity event',
      'late-discovery in a small town',
      'late-discovery and the second family',
      'late-discovery from a Reddit thread',
      'late-discovery from a 23andMe match',
      'late-discovery from a leaked document',
      'late-discovery and the question of forgiveness',
      'late-discovery while pregnant',
      'late-discovery and your own children\'s right to know',
      'late-discovery as a non-paternity event vs adoption',
      'NPE vs LDA: the difference and the overlap',
      'late-discovery and your medical history',
      'rebuilding identity after late discovery',
      'how to tell your adoptive parents you know',
      'finding sealed records as a late-discovery adoptee',
      'the slow integration after late discovery',
      'late-discovery and the loss of the past you thought you had',
      'finding the love that survives the lie',
    ],
  },
  // ── 5. Transracial Adoption ─────────────────────────────────────────────
  {
    category: 'Transracial Adoption',
    tags: ['transracial', 'race', 'culture'],
    angles: [
      'transracial adoption and racial mirrors',
      'transracial adoption and hair',
      'Korean adoptees in white families',
      'Black adoptees in white families',
      'Latine adoptees in white families',
      'Indigenous adoptees and the ICWA',
      'Chinese adoptees and the one-child policy',
      'transracial adoption and adoptee-only spaces',
      'transracial adoption in homogeneous neighborhoods',
      'transracial adoption across faith lines',
      'transracial adoption and the language of tokenism',
      'transracial adoption and birth-culture immersion trips',
      'transracial adoption and code-switching at home',
      'when adoptive parents say they don\'t see color',
      'how to find adult mentors of your race',
      'transracial adoption and dating outside your race',
      'transracial adoption and your own kids',
      'transracial adoption and the model-minority myth',
      'transracial adoption and ancestral trauma',
      'transracial adoption and language loss',
      'transracial adoption and the immigrant adoptee',
      'transracial adoption and visa status',
      'transracial adoption and refugee origins',
      'transracial adoption and racial gaslighting at family dinners',
      'transracial adoption and the cost of cultural mismatch',
    ],
  },
  // ── 6. Body & Nervous System ────────────────────────────────────────────
  {
    category: 'Body & Nervous System',
    tags: ['somatic', 'nervous-system', 'body'],
    angles: [
      'polyvagal theory for adoptees',
      'fawn response in adoptees',
      'freeze response in adoptees',
      'flight response in adoptees',
      'fight response in adoptees',
      'somatic experiencing for preverbal trauma',
      'EMDR for adoption trauma',
      'IFS parts work for adoptees',
      'breathwork for nervous-system regulation',
      'cold exposure for vagal tone',
      'yoga nidra for sleep grief',
      'restorative yoga for chronic activation',
      'why adoptees are prone to chronic illness',
      'autoimmune disease and adoptee trauma',
      'adoptee insomnia and what helps',
      'gut-brain axis and adoption stress',
      'the science of skin hunger',
      'why touch can feel both needed and unsafe',
      'co-regulation in adoptee partnerships',
      'pendulation as an adoptee tool',
      'titration in trauma therapy for adoptees',
      'the orienting reflex for adoptees',
      'somatic anchors for the holidays',
      'a daily nervous-system menu for adoptees',
      'the morning routine of a regulated adoptee',
    ],
  },
  // ── 7. Adoptive Parents ─────────────────────────────────────────────────
  {
    category: 'Adoptive Parents',
    tags: ['adoptive-parents', 'family', 'communication'],
    angles: [
      'when adoptive parents won\'t talk about adoption',
      'when adoptive parents say "we are your real family"',
      'how to grieve a loving adoptive parent',
      'how to set limits with an enmeshed adoptive parent',
      'how adoptive parents fragilize the adoptee\'s grief',
      'when an adoptive parent has dementia and old wounds resurface',
      'adoptive grandparents and the racial gap',
      'when an adoptive parent dies and the secrets get unsealed',
      'how to write a letter to your adoptive parents about searching',
      'how to invite adoptive parents into your healing',
      'when adoptive parents are also adoptive grandparents to your kids',
      'when adoptive parents helped you find your birth family',
      'when adoptive parents tried to block your search',
      'adoptee-led conversations at the holiday table',
      'the script for telling adoptive parents you are in therapy',
      'naming your adoptive mom by her first name',
      'when the saviorism comes from a religious adoptive parent',
      'when adoptive parents adopted internationally and never went back',
      'when adoptive parents had biological kids first',
      'when adoptive parents adopted multiple unrelated kids',
      'co-parenting with your adoptive parents during a health crisis',
      'when adoptive parents weaponize your gratitude',
      'when an adoptive parent will not meet your birth family',
      'adoption and chosen family beyond your adoptive home',
      'how to reconnect with adoptive parents after years apart',
    ],
  },
  // ── 8. Healing Practices ────────────────────────────────────────────────
  {
    category: 'Healing Practices',
    tags: ['healing', 'practice', 'somatic'],
    angles: [
      'building an adoptee morning practice',
      'keeping a search journal',
      'art therapy for the unseen self',
      'letter-writing to the unmet birth mother',
      'altars for the missing parent',
      'ritual for sealed records',
      'fasting and grief for adoptees',
      'making peace with mother day',
      'making peace with father day',
      'writing your origin story without lies',
      'finding adoptee writers who change everything',
      'starting an adoptee book club',
      'starting an adoptee pod or peer group',
      'when group therapy is not enough',
      'when individual therapy is not enough',
      'choosing between EMDR, brainspotting, and SE',
      'integrating ketamine therapy for adoption trauma',
      'integrating psilocybin therapy for adoption trauma',
      'integrating MDMA-assisted therapy for adoption trauma',
      'when 12-step recovery meets adoption grief',
      'when somatic therapy meets adoption grief',
      'when ancestral healing meets adoption grief',
      'when astrology meets adoption identity',
      'when tarot meets adoption identity',
      'when family constellations meets adoption',
      'when Jungian shadow work meets adoption',
      'the year-long healing arc for adoptees',
      'the seven-year integration of adoption grief',
    ],
  },
  // ── 9. Adoptee Library ──────────────────────────────────────────────────
  {
    category: 'Adoptee Library',
    tags: ['library', 'books', 'resources'],
    angles: [
      'a starter syllabus for adoptee healing',
      'rereading Verrier in midlife',
      'why Lifton still hits',
      'rereading Brodzinsky as an adult',
      'why van der Kolk speaks to adoptees',
      'why Maté speaks to adoptees',
      'why Estés speaks to adoptees',
      'why Pollack speaks to adoptees',
      'why Arrien speaks to adoptees',
      'why Hollis speaks to adoptees',
      'classic memoirs every adoptee should read',
      'memoirs by transracial adoptees',
      'memoirs by Korean adoptees',
      'memoirs by Black adoptees',
      'memoirs by Indigenous adoptees',
      'memoirs by domestic infant adoptees',
      'memoirs by foster-care adoptees',
      'memoirs by late-discovery adoptees',
      'documentary films every adoptee should see',
      'podcasts hosted by adoptees',
      'newsletters worth subscribing to',
      'critical adoption studies for non-academics',
      'adoption and feminism: required reading',
      'adoption and race: required reading',
      'adoption and class: required reading',
    ],
  },
];

// Frame templates: rotate through them per pool to multiply angles into
// distinct, search-friendly headlines. ≥4 frames per pool ensures uniqueness.
// Each frame produces a different rhetorical entry-point so even similar
// angles sit at different content axes.
const FRAMES = [
  (a) => `What ${cap(a)} Actually Looks Like`,
  (a) => `${capSentence(a)}: A Field Guide for Adoptees`,
  (a) => `${capSentence(a)} (And the Quiet Cost No One Names)`,
  (a) => `An Honest Look at ${cap(a)}`,
  (a) => `When ${cap(a)} Is the Door, Not the Wound`,
  (a) => `The Adoptee\'s Guide to ${cap(a)}`,
  (a) => `Why ${cap(a)} Hits Differently for Adoptees`,
  (a) => `${capSentence(a)} Without Pretending You Are Fine`,
  (a) => `What I Tell Clients About ${cap(a)}`,
  (a) => `Naming ${cap(a)} Out Loud`,
  (a) => `A Small, Honest Practice for ${cap(a)}`,
  (a) => `${capSentence(a)} Is Not the End of the Story`,
  (a) => `What Most Articles About ${cap(a)} Miss`,
  (a) => `${capSentence(a)}: Five Things You Are Allowed to Say`,
  (a) => `The Inner Work Behind ${cap(a)}`,
];

function cap(s) {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
function capSentence(s) {
  return s[0].toUpperCase() + s.slice(1);
}

// Build the topic list deterministically: round-robin across pools so the
// final 500 are interleaved (better category balance for cron sampling).
const seen = new Set();
const out = [];
let frameIdx = 0;
let i = 0;
const targetCount = 500;
while (out.length < targetCount) {
  const pool = POOLS[i % POOLS.length];
  const angleIdx = Math.floor(i / POOLS.length) % pool.angles.length;
  const angle = pool.angles[angleIdx];
  const frame = FRAMES[frameIdx % FRAMES.length];
  const title = frame(angle).slice(0, 110);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  if (!seen.has(slug)) {
    seen.add(slug);
    out.push({
      topic: title,
      category: pool.category,
      tags: pool.tags.concat([angle.split(' ').slice(0, 2).join('-').toLowerCase()]),
      slug_hint: slug,
    });
  }
  i++;
  if (i % POOLS.length === 0) frameIdx++;
  if (i > 50000) break; // safety
}

if (out.length < targetCount) {
  // Fallback: cycle frames more aggressively until we hit 500.
  let f = FRAMES.length;
  while (out.length < targetCount) {
    const pool = POOLS[i % POOLS.length];
    const angleIdx = i % pool.angles.length;
    const angle = pool.angles[angleIdx];
    const title = `${cap(angle)} - Variation ${f}`.slice(0, 110);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push({ topic: title, category: pool.category, tags: pool.tags, slug_hint: slug });
    }
    i++;
    f++;
    if (i > 100000) break;
  }
}

const final = {
  generated_at: new Date().toISOString(),
  count: out.length,
  categories: CATEGORIES,
  topics: out,
};
fs.writeFileSync('src/data/topics-500.json', JSON.stringify(final, null, 2));
console.log(`[topics-500] wrote ${out.length} topics across ${CATEGORIES.length} categories`);
const byCat = {};
for (const t of out) byCat[t.category] = (byCat[t.category] || 0) + 1;
console.log('[topics-500] per category:', byCat);
