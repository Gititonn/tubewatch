-- Closed-loop measurement groundwork (spec: docs/specs/transcript-why-it-worked.md,
-- "Why this is a moat" item c).
--
-- The claim that actually differentiates this product — "videos made after our
-- teardown beat the creator's median" — requires knowing WHEN a user got a
-- teardown and WHAT video prompted it, so a later job can check whether their
-- next own-channel upload outperformed. That correlation can't be reconstructed
-- retroactively, so logging starts now even though the measurement job is a
-- separate, later build.
CREATE TABLE IF NOT EXISTS ai_teardowns (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_video_id   TEXT NOT NULL,
  source             TEXT NOT NULL CHECK (source IN ('own', 'competitor', 'discovered')),
  title              TEXT,
  outlier_score      DOUBLE PRECISION,
  velocity_ratio     DOUBLE PRECISION,
  had_transcript     BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_teardowns_user ON ai_teardowns(user_id, created_at DESC);

ALTER TABLE ai_teardowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own teardown history" ON ai_teardowns FOR SELECT USING (
  user_id = auth.uid()
);
-- Inserts happen server-side via the service-role client (the route already
-- gates on auth + AI-call metering), so no insert policy is needed for the
-- anon/authenticated roles.
