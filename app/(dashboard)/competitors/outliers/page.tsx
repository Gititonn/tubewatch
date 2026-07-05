"use client";
import { MarkdownContent } from "@/components/MarkdownContent";
import { VideoGridSkeleton } from "@/components/Skeleton";
import { VideoDetailModal } from "@/components/VideoDetailModal";
import { useState, useEffect } from "react";
import { CATEGORIES, type ChannelCategory } from "@/lib/categories";
import AiCreditBadge from "@/components/AiCreditBadge";

type CompetitorChannel = {
  id: string;
  channel_name: string;
  youtube_channel_id: string;
  category: ChannelCategory | null;
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
    channel_handle: string | null;
    subscriber_count: number | null;
    video_count: number | null;
    category: ChannelCategory | null;
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
  const [discoveryChannels, setDiscoveryChannels] = useState<CompetitorChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory | "">("");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(3);
  // Fallback for when the topic search comes up empty against already-synced
  // outliers: a real YouTube channel search, so the box never dead-ends.
  const [ytResults, setYtResults] = useState<
    { channelId: string; name: string; handle: string | null; thumbnail: string | null; subscriberCount: number; videoCount: number }[]
  >([]);
  const [ytSearching, setYtSearching] = useState(false);
  const [addingChannelId, setAddingChannelId] = useState<string | null>(null);
  // Per-result category pick for the YouTube fallback — must NOT silently
  // inherit whichever category pill happens to be active in the filter bar
  // above (found live: searching under "Gaming" mis-tagged an unrelated
  // channel as gaming just because that pill was still selected).
  const [ytCategoryPicks, setYtCategoryPicks] = useState<Record<string, ChannelCategory>>({});
  // Surfaces the discovery-pool API's 422 (too small) / 429 (rate limited)
  // messages — previously a rejected add just re-enabled the button with no
  // explanation at all.
  const [addChannelError, setAddChannelError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [whyItWorked, setWhyItWorked] = useState<{
    videoId: string;
    content: string;
    loading: boolean;
  } | null>(null);
  const [whyCache, setWhyCache] = useState<Record<string, string>>({});
  // Video-detail modal: clicking a card opens this in-app view (thumbnail,
  // full stats, an explicit "Watch on YouTube" link, and a "Track this
  // channel" action) instead of throwing the user straight onto YouTube.
  const [selectedVideo, setSelectedVideo] = useState<OutlierVideo | null>(null);
  const [trackingChannel, setTrackingChannel] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // The user's own tracked channels, keyed by YouTube id — lets us tell
  // whether a video's channel is already being tracked (vs. a discovery-pool
  // channel the user could add).
  const ownedChannelIds = new Set(channels.map((c) => c.youtube_channel_id));

  async function handleTrackChannel(v: OutlierVideo) {
    const ch = v.competitor_channels;
    if (!ch) return;
    setTrackingChannel(true);
    setTrackError(null);
    const res = await fetch("/api/competitors/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: ch.youtube_channel_id,
        name: ch.channel_name,
        handle: ch.channel_handle,
        thumbnail: ch.thumbnail_url,
        subscriberCount: ch.subscriber_count,
        videoCount: ch.video_count,
        category: ch.category,
      }),
    });
    const data = await res.json();
    if (data.channel) {
      // Refresh the owned-channel set so the modal flips to "✓ Tracking".
      fetch("/api/competitors/channels")
        .then((r) => r.json())
        .then((d) => setChannels(d.channels ?? []));
    } else if (data.error) {
      setTrackError(data.error);
    }
    setTrackingChannel(false);
  }

  useEffect(() => {
    fetch("/api/competitors/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels ?? []));
    // Discovery pool — the shared, category-tagged channels that populate
    // the feed even for niches this user hasn't personally tracked.
    fetch("/api/discovery/channels")
      .then((r) => r.json())
      .then((d) => setDiscoveryChannels(d.channels ?? []));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadOutliers, 300); // debounce search typing
    return () => clearTimeout(t);
  }, [selectedChannel, selectedCategory, search, minScore]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadOutliers() {
    setLoading(true);
    setYtResults([]);
    const params = new URLSearchParams({ minScore: minScore.toString(), limit: "50" });
    if (selectedChannel) params.set("channelId", selectedChannel);
    if (selectedCategory) params.set("category", selectedCategory);
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/competitors/outliers?${params}`);
    const data = await res.json();
    const results = data.outliers ?? [];
    setOutliers(results);
    setLoading(false);

    // The topic box only searches videos we've already synced. If a real
    // search term comes up empty there, fall back to a live YouTube channel
    // search so the box doesn't just dead-end.
    if (search.trim().length > 1 && results.length === 0) {
      setYtSearching(true);
      const ytRes = await fetch(`/api/competitors/search?q=${encodeURIComponent(search.trim())}`);
      const ytData = await ytRes.json();
      setYtResults(ytData.results ?? []);
      setYtSearching(false);
    }
  }

  async function handleAddDiscoveryChannel(result: {
    channelId: string; name: string; handle: string | null; thumbnail: string | null; subscriberCount: number; videoCount: number;
  }) {
    setAddingChannelId(result.channelId);
    setAddChannelError(null);
    const addRes = await fetch("/api/discovery/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: result.channelId,
        name: result.name,
        handle: result.handle,
        thumbnail: result.thumbnail,
        subscriberCount: result.subscriberCount,
        videoCount: result.videoCount,
        category: ytCategoryPicks[result.channelId] || "other",
      }),
    });
    const addData = await addRes.json();
    if (addData.channel) {
      await fetch(`/api/competitors/channels/${addData.channel.id}/sync`, { method: "POST" });
      fetch("/api/discovery/channels").then((r) => r.json()).then((d) => setDiscoveryChannels(d.channels ?? []));
      await loadOutliers();
    } else if (addData.error) {
      setAddChannelError(addData.error);
    }
    setAddingChannelId(null);
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
      <div className="mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">Outlier Feed</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Competitor videos that massively outperformed their channel&apos;s average.
          </p>
        </div>
        <AiCreditBadge className="mt-1" />
      </div>

      {/* Search — matches video title, across both tracked and discovery channels */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search tracked outlier videos by topic — or search YouTube directly if nothing matches…"
        className="w-full px-3.5 py-2 rounded-lg text-sm outline-none mb-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      />

      {/* Category pills — filter to a single niche so unrelated tracked
          channels (e.g. a movie-trailer channel) don't drown out the rest.
          Includes both this user's tracked channels and the shared discovery
          pool, so a niche shows up here before the user has tracked anything
          in it themselves. */}
      {(() => {
        const availableCategories = Array.from(
          new Set([...channels, ...discoveryChannels].map((c) => c.category ?? "other"))
        ) as ChannelCategory[];
        if (availableCategories.length <= 1) return null;
        return (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedCategory("")}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: selectedCategory === "" ? "#00ff87" : "var(--bg-card)",
                color: selectedCategory === "" ? "#000" : "var(--text-secondary)",
                border: `1px solid ${selectedCategory === "" ? "#00ff87" : "var(--border)"}`,
              }}
            >
              All niches
            </button>
            {CATEGORIES.filter((c) => availableCategories.includes(c.id)).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: selectedCategory === c.id ? "#00ff87" : "var(--bg-card)",
                  color: selectedCategory === c.id ? "#000" : "var(--text-secondary)",
                  border: `1px solid ${selectedCategory === c.id ? "#00ff87" : "var(--border)"}`,
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        );
      })()}

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
        {!loading && (channels.length > 0 || discoveryChannels.length > 0) && (
          <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: "auto" }}>
            {outliers.length} video{outliers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <VideoGridSkeleton count={6} />
      ) : outliers.length === 0 ? (
        channels.length === 0 && discoveryChannels.length === 0 ? (
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
                      <div className="mt-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }} title="Uses 1 of your monthly AI answers">
                        🧠 Why It Worked <span style={{ color: "var(--text-muted)", fontSize: 10 }}>· 1 credit</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : search.trim().length > 1 ? (
          <div>
            <div
              className="rounded-xl border flex flex-col items-center justify-center py-10 text-center mb-6"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-semibold mb-1">No synced outliers match &quot;{search}&quot;</p>
              <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 420 }}>
                We only search videos already tracked. Here&apos;s what we found searching YouTube directly for channels — add one to start scoring its videos.
              </p>
            </div>
            {ytSearching ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Searching YouTube…</p>
            ) : ytResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {ytResults.map((r) => (
                  <div
                    key={r.channelId}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    {r.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.thumbnail} alt={r.name} className="w-10 h-10 rounded-full flex-shrink-0 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold" style={{ background: "var(--border)" }}>
                        {(r.name ?? "?")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {r.subscriberCount >= 1_000_000 ? (r.subscriberCount / 1_000_000).toFixed(1) + "M" : r.subscriberCount >= 1_000 ? (r.subscriberCount / 1_000).toFixed(1) + "K" : r.subscriberCount} subscribers
                      </div>
                    </div>
                    <select
                      value={ytCategoryPicks[r.channelId] ?? "other"}
                      onChange={(e) =>
                        setYtCategoryPicks((prev) => ({ ...prev, [r.channelId]: e.target.value as ChannelCategory }))
                      }
                      className="px-2 py-1.5 rounded-lg text-xs outline-none flex-shrink-0"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      title="Niche category for this channel"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAddDiscoveryChannel(r)}
                      disabled={addingChannelId === r.channelId}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 flex-shrink-0"
                      style={{ background: "#00ff87", color: "#000" }}
                    >
                      {addingChannelId === r.channelId ? "Adding…" : "Add & track"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>No YouTube channels found for that search either.</p>
            )}
            {addChannelError && (
              <div
                className="mt-3 rounded-lg px-3 py-2.5 text-sm"
                style={{ background: "rgba(255,90,90,0.1)", border: "1px solid rgba(255,90,90,0.3)", color: "#ff8a8a" }}
              >
                {addChannelError}
              </div>
            )}
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
            const ch = v.competitor_channels;

            return (
              // Outer div — button cannot be nested inside the clickable area
              <div
                key={v.id}
                className="rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
              >
                {/* Clickable card area — opens the in-app detail modal instead
                    of jumping straight to YouTube */}
                <div
                  onClick={() => { setTrackError(null); setSelectedVideo(v); }}
                  className="block cursor-pointer transition-transform hover:scale-[1.02]"
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
                </div>

                {/* Why It Worked button — outside the clickable area to keep HTML valid */}
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
                    title="Uses 1 of your monthly AI answers"
                  >
                    🧠 Why It Worked <span style={{ color: "var(--text-muted)", fontSize: 10 }}>· 1 credit</span>
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

      {/* Video detail modal — shared in-app "click a video" experience */}
      {selectedVideo && (
        <VideoDetailModal
          video={{
            title: selectedVideo.title,
            thumbnail_url: selectedVideo.thumbnail_url,
            youtube_video_id: selectedVideo.youtube_video_id,
            view_count: selectedVideo.view_count,
            like_count: selectedVideo.like_count,
            comment_count: selectedVideo.comment_count,
            published_at: selectedVideo.published_at,
            outlier_score: selectedVideo.outlier_score,
          }}
          channel={{
            id: selectedVideo.competitor_channels.id,
            channel_name: selectedVideo.competitor_channels.channel_name,
            thumbnail_url: selectedVideo.competitor_channels.thumbnail_url,
            subscriber_count: selectedVideo.competitor_channels.subscriber_count,
          }}
          isTracked={ownedChannelIds.has(selectedVideo.competitor_channels.youtube_channel_id)}
          tracking={trackingChannel}
          onTrack={() => handleTrackChannel(selectedVideo)}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* Track-channel error (e.g. plan competitor limit) — sits above the modal */}
      {trackError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-lg px-4 py-2.5 text-sm max-w-md text-center"
          style={{ background: "rgba(255,90,90,0.12)", border: "1px solid rgba(255,90,90,0.4)", color: "#ff8a8a" }}
        >
          {trackError}
        </div>
      )}
    </div>
    );
}
