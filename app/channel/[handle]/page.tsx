import Link from "next/link";
import type { Metadata } from "next";
import { getChannelAnalytics, type ChannelVideo } from "@/lib/channel-lookup";
import NextVideosSection from "./NextVideosSection";

export const dynamic = "force-dynamic";

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function scoreBadge(score: number | null): { text: string; bg: string; border: string; color: string } | null {
  if (score == null) return null;
  const color = score >= 10 ? "#fdba74" : score >= 5 ? "#ffcc44" : "#4ade80";
  const border = score >= 10 ? "#fb923c" : score >= 5 ? "#ffaa00" : "#00ff87";
  const bg = score >= 10 ? "rgba(249,115,22,0.12)" : score >= 5 ? "rgba(255,170,0,0.12)" : "rgba(0,255,135,0.10)";
  return { text: `🔥 ${score.toFixed(1)}x`, bg, border, color };
}

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const handle = decodeURIComponent(params.handle);
  const title = `${handle.replace(/^@?/, "@")} — outlier videos & stats | TubeWatch`;
  return {
    title,
    description: `See ${handle}'s recent videos ranked by TubeWatch's age-adjusted outlier score, plus views, likes and publish dates.`,
  };
}

export default async function ChannelPage({ params }: { params: { handle: string } }) {
  const handle = decodeURIComponent(params.handle);
  const data = await getChannelAnalytics(handle);

  if (!data.found) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center" style={{ color: "var(--text-primary)" }}>
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">Channel not found</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          We couldn&apos;t find a channel for <span className="font-mono">{handle}</span>. Try the exact @handle.
        </p>
        <Link href="/channel" className="inline-block mt-6 px-5 py-2.5 rounded-lg font-semibold" style={{ background: "#00ff87", color: "#000" }}>
          Search another channel
        </Link>
      </div>
    );
  }

  const { channel, videos } = data;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto" style={{ color: "var(--text-primary)" }}>
      {/* Channel header */}
      <div className="flex items-center gap-4 mb-2">
        {channel.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.thumbnail_url} alt={channel.title} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: "var(--border)" }}>
            {channel.title[0]}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{channel.title}</h1>
          <div className="flex gap-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            {channel.handle && <span>@{channel.handle.replace(/^@/, "")}</span>}
            <span>{fmt(channel.subscriber_count)} subscribers</span>
            <span>{fmt(channel.video_count)} videos</span>
          </div>
        </div>
      </div>

      {/* The payoff moment — 3 next-video ideas built from this channel's
          breakouts, generated instantly with no login. This is what turns a
          cold visitor into "oh, let me try this." */}
      <NextVideosSection handle={channel.handle?.replace(/^@/, "") || handle} />

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
          The breakouts behind those ideas — recent videos ranked by <strong>outlier score</strong> (age-adjusted views/day vs. this channel&apos;s median).
        </p>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0"
          style={{ background: "rgba(0,255,135,0.12)", color: "#00ff87", border: "1px solid rgba(0,255,135,0.3)" }}
        >
          Track this channel on TubeWatch →
        </Link>
      </div>

      {/* Video grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {videos.map((v: ChannelVideo) => {
          const badge = scoreBadge(v.outlier_score);
          return (
            <a
              key={v.youtube_video_id}
              href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border overflow-hidden block transition-transform hover:-translate-y-1"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)", textDecoration: "none", color: "inherit" }}
            >
              <div className="relative" style={{ paddingBottom: "56.25%", background: "#000" }}>
                {v.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail_url} alt={v.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
                {badge && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
                    style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, backdropFilter: "blur(4px)" }}>
                    {badge.text}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium mb-2 leading-snug" style={{ fontSize: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                  {v.title}
                </p>
                <div className="flex items-center gap-3" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <span>👁 {fmt(v.view_count)}</span>
                  <span>👍 {fmt(v.like_count)}</span>
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{fmtDate(v.published_at)}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
