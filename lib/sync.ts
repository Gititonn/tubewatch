import { createServiceClient } from "@/lib/supabase/server";
import { getChannelVideos, parseDurationToSeconds } from "@/lib/youtube";
import { calculateOutlierScores } from "@/lib/outlier";
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

  const ytVideos = await getChannelVideos(youtubeChannelId);
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

  const { error } = await supabase.from("videos").upsert(
    withScores.map((v) => ({ ...v, updated_at: new Date().toISOString() })),
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
