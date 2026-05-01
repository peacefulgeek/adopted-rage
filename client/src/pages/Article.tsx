import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArticleFull, ArticleSummary, fetchJson, formatDate, getInitialState, readingTime } from "@/lib/state";
import { Bookmark, Share2 } from "lucide-react";

export default function Article() {
  const [, params] = useRoute("/articles/:slug");
  const slug = params?.slug || "";
  const init = getInitialState();
  const [article, setArticle] = useState<ArticleFull | undefined>(
    init.article && init.article.slug === slug ? init.article : undefined
  );
  const [related, setRelated] = useState<ArticleSummary[]>(init.related || []);
  const [loading, setLoading] = useState(!article);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (article && article.slug === slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchJson<{ article: ArticleFull; related: ArticleSummary[] }>(
          `/api/articles/${slug}`
        );
        if (!cancelled) {
          setArticle(data.article);
          setRelated(data.related || []);
        }
      } catch {
        // 404-ish handled by missing render
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const headings = useMemo(() => {
    if (!article?.body) return [] as { id: string; text: string }[];
    const out: { id: string; text: string }[] = [];
    const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(article.body))) {
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      out.push({ id, text });
    }
    return out;
  }, [article?.body]);

  const bodyHtml = useMemo(() => {
    if (!article?.body) return "";
    let i = 0;
    return article.body.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_full, attrs, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `h-${i++}`;
      return `<h2 id="${id}"${attrs}>${inner}</h2>`;
    });
  }, [article?.body]);

  // Scroll-spy
  useEffect(() => {
    if (typeof window === "undefined" || headings.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveId((e.target as HTMLElement).id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [headings]);

  if (loading && !article) return <div className="container py-24 text-center text-muted-foreground">Reading…</div>;
  if (!article) return <div className="container py-24 text-center">
    <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>This page hasn't been written yet.</h1>
    <Link href="/" className="underline">Back home</Link>
  </div>;

  return (
    <div>
      {/* Hero */}
      <header className="border-b border-border bg-[var(--paper)]">
        <div className="container py-10 md:py-14 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            {article.category && (
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--clay)] mb-3">{article.category}</div>
            )}
            <h1 className="text-3xl md:text-5xl leading-tight font-medium" style={{ fontFamily: "var(--font-display)" }}>
              {article.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>By <a className="underline hover:text-foreground" href="https://theoraclelover.com" target="_blank" rel="noopener">{article.author || "The Oracle Lover"}</a></span>
              <span>·</span>
              <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
              <span>·</span>
              <span>{readingTime(article.word_count)}</span>
            </div>
          </div>
          {article.hero_url && (
            <div className="aspect-[4/3] rounded-2xl overflow-hidden ring-1 ring-border bg-[var(--cream)]">
              <img src={article.hero_url} alt={article.image_alt || article.title} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </header>

      {/* Pill TOC */}
      {headings.length > 1 && (
        <div className="sticky top-[57px] md:top-[65px] z-30 bg-[oklch(0.96_0.013_70/_0.92)] backdrop-blur border-b border-border">
          <div className="container py-2 flex gap-2 overflow-x-auto">
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                aria-current={activeId === h.id ? "true" : undefined}
                className="toc-pill"
              >
                {h.text}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Body 60/40 */}
      <div className="container py-10 md:py-14 grid md:grid-cols-[1fr_280px] gap-10 lg:gap-14">
        <article
          className="prose-article"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
        <aside className="hidden md:block">
          <div className="sticky top-32 space-y-6">
            <div className="rounded-2xl border border-border bg-[var(--paper)] p-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--teal)] mb-2">Held by</div>
              <div className="font-display text-lg" style={{ fontFamily: "var(--font-display)" }}>The Oracle Lover</div>
              <p className="text-sm text-muted-foreground mt-1">An adoptee writing for adoptees. No fluff. No fixing. Just company.</p>
              <a className="text-sm underline mt-3 inline-block hover:text-[var(--clay)]" href="https://theoraclelover.com" target="_blank" rel="noopener">theoraclelover.com</a>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--clay)] mb-3">Carry this with you</div>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-[var(--cream)]">
                  <Bookmark size={13} /> Save
                </button>
                <button
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-[var(--cream)]"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && (navigator as any).share) {
                      (navigator as any).share({ title: article.title, url: window.location.href });
                    } else if (typeof navigator !== "undefined") {
                      navigator.clipboard?.writeText(window.location.href);
                    }
                  }}
                >
                  <Share2 size={13} /> Share
                </button>
              </div>
            </div>
            {related.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--teal)] mb-3">Related pieces</div>
                <ul className="space-y-3">
                  {related.slice(0, 4).map((r) => (
                    <li key={r.slug}>
                      <Link href={`/articles/${r.slug}`} className="text-sm hover:text-[var(--clay)]">
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile related */}
      {related.length > 0 && (
        <section className="md:hidden container pb-12">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--teal)] mb-3">Related pieces</div>
          <ul className="space-y-3">
            {related.slice(0, 4).map((r) => (
              <li key={r.slug}>
                <Link href={`/articles/${r.slug}`} className="text-base hover:text-[var(--clay)]">{r.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
