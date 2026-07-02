import { createServiceClient } from "@/lib/supabase/server";
import { getVideosByIds, getChannelVideos, parseDurationToSeconds } from "@/lib/youtube";
import { channelMedianRate, scoreAgainstRate, type ScorableVideo } from "@/lib/outlier";

/**
 * Shared scoring core for the browser extension and search-any-channel page.
 *
 * Cost ladder, cheapest first:
 *   1. discovered_videos  — anything we scored recently (free, our own corpus)
 *   2. competitor_videos / videos — channels a user already tracks/owns (free)
 *   3. on-demand YouTube  — batched videos.list + a per-channel median that is
 *      cached (channel_median_cache) so it's paid once and reused for days
 *
 * Every on-demand result is written through to discovered_videos +
 * video_view_history + channel_median_cache, so coverage and the view-history
 * time series compound for free as users browse. Only public video/channel
 * metrics are stored — never who looked at what.
 */

export type VideoScore = {
  youtube_video_id: string;
  youtube_channel_id: string | null;
  channel_title: string | null;
  title: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  outlier_score: number | null;
  source: "known" | "discovered" | "live";
};

const DISCOVERED_TTL_MS = 24 * 60 * 60 * 1000; // re-score a browsed video at most daily
const MEDIAN_TTL_MS = 3 * 24 * 60 * 60 * 1000; // recompute a channel median every ~3 days
const MAX_IDS = 50;

type KnownRow = {
  youtube_video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  duration_seconds: number | null;
  outlier_score: number | null;
};

function fromKnown(r: KnownRow, source: "known" | "discovered", channelId: string | null, channelTitle: string | null): VideoScore {
  return {
    youtube_video_id: r.youtube_video_id,
    youtube_channel_id: channelId,
    channel_title: channelTitle,
    title: r.title,
    thumbnail_url: r.thumbnail_url,
    published_at: r.published_at,
    view_count: r.view_count ?? 0,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
    duration_seconds: r.duration_seconds,
    outlier_score: r.outlier_score,
    source,
  };
}

/**
 * Score a set of video ids. `newChannelBudget` caps how many *uncached*
 * channel medians we're allowed to compute (each costs YouTube quota); the
 * caller derives it from the user's plan and the global daily guard, and reads
 * back `newChannelLookups` to meter usage.
 */
export async function scoreVideoIds(
  rawIds: string[],
  newChannelBudget: number
): Promise<{ results: VideoScore[]; newChannelLookups: number }> {
  const svc = createServiceClient();
  const ids = Array.from(new Set(rawIds.filter(Boolean))).slice(0, MAX_IDS);
  if (ids.length === 0) return { results: [], newChannelLookups: 0 };

  const out = new Map<string, VideoScore>();
  const now = Date.now();

  // 1. discovered_videos (fresh only)
  const { data: disc } = await svc
    .from("discovered_videos")
    .select("*")
    .in("youtube_video_id", ids);
  for (const d of disc ?? []) {
    if (now - new Date(d.fetched_at).getTime() < DISCOVERED_TTL_MS) {
      out.set(d.youtube_video_id, fromKnown(d as KnownRow, "discovered", d.youtube_channel_id ?? null, d.channel_title ?? null));
    }
  }

  // 2. tracked competitor videos, then own videos
  const knownCols = "youtube_video_id, title, thumbnail_url, published_at, view_count, like_count, comment_count, duration_seconds, outlier_score";
  for (const table of ["competitor_videos", "videos"] as const) {
    const need = ids.filter((id) => !out.has(id));
    if (need.length === 0) break;
    const { data } = await svc.from(table).select(knownCols).in("youtube_video_id", need);
    for (const r of (data ?? []) as KnownRow[]) {
      if (!out.has(r.youtube_video_id)) out.set(r.youtube_video_id, fromKnown(r, "known", null, null));
    }
  }

  // 3. on-demand for whatever's still unknown
  const unknown = ids.filter((id) => !out.has(id));
  let newChannelLookups = 0;

  if (unknown.length > 0 && newChannelBudget > 0) {
    const vids = await getVideosByIds(unknown);

    // group fetched videos by channel
    const byChannel = new Map<string, string[]>(); // channelId -> videoIds
    for (const v of vids) {
      const ch = v.snippet?.channelId;
      if (ch && v.id) byChannel.set(ch, [...(byChannel.get(ch) ?? []), v.id]);
    }

    // resolve a median rate per channel (cache-first, then compute within budget)
    const channelIds = Array.from(byChannel.keys());
    const { data: cachedRows } = channelIds.length
      ? await svc.from("channel_median_cache").select("*").in("youtube_channel_id", channelIds)
      : { data: [] };
    const cache = new Map((cachedRows ?? []).map((r) => [r.youtube_channel_id as string, r]));

    const rateByChannel = new Map<string, number>();
    const titleByChannel = new Map<string, string | null>();
    for (const ch of channelIds) {
      const cr = cache.get(ch);
      if (cr && now - new Date(cr.computed_at).getTime() < MEDIAN_TTL_MS) {
        rateByChannel.set(ch, cr.median_rate);
        titleByChannel.set(ch, cr.channel_title ?? null);
        continue;
      }
      if (newChannelLookups >= newChannelBudget) continue; // out of budget: skip
      try {
        const chVids = await getChannelVideos(ch, 50);
        const scorables: ScorableVideo[] = chVids.map((cv) => ({
          view_count: parseInt(cv.statistics?.viewCount ?? "0"),
          published_at: cv.snippet?.publishedAt ?? null,
        }));
        const mr = channelMedianRate(scorables);
        const chTitle = chVids[0]?.snippet?.channelTitle ?? null;
        rateByChannel.set(ch, mr);
        titleByChannel.set(ch, chTitle);
        newChannelLookups++;
        await svc.from("channel_median_cache").upsert(
          {
            youtube_channel_id: ch,
            median_rate: mr,
            video_count: chVids.length,
            channel_title: chTitle,
            computed_at: new Date().toISOString(),
          },
          { onConflict: "youtube_channel_id" }
        );
      } catch {
        // YouTube hiccup on this channel: its videos just go unscored.
      }
    }

    // score + write-through
    const discoveredRows: Record<string, unknown>[] = [];
    const historyRows: Record<string, unknown>[] = [];
    for (const v of vids) {
      if (!v.id) continue;
      const ch = v.snippet?.channelId ?? null;
      const view_count = parseInt(v.statistics?.viewCount ?? "0");
      const published_at = v.snippet?.publishedAt ?? null;
      const mr = ch ? rateByChannel.get(ch) : undefined;
      const score = mr != null ? scoreAgainstRate({ view_count, published_at }, mr) : null;
      const rec: VideoScore = {
        youtube_video_id: v.id,
        youtube_channel_id: ch,
        channel_title: (ch && titleByChannel.get(ch)) || v.snippet?.channelTitle || null,
        title: v.snippet?.title ?? null,
        thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? null,
        published_at,
        view_count,
        like_count: parseInt(v.statistics?.likeCount ?? "0"),
        comment_count: parseInt(v.statistics?.commentCount ?? "0"),
        duration_seconds: v.contentDetails?.duration ? parseDurationToSeconds(v.contentDetails.duration) : null,
        outlier_score: score,
        source: "live",
      };
      out.set(v.id, rec);
      discoveredRows.push({
        youtube_video_id: rec.youtube_video_id,
        youtube_channel_id: ch,
        title: rec.title,
        thumbnail_url: rec.thumbnail_url,
        published_at,
        view_count,
        like_count: rec.like_count,
        comment_count: rec.comment_count,
        duration_seconds: rec.duration_seconds,
        outlier_score: score,
        fetched_at: new Date().toISOString(),
      });
      historyRows.push({ youtube_video_id: rec.youtube_video_id, view_count });
    }
    if (discoveredRows.length) await svc.from("discovered_videos").upsert(discoveredRows, { onConflict: "youtube_video_id" });
    if (historyRows.length) await svc.from("video_view_history").insert(historyRows);
  }

  return { results: Array.from(out.values()), newChannelLookups };
}
