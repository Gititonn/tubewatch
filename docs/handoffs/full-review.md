# TubeWatch — full product & code review brief

You are being asked for a **complete, objective review** of a beta SaaS: the live product,
the codebase, the positioning, and launch readiness. Nothing is off-limits. Do not soften
findings; rank them by severity. Where you see something done well, say so briefly — but
the purpose is to find what's wrong or risky before a public beta launch.

## What it is

TubeWatch is a YouTube analytics tool for growing creators (~1K–100K subscribers).
Core thesis: help a creator decide **what to film next** by (1) tracking competitor
channels and surfacing their "breakouts" — videos pulling views far faster than that
channel's own median (age-adjusted views/day, not raw view counts), and (2) an AI
teardown ("Why It Worked") that explains a breakout against the channel's own baseline:
timed hook analysis from transcript data, title/length/format deltas vs. sibling videos,
and whether the breakout is a topic spike (copy fast) or an evergreen format (copy the
structure). Pricing: Free / Pro $19/mo / Growth $49/mo. A Chrome extension (currently in
Web Store review) overlays the scores on YouTube itself.

Solo founder. Beta. Public launch (Reddit-first) is imminent — that's the context for
this review.

## Access — everything you need

**Live site** (always use the `www.` host — the apex 308-redirects and some fetchers
drop headers or mis-render on redirects):

- Landing: https://www.tubewatchhq.com/
- No-login live demo (score any channel): https://www.tubewatchhq.com/channel — try
  https://www.tubewatchhq.com/channel/@fireship for a pre-scored example
- FAQ (how the scoring math works): https://www.tubewatchhq.com/faq
- Public leaderboards: https://www.tubewatchhq.com/leaderboard
- About / Terms / Privacy / extension privacy: linked in the footer

**Demo account** (throwaway review account — you may log in and explore everything):

- URL: https://www.tubewatchhq.com/login
- Email: `demo@tubewatchhq.com`
- Password: `Demo-TubeWatch-2026`
- It has a connected channel (Fireship) and 3 tracked competitor channels with synced,
  scored videos. Pages to see: /dashboard, /competitors/outliers (the hero feature),
  /competitors, /rising, /outlier, /patterns and /compare (Pro-locked — evaluate the
  paywall treatment), /billing, /settings, /faq.
- ⚠️ The account is on the free tier with a hard cap of 5 AI answers/month and **~3
  remaining this month**. The "Ask AI: why did this break out?" buttons each consume 1.
  Spend at most 1–2, deliberately, on a video that interests you — the output quality is
  itself a review target. (Everything else is unmetered.)

**Complete source code** (public repository — no auth needed):

- https://github.com/Gititonn/tubewatch
- Stack: Next.js 14 App Router + TypeScript, Supabase (Postgres + RLS), Stripe,
  Anthropic API (AI teardowns), YouTube Data API v3, Vercel (+ a GitHub Actions cron).
- Orientation: `CLAUDE.md` (repo map), `lib/outlier.ts` (scoring math),
  `lib/velocity.ts` + `supabase/migrations/20260705_snapshot_velocity.sql` (the
  snapshot time-series), `app/api/ai/why-it-worked/route.ts` (the AI teardown),
  `lib/entitlements.ts` + `lib/youtube-quota.ts` (metering/quota guards),
  `extension/` (the Chrome extension source + store listing),
  `supabase/migrations/` (full schema history including RLS policies).

**Chrome extension:** in Web Store review, so not installable yet — review the source in
`extension/` and the screenshots in `extension/store-assets/`.

## What a full review should cover (suggested, not limiting)

1. **Product/UX** — first-run experience on the demo account: is the value obvious in
   the first 60 seconds? Where would a tired 4K-subscriber creator get lost or bounce?
2. **The core math** — read `lib/outlier.ts` and `lib/velocity.ts` against the FAQ's
   claims. Is the scoring statistically defensible? Edge cases mishandled?
3. **AI teardown quality** — spend 1 credit; judge whether the output is genuinely
   grounded (it should quote timestamps and real sibling titles) or horoscope.
4. **Code quality & architecture** — API route hygiene, error handling, race conditions,
   the Supabase RLS policies in the migrations, secrets handling.
5. **Security posture** — auth flows, the extension's API-key model
   (`app/api/extension/`), rate limiting/metering, header hardening, anything exposed
   that shouldn't be.
6. **Business/positioning** — landing page claims vs. what the product delivers;
   pricing-tier coherence; the competitive wedge vs. vidIQ/1of10/TubeBuddy.
7. **Launch readiness** — what would embarrass this product in a public Reddit thread
   next week? That's the bar.

## Recent-change note (to prevent stale findings, not to steer you)

The product has been through several review-and-fix cycles in the past week: dashboard
information hierarchy, an onboarding auto-suggest flow, creator-language renames
("Breakouts"), a semantic color split (orange = hot, red = danger only), blurred paywall
previews, an FAQ + inline score tooltips, security headers, robots/sitemap, and a
transcript-grounded v2 of the AI teardown. Judge what's live now, not descriptions of it
— but if something looks recently changed, it probably was, so check the git history
before assuming it's unconsidered.

## Output format

Rank findings worst-first. For each: the specific issue (file/page/element), why it
matters, and a concrete fix. Separate **[Blocker]** / **[Should-fix]** / **[Polish]**.
End with a verdict: ready for public beta, or not — and the shortest path if not.
