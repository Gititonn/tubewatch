# TubeWatch — Feature Build Brief

## What TubeWatch Is
A SaaS tool for YouTube creators to find "outlier" videos — videos that massively outperformed a channel's average. Users add competitor channels, TubeWatch surfaces the videos that broke through, and creators reverse-engineer the winning format to apply to their own content.

**Competitive positioning:** Viewstats (MrBeast's tool) charges $49.99/mo, crashes constantly, and is nearly useless for channels under 10K subs. VidIQ/TubeBuddy are slow browser extensions that dump data without insight. TubeWatch's edge: web app (no extension), works for any channel size, and actually explains WHY videos win (AI synthesis, not just numbers).

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
    dashboard/            ← main dashboard (self-channel stats, analytics chart)
    videos/               ← per-video list with outlier scores
    outlier/              ← outlier score view for own channel + AI insight button
    compare/              ← side-by-side comparison of up to 4 channels
    competitors/          ← competitor channel tracker (BUILT)
    competitors/outliers/ ← outlier feed across all tracked competitors (BUILT)
    settings/             ← Google OAuth connect for own channel
    layout.tsx            ← dashboard shell with sidebar nav
  api/
    youtube/
      sync/               ← syncs own channel data
      analytics/          ← YouTube Analytics API
      compare/            ← compare channels
      transcript/         ← fetches video transcripts
      connect/            ← YouTube OAuth connect
    auth/google/          ← OAuth connect/callback for own channel analytics
    competitors/          ← search, channels CRUD, sync, outlier feed (BUILT)
    ai/outlier-insight/   ← AI insight streaming (Anthropic, BUILT)
    cron/sync/            ← background sync
    stripe/               ← checkout, portal, webhook (scaffolded)
  page.tsx                ← landing page
lib/
  supabase/
    client.ts
    server.ts
  google-token.ts         ← manages stored OAuth tokens
supabase/
  migrations/             ← SQL migration files
```

## Existing Supabase Tables
- `channels` — user's own YouTube channels
- `videos` — videos from own channels
- `user_google_tokens` — stored OAuth tokens for YouTube Analytics API
- `competitor_channels` — competitor channels being tracked (BUILT + MIGRATED)
- `competitor_videos` — cached videos from competitor channels with outlier scores (BUILT + MIGRATED)

## Already Built — DO NOT REBUILD
The following are complete and working:
- `/competitors` page and all `/api/competitors/*` routes
- `/competitors/outliers` page
- `/outlier` page with AI insight (uses `/api/ai/outlier-insight`)
- `/compare` page
- All YouTube Analytics OAuth flow
- Supabase migration for competitor_channels and competitor_videos

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

---

## NEW FEATURES TO BUILD (Phase 2)

Use subagents to build these in parallel where possible.

---

### Feature 1: Trending Videos & Shorts Page

**Page:** `app/(dashboard)/trending/page.tsx`
**API:** `app/api/trending/route.ts`
**Nav:** Add "Trending" (📈) link to sidebar in `app/(dashboard)/layout.tsx`

#### API Route
`GET /api/trending?type=videos|shorts&regionCode=US&categoryId=&limit=25`

Call YouTube Data API v3:
```
GET https://www.googleapis.com/youtube/v3/videos
  ?part=snippet,statistics,contentDetails
  &chart=mostPopular
  &regionCode={regionCode}
  &videoCategoryId={categoryId}
  &maxResults=25
  &key={YOUTUBE_API_KEY}
```

For Shorts filter: after fetching, filter results where `contentDetails.duration` parses to ≤ 60 seconds (use `iso8601` duration parsing).

Quota cost: 1 unit per call. Very cheap.

#### UI
- Two tabs: **Videos** | **Shorts**
- Region selector: US, GB, CA, AU, IN, BR (dropdown)
- Category filter: All, Gaming (20), Music (10), Entertainment (24), How-to (26), Sports (17), News (25)
- Video cards: thumbnail, title, channel name, view count, published time, "Track Channel" button
- "Track Channel" button → calls `POST /api/competitors/channels` to add that channel to their competitor list instantly
- Empty/error state if API key not set

---

### Feature 2: "Why It Worked" AI Analysis

This is TubeWatch's key differentiator. Every competitor tool shows numbers — none explain the WHY.

**Page addition:** Add a "Why It Worked" button to each video card on `/competitors/outliers` page.
**API:** `app/api/ai/why-it-worked/route.ts`

#### API Route
`POST /api/ai/why-it-worked`
Body: `{ videoId, title, viewCount, outlierScore, channelName, publishedAt }`

Steps:
1. Fetch transcript via `YoutubeTranscript.fetchTranscript(videoId)` (already have this package)
2. If transcript available, send to Anthropic claude-3-5-haiku with a prompt analyzing:
   - Hook (first 30 seconds of transcript)
   - Title formula (numbered list? curiosity gap? emotion word?)
   - Video structure patterns
   - What made it shareable
3. If no transcript, analyze just from title + metadata
4. Stream the response back

Use `ANTHROPIC_API_KEY` from env (already configured).

Prompt template:
```
You are a YouTube strategy expert. Analyze why this video massively outperformed its channel average.

Video: "{title}"
Channel: {channelName}
Views: {viewCount} ({outlierScore}x the channel's median)
Published: {publishedAt}
Transcript excerpt (first 500 words): {transcriptExcerpt}

In 3-4 short paragraphs, explain:
1. **The Hook** — what grabbed attention in the title and opening
2. **The Formula** — what content/structural pattern this follows
3. **Why It Spread** — emotional or shareability factors
4. **Steal This** — one concrete thing a creator should copy in their next video

Be specific and tactical, not generic.
```

#### UI
- "🧠 Why It Worked" button on each outlier video card
- Opens a slide-out panel or modal (don't navigate away)
- Streams the AI response in with a typewriter effect
- Show a spinner while fetching transcript + generating
- Cache result in component state so re-clicking doesn't re-fetch

---

### Feature 3: Rising Channels Radar

Surface small channels (under 100K subs) that are producing outlier videos RIGHT NOW — before they blow up. This is the "spot the next MrBeast early" feature that no competitor offers.

**Page:** `app/(dashboard)/rising/page.tsx`
**API:** `app/api/rising/route.ts`
**Nav:** Add "Rising" (🚀) link to sidebar

#### How It Works
This requires no new external API — it queries the existing `competitor_videos` and `competitor_channels` tables that all users contribute to collectively. Since every TubeWatch user tracks different channels, the aggregate database surfaces rising talent across the platform.

`GET /api/rising?minScore=3&maxSubscribers=100000&limit=30`

```sql
SELECT 
  cv.title,
  cv.youtube_video_id,
  cv.thumbnail_url,
  cv.view_count,
  cv.outlier_score,
  cv.published_at,
  cc.channel_name,
  cc.channel_handle,
  cc.thumbnail_url as channel_thumbnail,
  cc.subscriber_count
FROM competitor_videos cv
JOIN competitor_channels cc ON cv.competitor_channel_id = cc.id
WHERE cv.outlier_score >= 3
  AND cc.subscriber_count <= 100000
  AND cv.published_at >= NOW() - INTERVAL '30 days'
ORDER BY cv.outlier_score DESC
LIMIT 30
```

Note: This query reads across all users' tracked channels (no RLS filter on read for aggregate feed). Add a note that in production this becomes a powerful network effect — the more users, the better the radar.

#### UI
- Max subscribers slider: 10K / 50K / 100K / 500K
- Min outlier score: 3x / 5x / 10x
- Time range: Last 7 days / 30 days / 90 days
- Video cards same as outlier feed
- "Track Channel" button on each card
- Tagline: "Channels blowing up before everyone else finds them"

---

### Feature 4: Title & Hook Pattern Library

Across all competitor videos in the database, surface which title patterns and structures correlate with the highest outlier scores. Turns raw data into strategic insight.

**Page:** `app/(dashboard)/patterns/page.tsx`
**API:** `app/api/patterns/route.ts`
**Nav:** Add "Patterns" (🎯) link to sidebar

#### API Route
`GET /api/patterns?channelId=&minVideos=5`

This is a pure Supabase query — no YouTube API cost.

Fetch all competitor videos for this user, then analyze title patterns server-side:

```typescript
// Pattern detection functions to run on video titles:
const patterns = [
  { name: "Numbered list", regex: /^\d+\s/i },
  { name: "How to", regex: /^how to/i },
  { name: "Why", regex: /^why/i },
  { name: "I did X for Y days", regex: /\d+\s*(days?|hours?|weeks?|months?)/i },
  { name: "Vs / Versus", regex: /\bvs\.?\b|\bversus\b/i },
  { name: "Challenge", regex: /\bchallenge\b/i },
  { name: "Reaction", regex: /\breact(ion|ing)?\b/i },
  { name: "Story / Storytime", regex: /\bstory(time)?\b/i },
  { name: "Question hook (?)", regex: /\?/ },
  { name: "ALL CAPS word", regex: /[A-Z]{3,}/ },
]

// For each pattern, calculate:
// - matchCount: how many videos match
// - avgOutlierScore: average outlier score of matching videos
// - topVideo: highest outlier score video with this pattern
```

Return patterns sorted by avgOutlierScore DESC.

#### UI
- Filter by: All tracked channels / specific channel
- Pattern cards showing:
  - Pattern name (e.g. "Numbered list")
  - Avg outlier score badge (e.g. "4.2x avg")
  - Match count (e.g. "12 videos")
  - Example: best-performing video with this pattern
  - Mini bar showing score vs overall average
- Summary insight at top: "For your tracked channels, **numbered lists** outperform the average by 3.1x"
- Empty state: "Add and sync competitor channels to build your pattern library"

---

## Supabase Migration for Phase 2

Create `supabase/migrations/20260626_phase2.sql`:

```sql
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
```

Run this in Supabase SQL editor before Claude Code builds the trending feature.

---

## Navigation — Final Sidebar Order
Update `app/(dashboard)/layout.tsx` sidebar to:
```
⊞  Dashboard        /dashboard
▶  Videos           /videos
📈  Trending         /trending        ← NEW
🚀  Rising           /rising          ← NEW
⚡  Competitors      /competitors
🔥  Outliers         /competitors/outliers
🎯  Patterns         /patterns        ← NEW
⭐  Outlier Score    /outlier
⚖  Compare         /compare
⚙  Settings        /settings
```

---

## Priority Order for Subagents
Run these in parallel:
1. **Subagent A:** Trending page + API + trending_cache migration
2. **Subagent B:** "Why It Worked" AI modal on outliers page + `/api/ai/why-it-worked` route
3. **Subagent C:** Rising Channels Radar page + API
4. **Subagent D:** Patterns page + API

Each subagent should update the sidebar navigation after completing their page.
