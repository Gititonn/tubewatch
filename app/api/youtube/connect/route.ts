import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannelByHandle } from "@/lib/youtube";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { handle } = await request.json();

  if (!handle) {
    return NextResponse.json({ error: "Handle is required" }, { status: 400 });
  }

  const channel = await getChannelByHandle(handle);

  if (!channel) {
    return NextResponse.json(
      { error: "Channel not found. Check the handle or URL." },
      { status: 404 }
    );
  }

  const snippet = channel.snippet;
  const stats = channel.statistics;

  const { data: upserted, error } = await supabase
    .from("channels")
    .upsert(
      {
        user_id: user.id,
        youtube_channel_id: channel.id!,
        channel_name: snippet?.title ?? null,
        channel_thumbnail: snippet?.thumbnails?.default?.url ?? null,
        subscriber_count: stats?.subscriberCount ? parseInt(stats.subscriberCount) : null,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,youtube_channel_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Await sync so the dashboard has videos immediately after redirect.
  // The sync route uses a service-role client and needs no auth cookie.
  const origin = new URL(request.url).origin;
  try {
    await fetch(`${origin}/api/youtube/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelDbId: upserted.id, youtubeChannelId: channel.id }),
    });
  } catch {
    // Non-fatal: channel is saved, user can Resync manually.
  }

  return NextResponse.json({ success: true, channel: upserted });
}
