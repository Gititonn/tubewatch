# TubeWatch

YouTube analytics SaaS for growing creators (roughly 1K–100K subscribers). Positioning: find the breakout videos in your niche before you make your next one — competitor-outlier detection + AI next-video coaching. Outlier score is age-adjusted velocity (views-per-day vs. channel median), not raw views ÷ median.

## Stack
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Supabase (auth + PostgreSQL with RLS)
- Stripe (subscriptions via checkout + webhook + portal)
- Anthropic API `claude-sonnet-4-6` — streaming AI insights
- YouTube Data API v3
- Resend (transactional email)
- Vercel (deploy + daily cron at 06:00 UTC)

## Folder Structure

```
app/
  (auth)/
    login/            Auth pages (email/password + Google OAuth)
    signup/
  (dashboard)/        Protected — all pages force-dynamic
    dashboard/        Main analytics overview + chart
    outlier/          Hero feature: outlier score table + streaming AI explain
    videos/           Full video list
    compare/          Compare two channels
    competitors/      Competitor channel tracking
    competitors/outliers/  Outlier videos from tracked competitors
    rising/           Rising videos (early momentum detection)
    trending/         Trending content
    patterns/         Content pattern analysis
    connect/          YouTube channel connect flow
    billing/          Stripe billing page
    settings/         User settings + Google reconnect
  api/
    ai/outlier-insight/       Streaming Claude analysis of video performance
    ai/why-it-worked/         Claude explains a specific video's success
    youtube/connect/          Connect YouTube channel
    youtube/sync/             Manual sync trigger
    youtube/analytics/        Fetch analytics data
    youtube/transcript/       Fetch video transcript
    youtube/compare/          Compare channel data
    competitors/search/       Search for competitor channels
    competitors/channels/     CRUD for tracked competitors
    competitors/channels/[id]/sync/  Sync a competitor's videos
    competitors/outliers/     Get outlier videos from competitors
    trending/                 Trending endpoint
    rising/                   Rising videos endpoint
    patterns/                 Pattern analysis endpoint
    stripe/checkout/          Create Stripe checkout session
    stripe/webhook/           Stripe webhook handler
    stripe/portal/            Billing portal redirect
    auth/signout/             Sign out handler
    auth/google/connect/      Initiate Google OAuth for YouTube
    auth/google/callback/     Google OAuth callback
    billing/status/           Check subscription status
    cron/sync/                Daily resync (requires CRON_SECRET header)
  auth/callback/      Supabase auth callback (PKCE)
  layout.tsx          Root layout
  page.tsx            Landing page
lib/
  supabase/
    client.ts         Browser client (createBrowserClient)
    server.ts         Server client (createServerClient)
    middleware.ts     Auth session refresh middleware
  outlier.ts          Outlier score engine (age-normalized: views/day vs channel median views/day, Shorts/longform split)
  velocity.ts         Snapshot-derived recent velocity ("Nx right now" from view time series)
  youtube.ts          YouTube API helpers (getChannelByHandle, getChannelVideos)
  types.ts            Profile, Channel, Video interfaces
supabase/
  migrations/
    001_initial.sql   Full schema + RLS policies + auto-create profile trigger
vercel.json           Cron: 0 6 * * *
```

## Key Patterns

- Supabase client is initialized **inside** handlers/effects — never at module scope (SSR safety)
- All dashboard pages: `export const dynamic = "force-dynamic"`
- Design tokens: `#0f0f0f` bg, `#1a1a1a` cards, `#2a2a2a` borders, `#00ff87` accent green, Inter font
- Outlier score = lifetime views/day ÷ channel median views/day (age-normalized; Shorts and longform use separate medians; videos < 3 days old are unscored). Separate metric `velocity_ratio` = views gained/day since a ~48h-old snapshot ÷ same median ("breaking now" — powers Rising)
- Streaming AI: use Vercel AI SDK `StreamingTextResponse` pattern with `anthropic.messages.stream()`

## Environment Variables

See `.env.local.example`. Never commit actual values. Required:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
YOUTUBE_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
ANTHROPIC_API_KEY
RESEND_API_KEY
CRON_SECRET
```

## Common Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit    # Type check without emitting
```

## Rules

- Never hardcode API keys or secrets anywhere in the codebase
- Never commit `.env.local`
- Use `createServerClient` (from `lib/supabase/server.ts`) in Server Components and Route Handlers
- Use `createBrowserClient` (from `lib/supabase/client.ts`) in Client Components
- All dashboard pages must have `export const dynamic = "force-dynamic"`
- Supabase service role key only in server-side Route Handlers, never in client code

## Escape Routes

| Problem | Fix |
|---------|-----|
| About to do risky work | `/checkpoint before <description>` |
| Broken after a change | `git reset --soft HEAD~1` to undo last commit |
| Merge conflicts | `git stash`, fix, `git stash pop` |
| Type errors | `npx tsc --noEmit` to locate them |
| Context overflowing | `/compact` to summarize, `/clear` to reset |
| Claude going in circles | `/rewind` or start fresh with tighter scope |
| Broken build | `npm run build 2>&1 | head -50` to see first errors |

## Custom Skills

| Command | Purpose |
|---------|---------|
| `/checkpoint <label>` | Git checkpoint before risky work |
| `/deploy-check` | Verify build, types, env vars, config |
| `/new-feature <name>` | Start a feature with plan-first workflow |
| `/sync-channel` | Trigger YouTube channel sync |
| `/ai-insight <videoId>` | Run outlier AI analysis for a video |

## Claude Code Best Practices (14 Superpowers)

From "14 GENIUS Ways to Give Claude Code SUPERPOWERS" — applied to this project:

1. **Dynamic Workflows** — Use `/new-feature`, `/checkpoint`, etc. instead of typing long instructions every session. Custom commands live in `.claude/commands/`.

2. **No dangerously-skip-permissions** — `.claude/settings.json` has an explicit allow-list for safe commands. Never run Claude with `--dangerously-skip-permissions`.

3. **Autonomous work** — Pre-approved commands (build, lint, tsc, git basics) let Claude work without constant permission prompts on safe operations.

4. **Skills, Built the Right Way** — Each command in `.claude/commands/` does one thing with clear steps. No vague instructions.

5. **Skills Systems** — Commands form a system: `new-feature` → do work → `checkpoint` → `deploy-check`. Each command is a node in the workflow.

6. **MCP vs CLI** — For this project: use CLI tools (curl, git, npm) for local tasks. Add MCP servers only for external integrations that don't have a CLI (e.g., a Supabase MCP if needed).

7. **Memory Power-Ups** — Project memory lives at `~/.claude/projects/.../memory/`. The CLAUDE.md is the in-session reference. Both work together.

8. **Folder structure** — Documented above. Claude reads CLAUDE.md at session start and knows exactly where everything lives.

9. **Planning the Right Way** — `/new-feature` enforces plan-first: clarify → plan → approve → checkpoint → build. Never code before the plan is approved.

10. **Rewind, Don't Argue** — When Claude is going the wrong direction, don't argue. Run `/checkpoint`, then `/clear` and restart with a tighter prompt.

11. **Multi-Clauding** — For large features: open multiple Claude Code sessions. One handles backend (API routes), one handles frontend (dashboard pages). Use git branches to avoid conflicts.

12. **Escape Routes** — See the Escape Routes table above. Always have a way back before doing risky work.

13. **From anywhere, 24/7** — Vercel cron handles unattended daily sync. For remote Claude Code access, use a VPS + SSH or the Claude Code web interface.

14. **Sub-Agents vs Skills** — Use Skills (`/checkpoint`, `/new-feature`) for repeatable multi-step workflows. Use Sub-Agents (spawned via `Agent` tool) for one-off research or parallel tasks like "find all usages of this API across the codebase."
