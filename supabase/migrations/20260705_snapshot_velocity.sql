-- Snapshot-powered velocity: make the accumulated view time-series actually
-- drive detection instead of sitting unread.
--
-- Two numbers, two questions — kept deliberately separate:
--   outlier_score        "did this video overperform for this channel?"
--                        (lifetime views/day ÷ channel median views/day)
--   velocity_ratio       "is this video pulling views RIGHT NOW?"
--                        (views gained/day over the last ~48h ÷ same median)
-- Folding recent velocity into outlier_score would mark every decayed
-- back-catalog video an "underperformer"; a separate column lets Rising sort
-- by what's breaking now while the outlier table keeps its historical meaning.
--
-- Retention note: competitor/discovered history lives in video_view_history,
-- which the purge cron deletes after 30 days (YouTube API §III.E.4). A rolling
-- ~48h velocity window needs only days of history, so it is fully compatible
-- with that policy — long-horizon day-N cohort baselines are not, by design.

ALTER TABLE videos            ADD COLUMN IF NOT EXISTS recent_views_per_day DOUBLE PRECISION;
ALTER TABLE videos            ADD COLUMN IF NOT EXISTS velocity_ratio       DOUBLE PRECISION;
ALTER TABLE competitor_videos ADD COLUMN IF NOT EXISTS recent_views_per_day DOUBLE PRECISION;
ALTER TABLE competitor_videos ADD COLUMN IF NOT EXISTS velocity_ratio       DOUBLE PRECISION;
ALTER TABLE discovered_videos ADD COLUMN IF NOT EXISTS recent_views_per_day DOUBLE PRECISION;
ALTER TABLE discovered_videos ADD COLUMN IF NOT EXISTS velocity_ratio       DOUBLE PRECISION;

-- Rising sorts by what's moving now.
CREATE INDEX IF NOT EXISTS idx_competitor_videos_velocity
  ON competitor_videos (velocity_ratio DESC NULLS LAST);

-- One baseline snapshot per video: the row closest to ~48h old, bounded to
-- [20h, 7d]. Under 20h the delta mostly measures time-of-day noise; over 7d it
-- stops being "recent". DISTINCT ON + the existing (youtube_video_id,
-- captured_at DESC) index keeps this a single cheap query for a 50-video batch.
CREATE OR REPLACE FUNCTION baseline_view_snapshots(video_ids TEXT[])
RETURNS TABLE (youtube_video_id TEXT, view_count BIGINT, captured_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (h.youtube_video_id)
         h.youtube_video_id, h.view_count, h.captured_at
  FROM video_view_history h
  WHERE h.youtube_video_id = ANY(video_ids)
    AND h.captured_at <= now() - interval '20 hours'
    AND h.captured_at >= now() - interval '7 days'
  ORDER BY h.youtube_video_id,
           ABS(EXTRACT(EPOCH FROM (h.captured_at - (now() - interval '48 hours'))));
$$;

-- Same selection logic against the OWN-channel snapshot table (OAuth-authorized
-- data, longer retention, keyed by channel row).
CREATE OR REPLACE FUNCTION baseline_own_snapshots(channel UUID, video_ids TEXT[])
RETURNS TABLE (youtube_video_id TEXT, view_count BIGINT, captured_at TIMESTAMPTZ)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (s.youtube_video_id)
         s.youtube_video_id, s.view_count, s.captured_at
  FROM video_snapshots s
  WHERE s.channel_id = channel
    AND s.youtube_video_id = ANY(video_ids)
    AND s.captured_at <= now() - interval '20 hours'
    AND s.captured_at >= now() - interval '7 days'
  ORDER BY s.youtube_video_id,
           ABS(EXTRACT(EPOCH FROM (s.captured_at - (now() - interval '48 hours'))));
$$;
