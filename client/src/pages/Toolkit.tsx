import { Link } from "wouter";

const TOOLS = [
  { title: "The Felt-Sense Pause", body: "A 90-second body practice for when the fog rolls in. No words required.", href: "/articles/the-felt-sense-pause-when-the-fog-rolls-in" },
  { title: "The Reunion-Readiness Map", body: "Ten honest questions before you reach out, write the letter, or open the door.", href: "/articles/the-reunion-readiness-map-ten-honest-questions" },
  { title: "Mirror-Loss Inventory", body: "For transracial adoptees: a quiet inventory of where you have — and don't have — mirrors.", href: "/articles/transracial-adoption-and-mirror-loss-an-inventory" },
  { title: "Late-Discovery First-Steps", body: "If you found out late: the first seven days, in slow motion.", href: "/articles/late-discovery-the-first-seven-days-in-slow-motion" },
  { title: "The 'Should I Search?' Letter", body: "A letter to write to yourself before searching. Then read it again later.", href: "/articles/should-i-search-a-letter-to-yourself-first" },
  { title: "Boundaries Without Apology", body: "Sample language for adoptive family, birth family, and well-meaning strangers.", href: "/articles/adoptee-boundaries-language-without-apology" },
];

export default function Toolkit() {
  return (
    <div>
      <header className="border-b border-border bg-[var(--paper)]">
        <div className="container py-12 md:py-16 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">The Adoptee's Toolkit</div>
          <h1 className="text-4xl md:text-5xl font-medium" style={{ fontFamily: "var(--font-display)" }}>
            Small, portable practices for the long work.
          </h1>
          <p className="text-foreground/75 mt-4">
            None of this fixes anything. All of it makes the days easier to walk through.
          </p>
        </div>
      </header>
      <section className="container py-10 md:py-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TOOLS.map((t) => (
          <Link key={t.title} href={t.href} className="block group">
            <article className="rounded-2xl bg-card ring-1 ring-border p-6 hover:ring-[var(--teal)] transition h-full">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--teal)] mb-2">Practice</div>
              <h2 className="text-xl font-medium mb-2 group-hover:text-[var(--clay)]" style={{ fontFamily: "var(--font-display)" }}>{t.title}</h2>
              <p className="text-sm text-foreground/75">{t.body}</p>
            </article>
          </Link>
        ))}
      </section>
    </div>
  );
}
