/* Remedies — 200+ herbs, TCM formulas, supplements, oils, flower essences.
 * Hand-curated for adoptee body-work. Three sentences each, in Oracle Lover voice.
 * Affiliate tag: spankyspinola-20.
 * Images: per-tradition watercolor cards on Bunny CDN.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, X, ExternalLink } from "lucide-react";
import {
  REMEDIES,
  TRADITIONS,
  PURPOSES,
  AMAZON_TAG,
  type Tradition,
  type Purpose,
} from "@/data/remedies";

const BUNNY = "https://adopted-rage.b-cdn.net/remedies";
/** One illustrative watercolor per tradition. Single small webp shared across many entries
 *  (per spec: aligned with site design + stored as compressed webp on Bunny). */
const TRADITION_IMG: Record<string, string> = {
  "Western Herb": `${BUNNY}/tradition-western-herb.webp`,
  "TCM Formula": `${BUNNY}/tradition-tcm-formula.webp`,
  "TCM Single Herb": `${BUNNY}/tradition-tcm-herb.webp`,
  "Ayurveda": `${BUNNY}/tradition-ayurveda.webp`,
  "Vitamin / Mineral": `${BUNNY}/tradition-vitamin.webp`,
  "Amino Acid / Adaptogen": `${BUNNY}/tradition-adaptogen.webp`,
  "Essential Oil": `${BUNNY}/tradition-essential-oil.webp`,
  "Flower Essence": `${BUNNY}/tradition-flower-essence.webp`,
  "Mushroom": `${BUNNY}/tradition-mushroom.webp`,
  "Mineral / Salt": `${BUNNY}/tradition-mineral-salt.webp`,
};

function amazonUrl(asin: string) {
  return `https://www.amazon.com/dp/${asin}/?tag=${AMAZON_TAG}`;
}

export default function Remedies() {
  const [tradition, setTradition] = useState<Tradition | "All">("All");
  const [purpose, setPurpose] = useState<Purpose | "All">("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return REMEDIES.filter((r) => {
      if (tradition !== "All" && r.tradition !== tradition) return false;
      if (purpose !== "All" && !r.purposes.includes(purpose)) return false;
      if (
        ql &&
        !(
          r.name.toLowerCase().includes(ql) ||
          r.brand.toLowerCase().includes(ql) ||
          r.body.toLowerCase().includes(ql) ||
          r.tradition.toLowerCase().includes(ql)
        )
      )
        return false;
      return true;
    });
  }, [tradition, purpose, q]);

  return (
    <div>
      {/* Header */}
      <header className="border-b border-border bg-[var(--paper)]">
        <div className="container py-12 md:py-16 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">
            Herbs · TCM · Supplements
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            A library of <span className="text-[var(--clay)]">{REMEDIES.length} allies</span>
            <br />for the adoptee body.
          </h1>
          <p className="text-foreground/75 mt-5 text-lg leading-relaxed">
            Western herbs, TCM formulas, Ayurvedic roots, vitamins, minerals,
            essential oils, mushrooms, and flower essences. Each one is here because
            adoptee bodies, with their old vigilance and unspoken grief, often respond
            to it.
          </p>
          <p className="text-foreground/60 mt-4 text-sm leading-relaxed">
            None of this is medical advice. Talk with your prescriber before starting
            anything new, especially if you take medications. Affiliate links use the
            spankyspinola-20 tag, your purchase helps fund this work at no extra cost
            to you.
          </p>
        </div>
      </header>

      {/* Filters */}
      <section className="container py-8 md:py-10 sticky top-[57px] md:top-[65px] z-20 bg-[var(--background)]/85 backdrop-blur-md border-b border-border">
        <div className="flex flex-col gap-4 max-w-5xl">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, brand, purpose, or what you're feeling..."
              className="w-full bg-card border border-border rounded-xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)] transition"
            />
            {q && (
              <button
                aria-label="Clear search"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Purpose chips */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-foreground/60 mb-2">
              Filter by purpose
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={purpose === "All"} onClick={() => setPurpose("All")}>
                All purposes
              </Chip>
              {PURPOSES.map((p) => (
                <Chip key={p} active={purpose === p} onClick={() => setPurpose(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </div>

          {/* Tradition chips */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-foreground/60 mb-2">
              Filter by tradition
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip active={tradition === "All"} onClick={() => setTradition("All")}>
                All traditions
              </Chip>
              {TRADITIONS.map((t) => (
                <Chip key={t} active={tradition === t} onClick={() => setTradition(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>

          <div className="text-xs text-foreground/55">
            Showing {filtered.length} of {REMEDIES.length} allies
            {tradition !== "All" || purpose !== "All" || q ? (
              <button
                onClick={() => {
                  setTradition("All");
                  setPurpose("All");
                  setQ("");
                }}
                className="ml-3 underline hover:text-[var(--teal)]"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container py-10">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-card ring-1 ring-border p-10 text-center">
            <div className="text-foreground/65 text-sm mb-3">
              Nothing matches your filters yet.
            </div>
            <button
              className="text-sm text-[var(--teal)] underline"
              onClick={() => {
                setTradition("All");
                setPurpose("All");
                setQ("");
              }}
            >
              Reset and start over
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((r) => (
              <RemedyCard key={r.slug} r={r} />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-14 max-w-2xl mx-auto text-center">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">
            On herbs and the body
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed">
            These notes describe traditional and contemporary uses, not medical
            prescriptions. If you take prescription medications (especially SSRIs,
            blood thinners, or thyroid meds), check with your prescriber before adding
            any new herb or supplement. Some plants interact with medications in
            meaningful ways. Body wisdom and good information together, always.
          </p>
          <p className="text-xs text-foreground/55 mt-4">
            All product links use the spankyspinola-20 Amazon Associates tag. As an
            Amazon Associate, this site earns from qualifying purchases at no extra
            cost to you. See our <Link href="/disclosures" className="underline hover:text-[var(--teal)]">Disclosures</Link> for full details.
          </p>
        </div>
      </section>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        active
          ? "bg-[var(--teal)] text-white border-[var(--teal)]"
          : "bg-card text-foreground/70 border-border hover:border-[var(--teal)]"
      }`}
    >
      {children}
    </button>
  );
}

function RemedyCard({ r }: { r: { slug: string; name: string; brand: string; asin: string; tradition: string; purposes: string[]; body: string } }) {
  const img = TRADITION_IMG[r.tradition];
  return (
    <article
      id={r.slug}
      className="group rounded-2xl bg-card ring-1 ring-border overflow-hidden flex flex-col hover:ring-[var(--teal)] transition"
    >
      {/* Image strip */}
      <div className="relative h-32 overflow-hidden bg-[var(--cream)]">
        {img ? (
          <img
            src={img}
            alt={`${r.tradition} watercolor illustration`}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--teal-soft)] to-[var(--clay-soft)]" />
        )}
        <div className="absolute top-2 left-2 bg-white/85 backdrop-blur px-2 py-1 rounded text-[10px] uppercase tracking-[0.12em] text-foreground/80">
          {r.tradition}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3
          className="text-lg font-medium leading-snug mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {r.name}
        </h3>
        <div className="text-[11px] uppercase tracking-[0.14em] text-foreground/55 mb-3">
          {r.brand}
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed flex-1">{r.body}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {r.purposes.map((p) => (
            <span
              key={p}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--teal-soft)] text-foreground/75"
            >
              {p}
            </span>
          ))}
        </div>

        <a
          href={amazonUrl(r.asin)}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="mt-4 inline-flex items-center justify-between text-xs text-[var(--teal)] hover:text-[var(--clay)] transition border-t border-border pt-3"
        >
          <span className="underline underline-offset-2">View on Amazon</span>
          <ExternalLink size={12} className="opacity-60" />
        </a>
      </div>
    </article>
  );
}
