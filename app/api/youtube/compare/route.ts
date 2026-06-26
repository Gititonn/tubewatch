import { NextResponse } from "next/server";
import { getChannelByHandle, getChannelVideos } from "@/lib/youtube";
import { calculateOutlierScores } from "@/lib/outlier";
import type { Video } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  try {
    const channel = await getChannelByHandle(handle);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const subs = parseInt(channel.statistics?.subscriberCount ?? "0");
    const totalVideos = parseInt(channel.statistics?.videoCount ?? "0");

    // Fetch videos for avg views + outlier detection
    const ytVideos = await getChannelVideos(channel.id!, 30);

    const videos: Video[] = ytVideos.map((v) => ({
      id: v.id!,
      channel_id: channel.id!,
      youtube_video_id: v.id!,
      title: v.snippet?.title ?? null,
      published_at: v.snippet?.publishedAt ?? null,
      view_count: parseInt(v.statistics?.viewCount ?? "0"),
      like_count: parseInt(v.statistics?.likeCount ?? "0"),
      comment_count: parseInt(v.statistics?.commentCount ?? "0"),
      duration_seconds: null,
      thumbnail_url: v.snippet?.thumbnails?.medium?.url ?? null,
      outlier_score: null,
      updated_at: new Date().toISOString(),
    }));

    const withScores = calculateOutlierScores(videos);
    const avgViews =
      videos.length > 0
        ? Math.round(videos.reduce((s, v) => s + v.view_count, 0) / videos.length)
        : 0;

    const topVideo = [...withScores].sort((a, b) => b.view_count - a.view_count)[0];
    const topOutlier = [...withScores].sort(
      (a, b) => (b.outlier_score ?? 0) - (a.outlier_score ?? 0)
    )[0];

    return NextResponse.json({
      id: channel.id,
      handle: channel.snippet?.customUrl ?? handle,
      name: channel.snippet?.title,
      thumbnail: channel.snippet?.thumbnails?.default?.url,
      subscribers: subs,
      totalVideos,
      avgViews,
      viewsPerSub: subs > 0 ? parseFloat((avgViews / subs).toFixed(3)) : 0,
      topVideo: topVideo
        ? {
            title: topVideo.title,
            views: topVideo.view_count,
            thumbnail: topVideo.thumbnail_url,
            outlierScore: topVideo.outlier_score,
          }
        : null,
      topOutlier: topOutlier
        ? {
            title: topOutlier.title,
            views: topOutlier.view_count,
            thumbnail: topOutlier.thumbnail_url,
            outlierScore: topOutlier.outlier_score,
          }
        : null,
      recentVideos: withScores.slice(0, 5).map((v) => ({
        title: v.title,
        views: v.view_count,
        outlierScore: v.outlier_score,
        thumbnail: v.thumbnail_url,
      })),
    });
  } catch (err) {
    console.error("Compare error:", err);
    return NextResponse.json({ error: "Failed to fetch channel" }, { status: 500 });
  }
}
