import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArticleSummary, categorySlug, fetchJson, formatDate, getInitialState, readingTime } from "@/lib/state";
import { ArrowRight } from "lucide-react";

const HERO_IMG = "https://adopted-rage.b-cdn.net/heroes/af-hero-fog.webp";

export default function Home() {
  const init = getInitialState();
  const [articles, setArticles] = useState<ArticleSummary[]>(init.articles || []);
  const [cats, setCats] = useState<string[]>(init.cats || []);
  const [loading, setLoading] = useState(!init.articles);

  useEffect(() => {
    if (init.articles && init.articles.length) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson<{ articles: ArticleSummary[]; categories: string[] }>(
          "/api/articles?limit=60"
        );
        if (!cancelled) {
          setArticles(data.articles || []);
          setCats(data.categories || []);
        }
      } catch (e) {
        // silent — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div>
      {/* HERO ,  asymmetric, image-rich */}
      <section className="relative overflow-hidden">
        {/* Soft cream wash backdrop */}
        <div className="absolute inset-0 -z-20 bg-[var(--paper)]" />
        {/* Hand-painted texture seam at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[var(--background)] -z-10" />
        <div className="container py-12 md:py-20">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            {/* Copy column */}
            <div className="md:col-span-7 order-2 md:order-1">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--teal)] bg-[var(--cream)] px-3 py-1 rounded-full ring-1 ring-[var(--teal-soft)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--clay)]" />
                For adoptees, by adoptees
              </div>
              <h1
                className="mt-5 text-4xl md:text-6xl leading-[1.04] font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Adoption gave you a family.{" "}
                <span className="text-[var(--clay)]">
                  It also took something from you.
                </span>
              </h1>
              <p className="mt-5 text-lg md:text-xl text-foreground/80 max-w-xl">
                Adopted Rage names the parts no one else names: primal
                wound, identity confusion, reunion, late discovery,
                transracial adoption. We walk beside you through the long,
                quiet work of healing.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={featured ? `/articles/${featured.slug}` : "/library"}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--foreground)] text-white hover:bg-[var(--clay)] transition"
                >
                  Start reading <ArrowRight size={16} />
                </Link>
                <Link
                  href="/toolkit"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/80 backdrop-blur ring-1 ring-border hover:bg-white"
                >
                  The Adoptee’s Toolkit
                </Link>
              </div>
              {/* Trust micro-row */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-foreground/55">
                <span>Written by an adoptee</span>
                <span className="w-1 h-1 rounded-full bg-foreground/30" />
                <span>No gratitude scripts</span>
                <span className="w-1 h-1 rounded-full bg-foreground/30" />
                <span>Trauma-informed</span>
              </div>
            </div>
            {/* Image column ,  beautiful watercolour, large */}
            <div className="md:col-span-5 order-1 md:order-2">
              <div className="relative">
                <div className="absolute -inset-4 -z-10 bg-[var(--cream)] rounded-[36px] rotate-1 opacity-70" />
                <div className="absolute -inset-1 -z-10 bg-[var(--teal-soft)]/25 rounded-[28px] -rotate-1" />
                <img
                  src={HERO_IMG}
                  alt="A soft watercolour of a misty meadow at dawn, the path ahead just visible."
                  loading="eager"
                  className="w-full aspect-[4/5] object-cover rounded-[24px] deckle shadow-[0_30px_80px_-30px_rgba(46,50,57,0.25)]"
                />
                {/* Floating tag */}
                <div className="absolute -bottom-4 -left-4 md:-left-6 bg-white px-4 py-3 rounded-2xl ring-1 ring-border shadow-lg max-w-[220px]">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--teal)]">In short</div>
                  <div className="text-sm text-foreground/85 mt-1 leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                    You’re not too sensitive. The wound is real.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY PILLS */}
      {cats.length > 0 && (
        <section className="container -mt-2 md:mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {cats.map((c) => (
              <Link key={c} href={`/category/${categorySlug(c)}`} className="toc-pill">
                {c}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FEATURED + MASONRY */}
      <section className="container py-10 md:py-16">
        {loading && (
          <div className="text-center py-20 text-muted-foreground">Gathering the latest pieces…</div>
        )}

        {featured && (
          <Link href={`/articles/${featured.slug}`} className="group block mb-12">
            <article className="grid md:grid-cols-2 gap-6 md:gap-10 items-stretch">
              <div className="relative aspect-[4/3] md:aspect-auto rounded-2xl overflow-hidden bg-[var(--cream)] ring-1 ring-border">
                <img
                  src={featured.hero_url}
                  alt={featured.title}
                  loading="eager"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <span className="absolute top-3 left-3 inline-block bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide uppercase text-[var(--teal)]">
                  Featured
                </span>
              </div>
              <div className="flex flex-col justify-center">
                {featured.category && (
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--clay)] mb-2">
                    {featured.category}
                  </div>
                )}
                <h2 className="text-3xl md:text-4xl leading-tight font-medium mb-3 group-hover:text-[var(--clay)] transition" style={{ fontFamily: "var(--font-display)" }}>
                  {featured.title}
                </h2>
                <p className="text-foreground/75 mb-4">{featured.meta_description}</p>
                <div className="text-xs text-muted-foreground">
                  {formatDate(featured.published_at)} · {readingTime(featured.word_count)}
                </div>
              </div>
            </article>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="masonry">
            {rest.map((a) => <Card key={a.slug} a={a} />)}
          </div>
        )}

        {!loading && !articles.length && (
          <EmptyState />
        )}
      </section>

      {/* CALM PROMISE BAND */}
      <section className="border-y border-border bg-[var(--paper)]">
        <div className="container py-12 md:py-16 grid md:grid-cols-3 gap-8">
          {[
            { t: "Named, not numbed", d: "We don’t soften what adoption took. We give it language so you can carry it lighter." },
            { t: "Written by an adoptee", d: "Every piece is held by The Oracle Lover: felt-sense first, research-grounded second." },
            { t: "No shame, no spin", d: "No ‘rainbows’, no ‘gotcha day’ marketing. Just the truth, in warm clay and quiet teal." },
          ].map((p) => (
            <div key={p.t}>
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--teal)] mb-2">{p.t}</div>
              <p className="text-foreground/85">{p.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({ a }: { a: ArticleSummary }) {
  return (
    <Link href={`/articles/${a.slug}`} className="group block">
      <article className="bg-card rounded-2xl overflow-hidden ring-1 ring-border hover:ring-[var(--teal)] transition shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:shadow-[0_8px_28px_-12px_rgba(46,50,57,0.18)]">
        {a.hero_url && (
          <div className="aspect-[4/3] overflow-hidden bg-[var(--cream)]">
            <img
              src={a.hero_url}
              alt={a.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          </div>
        )}
        <div className="p-5">
          {a.category && (
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--clay)] mb-1.5">
              {a.category}
            </div>
          )}
          <h3 className="text-xl leading-snug font-medium mb-2 group-hover:text-[var(--teal)] transition" style={{ fontFamily: "var(--font-display)" }}>
            {a.title}
          </h3>
          {a.meta_description && (
            <p className="text-sm text-foreground/70 line-clamp-3">{a.meta_description}</p>
          )}
          <div className="mt-3 text-[11px] text-muted-foreground">
            {formatDate(a.published_at)} · {readingTime(a.word_count)}
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 max-w-md mx-auto">
      <div className="text-2xl mb-2" style={{ fontFamily: "var(--font-display)" }}>The fog is gathering.</div>
      <p className="text-muted-foreground">
        New pieces will appear here as they’re written. Check back tomorrow. There will be more.
      </p>
    </div>
  );
}
