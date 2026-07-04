-- Perf: cross-channel outlier queries could not use any index.
--
-- The only competitor_videos index was idx_competitor_videos_outlier
-- (competitor_channel_id, outlier_score DESC) — leading column
-- competitor_channel_id. The /rising and /competitors/outliers feeds filter/
-- sort by outlier_score across ALL channels (no competitor_channel_id
-- predicate), so that index was unusable and every request did a full table
-- scan of competitor_videos — growing unbounded with the discovery pool.

-- Serves: WHERE outlier_score >= X [AND published_at >= Y] ORDER BY
-- outlier_score DESC LIMIT n  (the /rising and /outliers hot paths).
CREATE INDEX IF NOT EXISTS idx_competitor_videos_outlier_recent
  ON competitor_videos (outlier_score DESC, published_at DESC);

-- The /outliers title-search branch uses ILIKE '%q%', which cannot use a
-- btree index and falls back to a sequential scan. A trigram GIN index makes
-- substring search index-backed.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_competitor_videos_title_trgm
  ON competitor_videos USING gin (title gin_trgm_ops);
