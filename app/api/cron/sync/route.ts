import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  createCompetitorSyncCache,
  syncChannel,
  syncCompetitorChannel,
} from "@/lib/sync";

// How many channels to sync at once. Each syncChannel fires ~3 sequential
// YouTube API calls, so this caps outbound concurrency at ~3×LIMIT instead of
// ~3×N — which previously burst all channels simultaneously, tripping YouTube
// 403 rate-limits (not retried) and risking the Vercel function timeout/OOM.
const SYNC_CONCURRENCY = 5;

// Concurrency-limited map that mirrors Promise.allSettled's result shape and
// preserves input order, so the caller's success counting is unchanged.
async function mapSettledLimited<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;
  async function runner() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await worker(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runner)
  );
  return results;
}

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // scope=priority syncs only Growth users' channels — the schedule that backs
  // the "priority sync (6h vs 24h)" plan feature. The daily run (no param, the
  // existing vercel.json cron) syncs everything.
  const { searchParams } = new URL(request.url);
  const priorityOnly = searchParams.get("scope") === "priority";

  const supabase = createServiceClient();

  let growthUserIds: string[] | null = null;
  if (priorityOnly) {
    const { data: growthProfiles, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("plan", "growth");
    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }
    growthUserIds = (growthProfiles ?? []).map((p) => p.id);
    if (growthUserIds.length === 0) {
      return NextResponse.json({ synced: 0, competitorsSynced: 0, total: 0 });
    }
  }

  let channelQuery = supabase.from("channels").select("id, youtube_channel_id, user_id");
  if (growthUserIds) channelQuery = channelQuery.in("user_id", growthUserIds);
  const { data: channels, error } = await channelQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Call the shared sync function directly — no open HTTP endpoint, no cooldown
  // for the scheduled job. Concurrency-limited to protect the YouTube quota and
  // the serverless function's time/memory budget.
  const results = await mapSettledLimited(
    channels ?? [],
    SYNC_CONCURRENCY,
    (ch) => syncChannel(ch.id, ch.youtube_channel_id, { enforceCooldown: false })
  );

  // Competitor channels are the pool the outlier radar actually watches, yet
  // they used to sync only when a user clicked the button — so their view
  // time series (and therefore velocity_ratio) went stale the moment users
  // stopped babysitting them. The cron now walks them too. The shared cache
  // collapses duplicate rows pointing at the same YouTube channel into one
  // fetch and one snapshot append. Discovery-pool channels ride along on the
  // full daily run only.
  let competitorQuery = supabase
    .from("competitor_channels")
    .select("id, youtube_channel_id, user_id");
  if (growthUserIds) competitorQuery = competitorQuery.in("user_id", growthUserIds);
  const { data: competitorChannels, error: compErr } = await competitorQuery;

  if (compErr) {
    return NextResponse.json({ error: compErr.message }, { status: 500 });
  }

  const cache = createCompetitorSyncCache();
  const compResults = await mapSettledLimited(
    competitorChannels ?? [],
    SYNC_CONCURRENCY,
    (ch) => syncCompetitorChannel(ch.id, ch.youtube_channel_id, cache)
  );

  const succeeded = results.filter(
    (r) => r.status === "fulfilled" && "synced" in r.value
  ).length;
  const competitorsSynced = compResults.filter(
    (r) => r.status === "fulfilled" && "synced" in r.value
  ).length;
  return NextResponse.json({
    synced: succeeded,
    competitorsSynced,
    total: (channels?.length ?? 0) + (competitorChannels?.length ?? 0),
  });
}
