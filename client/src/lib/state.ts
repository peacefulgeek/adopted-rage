// Initial state seeded by SSR head-injection (server/index.ts).
// On client, hydrate from window.__INITIAL_STATE__, then fall back to /api.
export type ArticleSummary = {
  slug: string;
  title: string;
  category?: string;
  tags?: string[];
  published_at?: string;
  hero_url?: string;
  meta_description?: string;
  word_count?: number;
  author?: string;
};

export type ArticleFull = ArticleSummary & {
  body: string;
  last_modified_at?: string;
  image_alt?: string;
  asins_used?: string[];
};

export type InitialState = {
  site?: string;
  route?: string;
  articles?: ArticleSummary[];
  cats?: string[];
  article?: ArticleFull;
  related?: ArticleSummary[];
  category?: string;
};

declare global {
  interface Window {
    __INITIAL_STATE__?: InitialState;
  }
}

export function getInitialState(): InitialState {
  if (typeof window === "undefined") return {};
  return window.__INITIAL_STATE__ || {};
}

export async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return (await r.json()) as T;
}

export function categorySlug(c: string): string {
  return c
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(s?: string): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return s.slice(0, 10);
  }
}

export function readingTime(words?: number): string {
  if (!words) return "";
  const min = Math.max(2, Math.round(words / 220));
  return `${min} min read`;
}
