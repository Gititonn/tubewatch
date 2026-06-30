"use client";
import { useState, useEffect, useRef } from "react";

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
};

type SearchResult = {
  channelId: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriberCount: number;
  videoCount: number;
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
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

export default function CompetitorsPage() {
  const [channels, setChannels] = useState<CompetitorChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChannels();
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

  function openModal() {
    setSearchQuery("");
    setSearchResults([]);
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
      }),
    });
    const data = await res.json();
    if (data.channel) {
      setShowModal(false);
      setSearchQuery("");
      setSearchResults([]);
      await loadChannels();
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
    setDeleting(null);
  }

  return (
    <div className="p-8 max-w-5xl" style={{ color: "var(--text-primary)" }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Competitor Channels</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Track competitor channels and surface their breakout videos.
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
          {channels.map((ch) => (
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
                  className="flex gap-4 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>{fmt(ch.subscriber_count)} subs</span>
                  <span>{ch.video_count ?? "—"} videos synced</span>
                  <span>Median: {fmt(ch.median_views)} views</span>
                  <span>Synced {timeAgo(ch.last_synced_at)}</span>
                </div>
              </div>

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
                className="hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
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
