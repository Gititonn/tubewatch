import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannelByHandle } from "@/lib/youtube";
import { syncChannel } from "@/lib/sync";

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
      },
      { onConflict: "user_id,youtube_channel_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync videos immediately so the dashboard has data after redirect.
  // Call the shared sync function directly (service-role, in-process) instead
  // of hitting our own /api/youtube/sync over HTTP — that internal fetch never
  // carried the caller's auth cookie, so it 401'd silently on every connect and
  // last_synced_at got stamped here regardless, leaving Resync stuck on a false
  // cooldown with zero videos synced.
  try {
    await syncChannel(upserted.id, channel.id!, { enforceCooldown: false });
  } catch {
    // Non-fatal: channel is saved, user can Resync manually once the cooldown clears.
  }

  return NextResponse.json({ success: true, channel: upserted });
}
