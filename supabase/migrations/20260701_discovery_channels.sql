-- Platform-wide "discovery" competitor channels: curated, not owned by any
-- single user, so the Outlier Feed can be auto-populated by category instead
-- of only showing channels a given user personally tracked.
ALTER TABLE competitor_channels
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE competitor_channels
  ADD COLUMN IF NOT EXISTS is_discovery BOOLEAN NOT NULL DEFAULT false;

-- A discovery channel has no user, so the unique(user_id, youtube_channel_id)
-- constraint can't dedupe it. Add a partial unique index instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitor_channels_discovery_unique
  ON competitor_channels(youtube_channel_id)
  WHERE is_discovery = true;

-- Discovery rows must always be readable by any signed-in user regardless of
-- who "owns" them (no one does). Owned rows keep the existing per-user policy.
CREATE POLICY "Anyone signed in can view discovery channels"
  ON competitor_channels FOR SELECT
  TO authenticated
  USING (is_discovery = true);

CREATE INDEX IF NOT EXISTS idx_competitor_channels_discovery_category
  ON competitor_channels(category) WHERE is_discovery = true;

-- The existing "Users manage own competitor channels" policy requires
-- auth.uid() = user_id, which a discovery row (user_id IS NULL) can never
-- satisfy. Add explicit INSERT/UPDATE policies for the shared discovery pool.
CREATE POLICY "Anyone signed in can add discovery channels"
  ON competitor_channels FOR INSERT
  TO authenticated
  WITH CHECK (is_discovery = true AND user_id IS NULL);

CREATE POLICY "Anyone signed in can update discovery channels"
  ON competitor_channels FOR UPDATE
  TO authenticated
  USING (is_discovery = true)
  WITH CHECK (is_discovery = true AND user_id IS NULL);
