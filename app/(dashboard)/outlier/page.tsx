"use client";
import { MarkdownContent } from "@/components/MarkdownContent";
import { TableRowSkeleton } from "@/components/Skeleton";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
        .order("created_at", { ascending: true })
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setInsights((prev) => ({
        ...prev,
        [video.id]: data.error ?? "Unable to generate insight.",
      }));
      setLoadingInsight(null);
      return;
    }

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
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outlier Score</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Views-per-day vs. your channel median — age-adjusted, so fresh breakouts show up early.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "outliers", "underperformers"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
              style={{
                background: filter === f ? "#00ff8720" : "var(--bg-card)",
                color: filter === f ? "#4ade80" : "var(--text-secondary)",
                border: `1px solid ${filter === f ? "#00ff87" : "var(--border)"}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
        <span><span style={{ color: "#22c55e" }}>●</span> &gt;2.0× your median = Outlier 🚀</span>
        <span><span style={{ color: "var(--text-secondary)" }}>●</span> 0.5–2.0× = Normal</span>
        <span><span style={{ color: "#ef4444" }}>●</span> &lt;0.5× = Underperformer 📉</span>
      </div>

      {loading && (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-16 text-center"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-xl font-black text-foreground mb-3">Catch Your Breakouts Early</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 440, lineHeight: 1.6 }}>
            Outlier Score ranks each video by how fast it&apos;s pulling views (age-adjusted) against
            your channel median — so a fresh breakout surfaces early, not months later — then ask
            the AI Engine why it worked.
          </p>
          <Link
            href="/connect"
            className="mt-6 inline-block px-5 py-2.5 rounded-lg text-sm font-semibold transition-transform hover:scale-105"
            style={{ background: "#00ff87", color: "#000", textDecoration: "none" }}
          >
            Connect your channel →
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col className="w-auto" />
              <col style={{ width: "120px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "100px" }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Video</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>Outlier Score</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Views</th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>Published</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--text-secondary)" }}>Duration</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const label = getOutlierLabel(v.outlier_score);
                return (
                  <Fragment key={v.id}>
                    <tr
                      style={{ borderBottom: insights[v.id] ? "none" : "1px solid var(--border)" }}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 overflow-hidden">
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
                          <span className="text-foreground truncate">{v.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ScoreBadge score={v.outlier_score} label={label} />
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {v.view_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {v.published_at ? new Date(v.published_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                        {formatDuration(v.duration_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchInsight(v)}
                          disabled={loadingInsight === v.id}
                          className="text-xs px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors hover:border-white disabled:opacity-40"
                          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                        >
                          {loadingInsight === v.id ? "Analyzing…" : "Explain"}
                        </button>
                      </td>
                    </tr>
                    {insights[v.id] && (
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td colSpan={6} className="px-4 pb-4 pt-1">
                          <div
                            className="rounded-lg px-4 py-3 text-sm"
                            style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
                          >
                            <span style={{ color: "#4ade80", fontWeight: 700 }}>✦ AI Insight</span>
                            <div className="mt-1"><MarkdownContent content={insights[v.id]} /></div>
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
  // Tier by the actual multiplier so 3× and 5× breakouts read at a glance.
  let style: React.CSSProperties;
  let prefix = "";
  if (score === null) {
    style = { background: "rgba(136,136,136,0.12)", color: "var(--text-secondary)", border: "1px solid var(--border)" };
  } else if (score >= 5) {
    style = { background: "rgba(249,115,22,0.18)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.45)", boxShadow: "0 0 12px rgba(249,115,22,0.25)" };
    prefix = "🔥 ";
  } else if (score >= 3) {
    style = { background: "rgba(255,170,0,0.18)", color: "#ffb020", border: "1px solid rgba(255,170,0,0.4)" };
    prefix = "⭐ ";
  } else if (label === "outlier") {
    style = { background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" };
  } else if (label === "underperformer") {
    style = { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" };
  } else {
    style = { background: "rgba(136,136,136,0.12)", color: "var(--text-secondary)", border: "1px solid var(--border)" };
  }
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={style}
    >
      {score !== null ? `${prefix}${score}×` : "—"}
    </span>
  );
}
