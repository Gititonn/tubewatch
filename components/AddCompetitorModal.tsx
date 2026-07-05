"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  channelId: string;
  name: string;
  handle: string | null;
  thumbnail: string | null;
  subscriberCount: number;
  videoCount: number;
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

/**
 * Quick-add competitor modal, usable from any page. Exists so feature pages
 * with an "add competitors" empty state (Rising, etc.) can complete the whole
 * add→sync loop in place — sending the user off to /competitors mid-task
 * loses the context they came for, and often the user.
 *
 * Tracks via POST /api/competitors/channels, then fires the sync so the
 * caller's refetch (onAdded) has scored videos to show, not an empty shell.
 */
export default function AddCompetitorModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitors/search?q=${encodeURIComponent(query)}`);
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Search failed. Try again.");
        setResults([]);
      } else {
        setResults(d.results ?? []);
      }
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  async function track(r: SearchResult) {
    if (busy.has(r.channelId) || added.has(r.channelId)) return;
    setBusy((p) => new Set(p).add(r.channelId));
    setError(null);
    try {
      const res = await fetch("/api/competitors/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: r.channelId,
          name: r.name,
          handle: r.handle,
          thumbnail: r.thumbnail,
          subscriberCount: r.subscriberCount,
          videoCount: r.videoCount,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Couldn't track that channel.");
        return;
      }
      // Sync right away so the page behind the modal has data on refetch.
      if (d.channel?.id) {
        await fetch(`/api/competitors/channels/${d.channel.id}/sync`, { method: "POST" }).catch(() => {});
      }
      setAdded((p) => new Set(p).add(r.channelId));
      onAdded?.();
    } finally {
      setBusy((p) => {
        const next = new Set(p);
        next.delete(r.channelId);
        return next;
      });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--bg-card, #1a1a1a)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add competitor channel"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Add a competitor</h3>
          <button onClick={onClose} aria-label="Close" className="text-xl leading-none px-1" style={{ color: "var(--text-muted)" }}>
            ×
          </button>
        </div>

        <form onSubmit={search} className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels — name or @handle"
            className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-hover, rgba(255,255,255,0.04))", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-4 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ background: "#00ff87", color: "#000" }}
          >
            {searching ? "…" : "Search"}
          </button>
        </form>

        {error && (
          <p className="text-xs mb-3" style={{ color: "#ff4444" }}>{error}</p>
        )}

        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.channelId}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
              style={{ borderColor: "var(--border)" }}
            >
              {r.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnail} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: "var(--border)" }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{r.name}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {fmt(r.subscriberCount)} subs · {fmt(r.videoCount)} videos
                </p>
              </div>
              <button
                onClick={() => track(r)}
                disabled={busy.has(r.channelId) || added.has(r.channelId)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
                style={
                  added.has(r.channelId)
                    ? { background: "transparent", color: "#00ff87", border: "1px solid #00ff87" }
                    : { background: "#00ff87", color: "#000" }
                }
              >
                {added.has(r.channelId) ? "✓ Tracking" : busy.has(r.channelId) ? "Syncing…" : "Track"}
              </button>
            </div>
          ))}
          {!searching && results.length === 0 && !error && (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
              Search for channels in your niche — we&apos;ll sync their videos immediately.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
