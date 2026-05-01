export default function Privacy() {
  return (
    <div className="container max-w-3xl py-12 md:py-20">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Privacy</div>
      <h1 className="text-4xl md:text-5xl font-medium mb-6" style={{ fontFamily: "var(--font-display)" }}>Privacy policy</h1>
      <div className="prose-article">
        <p>
          Adopted Rage does not run third-party advertising and does not place tracking cookies. We don't sell your data, because we don't collect it.
        </p>
        <h2>What we log</h2>
        <p>
          Our server keeps standard request logs (IP address, user agent, requested URL, timestamp) for operational and abuse-prevention purposes. These logs are rotated and not used for profiling.
        </p>
        <h2>Email</h2>
        <p>
          If you write to us through the <a href="/contact">contact form</a>, your email is delivered to a private inbox via Nodemailer. We don't add it to a list or share it.
        </p>
        <h2>Affiliate links</h2>
        <p>
          When you click an Amazon link from our pages, Amazon sets its own cookies under its own privacy policy. See our <a href="/disclosures">disclosures</a> for the affiliate relationship.
        </p>
      </div>
    </div>
  );
}
