# TubeWatch — Interim Plan & Handoff (Jul 8 → reconnect Jul 11)

**Purpose:** keep momentum while the primary AI (Claude/Opus) is paused for token limits.
Written by the project lead. Read top to bottom once; then work Track A + Track B.

**One-line status:** the product is **feature-complete for public beta**. The remaining
work to first revenue is *launch execution* (mostly human) + *safe content* (delegatable).
Core code changes should WAIT for the primary AI on the 11th — see §6.

---

## 1. Current state (all live in production)

- Core product: age-adjusted velocity scoring, Breakouts feed, competitor auto-suggest on
  connect, AI "Why It Worked" teardowns (transcript-grounded; **first one free**),
  transcript/script download (.txt/.srt), dashboard onboarding card, FAQ + inline tooltips,
  orange=hot / red=danger color system, blurred Pro paywalls.
- Weekly Breakout Email: **built & wired** — Resend domain verified, `RESEND_API_KEY` set in
  Vercel (Prod+Preview), redeployed. Fires Mondays 14:00 UTC via GitHub Actions. First
  automated send is **Mon Jul 13 — AFTER we reconnect**, so nothing untested blasts in the gap.
- Extension: v0.1.2 in Chrome Web Store **review**; v0.1.3 (track-button-402→billing fix)
  committed + zip built, ready to submit once 0.1.2 clears.
- SEO: Google Search Console verified; sitemap.xml submitted (leaderboard pages indexing).
- Marketing assets ready in `marketing/`: 56s walkthrough mp4, stills, tutorial voiceover
  script, Reddit Phase 1 pack.
- Strategy: `docs/ROADMAP.md` (economics: ~97% margin, break-even at 5 Pro subs).

**Nothing will misfire while away:** daily sync/purge crons + priority-sync (00/12/18 UTC)
are steady; weekly-email only runs Mondays (next one is post-reconnect).

---

## 2. The critical path (what actually moves the needle)

Revenue comes from *creators using it and paying*, not from more features. The gating steps
are: **(a) get the extension approved, (b) run the Reddit warm-up, (c) collect testimonials.**
Everything below serves that.

---

## 3. TRACK A — Founder-only (cannot delegate to any AI)

Do these yourself; they need your accounts, voice, or judgment:

1. **Record the tutorial voiceover** — open `marketing/tutorial-script.md`, play
   `marketing/raw/walkthrough.mp4` in OBS (installed), read the timed script in one take.
   Then upload the result to YouTube as **Unlisted**. (~15 min.)
2. **File the YouTube API quota-increase request** with Google Cloud Console (multi-day
   lead time — start now so headroom exists before a signup spike). Search "YouTube Data
   API quota extension form."
3. **Chrome Web Store** — watch for the 0.1.2 approval email. When approved: upload
   `extension/dist/tubewatch-extension-v0.1.3.zip` as an update (fixes the track-button bug).
4. **Confirm `support@tubewatchhq.com` exists** (referenced in the extension listing + privacy
   page) — create the alias or tell the primary AI to swap the address on the 11th.
5. **Do NOT post the Reddit thread until the extension is approved** — the thread is far
   stronger when it can end with "install the extension." Prep it (Track B) but hold the post.

---

## 4. TRACK B — Delegate to another AI (NON-CODE, safe, high value)

These are pure content/research — zero repo risk. Paste each prompt into any capable AI
(ChatGPT, Gemini, another Claude). Save outputs into `marketing/` (or paste back to the
primary AI on the 11th). **Priority order: B1 → B2 → B3.**

### B1 — Reddit launch content (highest value)
> You're helping a solo founder launch a YouTube-analytics SaaS called TubeWatch
> (tubewatchhq.com). It finds "breakout" videos in a creator's niche — videos overperforming
> their OWN channel's normal pace (age-adjusted views/day vs. that channel's median, NOT raw
> views) — and an AI explains why each one worked so the creator can make their version. Target
> user: creators with 1K–100K subscribers. Free / Pro $19 / Growth $49.
>
> I'm launching via Reddit, giving away free AI "why did this video break out?" teardowns in
> the comments to build trust and collect testimonials. I will disclose I'm the founder.
>
> Produce: (1) THREE distinct thread versions (title + body) tuned for r/NewTubers,
> r/SmallYTChannel, and r/PartneredYoutube respectively, each with founder disclosure and a
> "drop your channel, I'll analyze your weird spike free" hook — no links until asked.
> (2) A bank of 10 reply templates for delivering a teardown politely and concisely.
> (3) For each subreddit, summarize its current self-promotion rules and the safest way to post.
> (4) A follow-up "retro" post to publish a week later ("I ran 40 free breakdowns, here's what
> I learned"). Keep every post honest, non-hypey, and Reddit-native. Founders who over-sell get
> flamed.

### B2 — SEO niche guides (content only — the primary AI wires them into pages later)
> Write 5 SEO-optimized guide articles for TubeWatch (a tool that finds breakout videos in a
> creator's niche using age-adjusted velocity, not raw views). One article per niche: Gaming,
> Personal Finance, Cooking, Tech Reviews, Fitness. Each ~800–1000 words, markdown, targeting
> the search intent "how to find viral/breakout video ideas in [niche] on YouTube." Include:
> a clear H1, 3–4 H2 sections, a paragraph explaining WHY raw view counts mislead and why
> "views-per-day vs the channel's own median" is better, 2–3 concrete tactical tips specific to
> that niche, and a soft CTA to try tubewatchhq.com/channel (free, no signup). Do NOT invent
> fake statistics or fake testimonials. Output each as a separate markdown block with a
> suggested URL slug like /guides/gaming-breakout-videos.

### B3 — Competitive & market refresh (research)
> Research the YouTube creator-analytics tool market as of July 2026. Cover: vidIQ, TubeBuddy,
> 1of10, ViewStats, Spotter Studio, TubeLab, OutlierKit — current pricing, their "outlier/
> breakout" features, and any new entrants. Then: (1) a comparison table, (2) the 3 sharpest
> gaps a small tool targeting 1K–100K-sub creators could exploit, (3) any recent creator-
> community sentiment about "outlier tools making YouTube derivative" and how the winners
> position against it. Cite sources with dates.

---

## 5. TRACK C — Optional AI *code* task (ONE, heavily guarded)

**Recommendation: skip this and let the primary AI do it on the 11th.** Only use it if you
specifically want code progress and accept a review pass. It is deliberately the most isolated,
lowest-risk task in the backlog (append-only event logging — touches no scoring, sync, billing,
or auth logic).

If you delegate it, the AI MUST obey §7 guardrails and this spec:

> Add lightweight funnel-event logging to a Next.js 14 App Router + Supabase (Postgres, RLS)
> project. GOAL: record when a user hits key activation milestones so we can later see where
> signups drop off. SCOPE — create ONLY these, touch nothing else:
> 1. A migration `supabase/migrations/20260709_funnel_events.sql` creating table
>    `funnel_events (id uuid pk default gen_random_uuid(), user_id uuid references auth.users
>    on delete cascade, event text not null, created_at timestamptz not null default now())`
>    with an index on `(event, created_at)`, RLS enabled, and NO insert policy (writes happen
>    via the service-role client only).
> 2. A helper `lib/funnel.ts` exporting `logFunnelEvent(userId: string, event: string)` that
>    uses `createServiceClient()` from `@/lib/supabase/server`, inserts best-effort, and NEVER
>    throws (wrap in try/catch, console.warn on error) — a logging failure must never break the
>    caller.
> 3. Call `logFunnelEvent` (fire-and-forget, not awaited in a way that blocks the response) at:
>    signup completion, channel connect success (`app/api/youtube/connect/route.ts`), and first
>    competitor tracked. Use event strings: 'signup', 'channel_connected', 'competitor_tracked'.
> Do NOT modify scoring, sync, billing, entitlements, the AI routes, or the extension. Do NOT
> apply the migration to production (leave it as a file). MUST pass `npx tsc --noEmit`,
> `npm run lint`, and `npm run build` with zero errors before committing. Commit on a branch
> named `feat/funnel-events`, do NOT merge to main, and leave it for review.

---

## 6. DO NOT TOUCH until the primary AI is back (the 11th)

These need full-codebase context or are the strategic core — a context-blind change here is
how things break:

- **The closed-loop measurement job** (roadmap Phase 1 item 2) — this is the MOAT ("videos made
  after our teardown beat the creator's median X%"). The primary AI builds this deliberately.
- Anything in `lib/outlier.ts`, `lib/velocity.ts`, `lib/sync.ts`, `lib/entitlements.ts`,
  the `stripe/*` routes, or `extension/`.
- Pricing/tier changes (external reviewers proposed some — decide with usage DATA, not now).
- The weekly-email test send — it emails real users; hold it for the 11th so the primary AI can
  verify the result (or send only to your own address deliberately).

---

## 7. Guardrails for ANY AI that touches this repo

- Next.js clients (Supabase, Resend, etc.) are instantiated **inside handlers/effects, never at
  module scope** — module-scope breaks the build.
- All internal API/cron calls use the **`www.` host** (`https://www.tubewatchhq.com`) — the apex
  308-redirects and drops auth headers.
- Cron routes authenticate with `CRON_SECRET` (Bearer). Never log or expose it.
- Outlier scoring lives in **one place** (`lib/outlier.ts`) — every surface calls the same
  function. Never fork the formula.
- Color meaning is fixed: **orange `#f97316` = hot/outlier, red `#ff4444` = danger/error only.**
- Vercel is **Hobby** (2 cron slots, both used) — new schedules go via GitHub Actions, not
  vercel.json.
- Every change must pass `npx tsc --noEmit` + `npm run lint` + `npm run build` before commit.
- Migrations: write the file, do NOT apply to production Supabase — that's a reviewed step.
- Secrets (API keys/tokens) are never entered into fields or committed.

---

## 8. First thing to tell the primary AI on the 11th

"Read `docs/handoffs/interim-plan-jul8-11.md` and the memory. Status: [what got done in
Track A/B/C]. Extension review: [approved? / still pending]. Then continue the roadmap —
next up is the closed-loop measurement job unless launch surfaced something more urgent."
