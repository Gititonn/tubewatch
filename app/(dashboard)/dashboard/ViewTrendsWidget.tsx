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

// Example series for the collecting-data empty state (blurred, aria-hidden).
const days = (vals: number[]): TrendPoint[] =>
  vals.map((v, i) => ({ t: new Date(Date.now() - (vals.length - 1 - i) * 86400000).toISOString(), v }));
const EXAMPLE_TRENDS = [
  { title: "Your next breakout video", points: days([1200, 1900, 3400, 6800, 12400]), latest: "12.4K views", delta: "+5.6K" },
  { title: "A steady performer", points: days([8200, 8600, 9100, 9500, 9900]), latest: "9.9K views", delta: "+400" },
  { title: "An old video resurging", points: days([40200, 40300, 40900, 42800, 46100]), latest: "46.1K views", delta: "+3.3K" },
];

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
          // Sell the destination, not the wait: a blurred example of what the
          // widget becomes, with the "collecting" note on top. A bare text
          // block gives the user no reason to come back in two days.
          <div className="relative rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div
              aria-hidden
              className="pointer-events-none select-none grid gap-3 p-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                filter: "blur(4px)",
                opacity: 0.5,
              }}
            >
              {EXAMPLE_TRENDS.map((ex) => (
                <div
                  key={ex.title}
                  className="rounded-xl border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--bg-hover, rgba(255,255,255,0.02))" }}
                >
                  <p className="text-xs font-semibold mb-2 leading-snug" style={{ color: "var(--text-primary)", minHeight: 32 }}>
                    {ex.title}
                  </p>
                  <ViewTrendChart points={ex.points} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{ex.latest}</span>
                    <span className="text-xs font-bold" style={{ color: "#00ff87" }}>{ex.delta}</span>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center text-center px-6"
              style={{ background: "rgba(10,10,10,0.55)" }}
            >
              <p className="text-sm" style={{ color: "var(--text-secondary)", maxWidth: 420 }}>
                📊 <span className="font-semibold text-white">Collecting trend data.</span> Each daily
                sync records where your videos&apos; views stand — charts like these appear once a
                video has 2+ days of history.
              </p>
            </div>
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
