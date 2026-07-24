-- Public "3 videos to make next" front-door magic.
--
-- The un-gated /channel/[handle] page generates 3 concrete next-video concepts
-- for ANY channel with no login (the "let me try this" moment). To keep that
-- affordable and abuse-resistant, generations are cached per channel and
-- capped per IP per day. The route uses the service-role client, so both
-- tables stay locked (RLS on, no public policies).

-- One generated idea-set per channel. The concepts are derived from the
-- channel's breakouts, which move slowly, so a multi-day cache collapses every
-- repeat visit to that channel into a single generation. ideas is a JSON array
-- of { title, hook, why, basedOn }.
CREATE TABLE IF NOT EXISTS channel_next_ideas (
  youtube_channel_id TEXT PRIMARY KEY,
  handle             TEXT,
  channel_title      TEXT,
  ideas              JSONB NOT NULL,
  model              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-IP daily counter — only cache-MISS generations count against it, so a
-- crawler can't run up AI/YouTube cost by enumerating channels. Best-effort;
-- a missing row simply means "no usage yet today".
CREATE TABLE IF NOT EXISTS public_ai_rate (
  ip           TEXT NOT NULL,
  day          DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count        INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, day)
);

ALTER TABLE channel_next_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_rate     ENABLE ROW LEVEL SECURITY;
-- No policies: reads and writes happen only through the service-role client in
-- app/api/ai/next-videos, never from the browser.
