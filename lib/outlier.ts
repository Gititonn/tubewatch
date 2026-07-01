import type { Video } from "./types";

/**
 * Outlier scoring — AGE-NORMALIZED VELOCITY.
 *
 * The old model was `views ÷ channel median views`. That compared a fresh
 * video's *cumulative* views against *mature* videos' cumulative views, so a
 * genuine breakout scored BELOW 1.0 for its entire early window and only
 * crossed the outlier threshold months later — after it had already blown up.
 * It confirmed history; it could not "spot breakouts before they blow up."
 *
 * The new model scores each video's *views-per-day since publish* against the
 * channel's median views-per-day. A young video pulling views fast now stands
 * out immediately instead of being buried under years-old back-catalog totals.
 *
 * NOTE: the fully calibrated version compares a video's early trajectory to the
 * channel's own historical first-48h curve — that needs a per-video snapshot
 * table capturing view_count over time, which we don't store yet. This velocity
 * ratio is the honest, shippable approximation until those snapshots exist.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
// Floor the age so a video published minutes ago doesn't divide to an absurd
// views/day. One day means "views over roughly its first day" for anything newer.
const MIN_AGE_DAYS = 1;

function viewsPerDay(video: Video): number {
  if (!video.published_at) return video.view_count;
  const ageDays = Math.max(
    (Date.now() - new Date(video.published_at).getTime()) / DAY_MS,
    MIN_AGE_DAYS
  );
  return video.view_count / ageDays;
}

export function calculateOutlierScores(videos: Video[]): Video[] {
  if (videos.length < 3) return videos;

  const medianRate = getMedian(videos.map(viewsPerDay));

  return videos.map((video) => ({
    ...video,
    outlier_score:
      medianRate > 0
        ? parseFloat((viewsPerDay(video) / medianRate).toFixed(2))
        : 1.0,
  }));
}

function getMedian(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getOutlierLabel(
  score: number | null
): "outlier" | "normal" | "underperformer" {
  if (score === null) return "normal";
  if (score > 2.0) return "outlier";
  if (score < 0.5) return "underperformer";
  return "normal";
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
