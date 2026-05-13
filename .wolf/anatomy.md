# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-05-13T20:11:59.327Z
> Files: 12 tracked | Anatomy hits: 0 | Misses: 0

## ./

- `CLAUDE.md` — OpenWolf (~57 tok)
- `ideascope.html` — IdeaScope — محلل الأسواق (~34654 tok)
- `package.json` — Node.js package manifest (~45 tok)
- `vercel.json` (~132 tok)

## .claude/

- `settings.json` (~441 tok)

## .claude/rules/

- `openwolf.md` (~313 tok)

## api/

- `research.js` — POST /api/research: runs all 4 collectors in parallel, caches 6h in Upstash Redis, returns {signals:{reddit,hackernews,productHunt,appStore}} (~644 tok)

## api/_lib/

- `appstore.js` — Fetches Apple App Store top-100 RSS for us/eg/sa, matches keywords, returns relatedCount + competitorStrength (~454 tok)
- `cache.js` — Upstash Redis wrapper (cacheGet/cacheSet); silently no-ops if UPSTASH_REDIS_REST_URL not set (~220 tok)
- `hackernews.js` — HN Algolia API search, last 6 months, returns storyCount/totalComments/avgPoints/interest (~352 tok)
- `producthunt.js` — Parses Product Hunt RSS feed, keyword-matches recent launches, returns relatedLaunches/saturation (~400 tok)
- `reddit.js` — Reddit JSON search (no auth), searches market-specific subreddits, extracts engagement + topKeywords (~916 tok)
