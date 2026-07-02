-- Extension / search-any-channel data layer + the free-data write-through store.
--
-- Three ideas:
--  1. channel_median_cache — compute a channel's median views/day once, reuse it
--     across all users for days. This is what keeps on-demand scoring cheap.
--  2. discovered_videos — every arbitrary video the extension/search scores gets
--     persisted (public metrics only), so coverage compounds and repeat lookups
--     are free. This is the "make use of the free data" corpus.
--  3. video_view_history — a generic, video-id-keyed time series that ALL paths
--     append to (competitor sync included — fixing the leak where competitor
--     view history was overwritten on every sync).
--
-- Plus per-user daily lookup metering and a global daily guard so extension
-- traffic can never starve the core daily-sync quota.

-- ── 1. Shared channel median cache ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_median_cache (
  youtube_channel_id TEXT PRIMARY KEY,
  median_rate        DOUBLE PRECISION NOT NULL,   -- median views-per-day
  subscriber_count   BIGINT,
  video_count        INT,
  channel_title      TEXT,
  thumbnail_url      TEXT,
  computed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Write-through corpus of scored videos (public metrics only) ───────────
CREATE TABLE IF NOT EXISTS discovered_videos (
  youtube_video_id   TEXT PRIMARY KEY,
  youtube_channel_id TEXT,
  title              TEXT,
  thumbnail_url      TEXT,
  published_at       TIMESTAMPTZ,
  view_count         BIGINT NOT NULL DEFAULT 0,
  like_count         BIGINT NOT NULL DEFAULT 0,
  comment_count      BIGINT NOT NULL DEFAULT 0,
  duration_seconds   INT,
  outlier_score      DOUBLE PRECISION,
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_discovered_videos_channel ON discovered_videos(youtube_channel_id);

-- ── 3. Generic per-video view time series (own + competitor + discovered) ────
CREATE TABLE IF NOT EXISTS video_view_history (
  id                 BIGSERIAL PRIMARY KEY,
  youtube_video_id   TEXT NOT NULL,
  view_count         BIGINT NOT NULL,
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_view_history_video ON video_view_history(youtube_video_id, captured_at DESC);

-- These three tables hold only public YouTube metrics (no user identity), so
-- they are readable by the service role only; no per-user RLS needed. Enable
-- RLS with no policy = locked to service role, which the server uses.
ALTER TABLE channel_median_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_videos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_view_history   ENABLE ROW LEVEL SECURITY;

-- ── Per-user daily extension metering (new-channel lookups) ──────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extension_lookups_used INT NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extension_lookups_reset_at TIMESTAMPTZ NOT NULL
  DEFAULT (date_trunc('day', now()) + interval '1 day');

-- ── Global daily guard (protects the core sync quota) ────────────────────────
CREATE TABLE IF NOT EXISTS extension_quota_usage (
  day                  DATE PRIMARY KEY,
  new_channel_lookups  INT NOT NULL DEFAULT 0
);
ALTER TABLE extension_quota_usage ENABLE ROW LEVEL SECURITY;
