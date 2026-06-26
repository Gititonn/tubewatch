-- Competitor channels users are tracking
CREATE TABLE IF NOT EXISTS competitor_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_channel_id TEXT NOT NULL,
  channel_handle TEXT,
  channel_name TEXT NOT NULL,
  thumbnail_url TEXT,
  subscriber_count BIGINT,
  video_count INT,
  median_views BIGINT,        -- cached median of last 50 videos
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, youtube_channel_id)
);

ALTER TABLE competitor_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own competitor channels"
  ON competitor_channels FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Videos from competitor channels (cached)
CREATE TABLE IF NOT EXISTS competitor_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_channel_id UUID NOT NULL REFERENCES competitor_channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  duration_seconds INT,
  outlier_score NUMERIC(10,2),  -- view_count / channel_median_views
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_channel_id, youtube_video_id)
);

-- Index for fast outlier queries
CREATE INDEX idx_competitor_videos_outlier
  ON competitor_videos(competitor_channel_id, outlier_score DESC);
