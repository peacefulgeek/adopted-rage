export default function Author() {
  return (
    <div className="container max-w-3xl py-12 md:py-20">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Author</div>
      <h1 className="text-4xl md:text-5xl font-medium mb-3" style={{ fontFamily: "var(--font-display)" }}>The Oracle Lover</h1>
      <p className="text-lg text-foreground/80 mb-8">An adoptee, writing for adoptees. Felt-sense first, research-grounded second.</p>
      <div className="prose-article">
        <p>
          The Oracle Lover is the pen name behind every piece on Adopted Rage. The work here is rooted in lived adoptee experience and informed by the foundational literature of the field — Nancy Verrier's <em>The Primal Wound</em>, Joe Soll's reunion work, B.J. Lifton's writings on identity, the Donaldson Adoption Institute's research on transracial adoption, and the growing body of work by adoptee scholars and therapists.
        </p>
        <p>
          You can read more across <a href="https://theoraclelover.com" target="_blank" rel="noopener">theoraclelover.com</a>, where the wider body of writing — beyond adoption — lives.
        </p>
        <h2>How the writing happens</h2>
        <p>
          Each piece on Adopted Rage is drafted, then run through a quality gate that strips out clinical jargon, performative gratitude, and recovery-industry clichés. What's left has to be true to read out loud, slowly, to another adoptee.
        </p>
      </div>
    </div>
  );
}
