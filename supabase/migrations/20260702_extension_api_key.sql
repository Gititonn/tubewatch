-- Per-user API key for the browser extension (P-extension).
-- The extension stores this key locally and sends it as a Bearer token to the
-- extension API; the server looks the user up by key. Nullable + generated on
-- demand from Settings, so existing users are unaffected until they opt in.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extension_api_key TEXT UNIQUE;

-- Fast lookup by key on every extension request. (UNIQUE already creates an
-- index in Postgres, but this is explicit and idempotent.)
CREATE INDEX IF NOT EXISTS idx_profiles_extension_api_key
  ON profiles(extension_api_key)
  WHERE extension_api_key IS NOT NULL;
