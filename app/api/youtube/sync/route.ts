import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getChannelVideos, parseDurationToSeconds } from "@/lib/youtube";
import { calculateOutlierScores } from "@/lib/outlier";
import type { Video } from "@/lib/types";

export async function POST(request: Request) {
  const { channelDbId, youtubeChannelId } = await request.json();

  if (!channelDbId || !youtubeChannelId) {
    return NextResponse.json({ error: "Missing channelDbId or youtubeChannelId" }, { status: 400 });
  }

  const ytVideos = await getChannelVideos(youtubeChannelId);

  if (!ytVideos || ytVideos.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

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

  // Calculate outlier scores
  const withScores = calculateOutlierScores(rawVideos as Video[]);

  const supabase = createServiceClient();

  const { error } = await supabase.from("videos").upsert(
    withScores.map((v) => ({ ...v, updated_at: new Date().toISOString() })),
    { onConflict: "channel_id,youtube_video_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update last_synced_at
  await supabase
    .from("channels")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", channelDbId);

  return NextResponse.json({ synced: withScores.length });
}
