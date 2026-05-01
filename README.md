# Adopted Rage — Site 87

> Adoption gave you a family. It also took something from you.

A trauma-informed, adoptee-voiced publication. Built to the master scope
(MASTER_SCOPE_AUDIT_AND_EXECUTE.md) with the Site-87 per-site overlay
(SCOPE-SITE-87-ADOPTION-FOG.md).

## What ships in this repo

- **Frontend** — Vite + React + TypeScript, Archetype B Grid, light warm
  watercolour palette (Fraunces display + DM Sans body), image-rich
  homepage, 60/40 article layout, mobile bottom tab bar.
- **Server** — Express SSR, www→apex 301 (registered as the very first
  middleware), AEO head injection on `/` and `/articles/:slug`, signed
  routes for `/healthz`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`,
  plus a JSON `/api/articles` and `/api/articles/:slug` for the SPA.
- **DeepSeek engine** — `src/lib/deepseek-generate.mjs`, hits
  `https://api.deepseek.com` via the OpenAI client (`OPENAI_API_KEY`,
  `OPENAI_BASE_URL`, `OPENAI_MODEL`). No `@anthropic-ai/sdk`. No
  `ANTHROPIC_API_KEY`. No fal.ai.
- **Quality gate** — `src/lib/article-quality-gate.mjs`. Union of every
  banned word/phrase from §12, ≥1500 words, EEAT signals, voice signals.
  Articles that fail are retried up to 4× before being dropped.
- **Sanitiser** — runs before the gate. Auto-replaces the most common
  AI-flagged words/phrases with safe synonyms and converts long-form
  negation into contractions. Keeps the gate strict, reduces retries.
- **Bunny CDN** — `src/lib/bunny.mjs`. Pulls images from the Bunny pull
  zone in production. Falls back to a stable pre-built CDN library while
  Bunny credentials are pending. Each launch article has a bespoke
  watercolour hero painted for it (`SLUG_HERO_MAP` + `HERO_BY_TOPIC_INDEX`).
- **Crons** — `src/cron/schedule.mjs`. Registers daily DeepSeek publish,
  daily image migration, weekly amazon-asin verify, monthly link-bot.
  Disabled unless `AUTO_GEN_ENABLED=true`.
- **Seed script** — `scripts/seed-launch-articles.mjs`. Idempotent.
  Backdates the 30 launch articles across 30 days so the site does not
  look like a one-day spam dump (which Google demotes for authority).
- **No images in repo** — `scripts/check-no-images.mjs` runs prebuild
  and rejects any image other than `client/public/favicon.svg`.

## Environment

The only required environment variables (per the per-site spec):

```
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-pro
AUTO_GEN_ENABLED=true
GH_PAT=...
```

Optional:

```
BUNNY_STORAGE_ZONE=...
BUNNY_API_KEY=...
BUNNY_PULL_ZONE=https://adopted-rage.b-cdn.net
PORT=3000
```

Everything else (site name, domain, author, ASIN tag, etc.) is
hardcoded in `src/lib/site-config.mjs` per master-scope §1.

## Local

```
pnpm install
pnpm dev          # Vite + Express middleware on :3000
pnpm build        # static + server bundle
pnpm start        # production server
pnpm seed         # generate + publish 30 launch articles
pnpm check-images # fail if any image other than favicon.svg lives in repo
pnpm verify       # /healthz, /robots, /sitemap, /llms, count check
```

## Deploy (DigitalOcean App Platform)

`.do/app.yaml` is configured for the `peacefulgeek/adopted-rage`
repo. Push, then DO picks up automatically. App envs come from the
DO dashboard, not the repo.

```
git remote add origin git@github.com:peacefulgeek/adopted-rage.git
git push -u origin main
```

(DNS apex + www → DO load balancer is set in DO Networking; the app
itself does www→apex 301 in Express middleware so the redirect chain
is one hop.)

## Bunny

Live. Storage zone `adopted-rage` (NY), pull zone
`https://adopted-rage.b-cdn.net`. All 30 launch heroes plus the generic
card library are uploaded as compressed WebP under `/heroes/*.webp` and
`/cards/*.webp`. Repo holds zero images except `client/public/favicon.svg`.
See `scripts/migrate-images-to-bunny.mjs` for the one-shot migration.

## Architecture decisions worth knowing

- **JSON DB, not Postgres.** Per master-scope §1 ("If it uses JSON
  files, adapt to JSON"). Same row shape as the §15B Postgres schema.
  Swap to `pg` later by replacing `src/lib/db.mjs` only — call sites
  are stable.
- **Vite plugin in dev mirrors prod.** Same Express handlers run in
  the dev preview as in the production build, so what you see is what
  ships.
- **Em-dashes are zero-tolerance everywhere.** Sanitiser strips them
  before the gate runs, gate would catch a leak.
- **Authority safety.** Articles are backdated across the past 30 days
  so the launch doesn't fingerprint as a one-day mass publish.

## §SITE 87 audit ↔ implementation map

| Scope item                   | File                                  |
|------------------------------|---------------------------------------|
| Site config / SITE constant  | `src/lib/site-config.mjs`             |
| Bunny library + bespoke map  | `src/lib/bunny.mjs`                   |
| DeepSeek client + sanitiser  | `src/lib/deepseek-generate.mjs`       |
| Quality gate                 | `src/lib/article-quality-gate.mjs`    |
| Voice spec / Oracle Lover    | `src/lib/voice-spec.mjs`              |
| EEAT prompt block            | `src/lib/eeat.mjs`                    |
| Hard rules prompt block      | `src/lib/hard-rules.mjs`              |
| Internal-link picker         | `src/lib/internal-links.mjs`          |
| ASIN matcher / verify        | `src/lib/match-products.mjs` + `amazon-verify.mjs` |
| Robots / sitemap / llms.txt  | `src/lib/feeds.mjs`                   |
| AEO meta + JSON-LD           | `src/lib/seo.mjs`                     |
| Cron handlers                | `src/cron/publish-article.mjs`        |
| Cron registration            | `src/cron/schedule.mjs`               |
| 30-topic plan                | `src/data/topics.json`                |
| ASIN catalog                 | `src/data/asin-pool.json`             |
| Verified ASINs               | `src/data/verified-asins.json`        |
| Launch seed                  | `scripts/seed-launch-articles.mjs`    |
| Image-in-repo guard          | `scripts/check-no-images.mjs`         |
| Deploy verifier              | `scripts/verify-deploy.mjs`           |
| DO app spec                  | `.do/app.yaml`                        |
