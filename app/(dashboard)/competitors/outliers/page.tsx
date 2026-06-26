"use client";
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
  if (score >= 10) return { bg: "rgba(255,68,68,0.12)", border: "#ff4444", text: "#ff6666" };
  if (score >= 5) return { bg: "rgba(255,170,0,0.12)", border: "#ffaa00", text: "#ffcc44" };
  return { bg: "rgba(0,255,135,0.10)", border: "#00ff87", text: "#00ff87" };
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
  }, [selectedChannel, minScore]);

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
    <div className="p-8 max-w-6xl" style={{ color: "#fff" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Outlier Feed</h1>
        <p style={{ color: "#888", fontSize: 14 }}>
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
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            color: "#ccc",
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
                background: minScore === opt.value ? "#00ff87" : "#1a1a1a",
                color: minScore === opt.value ? "#000" : "#888",
                border: `1px solid ${minScore === opt.value ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {!loading && (
          <span style={{ color: "#555", fontSize: 13, marginLeft: "auto" }}>
            {outliers.length} video{outliers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: "#555", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      ) : outliers.length === 0 ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "#2a2a2a", background: "#111" }}
        >
          <div className="text-4xl mb-4">🔥</div>
          <p className="font-semibold mb-1">No outlier videos found</p>
          <p style={{ color: "#555", fontSize: 14 }}>
            {channels.length === 0
              ? "Add competitor channels to start tracking outlier videos."
              : "Try lowering the minimum score or syncing your channels."}
          </p>
        </div>
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
                style={{ borderColor: "#2a2a2a", background: "#111" }}
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
                  <div className="relative" style={{ paddingBottom: "56.25%", background: "#1a1a1a" }}>
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#333" }}>
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
                        color: "#fff",
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
                        <img
                          src={ch.thumbnail_url}
                          alt={ch.channel_name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "#2a2a2a" }}
                        >
                          {ch?.channel_name?.[0] ?? "?"}
                        </div>
                      )}
                      <span style={{ fontSize: 12, color: "#888" }}>{ch?.channel_name}</span>
                      <span style={{ fontSize: 12, color: "#444", marginLeft: "auto" }}>
                        {fmtDate(v.published_at)}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3" style={{ fontSize: 12, color: "#666" }}>
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
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
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
          style={{ width: 420, background: "#111", borderColor: "#2a2a2a" }}
        >
          <div
            className="flex items-center justify-between p-4 border-b flex-shrink-0"
            style={{ borderColor: "#2a2a2a" }}
          >
            <span className="font-semibold text-sm">🧠 Why It Worked</span>
            <button
              onClick={() => setWhyItWorked(null)}
              style={{ color: "#555" }}
              className="hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-4 flex-1">
            {whyItWorked.loading ? (
              <p style={{ color: "#555", fontSize: 13 }}>Analyzing…</p>
            ) : (
              <p
                style={{
                  color: "#ccc",
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {whyItWorked.content}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    );
}
