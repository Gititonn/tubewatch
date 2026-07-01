import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Discovery channels are a platform-wide, curated pool of competitor channels
 * (user_id = null, is_discovery = true) that populate the Outlier Feed by
 * category even for users who haven't personally tracked any competitor yet.
 * Any signed-in user can browse them (RLS policy) and contribute one — this
 * is a shared/crowdsourced pool, not a personal watchlist, so it's kept
 * separate from POST /api/competitors/channels (which manages a user's own
 * tracked list and is subject to their plan's competitorLimit).
 */

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("competitor_channels")
    .select("*")
    .eq("is_discovery", true)
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);

  const { data: channels, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ channels });
}

// Quality bar for the shared pool. Found live: a 1-subscriber, near-zero-view
// test channel got added in under a minute with no gate at all. This doesn't
// stop a determined bad actor, but it stops accidental/casual junk (and the
// kind of "add whatever the search returned" flow this app itself does).
const MIN_SUBSCRIBERS = 200;
const MIN_VIDEOS = 5;

// Per-contributor rate limit on NEW discovery channels (not edits to existing
// ones) — caps how fast one account can flood the shared pool.
const MAX_CONTRIBUTIONS_PER_DAY = 5;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { channelId, name, handle, thumbnail, subscriberCount, videoCount, category } = body;

  if (!channelId || !name || !category) {
    return NextResponse.json({ error: "Missing channelId, name, or category" }, { status: 400 });
  }

  // Manual check-then-write instead of upsert: the dedupe target is a partial
  // unique index (youtube_channel_id WHERE is_discovery = true), which the
  // Supabase JS client's onConflict option can't express cleanly.
  const { data: existing } = await supabase
    .from("competitor_channels")
    .select("id")
    .eq("youtube_channel_id", channelId)
    .eq("is_discovery", true)
    .maybeSingle();

  if (existing) {
    const { data: channel, error } = await supabase
      .from("competitor_channels")
      .update({ category })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ channel, alreadyExisted: true });
  }

  if ((subscriberCount ?? 0) < MIN_SUBSCRIBERS || (videoCount ?? 0) < MIN_VIDEOS) {
    return NextResponse.json(
      {
        error: `This channel is too small to add to the shared discovery pool (needs ${MIN_SUBSCRIBERS}+ subscribers and ${MIN_VIDEOS}+ videos). You can still track it as your own competitor from the Competitors page.`,
      },
      { status: 422 }
    );
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentContributions } = await supabase
    .from("competitor_channels")
    .select("id", { count: "exact", head: true })
    .eq("contributed_by", user.id)
    .eq("is_discovery", true)
    .gte("created_at", dayAgo);

  if ((recentContributions ?? 0) >= MAX_CONTRIBUTIONS_PER_DAY) {
    return NextResponse.json(
      { error: `You've added ${MAX_CONTRIBUTIONS_PER_DAY} channels to the shared pool today — try again tomorrow.` },
      { status: 429 }
    );
  }

  const { data: channel, error } = await supabase
    .from("competitor_channels")
    .insert({
      user_id: null,
      is_discovery: true,
      contributed_by: user.id,
      youtube_channel_id: channelId,
      channel_name: name,
      channel_handle: handle ?? null,
      thumbnail_url: thumbnail ?? null,
      subscriber_count: subscriberCount ?? null,
      video_count: videoCount ?? null,
      category,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ channel });
}
