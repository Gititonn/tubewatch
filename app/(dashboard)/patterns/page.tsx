"use client";
import { useState, useEffect } from "react";
import ProLockScreen from "@/components/ProLockScreen";
import { useUserPlan, isPaid } from "@/lib/use-user-plan";

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
      <strong key={i} style={{ color: "var(--text-primary)" }}>
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
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const plan = useUserPlan();

  useEffect(() => {
    fetch("/api/competitors/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels ?? []));
  }, []);

  useEffect(() => {
    loadPatterns();
  }, [selectedChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPatterns() {
    setLoading(true);
    const params = new URLSearchParams({ minVideos: "5" });
    if (selectedChannel) params.set("channelId", selectedChannel);
    const res = await fetch(`/api/patterns?${params}`);
    if (res.status === 402) {
      setUpgradeRequired(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  const hasData = data && data.patterns.length > 0;
  const tooFewVideos = data && !hasData && typeof data.totalVideos === "number" && data.totalVideos < 5;

  // Pro-gate up front so the filter controls don't render over the lock screen.
  if (plan === null) {
    return (
      <div className="p-4 md:p-8 max-w-6xl" style={{ color: "var(--text-primary)" }}>
        <div style={{ color: "var(--text-muted)", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      </div>
    );
  }

  if (upgradeRequired || !isPaid(plan)) {
    return (
      <div className="p-4 md:p-8 max-w-6xl" style={{ color: "var(--text-primary)" }}>
        <ProLockScreen feature="Patterns" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl" style={{ color: "var(--text-primary)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Title & Hook Patterns</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Which title formulas drive the most views across your tracked channels.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
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
        <div style={{ color: "var(--text-muted)", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      ) : !hasData ? (
        channels.length === 0 ? (
          <div>
            <div
              className="rounded-xl border flex flex-col items-center justify-center py-16 text-center mb-8"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-xl font-black text-foreground mb-3">Decode What Makes Competitors Win</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 440, lineHeight: 1.6 }}>
                Patterns analyzes title formulas, hook structures, and content strategies from channels you track.{" "}
                The more competitors you add, the sharper the insights.
              </p>
              <a
                href="/competitors"
                className="mt-6 inline-block px-5 py-2.5 rounded-lg text-sm font-semibold"
                style={{ border: "1px solid #00ff87", color: "#00ff87", background: "transparent", textDecoration: "none" }}
              >
                Add Your First Competitor →
              </a>
            </div>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", opacity: 0.4, pointerEvents: "none", filter: "blur(1px)" }}
            >
              {[
                { name: "How To / Tutorial", count: 14, avg: "7.4", bar: 82, vs: "2.8" },
                { name: "Number List (e.g. 5 Ways)", count: 9, avg: "5.1", bar: 60, vs: "2.1" },
                { name: "Personal Story Hook", count: 6, avg: "9.3", bar: 95, vs: "3.0" },
              ].map((p, i) => (
                <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold" style={{ fontSize: 15 }}>{p.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(0,255,135,0.1)", border: "1px solid rgba(0,255,135,0.26)", color: "#00ff87" }}>
                      🔥 {p.avg}x avg
                    </span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 10 }}>{p.count} matching videos</p>
                  <div style={{ background: "var(--bg-card)", height: 6, borderRadius: 3, marginBottom: 4, overflow: "hidden" }}>
                    <div style={{ width: `${p.bar}%`, height: "100%", background: "#00ff87", borderRadius: 3 }} />
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 12 }}>{p.vs}x the average</p>
                  <div>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 6 }}>Best example:</p>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 64, height: 36, background: "var(--bg-card)", borderRadius: 4, flexShrink: 0 }} />
                      <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>Sample video title here</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
            style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
          >
            <div className="text-4xl mb-4">📊</div>
            <p className="font-semibold mb-1">Not enough data yet</p>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {tooFewVideos
                ? `Need at least 5 videos to detect patterns (${data!.totalVideos} found)`
                : "Need at least 5 videos to detect patterns"}
            </p>
          </div>
        )
      ) : (
        <>
          {data!.summary && (
            <div
              className="rounded-xl mb-6 px-5 py-4"
              style={{ background: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.2)" }}
            >
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
                {renderSummary(data!.summary)}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
                {data!.totalVideos} videos analyzed across all channels
              </p>
            </div>
          )}

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {data!.patterns.map((p) => {
              const barWidth = Math.min((p.vsAverage / 3) * 100, 100);
              const color = scoreColor(p.avgOutlierScore);
              const ytUrl = `https://www.youtube.com/watch?v=${p.topVideo.youtubeVideoId}`;

              return (
                <div
                  key={p.name}
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold" style={{ fontSize: 15 }}>{p.name}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{ background: `${color}18`, border: `1px solid ${color}44`, color }}
                    >
                      🔥 {p.avgOutlierScore}x avg
                    </span>
                  </div>

                  <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 10 }}>
                    {p.matchCount} matching video{p.matchCount !== 1 ? "s" : ""}
                  </p>

                  <div style={{ background: "var(--bg-card)", height: 6, borderRadius: 3, marginBottom: 4, overflow: "hidden" }}>
                    <div
                      style={{ width: `${barWidth}%`, height: "100%", background: "#00ff87", borderRadius: 3, transition: "width 0.4s ease" }}
                    />
                  </div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 12 }}>{p.vsAverage}x the average</p>

                  <div>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 6 }}>Best example:</p>
                    <a
                      href={ytUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      style={{ textDecoration: "none" }}
                    >
                      {p.topVideo.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.topVideo.thumbnailUrl}
                          alt={p.topVideo.title}
                          style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          style={{
                            color: "var(--text-secondary)",
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
                        <span style={{ color: scoreColor(p.topVideo.outlierScore), fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
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
