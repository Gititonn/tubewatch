"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COOLDOWN_HOURS = 1; // free tier: 1 hour between syncs

export default function ResyncButton({
  channelDbId,
  youtubeChannelId,
  lastSyncedAt,
}: {
  channelDbId: string;
  youtubeChannelId: string;
  lastSyncedAt?: string | null;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  // Calculate cooldown
  const lastSync = lastSyncedAt ? new Date(lastSyncedAt) : null;
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  const nextSyncAt = lastSync ? new Date(lastSync.getTime() + cooldownMs) : null;
  const onCooldown = nextSyncAt ? Date.now() < nextSyncAt.getTime() : false;

  function minutesUntilSync() {
    if (!nextSyncAt) return 0;
    return Math.ceil((nextSyncAt.getTime() - Date.now()) / 60_000);
  }

  async function handleResync() {
    if (onCooldown) return;
    setSyncing(true);
    setError("");
    try {
      const res = await fetch("/api/youtube/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelDbId, youtubeChannelId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sync failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="ml-auto flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={handleResync}
        disabled={syncing || onCooldown}
        className="text-xs border px-3 py-1.5 rounded-lg transition-colors hover:border-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: "#2a2a2a", color: "#888" }}
        title={onCooldown ? `Next sync available in ${minutesUntilSync()} min` : "Resync now"}
      >
        {syncing ? "Syncing…" : onCooldown ? "⏳ On cooldown" : "↻ Resync"}
      </button>
      {lastSync && (
        <span className="text-xs" style={{ color: "#3a3a3a" }}>
          Last sync: {lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
