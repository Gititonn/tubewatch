import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getChannelById, getChannelByHandle } from "@/lib/youtube";
import { planLimits } from "@/lib/entitlements";

/**
 * Track a channel from the browser extension. Authenticated by the per-user API
 * key (Bearer), so the extension can add a competitor without a session cookie.
 * Fetches the channel's details, enforces the plan's competitor cap, and upserts
 * into the caller's competitor_channels.
 */

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return json({ error: "Missing API key" }, 401);

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("id, plan")
    .eq("extension_api_key", key)
    .single();
  if (!profile) return json({ error: "Invalid API key" }, 401);

  const body = await request.json().catch(() => ({}));
  const channelId: string | undefined = body?.channelId;
  const handle: string | undefined = body?.handle;
  if (!channelId && !handle) return json({ error: "Missing channelId or handle" }, 400);

  // Resolve the channel (accepts either a channel id from the watch panel or a
  // handle from the channel-page button).
  const ch = channelId ? await getChannelById(channelId) : await getChannelByHandle(handle as string);
  if (!ch || !ch.id) return json({ error: "Channel not found" }, 404);
  const resolvedId = ch.id;

  // Already tracking? Idempotent success.
  const { data: existing } = await svc
    .from("competitor_channels")
    .select("id")
    .eq("user_id", profile.id)
    .eq("youtube_channel_id", resolvedId)
    .maybeSingle();
  if (existing) return json({ ok: true, alreadyTracking: true, id: existing.id });

  // Plan competitor cap.
  const limit = planLimits(profile.plan ?? "free").competitorLimit;
  const { count } = await svc
    .from("competitor_channels")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id);
  if ((count ?? 0) >= limit) {
    return json({ error: `Your plan allows up to ${limit} tracked channels. Upgrade to track more.` }, 402);
  }

  const { data: channel, error } = await svc
    .from("competitor_channels")
    .upsert(
      {
        user_id: profile.id,
        youtube_channel_id: resolvedId,
        channel_name: ch.snippet?.title ?? channelId,
        channel_handle: ch.snippet?.customUrl ?? null,
        thumbnail_url: ch.snippet?.thumbnails?.medium?.url ?? null,
        subscriber_count: parseInt(ch.statistics?.subscriberCount ?? "0"),
        video_count: parseInt(ch.statistics?.videoCount ?? "0"),
        category: "other",
      },
      { onConflict: "user_id,youtube_channel_id" }
    )
    .select("id")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, id: channel.id });
}
