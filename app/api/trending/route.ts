import { NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { google } from "googleapis"
import { parseDurationToSeconds, withYouTubeRetry, YouTubeApiError } from "@/lib/youtube"

const youtube = google.youtube({ version: "v3", auth: process.env.YOUTUBE_API_KEY })

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") ?? "videos"
  const regionCode = searchParams.get("regionCode") ?? "US"
  const categoryId = searchParams.get("categoryId") ?? ""
  const limit = parseInt(searchParams.get("limit") ?? "25")

  const serviceClient = createServiceClient()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  let cacheQuery = serviceClient
    .from("trending_cache")
    .select("*")
    .eq("region_code", regionCode)
    .eq("video_type", type)
    .gte("fetched_at", twoHoursAgo)

  if (categoryId) {
    cacheQuery = cacheQuery.eq("category_id", categoryId)
  } else {
    cacheQuery = cacheQuery.is("category_id", null)
  }

  const { data: cached } = await cacheQuery.limit(limit)

  if (cached && cached.length > 0) {
    const videos = cached.map((row: Record<string, unknown>) => ({
      youtubeVideoId: row.youtube_video_id,
      title: row.title,
      channelId: row.channel_id,
      channelName: row.channel_name,
      thumbnailUrl: row.thumbnail_url,
      viewCount: row.view_count,
      likeCount: row.like_count,
      durationSeconds: row.duration_seconds,
      publishedAt: row.published_at,
    }))
    return NextResponse.json({ videos })
  }

  try {
    const res = await withYouTubeRetry(() =>
      youtube.videos.list({
        part: ["snippet", "statistics", "contentDetails"],
        chart: "mostPopular",
        regionCode,
        videoCategoryId: categoryId || undefined,
        maxResults: 50,
      })
    )

    const items = res.data.items ?? []

    const filtered = items.filter((item) => {
      const dur = parseDurationToSeconds(item.contentDetails?.duration ?? "PT0S")
      return type === "shorts" ? dur <= 60 : dur > 60
    })

    const sliced = filtered.slice(0, limit)

    const videos = sliced.map((item) => ({
      youtubeVideoId: item.id ?? "",
      title: item.snippet?.title ?? "",
      channelId: item.snippet?.channelId ?? "",
      channelName: item.snippet?.channelTitle ?? "",
      thumbnailUrl:
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.default?.url ??
        null,
      viewCount: parseInt(item.statistics?.viewCount ?? "0"),
      likeCount: parseInt(item.statistics?.likeCount ?? "0"),
      durationSeconds: parseDurationToSeconds(item.contentDetails?.duration ?? "PT0S"),
      publishedAt: item.snippet?.publishedAt ?? null,
    }))

    const now = new Date().toISOString()
    const rows = videos.map((v) => ({
      region_code: regionCode,
      category_id: categoryId || null,
      video_type: type,
      youtube_video_id: v.youtubeVideoId,
      title: v.title,
      channel_id: v.channelId,
      channel_name: v.channelName,
      thumbnail_url: v.thumbnailUrl,
      view_count: v.viewCount,
      like_count: v.likeCount,
      duration_seconds: v.durationSeconds,
      published_at: v.publishedAt,
      fetched_at: now,
    }))

    await serviceClient
      .from("trending_cache")
      .upsert(rows, { onConflict: "region_code,category_id,video_type,youtube_video_id" })

    return NextResponse.json({ videos })
  } catch (err: unknown) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json({ error: err.message }, { status: err.reason === "quota_exceeded" ? 503 : err.status })
    }
    const message = err instanceof Error ? err.message : "YouTube API error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
