# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-05-13

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

## Key Learnings

- **Project:** ideaScope — Arabic/English bilingual SPA; pure frontend calling Gemini API directly (BYOK model — user pastes their own key)
- **Architecture:** Market Research Layer added: `POST /api/research` (Vercel Function) runs Reddit + HN + Product Hunt + AppStore collectors in parallel, returns signals that are injected into the Gemini prompt as "REAL MARKET SIGNALS" block
- **API Key Model:** BYOK — backend never handles the user's Gemini key. Frontend fetches market signals from /api/research, then calls Gemini directly with user's key
- **Unreliable sources for MVP:** Google Trends (unofficial API, rate-limited in serverless), Facebook (login-walled), LinkedIn (anti-bot), TikTok (no free API) — all deferred to Phase 2
- **Reliable free sources used:** Reddit JSON API (User-Agent header only), HN Algolia API (no auth), Product Hunt RSS (no auth), Apple App Store RSS (official, no auth)
- **Caching:** Upstash Redis, 6h TTL, keyed by md5(idea + markets). Gracefully degrades if env vars not set — system works without Redis
- **Prompt injection pattern:** `buildSignalsBlock(signals)` appended at end of both Arabic and English prompts; Gemini instructed to use signals as ground truth, not hallucinate numbers

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->

## Decision Log

- **[2026-05-13] BYOK proxy over server-held key:** User chose BYOK — backend only does research, never touches Gemini key. Zero LLM cost for the operator.
- **[2026-05-13] Vercel Functions over single Node server:** User chose Vercel. Consequence: caching needs external KV (Upstash Redis), not in-process LRU.
- **[2026-05-13] Lean 4-source MVP over paid scrapers:** Reddit + HN + Product Hunt RSS + App Store RSS — all free, no auth, reliable in serverless. Google Trends deferred (rate limits in serverless).
- **[2026-05-13] Signals injected into Gemini prompt as text block:** Simpler than building a separate scoring engine. Gemini interprets the signals and adjusts its scores accordingly.
