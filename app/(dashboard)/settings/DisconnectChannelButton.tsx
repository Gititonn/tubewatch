"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DisconnectChannelButton({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDisconnect() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/youtube/channels/${channelId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to disconnect");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Disconnect {channelName}?
        </span>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50"
          style={{ background: "#ef4444" }}
        >
          {loading ? "Removing…" : "Yes, disconnect"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg border"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        onClick={() => setConfirming(true)}
        className="text-xs border px-3 py-1.5 rounded-lg transition-colors hover:border-red-400 hover:text-red-400"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        Disconnect
      </button>
    </div>
  );
}
