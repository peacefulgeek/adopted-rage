export default function Disclosures() {
  return (
    <div className="container max-w-3xl py-12 md:py-20">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Disclosures</div>
      <h1 className="text-4xl md:text-5xl font-medium mb-6" style={{ fontFamily: "var(--font-display)" }}>How we make money (and how we don't).</h1>
      <div className="prose-article">
        <h2>Affiliate links</h2>
        <p>
          Adopted Rage is a participant in the Amazon Services LLC Associates Program. When we recommend a book or tool, the link points to Amazon with our affiliate tag. If you buy something via that link, we may earn a small commission at no additional cost to you.
        </p>
        <p>
          We only recommend things we'd put in the hands of another adoptee. We do not accept paid placements. We do not write sponsored posts. If a recommendation ever appears that we wouldn't stand behind, please <a href="/contact">tell us</a>.
        </p>
        <h2>No medical or therapeutic advice</h2>
        <p>
          Nothing on this site is medical or therapeutic advice. The writing here is reflection and company, not treatment. If you're in crisis, please contact a qualified professional or, in the U.S., call or text 988.
        </p>
        <h2>AI use</h2>
        <p>
          Drafts are written with the assistance of large language models, then edited and held by The Oracle Lover, who is an adoptee. Every published piece has been read end-to-end by a human before it goes live, and no piece ships unless it passes our quality gate (which strips clinical jargon and performative phrasing).
        </p>
      </div>
    </div>
  );
}
