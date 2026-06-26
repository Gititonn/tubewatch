import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const minScore = parseFloat(searchParams.get("minScore") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let channelQuery = supabase
    .from("competitor_channels")
    .select("id")
    .eq("user_id", user.id);

  if (channelId) channelQuery = channelQuery.eq("id", channelId);

  const { data: userChannels, error: chError } = await channelQuery;
  if (chError) return NextResponse.json({ error: chError.message }, { status: 500 });

  const channelIds = userChannels?.map((ch) => ch.id) ?? [];
  if (channelIds.length === 0) return NextResponse.json({ outliers: [] });

  const { data: outliers, error } = await supabase
    .from("competitor_videos")
    .select(`*, competitor_channels(id, channel_name, thumbnail_url, youtube_channel_id)`)
    .in("competitor_channel_id", channelIds)
    .gte("outlier_score", minScore)
    .order("outlier_score", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ outliers });
}
