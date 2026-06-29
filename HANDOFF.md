# TubeWatch — Full Project Handoff
**Last updated: 2026-06-29**

## What This Is

TubeWatch is a YouTube analytics SaaS for small creators (0–100K subscribers). Tagline: **"Built for creators who aren't famous yet."** It is a fully deployed, production web app at **https://tubewatchhq.com**.

The core idea: most YouTube analytics tools are built for big channels. TubeWatch is specifically designed for the growing creator — someone grinding toward their first 100K. The hero feature is **Outlier Score**: every video gets a score (views ÷ channel median) so creators instantly know which videos beat their own curve and why.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router + TypeScript |
| Styling | Tailwind CSS (inline styles for design tokens) |
| Auth + DB | Supabase (PostgreSQL + RLS + PKCE auth) |
| AI | Anthropic API — `claude-haiku-4-5-20251001` + `claude-sonnet-4-6` (streaming) |
| Payments | Stripe (checkout, webhooks, billing portal) |
| Data | YouTube Data API v3 |
| Email | Resend |
| Hosting | Vercel (auto-deploy from GitHub, daily cron at 06:00 UTC) |

**GitHub repo:** https://github.com/Gititonn/tubewatch  
**Vercel project:** Connected to main branch, auto-deploys on push  
**Supabase project:** Connected via env vars  
**Stripe account:** `acct_1TlwHJ3Dt0O64a90` ("TUBEWATCH sandbox")

---

## Design System

- **Background:** `#0f0f0f`
- **Cards:** `#111` / `#1a1a1a`
- **Borders:** `#2a2a2a`
- **Accent green:** `#00ff87`
- **AI accent purple:** `#a855f7`
- **Danger/outlier red:** `#ff4444`
- **Font:** Inter (system default)
- **Logo:** `<span style="color:#ff3333">Tube</span><span style="color:#00ff87">Watch</span>`

---

## Folder Structure

```
app/
  (auth)/
    login/              Email/password + Google OAuth login
    signup/             Registration
  (dashboard)/          All protected pages — force-dynamic
    dashboard/          Discovery hub: trending, outlier feed, AI banner, personal stats
    ai/                 AI Strategy Coach page (ask Claude anything)
    outlier/            Outlier Score table + streaming AI "Explain" per video
    videos/             Full video library with outlier scores
    trending/           Live YouTube trending (25 videos, filters, 🧠 AI button per card)
    rising/             Rising videos from tracked competitor channels
    competitors/        Add/manage competitor channels
    competitors/outliers/ Outlier videos from tracked competitors + "Why It Worked" AI
    patterns/           Content pattern analysis from competitors
    compare/            Head-to-head channel comparison tool
    connect/            YouTube OAuth channel connect flow
    billing/            Stripe subscription management
    settings/           User settings + Google reconnect
    nav-link.tsx        NavLink component (supports ai=true for purple glow style)
    layout.tsx          Sidebar nav with DISCOVER / ANALYZE / AI sections
  api/
    ai/ask/             General-purpose Claude streaming endpoint (AI Coach page)
    ai/outlier-insight/ Claude analysis of a video vs channel average
    ai/why-it-worked/   Claude deep-dive on a competitor outlier video
    youtube/connect/    Connect YouTube channel via OAuth
    youtube/sync/       Manual sync trigger
    youtube/analytics/  Fetch analytics
    youtube/transcript/ Fetch video transcript for AI context
    youtube/compare/    Compare two channels
    competitors/search/ Search for competitor channels by handle
    competitors/channels/ CRUD for tracked competitors
    competitors/channels/[id]/sync/ Sync a competitor's videos
    competitors/outliers/ Outlier videos from tracked competitors
    trending/           Trending videos (reads from trending_cache table)
    rising/             Rising videos endpoint
    patterns/           Pattern analysis endpoint
    stripe/checkout/    Create Stripe checkout session
    stripe/webhook/     Stripe webhook handler
    stripe/portal/      Billing portal redirect
    auth/signout/       Sign out
    auth/google/connect/ Initiate Google OAuth
    auth/google/callback/ Google OAuth callback
    billing/status/     Check subscription status
    cron/sync/          Daily resync (requires CRON_SECRET header)
  auth/callback/        Supabase PKCE callback
  page.tsx              Landing page (hero, marquee, feature carousel, pricing)
  layout.tsx            Root layout + metadata
lib/
  supabase/client.ts    Browser Supabase client
  supabase/server.ts    Server Supabase client
  supabase/middleware.ts Session refresh middleware
  outlier.ts            Outlier score engine (views ÷ channel median)
  youtube.ts            YouTube API helpers
  types.ts              Profile, Channel, Video interfaces
supabase/
  migrations/001_initial.sql  Full schema + RLS + triggers
vercel.json             Cron config (0 6 * * *)
push.bat                Windows deploy script (removes git lock, commits, pushes)
```

---

## Database Schema (Supabase)

Key tables:
- **profiles** — user profile, auto-created on signup via trigger
- **channels** — connected YouTube channels (one per user)
- **videos** — synced videos with outlier_score, view_count, like_count, etc.
- **competitor_channels** — channels a user is tracking
- **competitor_videos** — videos from tracked competitors (with outlier_score)
- **trending_cache** — cached trending videos (fetched by cron, keyed by region_code + video_type)
- **subscriptions** — Stripe subscription state (plan, status, stripe_customer_id)

RLS is enabled on all tables. Service role key is used in API routes for admin operations.

---

## Pricing Plans (Stripe)

| Plan | Price | Key Features |
|------|-------|-------------|
| Free | $0/mo | 1 competitor channel, 30-day history, basic outlier feed |
| Pro | $19/mo | 10 competitors, full history, AI "Why It Worked", trending/rising/patterns/compare |
| Growth | $49/mo | Unlimited competitors, everything in Pro, priority sync (6h), early access |

Stripe products are in sandbox mode. Webhook endpoint needed: `https://tubewatchhq.com/api/stripe/webhook`

---

## AI Features (All Claude-Powered, All Streaming)

1. **AI Strategy Coach** (`/ai`) — Ask Claude anything about YouTube growth. 6 quick-tap preset questions + custom input. Uses `/api/ai/ask` with `claude-haiku-4-5-20251001`.

2. **Outlier Explain** (`/outlier`) — "Explain" button on every video. Calls `/api/ai/outlier-insight`. Analyzes why a video over/under-performed vs channel average using `claude-sonnet-4-6`.

3. **Why It Worked** (`/competitors/outliers`) — "Why It Worked" button on competitor outlier videos. Calls `/api/ai/why-it-worked`. Fetches transcript + metadata, explains hook/formula/shareability. Uses `claude-haiku-4-5-20251001`.

4. **Trending AI** (`/trending`) — "🧠 AI" button on every trending video card. Inline streaming explanation of why that specific video is trending right now.

AI is visually branded throughout with purple (`#a855f7`), a "🧠" icon, and "Powered by Claude" labels.

---

## Navigation Structure

```
TubeWatch (logo: Tube=red, Watch=green)
├── Dashboard
├── Videos
│
├── DISCOVER
│   ├── 📈 Trending
│   ├── 🚀 Rising
│   ├── ⚡ Competitors
│   └── 🔥 Outlier Feed
│
├── ANALYZE
│   ├── ⭐ Outlier Score
│   ├── 🎯 Patterns
│   └── ⚖ Compare
│
├── AI
│   └── 🧠 AI Coach [NEW] (purple glow)
│
├── 💳 Billing
└── ⚙ Settings
```

---

## What's Been Built (Completed)

- [x] Full auth system (email/password + Google OAuth via Supabase)
- [x] YouTube channel connect + OAuth flow
- [x] Video sync engine with quota protection and cooldown
- [x] Daily cron sync (Vercel, 06:00 UTC)
- [x] Outlier Score algorithm (views ÷ median, per-channel)
- [x] Dashboard — discovery-first: shows live trending + competitor outliers to ALL users, personal stats if channel connected
- [x] Trending page — 25 live videos, region/category/type filters, Track Channel button, 🧠 AI button per card
- [x] Rising page — early momentum detection from competitor channels
- [x] Competitors — add/manage/sync competitor channels
- [x] Outlier Feed — global feed of competitor videos crushing their averages
- [x] Patterns — title/content pattern analysis from tracked channels
- [x] Compare — head-to-head channel comparison tool
- [x] Outlier Score page — per-video table with outlier scores + streaming AI explain
- [x] AI Strategy Coach page — general Claude Q&A for YouTube growth
- [x] AI on trending cards — inline streaming "Why is this trending?"
- [x] Stripe billing — checkout, webhooks, billing portal, 3 plan tiers
- [x] Billing page — plan cards with upgrade/manage buttons
- [x] Landing page — hero, animated video marquee, feature carousel, pricing section
- [x] Resend email integration
- [x] Vercel deploy pipeline + push.bat for Windows

---

## Pending / Not Yet Done

- [x] **Stripe fully wired** — live keys in Vercel, webhook `we_1TnirxKXNOHU6kx1uf1CARje` active. Account under review until ~2026-07-02; payments will work once cleared.

- [ ] **AI markdown rendering** — Claude responses include `**bold**` markdown that renders as raw asterisks. Need to add a simple markdown renderer (e.g. `react-markdown` or a regex replace) to the AI response boxes.

- [ ] **Stat card responsive layout** — recently fixed to use `auto-fit minmax(160px)` grid but awaiting push.

- [ ] **Rising/Patterns/Outlier Feed empty states** — these pages show "no data" for new users who haven't tracked any competitor channels. Consider seeding default competitor channels on signup, or improving the empty state UX with a guided CTA.

- [ ] **Subscription gating** — Pro/Growth features (AI, patterns, compare, unlimited competitors) are not actually gated by plan. The billing page exists but no middleware enforces plan limits.

- [ ] **Email flows** — Resend is integrated but no transactional emails are being sent (welcome, weekly digest, etc.).

- [ ] **Mobile responsiveness** — app is designed for desktop, not tested/optimized for mobile.

- [ ] **API access** — listed as "coming soon" on Growth plan.

---

## Known Quirks / Technical Notes

- **Git lock file bug**: The sandbox (Claude's Linux environment) writes `.git/index.lock` files to the NTFS mount that only Windows can delete. `push.bat` handles this automatically with `Remove-Item`. Always use `push.bat` to deploy — never try to git commit from the sandbox directly.

- **Python file writing**: When writing TSX files via Python in the sandbox, always use `open(path, 'w', encoding='utf-8')` and never use `\u` or `\U` unicode escape sequences — write actual emoji characters directly, otherwise they render as literal text in the browser.

- **ESLint strict mode**: Vercel build uses `--max-warnings 0`. Any ESLint warning fails the build. Common issues: `@next/next/no-img-element` (use `eslint-disable-next-line` comment) and `react-hooks/exhaustive-deps` (add `// eslint-disable-line` at end of deps array line).

- **Supabase client init**: Always initialize inside handlers/components, never at module scope. SSR safety.

- **trending_cache table**: Populated by the daily cron. The dashboard reads from this — if the cache is empty or stale (>2h), the Trending section won't show. Can manually trigger via `/api/cron/sync` with `CRON_SECRET` header.

- **Stripe is sandbox**: No real money moves. Use Stripe test card `4242 4242 4242 4242` to test checkout.

---

## Environment Variables (all set in Vercel except Stripe)

```
NEXT_PUBLIC_SUPABASE_URL           ✅ Set
NEXT_PUBLIC_SUPABASE_ANON_KEY      ✅ Set
SUPABASE_SERVICE_ROLE_KEY          ✅ Set
YOUTUBE_API_KEY                    ✅ Set
ANTHROPIC_API_KEY                  ✅ Set
RESEND_API_KEY                     ✅ Set
CRON_SECRET                        ✅ Set
STRIPE_SECRET_KEY                  ✅ Set (live, sk_live_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ✅ Set (live, pk_live_)
STRIPE_WEBHOOK_SECRET              ✅ Set (whsec_tH36ktZfMIktKou2dkRwJyUfD3nAUdVu)
GOOGLE_CLIENT_ID                   ✅ Set
NEXT_PUBLIC_APP_URL                ✅ Set
```

**Stripe is in LIVE mode.** Account `acct_1TlwH5KXNOHU6kx1` is under review — live payments are paused for ~2–3 days from 2026-06-29. Webhook `we_1TnirxKXNOHU6kx1uf1CARje` listens at `https://tubewatchhq.com/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

---

## How to Deploy

```powershell
# From C:\Users\admin\tubewatch in PowerShell:
.\push.bat
# Vercel auto-deploys in ~90 seconds after push to main
```

---

## Continuation Prompt

Use the following prompt to start a new conversation that picks up exactly where this left off:

---

> You are helping me build and improve **TubeWatch** — a live, fully deployed YouTube analytics SaaS at **https://tubewatchhq.com**. The GitHub repo is https://github.com/Gititonn/tubewatch and files are at `C:\Users\admin\tubewatch`.
>
> **Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS, Supabase (auth + PostgreSQL), Stripe (subscriptions), Anthropic API (streaming AI with Claude), YouTube Data API v3, Resend, Vercel.
>
> **What's already built and live:**
> - Full auth (email + Google OAuth), YouTube channel connect, video sync with quota protection, daily cron
> - Discovery-first dashboard showing live trending + competitor outliers to all users, personal stats if channel connected
> - Trending page with region/category filters and per-card 🧠 AI streaming analysis
> - Rising, Competitors, Outlier Feed, Patterns, Compare pages
> - Outlier Score page with per-video Claude AI explanations (streaming)
> - AI Strategy Coach page (`/ai`) — ask Claude anything about YouTube growth
> - Stripe billing (3 plans: Free/$0, Pro/$19, Growth/$49) — sandbox mode
> - Landing page with animated marquee, feature carousel, pricing
> - Nav with DISCOVER / ANALYZE / AI sections, TubeWatch logo (Tube=red, Watch=green)
>
> **Immediate priorities:**
> 1. **Wait for Stripe review to clear** (~2026-07-02) then test a real checkout end-to-end
> 2. Render markdown in AI responses (Claude returns `**bold**` as raw asterisks)
> 3. Gate Pro/Growth features behind actual subscription checks
> 4. Improve empty states on Rising/Patterns/Outlier Feed for new users with no competitors tracked
> 5. Get first real user — share landing page, get someone to sign up and connect YouTube
>
> **Key technical rules:**
> - Deploy via `.\push.bat` from PowerShell (handles git lock file, commits, pushes to GitHub → Vercel auto-deploys)
> - Never git commit from the sandbox — always use push.bat
> - Write files with Python using `open(path, 'w', encoding='utf-8')` — never use \u escape sequences for emoji
> - ESLint is strict (`--max-warnings 0`) — add `eslint-disable` comments for img tags and exhaustive-deps
> - Supabase client always initialized inside handlers, never at module scope
> - Design tokens: bg `#0f0f0f`, cards `#111`, borders `#2a2a2a`, green `#00ff87`, AI purple `#a855f7`
> - All dashboard pages need `export const dynamic = "force-dynamic"`
>
> The full project reference is in `C:\Users\admin\tubewatch\CLAUDE.md` and the full handoff is in `C:\Users\admin\tubewatch\HANDOFF.md`.
