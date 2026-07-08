# Spec: Weekly Breakout Email

**Status:** building 2026-07-08 · **Roadmap:** Phase 1, item 1 (the retention engine)

## Why

The recurring critique across every review: a burned-out creator does not *visit*
dashboards. The product must **arrive**. A Monday-morning email with "here are the
breakouts in your niche this week, here's the one to copy" is the retention loop and
the churn alarm (opens/clicks reveal who's going dormant) in one.

## What the user gets

One email per week (Monday ~14:00 UTC / morning US), per user with a connected channel
and email enabled:

- **Subject:** `🔥 3 breakouts in your niche this week` (or `1 breakout…` for free tier)
- **Free tier:** the single top breakout in their niche + a soft upsell to see the rest.
- **Paid tier:** top 3 breakouts + **one AI "make your version" pick** — the strongest
  breakout with a one-line reason to copy it, generated fresh (see AI note).
- Every breakout row: thumbnail, title, channel, the outlier multiplier ("6.2x"), and a
  deep-link to the Breakouts feed / that video's teardown.
- Footer: manage-preferences + one-click unsubscribe (token link, no login).

## Data (all already exists — no new sync)

Per user, reuse the **exact** feed logic from `app/api/competitors/outliers`:
their tracked competitor channels ∪ the discovery pool, scoped to the categories they
track. Rank `competitor_videos` by `outlier_score`, filter to videos **published in the
last ~10 days** (this is a *this week* email, not all-time), take top 1 (free) / 3 (paid).
Skip the user entirely if there are no fresh breakouts — never send an empty email.

## The AI pick (paid only, best-effort, does NOT touch the user's credit meter)

Call Haiku **directly** (not `consumeAiCall` — this is system-generated, not a
user-initiated teardown) with the top breakout's title + the user's niche, asking for a
single sentence: "why a creator in this niche should make their version, and the angle."
- Cost is trivial at launch scale (≈ 1 Haiku call/paid-user/week).
- Best-effort: on any failure, fall back to a templated line
  (`"This is overperforming its channel ${score}x — the topic is hot in your niche right now."`).
  The email must never fail because the AI did.

## Delivery

- **Provider:** Resend (dependency already installed; first actual use).
- **From:** `TubeWatch <hello@tubewatchhq.com>` — **founder prerequisite:** verify the
  sending domain in Resend and set `RESEND_API_KEY` in Vercel (and locally to test).
- **Trigger:** `GET /api/cron/weekly-email`, `CRON_SECRET`-guarded (same pattern as
  `/api/cron/sync`). Iterates eligible users, concurrency-limited, best-effort per user
  (one failure never stops the batch), stamps `weekly_email_last_sent_at`, and refuses
  to re-send within 6 days (idempotency guard against double-fires).
- **Schedule:** Vercel Hobby's 2 cron slots are already full (sync + purge), so this
  fires via **GitHub Actions** (`.github/workflows/weekly-email.yml`, Mondays), exactly
  like `priority-sync.yml` — hits the `www` host with the `CRON_SECRET` bearer.

## Schema (migration `20260708_weekly_email.sql`)

On `profiles`:
- `weekly_email_enabled BOOLEAN NOT NULL DEFAULT true`
- `weekly_email_token UUID NOT NULL DEFAULT gen_random_uuid()` (one-click unsubscribe id)
- `weekly_email_last_sent_at TIMESTAMPTZ`

## Unsubscribe / preferences

- `GET /api/email/unsubscribe?token=…` — no auth, flips `weekly_email_enabled=false`,
  renders a tiny confirmation page. Required for CAN-SPAM compliance.
- Settings page gets a toggle so logged-in users can re-enable / opt out too.

## Guardrails

- No email if: no connected channel, `weekly_email_enabled=false`, no fresh breakouts,
  or sent within the last 6 days.
- Thumbnails hot-link from `i.ytimg.com` (already public, no storage).
- HTML is table-based with inline styles (email-client-safe); dark theme, brand accent.
- Log per-user send outcome; return `{sent, skipped, failed}` counts from the cron.

## Acceptance

- A paid user with fresh niche breakouts receives a 3-breakout email with a real AI pick
  line; a free user gets 1 + upsell.
- Users with no fresh breakouts / no channel / opted out get nothing.
- Unsubscribe link flips the flag and stops future sends.
- Re-running the cron same-day sends nothing (6-day idempotency).
- `npx tsc --noEmit` + build clean.

## Not in scope (later)

Open/click tracking dashboards (Resend provides basic analytics; wire a KPI view later),
per-niche send-time optimization, digest of the user's OWN channel performance (that's
the closed-loop email, Phase 1 item 2).
