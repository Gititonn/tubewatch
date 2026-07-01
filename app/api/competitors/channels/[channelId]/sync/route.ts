import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannelVideos, parseDurationToSeconds, YouTubeApiError } from "@/lib/youtube";
import { calculateOutlierScores } from "@/lib/outlier";

export async function POST(
  _request: Request,
  { params }: { params: { channelId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = params;

  // A channel is syncable if the caller owns it, or it's a shared discovery
  // channel (curated, not owned by anyone in particular — any signed-in user
  // can trigger a resync since the RLS policy already makes it readable to all).
  const { data: competitorChannel, error: chError } = await supabase
    .from("competitor_channels")
    .select("*")
    .eq("id", channelId)
    .or(`user_id.eq.${user.id},is_discovery.eq.true`)
    .single();

  if (chError || !competitorChannel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  let ytVideos;
  try {
    ytVideos = await getChannelVideos(competitorChannel.youtube_channel_id, 50);
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json({ error: err.message }, { status: err.reason === "quota_exceeded" ? 503 : err.status });
    }
    return NextResponse.json({ error: "Couldn't reach YouTube. Please try again." }, { status: 503 });
  }

  if (!ytVideos || ytVideos.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const rawVideos = ytVideos.map((v) => ({
    competitor_channel_id: channelId,
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

  // Same scoring function used for the caller's own channel and the discovery
  // pool (lib/outlier.ts) — age-normalized velocity, not raw views ÷ median.
  // Previously this route computed a separate, cruder ratio, so the same "Nx"
  // badge meant two different things depending on which pool a video came
  // from. One formula everywhere now.
  const withScores = calculateOutlierScores(rawVideos);

  // median_views stays a simple raw-view median — it's a display stat on the
  // Competitors page ("Median: X views"), not the scoring input.
  const views = rawVideos.map((v) => v.view_count).sort((a, b) => a - b);
  const mid = Math.floor(views.length / 2);
  const median =
    views.length % 2 !== 0 ? views[mid] : (views[mid - 1] + views[mid]) / 2;

  const { error: upsertError } = await supabase
    .from("competitor_videos")
    .upsert(withScores, { onConflict: "competitor_channel_id,youtube_video_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  await supabase
    .from("competitor_channels")
    .update({
      median_views: Math.round(median),
      video_count: ytVideos.length,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", channelId);

  return NextResponse.json({ synced: withScores.length, median });
}
