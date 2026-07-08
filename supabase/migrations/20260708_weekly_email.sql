-- Weekly Breakout Email (spec: docs/specs/weekly-email.md)
--
-- Retention loop: a Monday email with the user's niche breakouts must be
-- opt-out-able without a login (CAN-SPAM), and must not double-send if the
-- cron fires twice. Three columns on profiles cover all of it.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN NOT NULL DEFAULT true;
-- Stable per-user id for one-click unsubscribe links (no auth needed to act on it).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_email_token UUID NOT NULL DEFAULT gen_random_uuid();
-- Idempotency: the cron refuses to re-send within 6 days of this timestamp.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_email_last_sent_at TIMESTAMPTZ;

-- Unsubscribe route looks users up by token via the service role; index it.
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_email_token ON profiles(weekly_email_token);
