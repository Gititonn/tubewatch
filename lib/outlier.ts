import type { Video } from "./types";

export function calculateOutlierScores(videos: Video[]): Video[] {
  if (videos.length < 3) return videos;

  const viewCounts = videos.map((v) => v.view_count);
  const median = getMedian(viewCounts);

  return videos.map((video) => ({
    ...video,
    outlier_score:
      median > 0 ? parseFloat((video.view_count / median).toFixed(2)) : 1.0,
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
