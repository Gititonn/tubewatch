import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PATTERNS = [
  { name: "Numbered list", regex: /^\d+\s/i },
  { name: "How to", regex: /^how to/i },
  { name: "Why", regex: /^why/i },
  { name: "X for Y days/hours", regex: /\d+\s*(days?|hours?|weeks?|months?)/i },
  { name: "Vs / Versus", regex: /\bvs\.?\b|\bversus\b/i },
  { name: "Challenge", regex: /\bchallenge\b/i },
  { name: "Reaction", regex: /\breact(ion|ing)?\b/i },
  { name: "Story / Storytime", regex: /\bstory(time)?\b/i },
  { name: "Question hook (?)", regex: /\?/ },
  { name: "ALL CAPS word", regex: /[A-Z]{3,}/ },
];

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const minVideos = parseInt(searchParams.get("minVideos") ?? "5", 10);

  let channelQuery = supabase.from("competitor_channels").select("id").eq("user_id", user.id);
  if (channelId) channelQuery = channelQuery.eq("id", channelId);
  const { data: userChannels } = await channelQuery;
  const channelIds = userChannels?.map((c) => c.id) ?? [];

  if (channelIds.length === 0) {
    return NextResponse.json({ patterns: [], summary: null });
  }

  const { data: videos } = await supabase
    .from("competitor_videos")
    .select("title, view_count, outlier_score, youtube_video_id, thumbnail_url, published_at, competitor_channel_id")
    .in("competitor_channel_id", channelIds)
    .not("outlier_score", "is", null);

  const videoList = videos ?? [];

  if (videoList.length < minVideos) {
    return NextResponse.json({ patterns: [], summary: null, totalVideos: videoList.length });
  }

  const overallAvg = videoList.reduce((s, v) => s + (v.outlier_score ?? 0), 0) / videoList.length;

  const patterns = PATTERNS.map((pattern) => {
    const matches = videoList.filter((v) => pattern.regex.test(v.title));
    if (matches.length === 0) return null;
    const avgScore = matches.reduce((s, v) => s + (v.outlier_score ?? 0), 0) / matches.length;
    const topVideo = matches.reduce(
      (best, v) => ((v.outlier_score ?? 0) > (best.outlier_score ?? 0) ? v : best),
      matches[0]
    );
    return {
      name: pattern.name,
      matchCount: matches.length,
      avgOutlierScore: parseFloat(avgScore.toFixed(2)),
      vsAverage: parseFloat((avgScore / overallAvg).toFixed(2)),
      topVideo: {
        title: topVideo.title,
        youtubeVideoId: topVideo.youtube_video_id,
        thumbnailUrl: topVideo.thumbnail_url,
        outlierScore: topVideo.outlier_score,
      },
    };
  }).filter(Boolean);

  patterns.sort((a, b) => b!.avgOutlierScore - a!.avgOutlierScore);

  const best = patterns[0];
  const summary = best
    ? `For your tracked channels, **${best.name}** titles outperform the average by ${best.vsAverage}x`
    : null;

  return NextResponse.json({
    patterns,
    summary,
    overallAvg: parseFloat(overallAvg.toFixed(2)),
    totalVideos: videoList.length,
  });
}
