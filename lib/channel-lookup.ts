import { createServiceClient } from "@/lib/supabase/server";
import { getChannelByHandle, getChannelVideos, parseDurationToSeconds } from "@/lib/youtube";
import { calculateOutlierScores, channelBaseline, channelMedianRate } from "@/lib/outlier";
import { fetchGlobalBaselines, recentRates, velocityOf } from "@/lib/velocity";

/**
 * Search-any-channel analytics (#3). Resolve a handle → the channel's recent
 * videos with outlier scores, DB-first (served free from the write-through
 * corpus when we've seen the channel recently) then on-demand from YouTube,
 * persisting everything so repeat views and the extension both benefit. Powers
 * the public /channel/[handle] page — no login required.
 */

export type ChannelVideo = {
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  outlier_score: number | null;
  recent_views_per_day?: number | null;
  velocity_ratio?: number | null;
};

export type ChannelMeta = {
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number;
  video_count: number;
  description: string | null;
};

export type ChannelAnalytics =
  | { found: false }
  | { found: true; channel: ChannelMeta; videos: ChannelVideo[] };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // serve from DB if scored within 6h

type DiscoveredRow = {
  youtube_video_id: string;
  title: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  duration_seconds: number | null;
  outlier_score: number | null;
  recent_views_per_day: number | null;
  velocity_ratio: number | null;
};

function mapRow(r: DiscoveredRow): ChannelVideo {
  return {
    youtube_video_id: r.youtube_video_id,
    title: r.title ?? "Untitled",
    thumbnail_url: r.thumbnail_url,
    published_at: r.published_at,
    view_count: r.view_count ?? 0,
    like_count: r.like_count ?? 0,
    comment_count: r.comment_count ?? 0,
    duration_seconds: r.duration_seconds,
    outlier_score: r.outlier_score,
    recent_views_per_day: r.recent_views_per_day,
    velocity_ratio: r.velocity_ratio,
  };
}

// Highest outlier score first; nulls (too-young / unscored) last.
function byScore(a: ChannelVideo, b: ChannelVideo): number {
  return (b.outlier_score ?? -1) - (a.outlier_score ?? -1);
}

export async function getChannelAnalytics(handle: string): Promise<ChannelAnalytics> {
  const svc = createServiceClient();

  const ch = await getChannelByHandle(handle);
  if (!ch || !ch.id) return { found: false };
  const channelId = ch.id;

  const channel: ChannelMeta = {
    youtube_channel_id: channelId,
    title: ch.snippet?.title ?? handle,
    handle: ch.snippet?.customUrl ?? null,
    thumbnail_url: ch.snippet?.thumbnails?.medium?.url ?? null,
    subscriber_count: parseInt(ch.statistics?.subscriberCount ?? "0"),
    video_count: parseInt(ch.statistics?.videoCount ?? "0"),
    description: ch.snippet?.description ?? null,
  };

  // DB-first: recently-scored → serve from the corpus, no video fetch.
  const { data: cache } = await svc
    .from("channel_median_cache")
    .select("computed_at")
    .eq("youtube_channel_id", channelId)
    .single();
  if (cache && Date.now() - new Date(cache.computed_at).getTime() < CACHE_TTL_MS) {
    const { data: rows } = await svc
      .from("discovered_videos")
      .select("youtube_video_id, title, thumbnail_url, published_at, view_count, like_count, comment_count, duration_seconds, outlier_score, recent_views_per_day, velocity_ratio")
      .eq("youtube_channel_id", channelId)
      .limit(50);
    if (rows && rows.length > 0) {
      return { found: true, channel, videos: (rows as DiscoveredRow[]).map(mapRow).sort(byScore) };
    }
  }

  // On-demand: fetch, score, persist (write-through).
  const yt = await getChannelVideos(channelId, 50);
  const raw: ChannelVideo[] = yt
    .filter((v) => v.id)
    .map((v) => ({
      youtube_video_id: v.id as string,
      title: v.snippet?.title ?? "Untitled",
      thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? null,
      published_at: v.snippet?.publishedAt ?? null,
      view_count: parseInt(v.statistics?.viewCount ?? "0"),
      like_count: parseInt(v.statistics?.likeCount ?? "0"),
      comment_count: parseInt(v.statistics?.commentCount ?? "0"),
      duration_seconds: v.contentDetails?.duration ? parseDurationToSeconds(v.contentDetails.duration) : null,
      outlier_score: null,
    }));
  const scored = calculateOutlierScores(raw);

  // Snapshot velocity for the write-through corpus too — the public channel
  // page and the extension get "Nx right now" once a channel has been looked
  // up (and snapshotted) on two different days.
  const baselines = await fetchGlobalBaselines(
    svc,
    scored.map((v) => v.youtube_video_id)
  );
  const rates = recentRates(scored, baselines);
  const medians = channelBaseline(raw);
  const withVelocity = scored.map((v) => ({
    ...v,
    ...velocityOf(v.youtube_video_id, rates, medians.rateFor(v)),
  }));

  const now = new Date().toISOString();

  await svc.from("channel_median_cache").upsert(
    {
      youtube_channel_id: channelId,
      median_rate: channelMedianRate(raw),
      subscriber_count: channel.subscriber_count,
      video_count: channel.video_count,
      channel_title: channel.title,
      thumbnail_url: channel.thumbnail_url,
      computed_at: now,
    },
    { onConflict: "youtube_channel_id" }
  );
  if (withVelocity.length > 0) {
    await svc.from("discovered_videos").upsert(
      withVelocity.map((v) => ({
        youtube_video_id: v.youtube_video_id,
        youtube_channel_id: channelId,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        published_at: v.published_at,
        view_count: v.view_count,
        like_count: v.like_count,
        comment_count: v.comment_count,
        duration_seconds: v.duration_seconds,
        outlier_score: v.outlier_score,
        recent_views_per_day: v.recent_views_per_day,
        velocity_ratio: v.velocity_ratio,
        fetched_at: now,
      })),
      { onConflict: "youtube_video_id" }
    );
    await svc.from("video_view_history").insert(
      withVelocity.map((v) => ({ youtube_video_id: v.youtube_video_id, view_count: v.view_count }))
    );
  }

  return { found: true, channel, videos: withVelocity.sort(byScore) };
}
