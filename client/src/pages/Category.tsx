import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArticleSummary, fetchJson, formatDate, getInitialState, readingTime } from "@/lib/state";

export default function Category() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug || "";
  const init = getInitialState();
  const [articles, setArticles] = useState<ArticleSummary[]>(init.articles || []);
  const [name, setName] = useState<string>(init.category || prettify(slug));
  const [loading, setLoading] = useState(!init.articles);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchJson<{ articles: ArticleSummary[]; category: string }>(
          `/api/articles?category=${encodeURIComponent(slug)}&limit=120`
        );
        if (!cancelled) {
          setArticles(data.articles || []);
          if (data.category) setName(data.category);
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div>
      <header className="border-b border-border bg-[var(--paper)]">
        <div className="container py-12 md:py-16">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Category</div>
          <h1 className="text-4xl md:text-5xl font-medium" style={{ fontFamily: "var(--font-display)" }}>{name}</h1>
        </div>
      </header>
      <section className="container py-10 md:py-14">
        {loading && <div className="text-muted-foreground">Loading…</div>}
        {!loading && articles.length === 0 && (
          <div className="text-muted-foreground">No pieces here yet. They're coming.</div>
        )}
        <div className="masonry">
          {articles.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="group block">
              <article className="bg-card rounded-2xl overflow-hidden ring-1 ring-border hover:ring-[var(--teal)] transition">
                {a.hero_url && (
                  <div className="aspect-[4/3] overflow-hidden bg-[var(--cream)]">
                    <img src={a.hero_url} alt={a.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-xl leading-snug font-medium mb-2 group-hover:text-[var(--teal)]" style={{ fontFamily: "var(--font-display)" }}>{a.title}</h3>
                  {a.meta_description && <p className="text-sm text-foreground/70 line-clamp-3">{a.meta_description}</p>}
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    {formatDate(a.published_at)} · {readingTime(a.word_count)}
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function prettify(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
