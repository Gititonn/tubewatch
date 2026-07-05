import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncCompetitorChannel } from "@/lib/sync";

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
    .select("id, youtube_channel_id")
    .eq("id", channelId)
    .or(`user_id.eq.${user.id},is_discovery.eq.true`)
    .single();

  if (chError || !competitorChannel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Fetch/score/upsert/snapshot all live in lib/sync.ts, shared with the
  // daily cron — one code path so scores and snapshots can't drift apart.
  const result = await syncCompetitorChannel(
    competitorChannel.id,
    competitorChannel.youtube_channel_id
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
