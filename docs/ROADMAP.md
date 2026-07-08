# TubeWatch — path to profitable, by being useful

**Thesis:** in the AI gold rush, every competitor can bolt on "AI ideas." The only
defensible AI position is **provably useful AI** — advice that is (a) grounded in data
competitors don't have, and (b) measurably works. TubeWatch already has both halves
half-built: the snapshot time-series nobody can backfill, and a teardown log that can
prove whether videos made after our analysis beat the creator's own median. The plan is
to close that loop and sell the proof.

**The math that makes this easy:** fixed costs are ~$50–100/mo (Vercel, Supabase,
domain; AI teardowns run on Haiku at well under a cent each — gross margin on a $19
sub is ~97%). Profitability is literally **5 Pro subscribers**. The real target is
**100 paying (~$2K MRR) within 6 months**, which at this margin is a real business.

---

## Phase 0 — Launch execution (this week) · owner: founder

Everything is built; this phase is clicks and posting.

- [ ] Record the 56s voiceover (`marketing/tutorial-script.md`) → publish unlisted on
      YouTube + embed on landing.
- [ ] Post the Phase 1 Reddit thread (`marketing/reddit-phase1.md`) with a 2–3h window
      to answer fast. Claude runs teardowns live during the thread on request.
- [ ] Extension: watch for Web Store approval → put the install link on the landing page
      and in the thread. Rebuild note: `extension/dist/` zip must match deployed UI.
- [ ] Mint beta codes (`scripts/create-launch-codes.mjs`) — 50 × 3-months-Pro for
      engaged thread participants.
- **Exit criteria:** 100+ signups, 20+ testimonial-grade reactions collected.

## Phase 1 — Activation & retention (weeks 1–4) · owner: Claude builds, founder watches funnel

Beta users churn silently unless the product comes to them. Two builds:

### 1. The Weekly Breakout Email (the retention engine)
The Logician's critique stands: a burned-out creator doesn't *visit* dashboards. The
product must arrive. Every Monday, per user: their niche's top 3 breakouts this week +
one AI-picked "make your version of this" suggestion with the one-line why.
- Resend is already integrated for transactional email; this is a cron + template +
  an unsubscribe flag on profiles.
- Free tier gets the email with 1 breakout + upsell; paid gets all 3 + the AI pick.
- This is also the churn alarm: opens/clicks tell us who's going dormant.

### 2. The Closed Loop (the moat — measurement half)
Logging already ships (`ai_teardowns`, since 2026-07-06). Build the weekly job:
- For each user teardown, find their own-channel videos published *after* it; compare
  each video's age-matched velocity vs. the channel's median (all data already in
  `videos` + `video_snapshots`).
- Store per-video outcomes → two surfaces:
  - **Personal:** "Your last upload ran 2.1x your median" on the dashboard.
  - **Aggregate (the marketing weapon):** once n ≥ 30 outcomes, compute
    "videos published after a TubeWatch teardown beat the channel's median X% of the
    time." If X is good → it goes on the landing page as the only claim in the
    category that's *measured*. If X is bad → we learn and fix the advice. Either
    way the number is the strategy.
- **Basic funnel events** (signup → connect → feed viewed → teardown → d7 return) — a
  tiny `events` table; no third-party analytics needed at this scale.
- **Exit criteria:** email open rate >35%, d7 retention >25%, first closed-loop cohort
  accumulating.

## Phase 2 — Monetize the AI (months 2–3)

- **Sell the proof:** closed-loop stat on landing + in the weekly email footer.
- **Make Growth honest and fat:** "Deep per-video audits" is now real (timestamped
  structure map + retention-risk moments). Add the **Monthly Next-Video Plan** as an
  actual generated artifact: first Monday monthly, Growth users get a one-page plan
  (3 target topics from live niche breakouts, each with title formula + hook structure
  from real teardowns). It's a composition of things that already exist.
- **Pricing review with data:** external reviewers proposed restructuring tiers
  (Pro 50 credits / more competitor slots / export on Growth). Decide with 30 days of
  usage data, not vibes. Annual plans get anchored hard everywhere (2 months free).
- **Extension viral loop:** store link everywhere; the badge overlay is the daily brand
  impression. Watermark stays subtle but present.
- **Leaderboards SEO:** now indexed via sitemap; add per-niche weekly "top breakouts"
  sections to leaderboard pages (data already exists) so each niche page is a living,
  rankable artifact. This is the free-traffic engine.
- **Exit criteria:** first 25 paying, <8%/mo churn, closed-loop n≥30 published.

## Phase 3 — Expand the AI surface (months 3–6, pull-driven only)

Build these only when users ask, in this order of likely pull:
1. **Draft-title scorer** — paste a title idea, get predicted-fit vs. niche patterns +
   the two closest real breakouts. Pre-publish = highest-anxiety moment = highest value.
2. **Thumbnail/packaging analysis** in deep audits (vision model on thumbnails of the
   baseline vs. the breakout).
3. **Agency/multi-channel seats** at $99+ if agencies show up (they did for competitors).
4. **CSV/API export** on Growth (cheap, classic upsell, zero maintenance).

Anti-roadmap (explicitly not doing): AI script *writing* (commodity, burned users
everywhere, undermines the "we analyze, you create" trust position); chasing >100K-sub
channels (breaks the positioning wedge); any feature that isn't reachable from
"what should I film next?"

---

## Risks & standing mitigations

| Risk | Mitigation |
|---|---|
| YouTube API quota under load | search-quota guard live; quota-increase request with Google (founder: file it) |
| Transcript scrape breaks | already degrades honestly; teardown still works from baseline+packaging |
| Incumbent copies the formula | the formula was never the moat; the snapshot history + closed-loop proof are |
| Hobbyist churn | weekly email + measured wins; annual anchoring |
| ToS (30-day retention on non-authorized data) | purge cron live; velocity design is retention-compliant by construction |

## KPI dashboard (check weekly)

Signups · connect rate · teardown rate (the aha metric) · d7 return · email opens ·
paying count · MRR · churn · closed-loop X% · YouTube quota headroom.

---

*Build order next: Weekly Breakout Email → funnel events → closed-loop measurement job
(needs ~2 weeks of teardown+upload data to have anything to measure, so it lands third
by design). Specs for each get their own doc under docs/specs/ before code.*
