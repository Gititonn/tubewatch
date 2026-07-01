import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getUserPlan, isPaidPlan } from "@/lib/plan";
import Link from "next/link";
import Image from "next/image";
import ResyncButton from "./ResyncButton";
import DisconnectChannelButton from "../settings/DisconnectChannelButton";
import OutlierFeedWidget from "./OutlierFeedWidget";

export const dynamic = "force-dynamic";

const CPM_LOW = 2;
const CPM_HIGH = 8;

function estRevenue(views: number) {
  const low = Math.round((views * CPM_LOW) / 1000);
  const high = Math.round((views * CPM_HIGH) / 1000);
  return `$${fmtDollar(low)}-$${fmtDollar(high)}`;
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

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceClient = createServiceClient();

  // AI Coach is paid-gated; free users should be upsold, not sent into a 402.
  const aiUnlocked = isPaidPlan(await getUserPlan(supabase, user!.id));

  // Channel (optional)
  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(1);
  const channel = channels?.[0] ?? null;

  // Videos (only if channel connected)
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
  const recentViews = videos
    .filter((v) => v.published_at && new Date(v.published_at) >= thirtyDaysAgo)
    .reduce((s, v) => s + (v.view_count ?? 0), 0);
  const topOutlier = [...videos].sort((a, b) => (b.outlier_score ?? 0) - (a.outlier_score ?? 0))[0] ?? null;

  // Trending from cache (no auth needed, just Supabase)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: trendingCache } = await serviceClient
    .from("trending_cache")
    .select("*")
    .eq("region_code", "US")
    .eq("video_type", "videos")
    .gte("fetched_at", twoHoursAgo)
    .order("view_count", { ascending: false })
    .limit(8);

  return (
    <div className="p-6 max-w-6xl" style={{ color: "var(--text-primary)" }}>

      {/* Connect banner — only shown if no channel */}
      {!channel && (
        <div
          className="rounded-2xl border p-5 mb-8 flex items-center gap-5"
          style={{
            borderColor: "rgba(0,255,135,0.25)",
            background: "linear-gradient(135deg, rgba(0,255,135,0.06) 0%, var(--bg-card) 100%)",
          }}
        >
          <div className="text-3xl">🎯</div>
          <div className="flex-1">
            <div className="font-black text-foreground mb-0.5">Stop guessing what to film.</div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Discover low-competition, high-outlier topics in your niche before they peak. Connect your channel to layer your own stats on top.
            </div>
          </div>
          <Link
            href="/connect"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-black text-sm transition-transform hover:scale-105"
            style={{ background: "#00ff87" }}
          >
            Connect channel
          </Link>
        </div>
      )}

      {/* Channel header — only if connected */}
      {channel && (
        <>
          <div
            className="rounded-2xl border p-5 flex items-center gap-4 mb-6 relative overflow-hidden"
            style={{
              borderColor: "var(--border)",
              background: "linear-gradient(135deg, #161616 0%, #111 60%, #0a1a0f 100%)",
            }}
          >
            <div
              style={{
                position: "absolute", top: -50, right: -50, width: 180, height: 180,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(0,255,135,0.07) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            {channel.channel_thumbnail && (
              <Image
                src={channel.channel_thumbnail}
                alt={channel.channel_name ?? "Channel"}
                width={56}
                height={56}
                className="rounded-full flex-shrink-0"
                style={{ border: "2px solid rgba(0,255,135,0.3)" }}
              />
            )}
            <div className="flex-1 min-w-0 relative z-10">
              <div className="font-black text-white text-lg" style={{ wordBreak: "break-word" }}>{channel.channel_name}</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                {fmt(channel.subscriber_count ?? 0)} subscribers &middot; {videos.length} videos
              </div>
            </div>
            <div className="flex items-start gap-2 relative z-10">
              <ResyncButton
                channelDbId={channel.id}
                youtubeChannelId={channel.youtube_channel_id}
                lastSyncedAt={channel.last_synced_at ?? null}
              />
              <DisconnectChannelButton
                channelId={channel.id}
                channelName={channel.channel_name ?? "this channel"}
              />
            </div>
          </div>

          {/* Personal stats */}
          <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <StatCard label="Subscribers" value={fmt(channel.subscriber_count ?? 0)} icon="👥" accent="#4ade80" sub="total" />
            <StatCard label="Avg Views / Video" value={fmt(avgViews)} icon="👁" accent="#3b82f6" sub={`across ${videos.length} videos`} />
            <StatCard label="Est. Revenue (30d)" value={recentViews > 0 ? estRevenue(recentViews) : "---"} icon="💰" accent="#4ade80" sub="based on avg CPM" />
            <StatCard label="Top Outlier" value={topOutlier?.outlier_score ? topOutlier.outlier_score.toFixed(1) + "x" : "---"} icon="🔥" accent="#ff4444" sub="channel median" />
          </div>

          {topOutlier && topOutlier.outlier_score >= 2 && (
            <Link href="/outlier">
              <div
                className="rounded-2xl border p-5 mb-8 flex items-center gap-4 transition-all hover:border-red-500/40"
                style={{
                  borderColor: "rgba(255,68,68,0.25)",
                  background: "linear-gradient(135deg, rgba(255,68,68,0.07) 0%, rgba(255,68,68,0.02) 100%)",
                }}
              >
                <div className="text-4xl">🔥</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black mb-1" style={{ color: "#ff4444" }}>YOUR BIGGEST OUTLIER</div>
                  <div className="font-semibold text-white truncate text-sm mb-1">{topOutlier.title}</div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {fmt(topOutlier.view_count ?? 0)} views &middot; {topOutlier.outlier_score.toFixed(1)}x your channel average
                  </div>
                </div>
                <div className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444", border: "1px solid rgba(255,68,68,0.3)" }}>
                  Analyze
                </div>
              </div>
            </Link>
          )}
        </>
      )}


      {/* COMPETITOR OUTLIERS — per-user, category-filterable. THE hero feature:
          featured directly under the channel header, ahead of the AI upsell
          and generic trending, so it's the first substantive thing every
          user — brand new or returning — sees after signing in. Client
          component so category pills can filter without a page reload; also
          fixes the old server query, which had no user_id scoping and showed
          every tracked channel's outliers to every signed-in user. */}
      <OutlierFeedWidget />

      {/* AI Strategy Card — always shown; free users are sent to billing, not a 402 */}
      <Link href={aiUnlocked ? "/ai" : "/billing"}>
        <div
          className="rounded-2xl border p-5 mb-6 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01]"
          style={{
            borderColor: "rgba(168,85,247,0.35)",
            background: "linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(139,92,246,0.04) 60%, var(--bg-card) 100%)",
            boxShadow: "0 0 30px rgba(168,85,247,0.08)",
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
          >
            🧠
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-black text-foreground">TubeWatch AI Engine</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.25)", color: "#c084fc" }}>{aiUnlocked ? "NEW" : "PRO"}</span>
            </div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ask the TubeWatch AI Engine anything — title strategies, why videos go viral, how to grow faster.
            </div>
          </div>
          <div
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff" }}
          >
            {aiUnlocked ? "Ask AI →" : "Unlock with Pro →"}
          </div>
        </div>
      </Link>

      {/* Starter prompts — quick, high-value ways into the AI Engine */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          "Analyze why a competitor just had a view spike",
          "Suggest 3 title variations for a video optimized for CTR",
        ].map((p) => (
          <Link
            key={p}
            href={`/ai?q=${encodeURIComponent(p)}`}
            className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all hover:scale-[1.03]"
            style={{
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#c084fc",
            }}
          >
            ✨ {p}
          </Link>
        ))}
      </div>

      {/* TRENDING NOW — generic YouTube-wide signal, kept but demoted below the niche outlier feed */}
      {trendingCache && trendingCache.length > 0 && (
        <div className="mb-10">
          <SectionHeader href="/trending" label="Trending Now on YouTube" />
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {trendingCache.slice(0, 8).map((v) => (
              <a
                key={v.youtube_video_id}
                href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border overflow-hidden block transition-all hover:border-blue-500/40 hover:scale-[1.02]"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)", boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
              >
                {v.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail_url} alt={v.title} className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
                )}
                <div className="p-3">
                  <p className="text-foreground text-xs font-semibold mb-1 leading-snug"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                    {v.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(v.view_count ?? 0)} views</span>
                    <span className="text-xs" style={{ color: "#3b82f6" }}>{v.channel_name}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Explore feature tiles */}
      <div className="mb-8">
        <SectionHeader label="Explore" />
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
          {[
            { href: "/competitors/outliers", icon: "🔥", label: "Outlier Feed", desc: "Videos crushing their average", accent: "#ef4444", border: "rgba(239,68,68,0.25)", bg: "rgba(239,68,68,0.07)" },
            { href: "/competitors", icon: "⚡", label: "Competitors", desc: "Track rival channels", accent: "#f59e0b", border: "rgba(245,158,11,0.25)", bg: "rgba(245,158,11,0.07)" },
            { href: "/outlier", icon: "⭐", label: "Your Outliers", desc: "YOUR videos that beat the curve", accent: "#4ade80", border: "rgba(0,255,135,0.25)", bg: "rgba(0,255,135,0.07)" },
            { href: "/ai", icon: "🧠", label: "AI Coach", desc: "Ask the TubeWatch AI Engine your strategy questions", accent: "#a855f7", border: "rgba(168,85,247,0.3)", bg: "rgba(168,85,247,0.08)" },
            { href: "/rising", icon: "🚀", label: "Rising Videos", desc: "Spot hits before they peak", accent: "#a855f7", border: "rgba(168,85,247,0.25)", bg: "rgba(168,85,247,0.07)" },
            { href: "/patterns", icon: "🎯", label: "Patterns", desc: "What formats consistently win", accent: "#10b981", border: "rgba(16,185,129,0.25)", bg: "rgba(16,185,129,0.07)" },
            { href: "/trending", icon: "📈", label: "Trending Now", desc: "What's blowing up right now", accent: "#3b82f6", border: "rgba(59,130,246,0.25)", bg: "rgba(59,130,246,0.07)" },
            { href: "/compare", icon: "⚖️", label: "Compare", desc: "Head-to-head channel tool", accent: "#06b6d4", border: "rgba(6,182,212,0.25)", bg: "rgba(6,182,212,0.07)" },
            { href: "/videos", icon: "▶️", label: "All Videos", desc: "Full library + outlier scores", accent: "#888", border: "rgba(255,255,255,0.1)", bg: "rgba(255,255,255,0.03)" },
          ].map((t) => (
            <Link key={t.href} href={t.href}>
              <div className="rounded-xl border p-4 h-full transition-transform hover:scale-[1.02]"
                style={{ borderColor: t.border, background: t.bg }}>
                <div className="text-xl mb-2">{t.icon}</div>
                <div className="font-bold text-sm mb-1" style={{ color: t.accent }}>{t.label}</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{t.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Your recent videos — only if channel connected */}
      {channel && videos.length > 0 && (
        <div>
          <SectionHeader href="/videos" label="Your Recent Videos" />
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {videos.slice(0, 6).map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border overflow-hidden block hover:border-white/20 transition-colors"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)", boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
              >
                {v.thumbnail_url ? (
                  <Image src={v.thumbnail_url} alt={v.title ?? ""} width={320} height={180}
                    className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
                ) : (
                  <div className="w-full flex items-center justify-center text-2xl"
                    style={{ aspectRatio: "16/9", background: "var(--bg-card)", color: "var(--text-muted)" }}>&#9654;</div>
                )}
                <div className="p-3">
                  <p className="text-white text-xs font-semibold mb-2 leading-snug"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                    {v.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(v.view_count ?? 0)} views</span>
                    {v.outlier_score != null && v.outlier_score >= 1.2 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          color: v.outlier_score >= 3 ? "#ff4444" : v.outlier_score >= 2 ? "#ffaa00" : "#4ade80",
                          background: v.outlier_score >= 3 ? "rgba(255,68,68,0.15)" : v.outlier_score >= 2 ? "rgba(255,170,0,0.15)" : "rgba(0,255,135,0.15)",
                        }}>
                        {v.outlier_score.toFixed(1)}x
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ label, href }: { label: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</h2>
      {href && (
        <Link href={href} className="text-xs" style={{ color: "var(--text-muted)" }}>See all</Link>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent, sub }: { label: string; value: string; icon: string; accent: string; sub?: string }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-1 min-w-0"
      style={{ borderColor: "var(--border)", background: `linear-gradient(135deg, ${accent}08 0%, var(--bg-card) 100%)` }}>
      <div className="flex items-center gap-2">
        <span className="text-sm flex-shrink-0">{icon}</span>
        <span className="text-xs uppercase tracking-wide font-semibold truncate" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <div className="text-2xl font-black mt-1 leading-tight break-all" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{sub}</div>}
    </div>
  );
}
