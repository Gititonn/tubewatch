-- Cache for trending videos (to avoid hammering YouTube API quota)
CREATE TABLE IF NOT EXISTS trending_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  region_code TEXT NOT NULL DEFAULT 'US',
  category_id TEXT,
  video_type TEXT NOT NULL DEFAULT 'videos', -- 'videos' or 'shorts'
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  duration_seconds INT,
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(region_code, category_id, video_type, youtube_video_id)
);

-- Auto-expire trending cache after 2 hours
CREATE INDEX idx_trending_cache_fetched ON trending_cache(fetched_at DESC);
