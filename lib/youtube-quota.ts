import { createServiceClient } from "@/lib/supabase/server";

/**
 * Daily budget guard for search.list calls (100 units each — 100x the cost of
 * every other call in this app). Default budget leaves real headroom under
 * the account's 10,000/day cap for the 1-unit sync/lookup calls that must
 * never starve: 6,000 units = 60 searches/day before this guard trips.
 * Override via YOUTUBE_SEARCH_QUOTA_BUDGET if the project's quota changes.
 */
const SEARCH_COST_UNITS = 100;
const DEFAULT_BUDGET = 6_000;

function dailyBudget(): number {
  const env = process.env.YOUTUBE_SEARCH_QUOTA_BUDGET;
  const parsed = env ? parseInt(env, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BUDGET;
}

/**
 * Attempt to reserve one search.list call against today's budget. Fails
 * open (returns true) if the reservation RPC itself errors — a quota-guard
 * outage must never be the reason search stops working; it only exists to
 * shed load before the REAL quota (enforced by YouTube) gets hit for
 * everyone. Best-effort by design, same posture as the rest of this app's
 * YouTube integration.
 */
export async function reserveSearchQuota(): Promise<boolean> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .rpc("reserve_youtube_search_quota", { p_cost: SEARCH_COST_UNITS, p_budget: dailyBudget() })
      .single();
    if (error || !data) return true;
    return (data as { ok: boolean }).ok;
  } catch {
    return true;
  }
}
