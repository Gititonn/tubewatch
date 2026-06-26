import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const minScore = parseFloat(searchParams.get("minScore") ?? "3");
  const maxSubscribers = parseInt(searchParams.get("maxSubscribers") ?? "100000");
  const daysAgo = parseInt(searchParams.get("daysAgo") ?? "30");
  const limit = parseInt(searchParams.get("limit") ?? "30");

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("competitor_videos")
    .select(`
      id,
      title,
      youtube_video_id,
      thumbnail_url,
      view_count,
      outlier_score,
      published_at,
      competitor_channels!inner(
        id,
        channel_name,
        channel_handle,
        thumbnail_url,
        subscriber_count,
        youtube_channel_id
      )
    `)
    .gte("outlier_score", minScore)
    .lte("competitor_channels.subscriber_count", maxSubscribers)
    .gte("published_at", new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString())
    .order("outlier_score", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = (data ?? []).filter((v: Record<string, unknown>) => {
    const ch = Array.isArray(v.competitor_channels)
      ? v.competitor_channels[0]
      : v.competitor_channels;
    return ch && (ch.subscriber_count == null || ch.subscriber_count <= maxSubscribers);
  });

  return NextResponse.json({ videos: filtered });
}
