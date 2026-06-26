-- Google OAuth tokens for YouTube Analytics API access
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  youtube_channel_id TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own google tokens"
  ON user_google_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add sync tracking to channels table
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_video_published_at TIMESTAMPTZ;
