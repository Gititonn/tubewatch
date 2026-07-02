import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim();
  const minScore = parseFloat(searchParams.get("minScore") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  // The feed is a UNION of two pools: channels this user personally tracks,
  // and the shared "discovery" pool (curated, platform-wide, category-tagged)
  // — so a category the user hasn't tracked anything in yet still shows real
  // outliers instead of an empty state.
  let channelIds: string[] = [];

  if (channelId) {
    channelIds = [channelId];
  } else {
    let ownedQuery = supabase.from("competitor_channels").select("id").eq("user_id", user.id);
    let discoveryQuery = supabase.from("competitor_channels").select("id").eq("is_discovery", true);
    if (category) {
      ownedQuery = ownedQuery.eq("category", category);
      discoveryQuery = discoveryQuery.eq("category", category);
    }
    const [{ data: owned, error: ownedErr }, { data: discovery, error: discoveryErr }] = await Promise.all([
      ownedQuery,
      discoveryQuery,
    ]);
    if (ownedErr) return NextResponse.json({ error: ownedErr.message }, { status: 500 });
    if (discoveryErr) return NextResponse.json({ error: discoveryErr.message }, { status: 500 });
    channelIds = Array.from(new Set([...(owned ?? []), ...(discovery ?? [])].map((ch) => ch.id)));
  }

  if (channelIds.length === 0) return NextResponse.json({ outliers: [] });

  let outliersQuery = supabase
    .from("competitor_videos")
    .select(`*, competitor_channels(id, channel_name, thumbnail_url, youtube_channel_id, channel_handle, subscriber_count, video_count, category, is_discovery)`)
    .in("competitor_channel_id", channelIds)
    .gte("outlier_score", minScore)
    .order("outlier_score", { ascending: false })
    .limit(limit);

  if (q) outliersQuery = outliersQuery.ilike("title", `%${q}%`);

  const { data: outliers, error } = await outliersQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ outliers });
}
