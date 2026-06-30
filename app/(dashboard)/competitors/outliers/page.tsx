"use client";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useState, useEffect } from "react";

type CompetitorChannel = {
  id: string;
  channel_name: string;
};

type OutlierVideo = {
  id: string;
  competitor_channel_id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  outlier_score: number | null;
  competitor_channels: {
    id: string;
    channel_name: string;
    thumbnail_url: string | null;
    youtube_channel_id: string;
  };
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

function scoreColor(score: number): { bg: string; border: string; text: string } {
  if (score >= 10) return { bg: "rgba(255,68,68,0.12)", border: "#f87171", text: "#fca5a5" };
  if (score >= 5) return { bg: "rgba(255,170,0,0.12)", border: "#ffaa00", text: "#ffcc44" };
  return { bg: "rgba(0,255,135,0.10)", border: "#00ff87", text: "#4ade80" };
}

const MIN_SCORE_OPTIONS = [
  { label: "Any (1x+)", value: 1 },
  { label: "3x+", value: 3 },
  { label: "5x+", value: 5 },
  { label: "10x+", value: 10 },
];

export default function OutliersPage() {
  const [outliers, setOutliers] = useState<OutlierVideo[]>([]);
  const [channels, setChannels] = useState<CompetitorChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [minScore, setMinScore] = useState(3);
  const [loading, setLoading] = useState(true);
  const [whyItWorked, setWhyItWorked] = useState<{
    videoId: string;
    content: string;
    loading: boolean;
  } | null>(null);
  const [whyCache, setWhyCache] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/competitors/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels ?? []));
  }, []);

  useEffect(() => {
    loadOutliers();
  }, [selectedChannel, minScore]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOutliers() {
    setLoading(true);
    const params = new URLSearchParams({ minScore: minScore.toString(), limit: "50" });
    if (selectedChannel) params.set("channelId", selectedChannel);
    const res = await fetch(`/api/competitors/outliers?${params}`);
    const data = await res.json();
    setOutliers(data.outliers ?? []);
    setLoading(false);
  }

  async function handleWhyItWorked(
    videoId: string,
    title: string,
    viewCount: number,
    outlierScore: number | null,
    channelName: string | undefined,
    publishedAt: string | null
  ) {
    // Return cached result immediately
    if (whyCache[videoId]) {
      setWhyItWorked({ videoId, content: whyCache[videoId], loading: false });
      return;
    }
    setWhyItWorked({ videoId, content: "", loading: true });

    const res = await fetch("/api/ai/why-it-worked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, title, viewCount, outlierScore, channelName, publishedAt }),
    });

    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    setWhyItWorked({ videoId, content: "", loading: false });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      setWhyItWorked({ videoId, content: full, loading: false });
    }

    setWhyCache((prev) => ({ ...prev, [videoId]: full }));
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl" style={{ color: "var(--text-primary)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Outlier Feed</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Competitor videos that massively outperformed their channel&apos;s average.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="">All Channels</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.channel_name}
            </option>
          ))}
        </select>

        <div className="flex gap-1">
          {MIN_SCORE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMinScore(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: minScore === opt.value ? "#00ff87" : "var(--bg-card)",
                color: minScore === opt.value ? "#000" : "var(--text-secondary)",
                border: `1px solid ${minScore === opt.value ? "#00ff87" : "var(--border)"}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Only show the real count once channels are tracked — avoids "0 videos"
            sitting above the sample preview cards. */}
        {!loading && channels.length > 0 && (
          <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: "auto" }}>
            {outliers.length} video{outliers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: "var(--text-muted)", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      ) : outliers.length === 0 ? (
        channels.length === 0 ? (
          <div>
            {/* Rich empty state — no competitors tracked */}
            <div
              className="rounded-xl border flex flex-col items-center justify-center py-16 text-center mb-8"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              <div className="text-6xl mb-4">🔥</div>
              <h2 className="text-xl font-black text-foreground mb-3">See Every Video Crushing Its Channel Average</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 440, lineHeight: 1.6 }}>
                The Outlier Feed surfaces competitor videos scoring 3x+ above their channel median — your direct pipeline to proven formats you can adapt.
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

            {/* Sample-data label so the muted preview cards below aren't mistaken
                for the user's real feed. */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                PREVIEW
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Sample data — add a competitor to see your real Outlier Feed.
              </span>
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
                { title: "I Tried Every Productivity App for 30 Days", channel: "TechMinimalist", views: 184200, likes: 6800, comments: 412, score: 8.2, published: "2026-06-20T00:00:00Z" },
                { title: "Why YouTube Shorts Are Killing Long-Form (Data)", channel: "CreatorInsights", views: 97400, likes: 3200, comments: 198, score: 5.6, published: "2026-06-24T00:00:00Z" },
                { title: "The 5AM Routine That Actually Changed My Life", channel: "MindsetDaily", views: 312000, likes: 14100, comments: 1032, score: 12.1, published: "2026-06-18T00:00:00Z" },
              ].map((v, i) => {
                const colors = v.score >= 10
                  ? { bg: "rgba(255,68,68,0.12)", border: "#f87171", text: "#fca5a5" }
                  : v.score >= 5
                  ? { bg: "rgba(255,170,0,0.12)", border: "#ffaa00", text: "#ffcc44" }
                  : { bg: "rgba(0,255,135,0.10)", border: "#00ff87", text: "#4ade80" };
                return (
                  <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                    <div className="relative" style={{ paddingBottom: "56.25%", background: "var(--bg-card)" }}>
                      <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--text-muted)", fontSize: 24 }}>▶</div>
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                      >
                        🔥 {v.score.toFixed(1)}x
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-medium mb-2 leading-snug" style={{ fontSize: 14, color: "var(--text-primary)" }}>{v.title}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--border)" }}>
                          {v.channel[0]}
                        </div>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{v.channel}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                          {new Date(v.published).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        <span>👁 {v.views >= 1000 ? (v.views / 1000).toFixed(0) + "K" : v.views}</span>
                        <span>👍 {v.likes >= 1000 ? (v.likes / 1000).toFixed(1) + "K" : v.likes}</span>
                        <span>💬 {v.comments}</span>
                      </div>
                    </div>
                    <div className="px-3 pb-3">
                      <div className="mt-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                        🧠 Why It Worked
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <div className="text-4xl mb-4">🔥</div>
            <p className="font-semibold mb-1">No outlier videos found</p>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Try lowering the minimum score or syncing your channels.</p>
          </div>
        )
      ) : (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        >
          {outliers.map((v) => {
            const score = v.outlier_score ?? 0;
            const colors = scoreColor(score);
            const ytUrl = `https://www.youtube.com/watch?v=${v.youtube_video_id}`;
            const ch = v.competitor_channels;

            return (
              // Outer div — button cannot be nested inside <a> (invalid HTML)
              <div
                key={v.id}
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                {/* Clickable link area */}
                <a
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-transform hover:scale-[1.02]"
                  style={{ textDecoration: "none" }}
                >
                  {/* Thumbnail */}
                  <div className="relative" style={{ paddingBottom: "56.25%", background: "var(--bg-card)" }}>
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
                        ▶
                      </div>
                    )}
                    {/* Outlier badge */}
                    <div
                      className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      🔥 {score.toFixed(1)}x
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
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

                    {/* Channel row */}
                    <div className="flex items-center gap-2 mb-3">
                      {ch?.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ch.thumbnail_url}
                          alt={ch.channel_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "var(--border)" }}
                        >
                          {ch?.channel_name?.[0] ?? "?"}
                        </div>
                      )}
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{ch?.channel_name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                        {fmtDate(v.published_at)}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>👁 {fmt(v.view_count)}</span>
                      <span>👍 {fmt(v.like_count)}</span>
                      <span>💬 {fmt(v.comment_count)}</span>
                    </div>
                  </div>
                </a>

                {/* Why It Worked button — outside <a> to keep HTML valid */}
                <div className="px-3 pb-3">
                  <button
                    onClick={() =>
                      handleWhyItWorked(
                        v.youtube_video_id,
                        v.title,
                        v.view_count,
                        v.outlier_score,
                        v.competitor_channels?.channel_name,
                        v.published_at
                      )
                    }
                    className="mt-2 w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >
                    🧠 Why It Worked
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Why It Worked slide-out panel */}
      {whyItWorked && (
        <div
          className="fixed right-0 top-0 bottom-0 z-50 flex flex-col border-l overflow-y-auto"
          style={{ width: 420, background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center justify-between p-4 border-b flex-shrink-0"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-semibold text-sm">🧠 Why It Worked</span>
            <button
              onClick={() => setWhyItWorked(null)}
              style={{ color: "var(--text-muted)" }}
              className="hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-4 flex-1">
            {whyItWorked.loading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Analyzing…</p>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                <MarkdownContent content={whyItWorked.content} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    );
}
