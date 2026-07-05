import type { createServiceClient } from "@/lib/supabase/server";

/**
 * Recent velocity from view snapshots.
 *
 * outlier_score answers "did this video overperform for this channel?"
 * (lifetime views/day vs. channel median — lib/outlier.ts). This module
 * answers the other question the snapshots make possible: "is it pulling
 * views RIGHT NOW?" — views gained per day since a baseline snapshot taken
 * ~48h ago. That is the number that can catch a breakout while it's breaking
 * (or an old video resurging), which lifetime views/day mathematically can't:
 * months of decayed history drown a three-day spike.
 *
 * Baseline selection lives in SQL (baseline_view_snapshots /
 * baseline_own_snapshots): the snapshot closest to 48h old, bounded to
 * [20h, 7d]. Everything here degrades to "no velocity yet" — a video with no
 * qualifying snapshot gets null, never a fake number, so day one of the
 * pipeline shows honest gaps instead of front-loaded noise.
 */

export type BaselineSnapshot = {
  youtube_video_id: string;
  view_count: number;
  captured_at: string;
};

export type VelocityInput = {
  youtube_video_id: string;
  view_count: number;
};

export type Velocity = {
  recent_views_per_day: number | null;
  velocity_ratio: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * views gained per day since each video's baseline snapshot. Videos without a
 * baseline are absent from the map. Negative deltas (YouTube purging spam
 * views, count corrections) clamp to 0 — "not moving", not "moving backwards".
 */
export function recentRates(
  videos: VelocityInput[],
  baselines: BaselineSnapshot[],
  now: number = Date.now()
): Map<string, number> {
  const byId = new Map(baselines.map((b) => [b.youtube_video_id, b]));
  const rates = new Map<string, number>();
  for (const v of videos) {
    const base = byId.get(v.youtube_video_id);
    if (!base) continue;
    const elapsedDays = (now - new Date(base.captured_at).getTime()) / DAY_MS;
    if (elapsedDays <= 0) continue;
    rates.set(
      v.youtube_video_id,
      Math.max(0, (v.view_count - base.view_count) / elapsedDays)
    );
  }
  return rates;
}

/**
 * Pair a recent rate with the channel's median views/day (the same
 * denominator as outlier_score, so "3x now" and "3x overall" are on one
 * scale). No rate or no baseline median → nulls.
 */
export function velocityOf(
  youtubeVideoId: string,
  rates: Map<string, number>,
  medianRate: number
): Velocity {
  const rate = rates.get(youtubeVideoId);
  if (rate === undefined || medianRate <= 0) {
    return { recent_views_per_day: rate ?? null, velocity_ratio: null };
  }
  return {
    recent_views_per_day: parseFloat(rate.toFixed(1)),
    velocity_ratio: parseFloat((rate / medianRate).toFixed(2)),
  };
}

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Baseline snapshots from the global time series (competitor + discovered
 * videos). Best-effort: if the RPC doesn't exist yet (migration not applied),
 * velocity is simply skipped — callers must treat an empty array as "no data",
 * never as an error.
 */
export async function fetchGlobalBaselines(
  svc: ServiceClient,
  youtubeVideoIds: string[]
): Promise<BaselineSnapshot[]> {
  if (youtubeVideoIds.length === 0) return [];
  const { data, error } = await svc.rpc("baseline_view_snapshots", {
    video_ids: youtubeVideoIds,
  });
  if (error) {
    console.warn("baseline_view_snapshots skipped:", error.message);
    return [];
  }
  return (data ?? []) as BaselineSnapshot[];
}

/** Baseline snapshots for the user's own connected channel (video_snapshots). */
export async function fetchOwnBaselines(
  svc: ServiceClient,
  channelDbId: string,
  youtubeVideoIds: string[]
): Promise<BaselineSnapshot[]> {
  if (youtubeVideoIds.length === 0) return [];
  const { data, error } = await svc.rpc("baseline_own_snapshots", {
    channel: channelDbId,
    video_ids: youtubeVideoIds,
  });
  if (error) {
    console.warn("baseline_own_snapshots skipped:", error.message);
    return [];
  }
  return (data ?? []) as BaselineSnapshot[];
}
