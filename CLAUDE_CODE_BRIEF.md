# TubeWatch — Competitor Intelligence Feature Brief

## What TubeWatch Is
A SaaS tool for YouTube creators to find "outlier" videos — videos that massively outperformed a channel's average. Users add competitor channels, TubeWatch surfaces the videos that broke through, and creators reverse-engineer the winning format to apply to their own content.

This is the CORE product goal. Self-channel analytics (YouTube Analytics API OAuth flow) already exists as a secondary feature.

## Tech Stack
- **Frontend/Backend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Database:** Supabase (Postgres + RLS)
- **Auth:** Supabase Auth (Google OAuth sign-in)
- **Hosting:** Vercel (domain: tubewatchhq.com)
- **YouTube data:** YouTube Data API v3 (public data, API key only — no competitor OAuth needed)

## Existing Codebase Structure
```
app/
  (dashboard)/
    dashboard/       ← main dashboard (self-channel stats)
    settings/        ← Google OAuth connect for own channel
    layout.tsx       ← dashboard shell with sidebar nav
  api/
    youtube/
      sync/          ← syncs own channel data
      transcript/    ← fetches video transcripts (just added)
    auth/
      google/        ← OAuth connect/callback for own channel analytics
  page.tsx           ← landing page
lib/
  supabase/
    client.ts
    server.ts
  google-token.ts    ← manages stored OAuth tokens
supabase/
  migrations/        ← SQL migration files
```

## Existing Supabase Tables
- `channels` — user's own YouTube channels
- `videos` — videos from own channels
- `user_google_tokens` — stored OAuth tokens for YouTube Analytics API

## What Needs to Be Built

### 1. Supabase Migration
Create file `supabase/migrations/20260626_competitor_intelligence.sql`:

```sql
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
```

Run this in the Supabase SQL editor at supabase.com (project: tswwecnfzmdbujisajhb).

### 2. Environment Variable Needed
Add to Vercel (and local .env.local):
```
YOUTUBE_API_KEY=<key from Google Cloud Console>
```
The YouTube Data API v3 must be enabled in Google Cloud project `gen-lang-client-0129776707`.
The user will handle enabling the API and adding the key — just reference `process.env.YOUTUBE_API_KEY` in code.

### 3. API Routes to Build

#### `app/api/competitors/search/route.ts` — Search for a channel
- `GET /api/competitors/search?q=<channel name or @handle or URL>`
- Calls YouTube Data API v3 `search.list` endpoint
- Returns: channelId, name, handle, thumbnail, subscriberCount
- Used in the "Add Channel" UI before saving

#### `app/api/competitors/channels/route.ts` — Manage tracked channels
- `POST /api/competitors/channels` — add a channel to track (saves to competitor_channels, triggers initial video fetch)
- `GET /api/competitors/channels` — list all channels user is tracking
- `DELETE /api/competitors/channels?id=<uuid>` — remove a channel

#### `app/api/competitors/channels/[channelId]/sync/route.ts` — Sync videos
- `POST` — fetches latest 50 videos from YouTube Data API v3 for this channel, upserts into competitor_videos, recalculates outlier scores and median, updates last_synced_at
- Outlier score = video.view_count / channel.median_views
- Use median (not mean) to avoid one viral video skewing results

#### `app/api/competitors/outliers/route.ts` — Get outlier feed
- `GET /api/competitors/outliers?minScore=3&limit=50`
- Returns top outlier videos across ALL channels the user tracks
- Sorted by outlier_score DESC
- Joins competitor_channels for channel name/thumbnail
- Optional filters: ?channelId=<uuid>, ?minScore=<number>

### 4. Outlier Score Calculation
```typescript
// When syncing a channel's videos:
const views = videos.map(v => v.view_count).sort((a, b) => a - b)
const mid = Math.floor(views.length / 2)
const median = views.length % 2 !== 0
  ? views[mid]
  : (views[mid - 1] + views[mid]) / 2

// For each video:
const outlierScore = median > 0 ? video.view_count / median : 0
```

### 5. UI Pages to Build

#### `app/(dashboard)/competitors/page.tsx` — Competitor Channels page
- List of tracked channels with: thumbnail, name, subscriber count, video count, median views, last synced, "Sync Now" button, delete button
- "Add Channel" button → opens search modal
- Search modal: type channel name/@handle → shows results → click to add

#### `app/(dashboard)/competitors/outliers/page.tsx` — Outlier Feed (main value page)
- Filter bar: All Channels / specific channel, Min Score (3x / 5x / 10x)
- Video cards showing:
  - Thumbnail (linked to YouTube)
  - Title
  - Channel name + avatar
  - View count (formatted: 1.2M)
  - Outlier score badge (e.g. "🔥 8.4x") — color coded (yellow 3x+, orange 5x+, red 10x+)
  - Published date
  - Like count, comment count
- Sort by: outlier score (default), views, date
- Empty state: "Add competitor channels to see outlier videos"

### 6. Navigation Update
Add to the sidebar in `app/(dashboard)/layout.tsx`:
- "Competitors" link → /competitors
- "Outliers" link → /competitors/outliers

## YouTube Data API v3 Endpoints to Use

**Search for a channel:**
```
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet&type=channel&q={query}&key={API_KEY}
```

**Get channel details (subscribers, video count):**
```
GET https://www.googleapis.com/youtube/v3/channels
  ?part=snippet,statistics&id={channelId}&key={API_KEY}
```

**Get channel's videos (use search with channelId, order by date):**
```
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet&channelId={id}&type=video&order=date&maxResults=50&key={API_KEY}
```

**Get video stats in bulk (up to 50 at once):**
```
GET https://www.googleapis.com/youtube/v3/videos
  ?part=statistics,contentDetails,snippet&id={id1,id2,...}&key={API_KEY}
```
Use this after the search to get actual view/like/comment counts. The search endpoint doesn't return statistics.

## Quota Notes
YouTube Data API v3 has a 10,000 unit/day quota.
- search.list costs 100 units
- videos.list costs 1 unit per video
- channels.list costs 1 unit
- Syncing one channel (50 videos) ≈ 101 units
- Be mindful — don't auto-sync too aggressively

## Current Auth Pattern
All API routes follow this pattern:
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

## Deployment
- Push to GitHub → Vercel auto-deploys
- Push script: `push.bat` in repo root
- Vercel project: tubewatch (team: tubewatch)
- Supabase project: tswwecnfzmdbujisajhb.supabase.co
