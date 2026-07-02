"use client";
import { useEffect, useState } from "react";
import { ViewTrendChart, type TrendPoint } from "@/components/ViewTrendChart";

type Trend = {
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  points: TrendPoint[];
  latest: number;
  delta: number;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

/**
 * Channel-level view-trend charts (P2.4). Reads the per-video snapshot series
 * for the user's own channel. Because snapshots accrue one point per daily
 * sync, brand-new channels have nothing to plot yet — the widget says so
 * honestly instead of rendering empty boxes, and fills in automatically as
 * history builds. Hidden entirely for users with no channel connected (the
 * dashboard already shows a connect banner in that case).
 */
export default function ViewTrendsWidget() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [hasChannel, setHasChannel] = useState(false);
  const [chartable, setChartable] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/channel/video-trends")
      .then((r) => r.json())
      .then((d) => {
        setHasChannel(!!d.hasChannel);
        setChartable(d.chartable ?? 0);
        setTrends(d.trends ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // No channel → render nothing; the dashboard already handles that state.
  if (!loading && !hasChannel) return null;

  return (
    <div
      className="rounded-2xl border p-5 mb-8"
      style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
    >
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-xl">📈</span>
        <div>
          <h2 className="text-lg font-black text-foreground leading-tight">View Trends</h2>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            How your videos&apos; view counts are climbing over time.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: "var(--border)" }}>
                <div style={{ height: 92, background: "var(--border)" }} />
              </div>
            ))}
          </div>
        ) : chartable === 0 ? (
          <div
            className="rounded-xl border p-5 text-center text-sm"
            style={{ borderColor: "var(--border)", background: "var(--bg-hover, rgba(255,255,255,0.02))", color: "var(--text-muted)" }}
          >
            📊 Collecting trend data. Each daily sync records where your videos&apos; views
            stand — charts appear once a video has 2+ days of history.
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {trends
              .filter((t) => t.points.length >= 2)
              .map((t) => (
                <div
                  key={t.youtube_video_id}
                  className="rounded-xl border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--bg-hover, rgba(255,255,255,0.02))" }}
                >
                  <p
                    className="text-xs font-semibold mb-2 leading-snug"
                    style={{
                      color: "var(--text-primary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                      minHeight: 32,
                    }}
                  >
                    {t.title}
                  </p>
                  <ViewTrendChart points={t.points} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(t.latest)} views</span>
                    {t.delta > 0 && (
                      <span className="text-xs font-bold" style={{ color: "#00ff87" }}>+{fmt(t.delta)}</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
