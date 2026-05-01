import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArticleSummary, categorySlug, fetchJson, getInitialState, formatDate } from "@/lib/state";
import { Search } from "lucide-react";

export default function Library() {
  const init = getInitialState();
  const [articles, setArticles] = useState<ArticleSummary[]>(init.articles || []);
  const [loading, setLoading] = useState(!init.articles);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson<{ articles: ArticleSummary[] }>("/api/articles?limit=500");
        if (!cancelled) setArticles(data.articles || []);
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return articles;
    return articles.filter((a) =>
      a.title.toLowerCase().includes(t) ||
      (a.meta_description || "").toLowerCase().includes(t) ||
      (a.category || "").toLowerCase().includes(t) ||
      (a.tags || []).some((x) => x.toLowerCase().includes(t))
    );
  }, [articles, q]);

  const grouped = useMemo(() => {
    const m: Record<string, ArticleSummary[]> = {};
    for (const a of filtered) {
      const c = a.category || "Other";
      (m[c] ||= []).push(a);
    }
    return m;
  }, [filtered]);

  return (
    <div>
      <header className="border-b border-border bg-[var(--paper)]">
        <div className="container py-12 md:py-16 max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">Adoptee Library</div>
          <h1 className="text-4xl md:text-5xl font-medium" style={{ fontFamily: "var(--font-display)" }}>
            Every piece, gently sorted.
          </h1>
          <div className="mt-6 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the library…"
              className="w-full pl-10 pr-4 py-3 rounded-full bg-card border border-border outline-none focus:ring-2 focus:ring-[var(--teal)]"
            />
          </div>
        </div>
      </header>

      <section className="container py-10 md:py-14">
        {loading && <div className="text-muted-foreground">Loading the library…</div>}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-medium" style={{ fontFamily: "var(--font-display)" }}>{cat}</h2>
              <Link href={`/category/${categorySlug(cat)}`} className="text-sm text-[var(--teal)] hover:text-[var(--clay)]">
                See all →
              </Link>
            </div>
            <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border overflow-hidden">
              {items.map((a) => (
                <li key={a.slug}>
                  <Link href={`/articles/${a.slug}`} className="flex items-center gap-4 p-4 hover:bg-[var(--cream)]">
                    {a.hero_url && (
                      <img src={a.hero_url} alt="" loading="lazy" className="w-16 h-16 rounded-lg object-cover ring-1 ring-border shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{a.title}</div>
                      <div className="text-[12px] text-muted-foreground">{formatDate(a.published_at)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-muted-foreground text-center py-20">No pieces yet match that search.</div>
        )}
      </section>
    </div>
  );
}
