import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import ResyncButton from "./ResyncButton";

export const dynamic = "force-dynamic";

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
  const avgViews =
    totalVideos > 0
      ? Math.round(
          videos.reduce((s, v) => s + (v.view_count ?? 0), 0) / totalVideos
        )
      : 0;
  const topOutlier =
    [...videos].sort((a, b) => (b.outlier_score ?? 0) - (a.outlier_score ?? 0))[0] ?? null;
  const mostRecent = videos[0] ?? null;

  // Last 12 videos in chronological order for chart
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
                @{channel.youtube_channel_id?.toLowerCase()} ·{" "}
                {totalVideos} videos synced
              </div>
            </div>
            <ResyncButton
              channelDbId={channel.id}
              youtubeChannelId={channel.youtube_channel_id}
            />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon="👥"
              label="Subscribers"
              value={fmt(channel.subscriber_count ?? 0)}
            />
            <StatCard
              icon="▶️"
              label="Avg Views / Video"
              value={fmt(avgViews)}
            />
            <StatCard
              icon="📹"
              label="Videos Tracked"
              value={totalVideos.toLocaleString()}
            />
            <StatCard
              icon="🔥"
              label="Top Outlier Score"
              value={
                topOutlier?.outlier_score
                  ? topOutlier.outlier_score.toFixed(1) + "x"
                  : "—"
              }
              sub={topOutlier?.title ?? ""}
              accent="#ff4444"
            />
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
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center justify-end"
                          title={`${v.title ?? "Video"}\n${(v.view_count ?? 0).toLocaleString()} views`}
                        >
                          <div
                            className="w-full rounded-t"
                            style={{
                              height: `${Math.max(pct, 4)}%`,
                              background: color,
                              opacity: 0.9,
                              transition: "height 0.3s ease",
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
                  Sync your channel to see chart
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
                  <div className="flex items-center justify-between">
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
                  {mostRecent.published_at && (
                    <div className="text-xs mt-1.5" style={{ color: "#444" }}>
                      {new Date(mostRecent.published_at).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
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
              <span className="text-sm font-semibold text-white">
                Recent Videos
              </span>
              <Link
                href="/videos"
                className="text-xs"
                style={{ color: "#555" }}
              >
                View all →
              </Link>
            </div>
            {videos.length === 0 ? (
              <div
                className="px-5 py-8 text-center text-sm"
                style={{ color: "#444" }}
              >
                No videos synced yet. Hit Resync above.
              </div>
            ) : (
              <div>
                {videos.slice(0, 8).map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-4 px-5 py-3 border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: "#161616" }}
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
                        className="flex-shrink-0 rounded flex items-center justify-center text-lg"
                        style={{
                          width: 80,
                          height: 45,
                          background: "#222",
                        }}
                      >
                        ▶
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {v.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#555" }}>
                        {v.published_at
                          ? new Date(v.published_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )
                          : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-3">
                      <div className="text-white text-sm font-semibold">
                        {fmt(v.view_count ?? 0)}
                      </div>
                      <div className="text-xs" style={{ color: "#555" }}>
                        views
                      </div>
                    </div>
                    {v.outlier_score != null ? (
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 text-center"
                        style={{
                          color: outlierColor(v.outlier_score),
                          background: outlierColor(v.outlier_score) + "20",
                          border: `1px solid ${outlierColor(v.outlier_score)}44`,
                          minWidth: "52px",
                        }}
                      >
                        {outlierLabel(v.outlier_score)}
                      </span>
                    ) : (
                      <div style={{ minWidth: "52px" }} />
                    )}
                  </div>
                ))}
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
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xs mb-1 uppercase tracking-wide" style={{ color: "#555" }}>
        {label}
      </div>
      <div
        className="text-3xl font-black"
        style={{ color: accent ?? "white" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-xs mt-1 truncate"
          style={{ color: "#444" }}
          title={sub}
        >
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
        style={{ background: color, border: color === "#2a2a2a" ? "1px solid #444" : "none" }}
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
