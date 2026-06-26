import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import ResyncButton from "./ResyncButton";

export const dynamic = "force-dynamic";

// Revenue estimate: $2–$8 CPM (typical small-creator range)
const CPM_LOW = 2;
const CPM_HIGH = 8;

function estRevenue(views: number) {
  const low = Math.round((views * CPM_LOW) / 1000);
  const high = Math.round((views * CPM_HIGH) / 1000);
  return { low, high, label: `$${fmtDollar(low)}–$${fmtDollar(high)}` };
}

function fmtDollar(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function outlierColor(score: number | null) {
  if (!score) return "#2a2a2a";
  if (score >= 3) return "#ff4444";
  if (score >= 2) return "#ffaa00";
  if (score >= 1.2) return "#00ff87";
  return "#2a2a2a";
}

function outlierLabel(score: number | null) {
  if (!score) return null;
  if (score >= 3) return "🔥 " + score.toFixed(1) + "x";
  if (score >= 2) return "⭐ " + score.toFixed(1) + "x";
  if (score >= 1.2) return "📈 " + score.toFixed(1) + "x";
  return score.toFixed(1) + "x";
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", user!.id)
    .limit(1);

  const channel = channels?.[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let videos: any[] = [];

  if (channel) {
    const { data } = await supabase
      .from("videos")
      .select("*")
      .eq("channel_id", channel.id)
      .order("published_at", { ascending: false });
    videos = data ?? [];
  }

  const totalVideos = videos.length;
  const totalViews = videos.reduce((s, v) => s + (v.view_count ?? 0), 0);
  const avgViews = totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;

  // Revenue from last 30 days of videos
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentViews = videos
    .filter((v) => v.published_at && new Date(v.published_at) >= thirtyDaysAgo)
    .reduce((s, v) => s + (v.view_count ?? 0), 0);
  const rev30 = estRevenue(recentViews);
  const revTotal = estRevenue(totalViews);

  const topOutlier =
    [...videos].sort(
      (a, b) => (b.outlier_score ?? 0) - (a.outlier_score ?? 0)
    )[0] ?? null;
  const mostRecent = videos[0] ?? null;

  // Last 12 videos chronologically for bar chart
  const chartVideos = [...videos].slice(0, 12).reverse();
  const maxViews = Math.max(...chartVideos.map((v) => v.view_count ?? 0), 1);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {!channel ? (
        <EmptyState />
      ) : (
        <>
          {/* Channel header */}
          <div
            className="rounded-xl border p-5 flex items-center gap-4 mb-6"
            style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
          >
            {channel.channel_thumbnail && (
              <Image
                src={channel.channel_thumbnail}
                alt={channel.channel_name ?? "Channel"}
                width={56}
                height={56}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              <div className="font-bold text-white text-lg">
                {channel.channel_name}
              </div>
              <div className="text-sm" style={{ color: "#666" }}>
                {channel.subscriber_count?.toLocaleString()} subscribers ·{" "}
                {totalVideos} videos synced
              </div>
            </div>
            <ResyncButton
              channelDbId={channel.id}
              youtubeChannelId={channel.youtube_channel_id}
            />
          </div>

          {/* Stat cards row 1 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard icon="👥" label="Subscribers" value={fmt(channel.subscriber_count ?? 0)} />
            <StatCard icon="▶️" label="Avg Views / Video" value={fmt(avgViews)} />
            <StatCard icon="📹" label="Videos Tracked" value={totalVideos.toLocaleString()} />
            <StatCard
              icon="🔥"
              label="Top Outlier Score"
              value={topOutlier?.outlier_score ? topOutlier.outlier_score.toFixed(1) + "x" : "—"}
              sub={topOutlier?.title ?? ""}
              accent="#ff4444"
            />
          </div>

          {/* Stat cards row 2 — revenue */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              icon="💰"
              label="Est. Revenue (last 30d)"
              value={recentViews > 0 ? rev30.label : "—"}
              sub={recentViews > 0 ? `from ${fmt(recentViews)} views` : "No recent videos"}
              accent="#00ff87"
            />
            <StatCard
              icon="📊"
              label="Est. Revenue (all-time)"
              value={totalViews > 0 ? revTotal.label : "—"}
              sub={totalViews > 0 ? `from ${fmt(totalViews)} total views` : "Sync your channel first"}
              accent="#00ff87"
            />
            <div
              className="rounded-xl border p-5 flex items-start gap-3"
              style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
            >
              <div className="text-xl mt-0.5">ℹ️</div>
              <div>
                <div className="text-xs font-semibold text-white mb-1">
                  About revenue estimates
                </div>
                <div className="text-xs leading-relaxed" style={{ color: "#555" }}>
                  Based on $2–$8 CPM range. Actual earnings vary by niche, audience location, and ad type. Requires{" "}
                  <span style={{ color: "#888" }}>YouTube Partner Program</span>{" "}
                  (1K subs + 4K watch hours).
                </div>
              </div>
            </div>
          </div>

          {/* Chart + Most Recent */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "2fr 1fr" }}>
            {/* Bar chart */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
            >
              <div className="text-sm font-semibold text-white mb-1">
                Recent Video Performance
              </div>
              <div className="text-xs mb-4" style={{ color: "#555" }}>
                Last {chartVideos.length} videos · colored by outlier score
              </div>
              {chartVideos.length > 0 ? (
                <>
                  <div className="flex items-end gap-1.5 h-36">
                    {chartVideos.map((v, i) => {
                      const pct = ((v.view_count ?? 0) / maxViews) * 100;
                      const color = outlierColor(v.outlier_score);
                      const rev = estRevenue(v.view_count ?? 0);
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end"
                          title={`${v.title ?? "Video"}\n${(v.view_count ?? 0).toLocaleString()} views\nEst. ${rev.label}`}
                        >
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${Math.max(pct, 4)}%`,
                              background: color,
                              opacity: 0.9,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <LegendDot color="#ff4444" label="Outlier 3x+" />
                    <LegendDot color="#ffaa00" label="Strong 2x+" />
                    <LegendDot color="#00ff87" label="Above avg" />
                    <LegendDot color="#2a2a2a" label="Below avg" />
                  </div>
                </>
              ) : (
                <div
                  className="h-36 flex items-center justify-center text-sm"
                  style={{ color: "#444" }}
                >
                  Sync your channel to see the chart
                </div>
              )}
            </div>

            {/* Most recent video */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
            >
              <div className="text-sm font-semibold text-white mb-3">
                Most Recent Video
              </div>
              {mostRecent ? (
                <>
                  {mostRecent.thumbnail_url && (
                    <Image
                      src={mostRecent.thumbnail_url}
                      alt={mostRecent.title ?? ""}
                      width={320}
                      height={180}
                      className="rounded-lg w-full object-cover mb-3"
                    />
                  )}
                  <p className="text-white text-xs font-semibold mb-2 line-clamp-2 leading-snug">
                    {mostRecent.title}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: "#555" }}>
                      {(mostRecent.view_count ?? 0).toLocaleString()} views
                    </span>
                    {mostRecent.outlier_score != null && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: outlierColor(mostRecent.outlier_score),
                          background: outlierColor(mostRecent.outlier_score) + "22",
                          border: `1px solid ${outlierColor(mostRecent.outlier_score)}55`,
                        }}
                      >
                        {outlierLabel(mostRecent.outlier_score)}
                      </span>
                    )}
                  </div>
                  {mostRecent.view_count > 0 && (
                    <div
                      className="text-xs px-2 py-1.5 rounded-lg font-semibold"
                      style={{ background: "#00ff8712", color: "#00ff87", border: "1px solid #00ff8722" }}
                    >
                      💰 Est. {estRevenue(mostRecent.view_count).label}
                    </div>
                  )}
                  {mostRecent.published_at && (
                    <div className="text-xs mt-2" style={{ color: "#444" }}>
                      {new Date(mostRecent.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm" style={{ color: "#444" }}>
                  No videos yet
                </div>
              )}
            </div>
          </div>

          {/* Recent videos table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: "#2a2a2a" }}
            >
              <span className="text-sm font-semibold text-white">Recent Videos</span>
              <Link href="/videos" className="text-xs" style={{ color: "#555" }}>
                View all →
              </Link>
            </div>

            {/* Table header */}
            <div
              className="grid px-5 py-2 text-xs border-b"
              style={{
                borderColor: "#222",
                color: "#444",
                gridTemplateColumns: "80px 1fr 80px 80px 100px",
                gap: "16px",
              }}
            >
              <span />
              <span>Title</span>
              <span className="text-right">Views</span>
              <span className="text-center">Score</span>
              <span className="text-right">Est. Revenue</span>
            </div>

            {videos.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: "#444" }}>
                No videos synced yet. Hit Resync above.
              </div>
            ) : (
              <div>
                {videos.slice(0, 10).map((v) => {
                  const rev = estRevenue(v.view_count ?? 0);
                  return (
                    <div
                      key={v.id}
                      className="grid items-center px-5 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderColor: "#161616",
                        gridTemplateColumns: "80px 1fr 80px 80px 100px",
                        gap: "16px",
                      }}
                    >
                      {v.thumbnail_url ? (
                        <Image
                          src={v.thumbnail_url}
                          alt={v.title ?? ""}
                          width={80}
                          height={45}
                          className="rounded flex-shrink-0 object-cover"
                          style={{ aspectRatio: "16/9" }}
                        />
                      ) : (
                        <div
                          className="rounded flex items-center justify-center text-base"
                          style={{ width: 80, height: 45, background: "#222" }}
                        >
                          ▶
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{v.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                          {v.published_at
                            ? new Date(v.published_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-white text-sm font-semibold">
                          {fmt(v.view_count ?? 0)}
                        </div>
                      </div>

                      <div className="flex justify-center">
                        {v.outlier_score != null ? (
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: outlierColor(v.outlier_score),
                              background: outlierColor(v.outlier_score) + "20",
                              border: `1px solid ${outlierColor(v.outlier_score)}44`,
                            }}
                          >
                            {outlierLabel(v.outlier_score)}
                          </span>
                        ) : (
                          <span style={{ color: "#444" }}>—</span>
                        )}
                      </div>

                      <div className="text-right">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: "#00ff87" }}
                        >
                          {(v.view_count ?? 0) > 0 ? rev.label : "—"}
                        </div>
                        <div className="text-xs" style={{ color: "#3a3a3a" }}>
                          est.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
        {label}
      </div>
      <div className="text-3xl font-black" style={{ color: accent ?? "white" }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1 truncate" style={{ color: "#444" }} title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
        style={{
          background: color,
          border: color === "#2a2a2a" ? "1px solid #444" : "none",
        }}
      />
      <span className="text-xs" style={{ color: "#555" }}>
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-xl border p-8 text-center"
      style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
    >
      <div className="text-4xl mb-4">📺</div>
      <h2 className="text-lg font-semibold text-white mb-2">
        Connect your YouTube channel
      </h2>
      <p className="text-sm mb-6" style={{ color: "#888" }}>
        Add your channel to start tracking your video performance.
      </p>
      <Link
        href="/connect"
        className="inline-block px-6 py-2.5 rounded-lg font-semibold text-black text-sm transition-opacity hover:opacity-90"
        style={{ background: "#00ff87" }}
      >
        Connect channel
      </Link>
    </div>
  );
}
