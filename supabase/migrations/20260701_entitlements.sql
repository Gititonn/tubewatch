-- Entitlements & metering + view-snapshot groundwork
-- Ships with the pricing reshape: real AI metering (was copy-only), and a
-- per-video snapshot table so the fully-calibrated velocity metric can come later.

-- AI Coach usage meter (monthly). Free tier gets a small taste; paid tiers a
-- generous cap. Reset happens lazily in lib/entitlements.ts when now >= reset_at.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_calls_used INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_calls_reset_at TIMESTAMPTZ NOT NULL
  DEFAULT (date_trunc('month', now()) + interval '1 month');

-- Point-in-time view snapshots per synced video. Written best-effort on every
-- sync so we accumulate the time series needed for first-48h velocity scoring.
CREATE TABLE IF NOT EXISTS video_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  view_count BIGINT NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_snapshots
  ON video_snapshots(channel_id, youtube_video_id, captured_at DESC);

ALTER TABLE video_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own video snapshots" ON video_snapshots FOR ALL USING (
  channel_id IN (SELECT id FROM channels WHERE user_id = auth.uid())
);
