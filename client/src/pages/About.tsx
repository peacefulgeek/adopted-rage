export default function About() {
  return (
    <div className="container max-w-3xl py-12 md:py-20">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">About</div>
      <h1 className="text-4xl md:text-5xl font-medium mb-6" style={{ fontFamily: "var(--font-display)" }}>
        We name what adoption took.
      </h1>
      <div className="prose-article">
        <p>
          Adopted Rage is a quiet, image-rich library for adoptees. It exists because almost every other adoption resource is written for the people around the adoptee — adoptive parents, agencies, well-meaning strangers — and almost none is written for <em>us</em>.
        </p>
        <p>
          The work here is held by <a href="https://theoraclelover.com" target="_blank" rel="noopener">The Oracle Lover</a>, an adoptee, who writes felt-sense first and research-grounded second. We use the language of <em>primal wound</em>, <em>identity confusion</em>, <em>reunion re-wounding</em>, <em>late-discovery</em>, and <em>transracial mirror loss</em> — not because they're trendy, but because they're true.
        </p>
        <h2>What you'll find here</h2>
        <p>
          Long, slow pieces about the parts no one else names. A growing toolkit. A library of further reading. Occasional links to books we trust on Amazon (we may earn a small commission — see our <a href="/disclosures">disclosures</a>). No pop-ups, no upsells, no shame.
        </p>
        <h2>What you won't find</h2>
        <p>
          You won't find rainbows-and-gotcha-day marketing. You won't find anyone telling you to "focus on the positives." You won't find advice that asks you to perform gratitude.
        </p>
        <p>
          You'll find company. <a href="/library">Start in the library</a>, or <a href="/toolkit">open the toolkit</a>.
        </p>
      </div>
    </div>
  );
}
