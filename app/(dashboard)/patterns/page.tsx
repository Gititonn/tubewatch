"use client";
import { useState, useEffect } from "react";

type PatternResult = {
  name: string;
  matchCount: number;
  avgOutlierScore: number;
  vsAverage: number;
  topVideo: {
    title: string;
    youtubeVideoId: string;
    thumbnailUrl: string | null;
    outlierScore: number | null;
  };
};

function scoreColor(score: number): string {
  if (score >= 10) return "#ff6666";
  if (score >= 5) return "#ffcc44";
  return "#00ff87";
}

function renderSummary(text: string) {
  const parts = text.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={{ color: "#fff" }}>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function PatternsPage() {
  const [data, setData] = useState<{
    patterns: PatternResult[];
    summary: string | null;
    overallAvg: number;
    totalVideos: number;
  } | null>(null);
  const [channels, setChannels] = useState<{ id: string; channel_name: string }[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/competitors/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels ?? []));
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [selectedChannel]);

  async function loadPatterns() {
    setLoading(true);
    const params = new URLSearchParams({ minVideos: "5" });
    if (selectedChannel) params.set("channelId", selectedChannel);
    const res = await fetch(`/api/patterns?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  const hasData = data && data.patterns.length > 0;
  const tooFewVideos = data && !hasData && typeof data.totalVideos === "number" && data.totalVideos < 5;

  return (
    <div className="p-8 max-w-6xl" style={{ color: "#fff" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Title & Hook Patterns</h1>
        <p style={{ color: "#888", fontSize: 14 }}>
          Which title formulas drive the most views across your tracked channels.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#ccc" }}
        >
          <option value="">All Channels</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.channel_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "#555", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      ) : !hasData ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "#2a2a2a", background: "#111" }}
        >
          <div className="text-4xl mb-4">📊</div>
          <p className="font-semibold mb-1">
            {channels.length === 0
              ? "Add and sync competitor channels to build your pattern library"
              : "Not enough data yet"}
          </p>
          <p style={{ color: "#555", fontSize: 14 }}>
            {tooFewVideos
              ? `Need at least 5 videos to detect patterns (${data!.totalVideos} found)`
              : "Need at least 5 videos to detect patterns"}
          </p>
        </div>
      ) : (
        <>
          {data!.summary && (
            <div
              className="rounded-xl mb-6 px-5 py-4"
              style={{
                background: "rgba(0,255,135,0.08)",
                border: "1px solid rgba(0,255,135,0.2)",
              }}
            >
              <p style={{ color: "#ccc", fontSize: 14, lineHeight: 1.6 }}>
                {renderSummary(data!.summary)}
              </p>
              <p style={{ color: "#555", fontSize: 12, marginTop: 6 }}>
                {data!.totalVideos} videos analyzed across all channels
              </p>
            </div>
          )}

          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
          >
            {data!.patterns.map((p) => {
              const barWidth = Math.min((p.vsAverage / 3) * 100, 100);
              const color = scoreColor(p.avgOutlierScore);
              const ytUrl = `https://www.youtube.com/watch?v=${p.topVideo.youtubeVideoId}`;

              return (
                <div
                  key={p.name}
                  style={{
                    background: "#111",
                    border: "1px solid #2a2a2a",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold" style={{ fontSize: 15 }}>
                      {p.name}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: `${color}18`,
                        border: `1px solid ${color}44`,
                        color,
                      }}
                    >
                      🔥 {p.avgOutlierScore}x avg
                    </span>
                  </div>

                  <p style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>
                    {p.matchCount} matching video{p.matchCount !== 1 ? "s" : ""}
                  </p>

                  <div
                    style={{
                      background: "#1a1a1a",
                      height: 6,
                      borderRadius: 3,
                      marginBottom: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: "100%",
                        background: "#00ff87",
                        borderRadius: 3,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <p style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                    {p.vsAverage}x the average
                  </p>

                  <div>
                    <p style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>Best example:</p>
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      style={{ textDecoration: "none" }}
                    >
                      {p.topVideo.thumbnailUrl && (
                        <img
                          src={p.topVideo.thumbnailUrl}
                          alt={p.topVideo.title}
                          style={{
                            width: 64,
                            height: 36,
                            objectFit: "cover",
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            color: "#ccc",
                            fontSize: 12,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical" as const,
                            lineHeight: 1.4,
                          }}
                        >
                          {p.topVideo.title}
                        </p>
                      </div>
                      {p.topVideo.outlierScore != null && (
                        <span
                          style={{
                            color: scoreColor(p.topVideo.outlierScore),
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {p.topVideo.outlierScore}x
                        </span>
                      )}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
