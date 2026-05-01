# Adopted Rage — Remaining Work

## Currently in flight
- [ ] Seed completes for articles 25-30 (lockfile, foreground process)

## Rebrand
- [ ] Site name/title/brand → "Adopted Rage"
- [ ] Site URL → https://adoptedrage.com
- [ ] sitemap/robots/llms regenerate from new SITE
- [ ] Copy in hero/footer/about/header
- [ ] Repo dir name (keep adoption-fog locally; `pnpm` config OK; just rebrand at the SITE/UI level)

## Bunny migration
- [ ] Read storage zone: `adopted-rage`, password d1ff90b0-ec66-4a9b-86388372f50a-90af-4d7b, NY region
- [ ] Pull zone: adopted-rage.b-cdn.net
- [ ] Convert each /home/ubuntu/webdev-static-assets/af-hero-*.png to compressed WebP
- [ ] Upload to bunny via Storage API (PUT with AccessKey header)
- [ ] Update src/lib/bunny.mjs SLUG_HERO and FALLBACK_LIBRARY to point at adopted-rage.b-cdn.net/...
- [ ] Convert favicon.svg if needed (keep as svg per scope §5 exception)
- [ ] Delete /home/ubuntu/webdev-static-assets/af-hero-*.png after upload
- [ ] Run scripts/check-no-images.mjs to confirm zero binary images in repo

## New pages
- [ ] /assessments — 11 self-assessments (adoptee rage, primal wound, fog index, attachment, etc)
- [ ] /remedies — 50 supplements/herbs/TCM with verified ASINs + Amazon tag from per-site scope
- [ ] Add to nav + bottom tab bar + sitemap

## Push
- [ ] git init; remote = https://${GH_PAT}@github.com/peacefulgeek/adopted-rage.git OR ssh
- [ ] First commit; record SHA
- [ ] (User can attach DO + DNS later)

## §22 audit
- [ ] /healthz returns ok
- [ ] /robots.txt
- [ ] /sitemap.xml
- [ ] /llms.txt
- [ ] /api/articles count = 30
- [ ] published_at spread across ≥10 distinct dates
- [ ] crons registered (pre-commit log)
- [ ] gate trips on test banned word
- [ ] check-no-images passes
- [ ] no anthropic/fal in deps
- [ ] AMAZON_TAG present in product links

## §23 report
- [ ] Emit single block per spec


---

# Pre-Seed 500 Articles (One-Shot, Manus, NEVER scheduled)

## Phase 1 — Plan + threshold
- [ ] Build 500-topic plan (extends the 30) → `src/data/topics-500.json`
- [ ] Raise quality gate min_words to 1800 for this seed
- [ ] Confirm Oracle Lover voice spec is loaded into prompt

## Phase 2 — Generation (DeepSeek parallel)
- [ ] Generate ≥1800-word article per topic via DeepSeek V4-Pro
- [ ] EEAT enrich + sanitiser pass + quality gate
- [ ] Store as `status: "draft"` in `data/articles.json` (NOT published)

## Phase 3 — Images
- [ ] Generate 500 watercolor heroes (light, warm, never dark, per-topic alignment)
- [ ] Convert PNG→WebP via sharp (q≈75)
- [ ] Upload to Bunny `adopted-rage.b-cdn.net/queue/{slug}.webp`
- [ ] Patch each draft's `image_url`/`hero_url`
- [ ] Delete local source files (zero local images except favicon.svg)

## Phase 4 — Zero-Manus audit + ship
- [ ] No `manus.computer`, no `manus-storage`, no Manus CDN, no Manus runtime in repo
- [ ] Confirm crons in-code only (`node-cron` in `src/cron/schedule.mjs`)
- [ ] Confirm no Manus scheduled tasks for this site
- [ ] Push 500 drafts + image refs to `peacefulgeek/adopted-rage`
- [ ] Capture commit SHA, deliver §23 report


---

# ASIN Verification Pass (one-shot)

- [ ] Extract all 205 ASINs from `client/src/data/remedies.ts`
- [ ] Verify each ASIN returns 200 on `https://www.amazon.com/dp/{ASIN}`
- [ ] For any 404/non-product responses, search Amazon for replacement matching name+brand
- [ ] Update remedies.ts with verified ASINs (mark `verified: true`, add timestamp)
- [ ] Re-verify post-replacement
- [ ] Commit + push to peacefulgeek/adopted-rage
