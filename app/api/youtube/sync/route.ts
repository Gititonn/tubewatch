import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncChannel } from "@/lib/sync";

export async function POST(request: Request) {
  // Require an authenticated user.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelDbId } = await request.json();
  if (!channelDbId) {
    return NextResponse.json({ error: "Missing channelDbId" }, { status: 400 });
  }

  // Verify ownership via the RLS-scoped client, and derive the YouTube channel
  // id from the owned row (never trust a caller-supplied youtubeChannelId).
  const { data: channel } = await supabase
    .from("channels")
    .select("id, youtube_channel_id")
    .eq("id", channelDbId)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const result = await syncChannel(channel.id, channel.youtube_channel_id, {
    enforceCooldown: true,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
