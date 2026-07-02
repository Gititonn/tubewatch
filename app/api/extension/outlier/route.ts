import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { scoreVideoIds } from "@/lib/extension";

/**
 * Browser-extension scoring endpoint. Authenticated by the per-user API key
 * (Bearer token) issued in Settings — NOT the session cookie, so it works while
 * the user browses YouTube. Returns outlier scores + public stats for a batch
 * of video ids, DB-first with a metered on-demand fallback (see lib/extension).
 */

export const dynamic = "force-dynamic";

// Daily cap on *new-channel* median computations (the only part that costs
// YouTube quota — cached channels and known videos are free and uncapped).
const PLAN_LOOKUP_CAPS: Record<string, number> = { free: 30, pro: 300, growth: 1500 };
// Global guard so extension traffic can never starve the core daily syncs.
const GLOBAL_DAILY_CAP = 5000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return json({ error: "Missing API key" }, 401);

  const svc = createServiceClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("id, plan, extension_lookups_used, extension_lookups_reset_at")
    .eq("extension_api_key", key)
    .single();
  if (!profile) return json({ error: "Invalid API key" }, 401);

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("videoIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return json({ scores: {} });

  // Per-user daily meter (lazy reset).
  const now = new Date();
  let used = profile.extension_lookups_used ?? 0;
  if (!profile.extension_lookups_reset_at || now >= new Date(profile.extension_lookups_reset_at)) {
    used = 0;
    const nextReset = new Date(now); nextReset.setUTCHours(0, 0, 0, 0); nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    await svc.from("profiles").update({ extension_lookups_used: 0, extension_lookups_reset_at: nextReset.toISOString() }).eq("id", profile.id);
  }
  const perUserCap = PLAN_LOOKUP_CAPS[profile.plan as string] ?? PLAN_LOOKUP_CAPS.free;
  const perUserRemaining = Math.max(0, perUserCap - used);

  // Global daily guard.
  const today = now.toISOString().slice(0, 10);
  const { data: usageRow } = await svc.from("extension_quota_usage").select("new_channel_lookups").eq("day", today).single();
  const globalUsed = usageRow?.new_channel_lookups ?? 0;
  const globalRemaining = Math.max(0, GLOBAL_DAILY_CAP - globalUsed);

  const budget = Math.min(perUserRemaining, globalRemaining);

  const { results, newChannelLookups } = await scoreVideoIds(ids, budget);

  // Meter what we actually spent.
  if (newChannelLookups > 0) {
    await svc.from("profiles").update({ extension_lookups_used: used + newChannelLookups }).eq("id", profile.id);
    await svc.from("extension_quota_usage").upsert(
      { day: today, new_channel_lookups: globalUsed + newChannelLookups },
      { onConflict: "day" }
    );
  }

  // Shape as a { videoId: {...} } map for easy client lookup.
  const scores: Record<string, unknown> = {};
  for (const r of results) scores[r.youtube_video_id] = r;

  return json({ scores, capReached: budget === 0 && ids.some((id) => !scores[id]) });
}
