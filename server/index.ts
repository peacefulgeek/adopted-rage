// Master-scope §6 + §7 Express server, adapted for the webdev SPA build.
// Order matters: WWW->APEX 301 runs FIRST, before any other middleware.
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ESM .mjs imports — esbuild bundles these in (--bundle).
// @ts-ignore - JS module
import { SITE } from "../src/lib/site-config.mjs";
// @ts-ignore
import {
  listPublished,
  listAllPublishedForFeed,
  getBySlug,
  getCategories,
  countByStatus,
  reload,
} from "../src/lib/db.mjs";
// @ts-ignore
import { homeHead, articleHead, slugifyCategory } from "../src/lib/seo.mjs";
// @ts-ignore
import { robotsTxt, sitemapXml, rssXml, llmsTxt } from "../src/lib/feeds.mjs";
// @ts-ignore
import { registerCrons } from "../src/cron/schedule.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAFE_HOSTS = [
  "localhost",
  "127.0.0.1",
  ".manus.computer",
  ".manuspre.computer",
  ".manus-asia.computer",
  ".manusvm.computer",
  ".manuscomputer.ai",
  ".manus.space",
  ".ondigitalocean.app",
];

function isInternalPreviewHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0];
  if (SAFE_HOSTS.some((s) => (s.startsWith(".") ? h.endsWith(s) : h === s))) return true;
  return false;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // ─── 1. WWW → APEX (301), HTTPS preserving — FIRST middleware (per §7A) ───
  // Skipped on Manus/DO preview hosts so dev preview always works.
  app.use((req, res, next) => {
    const host = (req.headers.host || "").toLowerCase();
    if (host.startsWith("www.") && !isInternalPreviewHost(host)) {
      const apex = host.slice(4);
      const proto = (req.headers["x-forwarded-proto"] as string) || "https";
      return res.redirect(301, `${proto}://${apex}${req.originalUrl}`);
    }
    next();
  });

  // ─── 2. Health check (per §7B) ───
  app.get(["/healthz", "/health"], (_req, res) => {
    res.status(200).json({
      status: "ok",
      site: SITE.name,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV || "development",
    });
  });

  // ─── 3. SEO endpoints (per §17) ───
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(robotsTxt());
  });
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      res.type("application/xml").send(await sitemapXml());
    } catch (e) {
      next(e);
    }
  });
  app.get(["/feed.xml", "/rss.xml"], async (_req, res, next) => {
    try {
      res.type("application/rss+xml").send(await rssXml());
    } catch (e) {
      next(e);
    }
  });
  app.get(["/llms.txt", "/llms-full.txt"], async (_req, res, next) => {
    try {
      res.type("text/markdown").send(await llmsTxt());
    } catch (e) {
      next(e);
    }
  });

  // ─── 4. API routes ───
  app.get("/api/articles", async (req, res, next) => {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || "30", 10), 100);
      const offset = parseInt((req.query.offset as string) || "0", 10);
      const category = (req.query.category as string) || undefined;
      const q = (req.query.q as string) || undefined;
      const rows = await listPublished({ limit, offset, category, q } as any);
      res.json({
        site: SITE.name,
        count: rows.length,
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
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/articles/:slug", async (req, res, next) => {
    try {
      const a = await getBySlug(req.params.slug);
      if (!a) return res.status(404).json({ error: "not_found" });
      res.json(a);
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/categories", async (_req, res, next) => {
    try {
      res.json({ categories: await getCategories() });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/stats", async (_req, res, next) => {
    try {
      const c = await countByStatus();
      res.json({ site: SITE.name, ...c });
    } catch (e) {
      next(e);
    }
  });

  app.get("/api/reload", async (_req, res, next) => {
    try {
      await reload();
      res.json({ reloaded: true });
    } catch (e) {
      next(e);
    }
  });

  // ─── 5. Static files: dev vs production ───
  const isProd = process.env.NODE_ENV === "production";
  const staticPath = isProd
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

  // Read template HTML once (re-read in dev for hot-reload-ish behavior)
  let templateCache: string | null = null;
  function loadTemplate(): string {
    if (templateCache && isProd) return templateCache;
    const indexPath = path.join(staticPath, "index.html");
    try {
      const raw = fs.readFileSync(indexPath, "utf8");
      templateCache = raw;
      return raw;
    } catch {
      return `<!doctype html><html><head><title>${SITE.name}</title></head><body><div id="root"></div></body></html>`;
    }
  }

  // Serve static assets (JS/CSS/etc.). Index handled by SSR fallback so we
  // can inject per-route AEO head into the same shell.
  app.use(express.static(staticPath, { index: false, maxAge: isProd ? "1y" : 0 }));

  // ─── 6. SSR head-injection fallback for SPA routes ───
  app.get("*", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only handle GET HTML; everything else falls through.
      const acceptsHtml =
        (req.headers.accept || "").includes("text/html") ||
        req.path === "/" ||
        !req.path.includes(".");
      if (!acceptsHtml) return next();

      const tpl = loadTemplate();
      let head = "";
      let initialState: any = { site: SITE.name, route: req.path };
      let status = 200;

      if (req.path === "/" || req.path === "") {
        head = homeHead();
        const list = await listPublished({ limit: 24 });
        initialState.articles = list.map((a: any) => ({
          slug: a.slug,
          title: a.title,
          category: a.category,
          tags: a.tags,
          published_at: a.published_at,
          hero_url: a.hero_url,
          meta_description: a.meta_description,
        }));
        initialState.cats = await getCategories();
      } else if (req.path.startsWith("/articles/")) {
        const slug = req.path.replace("/articles/", "").replace(/\/$/, "");
        const a = await getBySlug(slug);
        if (!a) {
          status = 404;
          head = `<title>Not found | ${SITE.name}</title>`;
        } else {
          head = articleHead(a);
          initialState.article = a;
          // Related: same category, exclude self, top 6
          const related = (await listPublished({ limit: 12, category: a.category } as any))
            .filter((x: any) => x.slug !== a.slug)
            .slice(0, 6);
          initialState.related = related;
        }
      } else if (req.path.startsWith("/category/")) {
        const catSlug = req.path.replace("/category/", "").replace(/\/$/, "");
        const all = await getCategories();
        const cat =
          all.find((c: string) => slugifyCategory(c) === catSlug) || catSlug;
        const list = await listPublished({ limit: 60, category: cat } as any);
        initialState.category = cat;
        initialState.articles = list;
        initialState.cats = all;
        head = `<title>${cat} | ${SITE.name}</title><meta name="description" content="${SITE.name}: ${cat}.">`;
      } else if (req.path === "/about" || req.path === "/contact" ||
                 req.path === "/disclosures" || req.path === "/privacy" ||
                 req.path === "/author/the-oracle-lover" ||
                 req.path === "/toolkit" || req.path === "/library") {
        head = `<title>${pageTitle(req.path)} | ${SITE.name}</title><meta name="description" content="${SITE.description}">`;
      } else {
        // 404 SPA route
        status = req.path.startsWith("/articles/") ? 404 : 200;
      }

      const stateScript = `<script>window.__INITIAL_STATE__=${JSON.stringify(initialState).replace(
        /</g,
        "\\u003c"
      )};</script>`;
      const html = tpl.replace(
        "</head>",
        `${head}\n${stateScript}\n</head>`
      );
      res.status(status).type("html").send(html);
    } catch (e) {
      next(e);
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[server error]", err);
    res.status(500).type("text/plain").send("Internal Server Error");
  });

  const port = parseInt(String(process.env.PORT || 3000), 10);
  server.listen(port, () => {
    console.log(`[server] ${SITE.name} listening on http://localhost:${port}/  (NODE_ENV=${process.env.NODE_ENV || "development"})`);
  });

  // ─── 7. Register crons (AUTO_GEN_ENABLED gate inside) ───
  try {
    registerCrons();
  } catch (err) {
    console.error("[cron] registration failed:", err);
  }
}

function pageTitle(p: string) {
  switch (p) {
    case "/about": return "About";
    case "/contact": return "Contact";
    case "/disclosures": return "Disclosures";
    case "/privacy": return "Privacy";
    case "/author/the-oracle-lover": return "The Oracle Lover";
    case "/toolkit": return SITE.toolkit_name;
    case "/library": return SITE.bottom_section_name;
    default: return SITE.name;
  }
}

startServer().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
