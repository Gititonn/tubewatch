"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getOutlierLabel, formatDuration } from "@/lib/outlier";
import type { Video } from "@/lib/types";

type Filter = "all" | "outliers" | "underperformers";

export default function OutlierPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: channels } = await supabase
        .from("channels")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const ch = channels?.[0];
      if (!ch) { setLoading(false); return; }
      setChannelId(ch.id);

      const { data } = await supabase
        .from("videos")
        .select("*")
        .eq("channel_id", ch.id)
        .order("outlier_score", { ascending: false });

      setVideos((data as Video[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function fetchInsight(video: Video) {
    if (insights[video.id]) return;
    setLoadingInsight(video.id);

    const res = await fetch("/api/ai/outlier-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.id, channelId }),
    });

    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      setInsights((prev) => ({ ...prev, [video.id]: text }));
    }

    setLoadingInsight(null);
  }

  const filtered = videos.filter((v) => {
    if (filter === "outliers") return (v.outlier_score ?? 0) > 2;
    if (filter === "underperformers") return (v.outlier_score ?? 1) < 0.5;
    return true;
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Outlier Score</h1>
          <p className="text-sm mt-1" style={{ color: "#888" }}>
            How each video performed vs. your channel median.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "outliers", "underperformers"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
              style={{
                background: filter === f ? "#00ff8720" : "#1a1a1a",
                color: filter === f ? "#00ff87" : "#888",
                border: `1px solid ${filter === f ? "#00ff87" : "#2a2a2a"}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "#888" }}>Loading videos…</p>}

      {!loading && videos.length === 0 && (
        <p style={{ color: "#888" }}>No videos yet. Connect and sync a channel first.</p>
      )}

      {filtered.length > 0 && (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "#2a2a2a" }}>
          <table className="min-w-[820px] w-full text-sm">
            <colgroup>
              <col className="w-auto" />
              <col style={{ width: "110px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "100px" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a2a", background: "#1a1a1a" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "#888" }}>Video</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#888" }}>Published</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#888" }}>Views</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "#888" }}>Duration</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#888" }}>Outlier Score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const label = getOutlierLabel(v.outlier_score);
                return (
                  <Fragment key={v.id}>
                    <tr
                      style={{ borderBottom: insights[v.id] ? "none" : "1px solid #1a1a1a" }}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {v.thumbnail_url && (
                            <Image
                              src={v.thumbnail_url}
                              alt={v.title ?? ""}
                              width={64}
                              height={36}
                              className="rounded object-cover flex-shrink-0"
                            />
                          )}
                          <span className="text-white truncate">{v.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "#888" }}>
                        {v.published_at ? new Date(v.published_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "#ccc" }}>
                        {v.view_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "#888" }}>
                        {formatDuration(v.duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ScoreBadge score={v.outlier_score} label={label} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchInsight(v)}
                          disabled={loadingInsight === v.id}
                          className="text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors hover:border-white disabled:opacity-40"
                          style={{ borderColor: "#2a2a2a", color: "#888" }}
                        >
                          {loadingInsight === v.id ? "Analyzing…" : "Explain"}
                        </button>
                      </td>
                    </tr>
                    {insights[v.id] && (
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        <td colSpan={6} className="px-4 pb-4 pt-1">
                          <div
                            className="rounded-lg px-4 py-3 text-sm"
                            style={{ background: "#111", color: "#aaa", border: "1px solid #2a2a2a" }}
                          >
                            <span style={{ color: "#00ff87" }}>✦ AI Insight: </span>
                            {insights[v.id]}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 flex gap-6 text-xs" style={{ color: "#555" }}>
        <span><span style={{ color: "#22c55e" }}>●</span> &gt;2.0× = Outlier 🚀</span>
        <span><span style={{ color: "#888" }}>●</span> 0.5–2.0× = Normal</span>
        <span><span style={{ color: "#ef4444" }}>●</span> &lt;0.5× = Underperformer 📉</span>
      </div>
    </div>
  );
}

function ScoreBadge({
  score,
  label,
}: {
  score: number | null;
  label: "outlier" | "normal" | "underperformer";
}) {
  const styles = {
    outlier: { background: "rgba(34,197,94,0.15)", color: "#22c55e" },
    normal: { background: "rgba(136,136,136,0.15)", color: "#888" },
    underperformer: { background: "rgba(239,68,68,0.15)", color: "#ef4444" },
  };
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold"
      style={styles[label]}
    >
      {score !== null ? `${score}×` : "—"}
    </span>
  );
}
