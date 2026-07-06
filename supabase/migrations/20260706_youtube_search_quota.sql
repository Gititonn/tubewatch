-- YouTube quota headroom before a traffic wave.
--
-- The YouTube Data API's default daily quota is 10,000 units. Nearly every
-- call in this app costs 1 unit (channels.list, playlistItems.list,
-- videos.list) — except search.list, which costs 100. And search.list fires
-- on ordinary user actions: once per channel connect (auto-suggest
-- competitors), once per manual "Add Channel" search, and as a fallback in
-- the similar-channels shelf. 100 signups in one day = 10,000 units = the
-- ENTIRE daily quota, before a single sync runs. A guard on just these calls
-- protects the whole app cheaply, since every other call site already
-- handles a YouTubeApiError("quota_exceeded") gracefully (connect shows a
-- friendly message; auto-suggest/similar-channels degrade silently as
-- best-effort).
CREATE TABLE IF NOT EXISTS youtube_search_quota (
  day         DATE PRIMARY KEY,
  units_used  INT NOT NULL DEFAULT 0
);

ALTER TABLE youtube_search_quota ENABLE ROW LEVEL SECURITY;
-- No policy = locked to service role, which is the only caller.

-- Atomically reserve `p_cost` units against `p_budget` for today. Row lock
-- serializes concurrent reservations the same way consume_ai_call serializes
-- AI-credit checks, so two requests can't both read "under budget" and both
-- proceed past it.
CREATE OR REPLACE FUNCTION reserve_youtube_search_quota(p_cost INT, p_budget INT)
RETURNS TABLE (ok BOOLEAN, units_used INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'utc')::date;
  v_used INT;
BEGIN
  INSERT INTO youtube_search_quota (day, units_used)
  VALUES (v_today, 0)
  ON CONFLICT (day) DO NOTHING;

  SELECT q.units_used INTO v_used
  FROM youtube_search_quota q
  WHERE q.day = v_today
  FOR UPDATE;

  IF v_used + p_cost > p_budget THEN
    RETURN QUERY SELECT false, v_used;
    RETURN;
  END IF;

  UPDATE youtube_search_quota SET units_used = v_used + p_cost WHERE day = v_today;
  RETURN QUERY SELECT true, v_used + p_cost;
END;
$$;

REVOKE ALL ON FUNCTION reserve_youtube_search_quota(int, int) FROM public;
GRANT EXECUTE ON FUNCTION reserve_youtube_search_quota(int, int) TO service_role;
