"use client";
import { useState, useEffect, useRef } from "react";
import { CATEGORIES, type ChannelCategory } from "@/lib/categories";

type CompetitorChannel = {
  id: string;
  youtube_channel_id: string;
  channel_handle: string | null;
  channel_name: string;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  median_views: number | null;
  last_synced_at: string | null;
  created_at: string;
  category: ChannelCategory | null;
};

type SearchResult = {
  channelId: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriberCount: number;
  videoCount: number;
};

type Suggestion = {
  channelId: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriberCount: number;
  videoCount: number;
  medianViews: number | null;
  category: ChannelCategory | null;
  reason: string;
  source: "pool" | "youtube";
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function visibleChannels(
  channels: CompetitorChannel[],
  query: string,
  sortBy: "recent" | "subs" | "median" | "name"
): CompetitorChannel[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? channels.filter(
        (c) =>
          c.channel_name.toLowerCase().includes(q) ||
          (c.channel_handle ?? "").toLowerCase().includes(q)
      )
    : channels;
  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "subs":
        return (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0);
      case "median":
        return (b.median_views ?? 0) - (a.median_views ?? 0);
      case "name":
        return a.channel_name.localeCompare(b.channel_name);
      default:
        return (
          (b.last_synced_at ? new Date(b.last_synced_at).getTime() : 0) -
          (a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0)
        );
    }
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type SortKey = "recent" | "subs" | "median" | "name";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Recently synced" },
  { id: "subs", label: "Most subscribers" },
  { id: "median", label: "Highest median views" },
  { id: "name", label: "Name A–Z" },
];

export default function CompetitorsPage() {
  const [channels, setChannels] = useState<CompetitorChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState<string | null>(null);
  const [pendingCategory, setPendingCategory] = useState<ChannelCategory>("other");
  const [similar, setSimilar] = useState<Suggestion[]>([]);
  const [trackingSimilar, setTrackingSimilar] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChannels();
    loadSimilar();
  }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showModal]);

  async function loadChannels() {
    setLoading(true);
    const res = await fetch("/api/competitors/channels");
    const data = await res.json();
    setChannels(data.channels ?? []);
    setLoading(false);
  }

  // Algorithmic "similar channels you could track" (P2.2). Recomputes whenever
  // the tracked set changes, since suggestions are derived from it.
  async function loadSimilar() {
    const res = await fetch("/api/competitors/similar");
    const data = await res.json();
    setSimilar(data.similar ?? []);
  }

  async function handleTrackSimilar(s: Suggestion) {
    setTrackingSimilar(s.channelId);
    const res = await fetch("/api/competitors/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: s.channelId,
        name: s.name,
        handle: s.handle,
        thumbnail: s.thumbnail,
        subscriberCount: s.subscriberCount,
        videoCount: s.videoCount,
        category: s.category ?? "other",
      }),
    });
    const data = await res.json();
    if (data.channel) {
      // Optimistically drop it from the shelf, then refresh both lists.
      setSimilar((prev) => prev.filter((x) => x.channelId !== s.channelId));
      await loadChannels();
      fetch(`/api/competitors/channels/${data.channel.id}/sync`, { method: "POST" })
        .then(() => loadChannels());
      loadSimilar();
    }
    setTrackingSimilar(null);
  }

  function openModal() {
    setSearchQuery("");
    setSearchResults([]);
    setPendingCategory("other");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/competitors/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.results ?? []);
    setSearching(false);
  }

  async function handleAdd(result: SearchResult) {
    setAdding(result.channelId);
    const res = await fetch("/api/competitors/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: result.channelId,
        name: result.name,
        handle: result.handle,
        thumbnail: result.thumbnail,
        subscriberCount: result.subscriberCount,
        videoCount: result.videoCount,
        category: pendingCategory,
      }),
    });
    const data = await res.json();
    if (data.channel) {
      setShowModal(false);
      setSearchQuery("");
      setSearchResults([]);
      await loadChannels();
      loadSimilar();
      // Kick off initial sync in background
      fetch(`/api/competitors/channels/${data.channel.id}/sync`, { method: "POST" })
        .then(() => loadChannels());
    }
    setAdding(null);
  }

  async function handleSync(channelId: string) {
    setSyncing(channelId);
    await fetch(`/api/competitors/channels/${channelId}/sync`, { method: "POST" });
    await loadChannels();
    setSyncing(null);
  }

  async function handleDelete(channelId: string) {
    setDeleting(channelId);
    await fetch(`/api/competitors/channels?id=${channelId}`, { method: "DELETE" });
    await loadChannels();
    loadSimilar();
    setDeleting(null);
  }

  async function handleCategoryChange(channelId: string, category: ChannelCategory) {
    setUpdatingCategory(channelId);
    await fetch("/api/competitors/channels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: channelId, category }),
    });
    await loadChannels();
    setUpdatingCategory(null);
  }

  return (
    <div className="p-8 max-w-5xl" style={{ color: "var(--text-primary)" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Tracked Channels</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            We scan these channels every day for quiet breakouts — their overperformers show up
            in your Breakouts feed automatically.
          </p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#00ff87", color: "#000" }}
        >
          + Add Channel
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", paddingTop: 48, textAlign: "center" }}>
          Loading…
        </div>
      ) : channels.length === 0 ? (
        <div
          className="rounded-xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
        >
          <div className="text-4xl mb-4">🎯</div>
          <p className="font-semibold mb-1">No competitor channels yet</p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Add channels to start tracking outlier videos.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Search + sort only once the list is big enough to need them — at
              3 tracked channels these controls are clutter; at the Pro/Growth
              caps (10–25) a plain vertical list is a chore. */}
          {channels.length >= 5 && (
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="🔍 Filter tracked channels…"
                className="flex-1 min-w-48 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sort tracked channels"
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
          {visibleChannels(channels, listQuery, sortBy).map((ch) => (
            <div
              key={ch.id}
              className="flex items-center gap-4 rounded-xl border px-5 py-4"
              style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
            >
              {ch.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ch.thumbnail_url}
                  alt={ch.channel_name}
                  className="w-12 h-12 rounded-full flex-shrink-0 object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold"
                  style={{ background: "var(--border)" }}
                >
                  {ch.channel_name[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold truncate">{ch.channel_name}</span>
                  {ch.channel_handle && (
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      @{ch.channel_handle.replace(/^@/, "")}
                    </span>
                  )}
                </div>
                <div
                  className="flex gap-4 text-xs flex-wrap"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>{fmt(ch.subscriber_count)} subs</span>
                  <span>{ch.video_count ?? "—"} videos synced</span>
                  <span>Median: {fmt(ch.median_views)} views</span>
                  <span>Synced {timeAgo(ch.last_synced_at)}</span>
                </div>
              </div>

              <select
                value={ch.category ?? "other"}
                disabled={updatingCategory === ch.id}
                onChange={(e) => handleCategoryChange(ch.id, e.target.value as ChannelCategory)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium outline-none flex-shrink-0 disabled:opacity-40"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                title="Niche category — used to filter the Outlier Feed"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSync(ch.id)}
                  disabled={syncing === ch.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {syncing === ch.id ? "Syncing…" : "Sync Now"}
                </button>
                <button
                  onClick={() => handleDelete(ch.id)}
                  disabled={deleting === ch.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: "var(--bg-card)", border: "1px solid #3a1a1a", color: "#ff4444" }}
                >
                  {deleting === ch.id ? "…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Similar channels you could track (P2.2) — algorithmic suggestions
          from the discovery pool in your niches, topped up from YouTube when
          the pool is thin. Hidden until there's something to show. */}
      {!loading && similar.length > 0 && (
        <div className="mt-10">
          <div className="mb-3">
            <h2 className="text-lg font-bold">Similar channels you could track</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              {channels.length > 0
                ? "Matched to the niches and subscriber tier you already follow."
                : "Popular channels in each niche to get you started."}
            </p>
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {similar.map((s) => (
              <div
                key={s.channelId}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
              >
                {s.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnail}
                    alt={s.name}
                    className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold"
                    style={{ background: "var(--border)" }}
                  >
                    {(s.name ?? "?")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {fmt(s.subscriberCount)} subs · {s.reason}
                  </div>
                </div>
                <button
                  onClick={() => handleTrackSimilar(s)}
                  disabled={trackingSimilar === s.channelId}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 flex-shrink-0"
                  style={{ background: "#00ff87", color: "#000" }}
                >
                  {trackingSimilar === s.channelId ? "Adding…" : "Track"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-6"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Add Competitor Channel</h2>
              <button
                onClick={closeModal}
                style={{ color: "var(--text-muted)" }}
                className="hover:text-foreground transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Channel name, @handle, or URL…"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "#00ff87", color: "#000" }}
              >
                {searching ? "…" : "Search"}
              </button>
            </form>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                Niche category (used to filter the Outlier Feed)
              </label>
              <select
                value={pendingCategory}
                onChange={(e) => setPendingCategory(e.target.value as ChannelCategory)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {searchResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {searchResults.map((r) => (
                  <div
                    key={r.channelId}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                  >
                    {r.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnail}
                        alt={r.name ?? ""}
                        className="w-10 h-10 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold"
                        style={{ background: "var(--border)" }}
                      >
                        {(r.name ?? "?")[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{r.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {fmt(r.subscriberCount)} subscribers
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(r)}
                      disabled={adding === r.channelId}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 flex-shrink-0"
                      style={{ background: "#00ff87", color: "#000" }}
                    >
                      {adding === r.channelId ? "Adding…" : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", paddingTop: 8 }}>
                No channels found. Try a different name or handle.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
