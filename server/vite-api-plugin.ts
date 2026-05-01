// Dev-only Vite plugin: mounts the master-scope routes (api, robots, sitemap,
// llms, healthz) and per-route AEO head injection on top of Vite's HTML.
// In production, server/index.ts owns everything and Vite is not used.
import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

// @ts-ignore .mjs
import { SITE } from "../src/lib/site-config.mjs";
// @ts-ignore .mjs
import {
  listPublished,
  listAllPublishedForFeed,
  getBySlug,
  getCategories,
  countByStatus,
  reload,
} from "../src/lib/db.mjs";
// @ts-ignore .mjs
import { homeHead, articleHead, slugifyCategory } from "../src/lib/seo.mjs";
// @ts-ignore .mjs
import { robotsTxt, sitemapXml, rssXml, llmsTxt } from "../src/lib/feeds.mjs";

function send(res: ServerResponse, status: number, body: string, type = "text/plain") {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, obj: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

export default function manusScopeApiPlugin(): Plugin {
  return {
    name: "adoption-fog-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        try {
          const url = (req.url || "/").split("?")[0];
          const search = (req.url || "/").includes("?")
            ? (req.url || "").split("?")[1]
            : "";
          const params = new URLSearchParams(search);

          if (url === "/healthz" || url === "/health") {
            return sendJson(res, 200, {
              status: "ok",
              site: SITE.name,
              timestamp: new Date().toISOString(),
              env: "development",
            });
          }
          if (url === "/robots.txt") return send(res, 200, robotsTxt(), "text/plain");
          if (url === "/sitemap.xml") return send(res, 200, await sitemapXml(), "application/xml");
          if (url === "/feed.xml" || url === "/rss.xml")
            return send(res, 200, await rssXml(), "application/rss+xml");
          if (url === "/llms.txt" || url === "/llms-full.txt")
            return send(res, 200, await llmsTxt(), "text/markdown");

          if (url === "/api/articles") {
            const limit = Math.min(parseInt(params.get("limit") || "30", 10), 200);
            const offset = parseInt(params.get("offset") || "0", 10);
            const category = params.get("category") || undefined;
            const q = params.get("q") || undefined;
            const all = await getCategories();
            const cat = category
              ? all.find((c: string) => slugifyCategory(c) === category) || category
              : undefined;
            const rows = await listPublished({ limit, offset, category: cat, q } as any);
            return sendJson(res, 200, {
              site: SITE.name,
              count: rows.length,
              category: cat,
              categories: all,
              articles: rows.map((a: any) => ({
                slug: a.slug,
                title: a.title,
                category: a.category,
                tags: a.tags,
                published_at: a.published_at,
                last_modified_at: a.last_modified_at,
                hero_url: a.hero_url,
                meta_description: a.meta_description,
                word_count: a.word_count,
                author: a.author,
              })),
            });
          }

          const slugMatch = url.match(/^\/api\/articles\/([^/]+)$/);
          if (slugMatch) {
            const a = await getBySlug(slugMatch[1]);
            if (!a) return sendJson(res, 404, { error: "not_found" });
            const related = (await listPublished({ limit: 12, category: a.category } as any))
              .filter((x: any) => x.slug !== a.slug)
              .slice(0, 6);
            return sendJson(res, 200, { article: a, related });
          }

          if (url === "/api/categories") return sendJson(res, 200, { categories: await getCategories() });
          if (url === "/api/stats") return sendJson(res, 200, { site: SITE.name, ...(await countByStatus()) });
          if (url === "/api/reload") {
            await reload();
            return sendJson(res, 200, { reloaded: true });
          }
          if (url === "/api/contact" && req.method === "POST") {
            // Nodemailer wired in production; in dev just acknowledge.
            return sendJson(res, 200, { ok: true, dev: true });
          }
        } catch (e) {
          // Fall through to Vite's default error path.
          // eslint-disable-next-line no-console
          console.error("[api-plugin]", e);
        }
        next();
      });

      // Per-route AEO head injection — runs after Vite serves /index.html.
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = (req.url || "/").split("?")[0];
        const accept = (req.headers.accept || "") as string;
        const isHtmlRoute =
          (req.method === "GET" || !req.method) &&
          accept.includes("text/html") &&
          !url.startsWith("/@") &&
          !url.startsWith("/__manus__") &&
          !url.includes(".") &&
          !url.startsWith("/manus-storage");
        if (!isHtmlRoute) return next();

        try {
          let head = "";
          let initialState: any = { site: SITE.name, route: url };
          if (url === "/" || url === "") {
            head = homeHead();
            const list = await listPublished({ limit: 24 } as any);
            initialState.articles = list;
            initialState.cats = await getCategories();
          } else if (url.startsWith("/articles/")) {
            const slug = url.replace("/articles/", "").replace(/\/$/, "");
            const a = await getBySlug(slug);
            if (a) {
              head = articleHead(a);
              initialState.article = a;
              const related = (await listPublished({ limit: 12, category: a.category } as any))
                .filter((x: any) => x.slug !== a.slug)
                .slice(0, 6);
              initialState.related = related;
            }
          } else if (url.startsWith("/category/")) {
            const catSlug = url.replace("/category/", "").replace(/\/$/, "");
            const all = await getCategories();
            const cat = all.find((c: string) => slugifyCategory(c) === catSlug) || catSlug;
            const list = await listPublished({ limit: 60, category: cat } as any);
            initialState.category = cat;
            initialState.articles = list;
            initialState.cats = all;
            head = `<title>${cat} | ${SITE.name}</title><meta name="description" content="${SITE.name}: ${cat}.">`;
          }

          // Hand off to Vite's normal index.html pipeline first, then patch.
          const indexUrl = "/index.html";
          // Trigger Vite's HTML transform by reading index.html through Vite's transform.
          const tplRaw = await server.transformIndexHtml(
            req.url || "/",
            // @ts-ignore - Vite supports a fallback read via fs internally
            await readIndex(server)
          );
          const stateScript = `<script>window.__INITIAL_STATE__=${JSON.stringify(initialState).replace(
            /</g,
            "\\u003c"
          )};</script>`;
          const out = tplRaw.replace("</head>", `${head}\n${stateScript}\n</head>`);
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html");
          res.end(out);
        } catch (e) {
          console.error("[api-plugin html]", e);
          next();
        }
      });
    },
  };
}

async function readIndex(server: ViteDevServer): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const indexPath = path.resolve(server.config.root, "index.html");
  return fs.readFile(indexPath, "utf8");
}
