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
