-- Niche category on tracked competitor channels, so the Outlier Feed can be
-- filtered to a creator's own niche (movies/trailers, gaming, education,
-- finance, DIY, etc.) instead of showing every tracked channel mixed together.
ALTER TABLE competitor_channels
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

-- Keep the allowed values in sync with lib/categories.ts.
ALTER TABLE competitor_channels
  ADD CONSTRAINT competitor_channels_category_check
  CHECK (category IN (
    'movies_trailers',
    'gaming',
    'education',
    'finance_business',
    'diy_home',
    'tech_reviews',
    'beauty_fashion',
    'fitness_health',
    'food_cooking',
    'comedy_entertainment',
    'music',
    'vlogs_lifestyle',
    'other'
  ));

CREATE INDEX IF NOT EXISTS idx_competitor_channels_category
  ON competitor_channels(user_id, category);

-- Best-effort backfill: categorize any already-tracked movie/trailer studio
-- channels so existing users aren't stuck on "other" after this migration.
UPDATE competitor_channels
  SET category = 'movies_trailers'
  WHERE category = 'other'
    AND channel_name ILIKE ANY (ARRAY['%trailer%', '%pictures%', '%studios%', '%films%', 'Focus Features']);
