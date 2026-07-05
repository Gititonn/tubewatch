import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChannelByHandle, YouTubeApiError } from "@/lib/youtube";
import { syncChannel } from "@/lib/sync";
import { autoSuggestCompetitors } from "@/lib/competitor-suggest";
import { getUserPlan } from "@/lib/plan";

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

  let channel;
  try {
    channel = await getChannelByHandle(handle);
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      return NextResponse.json({ error: err.message }, { status: err.reason === "quota_exceeded" ? 503 : err.status });
    }
    return NextResponse.json({ error: "Couldn't reach YouTube. Please try again." }, { status: 503 });
  }

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

  // First-run: if the user tracks no competitors yet, find 3 similarly-sized
  // channels in their niche and sync them before the redirect lands — the
  // dashboard's first paint should show scored competitor outliers, not an
  // empty "add your first competitor" homework prompt. Best-effort: a quota
  // error or thin search results just skips the suggestion.
  let suggestedCompetitors = 0;
  try {
    const plan = await getUserPlan(supabase, user.id);
    const result = await autoSuggestCompetitors({
      userId: user.id,
      channelDbId: upserted.id,
      youtubeChannelId: channel.id!,
      subscriberCount: upserted.subscriber_count,
      plan,
    });
    suggestedCompetitors = result.suggested;
  } catch {
    // Non-fatal — connect always succeeds even if suggestions don't.
  }

  return NextResponse.json({ success: true, channel: upserted, suggestedCompetitors });
}
