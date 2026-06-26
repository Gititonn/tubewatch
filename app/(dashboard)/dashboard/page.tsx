import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import ResyncButton from "./ResyncButton";
import AnalyticsChart from "./AnalyticsChart";
import FeatureTile from "./FeatureTile";

export const dynamic = "force-dynamic";

const CPM_LOW = 2;
const CPM_HIGH = 8;

function estRevenue(views: number) {
  const low = Math.round((views * CPM_LOW) / 1000);
  const high = Math.round((views * CPM_HIGH) / 1000);
  return `$${fmtDollar(low)}–$${fmtDollar(high)}`;
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

const FEATURE_TILES = [
  {
    href: "/trending",
    icon: "📈",
    label: "Trending Now",
    desc: "What's blowing up on YouTube right now",
    accent: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    glow: "rgba(59,130,246,0.15)",
  },
  {
    href: "/rising",
    icon: "🚀",
    label: "Rising Videos",
    desc: "Early momentum — spot hits before they peak",
    accent: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    glow: "rgba(168,85,247,0.15)",
  },
  {
    href: "/competitors",
    icon: "⚡",
    label: "Competitors",
    desc: "Track rival channels and benchmark your growth",
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    glow: "rgba(245,158,11,0.15)",
  },
  {
    href: "/competitors/outliers",
    icon: "🔥",
    label: "Outlier Feed",
    desc: "Competitor videos crushing their own average",
    accent: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    glow: "rgba(239,68,68,0.15)",
  },
  {
    href: "/patterns",
    icon: "🎯",
    label: "Patterns",
    desc: "What formats and topics consistently win",
    accent: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    glow: "rgba(16,185,129,0.15)",
  },
  {
    href: "/outlier",
    icon: "⭐",
    label: "Your Outliers",
    desc: "Which of YOUR videos beat the curve",
    accent: "#00ff87",
    bg: "rgba(0,255,135,0.08)",
    border: "rgba(0,255,135,0.25)",
    glow: "rgba(0,255,135,0.15)",
  },
  {
    href: "/compare",
    icon: "⚖️",
    label: "Compare Channels",
    desc: "Head-to-head channel comparison tool",
    accent: "#06b6d4",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.25)",
    glow: "rgba(6,182,212,0.15)",
  },
  {
    href: "/videos",
    icon: "▶️",
    label: "All Videos",
    desc: "Full library with outlier scores and stats",
    accent: "#94a3b8",
    bg: "rgba(148,163,184,0.05)",
    border: "rgba(148,163,184,0.15)",
    glow: "rgba(148,163,184,0.1)",
  },
];

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

  const totalViews = videos.reduce((s, v) => s + (v.view_count ?? 0), 0);
  const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentVideos30d = videos.filter(
    (v) => v.published_at && new Date(v.published_at) >= thirtyDaysAgo
  );
  const recentViews = recentVideos30d.reduce((s, v) => s + (v.view_count ?? 0), 0);

  const topOutlier =
    [...videos].sort((a, b) => (b.outlier_score ?? 0) - (a.outlier_score ?? 0))[0] ?? null;
  const recentVideos = videos.slice(0, 6);

  return (
    <div className="p-8 max-w-6xl" style={{ color: "#fff" }}>
      {!channel ? (
        <EmptyState />
      ) : (
        <>
          {/* Channel header */}
          <div
            className="rounded-2xl border p-6 mb-6 relative overflow-hidden"
            style={{
              borderColor: "#2a2a2a",
              background: "linear-gradient(135deg, #161616 0%, #111 60%, #0a1a0f 100%)",
            }}
          >
            {/* Subtle green glow top-right */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,255,135,0.08) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div className="flex items-center gap-4 relative z-10">
              {channel.channel_thumbnail ? (
                <div style={{ position: "relative" }}>
                  <Image
                    src={channel.channel_thumbnail}
                    alt={channel.channel_name ?? "Channel"}
                    width={64}
                    height={64}
                    className="rounded-full"
                    style={{ border: "2px solid rgba(0,255,135,0.3)" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: -2,
                      borderRadius: "50%",
                      boxShadow: "0 0 16px rgba(0,255,135,0.2)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
                  style={{ background: "#1a1a1a", border: "2px solid #2a2a2a" }}
                >
                  {channel.channel_name?.[0] ?? "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-black text-white text-xl leading-tight truncate mb-0.5">
                  {channel.channel_name}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "#00ff87" }}>
                    {fmt(channel.subscriber_count ?? 0)} subscribers
                  </span>
                  <span style={{ color: "#2a2a2a" }}>·</span>
                  <span className="text-sm" style={{ color: "#555" }}>
                    {videos.length} videos synced
                  </span>
                </div>
              </div>
              <ResyncButton
                channelDbId={channel.id}
                youtubeChannelId={channel.youtube_channel_id}
                lastSyncedAt={channel.last_synced_at ?? null}
              />
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
            <StatCard
              label="Subscribers"
              value={fmt(channel.subscriber_count ?? 0)}
              icon="👥"
              accent="#00ff87"
              sub="total"
            />
            <StatCard
              label="Avg Views / Video"
              value={fmt(avgViews)}
              icon="👁"
              accent="#3b82f6"
              sub={`across ${videos.length} videos`}
            />
            <StatCard
              label="Est. Revenue (30d)"
              value={recentViews > 0 ? estRevenue(recentViews) : "---"}
              icon="💰"
              accent="#10b981"
              sub="based on avg CPM"
            />
            <StatCard
              label="Top Outlier"
              value={
                topOutlier?.outlier_score ? topOutlier.outlier_score.toFixed(1) + "x" : "---"
              }
              icon="🔥"
              accent="#ef4444"
              sub="channel median"
            />
          </div>

          {/* Spotlight — top outlier */}
          {topOutlier && topOutlier.outlier_score >= 2 && (
            <Link href="/outlier">
              <div
                className="rounded-2xl border p-5 mb-6 flex items-center gap-5 cursor-pointer group transition-all"
                style={{
                  borderColor: "rgba(255,68,68,0.35)",
                  background:
                    "linear-gradient(135deg, rgba(255,68,68,0.1) 0%, rgba(255,68,68,0.04) 100%)",
                }}
              >
                <div className="text-4xl flex-shrink-0">🔥</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black mb-1 tracking-widest" style={{ color: "#ff4444" }}>
                    YOUR BIGGEST OUTLIER
                  </div>
                  <div className="text-white font-bold truncate mb-1">
                    {topOutlier.title}
                  </div>
                  <div className="text-sm" style={{ color: "#888" }}>
                    {fmt(topOutlier.view_count ?? 0)} views &middot;{" "}
                    <span style={{ color: "#ff6666" }}>
                      {topOutlier.outlier_score.toFixed(1)}x
                    </span>{" "}
                    your channel average
                  </div>
                </div>
                <div
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold group-hover:scale-105 transition-transform"
                  style={{
                    background: "rgba(255,68,68,0.15)",
                    color: "#ff4444",
                    border: "1px solid rgba(255,68,68,0.35)",
                  }}
                >
                  Analyze →
                </div>
              </div>
            </Link>
          )}

          {/* Analytics chart */}
          <div className="mb-8">
            <SectionLabel>Analytics</SectionLabel>
            <AnalyticsChart />
          </div>

          {/* Feature tiles */}
          <div className="mb-8">
            <SectionLabel>Explore</SectionLabel>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
            >
              {FEATURE_TILES.map((tile) => (
                <FeatureTile key={tile.href} {...tile} />
              ))}
            </div>
          </div>

          {/* Recent videos */}
          {recentVideos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Recent Videos</SectionLabel>
                <Link
                  href="/videos"
                  className="text-xs font-semibold transition-colors hover:text-white"
                  style={{ color: "#555" }}
                >
                  View all →
                </Link>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
              >
                {recentVideos.map((v) => {
                  const score = v.outlier_score ?? 0;
                  const scoreAccent =
                    score >= 3 ? "#ef4444" : score >= 2 ? "#f59e0b" : "#00ff87";
                  const scoreBg =
                    score >= 3
                      ? "rgba(239,68,68,0.15)"
                      : score >= 2
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(0,255,135,0.15)";

                  return (
                    <a
                      key={v.id}
                      href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl border overflow-hidden block transition-all hover:scale-[1.02] hover:border-white/20"
                      style={{ borderColor: "#2a2a2a", background: "#111" }}
                    >
                      {v.thumbnail_url ? (
                        <Image
                          src={v.thumbnail_url}
                          alt={v.title ?? ""}
                          width={320}
                          height={180}
                          className="w-full object-cover"
                          style={{ aspectRatio: "16/9" }}
                        />
                      ) : (
                        <div
                          className="w-full flex items-center justify-center text-2xl"
                          style={{ aspectRatio: "16/9", background: "#1a1a1a", color: "#333" }}
                        >
                          ▶
                        </div>
                      )}
                      <div className="p-3">
                        <p
                          className="text-white text-xs font-semibold mb-2 leading-snug"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical" as const,
                            overflow: "hidden",
                          }}
                        >
                          {v.title}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: "#555" }}>
                            {fmt(v.view_count ?? 0)} views
                          </span>
                          {score >= 1.2 && (
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-md"
                              style={{ color: scoreAccent, background: scoreBg }}
                            >
                              {score.toFixed(1)}x
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-black uppercase tracking-widest mb-3"
      style={{ color: "#444" }}
    >
      {children}
    </h2>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-1"
      style={{
        borderColor: "#2a2a2a",
        background: `linear-gradient(135deg, ${accent}08 0%, #111 100%)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs uppercase tracking-wide font-semibold" style={{ color: "#444" }}>
          {label}
        </span>
      </div>
      <div className="text-3xl font-black mt-1" style={{ color: accent }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs" style={{ color: "#444" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl mb-6">🎬</div>
      <h2 className="text-2xl font-black text-white mb-3">Connect your YouTube channel</h2>
      <p className="text-base mb-8 max-w-md" style={{ color: "#666" }}>
        TubeWatch analyzes your videos, scores your outliers, and tracks what&apos;s working for
        competitors in your niche.
      </p>
      <Link
        href="/connect"
        className="inline-block px-8 py-3.5 rounded-xl font-black text-black text-base transition-transform hover:scale-105"
        style={{ background: "#00ff87", boxShadow: "0 0 32px rgba(0,255,135,0.3)" }}
      >
        Connect channel
      </Link>
      <p className="mt-4 text-sm" style={{ color: "#333" }}>
        Takes 30 seconds · Free
      </p>
    </div>
  );
}
