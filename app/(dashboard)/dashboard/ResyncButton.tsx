"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResyncButton({
  channelDbId,
  youtubeChannelId,
}: {
  channelDbId: string;
  youtubeChannelId: string;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function handleResync() {
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
    <div className="ml-auto flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={handleResync}
        disabled={syncing}
        className="text-xs border px-3 py-1.5 rounded-lg transition-colors hover:border-white disabled:opacity-50"
        style={{ borderColor: "#2a2a2a", color: "#888" }}
      >
        {syncing ? "Syncing…" : "Resync"}
      </button>
    </div>
  );
}
