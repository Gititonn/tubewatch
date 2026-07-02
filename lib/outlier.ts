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
 * This is the ONE scoring function for the whole app — a user's own channel,
 * their tracked competitors, and the shared discovery pool all call this same
 * function (see lib/sync.ts and the competitor sync route). They used to run
 * two different formulas that produced numbers with the same "Nx" label but
 * different meanings — fixed so one badge means one thing everywhere.
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

// Nearly every YouTube video front-loads views in its first 24-72h (subscriber
// notifications + initial algorithm push) then decays. views/day is NOT
// directly comparable across very different ages — a 2-day-old video will
// usually beat a 60-day-old video on views/day purely from that front-load,
// not because it's a genuine breakout. Rather than show a number that's
// mostly measuring "how new is this" instead of "is this outperforming,"
// videos younger than this don't get scored yet — outlier_score stays null
// ("too early to score" in the UI) until the initial spike has settled.
const MIN_SCORABLE_AGE_DAYS = 3;

interface ScorableVideo {
  view_count: number;
  published_at: string | null;
  outlier_score?: number | null;
}

function ageDays(publishedAt: string | null): number | null {
  if (!publishedAt) return null;
  return (Date.now() - new Date(publishedAt).getTime()) / DAY_MS;
}

function viewsPerDay(video: ScorableVideo): number {
  const age = ageDays(video.published_at);
  if (age === null) return video.view_count;
  return video.view_count / Math.max(age, MIN_AGE_DAYS);
}

export function calculateOutlierScores<T extends ScorableVideo>(videos: T[]): T[] {
  if (videos.length < 3) return videos;

  // Median is computed only from videos old enough to have a stable velocity
  // reading, so a batch of brand-new uploads can't drag the baseline around.
  const scorable = videos.filter((v) => {
    const age = ageDays(v.published_at);
    return age === null || age >= MIN_SCORABLE_AGE_DAYS;
  });
  const medianRate = getMedian((scorable.length >= 3 ? scorable : videos).map(viewsPerDay));

  return videos.map((video) => {
    const age = ageDays(video.published_at);
    if (age !== null && age < MIN_SCORABLE_AGE_DAYS) {
      return { ...video, outlier_score: null };
    }
    return {
      ...video,
      outlier_score:
        medianRate > 0
          ? parseFloat((viewsPerDay(video) / medianRate).toFixed(2))
          : 1.0,
    };
  });
}

/**
 * The channel's median views-per-day — the denominator of the outlier score.
 * Exposed so the browser-extension / search-any-channel paths can compute a
 * *single* video's score against a cached channel rate without re-running the
 * whole batch, using the SAME baseline definition as calculateOutlierScores
 * (median over videos old enough to have a stable velocity reading).
 */
export function channelMedianRate(videos: ScorableVideo[]): number {
  const scorable = videos.filter((v) => {
    const age = ageDays(v.published_at);
    return age === null || age >= MIN_SCORABLE_AGE_DAYS;
  });
  return getMedian((scorable.length >= 3 ? scorable : videos).map(viewsPerDay));
}

/**
 * Score one video against a precomputed channel median rate. Returns null for
 * videos too young to score, exactly like calculateOutlierScores.
 */
export function scoreAgainstRate(video: ScorableVideo, medianRate: number): number | null {
  const age = ageDays(video.published_at);
  if (age !== null && age < MIN_SCORABLE_AGE_DAYS) return null;
  return medianRate > 0 ? parseFloat((viewsPerDay(video) / medianRate).toFixed(2)) : 1.0;
}

export type { ScorableVideo };

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

// Re-exported so callers that only need the type don't have to import Video too.
export type { Video };
