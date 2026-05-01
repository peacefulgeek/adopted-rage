// Per master-scope §14D — EEAT prompt fragment.
export function buildEEATPrompt(authorName, niche) {
  const credentialMap = {
    'The Oracle Lover': [
      'intuitive teacher with 20+ years of practice',
      'writer and oracle reader',
      'spiritual guide and longtime student of non-dual traditions',
    ],
    Kalesh: [
      'devotee and writer with three decades in contemplative practice',
      'spiritual writer and longtime student of Advaita Vedanta',
      'writer and meditation practitioner',
    ],
  };
  const credentials = credentialMap[authorName] || credentialMap['The Oracle Lover'];
  const cred = credentials[Math.floor(Math.random() * credentials.length)];
  const today = new Date().toISOString().split('T')[0];

  return `EEAT REQUIREMENTS (mandatory; missing any → regenerate):

1. TL;DR BLOCK at the very top of body, exactly:
   <section data-tldr="ai-overview" aria-label="In short">
     <p>Three sentences. Each at most 32 words. Declarative. No questions.
     No "this article will...". Lift-ready as a Google AI Overview citation.</p>
   </section>

2. SELF-REFERENCING LANGUAGE — at least one body sentence using one of:
   "In our experience writing about ${niche}...",
   "Across the dozens of articles we've published on this site...",
   "When I tested...", "Over the years I've seen...", "In my own practice...",
   "After years of working with seekers on this...".

3. INTERNAL LINKS — minimum 3, woven into prose with varied anchor text.
   Use the candidates supplied in HARD RULES.

4. EXTERNAL AUTHORITATIVE LINK — at least 1, to a .gov, .edu, NIH, CDC,
   WHO, Nature, ScienceDirect, or PubMed source. Format:
     <a href="https://www.nih.gov/..." target="_blank" rel="nofollow noopener">descriptive anchor</a>

5. LAST-UPDATED DATETIME — included inside the byline block (today: ${today}).

6. AUTHOR BYLINE BLOCK at the very bottom, exactly:
   <aside class="author-byline" data-eeat="author">
     <p><strong>Reviewed by ${authorName}</strong>, ${cred}.
     Last updated <time datetime="${today}">${today}</time>.</p>
     <p>One or two sentences of warm, self-referencing context.</p>
   </aside>`;
}
