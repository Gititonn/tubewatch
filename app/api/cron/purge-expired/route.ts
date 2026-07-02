import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * 30-day retention purge for NON-AUTHORIZED YouTube API data.
 *
 * Per the YouTube API Services Developer Policies (§III.E.4), data fetched by
 * API key for channels that have NOT authorized us — competitors, the discovery
 * pool, and arbitrary videos scored by the extension / search-any-channel — may
 * be stored for at most 30 days, then must be deleted or refreshed. Rows that
 * are actively re-viewed get their fetched_at / computed_at / captured_at bumped
 * on refresh, so only genuinely stale rows are purged here.
 *
 * DELIBERATELY NOT TOUCHED: `video_snapshots`, which holds the user's OWN
 * connected-channel history. That channel authorized us via OAuth, so its
 * statistics may be retained longer (§III.E.4 authorized-data / statistics
 * carve-out). Keeping it here is the point of the own-channel carve-out.
 */

export const dynamic = "force-dynamic";

const RETENTION_DAYS = 30;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = createServiceClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  async function purge(table: string, column: string) {
    const { count, error } = await svc.from(table).delete({ count: "exact" }).lt(column, cutoff);
    return { table, deleted: count ?? 0, error: error?.message ?? null };
  }

  const results = await Promise.all([
    purge("discovered_videos", "fetched_at"),
    purge("video_view_history", "captured_at"),
    purge("channel_median_cache", "computed_at"),
  ]);

  return NextResponse.json({ ok: true, retentionDays: RETENTION_DAYS, cutoff, results });
}
