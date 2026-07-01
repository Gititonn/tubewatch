"use client";
import { useEffect, useState } from "react";
import { CATEGORIES, type ChannelCategory } from "@/lib/categories";

type CompetitorChannel = { id: string; category: ChannelCategory | null };

type OutlierVideo = {
  id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  outlier_score: number | null;
  competitor_channels: { channel_name: string } | { channel_name: string }[] | null;
};

const SAMPLE_VIDEOS = [
  { title: "I Tried Every Productivity App for 30 Days", channel: "TechMinimalist", score: 8.2 },
  { title: "Why YouTube Shorts Are Killing Long-Form (Data)", channel: "CreatorInsights", score: 5.6 },
  { title: "The 5AM Routine That Actually Changed My Life", channel: "MindsetDaily", score: 12.1 },
];

/**
 * THE hero module. Bold on purpose — this is the thing that's supposed to be
 * unmistakable the moment a user lands on /dashboard, whether that's seconds
 * after registering (zero competitors tracked yet) or on a normal sign-in
 * (competitors already tracked). It never silently disappears: a brand-new
 * user gets a featured "this is what you're about to unlock" preview instead
 * of the section just not rendering.
 *
 * Client-side so category pills can filter without a page reload. This also
 * fixes a real bug: the old server-rendered dashboard version queried
 * `competitor_videos` platform-wide with no user_id filter, so every
 * signed-in user saw outliers from every tracked channel on TubeWatch, not
 * just their own. Routing through /api/competitors/outliers (which already
 * scopes to the caller's own competitor_channels) fixes that for free.
 */
export default function OutlierFeedWidget() {
  const [videos, setVideos] = useState<OutlierVideo[]>([]);
  const [availableCategories, setAvailableCategories] = useState<ChannelCategory[]>([]);
  const [category, setCategory] = useState<ChannelCategory | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasAnyChannel, setHasAnyChannel] = useState(true);
  const [checkedChannels, setCheckedChannels] = useState(false);

  useEffect(() => {
    // Categories come from BOTH the user's own tracked channels and the
    // shared discovery pool, so all niches are selectable even if the user
    // hasn't personally tracked anything in them yet.
    Promise.all([
      fetch("/api/competitors/channels").then((r) => r.json()),
      fetch("/api/discovery/channels").then((r) => r.json()),
    ]).then(([owned, discovery]: [{ channels?: CompetitorChannel[] }, { channels?: CompetitorChannel[] }]) => {
      const ownedChannels = owned.channels ?? [];
      const discoveryChannels = discovery.channels ?? [];
      const cats = Array.from(
        new Set([...ownedChannels, ...discoveryChannels].map((c) => c.category ?? "other"))
      ) as ChannelCategory[];
      setAvailableCategories(cats);
      setHasAnyChannel(ownedChannels.length + discoveryChannels.length > 0);
      setCheckedChannels(true);
    });
  }, []);

  useEffect(() => {
    if (!hasAnyChannel) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ minScore: "3", limit: "6" });
    if (category) params.set("category", category);
    if (search.trim()) params.set("q", search.trim());
    const t = setTimeout(() => {
      fetch(`/api/competitors/outliers?${params}`)
        .then((r) => r.json())
        .then((d) => setVideos(d.outliers ?? []))
        .finally(() => setLoading(false));
    }, 300); // debounce search typing
    return () => clearTimeout(t);
  }, [category, search, hasAnyChannel]);

  return (
    <div
      className="rounded-2xl border p-5 mb-8 relative overflow-hidden"
      style={{
        borderColor: "rgba(255,68,68,0.3)",
        background: "linear-gradient(135deg, rgba(255,68,68,0.08) 0%, rgba(255,68,68,0.01) 60%, var(--bg-card) 100%)",
        boxShadow: "0 0 40px rgba(255,68,68,0.06)",
      }}
    >
      <div
        style={{
          position: "absolute", top: -60, right: -60, width: 220, height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,68,68,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="flex items-center justify-between mb-1 flex-wrap gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🔥</span>
          <div>
            <h2 className="text-lg font-black text-foreground leading-tight">Outlier Videos This Week</h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              The breakout videos in your niche — find these before you make your next one.
            </p>
          </div>
        </div>
        <a
          href="/competitors/outliers"
          className="flex-shrink-0 px-3.5 py-2 rounded-lg text-xs font-black transition-transform hover:scale-105"
          style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444", border: "1px solid rgba(255,68,68,0.3)" }}
        >
          See full feed →
        </a>
      </div>

      <div className="mt-4 relative z-10">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search tracked outlier videos by topic…"
          className="w-full px-3.5 py-2 rounded-lg text-sm outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {availableCategories.length > 1 && (
        <div className="flex gap-1.5 mt-3 mb-1 flex-wrap relative z-10">
          <button
            onClick={() => setCategory("")}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background: category === "" ? "#ff4444" : "var(--bg-card)",
              color: category === "" ? "#000" : "var(--text-secondary)",
              border: `1px solid ${category === "" ? "#ff4444" : "var(--border)"}`,
            }}
          >
            All niches
          </button>
          {CATEGORIES.filter((c) => availableCategories.includes(c.id)).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: category === c.id ? "#ff4444" : "var(--bg-card)",
                color: category === c.id ? "#000" : "var(--text-secondary)",
                border: `1px solid ${category === c.id ? "#ff4444" : "var(--border)"}`,
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 relative z-10">
        {!checkedChannels || loading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                <div style={{ aspectRatio: "16/9", background: "var(--border)" }} />
                <div className="p-3"><div className="h-3 rounded" style={{ background: "var(--border)" }} /></div>
              </div>
            ))}
          </div>
        ) : !hasAnyChannel ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2 py-0.5 rounded-md text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                PREVIEW
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                Track a competitor to turn this on — pick a channel in your niche.
              </span>
            </div>
            <div
              className="grid gap-3 mb-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", opacity: 0.45, filter: "blur(0.5px)", pointerEvents: "none" }}
            >
              {SAMPLE_VIDEOS.map((v, i) => (
                <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}>
                  <div className="relative flex items-center justify-center" style={{ aspectRatio: "16/9", background: "var(--bg-card)", color: "var(--text-muted)", fontSize: 20 }}>
                    ▶
                  </div>
                  <div className="p-3">
                    <p className="text-foreground text-xs font-semibold mb-2 leading-snug"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                      {v.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{v.channel}</span>
                      <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ color: "#ff4444", background: "rgba(255,68,68,0.15)" }}>
                        {v.score.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <a
              href="/competitors"
              className="inline-block px-5 py-2.5 rounded-xl font-black text-black text-sm transition-transform hover:scale-105"
              style={{ background: "#ff4444" }}
            >
              Track your first competitor →
            </a>
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)", color: "var(--text-muted)" }}>
            {search.trim() ? (
              <>Nothing tracked matches that search yet. <a href="/competitors/outliers" className="underline" style={{ color: "#ff4444" }}>Open the full feed</a> to search YouTube directly and add a channel.</>
            ) : (
              "No outliers in this category yet — try a lower score threshold on the full feed, or check back after the next sync."
            )}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {videos.map((v) => {
              const ch = Array.isArray(v.competitor_channels) ? v.competitor_channels[0] : v.competitor_channels;
              const score = v.outlier_score ?? 0;
              const scoreColor = score >= 10 ? "#ff4444" : score >= 5 ? "#ffaa00" : "#4ade80";
              return (
                <a
                  key={v.id}
                  href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border overflow-hidden block transition-all hover:border-red-500/40 hover:scale-[1.02]"
                  style={{ borderColor: "var(--border)", background: "var(--bg-card)", boxShadow: "0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
                >
                  {v.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumbnail_url} alt={v.title} className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
                  )}
                  <div className="p-3">
                    <p className="text-foreground text-xs font-semibold mb-2 leading-snug"
                      style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                      {v.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{ch?.channel_name ?? ""}</span>
                      <span className="text-xs font-black px-1.5 py-0.5 rounded"
                        style={{ color: scoreColor, background: scoreColor + "20" }}>
                        {score.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
