import { createServiceClient } from "@/lib/supabase/server";
import { getChannelVideos, parseDurationToSeconds, YouTubeApiError } from "@/lib/youtube";
import { calculateOutlierScores, channelBaseline } from "@/lib/outlier";
import {
  fetchGlobalBaselines,
  fetchOwnBaselines,
  recentRates,
  velocityOf,
} from "@/lib/velocity";
import type { Video } from "@/lib/types";

export type SyncResult =
  | { synced: number }
  | { error: string; status: number };

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Sync a channel's videos from YouTube and recompute outlier scores.
 * Uses the service-role client (RLS-bypassing) for writes, so callers MUST
 * verify ownership before invoking. Shared by the user-facing route (with
 * cooldown) and the daily cron (without).
 */
export async function syncChannel(
  channelDbId: string,
  youtubeChannelId: string,
  opts: { enforceCooldown?: boolean } = {}
): Promise<SyncResult> {
  const supabase = createServiceClient();

  if (opts.enforceCooldown) {
    const { data: channelRow } = await supabase
      .from("channels")
      .select("last_synced_at")
      .eq("id", channelDbId)
      .single();

    if (channelRow?.last_synced_at) {
      const elapsed = Date.now() - new Date(channelRow.last_synced_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        const minutesLeft = Math.ceil((COOLDOWN_MS - elapsed) / 60_000);
        return {
          error: `Sync cooldown active. Try again in ${minutesLeft} min.`,
          status: 429,
        };
      }
    }
  }

  let ytVideos;
  try {
    ytVideos = await getChannelVideos(youtubeChannelId);
  } catch (err) {
    // Return, don't throw: this fn is called both directly (manual resync,
    // where an uncaught throw would 500 with no message) and via
    // Promise.allSettled in the daily cron (where a throw was previously
    // invisible as a bare "rejected" settlement with no error detail).
    if (err instanceof YouTubeApiError) {
      return { error: err.message, status: err.reason === "quota_exceeded" ? 503 : err.status };
    }
    return { error: "Couldn't reach YouTube. Please try again.", status: 503 };
  }
  if (!ytVideos || ytVideos.length === 0) return { synced: 0 };

  const rawVideos: Omit<Video, "id" | "updated_at">[] = ytVideos.map((v) => ({
    channel_id: channelDbId,
    youtube_video_id: v.id!,
    title: v.snippet?.title ?? null,
    published_at: v.snippet?.publishedAt ?? null,
    view_count: parseInt(v.statistics?.viewCount ?? "0"),
    like_count: parseInt(v.statistics?.likeCount ?? "0"),
    comment_count: parseInt(v.statistics?.commentCount ?? "0"),
    duration_seconds: v.contentDetails?.duration
      ? parseDurationToSeconds(v.contentDetails.duration)
      : null,
    thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? null,
    outlier_score: null,
  }));

  const withScores = calculateOutlierScores(rawVideos as Video[]);

  // Snapshot-powered recent velocity: views gained/day since the ~48h-old
  // baseline snapshot, over the same median denominator as outlier_score.
  // Empty baselines (first days of a channel, migration not applied) just
  // leave the velocity columns null.
  const baselines = await fetchOwnBaselines(
    supabase,
    channelDbId,
    withScores.map((v) => v.youtube_video_id)
  );
  const rates = recentRates(withScores, baselines);
  const medians = channelBaseline(withScores);

  const { error } = await supabase.from("videos").upsert(
    withScores.map((v) => ({
      ...v,
      ...velocityOf(v.youtube_video_id, rates, medians.rateFor(v)),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "channel_id,youtube_video_id" }
  );

  if (error) return { error: error.message, status: 500 };

  // Best-effort: capture a point-in-time view snapshot per video so we build the
  // time series needed for future first-48h velocity scoring. Never fail the
  // sync over this (e.g. if the migration hasn't landed yet).
  const { error: snapErr } = await supabase.from("video_snapshots").insert(
    withScores.map((v) => ({
      channel_id: channelDbId,
      youtube_video_id: v.youtube_video_id,
      view_count: v.view_count,
    }))
  );
  if (snapErr) console.warn("video_snapshots insert skipped:", snapErr.message);

  await supabase
    .from("channels")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", channelDbId);

  return { synced: withScores.length };
}

/**
 * Per-run cache for competitor syncs. The same YouTube channel is often
 * tracked by many users (one competitor_channels row each); within a cron run
 * this makes it one YouTube fetch and one snapshot append instead of N.
 */
export interface CompetitorSyncCache {
  videosByChannel: Map<string, Awaited<ReturnType<typeof getChannelVideos>>>;
  snapshottedVideoIds: Set<string>;
}

export function createCompetitorSyncCache(): CompetitorSyncCache {
  return { videosByChannel: new Map(), snapshottedVideoIds: new Set() };
}

export type CompetitorSyncResult =
  | { synced: number; median: number }
  | { error: string; status: number };

/**
 * Sync one competitor_channels row: fetch videos, score (lifetime outlier +
 * snapshot velocity), upsert, append view snapshots, update channel stats.
 * Service-role writes — callers MUST verify the row is visible to the acting
 * user (or be the cron). Shared by the manual sync route and the daily cron;
 * before the cron called this, competitor snapshots only accumulated when a
 * user happened to click sync, which starved the velocity time series for the
 * exact pool the product is about.
 */
export async function syncCompetitorChannel(
  competitorChannelDbId: string,
  youtubeChannelId: string,
  cache: CompetitorSyncCache = createCompetitorSyncCache()
): Promise<CompetitorSyncResult> {
  const svc = createServiceClient();

  let ytVideos = cache.videosByChannel.get(youtubeChannelId);
  if (!ytVideos) {
    try {
      ytVideos = await getChannelVideos(youtubeChannelId, 50);
    } catch (err) {
      if (err instanceof YouTubeApiError) {
        return { error: err.message, status: err.reason === "quota_exceeded" ? 503 : err.status };
      }
      return { error: "Couldn't reach YouTube. Please try again.", status: 503 };
    }
    cache.videosByChannel.set(youtubeChannelId, ytVideos);
  }
  if (!ytVideos || ytVideos.length === 0) return { synced: 0, median: 0 };

  const rawVideos = ytVideos.map((v) => ({
    competitor_channel_id: competitorChannelDbId,
    youtube_video_id: v.id!,
    title: v.snippet?.title ?? "Untitled",
    thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? null,
    published_at: v.snippet?.publishedAt ?? null,
    view_count: parseInt(v.statistics?.viewCount ?? "0"),
    like_count: parseInt(v.statistics?.likeCount ?? "0"),
    comment_count: parseInt(v.statistics?.commentCount ?? "0"),
    duration_seconds: v.contentDetails?.duration
      ? parseDurationToSeconds(v.contentDetails.duration)
      : null,
    outlier_score: null as number | null,
    fetched_at: new Date().toISOString(),
  }));

  const withScores = calculateOutlierScores(rawVideos);

  const globalBaselines = await fetchGlobalBaselines(
    svc,
    withScores.map((v) => v.youtube_video_id)
  );
  const rates = recentRates(withScores, globalBaselines);
  const medians = channelBaseline(withScores);

  const { error: upsertError } = await svc.from("competitor_videos").upsert(
    withScores.map((v) => ({
      ...v,
      ...velocityOf(v.youtube_video_id, rates, medians.rateFor(v)),
    })),
    { onConflict: "competitor_channel_id,youtube_video_id" }
  );
  if (upsertError) return { error: upsertError.message, status: 500 };

  // Append today's snapshot to the global time series (best-effort, deduped
  // per run — several rows can point at the same YouTube channel).
  const fresh = withScores.filter((v) => !cache.snapshottedVideoIds.has(v.youtube_video_id));
  if (fresh.length > 0) {
    const { error: snapErr } = await svc.from("video_view_history").insert(
      fresh.map((v) => ({ youtube_video_id: v.youtube_video_id, view_count: v.view_count }))
    );
    if (snapErr) {
      console.warn("video_view_history insert skipped:", snapErr.message);
    } else {
      fresh.forEach((v) => cache.snapshottedVideoIds.add(v.youtube_video_id));
    }
  }

  // median_views stays a simple raw-view median — it's a display stat on the
  // Competitors page ("Median: X views"), not the scoring input.
  const views = rawVideos.map((v) => v.view_count).sort((a, b) => a - b);
  const mid = Math.floor(views.length / 2);
  const median =
    views.length % 2 !== 0 ? views[mid] : (views[mid - 1] + views[mid]) / 2;

  await svc
    .from("competitor_channels")
    .update({
      median_views: Math.round(median),
      video_count: ytVideos.length,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", competitorChannelDbId);

  return { synced: withScores.length, median };
}
