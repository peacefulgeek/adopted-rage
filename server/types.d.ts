// Ambient module declarations for the .mjs lib code so TypeScript stops
// complaining without forcing us to write full type files.
// Note: per-path module declarations below override this fallback.
// We intentionally avoid `export = anything` because TS treats specific
// path declarations as separate modules anyway.
declare module "../src/lib/site-config.mjs" {
  export const SITE: any;
  export const BUNNY: any;
  export const PALETTE: any;
}
declare module "../src/lib/db.mjs" {
  export function listPublished(args?: { limit?: number; offset?: number; category?: string; q?: string }): Promise<any[]>;
  export function listAllPublishedForFeed(): Promise<any[]>;
  export function listQueued(args?: any): Promise<any[]>;
  export function getBySlug(slug: string): Promise<any | null>;
  export function getCategories(): Promise<string[]>;
  export function countByStatus(): Promise<{ queued: number; published: number }>;
  export function countPublished(): Promise<number>;
  export function insertPublished(article: any): Promise<void>;
  export function insertQueued(article: any): Promise<boolean>;
  export function publishQueued(id: number, heroUrl: string): Promise<any>;
  export function updateBody(id: number, patch: any): Promise<any>;
  export function reload(): Promise<any>;
}
declare module "../src/lib/seo.mjs" {
  export function homeHead(): string;
  export function articleHead(article: any): string;
  export function slugifyCategory(c: string): string;
}
declare module "../src/lib/feeds.mjs" {
  export function robotsTxt(): string;
  export function sitemapXml(): Promise<string>;
  export function rssXml(): Promise<string>;
  export function llmsTxt(): Promise<string>;
}
declare module "../src/cron/schedule.mjs" {
  export function registerCrons(): void;
}
