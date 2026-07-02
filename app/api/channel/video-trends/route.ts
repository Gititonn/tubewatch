import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Channel-level view-trend time series (P2.4).
 *
 * Reads video_snapshots — the point-in-time view counts captured best-effort
 * on every sync — for the caller's own channel, and returns a per-video series
 * ready to chart. Each daily cron run adds one point per video, so a video
 * needs 2+ distinct captures before it draws a line; `chartable` tells the UI
 * how many have crossed that threshold yet.
 */

export const dynamic = "force-dynamic";

const MAX_SNAPSHOTS = 5000;
const MAX_VIDEOS = 12;

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: channels } = await supabase
    .from("channels")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const channel = channels?.[0];
  if (!channel) return NextResponse.json({ hasChannel: false, chartable: 0, trends: [] });

  const { data: snaps, error } = await supabase
    .from("video_snapshots")
    .select("youtube_video_id, view_count, captured_at")
    .eq("channel_id", channel.id)
    .order("captured_at", { ascending: true })
    .limit(MAX_SNAPSHOTS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group snapshots into per-video series (already time-ordered by the query).
  const byVideo = new Map<string, { t: string; v: number }[]>();
  for (const s of snaps ?? []) {
    const arr = byVideo.get(s.youtube_video_id) ?? [];
    arr.push({ t: s.captured_at, v: s.view_count });
    byVideo.set(s.youtube_video_id, arr);
  }

  // Titles/thumbnails for the videos that have any snapshots.
  const ids = Array.from(byVideo.keys());
  const meta = new Map<string, { title: string; thumbnail_url: string | null }>();
  if (ids.length > 0) {
    const { data: vids } = await supabase
      .from("videos")
      .select("youtube_video_id, title, thumbnail_url")
      .eq("channel_id", channel.id)
      .in("youtube_video_id", ids);
    for (const v of vids ?? []) meta.set(v.youtube_video_id, { title: v.title, thumbnail_url: v.thumbnail_url });
  }

  const trends = ids
    .map((id) => {
      const points = byVideo.get(id)!;
      const m = meta.get(id);
      return {
        youtube_video_id: id,
        title: m?.title ?? id,
        thumbnail_url: m?.thumbnail_url ?? null,
        points,
        latest: points[points.length - 1]?.v ?? 0,
        delta: points.length > 1 ? points[points.length - 1].v - points[0].v : 0,
      };
    })
    .sort((a, b) => b.latest - a.latest);

  const chartable = trends.filter((t) => t.points.length >= 2).length;

  return NextResponse.json({ hasChannel: true, chartable, trends: trends.slice(0, MAX_VIDEOS) });
}
