import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncChannel } from "@/lib/sync";

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

  const supabase = createServiceClient();
  const { data: channels, error } = await supabase
    .from("channels")
    .select("id, youtube_channel_id");

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

  const succeeded = results.filter(
    (r) => r.status === "fulfilled" && "synced" in r.value
  ).length;
  return NextResponse.json({ synced: succeeded, total: channels?.length ?? 0 });
}
