-- Moderation for the shared discovery pool. Prior to this, any signed-in
-- user could insert a discovery channel with zero gate (found live: a
-- 1-subscriber test channel got added in under a minute). This adds
-- attribution so bad contributions can be traced/pruned, and tightens the
-- INSERT policy so a caller can only attribute a row to themselves.
-- App-side quality bar (200+ subs, 5+ videos) and a 5-per-24h rate limit
-- live in app/api/discovery/channels/route.ts — this migration is the
-- DB-side half (attribution column + RLS).

ALTER TABLE competitor_channels
  ADD COLUMN IF NOT EXISTS contributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_competitor_channels_contributed_by
  ON competitor_channels(contributed_by, created_at) WHERE is_discovery = true;

DROP POLICY IF EXISTS "Anyone signed in can add discovery channels" ON competitor_channels;
CREATE POLICY "Anyone signed in can add discovery channels"
  ON competitor_channels FOR INSERT
  TO authenticated
  WITH CHECK (is_discovery = true AND user_id IS NULL AND contributed_by = auth.uid());
