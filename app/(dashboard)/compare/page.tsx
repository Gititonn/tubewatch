"use client";

import { useState } from "react";
import Image from "next/image";
import ProLockScreen from "@/components/ProLockScreen";
import { useUserPlan, isPaid } from "@/lib/use-user-plan";

interface ChannelData {
  id: string;
  handle: string;
  name: string;
  thumbnail: string;
  subscribers: number;
  totalVideos: number;
  avgViews: number;
  viewsPerSub: number;
  topVideo: { title: string; views: number; thumbnail: string | null; outlierScore: number | null } | null;
  topOutlier: { title: string; views: number; thumbnail: string | null; outlierScore: number | null } | null;
  recentVideos: { title: string; views: number; outlierScore: number | null; thumbnail: string | null }[];
}

function outlierColor(score: number | null) {
  if (!score) return "#666";
  if (score >= 3) return "#ff4444";
  if (score >= 2) return "#ffaa00";
  if (score >= 1) return "#00ff87";
  return "#666";
}

function outlierLabel(score: number | null) {
  if (!score) return "—";
  if (score >= 3) return "🔥 " + score.toFixed(1) + "x";
  if (score >= 2) return "⭐ " + score.toFixed(1) + "x";
  if (score >= 1) return "📈 " + score.toFixed(1) + "x";
  return "😴 " + score.toFixed(1) + "x";
}

function StatRow({ label, values, highlight }: {
  label: string;
  values: (string | number)[];
  highlight?: "max" | "min";
}) {
  const nums = values.map((v) => (typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "")) || 0));
  const maxVal = Math.max(...nums);
  const minVal = Math.min(...nums);

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td className="py-3 pr-4 text-sm font-medium" style={{ color: "var(--text-secondary)", width: "140px" }}>
        {label}
      </td>
      {values.map((v, i) => {
        const num = nums[i];
        const isWinner = highlight === "max" && num === maxVal && nums.filter(n => n === maxVal).length < nums.length;
        const isLoser = highlight === "min" && num === minVal && nums.filter(n => n === minVal).length < nums.length;
        return (
          <td
            key={i}
            className="py-3 px-4 text-sm font-semibold text-center"
            style={{
              color: isWinner ? "#00ff87" : isLoser ? "#ff4444" : "#ccc",
              background: isWinner ? "rgba(0,255,135,0.05)" : "transparent",
            }}
          >
            {isWinner && "🏆 "}{v}
          </td>
        );
      })}
    </tr>
  );
}

export default function ComparePage() {
  const [handle, setHandle] = useState("");
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const plan = useUserPlan();

  async function addChannel() {
    const h = handle.trim().replace(/^@/, "");
    if (!h) return;
    if (channels.find((c) => c.handle.replace(/^@/, "") === h)) {
      setError("Channel already added.");
      return;
    }
    if (channels.length >= 4) {
      setError("Max 4 channels for comparison.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/youtube/compare?handle=${encodeURIComponent(h)}`);
      const data = await res.json();
      if (res.status === 402) {
        setUpgradeRequired(true);
      } else if (!res.ok) {
        setError(data.error || "Channel not found.");
      } else {
        setChannels((prev) => [...prev, data]);
        setHandle("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function removeChannel(id: string) {
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  // Show the Pro lock up front (before any interaction) for free users.
  if (plan === null) {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <div style={{ color: "var(--text-muted)", paddingTop: 48, textAlign: "center" }}>Loading…</div>
      </div>
    );
  }

  if (upgradeRequired || !isPaid(plan)) {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <ProLockScreen />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <h1 className="text-2xl font-bold text-white mb-2">Compare Channels</h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        Add up to 4 YouTube channels to compare side by side.
      </p>

      {/* Search bar */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 flex items-center gap-3 px-4 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <span style={{ color: "var(--text-muted)" }}>@</span>
          <input
            className="flex-1 bg-transparent py-3 text-white text-sm outline-none"
            placeholder="channelhandle"
            value={handle}
            onChange={(e) => { setHandle(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && addChannel()}
            disabled={loading}
          />
        </div>
        <button
          onClick={addChannel}
          disabled={loading || !handle.trim()}
          className="px-6 py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#00ff87" }}
        >
          {loading ? "Loading…" : "+ Add"}
        </button>
      </div>

      {error && (
        <p className="mb-6 text-sm px-4 py-2 rounded-lg" style={{ color: "#ff6b6b", background: "#ff444415", border: "1px solid #ff444430" }}>
          {error}
        </p>
      )}

      {channels.length === 0 && (
        <div className="rounded-xl border p-16 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
          <div className="text-5xl mb-4">📊</div>
          <p className="text-white font-semibold mb-2">No channels added yet</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Search any YouTube channel by handle to start comparing.
          </p>
          <div className="mt-6 flex gap-2 justify-center flex-wrap">
            {["@mkbhd", "@veritasium", "@kurzgesagt"].map((ex) => (
              <button
                key={ex}
                onClick={() => { setHandle(ex.replace("@", "")); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                style={{ background: "#222", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {channels.length > 0 && (
        <>
          {/* Channel header cards */}
          <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)` }}>
            {channels.map((ch) => (
              <div key={ch.id} className="rounded-xl border p-5 relative" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <button
                  onClick={() => removeChannel(ch.id)}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: "var(--text-muted)" }}
                >
                  ✕
                </button>
                <div className="flex items-center gap-3 mb-4">
                  {ch.thumbnail && (
                    <Image src={ch.thumbnail} alt={ch.name} width={48} height={48} className="rounded-full" />
                  )}
                  <div>
                    <div className="font-bold text-white text-sm leading-tight">{ch.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{ch.handle}</div>
                  </div>
                </div>
                <div className="text-2xl font-black" style={{ color: "#00ff87" }}>
                  {ch.subscribers >= 1_000_000
                    ? (ch.subscribers / 1_000_000).toFixed(1) + "M"
                    : ch.subscribers >= 1_000
                    ? (ch.subscribers / 1_000).toFixed(1) + "K"
                    : ch.subscribers.toLocaleString()}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>subscribers</div>
              </div>
            ))}
          </div>

          {/* Stats table */}
          <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="px-5 py-3 border-b text-sm font-semibold text-white" style={{ borderColor: "var(--border)" }}>
              Stats Comparison
            </div>
            <div className="p-5">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="py-2 text-left text-xs font-medium" style={{ color: "var(--text-muted)", width: "140px" }}>Metric</th>
                    {channels.map((ch) => (
                      <th key={ch.id} className="py-2 px-4 text-center text-xs font-medium truncate" style={{ color: "var(--text-muted)" }}>
                        {ch.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <StatRow
                    label="Subscribers"
                    values={channels.map((c) => c.subscribers.toLocaleString())}
                    highlight="max"
                  />
                  <StatRow
                    label="Total Videos"
                    values={channels.map((c) => c.totalVideos.toLocaleString())}
                    highlight="max"
                  />
                  <StatRow
                    label="Avg Views"
                    values={channels.map((c) => c.avgViews.toLocaleString())}
                    highlight="max"
                  />
                  <StatRow
                    label="Views / Sub"
                    values={channels.map((c) => c.viewsPerSub.toFixed(3))}
                    highlight="max"
                  />
                </tbody>
              </table>
            </div>
          </div>

          {/* Top outlier videos */}
          <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="px-5 py-3 border-b text-sm font-semibold text-white" style={{ borderColor: "var(--border)" }}>
              🔥 Top Outlier Video (per channel)
            </div>
            <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)`, background: "#2a2a2a" }}>
              {channels.map((ch) => (
                <div key={ch.id} className="p-4" style={{ background: "var(--bg-card)" }}>
                  {ch.topOutlier ? (
                    <>
                      {ch.topOutlier.thumbnail && (
                        <Image
                          src={ch.topOutlier.thumbnail}
                          alt={ch.topOutlier.title ?? ""}
                          width={240}
                          height={135}
                          className="rounded-lg w-full object-cover mb-3"
                        />
                      )}
                      <p className="text-white text-xs font-semibold mb-2 line-clamp-2">{ch.topOutlier.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {ch.topOutlier.views.toLocaleString()} views
                        </span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: outlierColor(ch.topOutlier.outlierScore),
                            background: outlierColor(ch.topOutlier.outlierScore) + "22",
                            border: `1px solid ${outlierColor(ch.topOutlier.outlierScore)}44`,
                          }}
                        >
                          {outlierLabel(ch.topOutlier.outlierScore)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent videos breakdown */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
            <div className="px-5 py-3 border-b text-sm font-semibold text-white" style={{ borderColor: "var(--border)" }}>
              Recent Videos
            </div>
            <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)`, background: "#2a2a2a" }}>
              {channels.map((ch) => (
                <div key={ch.id} className="p-4" style={{ background: "var(--bg-card)" }}>
                  <div className="space-y-2">
                    {ch.recentVideos.map((v, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span
                          style={{
                            color: outlierColor(v.outlierScore),
                            background: outlierColor(v.outlierScore) + "18",
                            fontSize: "10px",
                          }}
                        >
                          {v.outlierScore ? v.outlierScore.toFixed(1) + "x" : "—"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-xs leading-snug line-clamp-2">{v.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{v.views.toLocaleString()} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
