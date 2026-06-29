"use client";
import { useState, useEffect } from "react";

type CompetitorChannel = {
  id: string;
  channel_name: string;
  channel_handle: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  youtube_channel_id: string;
};

type RisingVideo = {
  id: string;
  title: string;
  youtube_video_id: string;
  thumbnail_url: string | null;
  view_count: number;
  outlier_score: number | null;
  published_at: string | null;
  competitor_channels: CompetitorChannel | CompetitorChannel[];
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function scoreColor(score: number) {
  if (score >= 10) return { bg: "rgba(255,68,68,0.12)", border: "#f87171", text: "#fca5a5" };
  if (score >= 5) return { bg: "rgba(255,170,0,0.12)", border: "#ffaa00", text: "#ffcc44" };
  return { bg: "rgba(0,255,135,0.10)", border: "#00ff87", text: "#4ade80" };
}

const MAX_SUB_OPTIONS = [
  { label: "10K", value: 10000 },
  { label: "50K", value: 50000 },
  { label: "100K", value: 100000 },
  { label: "500K", value: 500000 },
];

const MIN_SCORE_OPTIONS = [
  { label: "3x", value: 3 },
  { label: "5x", value: 5 },
  { label: "10x", value: 10 },
];

const DAYS_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function activeStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "#00ff87", color: "#000", border: "1px solid #00ff87" }
    : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" };
}

export default function RisingPage() {
  const [videos, setVideos] = useState<RisingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxSubscribers, setMaxSubscribers] = useState(100000);
  const [minScore, setMinScore] = useState(3);
  const [daysAgo, setDaysAgo] = useState(30);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      minScore: minScore.toString(),
      maxSubscribers: maxSubscribers.toString(),
      daysAgo: daysAgo.toString(),
      limit: "30",
    });
    fetch(`/api/rising?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.videos ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [minScore, maxSubscribers, daysAgo]);

  function getChannel(v: RisingVideo): CompetitorChannel | null {
    if (!v.competitor_channels) return null;
    if (Array.isArray(v.competitor_channels)) return v.competitor_channels[0] ?? null;
    return v.competitor_channels;
  }

  async function trackChannel(ch: CompetitorChannel) {
    const id = ch.youtube_channel_id;
    if (tracked.has(id) || tracking.has(id)) return;
    setTracking((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/competitors/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: ch.youtube_channel_id,
          name: ch.channel_name,
          handle: ch.channel_handle,
          thumbnail: ch.thumbnail_url,
        }),
      });
      if (res.ok) {
        setTracked((prev) => new Set(prev).add(id));
      }
    } finally {
      setTracking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl" style={{ color: "var(--text-primary)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Rising Channels Radar</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Channels blowing up before everyone else finds them
        </p>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-1">
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>Max subs:</span>
          {MAX_SUB_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMaxSubscribers(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={activeStyle(maxSubscribers === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginRight: 4 }}>Min score:</span>
          {MIN_SCORE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMinScore(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={activeStyle(minScore === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDaysAgo(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={activeStyle(daysAgo === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!loading && (
          <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: "auto" }}>
            {videos.length} video{videos.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      ) : videos.length === 0 ? (
        <div>
          {/* Rich empty state */}
          <div
            className="rounded-xl border flex flex-col items-center justify-center py-16 text-center mb-8"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-xl font-black text-white mb-3">Catch Breakouts Before They Go Viral</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 440, lineHeight: 1.6 }}>
              Rising shows videos from competitor channels gaining momentum in the first 48–72 hours — before the algorithm kicks in.{" "}
              Add competitors to start tracking early signals.
            </p>
            <a
              href="/competitors"
              className="mt-6 inline-block px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                border: "1px solid #00ff87",
                color: "#00ff87",
                background: "transparent",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,255,135,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              Add Your First Competitor →
            </a>
          </div>

          {/* Ghost preview cards */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              opacity: 0.4,
              pointerEvents: "none",
              filter: "blur(1px)",
            }}
          >
            {[
              { title: "I Tried Every Productivity App for 30 Days", channel: "TechMinimalist", subs: "42K", views: "184K", score: "8.2" },
              { title: "Why YouTube Shorts Are Killing Long-Form (Data)", channel: "CreatorInsights", subs: "28K", views: "97K", score: "5.6" },
              { title: "The 5AM Routine That Actually Changed My Life", channel: "MindsetDaily", subs: "61K", views: "312K", score: "12.1" },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <div className="relative" style={{ paddingBottom: "56.25%", background: "var(--bg-card)" }}>
                  <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--text-muted)", fontSize: 24 }}>▶</div>
                  <div
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
                    style={{ background: "rgba(0,255,135,0.10)", border: "1px solid #00ff87", color: "#00ff87" }}
                  >
                    {card.score}x
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-medium mb-2 leading-snug" style={{ fontSize: 14, color: "var(--text-primary)" }}>{card.title}</p>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#2a2a2a", color: "var(--text-secondary)" }}>
                      {card.channel[0]}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{card.channel}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{card.subs} subs</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    <span>Jun 27, 2026</span>
                    <span style={{ marginLeft: "auto" }}>{card.views} views</span>
                  </div>
                  <div className="w-full py-1.5 rounded-lg text-xs font-medium text-center" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    Track Channel
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        >
          {videos.map((v) => {
            const score = v.outlier_score ?? 0;
            const colors = scoreColor(score);
            const ytUrl = `https://youtube.com/watch?v=${v.youtube_video_id}`;
            const ch = getChannel(v);

            return (
              <div
                key={v.id}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <div className="relative" style={{ paddingBottom: "56.25%", background: "var(--bg-card)" }}>
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ color: "var(--text-muted)" }}
                      >
                        ▶
                      </div>
                    )}
                    <div
                      className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {score.toFixed(1)}x
                    </div>
                  </div>
                </a>

                <div className="p-3">
                  <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <p
                      className="font-medium mb-2 leading-snug"
                      style={{
                        fontSize: 14,
                        color: "var(--text-primary)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                    >
                      {v.title}
                    </p>
                  </a>

                  <div className="flex items-center gap-2 mb-1">
                    {ch?.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ch.thumbnail_url}
                        alt={ch.channel_name}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "#2a2a2a", color: "var(--text-secondary)" }}
                      >
                        {ch?.channel_name?.[0] ?? "?"}
                      </div>
                    )}
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{ch?.channel_name}</span>
                    {ch?.subscriber_count != null && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                        {fmt(ch.subscriber_count)} subs
                      </span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-3 mb-3"
                    style={{ fontSize: 12, color: "var(--text-muted)" }}
                  >
                    <span>{fmtDate(v.published_at)}</span>
                    <span style={{ marginLeft: "auto" }}>{fmt(v.view_count)} views</span>
                  </div>

                  {ch && (
                    <button
                      onClick={() => trackChannel(ch)}
                      disabled={tracked.has(ch.youtube_channel_id) || tracking.has(ch.youtube_channel_id)}
                      className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={
                        tracked.has(ch.youtube_channel_id)
                          ? { background: "#1a2a1a", color: "#00ff87", border: "1px solid #00ff8744", cursor: "default" }
                          : tracking.has(ch.youtube_channel_id)
                          ? { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "wait" }
                          : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer" }
                      }
                    >
                      {tracked.has(ch.youtube_channel_id)
                        ? "✓ Tracked"
                        : tracking.has(ch.youtube_channel_id)
                        ? "Tracking…"
                        : "Track Channel"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
